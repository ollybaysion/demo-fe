/**
 * 데이터 스냅샷 파싱 — `data-provisioning` 엔진 어댑터.
 *
 * FE 는 파서를 직접 구현하지 않는다. 구분자 판별·인코딩·NULL 구분·NUMBER 원문 보존
 * 같은 판단은 전부 엔진이 지고(그쪽 골든이 지킨다), 이 모듈은 그 결과를 FE 가 쓰는
 * 모양으로 옮기기만 한다. 파싱 케이스를 여기서 다시 검증하지 않는 이유다.
 *
 * 엔진 호출은 **자유형 모드** — 매니페스트가 없다. 그래서 두 가지가 따라온다:
 *
 *  1. `report.code` 가 거의 항상 `INTEGRITY_ABSENT` 다. 무결성 봉투(마커·논스)가 없는
 *     입력이라는 뜻이지 실패가 아니다 — 그리드 복사·CSV 는 원래 그렇다. 치명 여부는
 *     코드 이름이 아니라 엔진의 `isFatal` 로만 판정한다.
 *  2. `provenance.executed_at` 이 `null` 이다(엔진에 시계가 없고 META 도 없으므로).
 *     조회 시각은 FE 가 `capturedAt` 으로 따로 남긴다.
 */

import { ingest, isFatal } from "data-provisioning";
import type { ReportCode } from "data-provisioning";

/**
 * 엔진 모델 스키마의 `queryId` 패턴. 엔진은 `opts.query_id` 를 검증 없이 그대로
 * 쓰기 때문에, 스키마를 만족하는 값을 넘기는 건 호출자인 이쪽 책임이다.
 */
const QUERY_KEY_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

export type SnapshotParseOk = {
  ok: true;
  columns: string[];
  rows: (string | null)[][];
  rowCount: number;
  /** 엔진 `provenance.sha256`. 중복 감지 전용 — 식별자나 무결성 보증으로 쓰지 않는다. */
  contentHash: string;
  /** 비치명 발견들. 자유형 입력에서는 `INTEGRITY_ABSENT` 가 정상적으로 들어온다. */
  warnings: ReportCode[];
};

export type SnapshotParseError = {
  ok: false;
  code: ReportCode;
  /** 엔진 메시지 — 사람용이라 UI 표시에만 쓰고 분기하지 않는다. */
  message: string;
  where?: string;
};

export type SnapshotParseResult = SnapshotParseOk | SnapshotParseError;

/**
 * 사용자 라벨을 엔진이 받는 쿼리 id 로 바꾼다.
 *
 * 라벨은 자유 텍스트(한글·공백 허용)라 그대로는 스키마를 위반한다. ASCII 슬러그로
 * 접고, 접은 결과가 비면(예: 라벨이 전부 한글) `fallback` 을 쓴다 — `fallback` 은
 * 호출자가 만든 스냅샷 id 라 이미 패턴을 만족한다.
 */
export function toQueryKey(label: string, fallback: string): string {
  const slug = label
    .trim()
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^[^A-Za-z0-9_]+/, "")
    .replace(/[-.]+$/, "");
  return QUERY_KEY_RE.test(slug) ? slug : fallback;
}

/**
 * 붙여넣은 텍스트 한 덩이를 스냅샷 재료로 해석한다.
 *
 * `queryKey` 는 `toQueryKey` 를 통과한 값이어야 한다.
 */
export function parseSnapshot(
  input: string,
  opts: { queryKey: string },
): SnapshotParseResult {
  const { queryKey } = opts;
  const { model, report } = ingest(input, null, {}, { query_id: queryKey });

  if (isFatal(report.code) || !model) {
    return {
      ok: false,
      code: report.code,
      message: report.message,
      ...(report.where === undefined ? {} : { where: report.where }),
    };
  }

  const query = model.queries[queryKey];
  if (!query) {
    // 도달 불가 — 비치명이면 엔진은 요청한 id 로 쿼리를 채운다. 조용히 빈 표를
    // 만드느니 계약 위반으로 드러낸다.
    return {
      ok: false,
      code: report.code,
      message: `엔진이 '${queryKey}' 쿼리를 돌려주지 않았다 — 엔진 계약 위반`,
    };
  }

  return {
    ok: true,
    columns: query.columns,
    rows: query.rows,
    rowCount: query.provenance.rows,
    contentHash: query.provenance.sha256,
    warnings: collectWarnings(report),
  };
}

/** `code` + `warnings[]` 를 한 목록으로 편다. `OK` 는 경고가 아니라 뺀다. */
function collectWarnings(report: {
  code: ReportCode;
  warnings?: { code: ReportCode }[];
}): ReportCode[] {
  const all = [report.code, ...(report.warnings ?? []).map((w) => w.code)];
  return all.filter((code) => code !== "OK");
}
