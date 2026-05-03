import type { NextConfig } from "next";

/**
 * 보안 헤더 (#88).
 *
 * Next.js 가 inline script (hydration / theme boot) 와 inline style
 * (Tailwind v4 / next/font) 을 광범위하게 사용하므로 CSP 는
 * `'unsafe-inline'` 을 허용하는 보수적 정책으로 시작. dev 환경은
 * `'unsafe-eval'` 도 필요(HMR / fast refresh). 추후 nonce 기반으로
 * tightening 가능.
 *
 * HSTS 는 HTTPS 운영 환경에서만 의미 있으므로 production build 에만
 * 첨부.
 */
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Next/React 의 inline + (dev 한정) eval. recharts / prism-react-renderer
  // 도 inline 스니펫을 출력.
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // data: 는 next/font preload 와 일부 inline svg 에서 쓰임. blob: 은
  // 향후 chart export / image paste 대응.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // 백엔드 도메인이 다른 환경이면 build 시 추가하도록 후속 작업.
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle under .next/standalone for
  // Docker multi-stage runtime. See Dockerfile and #7 for context.
  output: "standalone",
  async headers() {
    return [
      {
        // 모든 응답 — API · 페이지 · static 자산 모두 포함.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
