"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState, type PointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SEVERITY_SCALE } from "@/lib/site";
import type { PublicEvent } from "@/lib/events";

type FilterOption = {
  slug: string;
  name: string;
};

type ViewportState = {
  centerLng: number;
  centerLat: number;
  zoom: number;
};

type EventConsoleProps = {
  initialEvents: PublicEvent[];
  industries: FilterOption[];
  eventTypes: FilterOption[];
  initialFilters: {
    industry?: string;
    eventType?: string;
    severity?: string;
    selected?: string;
    centerLng?: number;
    centerLat?: number;
    zoom?: number;
  };
};

type MarkerCluster = {
  key: string;
  events: PublicEvent[];
  x: number;
  y: number;
  lng: number;
  lat: number;
};

const MAP_WIDTH = 1100;
const MAP_HEIGHT = 560;

const CONTINENTS = [
  [
    [-168, 72], [-150, 56], [-137, 54], [-128, 48], [-122, 38], [-116, 32], [-105, 24], [-98, 18],
    [-83, 22], [-81, 28], [-96, 48], [-112, 62], [-140, 69], [-168, 72],
  ],
  [
    [-82, 12], [-74, 8], [-70, -4], [-64, -18], [-60, -32], [-56, -42], [-50, -52], [-42, -50],
    [-38, -22], [-50, 0], [-62, 8], [-82, 12],
  ],
  [
    [-12, 36], [4, 44], [18, 52], [34, 56], [54, 58], [72, 54], [92, 50], [114, 46], [134, 42],
    [146, 32], [154, 16], [138, 6], [120, 12], [108, 18], [96, 8], [80, 22], [60, 28], [46, 34],
    [34, 30], [24, 24], [14, 20], [10, 8], [2, 4], [-6, 8], [-12, 20], [-12, 36],
  ],
  [
    [-16, 34], [-6, 28], [8, 18], [18, 6], [24, -12], [28, -22], [30, -34], [22, -36], [10, -30],
    [2, -18], [-6, -2], [-16, 14], [-16, 34],
  ],
  [
    [112, -12], [130, -10], [146, -20], [154, -34], [146, -42], [124, -38], [112, -24], [112, -12],
  ],
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function severityMeta(level: number) {
  return SEVERITY_SCALE.find((item) => item.level === level) ?? SEVERITY_SCALE[0];
}

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function computeViewportBounds(viewport: ViewportState) {
  const lngSpan = clamp(360 / viewport.zoom, 38, 360);
  const latSpan = clamp(170 / viewport.zoom, 24, 170);
  return {
    minLng: clamp(viewport.centerLng - lngSpan / 2, -180, 180),
    maxLng: clamp(viewport.centerLng + lngSpan / 2, -180, 180),
    minLat: clamp(viewport.centerLat - latSpan / 2, -85, 85),
    maxLat: clamp(viewport.centerLat + latSpan / 2, -85, 85),
  };
}

function projectPoint(lng: number, lat: number, viewport: ViewportState) {
  const bounds = computeViewportBounds(viewport);
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * MAP_WIDTH;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * MAP_HEIGHT;
  return { x, y };
}

function buildContour(points: number[][], viewport: ViewportState) {
  const projected = points
    .map(([lng, lat]) => projectPoint(lng, lat, viewport))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  return projected;
}

function clusterEvents(events: PublicEvent[], viewport: ViewportState) {
  const clusters: MarkerCluster[] = [];
  for (const event of events) {
    if (event.longitude == null || event.latitude == null) {
      continue;
    }
    const projected = projectPoint(event.longitude, event.latitude, viewport);
    if (
      projected.x < -24 ||
      projected.x > MAP_WIDTH + 24 ||
      projected.y < -24 ||
      projected.y > MAP_HEIGHT + 24
    ) {
      continue;
    }

    let placed = false;
    for (const cluster of clusters) {
      const dx = cluster.x - projected.x;
      const dy = cluster.y - projected.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 22) {
        cluster.events.push(event);
        cluster.x = (cluster.x * (cluster.events.length - 1) + projected.x) / cluster.events.length;
        cluster.y = (cluster.y * (cluster.events.length - 1) + projected.y) / cluster.events.length;
        cluster.lng = (cluster.lng * (cluster.events.length - 1) + event.longitude) / cluster.events.length;
        cluster.lat = (cluster.lat * (cluster.events.length - 1) + event.latitude) / cluster.events.length;
        placed = true;
        break;
      }
    }

    if (!placed) {
      clusters.push({
        key: event.event_id,
        events: [event],
        x: projected.x,
        y: projected.y,
        lng: event.longitude,
        lat: event.latitude,
      });
    }
  }
  return clusters;
}

