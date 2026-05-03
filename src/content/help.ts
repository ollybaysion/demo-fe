/**
 * 도움말 / 운영 정책. 좌측 하단 FAB 클릭 시 중앙 모달에 노출되는
 * 마크다운 콘텐츠. 본문은 같은 디렉토리의 help.md 에서 정적 import —
 * .md 파일로 따로 두면 편집/리뷰가 편함.
 *
 * 마크다운 렌더링은 MarkdownContent 사용 — 헤딩 / 리스트 / 표 /
 * 인용 / 인라인 코드 / 외부 링크 등 동일 규칙 적용.
 */
import HELP_RAW from "./help.md";

export const HELP_MARKDOWN: string = HELP_RAW as unknown as string;
