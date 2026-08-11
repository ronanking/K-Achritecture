import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card is the overture, held at its opening state: the mark, the
 * datum, the practice. Drawn rather than photographed, so it is correct
 * before any project photography exists.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0B0B",
          color: "#EFEBE4",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <svg width="72" height="96" viewBox="0 0 24 32" fill="none">
            <path d="M3 1 V31" stroke="#EFEBE4" strokeWidth="1.2" />
            <path d="M21 1 L3 18" stroke="#EFEBE4" strokeWidth="1.2" />
            <path d="M10 11 L21 31" stroke="#EFEBE4" strokeWidth="1.2" />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            {site.region}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 1,
              background: "#EFEBE4",
              opacity: 0.35,
              marginBottom: 40,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              opacity: 0.6,
              marginBottom: 24,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            {site.tagline}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
