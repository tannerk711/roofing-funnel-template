// Shared lazy GSAP loader. GSAP + ScrollTrigger are only ever loaded through
// here, after first paint, so they never block initial render.

type GsapBundle = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

let bundle: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!bundle) {
    bundle = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([g, s]) => {
        g.gsap.registerPlugin(s.ScrollTrigger);
        return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
      },
    );
  }
  return bundle;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Run fn when the browser is idle (after paint), with a timeout fallback. */
export function onIdle(fn: () => void, timeout = 1800): void {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    (window as Window).requestIdleCallback(() => fn(), { timeout });
  } else {
    window.setTimeout(fn, 350);
  }
}
