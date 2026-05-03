# FDC Agent Frontend — API Specification

## 1. 개요

프론트엔드와 백엔드(에이전트) 사이의 통신 계약. v1 단계에서는 백엔드가 없으므로 Next.js의 **API Route**(`app/api/fdc/v1/...`)에서 mock 응답을 반환하고, 추후 실제 에이전트 백엔드로 갈아끼운다.

> **API Route란?**
> Next.js에서 별도 백엔드 서버 없이 프로젝트 내부에 HTTP 엔드포인트를 만드는 기능. `app/api/foo/route.ts` 파일이 곧 `POST /api/foo` 엔드포인트가 된다.

**원칙**
- 모든 endpoint는 `/api/fdc/v1/` prefix 사용 (버전 격리)
- 채팅 응답은 SSE로 스트리밍, 그 외는 일반 JSON
- 백엔드 교체 시 프론트엔드 코드는 수정하지 않음 — `route.ts`만 변경

## 2. 엔드포인트 목록

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/fdc/v1/chat` | 메시지 전송 + SSE 스트리밍 |
| POST | `/api/fdc/v1/summary` | 대화 요약 (운영자 핸드오프용) |
| GET | `/api/fdc/v1/equipment/:id` | 설비 상세 정보 |
| GET | `/api/fdc/v1/equipment/:id/peers` | 동종설비 목록 |
| GET | `/api/fdc/v1/equipment/:id/baseline` | 동종설비 기준 정보 |

## 3. 공통 스키마

여러 endpoint에서 공유되는 타입.

### Message

```typescript
type Message = {
  id: string;
  role: 'user' | 'assistant';   // wire에서는 두 값만 사용
  content: string;
  createdAt: number;            // unix ms
};
```

> **`'error'` role은 wire에 없음**
> FE 내부 상태로 에러 버블을 메시지 목록에 끼워넣을 때만 사용 (`MessageRole`에 `'error'` 포함). 백엔드 응답에는 절대 등장하지 않음.

### ChatContext

`/chat`, `/summary` 요청 body에 포함되는 사용자의 도메인 컨텍스트.

```typescript
type ChatContext = {
  rows: ContextRow[];      // 설비/챔버/센서 트리 (사용자 입력)
  timeRange: TimeRange;    // 분석 시간 범위
};

type ContextRow = {
  id: string;
  equipment: string;
  chambers: ContextChamber[];
};

type ContextChamber = {
  id: string;
  name: string;
  sensors: ContextSensor[];
};

type ContextSensor = {
  id: string;
  name: string;
};

type TimeRange = {
  start: string;  // 'YYYY-MM-DDTHH:mm' (datetime-local)
  end: string;
};
```

### TablePayload / ChartPayload

`/chat`의 `done` 이벤트에 동봉되는 부수 페이로드.

```typescript
type TablePayload = {
  columns?: string[];   // 미지정 시 rows 첫 객체의 키에서 추출
  rows: Array<Record<string, string | number | boolean | null>>;
  title?: string;
};

type ChartPayload = {
  type: 'line' | 'bar' | 'area';
  data: Array<Record<string, string | number>>;
  options?: {
    xKey?: string;
    yKeys?: string[];
    title?: string;
    xLabel?: string;
    yLabel?: string;
    referenceLines?: ReferenceLine[];   // 임계값 / 이벤트 마커
  };
};

// 차트 위에 그릴 보조 선
//   - axis: 'y' + value(숫자) → 가로(수평) 선  (예: 임계값)
//   - axis: 'x' + value(숫자/문자열) → 세로(수직) 선  (예: 이벤트 시점)
type ReferenceLine = {
  axis: 'x' | 'y';
  value: number | string;
  label?: string;
  color?: string;     // hex; 미지정 시 default amber
  dashed?: boolean;   // true 면 점선
};

