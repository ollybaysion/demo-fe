export type MessageRole = "user" | "assistant" | "error";

/**
 * 어시스턴트 응답에 paired 되는 표 데이터.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, table?: { rows, columns? } }
 * `columns` 가 비면 첫 row 의 키에서 자동 추출.
 */
export type MessageTable = {
  rows: Record<string, unknown>[];
  columns?: string[];
  /** Card 헤더에 노출되는 제목. 비면 fallback (예: "표"). */
  title?: string;
};

/**
 * 어시스턴트 응답에 paired 되는 차트 데이터.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, chart?: { type, data, options? } }
 * v1 지원 타입: line / bar / area.
 */
/**
 * 차트에 그릴 reference 선 (수평 또는 수직).
 * - `axis: "y"` + `value` (숫자) — 가로(수평) 선. 임계값 / 평균 / 한계치 등.
 * - `axis: "x"` + `value` (숫자/문자열) — 세로(수직) 선. 이벤트 시점 등.
 */
export type MessageChartReferenceLine = {
  axis: "x" | "y";
  value: number | string;
  label?: string;
  /** hex 색. 비면 default warning(주황 amber). */
  color?: string;
  /** true 면 점선. 임계값 표기에 권장. */
  dashed?: boolean;
};

/**
 * 차트에 그릴 reference 구간 (band).
 * - `axis: "x"` + `from` / `to` — 가로(시간) 구간. 예: STEP 영역에 라벨.
 * - `axis: "y"` + `from` / `to` — 세로(값) 구간. 예: 정상 범위 음영.
 * 라벨은 구간 상단 안쪽에 표시.
 */
export type MessageChartReferenceArea = {
  axis: "x" | "y";
  from: number | string;
  to: number | string;
  label?: string;
  /** band 채우기 색 (rgba/hex). 비면 채우기 없이 라벨만 표시. */
  fill?: string;
};

export type MessageChart = {
  type: "line" | "bar" | "area";
  data: Record<string, unknown>[];
  options?: {
    /** 차트 상단 제목. 비면 미표기. */
    title?: string;
    /** x 축으로 쓸 키. 비면 첫 row 의 첫 키. */
    xKey?: string;
    /** y 축 시리즈 키 배열. 비면 xKey 제외 모든 키. */
    yKeys?: string[];
    /** 축 라벨. 비면 미표기. */
    xLabel?: string;
    yLabel?: string;
    /** 수평 / 수직 reference 선. 비면 미표기. */
    referenceLines?: MessageChartReferenceLine[];
    /** Reference 구간 (band) — STEP 라벨 등. 비면 미표기. */
    referenceAreas?: MessageChartReferenceArea[];
  };
};

/**
 * Paired 항목의 위치 힌트. 백엔드가 의미 있는 짝짓기를 강제할
 * 때 명시. 미지정 시 FE 가 균형 분배.
 */
export type PairedSide = "left" | "right";

export type MessageTableEntry = MessageTable & {
  side?: PairedSide;
};

export type MessageChartEntry = MessageChart & {
  side?: PairedSide;
};

/**
 * 어시스턴트 응답에 paired 되는 이벤트 타임라인.
 *
 * Gantt 식 시간 구간 표시 — 각 이벤트는 시작/종료가 있고, 트랙별로
 * 한 row 에 그려짐. 2단계 계층 (process/step) 으로 시각 구분.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, eventTimelines?: MessageEventTimeline[] }
 */
export type EventTimelineLevel = "process" | "step";

export type EventTimelineItem = {
  /** 트랙 라벨 — 같은 track 의 events 는 한 row 에 그려짐. 예: "공정", "챔버 A". */
  track: string;
  /** 2단계 계층. process tracks 가 위, step tracks 가 아래에 정렬. */
  level: EventTimelineLevel;
  /** ISO 또는 비교 가능한 string/number. 비교는 lexicographical / numeric. */
  start: string | number;
  end: string | number;
  label: string;
  /** hex 색 override. 미지정 시 FE 가 level 기준 기본 색 적용. */
  color?: string;
};

