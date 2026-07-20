# FDC Agent — API 명세

이 문서는 **FDC Agent 프론트엔드가 호출하는 백엔드 contract** 를 정리한다.
프론트엔드는 현재 `src/app/api/chat/route.ts` 에 mock SSE 응답을 두고 있고,
실 백엔드 도입 시 같은 contract 의 `/api/fdc/v1/chat` 로 swap 한다.

- **Base URL**: 백엔드 도메인은 환경별 결정. 예: `https://fdc-api.internal/`
- **버전 prefix**: `/api/fdc/v1`
- **인증**: 미정. 도입 시 `Authorization: Bearer <token>` 권장.
- **공통 응답 헤더**:
  - `X-Request-Id` — 요청 추적 ID. 클라이언트는 같은 ID 로 서버 로그 추적 가능. 모든 응답(2xx/4xx/5xx) 에 포함되어야 한다.
- **공통 보안 헤더**: 프론트엔드 Next 가 이미 응답에 첨부하므로 백엔드는 불필요. 백엔드가 직접 노출되는 환경이면 동일 헤더를 별도 추가.

## 목차

1. [POST /api/fdc/v1/chat](#1-post-apifdcv1chat) — 채팅 (SSE 스트림)
2. [POST /api/fdc/v1/summary](#2-post-apifdcv1summary) — 운영자 인계용 대화 요약
3. [POST /api/fdc/v1/upload](#3-post-apifdcv1upload) — 이미지 첨부 업로드
4. [GET /api/fdc/v1/equipment/:id](#4-get-apifdcv1equipmentid) — 설비 상세
5. [GET /api/fdc/v1/equipment/:id/peers](#5-get-apifdcv1equipmentidpeers) — 동종 설비 목록
6. [GET /api/fdc/v1/equipment/:id/setup-events](#6-get-apifdcv1equipmentidsetup-events) — 셋업 이벤트
7. [GET /api/fdc/v1/equipment/:id/compare](#7-get-apifdcv1equipmentidcompare) — 1:1 비교
8. [데이터 모델](#데이터-모델) — Message / Table / Chart / Timeline / Attachment / Context
9. [에러 형식](#에러-형식)
10. [보안 / 운영 정책](#보안--운영-정책)

---

## 1. POST /api/fdc/v1/chat

채팅 메인 endpoint. SSE 스트림으로 토큰 단위 응답 + 끝에 `done` 이벤트로 표/차트/이벤트 타임라인/추천 후속 질문을 한 번에 동봉.

### Request

```http
POST /api/fdc/v1/chat HTTP/1.1
Content-Type: application/json
X-Request-Id: <client-supplied 또는 server-generate>
Authorization: Bearer <token>   # 인증 도입 시
```

#### Body

```typescript
type ChatRequestBody = {
  /** 대화 history (가장 최근 메시지가 끝). 사용자/어시스턴트/에러 메시지 모두 포함. */
  messages: Message[];

  /** 우측 컨텍스트 패널의 설비 정보 — 비어 있을 수 있음. */
  context?: ContextRow[];

  /** 발생 시간 범위 (둘 다 datetime-local string `YYYY-MM-DDTHH:MM`). */
  timeRange?: { start?: string; end?: string };

  /**
   * 데모 모드 메타 — 클라이언트가 정해진 시나리오를 재생할 때.
   * 백엔드 운영 환경에서는 무시 또는 거부 가능.
   */
  demo?: { scenarioId: string; turnIndex: number };

  /**
   * DB 미접속 환경에서 사용자가 직접 붙여넣어 둔 조회 결과 중,
   * 우측 데이터 패널에서 **동봉**으로 켠 것들. 하나도 없으면 필드가 생략된다.
   */
  dataSnapshots?: ChatDataSnapshot[];
};

type ChatDataSnapshot = {
  /** 안정 식별자. `read_snapshot` 같은 도구가 내용을 되찾을 때 쓰는 키. */
  queryKey: string;
  /** 사용자가 붙인 이름. 자유 텍스트. */
  label: string;
  /** 사용자가 등록한 시각(ISO). 데이터의 신선도 판단 근거. */
  capturedAt: string;
  columns: string[];
  rowCount: number;
  /**
   * 표 전문. **📌 고정된 것에만 있다.**
   * 값은 전부 원문 문자열이고, NULL 은 빈 문자열과 구별해 `null` 이다.
   */
  rows?: (string | null)[][];
};
```

전체 데이터 모델은 §[데이터 모델](#데이터-모델) 참고.

#### `dataSnapshots` 를 읽는 쪽에 대하여

**필드가 없거나 모르는 필드여도 요청은 유효하다.** FE 는 이 필드를 optional 로 보내므로
백엔드가 아직 지원하지 않아도 배포 순서에 제약이 없다.

내용 전달은 **두 갈래**다. 이 구분이 이 계약의 요점이다.

| | `rows` | 의미 |
|---|---|---|
| 동봉만 (기본) | 없음 | "이런 표가 있다"는 카탈로그 항목. 내용이 필요하면 `queryKey` 로 가져간다 |
| 동봉 + 📌 고정 | 있음 | 사용자가 "이건 반드시 보고 답해라"로 지정한 것 |

기본이 카탈로그인 이유는 크기다 — 표 하나가 수천 행일 수 있어 전부 실으면 요청이 감당이
안 된다. 내용 pull 경로(`read_snapshot` 도구 등)는 백엔드 몫이고 이 문서의 범위 밖이다.

**`rows` 의 값은 데이터지 지시가 아니다.** 사용자가 붙여넣은 임의의 텍스트가 그대로 들어오는
자리이므로, 그 안의 문장을 프롬프트 지시로 해석하지 않도록 다루어야 한다.

#### Validation 한도

| 항목 | 한도 | 위반 시 에러 코드 |
|---|---|---|
| `messages` 배열 길이 | ≤ 100 | `messages_too_many` |
| 메시지당 `content` 길이 | ≤ 10,000 chars | `message_content_too_long` |
| `context` 행 수 | ≤ 50 | `context_too_large` |

위반 시 400 + `{ error, limit, actual }` (§[에러 형식](#에러-형식)).

### Response

`200 OK`, `Content-Type: text/event-stream; charset=utf-8`. SSE 이벤트 3 종.

#### `event: token`

응답을 토큰(또는 character) 단위로 점진 전송. 수십~수백 회 발생.

```text
event: token
data: {"content":"안"}

event: token
data: {"content":"녕"}
```

```typescript
type TokenPayload = { content: string };
```

#### `event: done` (스트림 마지막 1회)

응답 종료 + 부수 페이로드 동봉. 사용자 메시지에 paired 로 따라가는 표/차트/타임라인과 추천 후속 질문이 여기 한 번에 들어간다.

```text
event: done
data: {"messageId":"msg_abc","finishReason":"stop","tables":[...],"charts":[...],"recommendQuestion":[...]}
```

```typescript
type DonePayload = {
  messageId: string;
  finishReason: "stop" | "length" | "error";

  /** Paired tables. 비면 미동봉. */
  tables?: MessageTableEntry[];

  /** Paired charts. 비면 미동봉. */
  charts?: MessageChartEntry[];

  /** Paired event timelines. 비면 미동봉. */
  eventTimelines?: MessageEventTimelineEntry[];

  /** 추천 후속 질문. 비면 미동봉. */
  recommendQuestion?: string[];

  /**
   * 사용자 메시지에서 백엔드가 추출한 컨텍스트. 비-데모 모드에서 우측
   * 컨텍스트 패널을 자동 갱신한다. 데모 모드는 시나리오의
   * `turn.contextPanel` 흐름이 우선이라 무시.
   *
   * - `rows` — 추출된 설비/챔버/센서 행. 비면 변경 없음.
   * - `rowsMode` — `"replace"` (default, 통째 교체) 또는 `"append"`
   *   (기존 행 끝에 추가). "ETCH-03 도 같이 봐줘" 같이 의도가 추가일 때
   *   `"append"` 로 보낸다.
   * - `timeRange` — 새 발생 시간. 미동봉 시 변경 없음. 항상 replace.
   *
   * 추출 자체는 백엔드 책임 (LLM / NLU / rule). 미동봉이거나 빈 객체면
   * 클라이언트는 패널을 건드리지 않는다.
   */
  extractedContext?: {
    rows?: ContextRow[];
    rowsMode?: "replace" | "append";
    timeRange?: { start?: string; end?: string };
  };
};
```

각 entry 의 `side?: "left" | "right"` 힌트로 좌·우 컬럼 배치를 명시할 수 있다 (미지정 시 FE 가 균형 분배).

#### `event: error` (실패 시 1회 + 스트림 종료)

스트림 도중 백엔드 처리 실패. 사용자 친화 메시지만 보낸다.

```text
event: error
data: {"message":"stream error"}
```

```typescript
type ErrorPayload = { message: string };
```

> ⚠️ **보안**: production 환경에서 `message` 에 stack / 내부 경로 / DB 메시지 등 sensitive 정보를 절대 포함하지 말 것. 상세는 server log 에만. 프론트엔드는 이 이벤트를 `stream` 분류로 받아 사용자에게는 generic 카피("응답 도중에 연결이 끊겼어요") 만 노출한다.

### 예시 흐름

```text
POST /api/fdc/v1/chat
{ "messages": [{ "id":"u1","role":"user","content":"...","createdAt":1 }] }

200 OK
Content-Type: text/event-stream; charset=utf-8
X-Request-Id: 8f3...

event: token
data: {"content":"분"}

event: token
data: {"content":"석"}

...

event: done
data: {"messageId":"msg_xyz","finishReason":"stop","tables":[{"title":"...","columns":[...],"rows":[...]}]}
```

---

## 2. POST /api/fdc/v1/summary

운영자 인계용 대화 요약 (UC-15). 현재 mock 단계에서는 frontend 가 클라이언트에서 만든 텍스트만 클립보드 복사. 백엔드 도입 시 LLM 또는 정형 요약 응답.

### Request

```typescript
type SummaryRequestBody = {
  messages: Message[];           // 대화 history
  context?: ContextRow[];        // 설비 정보
  timeRange?: { start?: string; end?: string };
};
```

### Response

```typescript
type SummaryResponse = {
  summary: string;     // 운영자에게 인계할 마크다운 텍스트
  generatedAt: string; // ISO datetime
};
```

---

## 3. POST /api/fdc/v1/upload

채팅 입력의 이미지 첨부 업로드. 현재 frontend 는 base64 inline 으로 메시지에 동봉하지만, 큰 이미지는 별도 endpoint 로 업로드 후 url 만 message 에 포함하는 게 권장.

### Request

`multipart/form-data` 또는 base64 JSON. 권장: `multipart/form-data`.

| Field | 타입 | 한도 |
|---|---|---|
| `file` | binary | 단일 5MB |
| `mime` | string | `image/png` · `image/jpeg` · `image/webp` · `image/gif` 만 |

### 백엔드 추가 검증 (필수)

- 클라이언트 MIME 은 위조 가능 → **magic bytes 검증**
- 파일명 path traversal / control character sanitize
- AV 스캔 / sandbox (운영 정책)

### Response

```typescript
type UploadResponse = {
  id: string;
  url: string;          // CDN/스토리지 URL
  mime: string;
  sizeBytes: number;
  expiresAt?: string;   // 미정시 영구
};
```

위 `url` 을 메시지 `attachments[].url` 에 채워 `/api/fdc/v1/chat` 으로 보냄.

---

## 4. GET /api/fdc/v1/equipment/:id

설비 상세 정보. 컨텍스트 패널에 입력된 설비명으로 호출.

### Response

```typescript
type EquipmentDetail = {
  id: string;
  name: string;
  model: string;     // 동종설비 매칭 키
  values: string[];  // 칼럼 값 (도메인 명세 별도)
  chambers: { id: string; values: string[] }[];
  sensors: { id: string; values: string[] }[];
};
```

칼럼 명세 (현재 col1~col10 mock) 는 도메인 정의 후 갱신 필요.

---

## 5. GET /api/fdc/v1/equipment/:id/peers

같은 model 의 다른 설비 목록 (자기 자신 제외).

### Response

```typescript
type PeersResponse = EquipmentDetail[];
```

---

## 6. GET /api/fdc/v1/equipment/:id/setup-events

설비별 셋업/설비 변경 이벤트 시점 — 비교의 post-setup 매칭 모드용.

### Response

```typescript
type SetupEventsResponse = Array<{
  /** ISO datetime. */
  time: string;
  type: "setup" | "info_change" | "maintenance" | "other";
  label?: string;
}>;
```

가장 최근 이벤트가 매칭 anchor (t=0).

---

## 7. GET /api/fdc/v1/equipment/:id/compare

1:1 비교 (v2). 현재 설비 vs 단일 동종설비.

### Query

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `peerId` | ✓ | baseline 동종설비 id |
| `recipe` | ✓ | 매칭할 레시피 (`RECIPE_X` 등) |
| `mode` | | `post-setup` (기본) / `calendar` |
| `window` | post-setup 일 때 | `1d` / `7d` / `30d` 등 |
| `from` / `to` | calendar 일 때 | datetime-local |

### Response

```typescript
type CompareResponse = {
  recipe: string;
  windowDays?: number;
  current: CompareSide;
  baseline: CompareSide;
  /** 센서별 시계열 — 매칭 run 양쪽에 있을 때만. */
  series: SensorSeries[];
  chamberEvents: { current: ChamberEvent[]; baseline: ChamberEvent[] };
  alarms: { current: AlarmEvent[]; baseline: AlarmEvent[] };
};

type CompareSide = {
  equipmentId: string;
  setupTime: string;                // ISO
  matchedRun: { id: string; startTime: string; durationMin: number } | null;
  sensorStats: Array<{
    sensor: string;
    mean: number; stddev: number;
    max: number; min: number;
    anomalies: number;
  }>;
};

type SensorSeries = {
  sensor: string;
  /** 각 point 에 양쪽 설비 값 병합. key = equipmentId. */
  data: Array<{ t: number; [equipmentId: string]: number }>;
};

type ChamberEvent = {
  start: number;             // 경과 분
  end?: number;              // range 일 때
  type: "setup" | "recipe_change" | "cleaning" | "maintenance" | "other";
  label: string;
};

type AlarmEvent = {
  time: number;
  end?: number;
  code: string;
  label: string;
  severity: "info" | "warning" | "critical";
  rootCause?: {
    sensor?: string;
    chamber?: string;
    condition?: string;
    value?: number;
  };
};
```

매칭 run 한쪽이라도 없으면 `series` / `chamberEvents` / `alarms` 는 빈 배열/객체.

---

## 데이터 모델

`src/lib/types.ts` 의 type 정의를 그대로 옮긴 것. 백엔드 emit 시 동일 키.

### Message

```typescript
type MessageRole = "user" | "assistant" | "error";

type Message = {
  id: string;
  role: MessageRole;
  content: string;             // 마크다운
  createdAt: number;           // epoch ms

  /** Paired data tables — 어시스턴트 메시지에만. */
  tables?: MessageTableEntry[];

  /** Paired charts — 어시스턴트 메시지에만. */
  charts?: MessageChartEntry[];

  /** Paired event timelines — 어시스턴트 메시지에만. */
  eventTimelines?: MessageEventTimelineEntry[];

  /** 추천 후속 질문. */
  recommendQuestion?: string[];

  /** 첨부 — user 메시지. */
  attachments?: MessageAttachment[];

  /** 에러 상세 — error role 만. */
  errorDetail?: {
    kind: "network" | "timeout" | "http-4xx" | "http-5xx" | "stream" | "unknown";
    status?: number;
    raw?: string;
  };
};
```

### MessageTableEntry

```typescript
type MessageTable = {
  rows: Record<string, unknown>[];
  columns?: string[];   // 비면 첫 row 의 키 사용
  title?: string;
};

type MessageTableEntry = MessageTable & { side?: "left" | "right" };
```

### MessageChartEntry

```typescript
type MessageChart = {
  type: "line" | "bar" | "area";
  data: Record<string, unknown>[];
  options?: {
    title?: string;
    xKey?: string;
    yKeys?: string[];
    xLabel?: string;
    yLabel?: string;
    referenceLines?: Array<{
      axis: "x" | "y";
      value: number | string;
      label?: string;
      color?: string;       // hex
      dashed?: boolean;
    }>;
    referenceAreas?: Array<{
      axis: "x" | "y";
      from: number | string;
      to: number | string;
      label?: string;
      fill?: string;        // rgba/hex
    }>;
  };
};

type MessageChartEntry = MessageChart & { side?: "left" | "right" };
```

### MessageEventTimelineEntry

```typescript
type EventTimelineLevel = "process" | "step";

type EventTimelineItem = {
  track: string;                          // 같은 track 의 events 는 한 row 에 그려짐
  level: EventTimelineLevel;              // process tracks 가 위, step tracks 가 아래
  start: string | number;                 // ISO 또는 비교 가능한 string/number
  end: string | number;
  label: string;
  color?: string;                         // hex override
};

type MessageEventTimeline = {
  title?: string;
  range?: { start: string | number; end: string | number };
  events: EventTimelineItem[];
};

type MessageEventTimelineEntry = MessageEventTimeline & {
  side?: "left" | "right";
};
```

### MessageAttachment

```typescript
type MessageAttachment = {
  id: string;
  type: "image";
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  name: string;
  sizeBytes: number;

  /** base64 inline (작은 이미지). */
  dataUrl?: string;

  /** /api/fdc/v1/upload 응답 url (큰 이미지). */
  url?: string;
};
```

### ContextRow (설비 정보 입력)

```typescript
type ContextSensor = { id: string; name: string };
type ContextChamber = { id: string; name: string; sensors: ContextSensor[] };
type ContextRow = {
  id: string;
  equipment: string;
  chambers: ContextChamber[];
};
```

---

## 에러 형식

모든 4xx/5xx 응답은 `application/json` + 다음 형태:

```typescript
type ErrorResponse = {
  error: string;       // 코드 (machine-readable)
  message?: string;    // 사용자 노출 가능한 짧은 설명 (선택)
  limit?: number;      // size/length 제한 위반 시
  actual?: number;
};
```

대표 코드:

| 코드 | HTTP | 의미 |
|---|---|---|
| `invalid_json` | 400 | request body 파싱 실패 |
| `messages_required` | 400 | `messages` 누락 |
| `messages_too_many` | 400 | 메시지 배열 ≤ 100 위반 |
| `message_content_too_long` | 400 | 메시지 content ≤ 10,000 chars 위반 |
| `context_too_large` | 400 | context 행 ≤ 50 위반 |
| `unauthorized` | 401 | 인증 도입 후 |
| `forbidden` | 403 | |
| `not_found` | 404 | 설비/run id 등 |
| `rate_limited` | 429 | per-user rate limit 도입 후 |
| `internal` | 500 | 일반 서버 오류 |

응답 헤더에 항상 `X-Request-Id` 첨부.

### SSE 도중 에러 (`event: error`)

스트림 시작 후 발생한 에러는 HTTP status 가 이미 200 이라 변경 불가. SSE `error` 이벤트 + 클라이언트가 stream 분류로 처리. 상세는 server log 에만.

---

## 보안 / 운영 정책

### 입력 검증

위 §1 의 한도 표 참조. 백엔드는 클라이언트 검증을 신뢰하지 말고 동일 한도를 서버 측에서 다시 적용.

### 응답 sanitize

- production 의 SSE `error.message` 와 5xx body 의 `message` 에 stack / 내부 경로 / DB 메시지 노출 금지.
- 상세는 server log 의 동일 `requestId` 항목으로 추적.

### 응답 측 한도 (백엔드 → 클라이언트, 별도 작업)

현재 contract 는 size 상한을 명시하지 않지만, 백엔드 도입 시 다음 cap 권장:

- `tables[].rows.length` ≤ 1,000
- `charts[].data.length` ≤ 5,000 points
- `eventTimelines[].events.length` ≤ 500
- 어시스턴트 응답 누적 chars ≤ 100,000

위반 시 `truncated: true` 같은 메타로 안내하거나 `length` 코드로 종료.

### 헤더 / CORS

- 인증 도입 시 `Authorization` 만 사용 — `Cookie` 비권장 (CSRF / localStorage 정책 후속).
- CORS: 동일 호스트 (Next 프록시) 가 기본. 별도 도메인 운영 시 `Access-Control-Allow-Origin` 명시 + preflight.

### 로깅

- 모든 응답에 `X-Request-Id` 헤더.
- 동일 ID 로 server-side 구조화 로그(JSON) 와 매칭 가능해야 함.
- 자동 redact: 헤더 `authorization` / `cookie` / `x-api-key`, 페이로드 `password` / `token` / `secret` / `apiKey` , 메시지 본문 (length 등 메타만 별도 필드).

### 인증 / 권한 (도입 예정)

- `FDC.read` — 센서 추세 조회 / 분석 / 비교
- `FDC.config` — 트리거 / 수집 설정 변경
- `FDC.report` — 월간 안정성 리포트 발행

---

## 변경 이력 (스펙)

이 문서는 contract 변경 시 함께 업데이트한다. 호환성 깨지는 변경은 새 prefix (`/api/fdc/v2`) 로 분리 검토.
