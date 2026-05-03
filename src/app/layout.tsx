import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono, Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

// Latin display
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-cormorant",
  display: "swap",
});

// Latin sans
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

// Latin mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Korean display fallback (Google Fonts — Noto family pairs visually with Cormorant)
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

// Korean sans (Pretendard variable — Inter와 비례 매칭, 한국 웹의 모던 표준)
// Single variable woff2 covers all weights (45 ~ 920)
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// Korean mono (D2Coding subset — KS-X-1001 한글 + Latin/숫자/기호, 357KB)
const d2coding = localFont({
  src: "../../node_modules/d2coding/fonts/d2coding-subset.woff2",
  variable: "--font-d2coding",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "FDC Agent",
  description: "설비 데이터를 자연어로 분석하는 도메인 특화 챗봇.",
  applicationName: "FDC Agent",
  openGraph: {
    title: "FDC Agent",
    description: "설비 데이터를 자연어로 분석하는 도메인 특화 챗봇.",
    siteName: "FDC Agent",
    type: "website",
    locale: "ko_KR",
    // images 는 app/opengraph-image.tsx 가 자동으로 채움.
  },
  twitter: {
    card: "summary_large_image",
    title: "FDC Agent",
    description: "설비 데이터를 자연어로 분석하는 도메인 특화 챗봇.",
  },
};

const fontVariables = [
  cormorant.variable,
  inter.variable,
  jetbrainsMono.variable,
  notoSerifKr.variable,
  pretendard.variable,
  d2coding.variable,
].join(" ");

/**
 * 첫 paint 부터 저장된 테마(없으면 default 인 cool-gray) 적용 — hydration
 * 전에 동기 실행되어 light → cool-gray 깜빡임(FOUC) 방지.
 */
const themeBootScript = `(function(){try{var s=JSON.parse(localStorage.getItem('fdc-fe.settings.v1')||'null');var t=(s&&s.theme)||'cool-gray';if(t&&t!=='light'&&t!=='system'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={fontVariables} suppressHydrationWarning>
      <body className="bg-brand-canvas text-brand-ink font-sans antialiased">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
