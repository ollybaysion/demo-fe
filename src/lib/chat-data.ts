/**
 * `POST /api/fdc/v1/chat/data` (panel-judge) 클라이언트 — 데이터 패널의 변경을
 * BE 결정론 판정으로 보내고, **조달 원장**(`dataRequests`)과 종결 서술을 받아 온다.
 * BE 계약 = fdc-agent-be-spring #38·#60 (`PanelBody`/`ChatDataDone`).
 *
 * 원장은 이벤트가 아니라 **상태 전량**이다 — 그 절차의 조회가 매번 전부 상태를 달고
 * 오고 화면은 replace 한다. 그래서 멱등성이 규칙이 아니라 구조이고, 카드 배치를
 * 화면이 판단할 일이 없다.
 *
 * 판정 자체의 실패(네트워크·404·비호환)는 무음으로 접는다 — 에러 풍선이 패널 조작
 * 때마다 뜨면 안 된다. 다만 원장이 안 오면 **카드도 안 선다**: v3 부터 카드의
 * 진실원은 서버다.
 */

import { parseSseStream } from "./sse";
import type { ChatDataSnapshot, ChatInputs, DataRequest } from "./types";

/** 절차의 명시 선언 — BE 판정 입력. `args` 는 **인자 원문 채널**이다(#38 T1·T3). */
export type RunDecl = { skill: string; args: Record<string, string> };

/** 패널에서 방금 일어난 액션 — 서술 전이 감지에만 쓰인다(판정 입력이 아니다). */
export type PanelJudgeEvent = { type: string; queryKey?: string };

/**
 * 알아야 할 것 하나의 상태 — 진행의 단위가 spec v3 에서 **조회에서 need 로** 바뀌었다.
 * "3단계 중 1단계 도착"은 조회를 세는 말이라 질문에 답했는지는 세어지지 않는다.
 *
 * `source` 는 지목한 조회가 **아닌** 경로로 채워졌을 때 그 스냅샷 키다(채움 폭포의
 * 2·3차) — 요청한 것과 다르게 받았다는 사실을 화면이 말할 수 있어야 한다.
 */
export type NeedProgress = {
  id: string;
  what: string;
  state: "INACTIVE" | "PENDING_GATE" | "UNFILLED" | "FILLED" | "UNPROCURABLE";
  source?: string;
};

/** run 하나의 판정 보고 — 판정 불가 사유(holds)까지 명시된다. */
export type RunProgress = {
  skill: string;
  args: Record<string, string>;
  label: string;
  /** 활성 need 수 / 그중 찬 것 — 진행률의 분모와 분자. */
  needCount: number;
  metCount: number;
  /** 지금 돌려야 할 조달의 정식 id(`스킬#조달id`). */
  wanted: string[];
  terminal: boolean;
  /** `SUFFICIENT` | `PROCURABLE` | `UNANSWERABLE` | `UNKNOWN_SKILL`. */
  outcome: string;
  needs: NeedProgress[];
  holds?: { queryId: string; reason: string }[];
};

/**
 * 메시지 판정 왕복의 응답(BE #64 MVP) — `pasted` 를 실어 보낸 왕복에만 온다.
 * 값 전부가 LLM 산출물이라 오차 허용(편의성 기능) — 원문이 진실원이다.
 */
export type FormattedMessage = {
  /**
   * 원문을 구조화한 객체 — 문자열이 아니다(pretty-print 는 화면 소유).
   * 없으면 그 조각은 변환에 실패한 것이다(원문은 `raw` 에 남는다).
   */
  json?: unknown;
  /** 이 한 건의 원문 조각 — 자른 건 BE 라 FE 는 보낸 것으로 되짚을 수 없다. */
  raw?: string;
  /** 한 줄 요약. */
  comment?: string;
  eqpId?: string;
  className?: string;
  /** 목록에서 이 한 건을 알아볼 짧은 이름 — 없으면 className·원문 머리로 물러난다. */
  title?: string;
  /** 메시지 안에 찍힌 발생 시각 — 등록 시각이 아니다(소수초 원문 정밀도). */
  occurredAt?: string;
  docId?: string;
};

