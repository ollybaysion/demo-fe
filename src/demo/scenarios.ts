/**
 * 데모 시나리오 — 발표/녹화에서 동일 흐름을 안정적으로 재생하기 위한
 * 정의된 대화 스크립트.
 *
 * 클릭 → starter 가 첫 user 메시지로 보내지고, 컨텍스트 패널이
 * contextPanel 행으로 자동 채워지며, assistant가 turns[0].assistant
 * 를 스트리밍 응답으로 돌려준다. 이후 turn마다 다음 user 메시지가
 * ghost text로 입력창에 노출, Enter 만으로 전송.
 */

import type { ContextRow } from "@/lib/types";

export type ScenarioTurn = {
  user: string;
  assistant: string;
  /**
   * 이 턴의 user 메시지가 전송될 때 컨텍스트 패널을 이 행들로 교체.
   * 시나리오 도중 사용자가 설비를 명시하면 패널이 채워지는 흐름을
   * 시연할 때 사용.
   */
  contextPanel?: ContextRow[];
  /** 이 턴 user 메시지 전송 시 발생 시간을 함께 갱신. */
  timeRange?: { start: string; end: string };
};

export type Scenario = {
  id: string;
  /** 시작 박스 라벨이자 첫 사용자 메시지로 그대로 전송됨. */
  starter: string;
  /** 시나리오 시작(starter 클릭) 시 컨텍스트 패널에 자동 채워지는 설비 행들. */
  contextPanel: ContextRow[];
  /** 시나리오 시작 시 적용할 발생 시간 (선택). 비우면 패널 기본값(오늘) 유지. */
  timeRange?: { start: string; end: string };
  /**
   * turns[0]: starter 에 대한 첫 assistant 응답
   * turns[1..]: ghost text(user) + assistant
   * 각 턴마다 추가로 contextPanel / timeRange 를 가질 수 있음.
   */
  turns: ScenarioTurn[];
};

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "data-shape",
    starter: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
    // 시나리오 시작 시점엔 비어 있음 — 사용자 두 번째 메시지에서 채워짐.
    contextPanel: [],
    turns: [
      {
        user: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
        assistant:
          "설비 정보와 발생 시간을 입력해주세요. 메시지로 입력하거나 오른쪽 패널을 활용해주세요. 이미지도 가능합니다.",
      },
      {
        user: "ETCH-02 설비 A 챔버 APC_PRESSURE 센서 09:00부터 09:10까지 입니다.",
        assistant:
          "먼저 센서를 분석해보도록 하겠습니다. 이 센서는 APC_PRESSURE 센서 데이터의 MAIN_ETCH STEP 공정 진행 중의 최댓값입니다. 09:00 부터 09:10 까지 MAIN_ETCH STEP 정상 진행되었으며 이 기간 APC_PRESSURE 센서 데이터의 최댓값은 3입니다. STEP 종료 시점 기준으로 데이터가 발생하기 때문에 09:10에 센서값 3으로 데이터 발생하였습니다.",
        contextPanel: [
          {
            id: "demo-shape-eq-1",
            equipment: "ETCH-02",
            chambers: [
              {
                id: "demo-shape-ch-1",
                name: "A",
                sensors: [
                  { id: "demo-shape-sn-1", name: "APC_PRESSURE" },
                ],
              },
            ],
          },
        ],
        timeRange: {
          start: "2026-05-02T09:00",
          end: "2026-05-02T09:10",
        },
      },
    ],
  },
  {
    id: "no-data",
    starter: "설비 데이터가 발생하지 않았는데 그 이유가 궁금합니다.",
    contextPanel: [
      {
        id: "demo-no-data-eq-1",
        equipment: "ETCH-01",
        chambers: [
          {
            id: "demo-no-data-ch-1",
            name: "A",
            sensors: [
              { id: "demo-no-data-sn-1", name: "APC_PRESSURE" },
              { id: "demo-no-data-sn-2", name: "RF_FORWARD" },
            ],
          },
        ],
      },
    ],
    turns: [
      {
        user: "설비 데이터가 발생하지 않았는데 그 이유가 궁금합니다.",
        assistant:
          "ETCH-01 챔버 A의 APC_PRESSURE / RF_FORWARD 두 센서를 발생 시간 범위로 조회했습니다. 해당 구간에 데이터가 비어 있는 흔한 원인은 (1) 센서 통신 단절, (2) 데이터 수집기 큐 적체, (3) 설비 STOP 상태 세 가지입니다. 어디부터 살펴볼까요?",
      },
      {
        user: "통신 단절 이력부터 확인해주세요.",
        assistant:
          "장비 통신 로그를 조회한 결과, 발생 시간 구간에 LinkDown 이벤트가 3회 기록되어 있습니다. 첫 단절은 14:02, 마지막 복구는 14:27이며 총 12분간 데이터 수집이 중단됐습니다. 동일 시간대의 네트워크 스위치 로그를 함께 보시겠습니까?",
      },
      {
        user: "네, 스위치 로그도 보여주세요.",
        assistant:
          "스위치 측 로그에서도 14:02:11에 포트 12 STP 토폴로지 변경이 기록됐고, 인접 포트도 0.8초 동안 동시 깜박임이 있었습니다. 즉, 설비 자체 문제보다는 네트워크 측 이벤트로 보입니다. 다음 정기 점검에 STP 우선순위 검토를 권장드립니다.",
      },
    ],
  },
  {
    id: "stopped",
    starter: "설비가 멈췄는데 그 이유가 궁금합니다.",
    contextPanel: [
      {
        id: "demo-stopped-eq-1",
        equipment: "CVD-03",
        chambers: [
          {
            id: "demo-stopped-ch-1",
            name: "B",
            sensors: [
              { id: "demo-stopped-sn-1", name: "TEMP_TC1" },
              { id: "demo-stopped-sn-2", name: "GAS_FLOW_SiH4" },
            ],
          },
        ],
      },
    ],
    turns: [
      {
        user: "설비가 멈췄는데 그 이유가 궁금합니다.",
        assistant:
          "CVD-03 챔버 B의 마지막 알람 이력을 확인했습니다. 발생 시간 ±10분 내에 EMO(Emergency Off) 한 번과 GasLeak 알람 두 번이 기록됐습니다. EMO 직전의 GasLeak 가 멈춤 직접 원인일 가능성이 높습니다.",
      },
      {
        user: "GasLeak 알람의 원인 센서가 무엇인가요?",
        assistant:
          "GAS_FLOW_SiH4 라인의 MFC 출력값이 setpoint 대비 22% 낮게 나와 GasLeak threshold 를 초과했습니다. 동일 시점 TEMP_TC1 은 정상 범위였습니다. MFC 자체 결함 또는 SiH4 라인 누설 가능성이 있어 정비 점검을 권장합니다.",
      },
    ],
  },
  {
    id: "config-help",
    starter: "설정 방법이 궁금합니다.",
    contextPanel: [],
    turns: [
      {
        user: "설정 방법이 궁금합니다.",
        assistant:
          "FDC Agent의 기본 설정은 우측 패널의 '설비 정보'에 분석 대상 설비/챔버/센서를 입력하고, 발생 시간 범위를 지정하는 것으로 충분합니다. 이후 채팅창에 자유롭게 질문을 입력하면 해당 컨텍스트에 맞춰 응답합니다. 더 자세히 알아볼 항목 있으신가요?",
      },
      {
        user: "발생 시간은 어떤 단위로 입력하나요?",
        assistant:
          "발생 시간은 시작/종료 두 값을 datetime-local 형식(YYYY-MM-DDTHH:MM)으로 입력하며, 패널 하단 빠른 칩(10분 / 30분 / 1시간 / ... / 하루)으로 시작 시간으로부터 자동 계산도 가능합니다. 기본값은 '오늘 00:00 ~ 23:59' 입니다.",
      },
    ],
  },
] as const;
