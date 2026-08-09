"use client";

import { type FormEvent, useState } from "react";
import { inputKind } from "@/lib/date-input";
import type { InputRequest } from "@/lib/types";
import { DateTimeField } from "../DateTimeField";

/**
 * 입력 카드 — "스킬에 이 값 하나가 있어야 답할 수 있다"에 사용자가 답하는 자리.
 *
 * {@link ./RequestCard}(SQL 실행→표 붙여넣기)의 형제지만 훨씬 단순하다 — 스칼라
 * 값 하나(예: param_index)를 직접 타이핑한다. 자리는 **데이터 패널 최상단**(요청
 * 카드와 같은 섹션). 채운 값은 sticky `inputs` 로 들어가고, 요청된 입력이 전부
 * 채워지면 채팅 API 가 자동으로 다시 호출돼 분석이 이어진다("등록 완료" 타이핑
 * 불필요) — 스칼라는 값 하나라 왕복을 자동화한다.
 */
type Props = {
  request: InputRequest;
  onSubmit: (skill: string, key: string, value: string) => void;
};

export function InputCard({ request, onSubmit }: Props) {
  const [value, setValue] = useState("");
  // 날짜 인자면 타이핑 대신 달력으로 — 판별 재료는 key 와 사람이 읽는 문구 전부.
  const kind = inputKind(
    request.key,
    [request.label, request.description].filter(Boolean).join(" "),
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (v.length === 0) return;
    onSubmit(request.skill, request.key, v);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-brand-primary bg-brand-surface-card px-sm py-xs flex flex-col gap-xxs"
    >
      <div className="flex items-center gap-xxs">
        <span className="shrink-0 inline-flex items-center h-5 px-xs rounded-full bg-brand-primary/15 text-brand-primary text-caption font-medium">
          입력
        </span>
        <span className="flex-1 min-w-0 text-body-sm text-brand-ink truncate">
          {request.label}
        </span>
      </div>

      {request.description && (
        <p className="text-caption text-brand-muted">{request.description}</p>
      )}

      <div className="flex items-center gap-xs">
        {kind === "text" ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`${request.label} 입력`}
            placeholder="값을 입력하세요."
            className="flex-1 min-w-0 bg-brand-canvas text-brand-ink font-mono text-caption rounded-md border border-brand-hairline px-sm py-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <DateTimeField
              kind={kind}
              value={value}
              onChange={setValue}
              label={`${request.label} 입력`}
            />
          </div>
        )}
        <button
          type="submit"
          disabled={value.trim().length === 0}
          className="shrink-0 inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-canvas disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
        >
          입력
        </button>
      </div>
    </form>
  );
}
