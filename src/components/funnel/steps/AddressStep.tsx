// Address entry. Geocodes via /api/geocode; on success preloads the satellite
// crop so the confirm step feels instant. Failures never dead-end, the input
// stays with a friendly inline error.

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getAerialImageUrl } from "../../../lib/aerial";
import type { GeocodeResponse } from "../../../lib/types";

interface AddressStepProps {
  initial: string;
  onFound: (address: { entered: string; matched: string; lat: number; lng: number }) => void;
}

const NOT_FOUND_COPY =
  "We couldn't find that address. Add the city and state and try again.";

export default function AddressStep({ initial, onFound }: AddressStepProps) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the async geocode: a response landing after the user navigated
  // away (unmount) must not fire onFound or set state.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const entered = value.trim();
    if (entered.length < 5) {
      setError("Enter your full street address, including city and state.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/geocode?address=" + encodeURIComponent(entered));
      const data = (await res.json()) as GeocodeResponse;
      if (!aliveRef.current) return;
      if (data.ok) {
        // Warm the satellite image cache before the confirm step renders.
        const img = new Image();
        img.src = getAerialImageUrl(data.lat, data.lng);
        onFound({ entered, matched: data.matchedAddress, lat: data.lat, lng: data.lng });
        return;
      }
      setError(NOT_FOUND_COPY);
    } catch {
      if (!aliveRef.current) return;
      setError(NOT_FOUND_COPY);
    }
    if (aliveRef.current) setPending(false);
  }

  return (
    <div>
      <p className="kicker">Your address</p>
      <h3 className="headline mt-2 leading-[1.3] text-2xl text-ink sm:text-[28px]">Where's the house?</h3>
      <p className="mt-2 text-ink-soft">
        We pull a satellite view of your roof and measure it. No ladder, no site visit.
      </p>
      <form className="mt-6" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="address"
            autoComplete="street-address"
            placeholder="123 Peachtree St NE, Atlanta, GA"
            aria-label="Street address"
            aria-invalid={error ? true : undefined}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            className={
              "w-full flex-1 rounded-xl border bg-white px-4 py-3 text-ink transition-shadow placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-brand/30 " +
              (error ? "border-[#B42318]" : "border-line focus:border-brand")
            }
          />
          <button
            type="submit"
            data-qa="next"
            disabled={pending}
            aria-busy={pending}
            className="btn-primary whitespace-nowrap disabled:cursor-wait disabled:opacity-80"
          >
            {pending ? (
              <>
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Finding your roof
              </>
            ) : (
              "Find my roof"
            )}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-[#B42318]">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-soft">We only use this to measure your roof.</p>
      </form>
    </div>
  );
}
