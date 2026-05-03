/**
 * 테마 적용 (#77).
 *
 * `<html data-theme="...">` attribute 로 globals.css 의 `[data-theme=*]`
 * override 블록을 활성화. 적용은 runtime — Tailwind v4 utility 가
 * `var(--color-*)` 로 컴파일되어 즉시 반영됨.
 *
 * 옵션:
 *   - "light"  — default (data-theme attribute 제거)
 *   - "dark"   — 어두운 배경
 *   - "sepia"  — 따뜻한 종이색
 *   - "cool-gray" — 차가운 모노크롬
 *   - "high-contrast" — 고대비 (접근성)
 *   - "system" — 자동 감지는 #77 out of scope. 현재는 light 로 fallback.
 */

export type Theme =
  | "light"
  | "dark"
  | "sepia"
  | "cool-gray"
  | "high-contrast"
  | "system";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const effective = theme === "system" || theme === "light" ? null : theme;
  if (effective === null) {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", effective);
  }
}
