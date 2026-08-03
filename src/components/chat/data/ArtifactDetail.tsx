"use client";

import type { Artifact } from "./artifacts";

/**
 * 그림 상세 — 확장 모드(#136)의 오른쪽 면. `SnapshotDetail` 의 그림판이다.
 *
 * 400px 카드 안의 그림은 "무엇이 찍혔는지"를 알아볼 수 없다. 붙여넣은 화면
 * 캡처는 읽으라고 올린 것이므로, 스냅샷의 표와 같은 자리에서 같은 크기로
 * 열린다 — 새 창으로 나가지 않고 채팅 옆에서 보며 질문을 잇게.
 *
 * 상세로 여는 산출물은 **그림뿐**이다. 표·차트·이력은 카드를 펼치면 이미
 * 제 렌더러로 다 보이고, 링크는 눌러서 나가는 것이라 크게 볼 것이 없다.
 */
export function ArtifactDetail({
  artifact,
}: {
  artifact: Artifact & { kind: "image" };
}) {
  const src = artifact.payload.dataUrl ?? artifact.payload.url;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="shrink-0 px-lg pt-md pb-sm border-b border-brand-hairline-soft">
        <h3
          className="min-w-0 break-words font-sans text-body-md font-medium text-brand-ink"
          title={artifact.label}
        >
          {artifact.label}
        </h3>
        <p className="mt-[2px] text-caption text-brand-muted">
          그림 ·{" "}
          {artifact.turn !== null ? `${artifact.turn}번째 답변` : "직접 올림"}
        </p>
      </div>

      {src ? (
        // 화면에 맞춰 줄이되 늘리지는 않는다 — 작은 캡처를 억지로 키우면
        // 뭉개진 그림을 원본으로 착각하게 된다. 큰 그림은 스크롤로 본다.
        <div className="flex-1 min-h-0 overflow-auto p-lg">
          {/* 원격 이미지도 오는 자리라 next/image 최적화를 쓰지 않는다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={artifact.payload.alt ?? artifact.payload.label}
            className="mx-auto max-w-full rounded-md border border-brand-hairline-soft bg-brand-surface-soft"
          />
        </div>
      ) : (
        <p className="px-lg py-md text-caption text-brand-muted-soft">
          이미지 주소가 없습니다.
        </p>
      )}
    </div>
  );
}
