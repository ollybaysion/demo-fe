/**
 * 붙여넣기·드롭으로 들어온 것을 **무엇으로 받을지** 가르는 규칙.
 *
 * 데이터 패널은 Ctrl+V 한 번으로 표(텍스트)와 그림을 모두 받는다. 어느 쪽인지
 * 판정하는 자리를 컴포넌트 밖에 둔 이유는 이 판정이 손으로 확인하기 어려운
 * 브라우저 클립보드 동작에 걸려 있어서다 — 규칙만 떼어 두면 테스트가 된다.
 *
 * 규칙의 핵심은 **텍스트 우선**이다. SQL Developer·엑셀에서 셀 범위를 복사하면
 * 클립보드에 text/plain 과 **비트맵 이미지가 함께** 실린다. 이미지를 먼저 보면
 * 표 등록이 그림 등록으로 뒤집혀, 이 앱에서 제일 많이 쓰는 길이 막힌다.
 * 그래서 텍스트가 한 글자라도 있으면 텍스트로 받고, 텍스트가 없을 때만
 * 그림으로 받는다(스크린샷 붙여넣기가 정확히 이 경우다).
 *
 * 텍스트 안에서 한 갈래가 더 갈린다: **주소 한 줄**은 표가 아니라 링크다.
 */

/** 그림 한 장의 상한 — 채팅 입력창 첨부(`ChatInput`)와 같은 기준. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** 받아들이는 그림 형식. 감지는 `image/*` 로 하고, 수용은 이 목록으로 한다. */
export const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** 한 번에 받을 그림 수 — 실수로 폴더째 떨어뜨린 경우를 막는다. */
export const MAX_IMAGES_PER_INGEST = 4;

/** 검사에 필요한 최소한의 파일 정보. */
export type FileLike = { name: string; type: string; size: number };

/** `DataTransfer` 중 실제로 쓰는 면만. 테스트가 가짜를 넣을 수 있게 좁혔다. */
export type ClipboardLike = {
  getData(format: string): string;
  items?: ArrayLike<{
    kind: string;
    type: string;
    getAsFile(): File | null;
  }>;
};

export type IngestPlan =
  | { kind: "text"; text: string }
  | { kind: "link"; url: string }
  | { kind: "images"; files: File[] }
  | { kind: "none" };

/**
 * 클립보드 한 벌을 보고 텍스트/주소/그림/아무것도 아님을 정한다.
 *
 * 텍스트 우선(모듈 주석 참고). 여기서는 "무엇이냐"만 정하고, 형식·크기
 * 검사는 {@link imageRejectReason} 이 개별 파일에 대해 따로 한다 — 걸러진
 * 이유를 사람에게 보여 주려면 조용히 버리지 않고 남겨야 하기 때문이다.
 */
export function planClipboardIngest(
  cd: ClipboardLike | null | undefined,
): IngestPlan {
  if (!cd) return { kind: "none" };

  const text = safeGetText(cd);
  if (text.trim().length > 0) {
    const url = asLinkUrl(text);
    return url ? { kind: "link", url } : { kind: "text", text };
  }

  const files = imageFilesFrom(cd);
  if (files.length > 0) return { kind: "images", files };

  return { kind: "none" };
}

/**
 * 이 텍스트가 **주소 하나**인가 — 맞으면 정규화한 주소, 아니면 `null`.
 *
 * 주소만 달랑 복사한 것은 표가 아니다. 표로 파싱하면 열이 하나뿐인 실패로
 * 끝나고, 사람은 "왜 안 되지"를 모달에서 읽게 된다. 조건을 좁게 잡는 이유도
 * 같다 — 주소가 **섞인** 여러 줄은 조회 결과일 수 있으므로 표로 보낸다.
 */
function asLinkUrl(text: string): string | null {
  const one = text.trim();
  // 공백·줄바꿈이 하나라도 있으면 주소 한 줄이 아니다.
  if (/\s/.test(one)) return null;
  if (!/^https?:\/\//i.test(one)) return null;
  try {
    // 호스트가 없는 것(`http://`)은 주소로 세지 않는다.
    return new URL(one).host ? one : null;
  } catch {
    return null;
  }
}

/** 클립보드의 그림 파일들. `kind === "file"` 이면서 MIME 이 image/* 인 것만. */
function imageFilesFrom(cd: ClipboardLike): File[] {
  const items = cd.items;
  if (!items) return [];
  const out: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;
    if (!isImageType(item.type)) continue;
    const file = item.getAsFile();
    if (file) out.push(file);
  }
  return out;
}

/**
 * 떨어뜨린 파일들을 그림과 그 밖으로 가른다.
 *
 * 그 밖(CSV·TSV·텍스트)은 지금까지처럼 글자로 읽어 스냅샷 등록으로 간다.
 * 가르지 않으면 PNG 를 UTF-8 로 읽어 파싱하다 실패 모달이 뜬다.
 */
export function splitDroppedFiles<T extends FileLike>(
  files: ArrayLike<T>,
): { images: T[]; others: T[] } {
  const images: T[] = [];
  const others: T[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    (isImageType(file.type) ? images : others).push(file);
  }
  return { images, others };
}

/**
 * 이 그림을 받을 수 없는 이유 — 받을 수 있으면 `null`.
 *
 * 문구를 그대로 화면에 띄운다. 조용히 버리면 "붙여넣었는데 아무 일도 안 남"이
 * 되고, 그건 이 패널이 상주 컬럼이 되면서 없앤 문제다.
 */
export function imageRejectReason(file: FileLike): string | null {
  if (!IMAGE_MIME.has(file.type)) {
    return `받을 수 없는 그림 형식입니다: ${file.type || "(알 수 없음)"}`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const maxMb = Math.round(IMAGE_MAX_BYTES / 1024 / 1024);
    return `그림이 너무 큽니다 (${mb}MB / 최대 ${maxMb}MB).`;
  }
  return null;
}

function isImageType(type: string): boolean {
  return typeof type === "string" && type.startsWith("image/");
}

function safeGetText(cd: ClipboardLike): string {
  try {
    return cd.getData("text/plain") ?? "";
  } catch {
    // 일부 브라우저는 붙여넣기 이벤트 밖에서 읽으면 던진다. 텍스트가 없는
    // 것으로 보고 그림 경로를 살린다.
    return "";
  }
}
