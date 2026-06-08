export const CURRENT_SCOPE = [
  {
    title: "Semiconductors",
    badge: "Locked",
    description:
      "Supply-chain and business-model oriented coverage across design, foundry, equipment, materials, packaging, and memory.",
  },
  {
    title: "Oil & Gas",
    badge: "Locked",
    description:
      "Value-chain oriented coverage across upstream, field services, midstream, LNG, refining, petrochemicals, and distribution.",
  },
] as const;

export const APP_FOUNDATIONS = [
  {
    kicker: "Data model",
    title: "Event-first contracts",
    description:
      "Frontend assumptions map directly to the Supabase schema: industries, subsectors, event types, event locations, and event-to-article traceability.",
  },
  {
    kicker: "Geospatial",
    title: "Map-ready records",
    description:
      "Canonical point locations, severity signals, and bounding-box query design are treated as first-class requirements from day one.",
  },
  {
    kicker: "Operations",
    title: "Thin ingestion path",
    description:
      "Curated public sources, RSS-first collection, deterministic normalization, and staged enrichment keep the first pipeline observable and debuggable.",
  },
  {
    kicker: "Frontend",
    title: "Stable app shell",
    description:
      "A dedicated web workspace, typed route foundation, health endpoint, and shared domain constants reduce rewrite pressure as the app expands.",
  },
] as const;

export const PIPELINE_STEPS = [
  {
    title: "Collect trusted source material",
    description:
      "Public industry, government, and trade sources are ingested through a curated registry with RSS-first preference and traceable source metadata.",
  },
  {
    title: "Normalize articles before enrichment",
    description:
      "Every article is stored as evidence with stable hashes, timestamps, summaries, and raw payload fragments before downstream interpretation.",
  },
  {
    title: "Extract events for the map layer",
    description:
      "Article evidence is converted into structured events with industry, subsector, event type, confidence, severity, and one or more mapped locations.",
  },
] as const;

export const SEVERITY_SCALE = [
  {
    level: 0,
    label: "Neutral",
    color: "Green",
    hex: "#2E8B57",
    description:
      "Material industry news without a clear disruption, restriction, or risk signal yet.",
  },
  {
    level: 1,
    label: "Low Significance",
    color: "Yellow",
    hex: "#F1C40F",
    description:
      "A limited local development or early signal that deserves monitoring but not escalation.",
  },
  {
    level: 2,
    label: "Guarded",
    color: "Orange",
    hex: "#E67E22",
    description:
      "A contained operational or policy development with clear but still bounded implications.",
  },
  {
    level: 3,
    label: "Elevated",
    color: "Red",
    hex: "#C0392B",
    description:
      "A regional disruption, major plant issue, or meaningful trade or logistics constraint.",
  },
  {
    level: 4,
    label: "Severe",
    color: "Dark Purple",
    hex: "#4B0082",
    description:
      "A cross-border or multi-company disruption with major supply-chain implications.",
  },
  {
    level: 5,
    label: "Critical",
    color: "Black",
    hex: "#111111",
    description:
      "A systemic or globally material event with acute geopolitical or supply-chain consequences.",
  },
] as const;
