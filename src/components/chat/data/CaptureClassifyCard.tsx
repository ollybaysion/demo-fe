"use client";

import { useState } from "react";
import { OptionRow } from "../OptionRow";
import type { BrowseGroup, ScreenOption } from "@/lib/types";
import type { CaptureItem, CaptureScreen } from "./useCaptures";

/**
 * 캡처 화면 분류 카드(#189, BE fdc-agent-be-spring#63 짝) — 붙여넣은 캡처가
 * 데이터로 수용되는 첫 관문. 확정 시안 A(원클릭 5행) + ④ 펼침 P3(2열 브라우저).
 *
 * 후보 1~3·④·⑤ 모두 **누르면 바로 확정**이다(확정 버튼 없음) — 오확정 방어는
 * 이후 검수 단계(표 확인·수정, 비범위)가 맡는다. 확정되면 카드는 요약 상태로
 * 접히고, "다시 선택"으로 로컬 상태만 되돌린다(재분류 왕복 없음).
 */
type Props = {
  capture: CaptureItem;
  onConfirm: (id: string, screen: CaptureScreen | null) => void;
  onReclassify: (id: string) => void;
  onRetry: (id: string) => void;
};

export function CaptureClassifyCard({
  capture,
  onConfirm,
  onReclassify,
  onRetry,
}: Props) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  if (capture.status === "confirmed" || capture.status === "none") {
    return (
      <div className="flex items-center gap-xs rounded-lg border border-brand-hairline bg-brand-surface-card px-sm py-xs">
        <Thumb dataUrl={capture.dataUrl} size="sm" />
        <span className="flex-1 min-w-0 text-body-sm text-brand-ink truncate">
          {capture.status === "confirmed"
            ? capture.screen!.label
            : "화면 미지정 — 표만 추출 예정"}
        </span>
        <button
          type="button"
          onClick={() => onReclassify(capture.id)}
          className="shrink-0 text-caption text-brand-primary underline underline-offset-2 hover:text-brand-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 rounded-sm"
        >
          다시 선택
        </button>
      </div>
    );
  }

  const altIndex = capture.candidates.length + 1;
  const noneIndex = capture.candidates.length + 2;

  return (
    <div className="flex flex-col gap-xs rounded-lg border border-brand-primary bg-brand-surface-card px-sm py-xs">
      <div className="flex items-start gap-sm">
        <Thumb dataUrl={capture.dataUrl} size="md" />
        <div className="flex-1 min-w-0 flex flex-col gap-[2px] pt-[1px]">
          <span className="text-body-sm font-medium text-brand-ink">
            붙여넣은 캡처
          </span>
          {capture.status === "classifying" && (
            <span className="flex items-center gap-xxs text-caption text-brand-muted">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand-muted/30 border-t-brand-primary"
              />
              화면을 확인하는 중…
            </span>
          )}
          {capture.status === "failed" && (
            <span className="text-caption text-brand-error">
              화면 확인에 실패했습니다.
            </span>
          )}
          {capture.status === "awaiting" && (
            <span className="text-caption text-brand-muted">
              화면을 선택하면 바로 표 추출을 시작합니다.
            </span>
          )}
        </div>
      </div>

      {capture.status === "failed" && (
        <button
          type="button"
          onClick={() => onRetry(capture.id)}
          className="self-start inline-flex items-center h-7 px-sm rounded-md border border-brand-hairline text-caption text-brand-ink hover:border-brand-primary hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          다시 시도
        </button>
      )}

      {capture.status === "awaiting" && (
        <>
          <p className="text-body-sm font-medium text-brand-ink">
            어느 화면의 캡처인가요?
          </p>

          <div className="flex flex-col gap-xs">
            {capture.candidates.map((opt, i) => (
              <OptionRow
                key={opt.value}
                index={i + 1}
                variant="tile"
                label={opt.label}
                caption={opt.caption}
                onClick={() =>
                  onConfirm(capture.id, { value: opt.value, label: opt.label })
                }
              />
            ))}

            {browseOpen ? (
              <BrowsePanel
                index={altIndex}
                browse={capture.browse}
                activeGroup={activeGroup ?? capture.browse[0]?.group ?? null}
                onSelectGroup={setActiveGroup}
                onPick={(opt) =>
                  onConfirm(capture.id, { value: opt.value, label: opt.label })
                }
                onCollapse={() => setBrowseOpen(false)}
              />
            ) : (
              <OptionRow
                index={altIndex}
                variant="tile-quiet"
                label="직접 목록에서 선택"
                caption="등록된 전체 화면 목록에서 찾습니다"
                onClick={() => {
                  setBrowseOpen(true);
                  setActiveGroup(capture.browse[0]?.group ?? null);
                }}
              />
            )}

            <OptionRow
              index={noneIndex}
              variant="tile-quiet"
              label="일치하는 화면이 없음"
              caption="화면을 지정하지 않고, 캡처에 보이는 표만 추출합니다"
              onClick={() => onConfirm(capture.id, null)}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** ④ 펼침 — P3(2열 브라우저). 왼쪽 프로그램, 오른쪽 그 프로그램의 화면. */
function BrowsePanel({
  index,
  browse,
  activeGroup,
  onSelectGroup,
  onPick,
  onCollapse,
}: {
  index: number;
  browse: BrowseGroup[];
  activeGroup: string | null;
  onSelectGroup: (group: string) => void;
  onPick: (opt: ScreenOption) => void;
  onCollapse: () => void;
}) {
  const active = browse.find((g) => g.group === activeGroup) ?? browse[0];

  return (
    <div className="rounded-md border border-brand-primary bg-brand-canvas overflow-hidden">
      <button
        type="button"
        onClick={onCollapse}
        className="flex items-center gap-sm w-full text-left px-sm py-xs bg-brand-primary/5 border-b border-brand-hairline hover:bg-brand-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      >
        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/15 text-brand-primary-active font-mono text-[11px] leading-none">
          {index}
        </span>
        <span className="flex-1 min-w-0 text-body-sm text-brand-ink">
          직접 목록에서 선택
        </span>
        <span className="shrink-0 text-brand-muted text-caption" aria-hidden>
          ▴
        </span>
      </button>

      <div className="flex items-stretch max-h-40">
        <div className="w-[110px] shrink-0 bg-brand-surface-soft border-r border-brand-hairline overflow-y-auto">
          {browse.map((g) => (
            <button
              key={g.group}
              type="button"
              onClick={() => onSelectGroup(g.group)}
              className={
                "block w-full text-left px-sm py-xs text-caption transition-colors border-b border-brand-hairline-soft " +
                (g.group === active?.group
                  ? "bg-brand-canvas text-brand-primary-active font-semibold border-l-2 border-l-brand-primary"
                  : "text-brand-muted hover:text-brand-ink")
              }
            >
              {g.group}
            </button>
          ))}
        </div>
        <ul className="flex-1 min-w-0 overflow-y-auto">
          {(active?.options ?? []).map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onPick(opt)}
                className="flex items-center justify-between gap-xs w-full text-left px-sm py-xs text-caption text-brand-body border-b border-brand-hairline-soft hover:bg-brand-primary/5 hover:text-brand-ink transition-colors"
              >
                <span className="truncate">{opt.label}</span>
                <span className="shrink-0 text-brand-muted-soft" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="px-sm py-[6px] text-[11px] text-brand-muted-soft border-t border-dashed border-brand-hairline-soft">
        화면을 누르면 바로 확정됩니다
      </p>
    </div>
  );
}

function Thumb({ dataUrl, size }: { dataUrl: string; size: "sm" | "md" }) {
  return (
    // 붙여넣은 캡처는 브라우저 로컬 data URL 이라 next/image 최적화 대상이 아니다
    // (ArtifactCard 의 그림 렌더와 같은 이유).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="붙여넣은 캡처"
      className={
        (size === "sm" ? "w-9 h-9" : "w-16 h-12") +
        " shrink-0 rounded-md border border-brand-hairline object-cover bg-brand-surface-soft"
      }
    />
  );
}
