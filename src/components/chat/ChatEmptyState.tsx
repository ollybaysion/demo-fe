"use client";

import { SCENARIOS, type Scenario } from "@/demo/scenarios";
import { SNAPSHOT_DEMO_QUESTION } from "./data/request-samples";

type Props = {
  onScenarioStart?: (scenario: Scenario) => void;
  /**
   * 데이터 요청 왕복 체험 — 시나리오 재생이 아니라 **실 파이프라인**(백엔드
   * 또는 FE mock)으로 질문을 그대로 보낸다. 데모 모드는 결정론 보존을 위해
   * 요청 카드를 만들지 않으므로, 왕복을 걸어 보는 길은 이쪽뿐이다.
   */
  onQuickStart?: (question: string) => void;
};

export function ChatEmptyState({ onScenarioStart, onQuickStart }: Props) {
  return (
    <div className="py-section">
      <div className="text-center">
        <h2 className="font-display text-display-md text-brand-ink">
          무엇을 도와드릴까요?
        </h2>
        <p className="mt-md text-body-md text-brand-muted">
          아래에서 시나리오를 선택하거나, 입력창에 질문을 입력하세요.
        </p>
      </div>

      {SCENARIOS.length > 0 && onScenarioStart && (
        <ul
          className="mt-xl mx-auto grid w-full gap-md grid-cols-1 sm:grid-cols-2"
          style={{ maxWidth: "640px" }}
        >
          {SCENARIOS.map((scenario) => (
            <li key={scenario.id}>
              <button
                type="button"
                onClick={() => onScenarioStart(scenario)}
                className="block w-full h-full text-left rounded-lg border border-brand-hairline bg-brand-canvas px-md py-md text-body-md text-brand-ink hover:border-brand-primary hover:bg-brand-surface-card focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
              >
                {scenario.starter}
              </button>
            </li>
          ))}
        </ul>
      )}

      {onQuickStart && (
        <div className="mt-md mx-auto w-full" style={{ maxWidth: "640px" }}>
          {/* 점선 테두리 — 위 시나리오(정해진 대사 재생)와 다른 종류임을 표시. */}
          <button
            type="button"
            onClick={() => onQuickStart(SNAPSHOT_DEMO_QUESTION)}
            className="block w-full text-left rounded-lg border border-dashed border-brand-primary/50 bg-brand-canvas px-md py-md hover:border-brand-primary hover:bg-brand-surface-card focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <span className="inline-flex items-center h-5 px-xs rounded-full bg-brand-primary/15 text-brand-primary text-caption font-medium">
              데이터 요청 왕복
            </span>
            <span className="mt-xxs block text-body-md text-brand-ink">
              {SNAPSHOT_DEMO_QUESTION}
            </span>
            <span className="mt-xxs block text-caption text-brand-muted">
              요청 카드 → 예시 결과 등록 → 다시 분석까지 클릭만으로 이어집니다.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
