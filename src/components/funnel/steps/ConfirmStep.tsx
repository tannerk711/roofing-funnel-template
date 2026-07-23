// "Is this your house?" satellite confirm. Shimmer skeleton until the image
// paints; the image itself was preloaded by AddressStep on geocode success.

import { useEffect, useRef, useState } from "react";
import { getAerialImageUrl } from "../../../lib/aerial";
import { SITE } from "../../../config/site";

interface ConfirmStepProps {
  matched: string;
  lat: number;
  lng: number;
  onYes: () => void;
  onNo: () => void;
}

export default function ConfirmStep({ matched, lat, lng, onYes, onNo }: ConfirmStepProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Cached images can complete before onLoad is attached.
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const src = getAerialImageUrl(lat, lng);
  const size = SITE.aerial.imageSize;

  return (
    <div className="text-center">
      <p className="kicker">Satellite check</p>
      <h3 className="headline mt-2 text-2xl text-ink sm:text-[28px]">
        Just confirming. Is this your home?
      </h3>
      <p className="mt-1.5 text-sm text-ink-soft">{matched}</p>
      <div className="relative mx-auto mt-6 aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl border border-line shadow-(--shadow-card)">
        {!loaded && <div className="shimmer absolute inset-0" aria-hidden="true" />}
        <img
          ref={imgRef}
          src={src}
          alt={"Overhead satellite view of " + matched}
          width={size}
          height={size}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={
            "h-full w-full object-cover transition-opacity duration-500 " +
            (loaded ? "opacity-100" : "opacity-0")
          }
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" data-qa="next" onClick={onYes} className="btn-primary">
          Yes, that's it
        </button>
        <button type="button" onClick={onNo} className="btn-ghost">
          No, re-enter address
        </button>
      </div>
    </div>
  );
}
