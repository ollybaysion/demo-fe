import type { MetadataRoute } from "next";

/**
 * Web App Manifest. 홈 화면 추가 / standalone 실행을 위한 메타.
 * 아이콘은 Next.js 가 `app/icon.tsx` / `app/apple-icon.tsx` 에서
 * 자동 emit 한 것을 참조.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FDC Agent",
    short_name: "FDC Agent",
    description: "설비 데이터를 자연어로 분석하는 도메인 특화 챗봇.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#cc785c",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
