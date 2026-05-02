"use client";

import { SCENARIOS, type Scenario } from "@/demo/scenarios";

type Props = {
  onScenarioStart?: (scenario: Scenario) => void;
};

export function ChatEmptyState({ onScenarioStart }: Props) {
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
    </div>
  );
}
