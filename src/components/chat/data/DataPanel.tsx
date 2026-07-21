"use client";

import type { ReactNode } from "react";
import type { PendingRequest } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import { RequestCard } from "./RequestCard";
import { SnapshotAddForm } from "./SnapshotAddForm";
import { SnapshotCard } from "./SnapshotCard";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 데이터 스냅샷 패널 — 우측 슬롯의 세 번째 거주자.
 *
 * 폭은 `ContextPanel`·`SummaryPanel` 과 같은 320px 다. 같은 mutex 슬롯을 공유하는데
 * 폭이 다르면 패널을 바꿀 때마다 채팅 영역이 그 차이만큼 출렁이고, 핸들 스택의
 * `translate-x` 도 슬롯 폭에 맞춰 하드코딩돼 있다.
 */
type Props = {
  open: boolean;
  snapshots: DataSnapshot[];
  /** 아직 채워지지 않은 데이터 요청 — 최상단에 카드로 뜬다. */
  requests: PendingRequest[];
  onAdd: (input: string, label: string) => AddSnapshotResult;
  onFulfill: (
    input: string,
    label: string,
    opts: { include: boolean; queryKey: string },
  ) => AddSnapshotResult;
  onToggleIncluded: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onRemove: (id: string) => void;
};

export function DataPanel({
  open,
  snapshots,
  requests,
  onAdd,
  onFulfill,
  onToggleIncluded,
  onTogglePinned,
  onRemove,
}: Props) {
  const includedCount = snapshots.filter((s) => s.included).length;
  const pinnedCount = snapshots.filter((s) => s.included && s.pinned).length;

  return (
    <aside
      aria-label="데이터 스냅샷 패널"
      aria-hidden={!open}
      className={[
        "shrink-0 overflow-hidden",
        "transition-[width] duration-200 ease-out",
        open ? "w-[320px]" : "w-0",
        "border-l border-brand-hairline bg-brand-canvas",
      ].join(" ")}
    >
      <div className="w-[320px] h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {/* 요청이 있으면 무엇보다 먼저 — 보관이 비어 있어도 카드가 우선이다.
              모델이 "이게 있어야 답한다"고 세운 요구라, 등록 폼보다 위에 둔다. */}
          {requests.length > 0 && (
            <Section title={`요청받은 데이터 (${requests.length})`}>
              <div className="flex flex-col gap-xs">
                {requests.map((p) => (
                  <RequestCard
                    key={p.request.queryKey}
                    request={p.request}
                    onFulfill={onFulfill}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="스냅샷 등록">
            <SnapshotAddForm onAdd={onAdd} />
          </Section>

          <Section title={`보관 중 (${snapshots.length})`}>
            {snapshots.length === 0 ? (
              <p className="text-caption text-brand-muted-soft">
                DB 에 붙지 못하는 상황이면, 직접 실행한 조회 결과를 붙여넣어
                두세요. 동봉한 것만 질문에 함께 나갑니다.
              </p>
            ) : (
              <div className="flex flex-col gap-xs">
                {snapshots.map((s) => (
                  <SnapshotCard
                    key={s.id}
                    snapshot={s}
                    onToggleIncluded={onToggleIncluded}
                    onTogglePinned={onTogglePinned}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            )}
          </Section>

          {includedCount > 0 && (
            <Section title="요청에 실리는 것">
              <p className="text-caption text-brand-muted">
                {includedCount}개 동봉
                {pinnedCount > 0 && ` · 그중 ${pinnedCount}개는 표 전문 포함`}
              </p>
              <p className="text-caption text-brand-muted-soft mt-xxs">
                고정하지 않은 것은 목록만 알리고, 내용은 모델이 필요할 때
                가져갑니다.
              </p>
            </Section>
          )}
        </div>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-lg pt-lg pb-md border-b border-brand-hairline-soft last:border-b-0">
      <h2 className="font-sans text-title-md text-brand-ink mb-md">{title}</h2>
      {children}
    </section>
  );
}
