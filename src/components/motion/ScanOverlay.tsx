// ScanOverlay: the satellite "3D scan" scene, the wow moment of the funnel.
// Layers over the aerial image: teal grid, sweeping scan beam, self-tracing
// roof polygon, corner reticles, center lock dot. Pure React + CSS keyframes,
// no GSAP. SSR-safe, reduced-motion aware.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { prefersReducedMotion } from "../../lib/motion-load";

export interface ScanOverlayProps {
  imageUrl: string;
  polygon?: { x: number; y: number }[]; // normalized 0..1, top-left origin
  status: "scanning" | "locked" | "failed";
  sweepDurationMs?: number; // default 2600
  className?: string;
}

// Self-contained literals (not theme vars) so the scan scene renders
// identically regardless of what the Tailwind build emits to :root.
const TEAL = "rgb(45 212 191)";
const TEAL_GLOW = "0 0 18px rgb(45 212 191 / 0.75), 0 0 42px rgb(45 212 191 / 0.35)";
const AMBER = "#D97706";

export default function ScanOverlay({
  imageUrl,
  polygon,
  status,
  sweepDurationMs = 2600,
  className,
}: ScanOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rafRef = useRef(0);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gridId = `scanov-grid-${uid}`;

  useEffect(() => {
    setReduced(prefersReducedMotion());
    // Next frame so the mount tilt actually transitions instead of snapping.
    rafRef.current = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pathD = useMemo(() => {
    if (!polygon || polygon.length < 3) return null;
    const pts = polygon.map((p) => `${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`);
    return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
  }, [polygon]);

  // Lock dot position: polygon centroid when we have one, else image center.
  const lockPos = useMemo(() => {
    if (!polygon || polygon.length < 3) return { x: 50, y: 50 };
    const sum = polygon.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    );
    return {
      x: (sum.x / polygon.length) * 100,
      y: (sum.y / polygon.length) * 100,
    };
  }, [polygon]);

  const tiltTransform = reduced
    ? undefined
    : !mounted
      ? "perspective(900px) rotateX(0deg) scale(1)"
      : status === "locked"
        ? "perspective(900px) rotateX(2deg) scale(1.02)"
        : "perspective(900px) rotateX(7deg) scale(1.02)";

  const imgFilter =
    status === "failed"
      ? "brightness(0.55) saturate(0.7)"
      : status === "scanning"
        ? "brightness(1.08) saturate(1.18)"
        : "none";

  const reticleColor = status === "failed" ? AMBER : TEAL;
  const showBeam = status === "scanning" && !reduced;
  const showLock = status === "locked";

  const reticleBase: CSSProperties = {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: reticleColor,
    borderStyle: "solid",
    borderWidth: 0,
    opacity: 0.95,
    filter: `drop-shadow(0 0 5px ${status === "failed" ? AMBER : "rgb(45 212 191 / 0.9)"})`,
    transition: "border-color 400ms ease",
    animation: reduced ? "none" : "scanov-reticle 2.4s ease-in-out infinite",
  };

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl bg-sky-deep ${className ?? ""}`}
      role="img"
      aria-label="Satellite view of your roof being measured"
    >
      <style>{`
        @keyframes scanov-sweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(556%); }
        }
        @keyframes scanov-trace {
          to { stroke-dashoffset: 0; }
        }
        @keyframes scanov-fillin {
          from { fill-opacity: 0; }
          to { fill-opacity: 0.12; }
        }
        @keyframes scanov-fillpulse {
          0%, 100% { fill-opacity: 0.12; }
          50% { fill-opacity: 0.2; }
        }
        @keyframes scanov-reticle {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes scanov-ping {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Tilted inner scene. Inline transform only; no Tailwind transform
          utilities on this element, so setting style.transform is safe. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: tiltTransform,
          transition: reduced ? "none" : "transform 900ms var(--ease-spring)",
        }}
      >
        {/* 1. Satellite image */}
        <img
          src={imageUrl}
          alt=""
          decoding="async"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: imgFilter,
            transition: "filter 600ms ease",
          }}
        />

        {/* 1b. Vignette: darkened edges make the teal tech layers pop and
            read as an instrument view rather than a plain photo. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 46%, transparent 42%, rgb(10 22 36 / 0.34) 78%, rgb(10 22 36 / 0.6) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* 2. Teal grid */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.24 }}
        >
          <defs>
            <pattern id={gridId} width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke={TEAL}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${gridId})`} />
        </svg>

        {/* 3. Scanning beam (scanning only) */}
        {showBeam && (
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: "18%",
                background:
                  "linear-gradient(to bottom, transparent, rgb(45 212 191 / 0.16) 30%, rgb(45 212 191 / 0.38) 50%, rgb(45 212 191 / 0.16) 70%, transparent)",
                animation: `scanov-sweep ${sweepDurationMs}ms ease-in-out infinite alternate`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: 3,
                  background: TEAL,
                  boxShadow: TEAL_GLOW,
                }}
              />
            </div>
          </div>
        )}

        {/* 4. Roof polygon */}
        {pathD && (
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* Fill: fades in after the trace, then pulses gently. */}
            <path
              d={pathD}
              fill={TEAL}
              fillOpacity={reduced ? 0.12 : 0}
              stroke="none"
              style={
                reduced
                  ? undefined
                  : {
                      animation:
                        "scanov-fillin 700ms ease-out 800ms both, scanov-fillpulse 3s ease-in-out 1600ms infinite",
                    }
              }
            />
            {/* Stroke: traces itself in (~1100ms) via pathLength trick. */}
            <path
              d={pathD}
              pathLength={1}
              fill="none"
              stroke={TEAL}
              strokeWidth={2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                filter: "drop-shadow(0 0 6px rgb(45 212 191 / 0.75))",
                ...(reduced
                  ? {}
                  : {
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                      animation: "scanov-trace 1100ms var(--ease-spring) forwards",
                    }),
              }}
            />
          </svg>
        )}

        {/* 5. Corner reticles */}
        <div aria-hidden="true">
          <span style={{ ...reticleBase, top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 }} />
          <span style={{ ...reticleBase, top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 }} />
          <span style={{ ...reticleBase, bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 }} />
          <span style={{ ...reticleBase, bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 }} />
        </div>

        {/* 6. Center lock dot (locked only, replaces the beam) */}
        {showLock && (
          <div aria-hidden="true">
            <span
              style={{
                position: "absolute",
                left: `calc(${lockPos.x}% - 5px)`,
                top: `calc(${lockPos.y}% - 5px)`,
                width: 10,
                height: 10,
                borderRadius: "9999px",
                background: TEAL,
                boxShadow: TEAL_GLOW,
              }}
            />
            {!reduced && (
              <span
                style={{
                  position: "absolute",
                  left: `calc(${lockPos.x}% - 20px)`,
                  top: `calc(${lockPos.y}% - 20px)`,
                  width: 40,
                  height: 40,
                  borderRadius: "9999px",
                  border: `2px solid ${TEAL}`,
                  animation: "scanov-ping 1.5s ease-out infinite",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
