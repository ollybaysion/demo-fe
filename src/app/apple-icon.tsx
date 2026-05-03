import { ImageResponse } from "next/og";

/**
 * iOS Apple Touch Icon (180×180). 코랄 배경 + 흰색 "F".
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#cc785c",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: 110,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        F
      </div>
    ),
    { ...size },
  );
}