export type MessageEventTimeline = {
  title?: string;
  /** 시간축 범위. 미지정 시 events 의 min(start) ~ max(end) 자동. */
  range?: { start: string | number; end: string | number };
  events: EventTimelineItem[];
};

export type MessageEventTimelineEntry = MessageEventTimeline & {
  side?: PairedSide;
};

/**
 * 메시지 첨부 — 이미지 paste/drop. Phase 1 은 base64 inline 만,
 * 백엔드 업로드 endpoint 도입 후 url 변형 가능.
 */
export type MessageAttachment = {
  id: string;
  type: "image";
  /** image/png · image/jpeg · image/webp · image/gif 만 허용. */
  mime: string;
  /** 파일명 — paste 의 경우 자동 생성(`pasted-{ts}.png`). */
  name: string;
  sizeBytes: number;
  /** base64 inline. 백엔드 endpoint 도입 후엔 url 로 대체 가능. */
  dataUrl?: string;
  url?: string;
};

/**
 * 답에 딸려 오는 이미지 — 계측 화면 캡처·설비 도면 같은 것.
 *
 * 실제로 어디서 읽어오는지는 백엔드가 진다(MCP 등). FE 는 받은 것을 그릴 뿐이라
 * `dataUrl`(inline) 과 `url`(원격) 둘 다 받는다 — 사내 이미지 서버가 있으면 url,
 * 없으면 inline 이 된다.
 */
export type MessageImage = {
  /** 카드 이름. 비면 파일명·호스트에서 만든다. */
  label: string;
  dataUrl?: string;
  url?: string;
  /** 대체 텍스트 — 없으면 label 을 쓴다. */
  alt?: string;
};

/** 답이 가리키는 바깥 문서 — 사내 위키·티켓·규격서. */
export type MessageLink = {
  label: string;
  url: string;
  /** 한 줄 설명(선택) — 왜 이 링크인지. */
  description?: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** 첨부 — user 메시지에서 사용. */
  attachments?: MessageAttachment[];
  /** Paired data tables — 어시스턴트 메시지에만. */
  tables?: MessageTableEntry[];
  /** Paired charts — 어시스턴트 메시지에만. */
  charts?: MessageChartEntry[];
  /** Paired event timelines — 어시스턴트 메시지에만. */
  eventTimelines?: MessageEventTimelineEntry[];
  /** 답에 딸린 이미지 — 어시스턴트 메시지에만. */
  images?: MessageImage[];
  /** 답이 가리키는 바깥 문서 — 어시스턴트 메시지에만. */
  links?: MessageLink[];
  /**
   * 이 답이 무엇을 놓고 나온 답인지 — 보낼 때의 질의 대상 이름들.
   *
   * 트레이는 지금 담긴 것만 보여주므로, 대화를 거슬러 올라가면 "아까 그 답은 뭘
   * 보고 한 거였지"가 안 풀린다. 그래서 답에 그때의 대상을 붙여 둔다. 비면
   * 미표기(담은 것 없이 물은 답).
   */
  scopeLabels?: string[];
  /**
   * @deprecated `tables` 사용. 기존 localStorage 호환용.
   * 렌더 시 `tables ?? [table]` 로 coalesce.
   */
  table?: MessageTable;
  /**
   * @deprecated `charts` 사용. 기존 localStorage 호환용.
   */
  chart?: MessageChart;
  /**
   * 추천 후속 질문 — 어시스턴트 메시지에만. ChatInput 위에 chip
   * 으로 노출. 비면 미표기. 백엔드가 동봉한 단순 문자열 배열.
   */
  recommendQuestion?: string[];
  /**
   * 데이터 요청 — 어시스턴트 메시지에만. 답하는 데 필요한데 없는 데이터를
   * 백엔드가 알려온 것. 사용자가 채워 넣으면 다시 분석할 수 있다.
   */
  dataRequests?: DataRequest[];
  /**
   * 입력 요청 — 어시스턴트 메시지에만. 스킬에 필요한 스칼라 값(예: param_index)이
   * 없어 백엔드가 청한 것. 데이터 패널의 입력 카드로 렌더된다.
   */
  inputRequests?: InputRequest[];
  /**
   * 선택 요청 — 어시스턴트 메시지에만. 채팅 스트림에 인라인 카드로 렌더된다
   * (요청·입력 카드와 달리 데이터 패널이 아니라 이 메시지 바로 아래).
   */
  choiceRequests?: ChoiceRequest[];
  /**
   * 선택 카드 회신 기록 — 어시스턴트 메시지에만, question 을 키로 한다. 카드
   * 클릭이 만드는 것은 이 기록 + 뒤따르는 user 메시지 하나뿐이고, 채팅 요청
   * 본문에는 싣지 않는다(FE 전용 상태 — 동결 판정·재표시에만 쓴다).
   */
  choiceReplies?: Record<string, { values: string[] } | { skipped: true }>;
  /**
   * 에러 상세 — `role: "error"` 메시지에만. 사용자 친화 본문은
   * `content`, 원인 분류 / HTTP 상태 / 원본 메시지 등 기술적 디테일은
   * 여기에. UI 에서 [원인 보기] 토글로 접어 노출.
   */
  errorDetail?: {
    /** 분류 키 — "network" | "timeout" | "http-4xx" | "http-5xx" | "stream" | "unknown". */
    kind: string;
    /** HTTP status 또는 0 (네트워크 단절). */
    status?: number;
    /** 원본 에러 메시지(영문 stack trace 등). */
    raw?: string;
  };
};

