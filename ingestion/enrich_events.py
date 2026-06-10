from __future__ import annotations

import hashlib
import html
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from models import EventCandidate, EventLocationCandidate


ROOT = Path(__file__).resolve().parents[1]
COUNTRY_CENTROIDS_PATH = ROOT / "data" / "geo" / "country_centroids.json"
ARTIFACT_DIR = ROOT / "tmp" / "enrichment"
TIMEOUT_SECONDS = 30
ARTICLE_BATCH_SIZE = int(os.getenv("EVENT_ENRICH_BATCH_SIZE", "40"))

STRIP_TAGS_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")

EVENT_TYPE_PATTERNS: dict[str, tuple[str, ...]] = {
    "export-control": ("export control", "entity list", "license requirement", "chip ban"),
    "import-ban": ("import ban", "imports banned", "banned imports"),
    "tariff": ("tariff", "duties", "import levy"),
    "sanction": ("sanction", "blacklist", "embargo"),
    "factory-shutdown": ("shutdown", "halts production", "production halt", "outage", "offline", "fab outage"),
    "port-disruption": ("port disruption", "port closed", "shipping disruption", "terminal disruption", "strait of hormuz"),
    "pipeline-disruption": ("pipeline disruption", "pipeline outage", "pipeline leak", "pipeline shutdown"),
    "labor-strike": ("strike", "walkout", "labor action"),
    "policy-change": ("policy", "regulation", "rulemaking", "mandate", "reorganizes", "reorganized", "strategy"),
    "supply-shortage": ("shortage", "allocation", "tight supply", "supply crunch"),
    "investment-announcement": ("investment", "expansion", "capacity", "funding", "ambition", "oil reserve", "new plant", "new fab", "builds", "building"),
    "accident-disaster": ("fire", "explosion", "spill", "earthquake", "flood", "accident", "storm"),
    "conflict-disruption": ("war", "conflict", "missile", "attack", "hormuz", "blockade"),
}

SEMICONDUCTOR_SUBSECTOR_PATTERNS: dict[str, tuple[str, ...]] = {
    "eda-ip": ("eda", "ip block", "design software"),
    "fabless-design": ("chip design", "fabless", "soc", "fpga", "processor", "ai chip"),
    "foundry-fabrication": ("foundry", "wafer fab", "fabrication", "fab"),
    "idm": ("idm", "integrated device manufacturer", "intel", "infineon", "stmicroelectronics"),
    "equipment": ("lithography", "etch", "deposition", "metrology", "toolmaker", "equipment"),
    "materials-wafers": ("wafer", "photoresist", "substrate", "sic", "gallium nitride", "materials"),
    "packaging-test": ("packaging", "osat", "advanced packaging", "backend test"),
    "memory": ("dram", "nand", "hbm", "memory"),
}

OIL_GAS_SUBSECTOR_PATTERNS: dict[str, tuple[str, ...]] = {
    "upstream-ep": ("exploration", "production", "upstream", "offshore field", "well"),
    "oilfield-services": ("rig", "drilling", "oilfield services", "completion"),
    "midstream": ("pipeline", "terminal", "storage", "midstream", "tanker"),
    "lng-gas-processing": ("lng", "liquefied natural gas", "regasification", "gas processing"),
    "refining": ("refinery", "refining", "crude processing"),
    "petrochemicals-ngls": ("petrochemical", "ngl", "fractionation"),
    "fuel-distribution": ("fuel marketing", "distribution", "retail fuel"),
}

SOURCE_INDUSTRY_HINTS = {
    "ee-times": "semiconductors",
    "electronics-weekly": "semiconductors",
    "semiconductor-today": "semiconductors",
    "eia": "oil-gas",
    "rigzone": "oil-gas",
}