/** `done` 페이로드 — `dataRequests` 는 그 절차의 조회 **전량**(상태 포함)이다. */
export type ChatDataDone = {
  messageId: string;
  eventId?: string;
  revision?: number;
  poolRev?: string;
  dataRequests?: DataRequest[];
  runsProgress?: RunProgress[];
  terminalRuns?: string[];
  narratedRun?: string;
  /** 메시지 판정 왕복에만 — 없으면 비메시지(불가침), 로컬 표 파싱으로 폴백. */
  /**
   * 메시지 판정 왕복의 결과 전량 — 붙여넣기 하나가 여러 건일 수 있어 배열이고,
   * BE 가 자른 순서 그대로다. 각 항목의 `raw` 가 그 한 건의 원문이다. 변환에 실패한
   * 조각도 `json` 없이 자리를 지킨다 — 무엇이 빠졌는지 보이지 않으면 안 된다.
   */
  formattedMessages?: FormattedMessage[];
  /** 한 건일 때만 함께 오는 호환 필드 — 배열이 정본이다. */
  formattedMessage?: FormattedMessage;
};

// 절차 선언은 작업판 트리에서 나온다 — `workbench-cards.toRunDecls`(분석 카드
// 하나 = run 하나). 세션 목록에서 만들던 이전 판은 트리 도입으로 사라졌다.

export type JudgeBody = {
  eventId: string;
  revision: number;
  event?: PanelJudgeEvent;
  messages?: { role: string; content: string }[];
  snapshots?: ChatDataSnapshot[];
  runs?: RunDecl[];
  scope?: unknown;
  inputs?: ChatInputs;
  /**
   * 붙여넣기 원문(BE #64) — 실리면 이 왕복은 패널 판정이 아니라 **메시지 판정
   * 전용**이고, 응답은 `formattedMessage` 로만 온다(원장 없음 — replace 금지).
   */
  pasted?: string;
  /** 사용자가 "이건 메시지다"라고 명시 — BE 가 스니프를 건너뛴다. */
  pastedForce?: boolean;
};

export type JudgeHooks = {
  /** 첫 token 이 도착했을 때 한 번 — 여기서 서술 메시지를 만든다(빈 풍선 금지). */
  onNarrationStart?: () => void;
  onNarrationToken?: (piece: string) => void;
  /**
   * 메시지 판정의 진척 — 붙여넣기가 100건이면 BE 가 묶음마다 한 줄씩 흘린다.
   * 총량은 첫 줄(`done: 0`)에서 온다.
   */
  onMessageProgress?: (progress: MessageProgress) => void;
};

/** 몇 건 중 몇 건이 끝났나 — 변환된 건수가 아니라 **물어본** 건수다. */
export type MessageProgress = { done: number; total: number };

type TokenPayload = { content: string };

/**
 * 판정 한 번 — SSE 를 끝까지 읽고 `done` 을 돌려준다. 서술이 있으면 token 이
 * 먼저 흐른다. 실패는 전부 `null`(무음).
 */
export async function judgeChatData(
  body: JudgeBody,
  hooks: JudgeHooks,
  signal: AbortSignal,
): Promise<ChatDataDone | null> {
  let res: Response;
  try {
    res = await fetch("/api/fdc/v1/chat/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    return null;
  }
  if (!res.ok || !res.body) return null;

  let done: ChatDataDone | null = null;
  let narrationStarted = false;
  try {
    for await (const ev of parseSseStream<unknown>(res.body)) {
      if (ev.event === "token") {
        if (!narrationStarted) {
          narrationStarted = true;
          hooks.onNarrationStart?.();
        }
        hooks.onNarrationToken?.((ev.data as TokenPayload).content);
      } else if (ev.event === "progress") {
        hooks.onMessageProgress?.(ev.data as MessageProgress);
      } else if (ev.event === "done") {
        done = ev.data as ChatDataDone;
        break;
      } else if (ev.event === "error") {
        break;
      }
    }
  } catch {
    // 스트림 중단(abort·파싱) — 여기까지 온 done 이 있으면 그것대로 유효하다.
  }
  return done;
}
