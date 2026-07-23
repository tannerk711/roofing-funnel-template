// MagneticButton: translates toward the pointer within its own bounds,
// rAF spring-lerped, springs back on leave. Uses el.style.translate
// (Tailwind v4 safe: translate is an independent CSS property).
// Disabled on touch devices and reduced motion (renders a plain element).

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { prefersReducedMotion } from "../../lib/motion-load";

export interface MagneticButtonProps {
  href?: string; // renders <a> when set, else <button>
  onClick?: () => void;
  className?: string; // caller passes .btn-primary etc.
  strength?: number; // default 0.3
  target?: string;
  rel?: string;
  type?: "button" | "submit";
  children: ReactNode;
}

const MAX_SHIFT_PX = 10;
const LERP = 0.18;

export default function MagneticButton({
  href,
  onClick,
  className,
  strength = 0.3,
  target,
  rel,
  type = "button",
  children,
}: MagneticButtonProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current =
      !prefersReducedMotion() && !window.matchMedia("(hover: none)").matches;
    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, []);

  const step = () => {
    const el = elRef.current;
    if (!el) {
      runningRef.current = false;
      return;
    }
    const cur = currentPos.current;
    const tgt = targetPos.current;
    cur.x += (tgt.x - cur.x) * LERP;
    cur.y += (tgt.y - cur.y) * LERP;

    const settled =
      tgt.x === 0 &&
      tgt.y === 0 &&
      Math.abs(cur.x) < 0.05 &&
      Math.abs(cur.y) < 0.05;

    if (settled) {
      cur.x = 0;
      cur.y = 0;
      el.style.translate = "";
      runningRef.current = false;
      return;
    }
    el.style.translate = `${cur.x.toFixed(2)}px ${cur.y.toFixed(2)}px`;
    rafRef.current = requestAnimationFrame(step);
  };

  const start = () => {
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(step);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!enabledRef.current) return;
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
    targetPos.current.x = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, dx));
    targetPos.current.y = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, dy));
    start();
  };

  const handlePointerLeave = () => {
    if (!enabledRef.current) return;
    targetPos.current.x = 0;
    targetPos.current.y = 0;
    start();
  };

  const shared = {
    className,
    onClick,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
  };

  if (href) {
    return (
      <a
        ref={(node) => {
          elRef.current = node;
        }}
        href={href}
        target={target}
        rel={rel}
        {...shared}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={(node) => {
        elRef.current = node;
      }}
      type={type}
      {...shared}
    >
      {children}
    </button>
  );
}
