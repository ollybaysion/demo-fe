/**
 * 라이브 파생 — **요청 + 스냅샷**에서 우측 설비 카드와 좌측 데이터 그룹을 만든다.
 *
 * `equipment-cards.mock` 의 주석이 예고한 "파생 배선"이 바로 여기다. 요청이 나가는
 * 순간 그 요청이 pending 줄로 서고(우측)·pending 요청 카드로 서며(좌측), 사용자가
 * 결과를 붙여넣으면 같은 그룹의 filled 데이터로 바뀐다. 그룹의 정체는 언제나
 * **설비 · 구간 · category** 한 묶음이라, 우측 "분석 카드" 줄과 좌측 데이터 그룹이
 * 같은 키로 1:1 이 된다.
 *
 * 데모 단계라 메타(설비·category)는 요청/스냅샷 **라벨에서 파싱**한다("CVD-01 ·
 * 수집값" 꼴). 나중에 백엔드가 구조화 필드로 실어주면 `parseLabel` 만 교체하면 된다.
 */

import { formatRange } from "@/lib/format-range";
import type { PendingRequest } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import type {
  EquipmentCardModel,
  EquipmentLine,
  SnapshotGroupModel,
} from "./equipment-cards.mock";

/** 설비별 통합 그룹 — 채워진 데이터 카드와 아직 대기인 요청 카드가 함께 산다. */
export type DerivedGroup = SnapshotGroupModel & {
  equipment: string;
  /** 이 그룹으로 아직 채워지지 않은 요청들 — 그룹 안에 점선 카드로 뜬다. */
  requests: PendingRequest[];
};

export type DerivedPanel = {
  /** 우측 설비 패널 — 설비별로 묶고 그 아래 "분석 카드" 줄을 단다. */
  equipmentCards: EquipmentCardModel[];
  /** 좌측 데이터 패널(설비별 통합) — 등장 순서대로 쌓인다. */
  groups: DerivedGroup[];
};

/**
 * 라벨에서 설비·category 를 뽑는다 — 데모 라벨은 "CVD-01 · 수집값" 꼴.
 * ` · ` 가 없으면 통째로 설비로 보고 category 는 비운다(미분류로 흘러간다).
 */
export function parseLabel(label: string): {
  equipment: string;
  category: string;
} {
  const sep = " · ";
  const idx = label.indexOf(sep);
  if (idx > 0) {
    return {
      equipment: label.slice(0, idx).trim(),
      category: label.slice(idx + sep.length).trim(),
    };
  }
  return { equipment: "", category: "" };
}

const UNCLASSIFIED = "미분류";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** 설비명 → 그 설비 카드의 id. 파생과 우측 강조가 같은 규칙을 써야 맞물린다. */
export function equipmentCardId(equipment: string): string {
  return `eq-${slug(equipment || UNCLASSIFIED) || "unclassified"}`;
}

type Bucket = {
  key: string;
  equipment: string;
  category: string;
  start?: string;
  end?: string;
  snapshots: DataSnapshot[];
  requests: PendingRequest[];
};

function rangeKeyOf(tr?: { start: string; end: string }): string {
  return tr ? `${tr.start}|${tr.end}` : "";
}

/** 설비 · 구간 · category 한 묶음의 키. */
function groupKeyOf(equipment: string, rangeKey: string, category: string): string {
  return `${equipment}|${rangeKey}|${category}`;
}

/**
 * 요청 + 스냅샷을 설비·구간·category 버킷으로 모아 우측 카드와 좌측 그룹을 만든다.
 *
 * 등장 순서(요청 먼저, 그다음 스냅샷)를 유지해 화면이 요청 순서대로 쌓이게 한다.
 * 설비를 못 읽는 스냅샷(직접 등록·Ctrl+V)은 **미분류** 한 그룹으로 모은다.
 *
 * `seedEquipments` 는 사용자가 "설비 추가"로 직접 등록한 설비다 — 파생할 요청도
 * 스냅샷도 아직 없을 수 있으니 **빈 카드**로 세워 준다(등록했는데 아무것도 안
 * 보이면 등록이 안 된 것처럼 읽힌다). 등록 순서대로 앞에 서고, 그 설비에 요청이
 * 붙으면 같은 카드에 줄이 쌓인다.
 */
