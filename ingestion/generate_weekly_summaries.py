from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "tmp" / "weekly"
TIMEOUT_SECONDS = 30
GENERATION_VERSION = os.getenv("WEEKLY_SUMMARY_VERSION", "weekly_v1")
PUBLIC_EXTRACTION_METHODS = tuple(
    method.strip()
    for method in os.getenv("WEEKLY_SUMMARY_EXTRACTION_METHODS", "heuristic_v4,heuristic_v3").split(",")
    if method.strip()
)
MAX_EVENT_HIGHLIGHTS = int(os.getenv("WEEKLY_SUMMARY_EVENT_LIMIT", "4"))
MAX_WATCHLIST_ITEMS = int(os.getenv("WEEKLY_SUMMARY_WATCHLIST_LIMIT", "5"))
STRIP_TAGS_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
WATCHLIST_EXCLUDE_PATTERNS = (
    "appeared first on",
    "newsletter form",
    "site update",
    "gadget master",
    "mannerisms",
    "podcast:",
    "webinar",
)
POST_BOILERPLATE_RE = re.compile(r"\bthe post .+? appeared first on .+?(?:\.|$)", re.IGNORECASE)
INDUSTRY_TERMS = {
    "semiconductors": (
        "chip",
        "semiconductor",
        "wafer",
        "fab",
        "foundry",
        "packaging",
        "gan",
        "sic",
        "eda",
        "memory",
        "hbm",
        "epi",
        "mocvd",
        "device",
        "logic",
        "ai",
    ),
    "oil-gas": (
        "oil",
        "gas",
        "lng",
        "crude",
        "refinery",
        "pipeline",
        "drilling",
        "rig",
        "tanker",
        "terminal",
        "well",
        "opec",
        "petrochemical",
        "diesel",
        "biofuel",
        "shipping",
    ),
}


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def write_artifact(name: str, payload: dict[str, Any]) -> Path:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_DIR / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def raise_for_status_with_context(response: requests.Response) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(
            f"HTTP {response.status_code} from {response.request.method} {response.url}: {response.text.strip()[:2000]}",
        ) from exc


