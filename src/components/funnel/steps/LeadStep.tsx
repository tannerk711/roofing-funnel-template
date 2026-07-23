// Lead capture. Always BEFORE any price is shown, never after. Validates
// inline, fires stage "lead_captured" through the parent, and proceeds even
// if the POST fails (the parent logs it).

import { useState } from "react";
import type { FormEvent } from "react";
import type { Contact } from "../../../lib/types";

interface LeadStepProps {
  initial: Contact | null;
  onSubmit: (contact: Contact) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strip non-digits, drop a leading "1" from 11-digit autofill, require 10. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export default function LeadStep({ initial, onSubmit }: LeadStepProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const next: FieldErrors = {};
    const trimmedName = name.trim();
    if (trimmedName.length < 2) next.name = "Enter your full name.";
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) next.phone = "Enter a 10 digit mobile number.";
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (next.name || next.phone || next.email || !normalizedPhone) return;
    setPending(true);
    void onSubmit({ name: trimmedName, phone: normalizedPhone, email: trimmedEmail });
  }

  const inputCls = (hasError: boolean) =>
    "mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-ink transition-shadow placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-brand/30 " +
    (hasError ? "border-[#B42318]" : "border-line focus:border-brand");

  return (
    <div>
      <p className="kicker">Almost there</p>
      <h3 className="headline mt-2 leading-[1.3] text-2xl text-ink sm:text-[28px]">Your estimate is ready</h3>
      <p className="mt-2 text-ink-soft">
        Tell us where to send it and it unlocks instantly. We'll also text you a copy.
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="lead-name" className="block text-sm font-semibold text-ink">
            Full name
          </label>
          <input
            id="lead-name"
            type="text"
            autoComplete="name"
            placeholder="First and last name"
            aria-invalid={errors.name ? true : undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            className={inputCls(Boolean(errors.name))}
          />
          {errors.name && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-[#B42318]">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-phone" className="block text-sm font-semibold text-ink">
            Mobile phone
          </label>
          <input
            id="lead-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(404) 555-0187"
            aria-invalid={errors.phone ? true : undefined}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            className={inputCls(Boolean(errors.phone))}
          />
          {errors.phone && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-[#B42318]">
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-email" className="block text-sm font-semibold text-ink">
            Email
          </label>
          <input
            id="lead-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            className={inputCls(Boolean(errors.email))}
          />
          {errors.email && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-[#B42318]">
              {errors.email}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="5"
              y="10.5"
              width="14"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>No spam. Your info goes to our local team only.</span>
        </div>

        <button
          type="submit"
          data-qa="next"
          disabled={pending}
          aria-busy={pending}
          className="btn-primary w-full disabled:cursor-wait disabled:opacity-80"
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
              Unlocking
            </>
          ) : (
            "Unlock my estimate"
          )}
        </button>
      </form>
    </div>
  );
}