function buildSearchParams(state: {
  industry: string;
  eventType: string;
  severity: string;
  selectedId: string;
  viewport: ViewportState;
}) {
  const params = new URLSearchParams();
  if (state.industry) params.set("industry", state.industry);
  if (state.eventType) params.set("eventType", state.eventType);
  if (state.severity) params.set("severity", state.severity);
  if (state.selectedId) params.set("selected", state.selectedId);
  params.set("centerLng", state.viewport.centerLng.toFixed(2));
  params.set("centerLat", state.viewport.centerLat.toFixed(2));
  params.set("zoom", state.viewport.zoom.toFixed(2));
  return params.toString();
}

function markerLabel(event: PublicEvent) {
  const parts = [event.location_name, event.city, event.country_name].filter(Boolean);
  return parts.join(", ") || "Unmapped";
}

export function EventConsole({
  initialEvents,
  industries,
  eventTypes,
  initialFilters,
}: EventConsoleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [industry, setIndustry] = useState(initialFilters.industry ?? "");
  const [eventType, setEventType] = useState(initialFilters.eventType ?? "");
  const [severity, setSeverity] = useState(initialFilters.severity ?? "");
  const [selectedId, setSelectedId] = useState(initialFilters.selected ?? initialEvents[0]?.event_id ?? "");
  const [viewport, setViewport] = useState<ViewportState>({
    centerLng: initialFilters.centerLng ?? 18,
    centerLat: initialFilters.centerLat ?? 18,
    zoom: clamp(initialFilters.zoom ?? 1.35, 1, 6),
  });
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const deferredViewport = useDeferredValue(viewport);
  const dragState = useRef<{ x: number; y: number; viewport: ViewportState } | null>(null);

  useEffect(() => {
    const params = buildSearchParams({ industry, eventType, severity, selectedId, viewport });
    startTransition(() => {
      router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }, [eventType, industry, pathname, router, selectedId, severity, viewport]);

  useEffect(() => {
    const controller = new AbortController();
    const bounds = computeViewportBounds(deferredViewport);
    const params = new URLSearchParams();
    if (industry) params.set("industry", industry);
    if (eventType) params.set("eventType", eventType);
    if (severity) params.set("severity", severity);
    params.set("limit", "80");
    params.set("minLng", bounds.minLng.toFixed(3));
    params.set("minLat", bounds.minLat.toFixed(3));
    params.set("maxLng", bounds.maxLng.toFixed(3));
    params.set("maxLat", bounds.maxLat.toFixed(3));
    params.set("extractionMethods", "heuristic_v3");

    Promise.resolve().then(() => {
      setLoading(true);
      setLoadError(null);
    });

    fetch(`/api/events?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { events?: PublicEvent[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load events.");
        }
        const nextEvents = payload.events ?? [];
        setEvents(nextEvents);
        setSelectedId((current) => {
          if (!nextEvents.length) {
            return "";
          }
          return nextEvents.some((event) => event.event_id === current)
            ? current
            : nextEvents[0].event_id;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Failed to load events.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [deferredViewport, eventType, industry, severity]);

  const bounds = computeViewportBounds(viewport);
  const clusters = clusterEvents(events, viewport);
  const selectedEvent = events.find((event) => event.event_id === selectedId) ?? null;

  function moveViewport(next: Partial<ViewportState>) {
    setViewport((current) => ({
      centerLng: clamp(next.centerLng ?? current.centerLng, -180, 180),
      centerLat: clamp(next.centerLat ?? current.centerLat, -75, 75),
      zoom: clamp(next.zoom ?? current.zoom, 1, 6),
    }));
  }

  function panViewport(deltaLng: number, deltaLat: number) {
    moveViewport({
      centerLng: viewport.centerLng + deltaLng / viewport.zoom,
      centerLat: viewport.centerLat + deltaLat / viewport.zoom,
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    dragState.current = {
      x: event.clientX,
      y: event.clientY,
      viewport,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) {
      return;
    }
    const deltaX = event.clientX - dragState.current.x;
    const deltaY = event.clientY - dragState.current.y;
    moveViewport({
      centerLng: dragState.current.viewport.centerLng - deltaX * (0.22 / dragState.current.viewport.zoom),
      centerLat: dragState.current.viewport.centerLat + deltaY * (0.16 / dragState.current.viewport.zoom),
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragState.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <section className="grid gap-8 rounded-[2rem] border border-black/10 bg-[var(--color-panel)] p-8 shadow-[0_24px_80px_rgba(12,25,34,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-muted-ink)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            Live map surface
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] md:text-6xl">
              Events are now rendered as geography, not just a feed.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--color-muted-ink)]">
              The surface is reading the public RPC, filtering by viewport, and plotting
              live `heuristic_v3` event coordinates with severity-aware markers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {industries.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setIndustry((current) => (current === item.slug ? "" : item.slug))}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  industry === item.slug
                    ? "border-black/0 bg-[var(--color-ink)] text-white"
                    : "border-black/10 bg-white text-[var(--color-ink)]"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.6rem] bg-[var(--color-ink)] p-6 text-white">
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Visible live events</p>
            <p className="mt-4 text-5xl font-semibold">{events.length}</p>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Loaded from the current viewport so dense regions can be inspected without
              falling back to a static global list.
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Viewport</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">
                Center {viewport.centerLng.toFixed(1)}, {viewport.centerLat.toFixed(1)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Zoom {viewport.zoom.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.7rem] border border-black/8 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Minimum severity
          </span>
          <button
            type="button"
            onClick={() => setSeverity("")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              !severity ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-soft)] text-[var(--color-ink)]"
            }`}
          >
            Any
          </button>
          {SEVERITY_SCALE.map((level) => (
            <button
              key={level.level}
              type="button"
              onClick={() => setSeverity(String(level.level))}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                severity === String(level.level)
                  ? "border-black/0 text-white"
                  : "border-black/8 bg-[var(--color-soft)] text-[var(--color-ink)]"
              }`}
              style={severity === String(level.level) ? { backgroundColor: level.hex } : undefined}
            >
              {level.level}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Event type
          </span>
          <button
            type="button"
            onClick={() => setEventType("")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              !eventType ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-soft)] text-[var(--color-ink)]"
            }`}
          >
            All
          </button>
          {eventTypes.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setEventType(item.slug)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                eventType === item.slug
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-black/8 bg-[var(--color-soft)] text-[var(--color-ink)]"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-[var(--color-ink)] shadow-[0_28px_80px_rgba(10,24,34,0.18)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Map viewport</p>
                <p className="mt-1 text-sm text-white/80">
                  {bounds.minLng.toFixed(1)} to {bounds.maxLng.toFixed(1)} longitude, {bounds.minLat.toFixed(1)} to{" "}
                  {bounds.maxLat.toFixed(1)} latitude
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => panViewport(-22, 0)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  W
                </button>
                <button type="button" onClick={() => panViewport(22, 0)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  E
                </button>
                <button type="button" onClick={() => panViewport(0, 16)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  N
                </button>
                <button type="button" onClick={() => panViewport(0, -16)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  S
                </button>
                <button type="button" onClick={() => moveViewport({ zoom: viewport.zoom + 0.35 })} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  +
                </button>
                <button type="button" onClick={() => moveViewport({ zoom: viewport.zoom - 0.35 })} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  -
                </button>
              </div>
            </div>

            <div
              className="relative overflow-hidden"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onWheel={(event) => {
                event.preventDefault();
                moveViewport({ zoom: viewport.zoom + (event.deltaY < 0 ? 0.18 : -0.18) });
              }}
            >
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="block h-[34rem] w-full"
                style={{
                  background:
                    "radial-gradient(circle at top, rgba(92,160,187,0.3), transparent 40%), linear-gradient(180deg, #0f2432 0%, #17374d 100%)",
                }}
              >
                {Array.from({ length: 11 }).map((_, index) => {
                  const x = (MAP_WIDTH / 10) * index;
                  return <line key={`lng-${index}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
                })}
                {Array.from({ length: 8 }).map((_, index) => {
                  const y = (MAP_HEIGHT / 7) * index;
                  return <line key={`lat-${index}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
                })}

                {CONTINENTS.map((continent, index) => (
                  <polygon
                    key={`continent-${index}`}
                    points={buildContour(continent, viewport)}
                    fill="rgba(230,236,227,0.9)"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="1.5"
                  />
                ))}

                {clusters.map((cluster) => {
                  const highestSeverity = Math.max(...cluster.events.map((event) => event.severity_level));
                  const severity = severityMeta(highestSeverity);
                  const selected = cluster.events.some((event) => event.event_id === selectedId);

                  return (
                    <g key={cluster.key} transform={`translate(${cluster.x},${cluster.y})`}>
                      <circle
                        r={cluster.events.length > 1 ? 16 : 11}
                        fill={severity.hex}
                        stroke={selected ? "#ffffff" : "rgba(255,255,255,0.45)"}
                        strokeWidth={selected ? 4 : 2}
                        onClick={() => {
                          if (cluster.events.length > 1) {
                            moveViewport({
                              centerLng: cluster.lng,
                              centerLat: cluster.lat,
                              zoom: viewport.zoom + 0.55,
                            });
                          }
                          setSelectedId(cluster.events[0].event_id);
                        }}
                      />
                      {cluster.events.length > 1 ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="700"
                          onClick={() => {
                            moveViewport({
                              centerLng: cluster.lng,
                              centerLat: cluster.lat,
                              zoom: viewport.zoom + 0.55,
                            });
                            setSelectedId(cluster.events[0].event_id);
                          }}
                        >
                          {cluster.events.length}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                Drag to pan, scroll to zoom
              </div>
              {loading ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent px-5 py-3 text-center text-sm text-white/80">
                  Refreshing events for the current viewport...
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-black/8 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
                  Visible events
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  {events.length ? `${events.length} events in view` : "No events in view"}
                </p>
              </div>
              {loadError ? <p className="text-sm text-[#b44334]">{loadError}</p> : null}
            </div>

            <div className="mt-5 grid gap-4">
              {events.map((event) => {
                const severity = severityMeta(event.severity_level);
                const active = event.event_id === selectedId;
                return (
                  <button
                    key={event.event_id}
                    type="button"
                    onClick={() => {
                      setSelectedId(event.event_id);
                      if (event.longitude != null && event.latitude != null) {
                        moveViewport({
                          centerLng: event.longitude,
                          centerLat: event.latitude,
                          zoom: Math.max(viewport.zoom, 2.1),
                        });
                      }
                    }}
                    className={`rounded-[1.35rem] border p-5 text-left transition ${
                      active
                        ? "border-[var(--color-accent)] bg-white shadow-[0_18px_55px_rgba(16,33,44,0.08)]"
                        : "border-black/8 bg-[var(--color-panel)] hover:border-black/14 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
                          <span>{event.industry_slug}</span>
                          {event.event_type_slug ? <span>{event.event_type_slug}</span> : null}
                          {event.location_role ? <span>{event.location_role}</span> : null}
                        </div>
                        <h3 className="text-lg font-semibold leading-7 text-[var(--color-ink)]">
                          {event.title}
                        </h3>
                      </div>
                      <span
                        className="inline-flex min-w-14 items-center justify-center rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${severity.hex}22`, color: severity.hex }}
                      >
                        S{event.severity_level}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--color-muted-ink)]">
                      <span>{formatDate(event.event_date)}</span>
                      <span>{markerLabel(event)}</span>
                      <span>{event.source_name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-[1.8rem] border border-black/8 bg-white p-8 shadow-[0_24px_70px_rgba(16,33,44,0.06)]">
          {selectedEvent ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
                    <span>{selectedEvent.industry_slug}</span>
                    {selectedEvent.subsector_slug ? <span>{selectedEvent.subsector_slug}</span> : null}
                    {selectedEvent.event_type_slug ? <span>{selectedEvent.event_type_slug}</span> : null}
                  </div>
                  <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                    {selectedEvent.title}
                  </h2>
                </div>
                <div
                  className="rounded-2xl border border-black/8 px-4 py-3 text-right"
                  style={{ backgroundColor: `${severityMeta(selectedEvent.severity_level).hex}14` }}
                >
                  <p
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: severityMeta(selectedEvent.severity_level).hex }}
                  >
                    Severity
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                    {selectedEvent.severity_level}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: severityMeta(selectedEvent.severity_level).hex }}
                  >
                    {severityMeta(selectedEvent.severity_level).label}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[var(--color-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Date</p>
                  <p className="mt-2 font-semibold text-[var(--color-ink)]">{formatDate(selectedEvent.event_date)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Location</p>
                  <p className="mt-2 font-semibold text-[var(--color-ink)]">{markerLabel(selectedEvent)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Confidence</p>
                  <p className="mt-2 font-semibold text-[var(--color-ink)]">
                    {Math.round(Number(selectedEvent.confidence_score) * 100)}%
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--color-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Evidence count</p>
                  <p className="mt-2 font-semibold text-[var(--color-ink)]">{selectedEvent.article_count}</p>
                </div>
              </div>

              <div className="mt-8 space-y-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Summary</p>
                  <p className="mt-3 text-base leading-8 text-[var(--color-ink-soft)]">{selectedEvent.summary}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Evidence</p>
                  <blockquote className="mt-3 rounded-[1.35rem] border border-black/8 bg-[var(--color-panel)] p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
                    {selectedEvent.evidence_snippet ?? "No evidence snippet stored."}
                  </blockquote>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-black/8 bg-[var(--color-panel)] p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Traceability</p>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Extraction</dt>
                        <dd className="mt-1 font-semibold text-[var(--color-ink)]">{selectedEvent.extraction_method}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Source slug</dt>
                        <dd className="mt-1 font-semibold text-[var(--color-ink)]">{selectedEvent.source_slug}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Dedupe key</dt>
                        <dd className="mt-1 break-all font-semibold text-[var(--color-ink)]">
                          {selectedEvent.dedupe_key ?? "Unavailable"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-[1.5rem] border border-black/8 bg-[var(--color-panel)] p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Map context</p>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Coordinates</dt>
                        <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                          {selectedEvent.latitude?.toFixed(3) ?? "?"}, {selectedEvent.longitude?.toFixed(3) ?? "?"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Location role</dt>
                        <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                          {selectedEvent.location_role ?? "unassigned"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-muted-ink)]">Reference article</dt>
                        <dd className="mt-1">
                          <a
                            href={selectedEvent.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
                          >
                            Open source
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-black/12 bg-white/70 p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Event detail</p>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">No event available yet</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted-ink)]">
                The current filter and viewport combination does not return a public event.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
