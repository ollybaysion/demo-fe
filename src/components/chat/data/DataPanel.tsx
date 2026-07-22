"use client";

import { type ReactNode, useState } from "react";
import type { PendingRequest } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import { AddDataModal } from "./AddDataModal";
import { RequestCard } from "./RequestCard";
import { SnapshotCard } from "./SnapshotCard";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 데이터 패널 — 3분할 레이아웃의 좌측 상주 컬럼.
 *
 * NotebookLM 의 소스 패널 관례를 따른다(따라 그리진 않는다): 항상 떠 있고,
 * 추가는 헤더의 [+] 하나, 항목은 체크박스로 포함/제외. 접힌 패널 뒤에 숨어
 * 있던 시절의 "등록했는데 아무 일도 안 일어남" 문제가 상주로 풀린다 —
 * 등록 결과가 항상 눈앞에 있다.
 */
type Props = {
  snapshots: DataSnapshot[];
  /** 아직 채워지지 않은 데이터 요청 — 최상단에 카드로 뜬다. */
  requests: PendingRequest[];
  onAdd: (input: string) => AddSnapshotResult;
  onFulfill: (
    input: string,
    label: string,
    opts: { include: boolean; queryKey: string },
  ) => AddSnapshotResult;
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  /** 마지막으로 삭제된 스냅샷 — 있으면 목록 위에 되돌리기 스트립이 뜬다. */
  lastRemoved: DataSnapshot | null;
  onRestore: () => void;
};

export function DataPanel({
  snapshots,
  requests,
  onAdd,
  onFulfill,
  onToggleIncluded,
  onRemove,
  onRename,
  lastRemoved,
  onRestore,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const includedCount = snapshots.filter((s) => s.included).length;

  return (
    <aside
      aria-label="데이터 패널"
      className="shrink-0 w-[340px] h-full flex flex-col border-r border-brand-hairline bg-brand-canvas"
    >
      <div className="flex items-center justify-between px-lg h-16 border-b border-brand-hairline">
        <h2 className="font-sans text-title-md text-brand-ink">
          데이터
          {includedCount > 0 && (
            <span className="ml-xs text-caption text-brand-muted font-normal">
              {includedCount}개 포함
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="데이터 추가"
          title="데이터 추가"
          className="shrink-0 inline-flex items-center gap-xxs h-8 px-sm rounded-md border border-brand-hairline text-brand-ink text-body-sm hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <PlusIcon />
          추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 요청이 있으면 무엇보다 먼저 — 모델이 "이게 있어야 답한다"고 세운
            요구라, 보관 목록보다 위에 둔다. */}
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

        <div className="px-lg pt-md pb-md">
          {/* 실수 삭제 구제 — 스냅샷은 SQL 재실행 없이 다시 만들기 번거로워,
              삭제 직후 한 번은 그 자리에서 되돌릴 수 있어야 한다. */}
          {lastRemoved && (
            <div className="mb-xs flex items-center justify-between gap-xs rounded-md border border-brand-hairline bg-brand-surface-card px-sm py-xs">
              <span className="min-w-0 truncate text-caption text-brand-muted">
                “{lastRemoved.label}” 삭제됨
              </span>
              <button
                type="button"
                onClick={onRestore}
                className="shrink-0 text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
              >
                되돌리기
              </button>
            </div>
          )}

          {snapshots.length === 0 ? (
            <p className="text-caption text-brand-muted-soft">
              DB 에 붙지 못하는 상황이면, 직접 실행한 조회 결과를 [+ 추가]로
              붙여넣어 두세요. 체크된 데이터만 질문에 함께 나갑니다.
            </p>
          ) : (
            <div className="flex flex-col gap-xs">
              {snapshots.map((s) => (
                <SnapshotCard
                  key={s.id}
                  snapshot={s}
                  onToggleIncluded={onToggleIncluded}
                  onRemove={onRemove}
                  onRename={onRename}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddDataModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAdd}
      />
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-lg pt-md pb-md border-b border-brand-hairline-soft">
      <h3 className="font-sans text-body-sm font-medium text-brand-ink mb-sm">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
