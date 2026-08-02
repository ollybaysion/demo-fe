"use client";

import { SNAPSHOT_DEMO_QUESTION } from "./data/request-samples";
import { RotatingTip } from "./RotatingTip";

/**
 * 입력 카드 왕복을 여는 질문 — 백엔드 MockLlm·FE mock route 의 request_input
 * 트리거("측정")를 포함하되 param_index(센서)는 빠뜨려, 스킬 인자를 입력 카드로
 * 청하게 한다.
 */
const INPUT_DEMO_QUESTION = "CVD-01 측정값 분석해줘";

type Props = {
  /**
   * 데이터 요청 왕복 체험 — 시나리오 재생이 아니라 **실 파이프라인**(백엔드
   * 또는 FE mock)으로 질문을 그대로 보낸다. 데모 모드는 결정론 보존을 위해
   * 요청 카드를 만들지 않으므로, 왕복을 걸어 보는 길은 이쪽뿐이다.
   */
  onQuickStart?: (question: string) => void;
};

const ROUNDTRIPS = [
  {
    question: SNAPSHOT_DEMO_QUESTION,
    hint: "요청 카드 → 예시 결과 등록 → 다시 분석까지 클릭만으로 이어집니다.",
  },
  {
    question: INPUT_DEMO_QUESTION,
    hint: "입력 카드에 값(예: PARAM_INDEX)을 넣으면 자동으로 다시 분석합니다.",
  },
] as const;

/**
 * 빈 시작 화면.
 *
 * 위에서부터 팁 · 제목 · 괘선 · 부제 · 왕복 두 줄. 팁이 맨 위인 것은 화면을
 * 열었을 때 가장 먼저 닿는 자리이기 때문이고, 왕복을 카드가 아니라 밑줄 그은
 * 줄로 두는 것은 왼쪽 데이터 패널이 이미 카드 밭이어서다 — 시작 화면까지
 * 카드로 채우면 무엇이 주인지 흐려진다.
 *
 * <p>글꼴은 `--font-hero-*`(설정 > 시작 화면 글꼴)를 따른다. 기본은
 * Pretendard 이고, 명조·고딕 세트를 고를 수 있다.
 */
export function ChatEmptyState({ onQuickStart }: Props) {
  return (
    <div className="pt-xl pb-section">
      <RotatingTip />

      <div className="mt-xxl text-center">
        <h2
          className="text-brand-ink"
          style={{
            fontFamily: "var(--font-hero-head)",
            fontWeight: "var(--font-hero-head-weight)" as unknown as number,
            fontSize: 42,
            lineHeight: 1.15,
          }}
        >
          무엇을 도와드릴까요?
        </h2>

        {/* 짧은 괘선 — 제목과 부제 사이의 숨. 지면의 문법을 한 획만 빌린다. */}
        <div className="mx-auto mt-lg h-px w-12 bg-brand-primary/40" />

        <p
          className="mt-lg text-body-md text-brand-muted"
          style={{ fontFamily: "var(--font-hero-body)" }}
        >
          오른쪽 패널에서 설비를 먼저 추가해주세요.
        </p>
      </div>

      {onQuickStart && (
        <div
          className="mt-xxl mx-auto w-full border-t border-brand-hairline"
          style={{ maxWidth: "640px" }}
        >
          {ROUNDTRIPS.map((r) => (
            <button
              key={r.question}
              type="button"
              onClick={() => onQuickStart(r.question)}
              className="group block w-full border-b border-brand-hairline py-md text-left hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <span className="text-body-md text-brand-ink group-hover:text-brand-primary transition-colors">
                {r.question}
              </span>
              <span className="text-caption text-brand-primary"> →</span>
              <span className="mt-xxs block text-caption text-brand-muted">
                {r.hint}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
