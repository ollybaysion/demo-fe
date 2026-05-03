# Settings 명세

채팅 헤더 우측의 ⚙ 버튼으로 여는 설정 모달의 항목 / 저장 / 적용 흐름.
디자인 토큰 / 컴포넌트 정의는 `DESIGN.md` §settings-modal 참고.

## 항목

| 항목 | 타입 | 옵션 | 즉시 적용 | 저장 |
|---|---|---|---|---|
| **테마** | 라디오 chip | `light` / `dark` / `sepia` / `cool-gray` (default) / `high-contrast` / `system` | ✓ | localStorage |
| **폰트 크기** | 라디오 chip | `sm` / `md` (default) / `lg` | ✗ (UI 만) | localStorage |
| **언어** | select (disabled) | `ko` 고정 | — | — |
| **모델** | select (disabled) | `default` 고정 | — | — |

폰트 크기 / 언어 / 모델 은 옵션 자체는 저장되지만 시각 적용·다국어·
백엔드 모델 라우팅은 후속 작업. 모달 하단의 안내 캡션이 이를 명시.

## 저장 모델

- 키: `fdc-fe.settings.v1`
- 값:
  ```ts
  type Settings = {
    theme:    "light" | "dark" | "sepia" | "cool-gray" | "high-contrast" | "system";
    fontSize: "sm" | "md" | "lg";
    language: "ko";
    model:    "default";
  };
  ```
- default:
  ```ts
  { theme: "cool-gray", fontSize: "md", language: "ko", model: "default" }
  ```
- 값 변경 시 즉시 `writeJson` — 별도 [저장] 버튼 없음.

## 테마 적용 흐름

1. **부트 스크립트** (`src/app/layout.tsx` 의 `<Script id="theme-boot" strategy="beforeInteractive">`)
   - hydration 전에 `localStorage` 읽고 `<html data-theme="...">` 설정 → FOUC 방지.
   - `light` / `system` 인 경우 `data-theme` 미설정 (canvas / surface / ink 등 default 토큰).
2. **모달 라디오 클릭** → `applyTheme(theme)` (`src/lib/theme.ts`) 호출 → `<html>` attribute 즉시 갱신 → Tailwind utility 가 `var(--color-*)` 로 컴파일된 덕에 한 프레임 안에 화면 반영.
3. **CSS 토큰 override** — `src/app/globals.css` 의 `@layer base { [data-theme="dark"] { ... } }` 등 4개 블록. `light` 는 `@theme` default.

## 모달 동작

- 트리거: 채팅 헤더 우측 `⚙` 버튼 (`button[aria-label="설정 열기"]`).
- 닫기: `[×]` / `Esc` / backdrop 클릭.
- 모달 너비: `max-w-[28rem]`. (Tailwind v4 가 `max-w-md` 를 우리 `--spacing-md: 16px` 토큰으로 매핑하는 충돌 우회.)
- 열림 시 닫기 버튼에 자동 포커스.

## 컴포넌트

- `src/components/settings/SettingsModal.tsx` — 모달 + 라디오 / select.
- `src/components/chat/ChatHeader.tsx` — `⚙` 트리거.
- `src/lib/theme.ts` — `applyTheme(theme)` + `Theme` 유니온.

## 후속 작업

- `system` 의 OS-level `prefers-color-scheme` 자동 감지 (현재는 `light` fallback).
- 폰트 크기 실제 적용 — root `font-size` 또는 CSS variable.
- 다국어 (i18n) — `language` 활성화.
- 모델 라우팅 — 백엔드 endpoint 가 모델 파라미터를 받기 시작하면 `model` 활성화.
- 사용자 정의 테마 — DESIGN.md §Theme Variants 의 5종 외 사용자 색 토큰 입력.

## Out of scope

- 다른 기기 / 브라우저 동기화 (계정 기반 동기화는 인증 도입 후).
- 설정 export / import.
