import type { MetadataRoute } from "next";

/**
 * 사내용 도구라 외부 검색엔진 색인 차단. 외부 노출이 필요하면 prod
 * 도메인을 검사해 그 때만 allow 로 분기.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