export function derivePanel(
  requests: PendingRequest[],
  snapshots: DataSnapshot[],
  seedEquipments: string[] = [],
): DerivedPanel {
  const order: string[] = [];
  const byKey = new Map<string, Bucket>();

  const bucket = (
    equipment: string,
    category: string,
    tr?: { start: string; end: string },
  ): Bucket => {
    const eq = equipment || UNCLASSIFIED;
    const rangeKey = rangeKeyOf(tr);
    const key = groupKeyOf(eq, rangeKey, category);
    let b = byKey.get(key);
    if (!b) {
      b = {
        key,
        equipment: eq,
        category,
        start: tr?.start,
        end: tr?.end,
        snapshots: [],
        requests: [],
      };
      byKey.set(key, b);
      order.push(key);
    }
    return b;
  };

  for (const pr of requests) {
    const { equipment, category } = parseLabel(pr.request.label);
    bucket(equipment, category, pr.request.timeRange).requests.push(pr);
  }
  for (const s of snapshots) {
    const { equipment, category } = parseLabel(s.label);
    bucket(equipment, category, s.timeRange).snapshots.push(s);
  }

  const groups: DerivedGroup[] = order.map((k) => {
    const b = byKey.get(k)!;
    return {
      key: b.key,
      label: labelOf(b),
      equipment: b.equipment,
      snapshots: b.snapshots,
      requests: b.requests,
    };
  });

  // 우측 설비 카드 — 설비별로 접고, 버킷마다 "분석 카드" 줄 하나를 단다.
  const eqOrder: string[] = [];
  const cardByEq = new Map<string, EquipmentCardModel>();
  // 직접 등록한 설비를 먼저 세운다 — 줄은 아래 버킷 순회가 채운다.
  for (const eq of seedEquipments) {
    if (!eq || eq === UNCLASSIFIED || cardByEq.has(eq)) continue;
    cardByEq.set(eq, emptyCard(eq, eqOrder.length + 1));
    eqOrder.push(eq);
  }
  for (const k of order) {
    const b = byKey.get(k)!;
    // 미분류는 설비가 아니다 — 우측 설비 카드로는 세우지 않는다(좌측 그룹엔 남는다).
    if (b.equipment === UNCLASSIFIED) continue;
    let card = cardByEq.get(b.equipment);
    if (!card) {
      card = emptyCard(b.equipment, eqOrder.length + 1);
      cardByEq.set(b.equipment, card);
      eqOrder.push(b.equipment);
    }
    const line: EquipmentLine = {
      key: b.key,
      start: b.start ?? "",
      end: b.end ?? "",
      category: b.category || UNCLASSIFIED,
      status: b.snapshots.length > 0 ? "filled" : "pending",
      tableCount: b.snapshots.length,
      ...(b.requests[0] ? { requestKey: b.requests[0].request.queryKey } : {}),
    };
    card.lines.push(line);
  }
  const equipmentCards = eqOrder.map((eq) => cardByEq.get(eq)!);

  return { equipmentCards, groups };
}

/** 줄이 아직 없는 설비 카드 — 조회 전이라 설명값·상태는 비어 있다. */
function emptyCard(equipment: string, line: number): EquipmentCardModel {
  return {
    id: equipmentCardId(equipment),
    equipment,
    line,
    descriptors: [],
    status: null,
    lines: [],
  };
}

function labelOf(b: Bucket): string {
  const cat = b.category || UNCLASSIFIED;
  if (b.start && b.end) {
    return `${b.equipment} · ${formatRange(b.start, b.end)} · ${cat}`;
  }
  return `${b.equipment} · ${cat}`;
}
