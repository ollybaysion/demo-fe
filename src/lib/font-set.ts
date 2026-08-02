/**
 * 시작 화면 글꼴 세트 적용.
 *
 * `<html data-font="...">` attribute 로 globals.css 의 `[data-font=*]` override
 * 를 활성화한다. 테마(`data-theme`)와 같은 방식이고, 같은 이유로 runtime 에
 * 즉시 반영된다 — 값이 `var(--font-hero-*)` 로 컴파일되어 있다.
 *
 * 적용 범위는 **시작 화면의 팁·제목·부제**다. 채팅 본문까지 갈아엎지 않는
 * 이유는, 대화 중 글꼴은 코드블록·표·버블과 함께 검증해야 하는 별개의 일이기
 * 때문이다.
 *
 * 옵션:
 *   - "pretendard" — 기본. 제목·팁 모두 Pretendard (attribute 제거)
 *   - "gowun"      — 고운바탕(제목 명조) + 고운돋움(팁·부제)
 *   - "gothic-a1"  — Gothic A1 한 글꼴로 통일
 */

export type FontSet = "pretendard" | "gowun" | "gothic-a1";

export function applyFontSet(set: FontSet): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (set === "pretendard") {
    html.removeAttribute("data-font");
  } else {
    html.setAttribute("data-font", set);
  }
}