class SupabaseRestClient:
    def __init__(self) -> None:
        supabase_url = os.getenv("SUPABASE_URL")
        api_key = os.getenv("SUPABASE_API_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        ingest_token = os.getenv("SUPABASE_INGEST_TOKEN")
        if not supabase_url or not api_key or not ingest_token:
            raise RuntimeError("SUPABASE_URL, SUPABASE_API_KEY, and SUPABASE_INGEST_TOKEN are required.")

        self.supabase_url = supabase_url
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "x-ingest-token": ingest_token,
        }

    def get(self, path: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = requests.get(
            f"{self.supabase_url}/rest/v1/{path}",
            headers=self.headers,
            params=params,
            timeout=TIMEOUT_SECONDS,
        )
        raise_for_status_with_context(response)
        return response.json()

    def post(self, path: str, payload: Any, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        response = requests.post(
            f"{self.supabase_url}/rest/v1/{path}",
            headers={**self.headers, "Prefer": "return=representation,resolution=merge-duplicates"},
            params=params or {},
            json=payload,
            timeout=TIMEOUT_SECONDS,
        )
        raise_for_status_with_context(response)
        return response.json()


def iso_date(value: date) -> str:
    return value.isoformat()


def start_of_week(today: date) -> date:
    return today - timedelta(days=today.weekday())


def end_of_week(week_start: date) -> date:
    return week_start + timedelta(days=6)


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def format_date(value: str | None) -> str:
    parsed = parse_timestamp(value)
    if not parsed:
        return "Undated"
    return parsed.strftime("%b %d")


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    without_tags = STRIP_TAGS_RE.sub(" ", value)
    return SPACE_RE.sub(" ", without_tags).strip()


def trim_excerpt(value: str, limit: int) -> str:
    cleaned = value.strip()
    if len(cleaned) <= limit:
        return cleaned
    clipped = cleaned[:limit]
    last_space = clipped.rfind(" ")
    if last_space > int(limit * 0.6):
        clipped = clipped[:last_space]
    return clipped.rstrip(" ,;:.") + "..."


def clean_excerpt(value: str | None, limit: int = 420) -> str:
    stripped = strip_html(value)
    stripped = POST_BOILERPLATE_RE.sub("", stripped)
    stripped = SPACE_RE.sub(" ", stripped).strip(" -")
    return trim_excerpt(stripped, limit)


def clean_sentence(value: str | None, limit: int = 220) -> str:
    cleaned = clean_excerpt(value, limit).strip()
    cleaned = re.sub(r"\.\.\.+$", "", cleaned).strip(" ,;:-")
    sentence_match = re.search(r"^(.+?[.!?])(?:\s|$)", cleaned)
    if sentence_match:
        return sentence_match.group(1).strip()
    if not cleaned:
        return ""
    return f"{cleaned}."


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    lowered = strip_html(value).lower()
    lowered = re.sub(r"[^a-z0-9\s&/-]+", " ", lowered)
    return SPACE_RE.sub(" ", lowered).strip()


def has_term(text: str, term: str) -> bool:
    if " " in term or "-" in term or "&" in term or "/" in term:
        return term in text
    return re.search(rf"\b{re.escape(term)}\b", text) is not None


def format_week_label(week_start_date: date, week_end_date: date) -> str:
    if week_start_date.month == week_end_date.month:
        return f"{week_start_date.strftime('%b %d')} to {week_end_date.strftime('%d, %Y')}"
    return f"{week_start_date.strftime('%b %d')} to {week_end_date.strftime('%b %d, %Y')}"


def fetch_industries(client: SupabaseRestClient) -> list[dict[str, Any]]:
    return client.get("industries", {"select": "id,slug,name", "order": "name.asc"})


def fetch_weekly_events(
    client: SupabaseRestClient,
    week_start_date: date,
    week_end_date: date,
) -> list[dict[str, Any]]:
    rows = client.get(
        "events",
        {
            "select": ",".join(
                [
                    "id",
                    "title",
                    "summary",
                    "severity_level",
                    "confidence_score",
                    "event_date",
                    "detected_at",
                    "metadata",
                    "industries!inner(slug,name)",
                    "subsectors(slug,name)",
                    "event_types(slug,name)",
                    "event_locations(location_name,admin1,city,latitude,longitude,is_canonical,countries(name))",
                    "event_articles(article_id,role,evidence_snippet,articles(published_at,url,canonical_url,sources(slug,name)))",
                ],
            ),
            "and": f"(event_date.gte.{iso_date(week_start_date)},event_date.lte.{iso_date(week_end_date)})",
            "order": "severity_level.desc,event_date.desc,detected_at.desc",
            "limit": "200",
        },
    )

    filtered: list[dict[str, Any]] = []
    for row in rows:
        extraction_method = ((row.get("metadata") or {}).get("extraction_method")) or "heuristic_v3"
        if PUBLIC_EXTRACTION_METHODS and extraction_method not in PUBLIC_EXTRACTION_METHODS:
            continue
        filtered.append(row)
    return filtered


def fetch_weekly_briefings(
    client: SupabaseRestClient,
    week_start_date: date,
    week_end_date: date,
) -> list[dict[str, Any]]:
    week_end_exclusive = week_end_date + timedelta(days=1)
    rows = client.get(
        "articles",
        {
            "select": "id,title,summary,content_text,published_at,canonical_url,url,enrichment_status,enrichment_outcome_reason,source_id,sources(slug,name,source_industries(industries(slug,name)))",
            "enrichment_status": "in.(neutral_intelligence,no_event)",
            "and": (
                f"(published_at.gte.{iso_date(week_start_date)}T00:00:00+00:00,"
                f"published_at.lt.{iso_date(week_end_exclusive)}T00:00:00+00:00)"
            ),
            "order": "published_at.desc",
            "limit": "200",
        },
    )
    return rows


def canonical_location(row: dict[str, Any]) -> dict[str, Any] | None:
    locations = row.get("event_locations") or []
    if not locations:
        return None
    return next((location for location in locations if location.get("is_canonical")), locations[0])


def primary_article(row: dict[str, Any]) -> dict[str, Any] | None:
    links = row.get("event_articles") or []
    if not links:
        return None
    ordered = sorted(
        links,
        key=lambda item: (0 if item.get("role") == "primary" else 1, item.get("articles", {}).get("published_at") or ""),
    )
    article = ordered[0].get("articles")
    if isinstance(article, list):
        return article[0] if article else None
    return article


def source_record(row: dict[str, Any]) -> dict[str, Any] | None:
    article = primary_article(row)
    if not article:
        return None
    source = article.get("sources")
    if isinstance(source, list):
        return source[0] if source else None
    return source


def flatten_briefing_industry(row: dict[str, Any]) -> tuple[str | None, str | None]:
    source = row.get("sources")
    if isinstance(source, list):
        source = source[0] if source else None
    source_industries = (source or {}).get("source_industries") or []
    for mapping in source_industries:
        industry = mapping.get("industries")
        if isinstance(industry, list):
            industry = industry[0] if industry else None
        if industry and industry.get("slug"):
            return industry["slug"], industry.get("name")
    return None, None


def build_event_item(row: dict[str, Any]) -> dict[str, Any]:
    location = canonical_location(row)
    source = source_record(row) or {}
    article = primary_article(row) or {}
    event_type = row.get("event_types")
    if isinstance(event_type, list):
        event_type = event_type[0] if event_type else None
    subsector = row.get("subsectors")
    if isinstance(subsector, list):
        subsector = subsector[0] if subsector else None
    country = (location or {}).get("countries")
    if isinstance(country, list):
        country = country[0] if country else None

    return {
        "event_id": row["id"],
        "title": row["title"],
        "summary": clean_excerpt(row["summary"], 320),
        "severity_level": row["severity_level"],
        "confidence_score": row["confidence_score"],
        "event_date": row.get("event_date"),
        "event_type_slug": (event_type or {}).get("slug"),
        "event_type_name": (event_type or {}).get("name"),
        "subsector_slug": (subsector or {}).get("slug"),
        "subsector_name": (subsector or {}).get("name"),
        "location_name": (location or {}).get("location_name"),
        "city": (location or {}).get("city"),
        "admin1": (location or {}).get("admin1"),
        "country_name": (country or {}).get("name"),
        "source_name": source.get("name"),
        "source_slug": source.get("slug"),
        "source_url": article.get("canonical_url") or article.get("url"),
        "evidence_snippet": next(
            (link.get("evidence_snippet") for link in (row.get("event_articles") or []) if link.get("evidence_snippet")),
            None,
        ),
    }


def build_briefing_item(row: dict[str, Any]) -> dict[str, Any]:
    source = row.get("sources")
    if isinstance(source, list):
        source = source[0] if source else None
    industry_slug, industry_name = flatten_briefing_industry(row)
    summary = clean_excerpt(row.get("summary") or row.get("content_text") or row.get("title") or "", 360)
    return {
        "article_id": row["id"],
        "title": row["title"],
        "summary": summary,
        "published_at": row.get("published_at"),
        "source_name": (source or {}).get("name"),
        "source_slug": (source or {}).get("slug"),
        "source_url": row.get("canonical_url") or row.get("url"),
        "industry_slug": industry_slug,
        "industry_name": industry_name,
        "enrichment_status": row.get("enrichment_status"),
        "outcome_reason": row.get("enrichment_outcome_reason"),
    }


def briefing_watchlist_score(item: dict[str, Any]) -> int:
    industry_slug = item.get("industry_slug")
    normalized_title = normalize_text(item.get("title"))
    normalized_summary = normalize_text(item.get("summary"))
    combined = f"{normalized_title} {normalized_summary}".strip()
    terms = INDUSTRY_TERMS.get(industry_slug or "", ())
    score = sum(3 for term in terms if has_term(normalized_title, term))
    score += sum(1 for term in terms if has_term(normalized_summary, term))
    if item.get("outcome_reason"):
        score += 2
    if len(strip_html(item.get("summary") or "")) >= 140:
        score += 1
    if any(has_term(combined, pattern) for pattern in ("supply", "capacity", "production", "launch", "funding", "price", "exports")):
        score += 1
    return score


def include_in_watchlist(item: dict[str, Any]) -> bool:
    normalized_title = normalize_text(item.get("title"))
    normalized_summary = normalize_text(item.get("summary"))
    combined = f"{normalized_title} {normalized_summary}".strip()
    if any(pattern in combined for pattern in WATCHLIST_EXCLUDE_PATTERNS):
        return False
    if briefing_watchlist_score(item) <= 0:
        return False
    return True


def summarize_pattern_counts(items: list[dict[str, Any]], key: str, label_key: str) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    labels: dict[str, str] = {}
    for item in items:
        slug = item.get(key)
        label = item.get(label_key)
        if not slug:
            continue
        counter[slug] += 1
        if label:
            labels[slug] = label
    return [
        {"slug": slug, "label": labels.get(slug, slug.replace("-", " ")), "count": count}
        for slug, count in counter.most_common(4)
    ]


def summarize_source_mix(items: list[dict[str, Any]], key: str = "source_name") -> list[dict[str, Any]]:
    counter: Counter[str] = Counter(item.get(key) for item in items if item.get(key))
    return [{"source_name": name, "count": count} for name, count in counter.most_common(5)]


def extract_focus_terms(industry_slug: str, items: list[dict[str, Any]]) -> list[str]:
    terms = INDUSTRY_TERMS.get(industry_slug, ())
    counter: Counter[str] = Counter()
    for item in items:
        combined = normalize_text(" ".join(filter(None, [item.get("title"), item.get("summary")])))
        for term in terms:
            if has_term(combined, term):
                counter[term] += 1
    return [term for term, _count in counter.most_common(3)]


def focus_phrase(terms: list[str]) -> str | None:
    if not terms:
        return None
    labels = [term.upper() if term == "lng" else term.replace("-", " ") for term in terms]
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} and {labels[1]}"
    return f"{labels[0]}, {labels[1]}, and {labels[2]}"


def snippet_from_items(items: list[dict[str, Any]], date_key: str) -> str | None:
    for item in items:
        summary = clean_sentence(item.get("summary"), 180)
        if summary:
            return summary[0].lower() + summary[1:] if len(summary) > 1 else summary.lower()
        title = (item.get("title") or "").strip()
        if title:
            dated = format_date(item.get(date_key))
            return f"{dated} developments around {title.lower()}."
    return None


def build_lead(industry_name: str, events: list[dict[str, Any]], briefings: list[dict[str, Any]]) -> str:
    if not events and not briefings:
        return f"No material {industry_name.lower()} items were collected in this weekly window."

    industry_slug = (events[0].get("industry_slug") if events else briefings[0].get("industry_slug")) or ""
    mapped_focus = focus_phrase(extract_focus_terms(industry_slug, events))
    watchlist_focus = focus_phrase(extract_focus_terms(industry_slug, briefings))
    mapped_snippet = snippet_from_items(events, "event_date")
    watchlist_snippet = snippet_from_items(briefings, "published_at")

    lines: list[str] = []
    if mapped_focus and mapped_snippet:
        lines.append(f"{industry_name} this week centered on {mapped_focus}, with mapped developments showing {mapped_snippet}.")
    elif mapped_snippet:
        lines.append(f"{industry_name} this week was led by mapped developments showing {mapped_snippet}.")
    elif mapped_focus:
        lines.append(f"{industry_name} this week centered on mapped pressure around {mapped_focus}.")

    if watchlist_focus and watchlist_snippet:
        lines.append(f"Supporting coverage reinforced themes around {watchlist_focus}, including {watchlist_snippet}.")
    elif watchlist_snippet:
        lines.append(f"Supporting coverage added wider context, including {watchlist_snippet}.")
    elif watchlist_focus:
        lines.append(f"Supporting coverage reinforced themes around {watchlist_focus}.")

    if not lines:
        return f"{industry_name} had a quieter week across the current summary inputs."

    return " ".join(lines)


def build_markdown(
    industry_name: str,
    week_label: str,
    lead: str,
    events: list[dict[str, Any]],
    briefings: list[dict[str, Any]],
    event_patterns: list[dict[str, Any]],
    source_mix: list[dict[str, Any]],
) -> str:
    lines = [
        f"# {industry_name} Weekly Intelligence",
        "",
        f"_Window: {week_label}_",
        "",
        lead,
        "",
        "## Event Highlights",
    ]
    if events:
        for item in events:
            location_parts = [item.get("city"), item.get("country_name"), item.get("location_name")]
            location = next((part for part in location_parts if part), "Unmapped")
            lines.extend(
                [
                    f"- **S{item['severity_level']} | {item['title']}**",
                    f"  - {item['summary']}",
                    f"  - {format_date(item.get('event_date'))} | {location} | {item.get('source_name') or 'Unknown source'}",
                ],
            )
    else:
        lines.append("- No evented items entered the public map layer in this window.")

    lines.extend(["", "## Neutral Watchlist"])
    if briefings:
        for item in briefings:
            lines.extend(
                [
                    f"- **{item['title']}**",
                    f"  - {item['summary']}",
                    f"  - {format_date(item.get('published_at'))} | {item.get('source_name') or 'Unknown source'}",
                ],
            )
    else:
        lines.append("- No neutral-intelligence items were retained in this window.")

    if event_patterns:
        lines.extend(["", "## Pattern Readout"])
        for pattern in event_patterns:
            lines.append(f"- {pattern['label']}: {pattern['count']}")

    if source_mix:
        lines.extend(["", "## Source Mix"])
        for source in source_mix:
            lines.append(f"- {source['source_name']}: {source['count']}")

    return "\n".join(lines)


def summarize_industry(
    industry: dict[str, Any],
    week_start_date: date,
    week_end_date: date,
    all_events: list[dict[str, Any]],
    all_briefings: list[dict[str, Any]],
) -> dict[str, Any] | None:
    all_industry_events = [
        build_event_item(row)
        for row in all_events
        if ((row.get("industries") or {}).get("slug") if isinstance(row.get("industries"), dict) else None) == industry["slug"]
    ]
    all_industry_events.sort(
        key=lambda item: (
            int(item.get("severity_level") or 0),
            item.get("event_date") or "",
            float(item.get("confidence_score") or 0),
        ),
        reverse=True,
    )
    industry_events = all_industry_events[:MAX_EVENT_HIGHLIGHTS]

    all_industry_briefings = [
        build_briefing_item(row)
        for row in all_briefings
        if flatten_briefing_industry(row)[0] == industry["slug"]
    ]
    all_industry_briefings = [item for item in all_industry_briefings if include_in_watchlist(item)]
    all_industry_briefings.sort(
        key=lambda item: (
            briefing_watchlist_score(item),
            item.get("published_at") or "",
        ),
        reverse=True,
    )
    industry_briefings = all_industry_briefings[:MAX_WATCHLIST_ITEMS]

    if not all_industry_events and not all_industry_briefings:
        return None

    week_label = format_week_label(week_start_date, week_end_date)
    lead = build_lead(industry["name"], all_industry_events, all_industry_briefings)
    event_patterns = summarize_pattern_counts(all_industry_events, "event_type_slug", "event_type_name")
    source_mix = summarize_source_mix(all_industry_events + all_industry_briefings)
    severe_event_count = sum(1 for item in all_industry_events if int(item["severity_level"]) >= 3)
    payload = {
        "week_label": week_label,
        "lead": lead,
        "counts": {
            "event_count": len(all_industry_events),
            "neutral_count": len(all_industry_briefings),
            "severe_event_count": severe_event_count,
        },
        "event_highlights": industry_events,
        "watchlist": industry_briefings,
        "event_patterns": event_patterns,
        "source_mix": source_mix,
    }
    confidence = 0.58
    if all_industry_events:
        confidence += min(len(all_industry_events), 4) * 0.06
    if all_industry_briefings:
        confidence += min(len(all_industry_briefings), 4) * 0.03
    if severe_event_count:
        confidence += 0.05

    return {
        "industry_id": industry["id"],
        "week_start_date": iso_date(week_start_date),
        "week_end_date": iso_date(week_end_date),
        "title": f"{industry['name']} Weekly Intelligence | {week_label}",
        "summary_markdown": build_markdown(
            industry["name"],
            week_label,
            lead,
            industry_events,
            industry_briefings,
            event_patterns,
            source_mix,
        ),
        "summary_payload": payload,
        "source_event_count": len(all_industry_events),
        "neutral_article_count": len(all_industry_briefings),
        "review_status": "draft",
        "generation_version": GENERATION_VERSION,
        "confidence_score": round(min(confidence, 0.95), 3),
        "generated_at": utc_now_iso(),
    }


def generate_weekly_summaries() -> dict[str, Any]:
    client = SupabaseRestClient()
    today = utc_now().date()
    week_start_date = start_of_week(today)
    week_end_date = end_of_week(week_start_date)
    industries = fetch_industries(client)
    all_events = fetch_weekly_events(client, week_start_date, week_end_date)
    all_briefings = fetch_weekly_briefings(client, week_start_date, week_end_date)

    rows_to_upsert: list[dict[str, Any]] = []
    generated_for: list[dict[str, Any]] = []
    for industry in industries:
        summary = summarize_industry(industry, week_start_date, week_end_date, all_events, all_briefings)
        if not summary:
            continue
        rows_to_upsert.append(summary)
        generated_for.append(
            {
                "industry_slug": industry["slug"],
                "title": summary["title"],
                "source_event_count": summary["source_event_count"],
                "neutral_article_count": summary["neutral_article_count"],
            },
        )

    if rows_to_upsert:
        client.post(
            "weekly_summaries",
            rows_to_upsert,
            {"on_conflict": "industry_id,week_start_date,week_end_date"},
        )

    result = {
        "generated_at": utc_now_iso(),
        "generation_version": GENERATION_VERSION,
        "week_start_date": iso_date(week_start_date),
        "week_end_date": iso_date(week_end_date),
        "industry_count": len(rows_to_upsert),
        "event_input_count": len(all_events),
        "briefing_input_count": len(all_briefings),
        "summaries": generated_for,
    }
    artifact_path = write_artifact("latest_weekly_summary_snapshot.json", result)
    result["artifact_path"] = str(artifact_path)
    return result


def main() -> None:
    result = generate_weekly_summaries()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
