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
from requests import RequestException

from models import EnrichmentDecision, EventCandidate, EventLocationCandidate


ROOT = Path(__file__).resolve().parents[1]
COUNTRY_CENTROIDS_PATH = ROOT / "data" / "geo" / "country_centroids.json"
LOCATION_ALIASES_PATH = ROOT / "data" / "geo" / "location_aliases.json"
ARTIFACT_DIR = ROOT / "tmp" / "enrichment"
TIMEOUT_SECONDS = 30
ARTICLE_BATCH_SIZE = int(os.getenv("EVENT_ENRICH_BATCH_SIZE", "40"))
MIN_SIGNAL_SCORE = float(os.getenv("EVENT_ENRICH_MIN_SIGNAL_SCORE", "2.9"))
MIN_EVENT_CONFIDENCE = float(os.getenv("EVENT_ENRICH_MIN_CONFIDENCE", "0.8"))
MAX_RETRYABLE_ATTEMPTS = int(os.getenv("EVENT_ENRICH_MAX_RETRYABLE_ATTEMPTS", "3"))
ENRICHMENT_VERSION = os.getenv("EVENT_ENRICH_VERSION", "heuristic_v4")
REPROCESS_EXISTING = os.getenv("EVENT_ENRICH_REPROCESS_EXISTING", "0").lower() in {"1", "true", "yes"}
REPROCESS_STATUSES = tuple(
    status.strip()
    for status in os.getenv(
        "EVENT_ENRICH_REPROCESS_STATUSES",
        "no_event,neutral_intelligence,discarded",
    ).split(",")
    if status.strip()
)

STRIP_TAGS_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9\s-]")
WORD_RE = re.compile(r"[a-z0-9][a-z0-9\-]+")

EVENT_TYPE_PATTERNS: dict[str, tuple[str, ...]] = {
    "export-control": ("export control", "entity list", "license requirement", "chip ban", "curb", "restriction"),
    "import-ban": ("import ban", "imports banned", "banned imports", "ban on imports"),
    "tariff": ("tariff", "duties", "import levy", "trade duty"),
    "sanction": ("sanction", "blacklist", "embargo", "restricted party"),
    "factory-shutdown": ("shutdown", "halts production", "production halt", "outage", "offline", "fab outage", "plant outage", "idle", "shut off wells", "shut in wells", "shut in"),
    "port-disruption": ("port disruption", "port closed", "shipping disruption", "terminal disruption", "vessel delays", "shipping bottleneck"),
    "pipeline-disruption": ("pipeline disruption", "pipeline outage", "pipeline leak", "pipeline shutdown", "pipeline fire"),
    "labor-strike": ("strike", "striking", "walkout", "labor action", "industrial action", "pay dispute", "workers striking"),
    "policy-change": ("policy change", "regulation", "rulemaking", "mandate", "licensing regime", "ministerial order", "strategy", "chips act", "new rule", "boost production", "cut production", "production increase", "production cuts", "output increase", "output cuts"),
    "supply-shortage": ("shortage", "allocation", "tight supply", "supply crunch", "scarcity"),
    "investment-announcement": (
        "final investment decision",
        "fid",
        "starts up",
        "startup",
        "starts production",
        "start production",
        "begins production",
        "begins operations",
        "proceed with",
        "funding reaches",
        "investment",
        "investing",
        "raises funding",
        "secures agreements",
        "approves project",
        "greenlights",
        "build oil reserve",
        "stockpile",
        "commissioning",
        "commissioned",
        "new plant",
        "new fab",
        "expansion project",
        "expands plant",
        "build new",
        "bring online",
    ),
    "accident-disaster": ("fire", "explosion", "spill", "earthquake", "flood", "accident", "storm", "blast"),
    "conflict-disruption": ("war", "conflict", "missile", "attack", "blockade", "drone strike", "air strike", "retaliatory", "fires back", "downed"),
}

EVENT_TYPE_CONTEXT_TERMS: dict[str, tuple[str, ...]] = {
    "factory-shutdown": ("plant", "facility", "production", "output", "fab", "refinery", "terminal", "well", "basin"),
    "port-disruption": ("port", "terminal", "shipping", "vessel", "cargo", "export"),
    "pipeline-disruption": ("pipeline", "gas", "oil", "crude", "flow", "supply"),
    "labor-strike": ("workers", "union", "pay", "operations", "offshore", "plant"),
    "policy-change": ("government", "ministry", "commission", "law", "industry", "strategy", "opec", "output", "production"),
    "investment-announcement": ("project", "plant", "fab", "facility", "terminal", "production", "capacity", "funding", "reserve", "stockpile"),
    "conflict-disruption": ("oil", "gas", "shipping", "supply", "market", "trade", "export"),
}

