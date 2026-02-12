import { ImageResponse } from "next/og";

export const alt = "HealthAgent weekly health insights";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function TwitterImage() {
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
          background: "linear-gradient(130deg, #f7fef8 0%, #d8edf8 100%)",
          color: "#0f2533"
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>HealthAgent</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 58, lineHeight: 1.05, fontWeight: 700, maxWidth: "960px" }}>
            Weekly health insights from Apple Health exports
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#24495d", maxWidth: "970px" }}>
            Trend signals for weight, nutrition, sleep, training, and data quality.
          </div>
        </div>
      </div>
    ),
    size
  );
}
