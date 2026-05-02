# FDC Agent Frontend — API Specification

## 1. 개요

프론트엔드와 백엔드(에이전트) 사이의 통신 계약. v1 단계에서는 백엔드가 없으므로 Next.js의 **API Route**(`app/api/chat/route.ts`)에서 mock 응답을 반환하고, 추후 실제 에이전트 백엔드로 갈아끼운다.

> **API Route란?**
> Next.js에서 별도 백엔드 서버 없이 프로젝트 내부에 HTTP 엔드포인트를 만드는 기능. `app/api/foo/route.ts` 파일이 곧 `POST /api/foo` 엔드포인트가 된다.

**원칙**
- 프론트엔드는 항상 `/api/chat`만 호출 (실제 에이전트 위치는 몰라도 됨)
- 응답은 SSE(Server-Sent Events)로 스트리밍
- 백엔드 교체 시 프론트엔드 코드는 수정하지 않음 — `route.ts`만 변경

## 2. 엔드포인트 목록

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/chat` | 메시지 전송 + 응답 스트리밍 |

v1 범위는 위 한 개. 추후 `/api/sessions`, `/api/history` 등 확장 예정.

## 3. POST /api/chat

### 요청

**Headers**
```
Content-Type: application/json
```

**Body**
```typescript
{
  messages: Message[];   // 지금까지의 대화 전체
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;     // unix ms
};
```

**예시**
```json
{
  "messages": [
    {
      "id": "msg_01",
      "role": "user",
      "content": "FDC가 뭐야?",
      "createdAt": 1735000000000
    }
  ]
}
```

> **왜 매번 전체 messages를 보내나?**
> 백엔드가 stateless라고 가정. 클라이언트가 대화 히스토리를 들고 있다가 매 요청마다 전부 전달. v1에서는 단순함을 우선. 추후 sessionId 기반으로 바꿀 수 있음.

### 응답

**Status**: `200 OK`
**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Body**: SSE 스트림 (아래 4. 참고)

### 에러 응답

| Status | 의미 | Body |
|---|---|---|
| 400 | 잘못된 요청 (messages 비어있음 등) | `{ "error": "messages is required" }` |
| 500 | 서버/에이전트 오류 | `{ "error": "internal error" }` |
| 504 | 에이전트 응답 시간 초과 | `{ "error": "timeout" }` |

에러는 JSON으로 즉시 반환 (SSE 시작 전). 스트리밍 도중 에러는 4. 의 `error` 이벤트로 전달.

## 4. 스트리밍 프로토콜 (SSE)

### SSE 기본 형식

각 이벤트는 다음 형태로 전송:
```
event: <event_name>
data: <JSON 문자열>

```
(빈 줄로 이벤트 구분)

### 이벤트 종류

#### `token` — 토큰 청크
응답이 생성되는 동안 반복 전송.

```
event: token
data: {"content": "안"}

event: token
data: {"content": "녕"}

event: token
data: {"content": "하세요"}

```

#### `done` — 스트림 정상 종료
마지막에 한 번 전송. 클라이언트는 이걸 받으면 스트림 종료 처리.

```
event: done
data: {"messageId": "msg_02", "finishReason": "stop"}

```

`finishReason`: `"stop"` (정상) | `"length"` (최대 토큰 도달) | `"error"`

#### `error` — 스트림 도중 에러
스트리밍 중 문제가 생긴 경우.

```
event: error
data: {"message": "agent backend disconnected"}

```

### 전체 흐름 예시

```
event: token
data: {"content": "FDC"}

event: token
data: {"content": "는 "}

event: token
data: {"content": "Fault Detection..."}

event: done
data: {"messageId": "msg_02", "finishReason": "stop"}

```

## 5. 클라이언트 구현 노트

브라우저의 `fetch` + `ReadableStream`으로 SSE를 직접 파싱한다 (`EventSource`는 POST를 지원하지 않으므로 사용 불가).

```typescript
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // buffer를 빈 줄(\n\n) 기준으로 분리해서 이벤트 파싱
  // event: ..., data: ... 를 추출해 상태 업데이트
}
```

상세 구현은 코드 작성 단계에서.

## 6. Mock 백엔드 (v1)

`app/api/chat/route.ts`에서 다음과 같이 mock 응답을 만든다:

- 마지막 user 메시지의 `content`를 받음
- "당신은 '...'라고 물으셨네요. 아직 백엔드가 연결되지 않았습니다." 같은 정해진 답변을 한 글자씩 100ms 간격으로 SSE로 흘려보냄
- 실제 LLM 호출처럼 보이도록 시뮬레이션

이 단계에서 프론트엔드의 스트리밍 처리, 에러 처리, UX를 모두 검증한 뒤 실제 백엔드로 교체한다.

## 7. 향후 확장 (v2+)

- **세션 관리**: `POST /api/sessions`, `GET /api/sessions/:id`로 대화 저장
- **히스토리**: `GET /api/history?sessionId=...`
- **인증**: `Authorization: Bearer <token>` 헤더 추가
- **취소**: 클라이언트가 스트리밍 도중 끊을 수 있도록 `AbortController` 활용 (이미 fetch에서 지원)
- **첨부 파일/이미지**: `Message`에 `attachments` 필드 추가
- **도구 호출 (tool use)**: 에이전트가 도구를 사용한 경우 `tool_call`, `tool_result` 이벤트 추가

## 8. 미해결 / 추후 결정

- 실제 FDC Agent 백엔드 인터페이스 (HTTP? gRPC? 직접 LLM SDK?)
- Rate limiting / 동시 요청 처리
- 응답 토큰 단위 (글자 / 단어 / LLM 토큰) — 백엔드 정책에 따름
