import { NextResponse } from "next/server";
import {
  enquirySchema,
  fieldErrors,
  type EnquiryResponse,
} from "@/lib/enquiry";
import { site } from "@/lib/site";

/**
 * Enquiry delivery.
 *
 * The route is complete and does real work. Whether an email actually leaves
 * the building depends on three environment variables (see .env.example):
 *
 *   RESEND_API_KEY      — the transactional email account
 *   ENQUIRY_TO_EMAIL    — where enquiries land, normally the studio address
 *   ENQUIRY_FROM_EMAIL  — a verified sender on the studio's domain
 *
 * Without them the route reports `not-configured` and the form falls back to
 * a prepared email the visitor sends themselves. The enquiry is never
 * swallowed, and the form is never a decoration that quietly does nothing.
 */

export const runtime = "nodejs";

/**
 * Best-effort throttle. Serverless instances are not shared, so this stops
 * casual repeat submissions rather than a determined flood — put a platform
 * rate limit in front of the route for that.
 */
const RECENT = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;

function throttled(key: string): boolean {
  const now = Date.now();
  const hits = (RECENT.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(key, hits);
  if (RECENT.size > 500) {
    for (const [k, v] of RECENT) {
      if (!v.some((t) => now - t < WINDOW_MS)) RECENT.delete(k);
    }
  }
  return hits.length > LIMIT;
}

export async function POST(request: Request): Promise<NextResponse<EnquiryResponse>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid", errors: { form: "Malformed request." } },
      { status: 400 },
    );
  }

  const parsed = enquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid", errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  // Honeypot: a bot fills every field it finds.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited" },
      { status: 429 },
    );
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_TO_EMAIL;
  const from = process.env.ENQUIRY_FROM_EMAIL;

  if (!key || !to || !from) {
    return NextResponse.json(
      { ok: false, reason: "not-configured" },
      { status: 503 },
    );
  }

  const { name, email, phone, division, location, message } = parsed.data;

  const body = [
    `Name       ${name}`,
    `Email      ${email}`,
    phone ? `Phone      ${phone}` : null,
    `Division   ${division}`,
    location ? `Location   ${location}` : null,
    "",
    message,
    "",
    `— Sent from ${site.url}/contact`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Enquiry — ${name}${location ? ` — ${location}` : ""}`,
        text: body,
      }),
    });

    if (!res.ok) {
      console.error("Enquiry delivery failed", res.status, await res.text());
      return NextResponse.json({ ok: false, reason: "failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Enquiry delivery threw", error);
    return NextResponse.json({ ok: false, reason: "failed" }, { status: 502 });
  }
}
