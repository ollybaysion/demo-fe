"use client";

import { useState } from "react";
import type { ChoiceRequest } from "@/lib/types";
import { OptionRow } from "../OptionRow";

type Reply = { values: string[] } | { skipped: true };

/**
 * 선택 카드(#173, BE #53) — LLM 이 되물음을 프로즈 대신 버튼 선택지로 낸 것.
 * `demo-fe-choice-lab` 시안 랩의 시안 C(헤어라인 프레임 · ①원형 배지 번호 마커 ·
 * "선택" 배지 머리 · 전부=머리 토글)를 그대로 포팅했다.
 *
 * 회신 채널은 클릭뿐이다 — 번호 타이핑 해석은 없다. 단일 선택은 행 클릭 즉시
 * 확정, 다중 선택은 "선택 완료"로 확정한다. `frozen` 은 이미 회신했거나
 * (`reply` 있음) 이 카드 뒤에 다른 user 발화가 있을 때 호출부가 넘긴다 — 그
 * 상태에선 선택 표시만 유지한 채 전부 비활성화된다.
 */
type Props = {
  request: ChoiceRequest;
  reply?: Reply;
  frozen: boolean;
  onSubmit: (question: string, values: string[]) => void;
  onSkip: (question: string) => void;
};

export function ChoiceCard({ request, reply, frozen, onSubmit, onSkip }: Props) {
  const { question, options, multiSelect } = request;
  const repliedValues = reply && "values" in reply ? reply.values : null;
  const skipped = !!reply && "skipped" in reply;
  const [sel, setSel] = useState<string[]>(repliedValues ?? []);

  const selected = repliedValues ?? sel;
  const allOn = selected.length === options.length;

  function toggle(label: string) {
    if (frozen) return;
    if (!multiSelect) {
      setSel([label]);
      onSubmit(question, [label]);
      return;
    }
    setSel((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
  }

  function toggleAll() {
    if (frozen) return;
    setSel(allOn ? [] : options.map((o) => o.label));
  }

  function confirm() {
    if (frozen || sel.length === 0) return;
    onSubmit(question, sel);
  }

  function skip() {
    if (frozen) return;
    onSkip(question);
  }

  const allToggle = multiSelect ? (
    <button
      type="button"
      aria-pressed={allOn}
      disabled={frozen}
      onClick={toggleAll}
      className={
        "shrink-0 h-7 px-xs rounded-sm text-caption transition-colors focus:outline-none " +
        (allOn
          ? "bg-brand-primary/10 text-brand-primary font-medium"
          : "text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04") +
        (frozen ? " cursor-not-allowed" : "")
      }
    >
      전부 선택
    </button>
  ) : null;

  return (
    <div
      role="group"
      aria-label={question}
      className={
        "w-full max-w-[85%] flex flex-col gap-xxs rounded-lg border border-brand-hairline bg-brand-canvas px-md py-sm" +
        (frozen ? " opacity-60" : "")
      }
    >
      <div className="flex items-center gap-xxs">
        <span className="shrink-0 inline-flex items-center h-5 px-xs rounded-full bg-brand-primary/15 text-brand-primary text-caption font-medium">
          선택
        </span>
        <span className="flex-1 min-w-0 text-body-sm text-brand-ink">{question}</span>
        {allToggle}
      </div>

      {!frozen && (
        <p className="text-caption text-brand-muted">
          {multiSelect
            ? "아래 목록에서 골라 주세요 — 여러 개 선택할 수 있습니다."
            : "아래 목록에서 하나를 골라 주세요 — 고르면 바로 전송됩니다."}
        </p>
      )}

      <div className="flex flex-col">
        {options.map((opt, i) => (
          <OptionRow
            key={opt.label}
            index={i + 1}
            label={opt.label}
            caption={opt.description}
            selected={selected.includes(opt.label)}
            frozen={frozen}
            onClick={() => toggle(opt.label)}
          />
        ))}
      </div>

      {repliedValues || skipped ? (
        <p className="text-caption text-brand-muted">
          회신됨 — {skipped ? "답변 없이 진행" : repliedValues!.join(" / ")}
        </p>
      ) : (
        <div className="flex items-center gap-xs">
          <button
            type="button"
            disabled={frozen}
            onClick={skip}
            className="inline-flex items-center min-h-7 text-caption text-brand-muted-soft underline underline-offset-2 hover:text-brand-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 transition-colors disabled:cursor-not-allowed"
          >
            답변 없이 넘어가기
          </button>
          {multiSelect && (
            <>
              <span className="ml-auto text-caption text-brand-muted-soft">
                {sel.length > 0 ? `${sel.length}개 선택됨` : ""}
              </span>
              <button
                type="button"
                disabled={frozen || sel.length === 0}
                onClick={confirm}
                className="shrink-0 inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-canvas disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
              >
                선택 완료
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