// equipment 응답 표 (3종 공통)
type EquipmentTable = {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
};
```

**ChartPayload 예시 — APC_PRESSURE 시계열 (data-shape 시나리오):**

```json
{
  "type": "line",
  "data": [
    { "timestamp": "09:00:00", "step": "PRE_HEAT",   "APC_PRESSURE (mTorr)": 0.30 },
    { "timestamp": "09:01:00", "step": "PRE_HEAT",   "APC_PRESSURE (mTorr)": 0.55 },
    { "timestamp": "09:02:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 1.20 },
    { "timestamp": "09:03:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 2.25 },
    { "timestamp": "09:04:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 2.72 },
    { "timestamp": "09:05:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 2.92 },
    { "timestamp": "09:06:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 3.00 },
    { "timestamp": "09:07:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 2.78 },
    { "timestamp": "09:08:00", "step": "MAIN_ETCH",  "APC_PRESSURE (mTorr)": 2.30 },
    { "timestamp": "09:09:00", "step": "POST_PURGE", "APC_PRESSURE (mTorr)": 1.20 },
    { "timestamp": "09:10:00", "step": "POST_PURGE", "APC_PRESSURE (mTorr)": 0.60 }
  ],
  "options": {
    "title": "APC_PRESSURE (mTorr) — 09:00~09:10 트렌드",
    "xKey": "timestamp",
    "yKeys": ["APC_PRESSURE (mTorr)"],
    "xLabel": "시각",
    "yLabel": "mTorr",
    "referenceLines": [
      { "axis": "y", "value": 3.0,         "label": "Max 3.0", "dashed": true },
      { "axis": "x", "value": "09:06:00",  "label": "Peak" }
    ]
  }
}
```

> `data` 의 row 객체 안에 `xKey` / `yKeys` 외 추가 키(예: `step`)는 자유롭게 둘 수 있고 차트 렌더에는 사용되지 않음 — 같은 row 가 표(#34)에서도 쓰이는 경우 공통 키 유지에 유리.

## 4. POST /api/fdc/v1/chat

메시지 전송 + 응답 스트리밍.

### 요청

**Headers**
```
Content-Type: application/json
```

**Body**
```typescript
{
  messages: Message[];   // 지금까지의 대화 전체
  context: ChatContext;  // 현재 도메인 컨텍스트 (자동 첨부)
}
```

> **왜 매번 전체 messages를 보내나?**
> 백엔드가 stateless라고 가정. 클라이언트가 대화 히스토리를 들고 있다가 매 요청마다 전부 전달. v1에서는 단순함을 우선. 추후 sessionId 기반으로 바꿀 수 있음 (§12).

**예시**
```json
{
  "messages": [
    {
      "id": "msg_01",
      "role": "user",
      "content": "APC_PRESSURE 추세 어때?",
      "createdAt": 1735000000000
    }
  ],
  "context": {
    "rows": [
      {
        "id": "eq-1",
        "equipment": "ETCH-01",
        "chambers": [
          {
            "id": "ch-1",
            "name": "A",
            "sensors": [{ "id": "sn-1", "name": "APC_PRESSURE" }]
          }
        ]
      }
    ],
    "timeRange": {
      "start": "2026-05-03T00:00",
      "end": "2026-05-03T23:59"
    }
  }
}
```

### 응답

**Status**: `200 OK`
**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Body**: SSE 스트림 (§5 참고)

### 에러 응답

| Status | 의미 | Body |
|---|---|---|
| 400 | 잘못된 요청 (messages 비어있음 등) | `{ "error": "messages is required" }` |
| 500 | 서버/에이전트 오류 | `{ "error": "internal error" }` |
| 504 | 에이전트 응답 시간 초과 | `{ "error": "timeout" }` |

에러는 JSON으로 즉시 반환 (SSE 시작 전). 스트리밍 도중 에러는 §5의 `error` 이벤트로 전달.

## 5. 스트리밍 프로토콜 (SSE)

### SSE 기본 형식

각 이벤트는 다음 형태로 전송:
```
event: <event_name>
data: <JSON 문자열>

```
(빈 줄로 이벤트 구분)

### 이벤트 종류

#### `token` — 토큰 청크
응답 본문이 생성되는 동안 반복 전송. **본문 텍스트 전용** — table/chart 등 다른 페이로드는 섞지 않음.

```
event: token
data: {"content": "안"}

event: token
data: {"content": "녕"}

```

#### `done` — 스트림 정상 종료
마지막에 한 번 전송. 메시지 메타와 부수 페이로드(표·차트·추천 후속질문)를 동봉.

```
event: done
data: {
  "messageId": "msg_02",
  "finishReason": "stop",
  "table"?: TablePayload,
  "chart"?: ChartPayload,
  "recommendQuestion"?: string[]
}

```

`finishReason`: `"stop"` (정상) | `"length"` (최대 토큰 도달) | `"error"`

`recommendQuestion`: 다음 턴의 추천 질문 (FE에서 입력창 위 chip으로 노출, #40).

#### `error` — 스트림 도중 에러

```
event: error
data: {"message": "agent backend disconnected"}

```

### 전체 흐름 예시

```
event: token
data: {"content":"FAB-A 챔버 1의 "}

event: token
data: {"content":"APC_PRESSURE 추세는 안정적입니다."}

event: done
data: {
  "messageId":"msg_02",
  "finishReason":"stop",
  "chart":{
    "type":"line",
    "data":[{"t":"10:00","v":1.2},{"t":"10:05","v":1.4}],
    "options":{"xKey":"t","yKeys":["v"],"yLabel":"Pressure"}
  },
  "recommendQuestion":[
    "동일 챔버의 다른 센서도 확인해줘",
    "최근 1시간 추세는?",
    "동종설비와 비교해줘"
  ]
}

```

## 6. 클라이언트 구현 노트

브라우저의 `fetch` + `ReadableStream`으로 SSE를 직접 파싱 (`EventSource`는 POST 미지원).

```typescript
const res = await fetch('/api/fdc/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, context }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // buffer를 빈 줄(\n\n) 기준으로 분리해서 이벤트 파싱
}
```

상세 구현은 `src/lib/sse.ts` 참고.

## 7. Mock 백엔드 (v1)

`app/api/fdc/v1/chat/route.ts`에서 mock 응답을 만든다:

- 마지막 user 메시지의 `content`를 받음
- "당신은 '...'라고 물으셨네요. 아직 백엔드가 연결되지 않았습니다." 같은 정해진 답변을 한 글자씩 100ms 간격으로 SSE로 흘려보냄
- 데모 시나리오(#19) 활성 시 — 시나리오 스크립트의 답변을 token 단위로 흘려보내고, 시나리오에 정의된 table/chart/recommendQuestion을 `done`에 동봉

`/summary`, `/equipment/*`도 같은 패턴으로 mock 라우트 둠 — 정해진 응답을 즉시 반환.

이 단계에서 프론트엔드의 스트리밍·에러·UX를 모두 검증한 뒤 실제 백엔드로 교체.

## 8. POST /api/fdc/v1/summary

대화 요약. 운영자에게 그대로 전달할 수 있는 요약 텍스트 반환 (#24).

### 요청

**Headers**: `Content-Type: application/json`

**Body**
```typescript
{
  messages: Message[];   // 요약 대상 대화
  context: ChatContext;  // 현재 도메인 컨텍스트
}
```

### 응답

**Status**: `200 OK`
**Headers**: `Content-Type: application/json`

```typescript
{
  summary: string;  // 운영자에게 그대로 붙여넣을 수 있는 plain text
}
```

> 응답 형식(plain text vs markdown)은 §13 참고.

### 에러

| Status | Body |
|---|---|
| 400 | `{ "error": "messages is required" }` |
| 500 | `{ "error": "internal error" }` |

## 9. GET /api/fdc/v1/equipment/:id

설비 상세 정보 (#27 상단 패널).

### 요청

**Path param**: `id` — equipment identifier

(요청 body 없음)

### 응답

**Status**: `200 OK`

```typescript
{
  id: string;
  name: string;             // 설비명
  model: string;            // peers 조회 기준이 되는 모델
  equipment: EquipmentTable;
  chamber:   EquipmentTable;
  sensor:    EquipmentTable;
}
```

### 에러

| Status | Body |
|---|---|
| 404 | `{ "error": "equipment not found" }` |
| 500 | `{ "error": "internal error" }` |

## 10. GET /api/fdc/v1/equipment/:id/peers

동종설비(같은 모델) 목록 (#27 하단 드롭다운).

### 요청

**Path param**: `id` — 기준 설비 id

### 응답

**Status**: `200 OK`

```typescript
{
  peers: Array<{
    id: string;
    name: string;
  }>;
}
```

## 11. GET /api/fdc/v1/equipment/:id/baseline

선택된 동종설비의 기준 정보 (#27 하단 표). 응답 형태는 §9와 동일.

### 요청

**Path param**: `id` — 동종설비 id

### 응답

**Status**: `200 OK`

```typescript
{
  id: string;
  name: string;
  model: string;
  equipment: EquipmentTable;
  chamber:   EquipmentTable;
  sensor:    EquipmentTable;
}
```

## 12. 향후 확장 (v2+)

- **세션 관리**: `POST /api/fdc/v1/sessions`, `GET /api/fdc/v1/sessions/:id`로 대화 저장
- **히스토리**: `GET /api/fdc/v1/history?sessionId=...`
- **인증**: `Authorization: Bearer <token>` 헤더 추가
- **취소**: 클라이언트가 스트리밍 도중 끊을 수 있도록 `AbortController` 활용 (이미 fetch에서 지원)
- **첨부 파일/이미지**: `Message`에 `attachments` 필드 추가
- **도구 호출 (tool use)**: 에이전트가 도구를 사용한 경우 `tool_call`, `tool_result` 이벤트 추가

## 13. 미해결 / 백엔드 협의 필요

- **`summary` 응답 형식** — plain text 가정. markdown 채택 시 FE에서 #31(마크다운 렌더) 같이 적용해야 함
- **`equipment/:id` id 형식** — 단일 string 가정. 복합키 필요 시 path 구조 변경
- **세션 관리** — 현재는 stateless. sessionId 도입 시 모든 endpoint 시그니처 영향
- **`EquipmentTable.columns` 표준 칼럼** — 백엔드 측에서 정의·통보 필요 (설비 기종별 차이 가능)
- **rate limiting / 동시 요청 처리** — 정책 필요
- **응답 토큰 단위** — 글자 / 단어 / LLM 토큰 (백엔드 정책)
- **실제 FDC Agent 백엔드 인터페이스** — HTTP / gRPC / 직접 LLM SDK
