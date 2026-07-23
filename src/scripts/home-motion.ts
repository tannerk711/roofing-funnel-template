// Page-level motion for the landing page. Lazy: GSAP only loads after first
// paint (onIdle + dynamic import via loadGsap). Bails entirely under
// prefers-reduced-motion; the CSS backstop in global.css handles the rest.

import { loadGsap, onIdle, prefersReducedMotion } from "../lib/motion-load";

let initialized = false;

export function initHomeMotion(): void {
  if (initialized) return;
  initialized = true;
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  onIdle(() => {
    void setup();
  });
}

async function setup(): Promise<void> {
  const { gsap, ScrollTrigger } = await loadGsap();

  setupReveals(gsap);
  setupHeroParallax(gsap);
  setupPointerParallax();
  setupPinnedHowItWorks(gsap, ScrollTrigger);
  setupBackgroundParallax(gsap);
  setupCtaGlow(gsap);

  // Fonts and lazy images can shift trigger positions; refresh once settled.
  if (document.readyState === "complete") {
    ScrollTrigger.refresh();
  } else {
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  }
}

type Gsap = Awaited<ReturnType<typeof loadGsap>>["gsap"];
type ScrollTriggerType = Awaited<ReturnType<typeof loadGsap>>["ScrollTrigger"];

/** [data-reveal] fade-ups, staggered inside each [data-reveal-group]. */
function setupReveals(gsap: Gsap): void {
  const grouped = new Set<Element>();

  document.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
    const items = Array.from(group.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (items.length === 0) return;
    items.forEach((el) => grouped.add(el));
    gsap.from(items, {
      opacity: 0,
      y: 28,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: "top 80%", once: true },
      // Clear inline styles so CSS-driven states (hover lifts, the pinned
      // how-it-works dimming) are never overridden by leftover inline opacity.
      onComplete: () => gsap.set(items, { clearProps: "opacity,transform" }),
    });
  });

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (grouped.has(el)) return;
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 80%", once: true },
      onComplete: () => gsap.set(el, { clearProps: "opacity,transform" }),
    });
  });
}

/** Hero: background drifts slower than the scroll, content lifts away. */
function setupHeroParallax(gsap: Gsap): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;

  const media = hero.querySelector<HTMLElement>("[data-hero-media]");
  const content = hero.querySelector<HTMLElement>("[data-hero-content]");

  if (media) {
    gsap.to(media, {
      y: 90,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
  }
  if (content) {
    gsap.to(content, {
      y: -48,
      opacity: 0.35,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
  }
}

/**
 * Pointer parallax for [data-parallax-depth] (desktop, fine pointer only).
 * Uses el.style.translate, which composes with GSAP's transform-based
 * scroll parallax instead of fighting it (Tailwind v4 independent props).
 */
function setupPointerParallax(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax-depth]"));
  if (els.length === 0) return;

  const mql = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  let raf = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const tick = (): void => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    for (const el of els) {
      const depth = Number.parseFloat(el.dataset.parallaxDepth ?? "0") || 0;
      el.style.translate = `${(-currentX * depth).toFixed(2)}px ${(-currentY * depth).toFixed(2)}px`;
    }
    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      raf = window.requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  };

  window.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      if (!mql.matches) return;
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
      if (raf === 0) raf = window.requestAnimationFrame(tick);
    },
    { passive: true },
  );
}

/** Desktop only: pin how-it-works, activate steps in order, fill the line. */
function setupPinnedHowItWorks(gsap: Gsap, ScrollTrigger: ScrollTriggerType): void {
  const section = document.querySelector<HTMLElement>("[data-hiw]");
  if (!section) return;

  const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-hiw-step]"));
  const progress = section.querySelector<HTMLElement>("[data-hiw-progress]");
  if (steps.length === 0) return;

  const mm = gsap.matchMedia();
  mm.add("(min-width: 1024px)", () => {
    section.classList.add("hiw-ready");

    const setActive = (index: number): void => {
      steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    };
    setActive(0);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=1400",
      pin: true,
      onUpdate: (self) => {
        const index = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
        setActive(index);
        if (progress) {
          // Progress bar uses no Tailwind transform utilities, so setting
          // transform directly is safe here.
          progress.style.transform = `scaleX(${self.progress.toFixed(4)})`;
        }
      },
    });

    return () => {
      trigger.kill();
      section.classList.remove("hiw-ready");
      steps.forEach((step) => step.classList.remove("is-active"));
      if (progress) progress.style.transform = "scaleX(0)";
    };
  });
}

/** Slow y drift for [data-parallax-bg] layers; attr value = drift px. */
function setupBackgroundParallax(gsap: Gsap): void {
  document.querySelectorAll<HTMLElement>("[data-parallax-bg]").forEach((el) => {
    const amount = Number.parseFloat(el.dataset.parallaxBg ?? "") || 36;
    gsap.fromTo(
      el,
      { y: -amount },
      {
        y: amount,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") ?? el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

/** FinalCta edge glow: slow breathing pulse. */
function setupCtaGlow(gsap: Gsap): void {
  const glow = document.querySelector<HTMLElement>("[data-cta-glow]");
  if (!glow) return;
  gsap.to(glow, {
    opacity: 0.5,
    duration: 3.4,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });
}
