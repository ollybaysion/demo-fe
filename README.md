# FDC Agent Frontend

설비 데이터를 자연어로 분석하는 도메인 특화 챗봇 프론트엔드.

채팅 인터페이스 위에 데이터 스냅샷 패널, 운영자 인계용 요약, 이미지 첨부,
5개 컬러 테마 등 도메인 워크플로우를 얹은 Next.js App Router 앱이다.
백엔드는 별도 — 본 저장소는 클라이언트 + mock SSE 라우트만.

## Tech Stack

| Layer | 라이브러리 | 비고 |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | output: standalone (Docker) |
| UI | **React 19** | server / client component mix |
| Language | **TypeScript 5** | strict 모드 |
| Styling | **Tailwind CSS 4** + `@theme` 토큰 | 디자인 토큰은 `DESIGN.md` |
| Charts | **recharts** | line / bar / area + reference lines·areas |
| Markdown | **react-markdown** + **remark-gfm** + **rehype-sanitize** | 어시스턴트 응답 본문 |
| Code highlight | **prism-react-renderer** | inline `[복사]` |
| Server logging | **pino** (+ `pino-pretty` for dev) | 구조화 JSON 로그, redact |
| Static raw text | `raw-loader` (Turbopack rule) | `*.md` import |
| Lint | ESLint (Next.js default) | |
| Package Manager | **pnpm 10.33.2** | `package.json#packageManager` 핀 |
| Runtime | **Node.js 22.22.2** | `.nvmrc` |
| Deployment | Docker | 멀티-스테이지 standalone |

추가 라이브러리는 기능 도입 시점에 합류한다 — 처음부터 모두 박지 않는다.

## Prerequisites

- **Node.js 22.22.2** (`.nvmrc`).

  ```sh
  nvm install   # .nvmrc 읽음
  nvm use
  ```

- **pnpm** (corepack 으로 활성화)

  ```sh
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

- **git** 2.x+

확인:

```sh
node -v   # v22.22.2
pnpm -v
git --version
```

## Local Development

```sh
git clone git@github.com:ollybaysion/demo-fe.git
cd demo-fe
pnpm install
pnpm dev      # http://localhost:3000
```

첫 화면은 시나리오 starter 카드들. 클릭하면 미리 짜인 데모 흐름이 SSE
스트리밍으로 재생되어 표 / 차트 / 이벤트 타임라인 / 추천 후속 질문 chip
등 모든 위젯을 바로 확인 가능.

### 스크립트

| 명령 | 동작 |
| --- | --- |
| `pnpm dev` | 개발 서버 (Turbopack HMR) |
| `pnpm build` | 프로덕션 빌드 (standalone) |
| `pnpm start` | 빌드 산출물 실행 |
| `pnpm lint` | ESLint |

## Project Structure

```text
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # root layout + metadata + theme boot script
│   ├── page.tsx             # ChatContainer + HelpButton
│   ├── icon.tsx             # 동적 favicon (next/og)
│   ├── apple-icon.tsx       # iOS touch icon
│   ├── opengraph-image.tsx  # 메신저 링크 프리뷰
│   ├── manifest.ts          # PWA manifest
│   ├── robots.ts            # 사내용 — 외부 색인 차단
│   ├── globals.css          # @theme 토큰 + 5 테마 override
│   └── api/chat/route.ts    # mock SSE
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx    # 메인 흐름
│   │   ├── ChatHeader.tsx
│   │   ├── ChatInput.tsx        # paste / drop 이미지 첨부
│   │   ├── ChatEmptyState.tsx
│   │   ├── SuggestedQuestions.tsx
│   │   ├── message/             # 메시지 버블 + list + markdown
│   │   ├── paired/              # 메시지 옆 표 / 차트 / 타임라인
│   │   ├── summary/             # 운영자 인계 요약 패널
│   │   ├── context/             # 우측 설비 카드 패널
│   │   └── history/             # 좌측 대화 이력 사이드바
│   ├── help/                    # 우측 하단 도움말 FAB + 모달
│   └── settings/                # 헤더 ⚙ 설정 모달
├── content/
│   ├── help.md              # 도움말 본문 (raw text import)
│   └── markdown.d.ts
├── demo/
│   └── scenarios/           # 16개 데모 시나리오 (UC-1 ~ UC-15 + data-shape)
├── lib/
│   ├── types.ts             # Message / paired / context 타입
│   ├── chatErrors.ts        # 클라이언트 에러 분류
│   ├── logger.ts            # 서버 pino 로거
│   ├── theme.ts             # data-theme 적용
│   ├── sse.ts               # SSE 파서
│   └── storage.ts           # localStorage helper
└── config/
    ├── contextColumns.ts
    └── suggestedQuestions.ts
