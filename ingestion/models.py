from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ArticleRecord:
    source_slug: str
    url: str
    canonical_url: str
    title: str
    summary: str | None
    author: str | None
    language_code: str
    published_at: str | None
    discovered_at: str
    article_hash: str
    raw_payload: dict[str, Any]
    ingestion_status: str


@dataclass(slots=True)
class EventLocationCandidate:
    location_name: str
    latitude: float
    longitude: float
    location_role: str = "primary"
    country_iso3: str | None = None
    admin1: str | None = None
    city: str | None = None
    is_canonical: bool = True
    confidence_score: float = 0.5


@dataclass(slots=True)
class EventCandidate:
    title: str
    summary: str
    industry_slug: str
    subsector_slug: str | None
    event_type_slug: str | None
    severity_level: int
    confidence_score: float
    event_status: str = "active"
    event_date: str | None = None
    companies: list[str] = field(default_factory=list)
    countries: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    locations: list[EventLocationCandidate] = field(default_factory=list)
    evidence_snippet: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
