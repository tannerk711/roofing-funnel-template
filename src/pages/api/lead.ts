// POST /api/lead
// Validates the lead payload and forwards it to LEAD_WEBHOOK_URL (a Zapier
// catch hook). A webhook failure returns 502 so the form shows a retry state
// that keeps the entered data; a lead is never reported as sent when it was
// not. Every return path logs exactly one "[lead]" line. Response shape:
// LeadResponse from src/lib/types.ts.
//
// Honeypot: the hidden field `ff_hp` (nonsense name, password managers told to
// ignore it). A filled trap is a LABEL, never a gate: the submit forwards with
// honeypotFilled: true and one log line (Tanner, 2026-10-06: every complete
// submit fires the Zap). `website` is read too, for any older cached bundle.

import type { APIRoute } from "astro";
import type { LeadPayload, LeadResponse } from "../../lib/types";

export const prerender = false;

const WEBHOOK_TIMEOUT_MS = 5000;

function json(body: LeadResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown> | null;
  try {
    data = (await request.json()) as Record<string, unknown> | null;
  } catch {
    console.warn("[lead] rejected: bad payload");
    return json({ ok: false }, 400);
  }
  if (!data || typeof data !== "object") {
    console.warn("[lead] rejected: bad payload");
    return json({ ok: false }, 400);
  }

  const contact = (data.contact ?? {}) as Partial<LeadPayload["contact"]>;
  const who = () => JSON.stringify({ name: contact.name, phone: contact.phone });

  // Honeypot is a LABEL, never a gate (Tanner, 2026-10-06: every complete
  // submit fires the Zap and becomes a lead). A filled trap travels as
  // honeypotFilled: true on the payload and gets one log line; nothing is
  // dropped. The pre-rename trap key is still read for cached bundles.
  const trap = [data.ff_hp, data.website].find(
    (v) => typeof v === "string" && v.trim() !== "",
  );
  delete data.ff_hp;
  delete data.website;
  const seconds = Number(data.secondsToComplete);
  data.honeypotFilled = trap !== undefined;
  if (trap !== undefined) {
    console.warn(`[lead] trap filled (${seconds}s), forwarding flagged`, who());
  }

  for (const field of ["name", "phone", "email"] as const) {
    if (!hasText(contact[field])) {
      console.warn(`[lead] rejected: missing ${field}`, who());
      return json({ ok: false }, 400);
    }
  }

  data.receivedAt = new Date().toISOString();
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;

  // Vercel runtime env, NOT import.meta.env (build-time only).
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    if (import.meta.env.PROD) {
      // never a thank-you with the lead sitting only in the logs
      console.error("[lead] LEAD_WEBHOOK_URL not set in production", who());
      return json({ ok: false }, 502);
    }
    console.log("[lead] LEAD_WEBHOOK_URL not set (dev); payload:", JSON.stringify(data));
    return json({ ok: true, forwarded: false }, 200);
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[lead] webhook answered ${res.status}`, who());
      return json({ ok: false }, 502);
    }
    console.log(
      `[lead] accepted, webhook ${res.status}`,
      JSON.stringify({
        name: contact.name,
        phone: contact.phone,
        receivedAt: data.receivedAt,
        ip,
        seconds,
        honeypotFilled: data.honeypotFilled,
      }),
    );
    return json({ ok: true, forwarded: true });
  } catch (e) {
    console.error("[lead] webhook unreachable", who(), e);
    return json({ ok: false }, 502);
  }
};
