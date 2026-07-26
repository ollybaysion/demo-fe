"use client";

import type { EquipmentCardModel } from "./equipment-cards.mock";

/**
 * 설비 확장 패널 — 카드의 [자세히]가 여는 화면.
 *
 * 떠 있는 오버레이가 아니라 **왼쪽 데이터 패널 자리를 넘겨받는다** — 데이터
 * 패널이 미끄러져 나가고 그 자리에서 더 넓게 펼쳐진다(자리 교대라서 슬라이드다).
 * 여닫이 애니메이션과 폭 전환은 호스트(ChatContainer)가 소유하고, 여기는 안쪽
 * 내용만 그린다.
 *
 * <p><b>내용은 아직 미정이다.</b> 자리·크기·여닫힘을 먼저 세워 감을 잡고,
 * 무엇을 담을지는 그다음에 정한다.
 */
type Props = {
  card: EquipmentCardModel | null;
  onClose: () => void;
};

export function EquipmentDetailDrawer({ card, onClose }: Props) {
  return (
    <aside
      aria-label="설비 확장 패널"
      aria-hidden={card === null}
      // 오른쪽 설비 패널과 **한 몸**으로 보여야 한다 — 오른쪽 모서리·테두리를
      // 비우고 붙어서, 둘이 합쳐 하나의 둥근 패널이 되게 한다.
      className="h-full w-full flex flex-col rounded-l-xl border border-r-0 border-brand-hairline bg-brand-canvas overflow-hidden"
    >
      {/* 높이·좌우 여백을 오른쪽 패널의 탭 줄(h-16 px-lg)과 똑같이 맞춘다 —
          제목선이 어긋나면 두 패널이 한 몸으로 안 읽힌다. */}
      <header className="h-16 shrink-0 px-lg border-b border-brand-hairline flex items-center justify-between gap-sm">
        <div className="min-w-0 flex items-center gap-xs">
          <h2 className="font-sans text-title-md text-brand-ink truncate">
            {card?.equipment ?? ""}
          </h2>
          {card && (
            <span className="shrink-0 text-caption text-brand-muted-soft">
              라인 {card.line}
            </span>
          )}
          {card && card.descriptors.length > 0 && (
            <span className="min-w-0 truncate text-caption text-brand-muted">
              {card.descriptors.join(" · ")}
            </span>
          )}
          {card?.status && (
            <span className="shrink-0 inline-flex items-center gap-[4px] text-caption text-brand-muted">
              <span
                className="w-[6px] h-[6px] rounded-full bg-brand-accent-teal"
                aria-hidden
              />
              {card.status}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="설비 확장 패널 닫기"
          title="닫기 — 데이터 패널로 돌아간다"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-lg py-lg">
        <div className="h-full min-h-[240px] rounded-lg border border-dashed border-brand-hairline flex items-center justify-center">
          <p className="text-caption text-brand-muted-soft">
            내용 미정 — 무엇을 담을지 정하는 중입니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