/**
 * 데이터 스냅샷 — DB 미접속 환경에서 사람이 직접 실행한 조회 결과.
 *
 * 표 내용(`columns`/`rows`)은 `data-provisioning` 엔진이 해석한 산출물을 그대로
 * 담는다. 값이 전부 문자열인 것은 엔진 규율이다 — Oracle NUMBER 를 double 로
 * 왕복시키면 정밀도가 깨지므로 숫자 파싱을 하지 않는다. NULL 은 빈 문자열과
 * 구별해 `null` 이다.
 */
export type DataSnapshot = {
  id: string;
  /**
   * 엔진 `query_id` 로 그대로 넘어가는 안정 식별자 — 엔진 모델 스키마의 패턴
   * (`^[A-Za-z0-9_][A-Za-z0-9_.-]*$`)을 만족해야 한다. `toQueryKey` 로 만든다.
   */
  queryKey: string;
  /** 사용자가 보는 이름. 자유 텍스트라 `queryKey` 와 다를 수 있다. */
  label: string;
  /**
   * 등록 시각(ISO). 엔진 `provenance.executed_at` 은 자유형 입력에서 `null` 이라
   * (엔진에 시계가 없다) 신선도 판단은 이 값으로 한다.
   */
  capturedAt: string;
  columns: string[];
  /**
   * 표 내용. **빈 배열은 "아직 안 받았다"가 아니라 "조회했더니 0행"이다** — 사용자가
   * 요청 카드에 [결과 없음]으로 답했거나 헤더만 붙여넣은 경우다. 백엔드도 같은
   * 기준으로 읽어(`rows: []` + `rowCount: 0`) 미첨부와 구분하고, 그 조회 절차를
   * 거기서 정상 종료시킨다.
   */
  rows: (string | null)[][];
  /**
   * 엔진 `provenance.sha256`. 중복 감지 전용.
   *
   * 0행 등록에는 해석할 내용이 없어 엔진 해시도 없다 — 대신 어느 조회의 없음인지를
   * 정체로 삼는다(`emptyResultHash`). 없음끼리는 컬럼이 같아도 조회가 다르면 다른
   * 사실이라, 중복 판정이 `queryKey` 까지 본다.
   */
  contentHash: string;
  /** 요청에 실을지 — 체크된 스냅샷은 내용(rows)까지 함께 나간다. */
  included: boolean;
  /** 등록 시점의 비치명 경고 코드들. 자유형은 `INTEGRITY_ABSENT` 가 정상. */
  warnings: string[];
  /**
   * 휴지통에 들어간 시각(ISO). 있으면 목록·요청 페이로드 어디에도 안 나오지만
   * 저장소에는 남아 있어 되살릴 수 있다.
   *
   * 삭제를 즉시 확정하지 않는 이유는 스냅샷이 **SQL 재실행 없이는 다시 만들기
   * 번거로운 데이터**라서다. 오클릭 한 번의 비용이 너무 크고, 그 사실은 탭을
   * 닫는다고 달라지지 않는다 — 그래서 메모리가 아니라 저장소에 남긴다.
   */
  deletedAt?: string;
  /**
   * 이 데이터가 가리키는 구간(선택). 요청에서 그대로 물려받는 값이라 요청이
   * 아닌 경로(직접 붙여넣기)로 등록하면 없다. 카드에서 이름 아래 줄에 적는다.
   */
  timeRange?: { start: string; end: string };
  /**
   * 이 데이터를 만든 쿼리 원문 — 요청 카드를 채우면 요청 SQL 이 자동으로 담기고,
   * 자유 붙여넣기는 카드의 [쿼리]에서 사용자가 직접 붙일 수 있다(없으면 없는 대로).
   * 카드의 테이블 칩은 이 SQL 의 `FROM` 에서 결정론적으로 파생한다 — 추측으로
   * 채우지 않는다. FE 전용 필드라 채팅 페이로드에는 싣지 않는다.
   */
  sourceSql?: string;
  /**
   * 붙여넣기 원문 — 표 파싱 **이전**의 텍스트다. 스냅샷 카드의 [메시지로]
   * (오판 교정)가 이 원문을 그대로 메시지 판정에 다시 보낸다: 파싱된 표에서
   * 역조립하면 구분자·공백이 원문과 달라져 판정이 어긋난다. 큰 표는 담지
   * 않는다(BE `pasted` 캡과 같은 32k) — 그 크기는 메시지가 아니다.
   * FE 전용 필드라 채팅 페이로드에는 싣지 않는다.
   */
  rawText?: string;
};

