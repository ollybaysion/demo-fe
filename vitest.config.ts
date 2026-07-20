import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 순수 로직 전용 테스트 설정.
 *
 * jsdom 도 testing-library 도 두지 않는다 — 검증 대상인 규칙(파싱 어댑터 경계,
 * 스냅샷 상태 전이)이 React 밖 순수 함수로 나와 있어서 DOM 이 필요 없다.
 * 컴포넌트가 들어오면 그때 환경을 올린다.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