```

## Features (요약)

- **데모 모드** — 16개 시나리오 (UC-1 ~ UC-15 + data-shape). chip 정렬
  규칙으로 첫 chip 만 활성, 나머지 disabled placeholder.
- **paired 위젯** — 메시지 한 건에 표 / 차트 / 이벤트 타임라인을 좌·우
  gutter 에 자동 분배. 메시지 단위 접기·비활성 토글.
- **마크다운** — GFM (헤딩 / 표 / 인용 / 코드 펜스 / 외부 링크). 링크는
  허용 scheme (`https`/`http`/`mailto`) 만 활성. parser throw 시
  `MarkdownErrorBoundary` 가 그 메시지만 plain text 로 fallback.
- **이미지 첨부** — 채팅 입력에 paste / drag&drop. MIME 화이트리스트와
  5MB / 4개 cap.
- **테마** — light / dark / sepia / cool-gray (default) / high-contrast.
  `data-theme` attribute + Tailwind 토큰 override. boot script 로 FOUC 방지.
- **대화 이력** — 좌측 320px push 사이드바, localStorage persistence.
- **운영자 요약** — 우측 320px 패널, 마크다운으로 클립보드 복사.
- **보안** — request body size/length cap, response sanitize (prod),
  보안 헤더 (CSP / XFO / Referrer / Permissions / HSTS), 마크다운 링크
  scheme whitelist, postcss XSS 패치.
- **로깅** — `/api/chat` 의 모든 단계가 pino 구조화 로그, `X-Request-Id`
  응답 헤더로 클라이언트 ↔ 서버 추적.

상세 디자인 토큰 / 컴포넌트 명세는 `DESIGN.md` 참고. 백엔드 contract 는
`API.md` 참고.

## Environment Variables

런타임에 주입한다 (이미지에 굽지 않음):

| Var | 기본 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `development` / `production` | Next.js 표준 |
| `LOG_LEVEL` | dev: `debug`, prod: `info` | pino 로그 레벨 |
| `BACKEND_URL` | (없음 — mock 동작) | 설정 시 모든 `/api/fdc/v1/*` route 가 그쪽으로 forward |

## Mock vs Backend

명확화:

- **클라이언트**는 항상 동일 path (`/api/fdc/v1/...`) 를 호출. 분기 없음.
- **각 `route.ts`** 는 `BACKEND_URL` 환경 변수 한 곳으로 동작 모드를 결정 — `src/lib/backend.ts` 의 `forwardOrMock` helper 가 일괄 처리:
  - `BACKEND_URL` **미설정** → route 안의 mock 응답.
  - `BACKEND_URL` **설정** → 같은 path 를 그쪽으로 forward (요청 method / body / 일부 헤더 보존, hop-by-hop 헤더 제거).
- **데모 모드**는 별개 — 시나리오 starter 클릭 시 `chat` 응답이 미리 정해진 텍스트로 SSE 재생되는 흐름. mock route 와 다른 축이며, 데모 시나리오를 켜둔 상태에서도 `BACKEND_URL` 이 설정돼 있으면 chat 도 백엔드로 forward.

> SSE 인 `/api/fdc/v1/chat` 은 현재 mock SSE 만 처리. 백엔드 swap 시 그 route.ts 안에서 `fetch` 응답을 그대로 stream pipe 하도록 별도 작업 필요 (Phase 3 또는 후속).

## Deployment (Docker)

```sh
docker build -t fdc-agent-fe .
docker run -p 3000:3000 fdc-agent-fe
# → http://localhost:3000
```

### 이미지 전략

- `node:22.22.2-alpine` base (`.nvmrc` 매칭)
- 3 stage: **deps** (`pnpm install --frozen-lockfile`) → **builder**
  (`pnpm build`, `output: 'standalone'`) → **runner** (alpine + non-root)
- 런타임 이미지엔 `.next/standalone`, `.next/static`, `public/` 만.
- `pnpm` 버전은 `package.json#packageManager` 핀, corepack 활성화.

### 환경 변수 주입 예

```sh
docker run -p 3000:3000 \
  -e LOG_LEVEL=info \
  fdc-agent-fe
```

## 문서

- [`DESIGN.md`](./DESIGN.md) — 디자인 토큰 / 컴포넌트 / 챗 인터페이스 명세
- [`API.md`](./API.md) — 백엔드 contract (endpoint / SSE / 데이터 모델 / 보안)