/**
 * 데이터 메시지 — 붙여넣은 설비/카프카 메시지를 BE 가 LLM 1회로 포맷팅한 것
 * (BE #64 MVP). 스냅샷(표)과 정체가 달라 타입도 저장소(IDB `messages`)도
 * 분리한다 — {@link DataSnapshot} 에 욱여넣으면 `coerceSnapshot` 이 로드 시
 * 버린다.
 *
 * `json`/`comment`/`eqpId` 는 전부 LLM 산출물이라 오차를 허용한다(편의성 기능
 * 합의) — `raw` 가 진실원이고 카드의 원문 접힘이 그 안전망이다.
 */
export type DataMessage = {
  id: string;
  /** 목록에 보이는 제목 — BE `title`, 없으면 className, 없으면 원문 머리. */
  label: string;
  /** 등록 시각(ISO). */
  createdAt: string;
  /**
   * 메시지 안에 찍힌 **발생 시각**(BE `occurredAt`) — 등록 시각과 다르다.
   * 목록 정렬·날짜 묶기의 기준이고, 같은 초에 여러 건이 오는 데이터라 소수초
   * 자릿수가 그대로 온다. BE 가 형식 검증을 통과시킨 값만 실리고, 없으면 그 건은
   * 등록 시각으로 줄 선다.
   */
  occurredAt?: string;
  /** 이 한 건의 원문 — 진실원. 다건이면 BE 가 자른 조각이다. */
  raw: string;
  /**
   * BE 포맷팅 결과(객체) — pretty-print 는 화면 소유. **없을 수 있다**: 다건에서
   * 몇 건은 변환에 실패할 수 있고, 그때도 원문 카드로 세운다(사라지지 않는다).
   */
  json?: unknown;
  /** 한 줄 요약 — LLM 코멘트. 실패하면 없다. */
  comment?: string;
  /** 설비 id — 있으면 그 설비 카드 아래 메시지 줄로 배치, 없으면 미분류. */
  eqpId?: string;
  className?: string;
  /** 근거가 된 msg-format 문서 id — 문서 연동은 고도화(BE #66)라 지금은 없다. */
  docId?: string;
};

