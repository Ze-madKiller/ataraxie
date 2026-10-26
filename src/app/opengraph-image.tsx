import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: 80,
          background: "#f7f6f2",
          color: "#1c2321",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#1f5f57", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 64 64">
              <path d="M14 34.5l11 11 25-27" fill="none" stroke="#f7f6f2" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2, color: "#1f5f57" }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{SITE_TAGLINE}</div>
          <div style={{ fontSize: 30, color: "#5a6360" }}>Annales corrigées · Correction immédiate · Extrait exact du cours</div>
        </div>
        <div style={{ display: "flex", height: 10, width: 240, borderRadius: 5, background: "#1f5f57" }} />
      </div>
    ),
    size,
  );
}
