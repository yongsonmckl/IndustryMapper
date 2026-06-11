"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { NavigationControl, type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { usePathname, useRouter } from "next/navigation";
import type { PublicBriefing } from "@/lib/briefings";
import type { PublicEvent } from "@/lib/events";
import { SEVERITY_SCALE } from "@/lib/site";

type FilterOption = {
  slug: string;
  name: string;
};

type ViewportState = {
  centerLng: number;
  centerLat: number;
  zoom: number;
};

type MapExplorerProps = {
  initialEvents: PublicEvent[];
  initialBriefings: PublicBriefing[];
  industries: FilterOption[];
  eventTypes: FilterOption[];
  initialFilters: {
    industry?: string;
    eventType?: string;
    severity?: string;
    selected?: string;
    briefing?: string;
    centerLng?: number;
    centerLat?: number;
    zoom?: number;
  };
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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

function markerLabel(event: PublicEvent) {
  const parts = [event.location_name, event.city, event.country_name].filter(Boolean);
  return parts.join(", ") || "Unmapped";
}

function summarizeBounds(map: MapLibreMap) {
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  if (east < west) {
    return null;
  }

  return {
    minLng: west,
    minLat: south,
    maxLng: east,
    maxLat: north,
  };
}

function buildSearchParams(state: {
  industry: string;
  eventType: string;
  severity: string;
  selectedId: string;
  briefingId: string;
  viewport: ViewportState;
}) {
  const params = new URLSearchParams();
  if (state.industry) params.set("industry", state.industry);
  if (state.eventType) params.set("eventType", state.eventType);
  if (state.severity) params.set("severity", state.severity);
  if (state.selectedId) params.set("selected", state.selectedId);
  if (state.briefingId) params.set("briefing", state.briefingId);
  params.set("centerLng", state.viewport.centerLng.toFixed(4));
  params.set("centerLat", state.viewport.centerLat.toFixed(4));
  params.set("zoom", state.viewport.zoom.toFixed(2));
  return params.toString();
}

function markerOffsets(events: PublicEvent[], zoom: number) {
  const grouped = new Map<string, PublicEvent[]>();
  const precision = zoom < 2 ? 1.8 : zoom < 3 ? 0.9 : zoom < 4 ? 0.45 : 0.18;
  for (const event of events) {
    if (event.longitude == null || event.latitude == null) continue;
    const lngKey = Math.round(event.longitude / precision) * precision;
    const latKey = Math.round(event.latitude / precision) * precision;
    const key = `${lngKey.toFixed(2)}:${latKey.toFixed(2)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  const offsets = new Map<string, [number, number]>();
  for (const group of grouped.values()) {
    group.forEach((event, index) => {
      if (group.length === 1) {
        offsets.set(event.event_id, [0, 0]);
        return;
      }
      const angle = (Math.PI * 2 * index) / group.length;
      const radius = 12 + Math.min(group.length, 5) * 2;
      offsets.set(event.event_id, [Math.cos(angle) * radius, Math.sin(angle) * radius]);
    });
  }
  return offsets;
}

export function MapExplorer({
  initialEvents,
  initialBriefings,
  industries,
  eventTypes,
  initialFilters,
}: MapExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialViewportState: ViewportState = {
    centerLng: initialFilters.centerLng ?? 10,
    centerLat: initialFilters.centerLat ?? 20,
    zoom: clamp(initialFilters.zoom ?? 1.55, 1, 6),
  };
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initialViewportRef = useRef<ViewportState>(initialViewportState);
  const [industry, setIndustry] = useState(initialFilters.industry ?? "");
  const [eventType, setEventType] = useState(initialFilters.eventType ?? "");
  const [severity, setSeverity] = useState(initialFilters.severity ?? "");
  const [selectedId, setSelectedId] = useState(initialFilters.selected ?? initialEvents[0]?.event_id ?? "");
  const [briefingId, setBriefingId] = useState(initialFilters.briefing ?? "");
  const [events, setEvents] = useState(initialEvents);
  const [briefings, setBriefings] = useState(initialBriefings);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingBriefings, setLoadingBriefings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>(initialViewportState);
  const deferredViewport = useDeferredValue(viewport);

  const selectedEvent = events.find((event) => event.event_id === selectedId) ?? null;
  const selectedBriefing = briefings.find((item) => item.article_id === briefingId) ?? null;
  const offsets = markerOffsets(events, viewport.zoom);

  useEffect(() => {
    const params = buildSearchParams({ industry, eventType, severity, selectedId, briefingId, viewport });
    startTransition(() => {
      router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }, [briefingId, eventType, industry, pathname, router, selectedId, severity, viewport]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;
    const initialViewport = initialViewportRef.current;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [initialViewport.centerLng, initialViewport.centerLat],
      zoom: initialViewport.zoom,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      doubleClickZoom: true,
      scrollZoom: false,
      maxZoom: 6,
      minZoom: 1,
      renderWorldCopies: false,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");

    map.on("load", () => {
      const globeMap = map as MapLibreMap & {
        setProjection?: (projection: { type: string }) => void;
        setFog?: (options: Record<string, unknown>) => void;
      };
      globeMap.setProjection?.({ type: "globe" });
      globeMap.setFog?.({
        range: [-1, 2],
        color: "rgba(7,18,30,0.9)",
        "high-color": "rgba(16,34,56,0.92)",
        "horizon-blend": 0.1,
        "space-color": "#02060b",
        "star-intensity": 0.25,
      });
      map.easeTo({
        center: [initialViewport.centerLng, initialViewport.centerLat],
        zoom: initialViewport.zoom,
        duration: 0,
      });
      setMapReady(true);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      setViewport({
        centerLng: Number(center.lng.toFixed(4)),
        centerLat: Number(center.lat.toFixed(4)),
        zoom: Number(map.getZoom().toFixed(2)),
      });
    });

    const wheelHandler = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.shiftKey) {
        return;
      }
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = [event.clientX - rect.left, event.clientY - rect.top] as [number, number];
      const anchor = map.unproject(point);
      const delta = event.deltaY < 0 ? 0.3 : -0.3;
      map.easeTo({
        around: anchor,
        zoom: clamp(map.getZoom() + delta, 1, 6),
        duration: 220,
      });
    };

    container.addEventListener("wheel", wheelHandler, { passive: false });
    resizeObserverRef.current = new ResizeObserver(() => map.resize());
    resizeObserverRef.current.observe(container);
    const markers = markerRefs.current;

    return () => {
      container.removeEventListener("wheel", wheelHandler);
      resizeObserverRef.current?.disconnect();
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const centerChanged =
      Math.abs(center.lng - viewport.centerLng) > 0.01 || Math.abs(center.lat - viewport.centerLat) > 0.01;
    const zoomChanged = Math.abs(map.getZoom() - viewport.zoom) > 0.01;
    if (centerChanged || zoomChanged) {
      map.easeTo({
        center: [viewport.centerLng, viewport.centerLat],
        zoom: viewport.zoom,
        duration: 350,
      });
    }
  }, [viewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const controller = new AbortController();
    const bounds = summarizeBounds(map);
    const params = new URLSearchParams();
    if (industry) params.set("industry", industry);
    if (eventType) params.set("eventType", eventType);
    if (severity) params.set("severity", severity);
    if (bounds) {
      params.set("minLng", bounds.minLng.toFixed(4));
      params.set("minLat", bounds.minLat.toFixed(4));
      params.set("maxLng", bounds.maxLng.toFixed(4));
      params.set("maxLat", bounds.maxLat.toFixed(4));
    }
    params.set("limit", "120");
    params.set("extractionMethods", "heuristic_v4,heuristic_v3");

    setLoadingEvents(true);
    setLoadError(null);

    fetch(`/api/events?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { events?: PublicEvent[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load events.");
        }
        const nextEvents = payload.events ?? [];
        setEvents(nextEvents);
        setSelectedId((current) => {
          if (!nextEvents.length) return "";
          if (nextEvents.some((event) => event.event_id === current)) return current;
          return nextEvents[0].event_id;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load events.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingEvents(false);
        }
      });

    return () => controller.abort();
  }, [deferredViewport, eventType, industry, mapReady, severity]);

  useEffect(() => {
    if (!mapReady) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (industry) params.set("industry", industry);
    params.set("limit", "12");

    Promise.resolve().then(() => {
      setLoadingBriefings(true);
    });

    fetch(`/api/briefings?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { briefings?: PublicBriefing[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load neutral headlines.");
        }
        const nextBriefings = payload.briefings ?? [];
        setBriefings(nextBriefings);
        setBriefingId((current) => (nextBriefings.some((item) => item.article_id === current) ? current : ""));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load neutral headlines.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingBriefings(false);
        }
      });

    return () => controller.abort();
  }, [industry, mapReady]);

  function selectEvent(event: PublicEvent) {
    setSelectedId(event.event_id);
    setBriefingId("");
    const map = mapRef.current;
    if (map && event.longitude != null && event.latitude != null) {
      map.easeTo({
        center: [event.longitude, event.latitude],
        zoom: Math.max(map.getZoom(), 2.4),
        duration: 900,
        essential: true,
      });
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(events.map((event) => event.event_id));
    markerRefs.current.forEach((marker, eventId) => {
      if (!nextIds.has(eventId)) {
        marker.remove();
        markerRefs.current.delete(eventId);
      }
    });

    for (const event of events) {
      if (event.longitude == null || event.latitude == null) continue;

      const severity = severityMeta(event.severity_level);
      const severe = event.severity_level === 5;
      const existing = markerRefs.current.get(event.event_id);
      const offset = offsets.get(event.event_id) ?? [0, 0];

      const button = existing?.getElement() as HTMLButtonElement | undefined ?? document.createElement("button");
      button.type = "button";
      button.className = "flex h-11 w-11 items-center justify-center rounded-full border text-xs font-bold shadow-[0_16px_36px_rgba(0,0,0,0.34)] transition-transform hover:scale-105";
      button.style.background = severe ? "#ffffff" : severity.hex;
      button.style.color = severe ? "#02060b" : "#ffffff";
      button.style.borderColor = event.event_id === selectedId ? "#9bc6ff" : severe ? "#0f172a" : "rgba(255,255,255,0.5)";
      button.style.borderWidth = event.event_id === selectedId ? "3px" : "2px";
      button.style.transform = event.event_id === selectedId ? "scale(1.12)" : "scale(1)";
      button.textContent = event.severity_level === 5 ? "5!" : String(event.severity_level);
      button.title = event.title;
      button.onclick = () => selectEvent(event);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
      }).setHTML(
        `<div class="space-y-1"><p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9bc6ff;">${event.industry_slug}</p><p style="font-size:14px;font-weight:700;line-height:1.5;">${event.title}</p><p style="font-size:12px;color:#c6d8ef;">${markerLabel(event)}</p></div>`,
      );

      if (existing) {
        existing.setLngLat([event.longitude, event.latitude]);
        existing.setOffset(offset);
        existing.setPopup(popup);
      } else {
        const marker = new maplibregl.Marker({
          element: button,
          offset,
          anchor: "center",
        })
          .setLngLat([event.longitude, event.latitude])
          .setPopup(popup)
          .addTo(map);
        markerRefs.current.set(event.event_id, marker);
      }
    }
  }, [events, offsets, selectedId]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-10">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-8 shadow-[0_26px_80px_var(--color-shadow)]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <span className="inline-flex w-fit rounded-full border border-[var(--color-accent)]/30 bg-[rgba(76,143,217,0.14)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-soft)]">
                Live globe map
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  A real globe, live markers, and neutral intelligence beside it.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--color-ink-soft)]">
                  Drag the globe to move, hold <strong>Ctrl</strong> or <strong>Shift</strong> while
                  scrolling to zoom, and select a marker to animate the map toward that event.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[24rem]">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">Mapped events</p>
                <p className="mt-3 text-4xl font-semibold text-white">{events.length}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">Neutral headlines</p>
                <p className="mt-3 text-4xl font-semibold text-white">{briefings.length}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIndustry("")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                !industry ? "bg-[var(--color-accent)] text-white" : "border border-white/10 bg-white/5 text-white/80"
              }`}
            >
              All industries
            </button>
            {industries.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setIndustry((current) => (current === item.slug ? "" : item.slug))}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  industry === item.slug
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEventType("")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                !eventType ? "bg-white text-slate-950" : "border border-white/10 bg-white/5 text-white/80"
              }`}
            >
              All event types
            </button>
            {eventTypes.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setEventType(item.slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  eventType === item.slug
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSeverity("")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                !severity ? "bg-[var(--color-success)] text-slate-950" : "border border-white/10 bg-white/5 text-white/80"
              }`}
            >
              Any severity
            </button>
            {SEVERITY_SCALE.map((level) => (
              <button
                key={level.level}
                type="button"
                onClick={() => setSeverity(String(level.level))}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{
                  backgroundColor: severity === String(level.level) ? level.hex : "rgba(255,255,255,0.05)",
                  border: severity === String(level.level) ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: severity === String(level.level) && level.level === 5 ? "#02060b" : undefined,
                }}
              >
                {level.level}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[rgba(13,27,42,0.94)] shadow-[0_28px_80px_var(--color-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">Interactive map</p>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Scroll-zoom is intentionally gated behind <strong>Ctrl</strong> or <strong>Shift</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted-ink)]">
            <span>Center {viewport.centerLng.toFixed(1)}, {viewport.centerLat.toFixed(1)}</span>
            <span>Zoom {viewport.zoom.toFixed(1)}x</span>
            {(loadingEvents || loadingBriefings) ? <span>Refreshing…</span> : null}
          </div>
        </div>
        <div ref={mapContainerRef} className="h-[64vh] min-h-[34rem] w-full overflow-hidden rounded-b-[2rem]" />
        <div className="border-t border-white/10 px-6 py-5 md:px-8">
          <p className="max-w-4xl text-sm leading-7 text-[var(--color-ink-soft)]">
            The map now uses a real globe projection rather than a stretched SVG mock. Marker clicks
            animate the globe toward the selected event, severity 5 items render with high-contrast
            white markers and cards, and neutral headlines remain available for future
            weekly summaries and newsletter workflows.
          </p>
          {loadError ? <p className="mt-3 text-sm text-[#ff958a]">{loadError}</p> : null}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`rounded-[1.9rem] border p-7 shadow-[0_22px_70px_var(--color-shadow)] ${
          selectedEvent?.severity_level === 5
            ? "border-white/70 bg-white text-slate-950"
            : "border-white/10 bg-[rgba(13,27,42,0.94)] text-white"
        }`}>
          {selectedEvent ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className={`flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                  }`}>
                    <span>{selectedEvent.industry_slug}</span>
                    {selectedEvent.subsector_slug ? <span>{selectedEvent.subsector_slug}</span> : null}
                    {selectedEvent.event_type_slug ? <span>{selectedEvent.event_type_slug}</span> : null}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight">{selectedEvent.title}</h2>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-right ${
                    selectedEvent.severity_level === 5 ? "border border-slate-300 bg-slate-950 text-white" : "border border-white/10"
                  }`}
                  style={selectedEvent.severity_level === 5 ? undefined : { backgroundColor: `${severityMeta(selectedEvent.severity_level).hex}22` }}
                >
                  <p
                    className="text-xs uppercase tracking-[0.18em]"
                    style={selectedEvent.severity_level === 5 ? undefined : { color: severityMeta(selectedEvent.severity_level).hex }}
                  >
                    Severity
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {selectedEvent.severity_level}
                  </p>
                  <p className="text-sm">
                    {severityMeta(selectedEvent.severity_level).label}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Date", formatDate(selectedEvent.event_date)],
                  ["Location", markerLabel(selectedEvent)],
                  ["Confidence", `${Math.round(Number(selectedEvent.confidence_score) * 100)}%`],
                  ["Evidence", String(selectedEvent.article_count)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-[1.35rem] p-4 ${
                      selectedEvent.severity_level === 5 ? "bg-slate-100" : "bg-white/5"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-[0.18em] ${
                      selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                    }`}>
                      {label}
                    </p>
                    <p className="mt-2 font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-7">
                <div>
                  <p className={`text-xs uppercase tracking-[0.22em] ${
                    selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                  }`}>
                    Summary
                  </p>
                  <p className={`mt-3 text-base leading-8 ${
                    selectedEvent.severity_level === 5 ? "text-slate-700" : "text-[var(--color-ink-soft)]"
                  }`}>
                    {selectedEvent.summary}
                  </p>
                </div>

                <div>
                  <p className={`text-xs uppercase tracking-[0.22em] ${
                    selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                  }`}>
                    Evidence
                  </p>
                  <blockquote className={`mt-3 rounded-[1.3rem] border p-5 text-sm leading-7 ${
                    selectedEvent.severity_level === 5 ? "border-slate-200 bg-slate-100 text-slate-700" : "border-white/10 bg-white/5 text-[var(--color-ink-soft)]"
                  }`}>
                    {selectedEvent.evidence_snippet ?? "No evidence snippet stored."}
                  </blockquote>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`rounded-[1.4rem] border p-5 ${
                    selectedEvent.severity_level === 5 ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/5"
                  }`}>
                    <p className={`text-xs uppercase tracking-[0.22em] ${
                      selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                    }`}>
                      Traceability
                    </p>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Extraction</dt>
                        <dd className="mt-1 font-semibold">{selectedEvent.extraction_method}</dd>
                      </div>
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Source</dt>
                        <dd className="mt-1 font-semibold">{selectedEvent.source_name}</dd>
                      </div>
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Dedupe key</dt>
                        <dd className="mt-1 break-all font-semibold">{selectedEvent.dedupe_key ?? "Unavailable"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className={`rounded-[1.4rem] border p-5 ${
                    selectedEvent.severity_level === 5 ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/5"
                  }`}>
                    <p className={`text-xs uppercase tracking-[0.22em] ${
                      selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                    }`}>
                      Map context
                    </p>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Coordinates</dt>
                        <dd className="mt-1 font-semibold">
                          {selectedEvent.latitude?.toFixed(3) ?? "?"}, {selectedEvent.longitude?.toFixed(3) ?? "?"}
                        </dd>
                      </div>
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Role</dt>
                        <dd className="mt-1 font-semibold">{selectedEvent.location_role ?? "unassigned"}</dd>
                      </div>
                      <div>
                        <dt className={selectedEvent.severity_level === 5 ? "text-slate-500" : "text-[var(--color-muted-ink)]"}>Reference</dt>
                        <dd className="mt-1">
                          <a
                            href={selectedEvent.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className={`font-semibold underline-offset-4 hover:underline ${
                              selectedEvent.severity_level === 5 ? "text-slate-900" : "text-[var(--color-accent-soft)]"
                            }`}
                          >
                            Open source article
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-white/12 bg-white/4 p-8">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Event detail</p>
              <h2 className="mt-4 text-2xl font-semibold">No event selected</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-ink-soft)]">
                Choose a marker or an event card to center the map and inspect the structured event detail.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[1.9rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-7 shadow-[0_22px_70px_var(--color-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Neutral intelligence</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Recent neutral headlines</h2>
            </div>
            <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-success)]/30 bg-[rgba(89,214,154,0.14)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
              ~
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {briefings.map((briefing) => (
              <button
                key={briefing.article_id}
                type="button"
                onClick={() => {
                  setBriefingId(briefing.article_id);
                  setSelectedId("");
                }}
                className={`rounded-[1.35rem] border p-5 text-left transition ${
                  briefing.article_id === briefingId
                    ? "border-[var(--color-success)]/60 bg-[rgba(89,214,154,0.12)]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold leading-7 text-white">{briefing.title}</h3>
                  <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-success)]/30 bg-[rgba(89,214,154,0.14)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                    ~
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted-ink)]">
                  <span>{formatDate(briefing.published_at)}</span>
                  <span>{briefing.source_name}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/12 bg-white/4 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
            These articles are not map-promoted events, but they remain useful for future weekly summaries,
            neutral intelligence digests, and newsletter experiments.
          </div>
        </section>
      </section>

      {selectedBriefing ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(2,6,11,0.74)] p-4 md:items-center">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-white/12 bg-[rgba(11,22,36,0.98)] p-7 shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-success)]">Neutral headline</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{selectedBriefing.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setBriefingId("")}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.2rem] bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Severity</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-success)]">~</p>
              </div>
              <div className="rounded-[1.2rem] bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Published</p>
                <p className="mt-2 font-semibold text-white">{formatDate(selectedBriefing.published_at)}</p>
              </div>
              <div className="rounded-[1.2rem] bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Source</p>
                <p className="mt-2 font-semibold text-white">{selectedBriefing.source_name}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Summary</p>
                <p className="mt-3 text-base leading-8 text-[var(--color-ink-soft)]">
                  {selectedBriefing.summary ?? "No summary stored."}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Why it matters</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                  This headline is currently outside the structured map event layer, but it is still retained as
                  neutral intelligence that can feed future weekly summaries or newsletter-ready editorial workflows.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={selectedBriefing.source_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[var(--color-success)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Open source article
              </a>
              <button
                type="button"
                onClick={() => setBriefingId("")}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Back to map
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.7rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Mapped event list</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{events.length ? `${events.length} events in view` : "No events in view"}</h2>
            </div>
            <Link href="/about" className="text-sm font-semibold text-[var(--color-accent-soft)] transition hover:text-white">
              Read about the model
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {events.map((event) => {
              const severity = severityMeta(event.severity_level);
              const severe = event.severity_level === 5;
              const active = event.event_id === selectedId;
              return (
                <button
                  key={event.event_id}
                  type="button"
                  onClick={() => selectEvent(event)}
                  className={`rounded-[1.35rem] border p-5 text-left transition ${
                    severe
                      ? active
                        ? "border-white bg-white text-slate-950 shadow-[0_18px_55px_rgba(255,255,255,0.08)]"
                        : "border-white/70 bg-white text-slate-950"
                      : active
                        ? "border-[var(--color-accent)] bg-[rgba(76,143,217,0.12)]"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className={`flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        severe ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                      }`}>
                        <span>{event.industry_slug}</span>
                        {event.event_type_slug ? <span>{event.event_type_slug}</span> : null}
                      </div>
                      <h3 className="text-lg font-semibold leading-7">{event.title}</h3>
                    </div>
                    <span
                      className={`inline-flex min-w-14 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        severe ? "border border-slate-300 bg-slate-950 text-white" : ""
                      }`}
                      style={severe ? undefined : { backgroundColor: `${severity.hex}22`, color: severity.hex }}
                    >
                      S{event.severity_level}
                    </span>
                  </div>
                  <div className={`mt-4 flex flex-wrap gap-3 text-xs ${
                    severe ? "text-slate-500" : "text-[var(--color-muted-ink)]"
                  }`}>
                    <span>{formatDate(event.event_date)}</span>
                    <span>{markerLabel(event)}</span>
                    <span>{event.source_name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Next step</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">What comes after this build?</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--color-ink-soft)]">
            <p>
              The next product step is not another map rewrite. It is the intelligence layer above the map:
              cleaner neutral-intelligence taxonomy, weekly summary generation, and editorial tooling that can turn
              neutral headlines into a digest or future newsletter.
            </p>
            <p>
              Before that, the extractor still needs selective recall tuning so real events are not trapped in
              the neutral bucket. The current frontend now exposes both sides of that problem in one place.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
