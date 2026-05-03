/**
 * 데모 시나리오 — 발표/녹화에서 동일 흐름을 안정적으로 재생하기 위한
 * 정의된 대화 스크립트.
 *
 * 클릭 → starter 가 첫 user 메시지로 보내지고, 컨텍스트 패널이
 * contextPanel 행으로 자동 채워지며, assistant 가 turns[0].assistant
 * 를 스트리밍 응답으로 돌려준다. 이후 turn 마다 다음 user 메시지가
 * ghost text 로 입력창에 노출, Enter 만으로 전송.
 *
 * 시나리오는 카테고리별 (분석 / 알람 / 비교 / 설정 / 운영) 파일로 분리
 * 되어 있고 본 파일에서 SCENARIOS 배열에 조립.
 */

export type { Scenario, ScenarioTurn } from "./types";

import type { Scenario } from "./types";
import { dataShape } from "./data-shape";
import { uc1 } from "./uc-1";
import { uc2 } from "./uc-2";
import { uc3 } from "./uc-3";
import { uc4 } from "./uc-4";
import { uc5 } from "./uc-5";
import { uc6 } from "./uc-6";
import { uc7 } from "./uc-7";
import { uc8 } from "./uc-8";
import { uc9 } from "./uc-9";
import { uc10 } from "./uc-10";
import { uc11 } from "./uc-11";
import { uc12 } from "./uc-12";
import { uc13 } from "./uc-13";
import { uc14 } from "./uc-14";
import { uc15 } from "./uc-15";

export const SCENARIOS: readonly Scenario[] = [
  dataShape,
  uc1,
  uc2,
  uc3,
  uc4,
  uc5,
  uc6,
  uc7,
  uc8,
  uc9,
  uc10,
  uc11,
  uc12,
  uc13,
  uc14,
  uc15,
] as const;
