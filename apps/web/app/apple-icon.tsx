import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 20%, #1f1f1f 0%, #0a0a0a 60%, #050505 100%)",
          color: "#fafafa",
          fontSize: 110,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.06em",
        }}
      >
        J
      </div>
    ),
    { ...size }
  );
}
