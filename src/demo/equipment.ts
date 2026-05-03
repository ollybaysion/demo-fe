/**
 * Mock equipment / chamber / sensor / peer 데이터 (#27 Phase 1).
 *
 * 칼럼은 데모용으로 col1~col10. Phase 2 에서 백엔드 API
 *   GET /api/equipment/:id
 *   GET /api/equipment/:id/peers
 * 와 같은 형태로 교체될 예정 — 그 시점에 칼럼명도 실제 도메인 필드로
 * 교체. UI는 lookup 함수만 호출하고 데이터 출처에 무지하도록 작성.
 */

export const COL_NAMES = [
  "col1",
  "col2",
  "col3",
  "col4",
  "col5",
  "col6",
  "col7",
  "col8",
  "col9",
  "col10",
] as const;

export type ChamberDetail = {
  id: string;
  values: string[]; // length === COL_NAMES.length
};

export type SensorDetail = {
  id: string;
  values: string[];
};

export type EquipmentDetail = {
  id: string;
  /** ContextRow.equipment 와 매칭되는 키. */
  name: string;
  /** peer(동종 설비) 매칭에만 쓰는 내부 키 — UI에 노출되지 않음. */
  model: string;
  values: string[];
  chambers: ChamberDetail[];
  sensors: SensorDetail[];
};

// 더미 행 생성: 접두사 기반으로 col1..col10 채우기. 행마다 값이 달라
// 보이도록 prefix 를 섞어 식별성만 유지.
function mkRow(prefix: string): string[] {
  return Array.from({ length: COL_NAMES.length }, (_, i) => `${prefix}-v${i + 1}`);
}

const ETCH: EquipmentDetail[] = [
  {
    id: "ETCH-01",
    name: "ETCH-01",
    model: "EtcherX-2000",
    values: mkRow("ETCH-01"),
    chambers: [
      { id: "ETCH-01-A", values: mkRow("ETCH-01-A") },
      { id: "ETCH-01-B", values: mkRow("ETCH-01-B") },
    ],
    sensors: [
      { id: "ETCH-01-APC", values: mkRow("ETCH-01-APC") },
      { id: "ETCH-01-RFF", values: mkRow("ETCH-01-RFF") },
    ],
  },
  {
    id: "ETCH-02",
    name: "ETCH-02",
    model: "EtcherX-2000",
    values: mkRow("ETCH-02"),
    chambers: [
      { id: "ETCH-02-A", values: mkRow("ETCH-02-A") },
      { id: "ETCH-02-B", values: mkRow("ETCH-02-B") },
    ],
    sensors: [
      { id: "ETCH-02-APC", values: mkRow("ETCH-02-APC") },
      { id: "ETCH-02-RFF", values: mkRow("ETCH-02-RFF") },
    ],
  },
  {
    id: "ETCH-03",
    name: "ETCH-03",
    model: "EtcherX-2000",
    values: mkRow("ETCH-03"),
    chambers: [
      { id: "ETCH-03-A", values: mkRow("ETCH-03-A") },
      { id: "ETCH-03-B", values: mkRow("ETCH-03-B") },
      { id: "ETCH-03-C", values: mkRow("ETCH-03-C") },
    ],
    sensors: [
      { id: "ETCH-03-TC1", values: mkRow("ETCH-03-TC1") },
      { id: "ETCH-03-APC", values: mkRow("ETCH-03-APC") },
    ],
  },
];

const CVD: EquipmentDetail[] = [
  {
    id: "CVD-01",
    name: "CVD-01",
    model: "VaporPro-1000",
    values: mkRow("CVD-01"),
    chambers: [
      { id: "CVD-01-A", values: mkRow("CVD-01-A") },
      { id: "CVD-01-B", values: mkRow("CVD-01-B") },
    ],
    sensors: [
      { id: "CVD-01-T", values: mkRow("CVD-01-T") },
      { id: "CVD-01-G", values: mkRow("CVD-01-G") },
    ],
  },
  {
    id: "CVD-02",
    name: "CVD-02",
    model: "VaporPro-1000",
    values: mkRow("CVD-02"),
    chambers: [
      { id: "CVD-02-A", values: mkRow("CVD-02-A") },
      { id: "CVD-02-B", values: mkRow("CVD-02-B") },
    ],
    sensors: [
      { id: "CVD-02-T", values: mkRow("CVD-02-T") },
      { id: "CVD-02-G", values: mkRow("CVD-02-G") },
    ],
  },
  {
    id: "CVD-03",
    name: "CVD-03",
    model: "VaporPro-1000",
    values: mkRow("CVD-03"),
    chambers: [
      { id: "CVD-03-A", values: mkRow("CVD-03-A") },
      { id: "CVD-03-B", values: mkRow("CVD-03-B") },
    ],
    sensors: [
      { id: "CVD-03-T", values: mkRow("CVD-03-T") },
      { id: "CVD-03-G", values: mkRow("CVD-03-G") },
    ],
  },
];

export const EQUIPMENT_DETAILS: readonly EquipmentDetail[] = [...ETCH, ...CVD];

export function getEquipmentDetail(name: string): EquipmentDetail | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return EQUIPMENT_DETAILS.find((e) => e.name === trimmed);
}

/** 같은 모델의 다른 설비 (자기 자신 제외). */
export function getPeers(name: string): EquipmentDetail[] {
  const me = getEquipmentDetail(name);
  if (!me) return [];
  return EQUIPMENT_DETAILS.filter(
    (e) => e.model === me.model && e.id !== me.id,
  );
}
