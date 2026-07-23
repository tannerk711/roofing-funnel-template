// Inline SVG house gable profile at three slopes. The roof stroke is always
// brand-colored (var(--color-brand)); walls stay quiet.

import type { PitchKey } from "../../lib/pricing";

interface PitchIllustrationProps {
  pitch: PitchKey;
  className?: string;
}

const APEX_Y: Record<PitchKey, number> = {
  low: 30,
  standard: 16,
  steep: 4,
};

export default function PitchIllustration({ pitch, className }: PitchIllustrationProps) {
  const apex = APEX_Y[pitch];
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 46v24h72V46"
        stroke="var(--color-ink-soft)"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M52 70V58h16v12"
        stroke="var(--color-ink-soft)"
        strokeOpacity="0.3"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={`M12 46L60 ${apex}L108 46`}
        stroke="var(--color-brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
