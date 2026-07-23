// TiltCard: pointer-driven rotateX/rotateY around center with perspective,
// spring-lerped via rAF. Sets el.style.transform on its OWN wrapper div,
// which uses no Tailwind transform utilities, so this is Tailwind v4 safe.
// Disabled entirely on touch devices ((hover: none)) and reduced motion.

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { prefersReducedMotion } from "../../lib/motion-load";

export interface TiltCardProps {
  children: ReactNode;
  maxDeg?: number; // default 7
  className?: string;
  glare?: boolean; // default true, radial highlight following pointer
}

const LERP = 0.12;

export default function TiltCard({
  children,
  maxDeg = 7,
  className,
  glare = true,
}: TiltCardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  // Targets and currents: rotX/rotY in degrees, gx/gy glare position in %.
  const tgt = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, glareOpacity: 0 });
  const cur = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, glareOpacity: 0 });
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const enabledRef = useRef(false);
  // While a pointer button is down the tilt is frozen: nothing may move
  // between mousedown and mouseup or the browser can retarget the click.
  const frozenRef = useRef(false);

  useEffect(() => {
    enabledRef.current =
      !prefersReducedMotion() && !window.matchMedia("(hover: none)").matches;
    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, []);

  const step = () => {
    const el = wrapRef.current;
    if (!el) {
      runningRef.current = false;
      return;
    }
    const c = cur.current;
    const t = tgt.current;
    c.rx += (t.rx - c.rx) * LERP;
    c.ry += (t.ry - c.ry) * LERP;
    c.gx += (t.gx - c.gx) * LERP;
    c.gy += (t.gy - c.gy) * LERP;
    c.glareOpacity += (t.glareOpacity - c.glareOpacity) * LERP;

    const settled =
      t.rx === 0 &&
      t.ry === 0 &&
      Math.abs(c.rx) < 0.02 &&
      Math.abs(c.ry) < 0.02 &&
      c.glareOpacity < 0.005;

    if (settled) {
      c.rx = 0;
      c.ry = 0;
      c.glareOpacity = 0;
      el.style.transform = "";
      if (glareRef.current) glareRef.current.style.opacity = "0";
      runningRef.current = false;
      return;
    }

    el.style.transform = `perspective(900px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`;
    const g = glareRef.current;
    if (g) {
      g.style.opacity = c.glareOpacity.toFixed(3);
      g.style.backgroundImage = `radial-gradient(circle at ${c.gx.toFixed(1)}% ${c.gy.toFixed(1)}%, rgb(255 255 255 / 0.9), transparent 62%)`;
    }
    rafRef.current = requestAnimationFrame(step);
  };

  const start = () => {
    if (frozenRef.current) return;
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(step);
    }
  };

  const handlePointerDown = () => {
    frozenRef.current = true;
    cancelAnimationFrame(rafRef.current);
    runningRef.current = false;
  };

  const handlePointerUp = () => {
    frozenRef.current = false;
    if (enabledRef.current) start();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    if (frozenRef.current || e.buttons !== 0) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const t = tgt.current;
    t.ry = (px - 0.5) * 2 * maxDeg;
    t.rx = (0.5 - py) * 2 * maxDeg;
    t.gx = px * 100;
    t.gy = py * 100;
    t.glareOpacity = glare ? 0.1 : 0;
    start();
  };

  const handlePointerLeave = () => {
    frozenRef.current = false;
    if (!enabledRef.current) return;
    const t = tgt.current;
    t.rx = 0;
    t.ry = 0;
    t.glareOpacity = 0;
    start();
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ transformStyle: "preserve-3d", position: "relative" }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: 0,
          }}
        />
      )}
    </div>
  );
}
