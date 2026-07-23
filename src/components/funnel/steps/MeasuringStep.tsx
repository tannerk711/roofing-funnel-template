// The centerpiece. Fetches the roof footprint while ScanOverlay plays the
// satellite scan. Minimum 3.2s of theatrics even on an instant API response.
// Found: project the polygon, lock, then auto-advance to lead. Not found or
// error: brief "failed" state, then the assist fallback. Never a silent guess.

import { useEffect, useRef, useState } from "react";
import ScanOverlay from "../../motion/ScanOverlay";
import { getAerialBbox, getAerialImageUrl, projectToImage } from "../../../lib/aerial";
import { formatSqft } from "../../../lib/pricing";
import type { FootprintResponse } from "../../../lib/types";

interface MeasuringStepProps {
  lat: number;
  lng: number;
  onMeasured: (sqft: number, polygon?: [number, number][]) => void;
  onFailed: () => void;
}

const STATUS_LINES = [
  "Locking satellite view...",
  "Tracing roof edges...",
  "Calculating area...",
];
const MIN_THEATRICS_MS = 3200;
const LOCKED_HOLD_MS = 1600;
const FAILED_HOLD_MS = 1000;

type Phase =
  | { name: "scanning" }
  | { name: "locked"; sqft: number; polygon: { x: number; y: number }[] }
  | { name: "failed" };

export default function MeasuringStep({ lat, lng, onMeasured, onFailed }: MeasuringStepProps) {
  const [phase, setPhase] = useState<Phase>({ name: "scanning" });
  const [lineIndex, setLineIndex] = useState(0);
  const onMeasuredRef = useRef(onMeasured);
  const onFailedRef = useRef(onFailed);
  onMeasuredRef.current = onMeasured;
  onFailedRef.current = onFailed;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timers: number[] = [];
    const started = performance.now();

    void (async () => {
      let result: FootprintResponse | null = null;
      try {
        const res = await fetch(`/api/footprint?lat=${lat}&lng=${lng}`, {
          signal: controller.signal,
        });
        result = (await res.json()) as FootprintResponse;
      } catch {
        result = null;
      }
      if (cancelled) return;

      const wait = Math.max(0, MIN_THEATRICS_MS - (performance.now() - started));
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          const r = result;
          if (r && r.ok && r.found) {
            const bbox = getAerialBbox(lat, lng);
            const polygon = r.polygon.map(([pLat, pLng]) => projectToImage(pLat, pLng, bbox));
            setPhase({ name: "locked", sqft: r.sqft, polygon });
            timers.push(
              window.setTimeout(() => {
                if (!cancelled) onMeasuredRef.current(r.sqft, r.polygon);
              }, LOCKED_HOLD_MS),
            );
          } else {
            setPhase({ name: "failed" });
            timers.push(
              window.setTimeout(() => {
                if (!cancelled) onFailedRef.current();
              }, FAILED_HOLD_MS),
            );
          }
        }, wait),
      );
    })();

    return () => {
      cancelled = true;
      controller.abort();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [lat, lng]);

  useEffect(() => {
    if (phase.name !== "scanning") return;
    const id = window.setInterval(
      () => setLineIndex((i) => (i + 1) % STATUS_LINES.length),
      1100,
    );
    return () => window.clearInterval(id);
  }, [phase.name]);

  const scanStatus =
    phase.name === "locked" ? "locked" : phase.name === "failed" ? "failed" : "scanning";

  return (
    <div className="text-center">
      <p className="kicker">Satellite measurement</p>
      <h3 className="headline mt-2 leading-[1.3] text-2xl text-ink sm:text-[28px]">Measuring your roof</h3>
      <div className="mt-6">
        <ScanOverlay
          imageUrl={getAerialImageUrl(lat, lng)}
          status={scanStatus}
          polygon={phase.name === "locked" ? phase.polygon : undefined}
          className="w-full"
        />
      </div>
      <div
        className="mt-5 flex min-h-[24px] items-center justify-center gap-2.5"
        aria-live="polite"
      >
        {phase.name === "scanning" && (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-scan" aria-hidden="true" />
            <p
              key={lineIndex}
              className="qf-fade text-[11px] font-semibold uppercase tracking-widest text-ink-soft"
            >
              {STATUS_LINES[lineIndex] ?? STATUS_LINES[0]}
            </p>
          </>
        )}
        {phase.name === "locked" && (
          <p className="qf-fade text-[11px] font-bold uppercase tracking-widest text-ink">
            Roof footprint locked: {formatSqft(phase.sqft)} sqft
          </p>
        )}
        {phase.name === "failed" && (
          <p className="qf-fade text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Satellite trace incomplete. Switching to the simple way...
          </p>
        )}
      </div>
    </div>
  );
}
