import { ImageResponse } from "next/og";

export const alt = "HealthAgent Apple Health trend dashboard";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px",
          background: "linear-gradient(135deg, #eef8f2 0%, #dceff7 100%)",
          color: "#0f2533"
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>HealthAgent</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 60, lineHeight: 1.05, fontWeight: 700, maxWidth: "940px" }}>
            Apple Health trends with clear weekly next actions
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#24495d", maxWidth: "960px" }}>
            Ingest exports. Run the pipeline. Review trend signals and insight summaries.
          </div>
        </div>
      </div>
    ),
    size
  );
}