SEMICONDUCTOR_SUBSECTOR_PATTERNS: dict[str, tuple[str, ...]] = {
    "eda-ip": ("eda", "electronic design automation", "ip block", "design software", "verification ip"),
    "fabless-design": ("chip design", "fabless", "soc", "fpga", "gpu", "cpu", "processor", "ai chip", "microcontroller", "accelerator"),
    "foundry-fabrication": ("foundry", "wafer fab", "fabrication", "fab", "process node", "wafer start", "leading edge", "logic production"),
    "idm": ("idm", "integrated device manufacturer", "intel", "infineon", "stmicroelectronics", "onsemi", "renesas", "ti"),
    "equipment": ("lithography", "etch", "deposition", "metrology", "toolmaker", "equipment", "process tool", "inspection tool", "wafer tool"),
    "materials-wafers": ("wafer", "photoresist", "substrate", "silicon carbide", "sic", "gallium nitride", "materials", "epitaxy", "specialty gas", "mask blank"),
    "packaging-test": ("packaging", "osat", "advanced packaging", "backend test", "chiplet", "assembly and test", "co-packaged optics"),
    "memory": ("dram", "nand", "hbm", "memory", "flash memory"),
}

OIL_GAS_SUBSECTOR_PATTERNS: dict[str, tuple[str, ...]] = {
    "upstream-ep": ("exploration", "production", "upstream", "offshore field", "well", "acreage", "offshore block"),
    "oilfield-services": ("rig", "drilling", "oilfield services", "completion", "frac", "well services", "offshore workers", "subsea"),
    "midstream": ("pipeline", "terminal", "storage", "midstream", "tanker", "shipping lane", "gathering system", "oil reserve", "strategic reserve"),
    "lng-gas-processing": ("lng", "liquefied natural gas", "regasification", "gas processing", "liquefaction", "export terminal", "flng", "floating lng"),
    "refining": ("refinery", "refining", "crude processing", "refined products", "distillation unit", "diesel"),
    "petrochemicals-ngls": ("petrochemical", "ngl", "fractionation", "ethylene", "propylene", "cracker"),
    "fuel-distribution": ("fuel marketing", "distribution", "retail fuel", "service station", "wholesale fuel"),
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

STOPWORDS = {
    "the", "and", "for", "with", "from", "into", "over", "after", "amid", "this", "that", "their",
    "about", "under", "will", "would", "could", "should", "into", "near", "says", "said", "report",
    "reports", "industry", "supply", "chain", "global", "market", "markets", "company", "companies",
    "sector", "sectors", "news", "update", "latest", "new", "plant", "plants", "facility", "facilities",
}

GENERIC_EVENT_TERMS = {
    "outage", "shutdown", "strike", "tariff", "sanction", "conflict", "war", "attack", "policy",
    "regulation", "investment", "expansion", "shortage", "supply", "port", "pipeline", "factory", "plant",
}

NON_EVENT_PATTERNS = (
    "top ten",
    "smartphone models",
    "unlocking new possibilities",
    "quarterly earnings",
    "earnings beat",
    "product launch",
    "new smartphone",
    "conference preview",
    "opinion:",
    "podcast:",
    "webinar",
    "why is ",
    "tracker",
    "capacity increased slightly",
    "drive monthly capacity",
    "planned natural gas pipeline capacity additions",
    "grows across the commercial building stock",
)

RETRYABLE_EXCEPTION_MARKERS = ("timeout", "temporarily", "connection", "dns", "reset by peer")


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
    lowered = NON_ALNUM_RE.sub(" ", value.lower())
    return SPACE_RE.sub(" ", lowered).strip()


def load_country_centroids() -> dict[str, dict[str, Any]]:
    records = json.loads(COUNTRY_CENTROIDS_PATH.read_text(encoding="utf-8"))
    return {record["name"]: record for record in records}


def load_location_aliases() -> list[dict[str, Any]]:
    return json.loads(LOCATION_ALIASES_PATH.read_text(encoding="utf-8"))


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
    or_filters = [
        "enrichment_status.eq.pending",
        "and(enrichment_status.eq.error,enrichment_error_kind.eq.retryable,enrichment_attempts.lt.3)",
    ]
    if REPROCESS_EXISTING and REPROCESS_STATUSES:
        or_filters.extend(f"enrichment_status.eq.{status}" for status in REPROCESS_STATUSES)
    return client.get(
        "articles",
        {
            "select": "id,title,summary,content_text,url,canonical_url,published_at,article_hash,source_id,enrichment_status,enrichment_attempts,enrichment_error_kind,enrichment_outcome_reason",
            "or": f"({','.join(or_filters)})",
            "order": "published_at.desc",
            "limit": str(ARTICLE_BATCH_SIZE),
        },
    )


def has_pattern(text: str, pattern: str) -> bool:
    if " " in pattern:
        return pattern in text
    return re.search(rf"\b{re.escape(pattern)}\b", text) is not None


def matched_patterns(text: str, patterns: tuple[str, ...]) -> list[str]:
    return [pattern for pattern in patterns if has_pattern(text, pattern)]


def infer_event_type(title_text: str, combined_text: str) -> tuple[str | None, list[str], float]:
    best_slug: str | None = None
    best_terms: list[str] = []
    best_score = 0.0
    for event_type, patterns in EVENT_TYPE_PATTERNS.items():
        title_hits = matched_patterns(title_text, patterns)
        body_hits = matched_patterns(combined_text, patterns)
        unique_hits = sorted(set(title_hits + body_hits))
        if not unique_hits:
            continue
        score = (1.7 * len(title_hits)) + (0.9 * len(set(body_hits)))
        context_hits = matched_patterns(combined_text, EVENT_TYPE_CONTEXT_TERMS.get(event_type, ()))
        score += 0.3 * len(set(context_hits))
        if title_hits and context_hits:
            score += 0.2
        if event_type in {"conflict-disruption", "factory-shutdown", "pipeline-disruption", "port-disruption"}:
            score += 0.25
        if len(unique_hits) == 1 and unique_hits[0] in {"attack", "policy", "investment", "strike"} and not context_hits:
            score -= 0.6
        if score > best_score:
            best_slug = event_type
            best_terms = unique_hits
            best_score = score
    return best_slug, best_terms, best_score


def infer_subsector(industry_slug: str, title_text: str, combined_text: str) -> tuple[str | None, list[str]]:
    pattern_map = (
        SEMICONDUCTOR_SUBSECTOR_PATTERNS
        if industry_slug == "semiconductors"
        else OIL_GAS_SUBSECTOR_PATTERNS
    )
    best_slug: str | None = None
    best_terms: list[str] = []
    best_score = 0.0
    for subsector_slug, patterns in pattern_map.items():
        title_hits = matched_patterns(title_text, patterns)
        body_hits = matched_patterns(combined_text, patterns)
        unique_hits = sorted(set(title_hits + body_hits))
        if not unique_hits:
            continue
        score = (1.5 * len(title_hits)) + (0.8 * len(set(body_hits)))
        if score > best_score:
            best_slug = subsector_slug
            best_terms = unique_hits
            best_score = score
    return best_slug, best_terms


def infer_industry(source_slug: str, text: str) -> tuple[str | None, list[str]]:
    if source_slug in SOURCE_INDUSTRY_HINTS:
        return SOURCE_INDUSTRY_HINTS[source_slug], [f"source:{source_slug}"]
    semiconductor_terms = matched_patterns(
        text,
        ("chip", "semiconductor", "wafer", "foundry", "fab", "packaging", "memory", "lithography"),
    )
    oil_gas_terms = matched_patterns(
        text,
        ("oil", "gas", "lng", "pipeline", "refinery", "rig", "petrochemical", "crude"),
    )
    if len(semiconductor_terms) > len(oil_gas_terms):
        return "semiconductors", semiconductor_terms
    if len(oil_gas_terms) > len(semiconductor_terms):
        return "oil-gas", oil_gas_terms
    return None, []


def infer_severity(event_type_slug: str, text: str, location_count: int) -> int:
    escalation_terms = matched_patterns(
        text,
        (
            "global", "systemic", "cross border", "cross-border", "nationwide", "major",
            "multiple plants", "multiple companies", "shipping lane", "entity list",
        ),
    )
    disruption_terms = matched_patterns(
        text,
        ("shutdown", "outage", "halt", "attack", "explosion", "spill", "blockade", "leak", "shortage"),
    )

    if event_type_slug in {"conflict-disruption", "sanction", "export-control"}:
        severity = 4
        if len(escalation_terms) >= 2 or location_count > 1:
            severity += 1
        if not disruption_terms:
            severity -= 1
        return max(3, min(severity, 5))
    if event_type_slug in {"factory-shutdown", "pipeline-disruption", "port-disruption", "accident-disaster"}:
        severity = 3
        if len(escalation_terms) >= 1 or location_count > 1:
            severity += 1
        return min(severity, 5)
    if event_type_slug in {"tariff", "import-ban", "policy-change", "supply-shortage"}:
        severity = 2
        if len(escalation_terms) >= 1:
            severity += 1
        return min(severity, 4)
    if event_type_slug == "investment-announcement":
        strategic_terms = matched_patterns(text, ("advanced packaging", "lng", "foundry", "hbm", "leading edge", "export terminal"))
        return 2 if strategic_terms else 1
    if event_type_slug == "labor-strike":
        severity = 3
        if len(escalation_terms) >= 1 or any(term in text for term in ("offshore", "lng", "pipeline", "refinery")):
            severity += 1
        return min(severity, 4)
    return 0


def infer_confidence(signal_score: float, has_precise_location: bool, has_subsector: bool, title_hit_count: int) -> float:
    confidence = 0.54 + min(signal_score, 4.5) * 0.085
    if has_precise_location:
        confidence += 0.08
    if has_subsector:
        confidence += 0.05
    if title_hit_count >= 2:
        confidence += 0.04
    return min(round(confidence, 3), 0.97)


def classify_non_event_status(
    drop_reason: str,
    industry_slug: str | None,
    event_type_slug: str | None,
    signal_score: float,
    locations: list[EventLocationCandidate],
) -> str:
    if drop_reason == "non_event_pattern":
        return "discarded"
    if not industry_slug and not event_type_slug:
        return "discarded"
    if drop_reason == "low_signal_score" and signal_score < max(MIN_SIGNAL_SCORE - 0.5, 0):
        return "discarded"
    if event_type_slug and signal_score >= max(MIN_SIGNAL_SCORE - 0.3, 0):
        return "neutral_intelligence"
    if industry_slug or locations:
        return "neutral_intelligence"
    return "discarded"


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


def best_match_position(text: str, aliases: tuple[str, ...] | list[str]) -> int | None:
    best: int | None = None
    for alias in aliases:
        position = text.find(f" {alias} ")
        if position >= 0 and (best is None or position < best):
            best = position
    return best


def precision_weight(precision: str | None) -> int:
    weights = {
        "terminal": 120,
        "port": 118,
        "facility": 116,
        "canal": 112,
        "strait": 110,
        "city": 108,
        "state": 102,
        "province": 101,
        "sea": 96,
        "country": 80,
    }
    return weights.get(precision or "", 90)


def mention_score(
    title_text: str,
    summary_text: str,
    body_text: str,
    aliases: tuple[str, ...] | list[str],
    precision: str | None,
) -> float | None:
    title_position = best_match_position(title_text, aliases)
    summary_position = best_match_position(summary_text, aliases)
    body_position = best_match_position(body_text, aliases)
    if title_position is None and summary_position is None and body_position is None:
        return None

    source_bonus = 0.0
    position = 0
    if title_position is not None:
        source_bonus = 28.0
        position = title_position
    elif summary_position is not None:
        source_bonus = 18.0
        position = summary_position
    elif body_position is not None:
        source_bonus = 10.0
        position = body_position

    return precision_weight(precision) + source_bonus - min(position / 48.0, 8.0)


def slugify_for_fingerprint(value: str) -> str:
    return "-".join(word for word in WORD_RE.findall(normalize_text(value)) if word not in STOPWORDS)[:160]


def extract_salient_tokens(title_text: str) -> list[str]:
    tokens: list[str] = []
    for token in WORD_RE.findall(normalize_text(title_text)):
        if len(token) < 4 or token in STOPWORDS or token in GENERIC_EVENT_TERMS:
            continue
        if token not in tokens:
            tokens.append(token)
    return tokens[:6]


def build_event_fingerprint(
    event_type_slug: str,
    industry_slug: str,
    event_date: str | None,
    primary_location_key: str | None,
    salient_tokens: list[str],
) -> str:
    material = "||".join(
        [
            industry_slug,
            event_type_slug,
            event_date or "undated",
            primary_location_key or "unlocated",
            ",".join(salient_tokens) or "untitled",
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def should_drop_as_non_event(title_text: str, body_text: str, event_type_slug: str | None, signal_score: float) -> str | None:
    if any(pattern in title_text for pattern in NON_EVENT_PATTERNS):
        return "non_event_pattern"
    if event_type_slug is None:
        return "missing_event_type"
    if event_type_slug == "investment-announcement" and not any(
        anchor in body_text
        for anchor in (
            "final investment decision",
            "starts up",
            "startup",
            "starts production",
            "start production",
            "begins production",
            "begins operations",
            "proceed with",
            "funding reaches",
            "raises funding",
            "secures agreements",
            "approves project",
            "greenlights",
            "build oil reserve",
            "stockpile",
            "new plant",
            "new fab",
            "commissioning",
            "commissioned",
            "bring online",
            "investing",
        )
    ):
        return "generic_investment_language"
    if signal_score < MIN_SIGNAL_SCORE:
        return "low_signal_score"
    return None


def resolve_locations(
    title_text: str,
    summary_text: str,
    body_text: str,
    centroids: dict[str, dict[str, Any]],
    location_aliases: list[dict[str, Any]],
) -> tuple[list[EventLocationCandidate], list[str], list[str]]:
    normalized_title = f" {normalize_text(title_text)} "
    normalized_summary = f" {normalize_text(summary_text)} "
    normalized_body = f" {normalize_text(body_text)} "
    normalized = " ".join([normalized_title, normalized_summary, normalized_body])
    resolved: list[EventLocationCandidate] = []
    country_isos: list[str] = []
    precisions: list[str] = []
    seen_names: set[str] = set()
    ranked_matches: list[tuple[float, EventLocationCandidate]] = []

    for entry in location_aliases:
        score = mention_score(
            normalized_title,
            normalized_summary,
            normalized_body,
            entry["aliases"],
            entry.get("precision"),
        )
        if score is not None:
            name = entry["name"]
            if name in seen_names:
                continue
            seen_names.add(name)
            precision = entry.get("precision")
            ranked_matches.append(
                (
                    score,
                    EventLocationCandidate(
                        location_name=name,
                        latitude=entry["latitude"],
                        longitude=entry["longitude"],
                        location_role=entry.get("location_role", "primary"),
                        country_iso3=entry.get("country_iso3"),
                        admin1=entry.get("admin1"),
                        city=entry.get("city"),
                        precision=precision,
                        confidence_score=0.86 if precision in {"port", "terminal", "city", "canal", "strait"} else 0.8,
                    ),
                )
            )

    for alias, canonical_name in COUNTRY_ALIASES.items():
        if canonical_name in seen_names or canonical_name not in centroids:
            continue
        score = mention_score(normalized_title, normalized_summary, normalized_body, [alias], "country")
        if score is not None:
            country = centroids[canonical_name]
            seen_names.add(canonical_name)
            ranked_matches.append(
                (
                    score,
                    EventLocationCandidate(
                        location_name=country["name"],
                        latitude=country["latitude"],
                        longitude=country["longitude"],
                        country_iso3=country["iso3"],
                        precision="country",
                        confidence_score=0.72,
                    ),
                )
            )

    for country_name, record in centroids.items():
        if country_name in seen_names:
            continue
        score = mention_score(normalized_title, normalized_summary, normalized_body, [country_name.lower()], "country")
        if score is not None:
            seen_names.add(country_name)
            ranked_matches.append(
                (
                    score,
                    EventLocationCandidate(
                        location_name=record["name"],
                        latitude=record["latitude"],
                        longitude=record["longitude"],
                        country_iso3=record["iso3"],
                        precision="country",
                        confidence_score=0.72,
                    ),
                )
            )

    for _, location in sorted(ranked_matches, key=lambda item: item[0], reverse=True):
        resolved.append(location)
        if location.country_iso3:
            country_isos.append(location.country_iso3)
        if location.precision:
            precisions.append(location.precision)

    return resolved, sorted(set(country_isos)), precisions


def fetch_existing_event(client: SupabaseRestClient, event_fingerprint: str) -> dict[str, Any] | None:
    rows = client.get(
        "events",
        {
            "select": "id,title,confidence_score,event_fingerprint,metadata",
            "event_fingerprint": f"eq.{event_fingerprint}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def fetch_similar_events(
    client: SupabaseRestClient,
    industry_id: str,
    event_type_id: str,
    event_date: str | None,
) -> list[dict[str, Any]]:
    if not event_date:
        return []
    return client.get(
        "events",
        {
            "select": "id,title,confidence_score,event_date,event_fingerprint,metadata",
            "industry_id": f"eq.{industry_id}",
            "event_type_id": f"eq.{event_type_id}",
            "event_date": f"eq.{event_date}",
            "limit": "12",
            "order": "created_at.desc",
        },
    )


def find_probable_duplicate_event(
    similar_events: list[dict[str, Any]],
    primary_location_key: str | None,
    salient_tokens: list[str],
) -> dict[str, Any] | None:
    candidate_tokens = set(salient_tokens)
    for event in similar_events:
        metadata = event.get("metadata") or {}
        existing_location_key = metadata.get("primary_location_key")
        existing_tokens = set(metadata.get("salient_tokens") or [])
        if primary_location_key and existing_location_key == primary_location_key:
            if not candidate_tokens or len(candidate_tokens & existing_tokens) >= 2:
                return event
    return None


def fetch_existing_locations(client: SupabaseRestClient, event_id: str) -> list[dict[str, Any]]:
    rows = client.get(
        "event_locations",
        {"select": "id,location_name,latitude,longitude,is_canonical", "event_id": f"eq.{event_id}", "limit": "50"},
    )
    for row in rows:
        row["location_key"] = f"{row['location_name']}|{row['latitude']}|{row['longitude']}"
    return rows


def fetch_existing_event_article_ids(client: SupabaseRestClient, event_id: str) -> set[str]:
    rows = client.get(
        "event_articles",
        {"select": "article_id", "event_id": f"eq.{event_id}", "limit": "50"},
    )
    return {row["article_id"] for row in rows}


def fetch_linked_event_for_article(client: SupabaseRestClient, article_id: str) -> dict[str, Any] | None:
    links = client.get(
        "event_articles",
        {"select": "event_id", "article_id": f"eq.{article_id}", "limit": "1"},
    )
    if not links:
        return None
    rows = client.get(
        "events",
        {"select": "id,title,confidence_score,event_fingerprint,metadata", "id": f"eq.{links[0]['event_id']}", "limit": "1"},
    )
    return rows[0] if rows else None


def is_retryable_exception(exc: Exception) -> bool:
    if isinstance(exc, RequestException):
        return True
    message = str(exc).lower()
    return any(marker in message for marker in RETRYABLE_EXCEPTION_MARKERS)


def extract_event_candidate(
    article: dict[str, Any],
    source_slug: str,
    centroids: dict[str, dict[str, Any]],
    location_aliases: list[dict[str, Any]],
) -> EnrichmentDecision:
    title_text = strip_html(article.get("title"))
    summary_text = strip_html(article.get("summary"))
    content_text = strip_html(article.get("content_text"))
    combined_text = normalize_text(" ".join(part for part in [title_text, summary_text, content_text] if part))
    normalized_title = normalize_text(title_text)

    industry_slug, industry_terms = infer_industry(source_slug, combined_text)
    event_type_slug, event_terms, event_signal_score = infer_event_type(normalized_title, combined_text)
    provisional_locations, _, _ = resolve_locations(title_text, summary_text, content_text, centroids, location_aliases)
    drop_reason = should_drop_as_non_event(normalized_title, combined_text, event_type_slug, event_signal_score)
    if drop_reason:
        return EnrichmentDecision(
            article_status=classify_non_event_status(
                drop_reason,
                industry_slug,
                event_type_slug,
                event_signal_score,
                provisional_locations,
            ),
            outcome_reason=drop_reason,
            review_notes=[f"signal_score:{round(event_signal_score, 3)}"],
        )
    if not industry_slug:
        return EnrichmentDecision(
            article_status="discarded",
            outcome_reason="missing_industry",
            review_notes=[f"event_type:{event_type_slug or 'unknown'}"],
        )
    if not event_type_slug:
        return EnrichmentDecision(
            article_status="neutral_intelligence",
            outcome_reason="missing_event_type",
            review_notes=[f"industry:{industry_slug}"],
        )

    subsector_slug, subsector_terms = infer_subsector(industry_slug, normalized_title, combined_text)
    locations, countries, precisions = resolve_locations(title_text, summary_text, content_text, centroids, location_aliases)
    primary_location = locations[0] if locations else None

    published_at = article.get("published_at")
    event_date = published_at[:10] if published_at else None
    severity_level = infer_severity(event_type_slug, combined_text, len(locations))
    confidence_score = infer_confidence(
        event_signal_score,
        bool(primary_location and primary_location.precision and primary_location.precision != "country"),
        bool(subsector_slug),
        len(matched_patterns(normalized_title, EVENT_TYPE_PATTERNS[event_type_slug])),
    )
    if confidence_score < MIN_EVENT_CONFIDENCE:
        return EnrichmentDecision(
            article_status="neutral_intelligence" if industry_slug or locations else "discarded",
            outcome_reason="low_confidence_event_candidate",
            review_notes=[
                f"confidence_score:{confidence_score}",
                f"signal_score:{round(event_signal_score, 3)}",
            ],
        )

    salient_tokens = extract_salient_tokens(title_text)
    primary_location_key = slugify_for_fingerprint(primary_location.location_name if primary_location else "unlocated")
    dedupe_key = slugify_for_fingerprint(
        "|".join(
            [
                industry_slug,
                event_type_slug,
                event_date or "undated",
                primary_location.location_name if primary_location else "unlocated",
                ",".join(salient_tokens),
            ]
        )
    )
    evidence_snippet = (summary_text or title_text)[:280]

    return EnrichmentDecision(
        article_status="evented",
        outcome_reason="event_created",
        candidate=EventCandidate(
            title=title_text,
            summary=(summary_text or title_text)[:600],
            industry_slug=industry_slug,
            subsector_slug=subsector_slug,
            event_type_slug=event_type_slug,
            severity_level=severity_level,
            confidence_score=confidence_score,
            event_date=event_date,
            countries=countries,
            locations=locations[:3],
            evidence_snippet=evidence_snippet,
            dedupe_key=dedupe_key,
            extraction_reasons=[
                f"event_type:{event_type_slug}",
                f"severity:{severity_level}",
                *(f"location:{precision}" for precision in sorted(set(precisions))),
            ],
            matched_terms={
                "event": event_terms,
                "industry": industry_terms,
                "subsector": subsector_terms,
            },
            signal_score=round(event_signal_score, 3),
            metadata={
                "source_slug": source_slug,
                "article_hash": article["article_hash"],
                "extraction_method": ENRICHMENT_VERSION,
                "location_precisions": sorted(set(precisions)),
                "primary_location_key": primary_location_key,
                "salient_tokens": salient_tokens,
                "matched_terms": {
                    "event": event_terms,
                    "industry": industry_terms,
                    "subsector": subsector_terms,
                },
                "signal_score": round(event_signal_score, 3),
                "title_hit_count": len(matched_patterns(normalized_title, EVENT_TYPE_PATTERNS[event_type_slug])),
                "dedupe_key": dedupe_key,
            },
        ),
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
    location_aliases = load_location_aliases()
    articles = fetch_pending_articles(client)

    event_rows_written = 0
    article_status_updates = {"evented": 0, "neutral_intelligence": 0, "discarded": 0, "error": 0}
    event_types_created: dict[str, int] = {}
    severity_counts: dict[str, int] = {}
    industry_counts: dict[str, int] = {}
    location_precision_counts: dict[str, int] = {}
    error_kind_counts = {"retryable": 0, "terminal": 0}
    outcome_reason_counts: dict[str, int] = {}
    status_reason_samples: dict[str, list[dict[str, Any]]] = {}

    for article in articles:
        source_id = article["source_id"]
        source_slug = references["source_slug_by_id"].get(source_id, "")
        attempts = int(article.get("enrichment_attempts") or 0) + 1

        try:
            decision = extract_event_candidate(article, source_slug, centroids, location_aliases)
            if decision.article_status != "evented" or decision.candidate is None:
                status_reason_samples.setdefault(decision.article_status, [])
                if len(status_reason_samples[decision.article_status]) < 8:
                    status_reason_samples[decision.article_status].append(
                        {
                            "title": article.get("title"),
                            "reason": decision.outcome_reason,
                            "review_notes": decision.review_notes,
                        }
                    )
                client.patch(
                    "articles",
                    {"id": f"eq.{article['id']}"},
                    {
                        "enrichment_status": decision.article_status,
                        "enrichment_outcome_reason": decision.outcome_reason,
                        "enrichment_error_kind": None,
                        "enrichment_attempts": attempts,
                        "enrichment_version": ENRICHMENT_VERSION,
                        "enriched_at": utc_now_iso(),
                        "last_enrichment_error": None,
                    },
                )
                article_status_updates[decision.article_status] += 1
                outcome_reason_counts[decision.outcome_reason] = outcome_reason_counts.get(decision.outcome_reason, 0) + 1
                continue
            candidate = decision.candidate

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
                candidate.event_type_slug or "unknown",
                candidate.industry_slug,
                candidate.event_date,
                slugify_for_fingerprint(primary_location_name or "unlocated"),
                extract_salient_tokens(candidate.title),
            )
            existing_event = fetch_linked_event_for_article(client, article["id"])
            if existing_event:
                event_fingerprint = existing_event.get("event_fingerprint", event_fingerprint)
            else:
                existing_event = fetch_existing_event(client, event_fingerprint)
            if existing_event is None:
                existing_event = find_probable_duplicate_event(
                    fetch_similar_events(client, industry_id, event_type_id, candidate.event_date),
                    candidate.metadata.get("primary_location_key"),
                    candidate.metadata.get("salient_tokens") or [],
                )
                if existing_event:
                    event_fingerprint = existing_event.get("event_fingerprint", event_fingerprint)

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
                existing_locations = fetch_existing_locations(client, event_id)
                existing_location_by_key = {row["location_key"]: row for row in existing_locations}
                existing_canonical = next((row for row in existing_locations if row.get("is_canonical")), None)
                desired_primary_key = (
                    f"{candidate.locations[0].location_name}|{candidate.locations[0].latitude}|{candidate.locations[0].longitude}"
                    if candidate.locations
                    else None
                )

                if (
                    desired_primary_key
                    and existing_canonical
                    and existing_canonical["location_key"] != desired_primary_key
                ):
                    client.patch(
                        "event_locations",
                        {"id": f"eq.{existing_canonical['id']}"},
                        {"is_canonical": False},
                    )
                    if desired_primary_key in existing_location_by_key:
                        client.patch(
                            "event_locations",
                            {"id": f"eq.{existing_location_by_key[desired_primary_key]['id']}"},
                            {"is_canonical": True},
                        )

                location_rows = []
                for index, location in enumerate(candidate.locations):
                    location_key = f"{location.location_name}|{location.latitude}|{location.longitude}"
                    if location_key in existing_location_by_key:
                        continue
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
                            "is_canonical": location_key == desired_primary_key and desired_primary_key not in existing_location_by_key,
                            "confidence_score": location.confidence_score,
                        }
                    )
                if location_rows:
                    client.post("event_locations", location_rows)

            existing_article_ids = fetch_existing_event_article_ids(client, event_id)
            client.post(
                "event_articles",
                [
                    {
                        "event_id": event_id,
                        "article_id": article["id"],
                        "role": "primary" if not existing_article_ids and not existing_event else "supporting",
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
                    "enrichment_outcome_reason": decision.outcome_reason,
                    "enrichment_error_kind": None,
                    "enrichment_attempts": attempts,
                    "enrichment_version": ENRICHMENT_VERSION,
                    "enriched_at": utc_now_iso(),
                    "last_enrichment_error": None,
                },
            )
            article_status_updates["evented"] += 1
            event_rows_written += 1
            event_types_created[candidate.event_type_slug or "unknown"] = (
                event_types_created.get(candidate.event_type_slug or "unknown", 0) + 1
            )
            severity_counts[str(candidate.severity_level)] = severity_counts.get(str(candidate.severity_level), 0) + 1
            industry_counts[candidate.industry_slug] = industry_counts.get(candidate.industry_slug, 0) + 1
            for location in candidate.locations:
                precision = location.precision or "unknown"
                location_precision_counts[precision] = location_precision_counts.get(precision, 0) + 1
        except Exception as exc:
            error_kind = "retryable" if is_retryable_exception(exc) and attempts < MAX_RETRYABLE_ATTEMPTS else "terminal"
            client.patch(
                "articles",
                {"id": f"eq.{article['id']}"},
                {
                    "enrichment_status": "error",
                    "enrichment_outcome_reason": "processing_exception",
                    "enrichment_error_kind": error_kind,
                    "enrichment_attempts": attempts,
                    "enrichment_version": ENRICHMENT_VERSION,
                    "enriched_at": utc_now_iso(),
                    "last_enrichment_error": str(exc)[:1000],
                },
            )
            article_status_updates["error"] += 1
            error_kind_counts[error_kind] += 1

    result = {
        "generated_at": utc_now_iso(),
        "processed_articles": len(articles),
        "event_rows_written": event_rows_written,
        "article_status_updates": article_status_updates,
        "event_type_counts": event_types_created,
        "severity_counts": severity_counts,
        "industry_counts": industry_counts,
        "location_precision_counts": location_precision_counts,
        "error_kind_counts": error_kind_counts,
        "outcome_reason_counts": outcome_reason_counts,
        "status_reason_samples": status_reason_samples,
        "reprocess_existing": REPROCESS_EXISTING,
        "reprocess_statuses": list(REPROCESS_STATUSES),
        "enrichment_version": ENRICHMENT_VERSION,
    }
    artifact_path = write_artifact("latest_enrichment_snapshot.json", result)
    result["artifact_path"] = str(artifact_path)
    return result


def main() -> None:
    result = enrich_articles()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