/**
 * 조달 원장 한 줄의 상태 — 그 조회를 **지금 실행할 수 있는가**, 못 한다면 왜인가.
 * BE `RequestState` 의 거울이다.
 *
 * `blocked`(아직 — 앞 조회가 오면 열린다)와 `unreachable`(영영 — 앞 조회가 빈손으로
 * 확정됐다)을 가르는 것이 요점이다. 뭉치면 화면이 기다리라고 말해야 할 자리에서
 * 포기하라고 말하거나 그 반대가 된다.
 */
export type RequestState =
  | "ready"
  | "blocked"
  | "arrived"
  | "inactive"
  | "unreachable";

/**
 * 데이터 요청 — 백엔드가 "이게 있어야 답할 수 있다"고 알려오는 것.
 *
 * DB 에 붙지 못하는 환경에서는 모델이 스스로 조회할 수 없으므로, 없는 데이터를
 * 지어내는 대신 사용자에게 조달을 요청한다. 사용자가 그 결과를 붙여넣어 스냅샷으로
 * 등록하면 다시 분석할 수 있다.
 *
 * `/chat/data` 판정에서는 이것이 **조달 원장**으로 온다 — 그 절차의 조회 전량이
 * 상태를 달고 매번 전부. 화면은 그 상태대로 그리기만 한다: 무엇을 보일지도, SQL 을
 * 어떻게 완성할지도 화면이 판단하지 않는다.
 */
export type DataRequest = {
  /**
   * 이 요청을 충족하는 스냅샷이 가질 키. 사용자가 등록할 때 이 값이 그대로
   * `queryKey` 가 되어, 다음 요청에서 백엔드가 충족 여부를 알아본다.
   */
  queryKey: string;
  /** 사람이 읽는 설명 — 무슨 데이터가 왜 필요한지. */
  label: string;
  /** 사용자가 실행할 SQL. 있으면 복사 버튼을 준다. */
  sql?: string;
  /** 기대 컬럼. 있으면 카드에 표시해 사용자가 맞는 걸 붙여넣었는지 가늠하게 한다. */
  columns?: string[];
  /**
   * 이 요청이 가리키는 구간(선택). 제목에 이어 붙이면 길어서 잘리므로 카드에서
   * 한 줄 아래에 따로 적는다. 구간과 무관한 조회(코드표·마스터 등)도 있으므로
   * 없을 수 있다.
   */
  timeRange?: { start: string; end: string };
  /**
   * 이 카드가 속한 절차 실행(스킬 + 원문 인자) — 설비→분석 계층에 앉히는 근거.
   * `queryKey` 는 손실 인코딩이라 역파싱하면 안 되고, 소속은 이 필드가 정본이다.
   */
  run?: { skill: string; args: Record<string, string> };
  /** 원장으로 왔으면 그 줄의 상태. 채팅 경로의 요청 카드에는 없다(언제나 실행 가능). */
  state?: RequestState;
  /** 못 여는 사유 — `blocked`·`unreachable` 일 때만. */
  blocked?: string;
  /** 이 조회가 채우는 need 의 id 들 — 카드를 "무엇을 알아내려는 것"으로 되짚는 근거. */
  needs?: string[];
};

/**
 * 입력 요청 — 백엔드가 "스킬에 이 값 하나가 있어야 답할 수 있다"고 알려오는 것.
 *
 * {@link DataRequest}(SQL 실행→표 붙여넣기)의 형제지만, 이쪽은 스칼라 값 하나를
 * 직접 타이핑해 받는다(예: param_index). 사용자가 채운 값은 채팅 요청 본문의
 * `inputs[skill][key]` 로 되돌아가 백엔드가 그 스킬을 이어서 진행한다.
 */
