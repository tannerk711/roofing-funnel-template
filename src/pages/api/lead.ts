// POST /api/lead
// Validates the lead payload and forwards it to LEAD_WEBHOOK_URL (GHL inbound
// webhook). The lead flow must never dead-end the user: webhook problems are
// logged and reported as forwarded:false, never as a failure the funnel blocks
// on. Response shape: LeadResponse from src/lib/types.ts.

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
  try {
    let payload: Partial<LeadPayload> | null;
    try {
      payload = (await request.json()) as Partial<LeadPayload> | null;
    } catch {
      return json({ ok: false }, 400);
    }

    const contact = payload?.contact;
    if (
      !payload ||
      !contact ||
      !hasText(contact.name) ||
      !hasText(contact.phone) ||
      !hasText(contact.email)
    ) {
      return json({ ok: false }, 400);
    }

    // Vercel runtime env, NOT import.meta.env (build-time only).
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(
        "[lead] LEAD_WEBHOOK_URL is not set; lead accepted but not forwarded.",
      );
      return json({ ok: true, forwarded: false });
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, receivedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.error(`[lead] webhook responded ${res.status}; lead not forwarded.`);
        return json({ ok: true, forwarded: false });
      }
    } catch (err) {
      console.error("[lead] webhook forward failed:", err);
      return json({ ok: true, forwarded: false });
    }

    return json({ ok: true, forwarded: true });
  } catch (err) {
    // Even an unexpected server error must not dead-end the funnel.
    console.error("[lead] unexpected error:", err);
    return json({ ok: true, forwarded: false });
  }
};
