import { ImageResponse } from "next/og";

/**
 * 동적 favicon (32×32). 코랄 배경 + 흰색 "F" — 별도 PNG 자산 없이
 * Next.js 가 빌드 시점에 emit. 디자인 자산 확정되면 PNG 파일로 교체
 * 가능 (`public/icon.png` 또는 `src/app/icon.png`).
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        F
      </div>
    ),
    { ...size },
  );
}