COUNTRY_ALIASES = {
    "u.s.": "United States",
    "us": "United States",
    "usa": "United States",
    "uk": "United Kingdom",
    "uae": "United Arab Emirates",
    "south korea": "South Korea",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_artifact(name: str, payload: dict[str, Any]) -> Path:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_DIR / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    unescaped = html.unescape(value)
    without_tags = STRIP_TAGS_RE.sub(" ", unescaped)
    return SPACE_RE.sub(" ", without_tags).strip()


def normalize_text(value: str) -> str:
    return SPACE_RE.sub(" ", value.lower()).strip()


def load_country_centroids() -> dict[str, dict[str, Any]]:
    records = json.loads(COUNTRY_CENTROIDS_PATH.read_text(encoding="utf-8"))
    return {record["name"]: record for record in records}


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

    def patch(self, path: str, params: dict[str, str], payload: dict[str, Any]) -> None:
        response = requests.patch(
            f"{self.supabase_url}/rest/v1/{path}",
            headers=self.headers,
            params=params,
            json=payload,
            timeout=TIMEOUT_SECONDS,
        )
        raise_for_status_with_context(response)


def fetch_reference_maps(client: SupabaseRestClient) -> dict[str, dict[str, Any]]:
    industries = client.get("industries", {"select": "id,slug"})
    subsectors = client.get("subsectors", {"select": "id,slug,industry_id"})
    event_types = client.get("event_types", {"select": "id,slug"})
    sources = client.get("sources", {"select": "id,slug"})
    source_industries = client.get("source_industries", {"select": "source_id,industry_id"})

    industry_by_slug = {row["slug"]: row for row in industries}
    event_type_by_slug = {row["slug"]: row for row in event_types}
    subsector_by_slug = {row["slug"]: row for row in subsectors}
    source_id_to_slug = {row["id"]: row["slug"] for row in sources}
    source_industry_by_slug: dict[str, str] = {}
    for row in source_industries:
        source_slug = source_id_to_slug.get(row["source_id"])
        industry_slug = next((slug for slug, item in industry_by_slug.items() if item["id"] == row["industry_id"]), None)
        if source_slug and industry_slug:
            source_industry_by_slug[source_slug] = industry_slug

    return {
        "industry_by_slug": industry_by_slug,
        "subsector_by_slug": subsector_by_slug,
        "event_type_by_slug": event_type_by_slug,
        "source_slug_by_id": source_id_to_slug,
        "source_industry_by_slug": source_industry_by_slug,
    }


def fetch_pending_articles(client: SupabaseRestClient) -> list[dict[str, Any]]:
    return client.get(
        "articles",
        {
            "select": "id,title,summary,url,canonical_url,published_at,article_hash,source_id,enrichment_status",
            "enrichment_status": "eq.pending",
            "order": "published_at.desc",
            "limit": str(ARTICLE_BATCH_SIZE),
        },
    )


def infer_event_type(text: str) -> str | None:
    def has_pattern(pattern: str) -> bool:
        if " " in pattern:
            return pattern in text
        return re.search(rf"\b{re.escape(pattern)}\b", text) is not None

    for event_type, patterns in EVENT_TYPE_PATTERNS.items():
        if any(has_pattern(pattern) for pattern in patterns):
            return event_type
    return None


def infer_subsector(industry_slug: str, text: str) -> str | None:
    pattern_map = (
        SEMICONDUCTOR_SUBSECTOR_PATTERNS
        if industry_slug == "semiconductors"
        else OIL_GAS_SUBSECTOR_PATTERNS
    )
    for subsector_slug, patterns in pattern_map.items():
        if any(pattern in text for pattern in patterns):
            return subsector_slug
    return None


def infer_industry(source_slug: str, text: str) -> str | None:
    if source_slug in SOURCE_INDUSTRY_HINTS:
        return SOURCE_INDUSTRY_HINTS[source_slug]
    if any(term in text for term in ("chip", "semiconductor", "wafer", "foundry", "fab", "packaging")):
        return "semiconductors"
    if any(term in text for term in ("oil", "gas", "lng", "pipeline", "refinery", "rig")):
        return "oil-gas"
    return None


def infer_severity(event_type_slug: str, text: str) -> int:
    if event_type_slug in {"conflict-disruption", "sanction", "export-control"}:
        return 4 if "hormuz" in text or "war" in text or "attack" in text else 3
    if event_type_slug in {"factory-shutdown", "pipeline-disruption", "port-disruption", "accident-disaster"}:
        return 3
    if event_type_slug in {"tariff", "import-ban", "policy-change", "supply-shortage"}:
        return 2
    if event_type_slug == "investment-announcement":
        return 1
    if event_type_slug == "labor-strike":
        return 3
    return 0


def infer_confidence(event_type_slug: str, has_location: bool) -> float:
    base = 0.72 if event_type_slug else 0.55
    if has_location:
        base += 0.08
    return min(base, 0.92)


def find_countries(text: str, centroids: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = f" {normalize_text(text)} "
    matches: list[dict[str, Any]] = []
    seen: set[str] = set()

    for alias, canonical_name in COUNTRY_ALIASES.items():
        token = f" {alias} "
        if token in normalized and canonical_name not in seen and canonical_name in centroids:
            matches.append(centroids[canonical_name])
            seen.add(canonical_name)

    for country_name, record in centroids.items():
        token = f" {country_name.lower()} "
        if token in normalized and country_name not in seen:
            matches.append(record)
            seen.add(country_name)

    return matches


def build_event_fingerprint(article_hash: str, event_type_slug: str, industry_slug: str, location_name: str | None) -> str:
    material = "||".join([article_hash, event_type_slug, industry_slug, location_name or "none"])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def should_drop_as_non_event(title_text: str, body_text: str, event_type_slug: str | None) -> bool:
    non_event_patterns = (
        "top ten",
        "smartphone models",
        "heat records",
        "unchecked rise",
        "unlocking new possibilities",
    )
    if any(pattern in title_text for pattern in non_event_patterns):
        return True
    return event_type_slug is None


def extract_event_candidate(
    article: dict[str, Any],
    source_slug: str,
    centroids: dict[str, dict[str, Any]],
) -> EventCandidate | None:
    title_text = strip_html(article.get("title"))
    summary_text = strip_html(article.get("summary"))
    combined_text = normalize_text(" ".join(part for part in [title_text, summary_text] if part))

    event_type_slug = infer_event_type(combined_text)
    if should_drop_as_non_event(normalize_text(title_text), combined_text, event_type_slug):
        return None

    industry_slug = infer_industry(source_slug, combined_text)
    if not industry_slug or not event_type_slug:
        return None

    subsector_slug = infer_subsector(industry_slug, combined_text)
    matched_countries = find_countries(" ".join([title_text, summary_text]), centroids)
    primary_country = matched_countries[0] if matched_countries else None

    locations: list[EventLocationCandidate] = []
    countries: list[str] = []
    if primary_country:
        locations.append(
            EventLocationCandidate(
                location_name=primary_country["name"],
                latitude=primary_country["latitude"],
                longitude=primary_country["longitude"],
                country_iso3=primary_country["iso3"],
                confidence_score=0.72,
            ),
        )
        countries.append(primary_country["iso3"])

    published_at = article.get("published_at")
    event_date = published_at[:10] if published_at else None
    severity_level = infer_severity(event_type_slug, combined_text)
    confidence_score = infer_confidence(event_type_slug, bool(primary_country))
    evidence_snippet = (summary_text or title_text)[:280]

    return EventCandidate(
        title=title_text,
        summary=(summary_text or title_text)[:600],
        industry_slug=industry_slug,
        subsector_slug=subsector_slug,
        event_type_slug=event_type_slug,
        severity_level=severity_level,
        confidence_score=confidence_score,
        event_date=event_date,
        countries=countries,
        locations=locations,
        evidence_snippet=evidence_snippet,
        metadata={
            "source_slug": source_slug,
            "article_hash": article["article_hash"],
            "extraction_method": "heuristic_v2",
        },
    )


def upsert_countries(client: SupabaseRestClient, matched_countries: list[dict[str, Any]]) -> dict[str, str]:
    if not matched_countries:
        return {}
    rows = [
        {
            "iso2": item["iso2"],
            "iso3": item["iso3"],
            "name": item["name"],
        }
        for item in matched_countries
    ]
    response_rows = client.post("countries", rows, {"on_conflict": "iso3"})
    return {row["iso3"]: row["id"] for row in response_rows}


def enrich_articles() -> dict[str, Any]:
    client = SupabaseRestClient()
    references = fetch_reference_maps(client)
    centroids = load_country_centroids()
    articles = fetch_pending_articles(client)

    event_rows_written = 0
    article_status_updates = {"evented": 0, "no_event": 0, "error": 0}

    for article in articles:
        source_id = article["source_id"]
        source_slug = references["source_slug_by_id"].get(source_id, "")

        try:
            candidate = extract_event_candidate(article, source_slug, centroids)
            if candidate is None:
                client.patch(
                    "articles",
                    {"id": f"eq.{article['id']}"},
                    {
                        "enrichment_status": "no_event",
                        "enriched_at": utc_now_iso(),
                        "last_enrichment_error": None,
                    },
                )
                article_status_updates["no_event"] += 1
                continue

            industry_id = references["industry_by_slug"][candidate.industry_slug]["id"]
            subsector_id = (
                references["subsector_by_slug"][candidate.subsector_slug]["id"]
                if candidate.subsector_slug in references["subsector_by_slug"]
                else None
            )
            event_type_id = references["event_type_by_slug"][candidate.event_type_slug]["id"]

            matched_country_records = [
                centroids[location.location_name]
                for location in candidate.locations
                if location.location_name in centroids
            ]
            country_id_map = upsert_countries(client, matched_country_records)
            primary_location_name = candidate.locations[0].location_name if candidate.locations else None
            event_fingerprint = build_event_fingerprint(
                article["article_hash"],
                candidate.event_type_slug or "unknown",
                candidate.industry_slug,
                primary_location_name,
            )

            event_payload = {
                "event_fingerprint": event_fingerprint,
                "title": candidate.title,
                "summary": candidate.summary,
                "industry_id": industry_id,
                "subsector_id": subsector_id,
                "event_type_id": event_type_id,
                "severity_level": candidate.severity_level,
                "confidence_score": candidate.confidence_score,
                "event_status": candidate.event_status,
                "event_date": candidate.event_date,
                "metadata": candidate.metadata,
            }
            event_rows = client.post("events", [event_payload], {"on_conflict": "event_fingerprint"})
            event_id = event_rows[0]["id"]

            if candidate.locations:
                location_rows = []
                for location in candidate.locations:
                    location_rows.append(
                        {
                            "event_id": event_id,
                            "country_id": country_id_map.get(location.country_iso3 or ""),
                            "location_name": location.location_name,
                            "admin1": location.admin1,
                            "city": location.city,
                            "location_role": location.location_role,
                            "latitude": location.latitude,
                            "longitude": location.longitude,
                            "is_canonical": location.is_canonical,
                            "confidence_score": location.confidence_score,
                        }
                    )
                client.post("event_locations", location_rows)

            client.post(
                "event_articles",
                [
                    {
                        "event_id": event_id,
                        "article_id": article["id"],
                        "role": "primary",
                        "evidence_snippet": candidate.evidence_snippet,
                    }
                ],
                {"on_conflict": "event_id,article_id"},
            )

            client.patch(
                "articles",
                {"id": f"eq.{article['id']}"},
                {
                    "enrichment_status": "evented",
                    "enriched_at": utc_now_iso(),
                    "last_enrichment_error": None,
                },
            )
            article_status_updates["evented"] += 1
            event_rows_written += 1
        except Exception as exc:
            client.patch(
                "articles",
                {"id": f"eq.{article['id']}"},
                {
                    "enrichment_status": "error",
                    "enriched_at": utc_now_iso(),
                    "last_enrichment_error": str(exc)[:1000],
                },
            )
            article_status_updates["error"] += 1

    result = {
        "generated_at": utc_now_iso(),
        "processed_articles": len(articles),
        "event_rows_written": event_rows_written,
        "article_status_updates": article_status_updates,
    }
    artifact_path = write_artifact("latest_enrichment_snapshot.json", result)
    result["artifact_path"] = str(artifact_path)
    return result


def main() -> None:
    result = enrich_articles()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
