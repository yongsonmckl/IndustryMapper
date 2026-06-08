from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlsplit, urlunsplit

import feedparser
import requests


ROOT = Path(__file__).resolve().parents[1]
SOURCE_REGISTRY_PATH = ROOT / "data" / "sources" / "initial_sources.json"
ARTIFACT_DIR = ROOT / "tmp" / "ingestion"
TIMEOUT_SECONDS = 30
TRACKING_QUERY_PREFIXES = ("utm_", "fbclid", "gclid", "mc_", "mkt_", "ocid", "oly_anon_id", "oly_enc_id")
TRACKING_QUERY_KEYS = {
    "cmpid",
    "feature",
    "guccounter",
    "igshid",
    "mbid",
    "ref",
    "source",
    "spm",
    "taid",
}


@dataclass
class SourceRecord:
    slug: str
    name: str
    industry_slugs: list[str]
    source_type: str
    access_model: str
    homepage_url: str
    feed_url: str | None
    base_domain: str
    reliability_tier: int
    notes: str
    enabled: bool = False
    max_entries: int = 25
    lookback_days: int = 30


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_sources() -> list[SourceRecord]:
    payload = json.loads(SOURCE_REGISTRY_PATH.read_text(encoding="utf-8"))
    return [SourceRecord(**item) for item in payload]


def slugify_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def normalize_title(title: str) -> str:
    cleaned = title.strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"[^a-z0-9 ]+", "", cleaned)
    return cleaned.strip()


def normalize_link(link: str | None) -> str | None:
    if not link:
        return None
    raw = link.strip()
    parsed = urlsplit(raw)
    filtered_query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith(TRACKING_QUERY_PREFIXES) and key.lower() not in TRACKING_QUERY_KEYS
    ]
    normalized_path = parsed.path.rstrip("/") or "/"
    return urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            normalized_path,
            "&".join(f"{key}={value}" if value else key for key, value in filtered_query),
            "",
        ),
    )


def build_article_hash(canonical_url: str, published_at: str | None, title: str) -> str:
    material = "||".join([canonical_url, published_at or "", normalize_title(title)])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def build_uniqueness_key(article: dict[str, Any]) -> str:
    published_day = (article.get("published_at") or "")[:10]
    canonical_url = normalize_link(article.get("canonical_url"))
    if canonical_url:
        return f"url::{canonical_url}"
    return f"title::{normalize_title(article['title'])}::{published_day}"


def parse_entry_timestamp(entry: Any) -> str | None:
    if entry.get("published_parsed"):
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
    if entry.get("updated_parsed"):
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()
    return None


def is_recent_enough(source: SourceRecord, published_at: str | None) -> bool:
    if published_at is None:
        return True
    published = datetime.fromisoformat(published_at)
    cutoff = datetime.now(timezone.utc) - timedelta(days=source.lookback_days)
    return published >= cutoff


def parse_entry(source: SourceRecord, entry: Any) -> dict[str, Any] | None:
    url = normalize_link(entry.get("link"))
    title = (entry.get("title") or "").strip()
    if not url or not title:
        return None

    published_at = parse_entry_timestamp(entry)
    if not is_recent_enough(source, published_at):
        return None

    summary = (entry.get("summary") or entry.get("description") or "").strip()
    article_hash = build_article_hash(url, published_at, title)
    title_signature = slugify_title(title)

    return {
        "source_slug": source.slug,
        "url": url,
        "canonical_url": url,
        "title": title,
        "summary": summary[:4000] if summary else None,
        "author": (entry.get("author") or "").strip() or None,
        "language_code": "en",
        "published_at": published_at,
        "discovered_at": utc_now_iso(),
        "article_hash": article_hash,
        "title_signature": title_signature,
        "raw_payload": {
            "feedburner_origlink": entry.get("feedburner_origlink"),
            "tags": [tag.get("term") for tag in entry.get("tags", []) if tag.get("term")],
            "entry": {
                "id": entry.get("id"),
                "title": entry.get("title"),
                "link": entry.get("link"),
            },
        },
        "ingestion_status": "normalized",
    }


def fetch_feed(source: SourceRecord) -> dict[str, Any]:
    if not source.enabled:
        return {
            "source_slug": source.slug,
            "fetched_at": utc_now_iso(),
            "status": "skipped",
            "reason": "disabled",
            "articles": [],
        }

    if not source.feed_url:
        return {
            "source_slug": source.slug,
            "fetched_at": utc_now_iso(),
            "status": "skipped",
            "reason": "no_feed_url",
            "articles": [],
        }

    try:
        response = requests.get(
            source.feed_url,
            timeout=TIMEOUT_SECONDS,
            headers={"User-Agent": "IndustryMapperBot/0.1 (+https://github.com/yongsonmckl/IndustryMapper)"},
        )
        response.raise_for_status()

        parsed = feedparser.parse(response.content)
        articles = []
        for entry in parsed.entries:
            normalized = parse_entry(source, entry)
            if normalized:
                articles.append(normalized)
            if len(articles) >= source.max_entries:
                break

        return {
            "source_slug": source.slug,
            "fetched_at": utc_now_iso(),
            "status": "ok",
            "feed_title": parsed.feed.get("title"),
            "article_count": len(articles),
            "articles": articles,
        }
    except Exception as exc:
        return {
            "source_slug": source.slug,
            "fetched_at": utc_now_iso(),
            "status": "error",
            "reason": str(exc),
            "articles": [],
        }


def write_artifact(name: str, payload: dict[str, Any]) -> Path:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_DIR / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def raise_for_status_with_context(response: requests.Response) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        response_body = response.text.strip()[:2000]
        request = response.request
        raise RuntimeError(
            f"HTTP {response.status_code} from {request.method} {response.url}: {response_body}",
        ) from exc


