/**
 * 답변 산출물 — 모델이 답과 함께 내놓은 것들(표·차트·이벤트 타임라인·이미지·링크).
 *
 * 이것들은 원래 대화 옆 **페어 패널**에 붙어 있었다. 답 하나를 볼 때는 편하지만,
 * 대화가 길어지면 "아까 그 표" 를 찾으러 위로 거슬러 올라가야 하고, 왼쪽 데이터
 * 패널에 이미 쌓여 있는 것들과 두 곳으로 갈라진다. 그래서 데이터 패널의 한 단으로
 * 모은다.
 *
 * 다만 **스냅샷과는 섞지 않는다.** 스냅샷은 사람이 조회해 올린 *근거*고, 이쪽은
 * 모델이 만든 *결과*다. 한 목록에 섞이면 "이 답의 근거가 뭐였지"를 되짚을 수
 * 없어진다 — 그래서 별도 단이고, 각 항목은 자기가 나온 답(`messageId`)을 안다.
 *
 * 사용자가 직접 올린 이미지·링크도 같은 모양으로 들어온다(`messageId: null`) —
 * 출처만 다르고 화면에서 하는 일은 같다.
 */

import type {
  Message,
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageImage,
  MessageLink,
  MessageTableEntry,
} from "@/lib/types";

export type Artifact = {
  /** 목록 key — 메시지 id + 종류 + 순번으로 만든다. */
  id: string;
  /** 이 산출물을 낸 답. 사용자가 직접 올린 것이면 null. */
  messageId: string | null;
  /** 몇 번째 답인지 — 카드에 "3번째 답변" 으로 적는다. 직접 올린 것은 null. */
  turn: number | null;
  label: string;
} & (
  | { kind: "table"; payload: MessageTableEntry }
  | { kind: "chart"; payload: MessageChartEntry }
  | { kind: "timeline"; payload: MessageEventTimelineEntry }
  | { kind: "image"; payload: MessageImage }
  | { kind: "link"; payload: MessageLink }
);

/** 링크 라벨이 비면 호스트로 대신한다 — 이름 없는 카드를 만들지 않는다. */
export function linkLabel(link: MessageLink): string {
  const named = link.label.trim();
  if (named) return named;
  try {
    return new URL(link.url).host;
  } catch {
    return link.url;
  }
}

/**
 * 대화에서 산출물을 뽑는다 — **새 답이 위로** 온다.
 *
 * 데이터 패널의 다른 단은 등장 순서대로 쌓이지만, 산출물은 방금 나온 것을 보는
 * 일이 압도적으로 많다. 아래로 쌓으면 답이 나올 때마다 스크롤해야 한다.
 */
export function deriveArtifacts(messages: readonly Message[]): Artifact[] {
  const out: Artifact[] = [];

  // 답을 **뒤에서부터** 훑는다. 한 답 안의 순서(표 1 → 표 2)는 그대로 두고 답
  // 단위로만 뒤집기 위해서다 — 통째로 reverse 하면 한 답 안의 순서까지 거꾸로 선다.
  const answers = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.role === "assistant");

  for (let a = answers.length - 1; a >= 0; a -= 1) {
    const m = answers[a].m;
    const turn = a + 1;

    // 옛 단수 필드(`table`/`chart`)는 저장된 대화에서 건너온다 — 복수 필드가
    // 있으면 그쪽이 진실이고, 없을 때만 접어 넣는다.
    const tables: MessageTableEntry[] =
      m.tables ?? (m.table ? [m.table as MessageTableEntry] : []);
    const charts: MessageChartEntry[] =
      m.charts ?? (m.chart ? [m.chart as MessageChartEntry] : []);

    tables.forEach((t, i) => {
      out.push({
        id: `${m.id}:table:${i}`,
        messageId: m.id,
        turn,
        label: t.title?.trim() || `표 ${i + 1}`,
        kind: "table",
        payload: t,
      });
    });
    charts.forEach((c, i) => {
      out.push({
        id: `${m.id}:chart:${i}`,
        messageId: m.id,
        turn,
        label: c.options?.title?.trim() || `차트 ${i + 1}`,
        kind: "chart",
        payload: c,
      });
    });
    (m.eventTimelines ?? []).forEach((t, i) => {
      out.push({
        id: `${m.id}:timeline:${i}`,
        messageId: m.id,
        turn,
        label: t.title?.trim() || `이벤트 ${i + 1}`,
        kind: "timeline",
        payload: t,
      });
    });
    (m.images ?? []).forEach((img, i) => {
      out.push({
        id: `${m.id}:image:${i}`,
        messageId: m.id,
        turn,
        label: img.label.trim() || `이미지 ${i + 1}`,
        kind: "image",
        payload: img,
      });
    });
    (m.links ?? []).forEach((link, i) => {
      out.push({
        id: `${m.id}:link:${i}`,
        messageId: m.id,
        turn,
        label: linkLabel(link),
        kind: "link",
        payload: link,
      });
    });
  }

  return out;
}
