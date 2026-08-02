"use client";

type Props = {
  onSelect: (text: string) => void;
  /**
   * chip 으로 표시할 질문 목록 — 부르는 쪽이 정한다. 빈 시작 화면용 기본
   * 목록은 없다: 그 자리에는 팁과 왕복 줄이 이미 무엇을 물을지 말하고 있다.
   */
  questions: readonly string[];
  /** 이어가기 안내와 추천 후속을 SR 에 구분하기 위한 라벨. */
  ariaLabel?: string;
  /**
   * 데모 모드에서 응답이 준비된 chip 만 활성화 — 일치하지 않는 chip 은
   * 클릭 차단 (응답이 시나리오에 없으므로). 미지정 시 모두 활성화 (백엔드
   * 가 임의 chip 에도 응답을 줄 수 있는 일반 모드).
   */
  enabledQuestion?: string;
};

export function SuggestedQuestions({
  onSelect,
  questions,
  ariaLabel = "예시 질문",
  enabledQuestion,
}: Props) {
  if (questions.length === 0) return null;

  return (
    <ul
      aria-label={ariaLabel}
      className="flex flex-wrap gap-xs mb-sm"
    >
      {questions.map((q) => {
        const enabled = enabledQuestion === undefined || enabledQuestion === q;
        return (
          <li key={q}>
            <button
              type="button"
              onClick={() => onSelect(q)}
              disabled={!enabled}
              className={
                enabled
                  ? "text-body-sm text-brand-ink bg-brand-surface-card border border-brand-primary hover:bg-brand-primary hover:text-brand-on-primary active:bg-brand-primary-active rounded-pill px-md py-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors text-left"
                  : "text-body-sm text-brand-ink/40 bg-brand-surface-card/60 border border-brand-primary-disabled rounded-pill px-md py-xs text-left cursor-not-allowed"
              }
              title={enabled ? undefined : "데모 모드에서는 미리 준비된 응답만 재생됩니다"}
            >
              {q}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
