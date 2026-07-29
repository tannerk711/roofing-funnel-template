// Address entry with typeahead. Suggestions come from /api/suggest (Photon);
// picking one fills the full formatted address and immediately geocodes it via
// /api/geocode. If geocode misses but the suggestion carried house-number
// coords, those coords are used so a picked address never dead-ends. If the
// suggest route is down the field degrades to plain typing, same as before.

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { getAerialImageUrl } from "../../../lib/aerial";
import type { AddressSuggestion, GeocodeResponse, SuggestResponse } from "../../../lib/types";

interface AddressStepProps {
  initial: string;
  onFound: (address: { entered: string; matched: string; lat: number; lng: number }) => void;
}

const NOT_FOUND_COPY =
  "We couldn't find that address. Add the city and state and try again.";
const SUGGEST_MIN_CHARS = 4;
const SUGGEST_DEBOUNCE_MS = 250;

export default function AddressStep({ initial, onFound }: AddressStepProps) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // Guards the async geocode: a response landing after the user navigated
  // away (unmount) must not fire onFound or set state.
  const aliveRef = useRef(true);
  // Set when we fill the input programmatically (suggestion picked) so the
  // value effect doesn't immediately refetch suggestions for it.
  const suppressFetchRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < SUGGEST_MIN_CHARS || pending) {
      setSuggestions([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/suggest?q=" + encodeURIComponent(q), {
          signal: controller.signal,
        });
        const data = (await res.json()) as SuggestResponse;
        if (!aliveRef.current || controller.signal.aborted) return;
        if (data.ok && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setOpen(true);
          setHighlight(-1);
        } else {
          setSuggestions([]);
          setOpen(false);
          setHighlight(-1);
        }
      } catch {
        // Suggest failing is never an error the user sees; typing still works.
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, pending]);

  async function find(entered: string, fallback?: AddressSuggestion) {
    if (pending) return;
    if (entered.length < 5) {
      setError("Enter your full street address, including city and state.");
      return;
    }
    setPending(true);
    setError(null);
    const succeed = (found: { matched: string; lat: number; lng: number }) => {
      // Warm the satellite image cache before the confirm step renders.
      const img = new Image();
      img.src = getAerialImageUrl(found.lat, found.lng);
      onFound({ entered, ...found });
    };
    try {
      const res = await fetch("/api/geocode?address=" + encodeURIComponent(entered));
      const data = (await res.json()) as GeocodeResponse;
      if (!aliveRef.current) return;
      if (data.ok) {
        succeed({ matched: data.matchedAddress, lat: data.lat, lng: data.lng });
        return;
      }
      if (fallback?.precise) {
        succeed({ matched: fallback.label, lat: fallback.lat, lng: fallback.lng });
        return;
      }
      setError(NOT_FOUND_COPY);
    } catch {
      if (!aliveRef.current) return;
      if (fallback?.precise) {
        succeed({ matched: fallback.label, lat: fallback.lat, lng: fallback.lng });
        return;
      }
      setError(NOT_FOUND_COPY);
    }
    if (aliveRef.current) setPending(false);
  }

  function choose(s: AddressSuggestion) {
    suppressFetchRef.current = true;
    abortRef.current?.abort();
    setValue(s.label);
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    void find(s.label, s);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOpen(false);
    void find(value.trim());
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      choose(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
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
          <div className="relative flex-1">
            <input
              type="text"
              name="address"
              autoComplete="off"
              placeholder="123 Peachtree St NE, Atlanta, GA"
              role="combobox"
              aria-label="Street address"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="address-suggestions"
              aria-invalid={error ? true : undefined}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={onKeyDown}
              onBlur={() => {
                setOpen(false);
                setHighlight(-1);
              }}
              className={
                "w-full rounded-xl border bg-white px-4 py-3 text-ink transition-shadow placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-brand/30 " +
                (error ? "border-[#B42318]" : "border-line focus:border-brand")
              }
            />
            {open && suggestions.length > 0 && (
              <ul
                id="address-suggestions"
                role="listbox"
                aria-label="Address suggestions"
                // mousedown fires before the input's blur; preventing default
                // keeps focus on the input so the click can land on an option.
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-line bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.label}
                    role="option"
                    aria-selected={i === highlight}
                    onMouseEnter={() => setHighlight(i)}
                    // pointerdown, not click: on touch the input's blur fires
                    // before the synthesized click, unmounting the list first.
                    onPointerDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    className={
                      "flex cursor-pointer items-start gap-2.5 px-4 py-2.5 text-sm text-ink " +
                      (i === highlight ? "bg-brand/[0.08]" : "")
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-ink-soft"
                    >
                      <path
                        d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <span className="min-w-0">{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
        <p className="mt-3 text-xs text-ink-soft">
          Start typing and pick your address. We only use this to measure your roof.
        </p>
      </form>
    </div>
  );
}