def deduplicate_articles(
    source_results: list[dict[str, Any]],
    sources_by_slug: dict[str, SourceRecord],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    kept_by_key: dict[str, dict[str, Any]] = {}
    duplicate_count = 0

    def article_score(article: dict[str, Any]) -> tuple[int, int, int]:
        source = sources_by_slug[article["source_slug"]]
        summary_length = len(article.get("summary") or "")
        has_published_at = 1 if article.get("published_at") else 0
        return (source.reliability_tier, summary_length, has_published_at)

    for result in source_results:
        for article in result.get("articles", []):
            unique_key = build_uniqueness_key(article)
            winner = kept_by_key.get(unique_key)
            if winner is None or article_score(article) > article_score(winner):
                if winner is not None:
                    duplicate_count += 1
                kept_by_key[unique_key] = article
            else:
                duplicate_count += 1

    winners = set()
    for article in kept_by_key.values():
        winners.add(id(article))

    for result in source_results:
        result["articles"] = [article for article in result.get("articles", []) if id(article) in winners]
        result["article_count"] = len(result["articles"])

    stats = {
        "kept_unique_articles": len(kept_by_key),
        "dropped_duplicate_articles": duplicate_count,
    }
    return source_results, stats


def fetch_existing_article_hashes(
    supabase_url: str,
    headers: dict[str, str],
    article_hashes: list[str],
) -> set[str]:
    if not article_hashes:
        return set()

    existing_hashes: set[str] = set()
    batch_size = 100
    for index in range(0, len(article_hashes), batch_size):
        batch = article_hashes[index : index + batch_size]
        response = requests.get(
            f"{supabase_url}/rest/v1/articles",
            headers=headers,
            params={"select": "article_hash", "article_hash": f"in.({','.join(batch)})"},
            timeout=TIMEOUT_SECONDS,
        )
        raise_for_status_with_context(response)
        existing_hashes.update(row["article_hash"] for row in response.json())

    return existing_hashes


def upsert_to_supabase(source_results: list[dict[str, Any]], sources: list[SourceRecord]) -> dict[str, int]:
    supabase_url = os.getenv("SUPABASE_URL")
    api_key = os.getenv("SUPABASE_API_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    ingest_token = os.getenv("SUPABASE_INGEST_TOKEN")
    if not supabase_url or not api_key:
        print("SUPABASE_URL or SUPABASE_API_KEY not set; skipping database write.")
        return {"db_existing_duplicates_skipped": 0, "db_rows_written": 0}
    if not ingest_token:
        raise RuntimeError(
            "SUPABASE_INGEST_TOKEN is not set. Add the repository secret before running ingestion.",
        )

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    headers["x-ingest-token"] = ingest_token

    tracked_slugs = [source.slug for source in sources]
    slug_filter = ",".join(tracked_slugs)
    response = requests.get(
        f"{supabase_url}/rest/v1/sources",
        headers=headers,
        params={"select": "id,slug", "slug": f"in.({slug_filter})"},
        timeout=TIMEOUT_SECONDS,
    )
    raise_for_status_with_context(response)
    source_id_map = {row["slug"]: row["id"] for row in response.json()}
    article_hashes = [
        article["article_hash"]
        for result in source_results
        for article in result.get("articles", [])
        if result["source_slug"] in source_id_map
    ]
    existing_hashes = fetch_existing_article_hashes(supabase_url, headers, article_hashes)
    duplicates_skipped = 0
    rows_written = 0

    for result in source_results:
        articles = result.get("articles", [])
        if not articles or result["source_slug"] not in source_id_map:
            continue

        rows = []
        for article in articles:
            if article["article_hash"] in existing_hashes:
                duplicates_skipped += 1
                continue
            rows.append(
                {
                    "source_id": source_id_map[result["source_slug"]],
                    "url": article["url"],
                    "canonical_url": article["canonical_url"],
                    "title": article["title"],
                    "summary": article["summary"],
                    "author": article["author"],
                    "language_code": article["language_code"],
                    "published_at": article["published_at"],
                    "discovered_at": article["discovered_at"],
                    "article_hash": article["article_hash"],
                    "raw_payload": {
                        **article["raw_payload"],
                        "title_signature": article["title_signature"],
                    },
                    "ingestion_status": "stored",
                }
            )

        result["article_count"] = len(rows)
        if rows:
            response = requests.post(
                f"{supabase_url}/rest/v1/articles",
                headers={**headers, "Prefer": "resolution=merge-duplicates"},
                params={"on_conflict": "article_hash"},
                json=rows,
                timeout=TIMEOUT_SECONDS,
            )
            raise_for_status_with_context(response)
            rows_written += len(rows)

    return {
        "db_existing_duplicates_skipped": duplicates_skipped,
        "db_rows_written": rows_written,
    }


def main() -> None:
    sources = load_sources()
    source_results = [fetch_feed(source) for source in sources]
    sources_by_slug = {source.slug: source for source in sources}
    source_results, dedupe_stats = deduplicate_articles(source_results, sources_by_slug)
    db_stats = upsert_to_supabase(source_results, sources)
    summary = {
        "ok": sum(1 for result in source_results if result["status"] == "ok"),
        "skipped": sum(1 for result in source_results if result["status"] == "skipped"),
        "error": sum(1 for result in source_results if result["status"] == "error"),
        "article_count": sum(result.get("article_count", 0) for result in source_results),
        **dedupe_stats,
        **db_stats,
    }

    snapshot = {
        "generated_at": utc_now_iso(),
        "source_count": len(source_results),
        "summary": summary,
        "results": source_results,
    }
    artifact_path = write_artifact("latest_ingestion_snapshot.json", snapshot)
    print(f"Wrote ingestion snapshot to {artifact_path}")


if __name__ == "__main__":
    main()
