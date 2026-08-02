/**
 * `POST /api/fdc/v1/chat/data` (panel-judge) 클라이언트 — 데이터 패널의 변경을
 * BE 결정론 판정으로 보내고, 선언적 결과(`openRequests` 리컨사일·종결 서술)를
 * 받아 온다. BE 계약 = fdc-agent-be-spring #38 (`PanelBody`/`ChatDataDone`).
 *
 * 판정은 **부가 경로**다: 실패(네트워크·404·비호환)는 전부 무음으로 접는다 —
 * BE 없는 데모에서 패널을 만질 때마다 에러 풍선이 뜨면 안 되고, 판정이 죽어도
 * 채팅 경로(조달 릴레이)는 그대로 산다.
 */

import { parseSseStream } from "./sse";
import type { ChatDataSnapshot, ChatInputs, DataRequest } from "./types";

/** 절차의 명시 선언 — BE 판정 입력. `args` 는 **인자 원문 채널**이다(#38 T1·T3). */
export type RunDecl = { skill: string; args: Record<string, string> };

/** 패널에서 방금 일어난 액션 — 서술 전이 감지에만 쓰인다(판정 입력이 아니다). */
export type PanelJudgeEvent = { type: string; queryKey?: string };

/** run 하나의 판정 보고 — 카드가 안 나온 이유(needsPick/holds)까지 명시된다. */
export type RunProgress = {
  skill: string;
  args: Record<string, string>;
  label: string;
  stepCount: number;
  arrivedCount: number;
  nextStep: number;
  terminal: boolean;
  emptyAtStep?: number;
  needsPick?: { queryId: string; column: string; candidates: string[] }[];
  holds?: { queryId: string; reason: string }[];
};

/** `done` 페이로드 — `openRequests` 는 지금 열려 있어야 할 카드 **전체**다. */
export type ChatDataDone = {
  messageId: string;
  eventId?: string;
  revision?: number;
  poolRev?: string;
  openRequests?: DataRequest[];
  runsProgress?: RunProgress[];
  terminalRuns?: string[];
  needsRows?: string[];
  narratedRun?: string;
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
};

export type JudgeHooks = {
  /** 첫 token 이 도착했을 때 한 번 — 여기서 서술 메시지를 만든다(빈 풍선 금지). */
  onNarrationStart?: () => void;
  onNarrationToken?: (piece: string) => void;
};

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
