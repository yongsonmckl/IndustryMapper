from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import feedparser
import requests


ROOT = Path(__file__).resolve().parents[1]
SOURCE_REGISTRY_PATH = ROOT / "data" / "sources" / "initial_sources.json"
ARTIFACT_DIR = ROOT / "tmp" / "ingestion"
TIMEOUT_SECONDS = 30


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


def normalize_link(link: str | None) -> str | None:
    if not link:
        return None
    return link.strip()


def build_article_hash(source_slug: str, url: str, published_at: str | None, title: str) -> str:
    material = "||".join([source_slug, url, published_at or "", title.strip().lower()])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


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
    article_hash = build_article_hash(source.slug, url, published_at, title)

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


def upsert_to_supabase(source_results: list[dict[str, Any]]) -> None:
    supabase_url = os.getenv("SUPABASE_URL")
    api_key = os.getenv("SUPABASE_API_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    ingest_token = os.getenv("SUPABASE_INGEST_TOKEN")
    if not supabase_url or not api_key:
        print("SUPABASE_URL or SUPABASE_API_KEY not set; skipping database write.")
        return

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    if ingest_token:
        headers["x-ingest-token"] = ingest_token

    sources = load_sources()
    tracked_slugs = [source.slug for source in sources]
    slug_filter = ",".join(tracked_slugs)
    response = requests.get(
        f"{supabase_url}/rest/v1/sources",
        headers=headers,
        params={"select": "id,slug", "slug": f"in.({slug_filter})"},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    source_id_map = {row["slug"]: row["id"] for row in response.json()}

    for result in source_results:
        articles = result.get("articles", [])
        if not articles or result["source_slug"] not in source_id_map:
            continue

        rows = []
        for article in articles:
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
                    "raw_payload": article["raw_payload"],
                    "ingestion_status": "stored",
                }
            )

        response = requests.post(
            f"{supabase_url}/rest/v1/articles",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            params={"on_conflict": "article_hash"},
            json=rows,
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()


def main() -> None:
    sources = load_sources()
    source_results = [fetch_feed(source) for source in sources]
    summary = {
        "ok": sum(1 for result in source_results if result["status"] == "ok"),
        "skipped": sum(1 for result in source_results if result["status"] == "skipped"),
        "error": sum(1 for result in source_results if result["status"] == "error"),
        "article_count": sum(result.get("article_count", 0) for result in source_results),
    }

    snapshot = {
        "generated_at": utc_now_iso(),
        "source_count": len(source_results),
        "summary": summary,
        "results": source_results,
    }
    artifact_path = write_artifact("latest_ingestion_snapshot.json", snapshot)
    upsert_to_supabase(source_results)
    print(f"Wrote ingestion snapshot to {artifact_path}")


if __name__ == "__main__":
    main()
