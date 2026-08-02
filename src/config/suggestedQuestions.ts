/**
 * 빈 채팅 화면에서 입력창 위에 노출되는 예시 질문(chip).
 *
 * 클릭 시 라벨 그대로가 사용자 메시지로 즉시 전송된다 (입력창 채우기 X).
 * 메시지가 한 건이라도 생기면 사라짐.
 *
 * v1은 단순 문자열 배열. 추후 라벨/메시지 분리가 필요해지면
 * `{ label: string; message: string }` 형태로 확장.
 */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "데이터가 안 올라와요",
  "설비가 멈췄어요",
  "설정 방법 알려줘",
] as const;

/**
 * chip 한 줄 상한 — 셋이 입력창 폭(720px) 안에 나란히 서야 한다.
 *
 * 길면 두 줄로 접히고, 접히는 만큼 입력창 위 흰 영역이 통째로 높아진다.
 * 채팅 화면에서 그 영역이 자라면 대화가 위로 밀린다 — chip 은 거들 뿐인데
 * 자리를 더 차지하는 꼴이 된다. `suggestedQuestions.test.ts` 가 지킨다.
 */
export const SUGGESTED_MAX_LENGTH = 14;
