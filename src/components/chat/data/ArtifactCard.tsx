"use client";

import { useState } from "react";
import { MessageChart } from "../paired/MessageChart";
import { MessageDataTable } from "../paired/MessageDataTable";
import { MessageEventTimeline } from "../paired/MessageEventTimeline";
import type { Artifact } from "./artifacts";

/**
 * 답변 산출물 한 장.
 *
 * 머리(이름 + 어느 답에서 나왔는지)는 늘 보이고, 본문은 접힌다 — 표 열 장이 전부
 * 펼쳐진 목록은 스크롤만 길어져 정작 찾는 것을 못 찾는다. 표·차트·타임라인은
 * 페어 패널이 쓰던 컴포넌트를 그대로 쓴다: 렌더 규칙(가로 스크롤·sticky 헤더·
 * 축 포맷)이 이미 그 안에 있고, 옮겼다고 달라질 이유가 없다.
 *
 * 확장 모드에서는 **그림**이 오른쪽 상세 면의 대상이 된다(`onSelect`) —
 * 400px 카드 안의 그림은 무엇이 찍혔는지 알아볼 수 없다. 스냅샷 카드와 같은
 * 마스터-디테일 관례다.
 */
export function ArtifactCard({
  artifact,
  defaultOpen = false,
  onSelect,
  selected = false,
  onRemove,
}: {
  artifact: Artifact;
  defaultOpen?: boolean;
  /** 확장 모드에서만 — 카드 클릭이 상세 면의 대상을 고른다. */
  onSelect?: () => void;
  /** 상세 면이 지금 보여주고 있는 카드. */
  selected?: boolean;
  /** 직접 올린 산출물에만 — 파생된 것은 지워도 다시 계산되어 되살아난다. */
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      onClick={onSelect}
      className={[
        "group rounded-lg border bg-brand-canvas overflow-hidden transition-all",
        onSelect ? "cursor-pointer" : "",
        selected
          ? "border-brand-primary/45 bg-brand-primary/5"
          : "border-brand-hairline",
      ].join(" ")}
    >
      <div className="flex items-center gap-xs px-sm py-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-xs text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
        >
          <KindBadge kind={artifact.kind} />
          <span className="flex-1 min-w-0 break-words text-caption text-brand-ink">
            {artifact.label}
          </span>
          {/* 어느 답에서 나왔는지 — 대화를 거슬러 올라가지 않고도 짚을 수 있게. */}
          {artifact.turn !== null && (
            <span className="shrink-0 text-[11px] leading-none text-brand-muted-soft">
              {artifact.turn}번째 답변
            </span>
          )}
          <Chevron open={open} />
        </button>

        {/* 삭제는 hover 에만 — 스냅샷 카드와 같은 관례(키보드 포커스엔 나타난다). */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${artifact.label} 삭제`}
            title="삭제"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-brand-ink-translucent-04 hover:text-brand-error focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity"
          >
            <XIcon />
          </button>
        )}
      </div>

      {open && (
        <div className="px-sm pb-sm pt-xxs">
          <Body artifact={artifact} />
        </div>
      )}
    </div>
  );
}

function Body({ artifact }: { artifact: Artifact }) {
  switch (artifact.kind) {
    case "table":
      return <MessageDataTable table={artifact.payload} defaultExpanded />;
    case "chart":
      return <MessageChart chart={artifact.payload} defaultExpanded />;
    case "timeline":
      return (
        <MessageEventTimeline timeline={artifact.payload} defaultExpanded />
      );
    case "image": {
      const src = artifact.payload.dataUrl ?? artifact.payload.url;
      if (!src) {
        return (
          <p className="text-caption text-brand-muted-soft">
            이미지 주소가 없습니다.
          </p>
        );
      }
      return (
        // 원격 이미지도 오는 자리라 next/image 최적화를 쓰지 않는다(도메인 화이트
        // 리스트를 사내 이미지 서버마다 늘려야 한다).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={artifact.payload.alt ?? artifact.payload.label}
          className="w-full rounded-md border border-brand-hairline-soft bg-brand-surface-soft"
        />
      );
    }
    case "link":
      return (
        <a
          href={artifact.payload.url}
          target="_blank"
          rel="noreferrer noopener"
          className="block rounded-md border border-brand-hairline-soft px-sm py-xs hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        >
          <span className="block break-all text-caption text-brand-primary underline underline-offset-2">
            {artifact.payload.url}
          </span>
          {artifact.payload.description && (
            <span className="mt-xxs block text-[11px] leading-[1.5] text-brand-muted">
              {artifact.payload.description}
            </span>
          )}
        </a>
      );
  }
}

/** 종류 표시 — 글자 두 자. 아이콘보다 짧고 뜻이 분명하다. */
function KindBadge({ kind }: { kind: Artifact["kind"] }) {
  const label: Record<Artifact["kind"], string> = {
    table: "표",
    chart: "차트",
    timeline: "이력",
    image: "그림",
    link: "링크",
  };
  return (
    <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-ink-translucent-04 px-[6px] py-[2px] text-[11px] leading-[1.5] text-brand-muted">
      {label[kind]}
    </span>
  );
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 text-brand-muted transition-transform",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