export type InputRequest = {
  /**
   * 이 값이 필요한 스킬(툴) 이름. 회신이 이 스킬로 네임스페이스돼
   * (`inputs[skill][key]`) 같은 key 를 쓰는 여러 스킬이 충돌하지 않는다.
   */
  skill: string;
  /** 스킬 인자 이름 — 채운 값이 이 이름으로 회신된다(예: param_index). */
  key: string;
  /** 사람이 읽는 입력 이름 — 카드에 표시된다(예: PARAM_INDEX). */
  label: string;
  /** 무슨 값을 넣어야 하는지 짧은 안내(선택). */
  description?: string;
};

/**
 * 선택 카드의 선택지 한 칸. `label` 이 카드에 뜨는 문구이자 회신 문장
 * ("선택 — {label}")에 실리는 값이다. `description` 은 선택.
 */
export type ChoiceOption = {
  label: string;
  description?: string;
};

/**
 * 선택 요청 — 백엔드가 "빠진 값의 후보를 2~10개로 좁혔다"고 알려오는 것.
 *
 * {@link InputRequest}와 형제지만 회신 채널이 다르다 — 이쪽은 구조화 회신
 * 필드가 없고, 카드 클릭이 그대로 `"선택 — {label}"` user 메시지로 대화에
 * 복귀한다({@link Message.choiceReplies}는 FE 전용 상태로, 채팅 요청 본문에는
 * 싣지 않는다).
 */
export type ChoiceRequest = {
  question: string;
  options: ChoiceOption[];
  /** 여러 개를 고를 수 있으면 true — 헤더에 "전부 선택" 토글이 뜬다. */
  multiSelect: boolean;
};

/**
 * 화면 하나 — 캡처 분류 카드(#189, BE fdc-agent-be-spring#63)의 후보·목록 항목.
 * `value` 는 screen-map id(닫힌 목록), `label` 은 화면 이름, `caption` 은 BE
 * menuLabel(프로그램 › 화면 경로)을 그대로 옮긴 것.
 */
export type ScreenOption = {
  value: string;
  label: string;
  caption: string;
};

/** `POST /chat/image` 의 `browse[]` — 프로그램(program)으로 group-by 된 화면 카탈로그 전체. */
export type BrowseGroup = {
  group: string;
  options: ScreenOption[];
};

/** `POST /api/fdc/v1/chat/image` 응답 — 캡처 한 장의 분류 결과. 항상 200. */
export type ClassifyImageResponse = {
  /** 0~3개, 순서 = LLM 순위. */
  candidates: ScreenOption[];
  /** 카탈로그 전체 — 후보가 비어도 항상 채워진다. */
  browse: BrowseGroup[];
};

/**
 * 채팅 요청에 실리는 채운 입력값 — `POST /api/fdc/v1/chat` 의 `inputs`.
 * 스킬로 네임스페이스된다({@code {skill: {key: value}}}). 한 번 채운 값은 대화
 * 내내 sticky 로 매 요청에 실려 나간다(폼 컨텍스트처럼).
 */
export type ChatInputs = Record<string, Record<string, string>>;

/**
 * 채팅 요청에 실리는 스냅샷 — `POST /api/fdc/v1/chat` 의 `dataSnapshots[]`.
 *
 * 체크된 스냅샷이 내용(rows)까지 담아 나간다 — 체크했다는 건 근거로 쓰라는
 * 뜻이다. `rows` 가 optional 인 것은 BE 계약 호환 때문이다(BE 는 rows 가 아예 없는
 * 항목을 카탈로그 알림으로 처리한다). FE 는 항상 채워 보낸다.
 *
 * **빈 배열은 카탈로그가 아니다.** BE 는 `rows: []` + `rowCount: 0` 을 "조회 결과가
 * 0행임이 확인됨"으로 읽고, 미첨부와 구분해 프롬프트에 싣는다.
 */
export type ChatDataSnapshot = {
  queryKey: string;
  label: string;
  capturedAt: string;
  columns: string[];
  rowCount: number;
  /** 표 내용. BE 계약상 optional 이지만 FE 는 체크된 것을 항상 채워 보낸다. */
  rows?: (string | null)[][];
};
