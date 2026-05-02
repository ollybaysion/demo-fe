/**
 * Mock equipment / chamber / sensor / peer 데이터 (#27 Phase 1).
 *
 * Phase 2에서 백엔드 API
 *   GET /api/equipment/:id
 *   GET /api/equipment/:id/peers
 * 와 같은 형태로 교체될 예정. UI는 lookup 함수만 호출하고
 * 데이터 출처에 무지하도록 작성.
 */

export type ChamberDetail = {
  id: string;
  name: string;
  model: string;
  capacity: string;
  status: string;
};

export type SensorDetail = {
  id: string;
  name: string;
  type: string;
  range: string;
  unit: string;
};

export type EquipmentDetail = {
  id: string;
  /** ContextRow.equipment 와 매칭되는 키. */
  name: string;
  model: string;
  vendor: string;
  installedAt: string;
  status: string;
  chambers: ChamberDetail[];
  sensors: SensorDetail[];
};

const ETCH: EquipmentDetail[] = [
  {
    id: "ETCH-01",
    name: "ETCH-01",
    model: "EtcherX-2000",
    vendor: "Acme Tools",
    installedAt: "2023-08-15",
    status: "가동 중",
    chambers: [
      { id: "ETCH-01-A", name: "A", model: "ChamberPro-A", capacity: "200mm", status: "가동" },
      { id: "ETCH-01-B", name: "B", model: "ChamberPro-A", capacity: "200mm", status: "가동" },
    ],
    sensors: [
      { id: "ETCH-01-APC", name: "APC_PRESSURE", type: "Pressure", range: "0–500", unit: "mTorr" },
      { id: "ETCH-01-RFF", name: "RF_FORWARD", type: "RF", range: "0–3000", unit: "W" },
    ],
  },
  {
    id: "ETCH-02",
    name: "ETCH-02",
    model: "EtcherX-2000",
    vendor: "Acme Tools",
    installedAt: "2024-01-20",
    status: "가동 중",
    chambers: [
      { id: "ETCH-02-A", name: "A", model: "ChamberPro-A", capacity: "200mm", status: "가동" },
      { id: "ETCH-02-B", name: "B", model: "ChamberPro-A", capacity: "200mm", status: "정비" },
    ],
    sensors: [
      { id: "ETCH-02-APC", name: "APC_PRESSURE", type: "Pressure", range: "0–500", unit: "mTorr" },
      { id: "ETCH-02-RFF", name: "RF_FORWARD", type: "RF", range: "0–3000", unit: "W" },
    ],
  },
  {
    id: "ETCH-03",
    name: "ETCH-03",
    model: "EtcherX-2000",
    vendor: "Acme Tools",
    installedAt: "2024-06-02",
    status: "가동 중",
    chambers: [
      { id: "ETCH-03-A", name: "A", model: "ChamberPro-A", capacity: "200mm", status: "가동" },
      { id: "ETCH-03-B", name: "B", model: "ChamberPro-A", capacity: "200mm", status: "가동" },
      { id: "ETCH-03-C", name: "C", model: "ChamberPro-B", capacity: "300mm", status: "가동" },
    ],
    sensors: [
      { id: "ETCH-03-TC1", name: "TEMP_TC1", type: "Temperature", range: "-50–800", unit: "℃" },
      { id: "ETCH-03-APC", name: "APC_PRESSURE", type: "Pressure", range: "0–500", unit: "mTorr" },
    ],
  },
];

const CVD: EquipmentDetail[] = [
  {
    id: "CVD-01",
    name: "CVD-01",
    model: "VaporPro-1000",
    vendor: "Beta Systems",
    installedAt: "2022-11-04",
    status: "가동 중",
    chambers: [
      { id: "CVD-01-A", name: "A", model: "VPChamber", capacity: "200mm", status: "가동" },
      { id: "CVD-01-B", name: "B", model: "VPChamber", capacity: "200mm", status: "가동" },
    ],
    sensors: [
      { id: "CVD-01-T", name: "TEMP_TC1", type: "Temperature", range: "-50–1200", unit: "℃" },
      { id: "CVD-01-G", name: "GAS_FLOW_SiH4", type: "MFC", range: "0–500", unit: "sccm" },
    ],
  },
  {
    id: "CVD-02",
    name: "CVD-02",
    model: "VaporPro-1000",
    vendor: "Beta Systems",
    installedAt: "2023-04-19",
    status: "가동 중",
    chambers: [
      { id: "CVD-02-A", name: "A", model: "VPChamber", capacity: "200mm", status: "가동" },
      { id: "CVD-02-B", name: "B", model: "VPChamber", capacity: "200mm", status: "정비" },
    ],
    sensors: [
      { id: "CVD-02-T", name: "TEMP_TC1", type: "Temperature", range: "-50–1200", unit: "℃" },
      { id: "CVD-02-G", name: "GAS_FLOW_SiH4", type: "MFC", range: "0–500", unit: "sccm" },
    ],
  },
  {
    id: "CVD-03",
    name: "CVD-03",
    model: "VaporPro-1000",
    vendor: "Beta Systems",
    installedAt: "2024-09-30",
    status: "정지",
    chambers: [
      { id: "CVD-03-A", name: "A", model: "VPChamber", capacity: "200mm", status: "정비" },
      { id: "CVD-03-B", name: "B", model: "VPChamber", capacity: "200mm", status: "정지" },
    ],
    sensors: [
      { id: "CVD-03-T", name: "TEMP_TC1", type: "Temperature", range: "-50–1200", unit: "℃" },
      { id: "CVD-03-G", name: "GAS_FLOW_SiH4", type: "MFC", range: "0–500", unit: "sccm" },
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
