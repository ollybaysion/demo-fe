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
 */
export function ArtifactCard({
  artifact,
  defaultOpen = false,
}: {
  artifact: Artifact;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-brand-hairline bg-brand-canvas overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-xs px-sm py-xs text-left transition-colors hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      >
        <KindBadge kind={artifact.kind} />
        <span className="flex-1 min-w-0 truncate text-caption text-brand-ink">
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
          <span className="block truncate text-caption text-brand-primary underline underline-offset-2">
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
