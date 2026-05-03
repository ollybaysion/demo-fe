import { ImageResponse } from "next/og";

/**
 * 메신저(Slack/카톡 등) 링크 프리뷰용 og:image (1200×630).
 * 크림 캔버스 + 코랄 wordmark + 한 줄 설명.
 */
export const alt = "FDC Agent — 도메인 특화 FDC 분석 챗봇";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#faf9f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          fontFamily: "system-ui, sans-serif",
          color: "#141413",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              background: "#cc785c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 600,
              borderRadius: 16,
              letterSpacing: "-0.04em",
            }}
          >
            F
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            FDC Agent
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#3d3d3a",
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          설비 데이터를 자연어로 분석하는 도메인 특화 챗봇.
        </div>
      </div>
    ),
    { ...size },
  );
}
