/**
 * `data-provisioning` 엔진의 ambient 타입 선언.
 *
 * 엔진은 순수 JS(ESM)로 배포되고 `.d.ts` 를 동봉하지 않는다. 이 파일은 엔진이 소유한
 * 계약을 TS 로 옮겨 적은 것이고 **진실원은 엔진 쪽 스키마**다 —
 * `schemas/model.schema.json` 과 `schemas/report.schema.json`. 엔진 핀을 올릴 때
 * 두 스키마와 대조해 갱신한다.
 *
 * 엔진 공개 표면은 `ingest` 함수 하나이며, 여기서는 FE 가 실제로 쓰는 것만 선언한다.
 */
declare module "data-provisioning" {
  /**
   * 안정 enum — 포트가 여기에 분기하므로 값 변경·삭제는 파괴적 변경이다.
   * 배열 순서가 곧 severity 오름차순이고, 여러 발견이 겹치면 최상위가 `code` 에 온다.
   *
   * 치명(= `model` 이 없다): TRUNCATED_PASTE·ROWCOUNT_MISMATCH·COLUMN_MISMATCH·
   * IDENTITY_MISMATCH·ENCODING_UNDECIDABLE·PARTIAL_MARKING·MERGE_CONFLICT.
   * 비치명(= `model` 과 함께 나간다): OK·ZERO_ROWS·INTEGRITY_ABSENT·TIME_MIXED.
   */
  export type ReportCode =
    | "OK"
    | "ZERO_ROWS"
    | "INTEGRITY_ABSENT"
    | "TIME_MIXED"
    | "TRUNCATED_PASTE"
    | "ROWCOUNT_MISMATCH"
    | "COLUMN_MISMATCH"
    | "IDENTITY_MISMATCH"
    | "ENCODING_UNDECIDABLE"
    | "PARTIAL_MARKING"
    | "MERGE_CONFLICT";

  export type Finding = {
    code: ReportCode;
    /** 사람용. **계약이 아니다** — 문구에 분기하지 말 것. */
    message: string;
    query_id?: string;
    where?: string;
  };

  /** `code` 하나로 안 담기는 잔여 비치명 발견은 `warnings` 로 쌓인다. */
  export type Report = Finding & { warnings?: Finding[] };

  export type Provenance = {
    /** 입력 META 의 ts. 엔진은 시계가 없으므로 자유형 입력은 `null`. */
    executed_at: string | null;
    db_id: string | null;
    /** params+db_id 의 sha256(단방향). */
    subject: string;
    rows: number;
    /** 우발 손상 탐지용 — 진정성 보증도, 패리티 기준도 아니다. */
    sha256: string;
    integrity: "marker-nonce" | "none";
    /** 매니페스트 대조를 통과했는가. `false` = 자유형 → 병합 base 로 못 쓴다. */
    validated: boolean;
    round: number;
  };

  export type Query = {
    columns: string[];
    /** 값은 전부 원문 문자열. NULL 은 빈 문자열과 구별해 `null`. */
    rows: (string | null)[][];
    provenance: Provenance;
  };

  /** 오로지 데이터만 담는다 — 정체·세션 메타는 없다. */
  export type Model = { queries: Record<string, Query> };

  export type IngestOpts = {
    nonce?: string;
    encoding?: string;
    /** 자유형 입력의 쿼리 id. 호출자가 정한다(엔진 기본값 `"q01"`). */
    query_id?: string;
  };

  export function ingest(
    input: Uint8Array | string,
    manifest?: object | null,
    params?: Record<string, unknown>,
    opts?: IngestOpts,
    base?: Model,
  ): { model?: Model; report: Report };

  export function isFatal(code: ReportCode): boolean;
  export const CODES: readonly ReportCode[];
  export const FATAL: ReadonlySet<ReportCode>;
}
