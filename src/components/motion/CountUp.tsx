// CountUp: rAF number animation from 0 to value, easeOutCubic.
// SSR-safe (no window access during render), reduced-motion aware.

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion-load";

export interface CountUpProps {
  value: number;
  format?: (n: number) => string; // default en-US toLocaleString
  durationMs?: number; // default 1100
  delayMs?: number; // default 0
  className?: string;
}

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({
  value,
  format = defaultFormat,
  durationMs = 1100,
  delayMs = 0,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    let start = 0;
    const tick = (now: number) => {
      if (start === 0) start = now;
      const elapsed = now - start - delayMs;
      if (elapsed <= 0) {
        setDisplay(0);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(elapsed / durationMs, 1);
      setDisplay(value * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, durationMs, delayMs]);

  // Screen readers get the final number immediately via aria-label; the
  // animated text is hidden from the accessibility tree.
  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  );
}
