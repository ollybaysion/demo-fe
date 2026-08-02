"use client";

import { useEffect, useState } from "react";
import { START_TIP_INTERVAL_MS, START_TIPS } from "@/config/startTips";

type Props = {
  /** 돌릴 문구. 기본은 빈 시작 화면용 `START_TIPS`. */
  tips?: readonly string[];
  /** 다음 문구로 넘어가는 간격(ms). */
  intervalMs?: number;
};

/** 네 갈래 스파크 — 브랜드의 spike-mark 결을 한 글자 크기로 줄인 것. */
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0.5c0.35 2.6 1.2 4.35 2.55 5.25S13.4 7.15 15.5 8c-2.1 0.85-3.6 1.35-4.95 2.25S8.35 12.9 8 15.5c-0.35-2.6-1.2-4.35-2.55-5.25S2.6 8.85 0.5 8c2.1-0.85 3.6-1.35 4.95-2.25S7.65 3.1 8 0.5z" />
    </svg>
  );
}

/**
 * 한 줄 가이드 팁 — 한자리에서 문구만 바뀐다.
 *
 * 존재감은 면이 아니라 글자가 낸다: 배경도 테두리도 없이 22px 잉크색이면
 * 충분하다. 카드나 배너로 두르면 왼쪽 데이터 패널의 카드들과 같은 무게가
 * 되어, 시작 화면이 카드 밭이 된다. 색은 아이콘 하나에만 준다.
 *
 * <p>글꼴은 `--font-hero-body`(설정 > 시작 화면 글꼴)를 따른다 — 바로 아래
 * 제목과 한 세트로 움직여야 얼굴이 갈리지 않는다.
 *
 * <p>자리를 옮기거나 높이를 늘리지 않는 이유: 안내는 배경이지 사건이 아니다.
 * 높이가 들썩이면 이웃한 것들이 밀려 "뭔가 일어났나" 싶어진다. 그래서 교체는
 * 짧은 페이드 하나로 끝낸다.
 *
 * <p>읽는 중에 바뀌지 않도록 마우스를 올리면 멈춘다. 움직임을 줄이도록
 * 설정한 사람에게는 페이드 없이 문구만 바뀐다(globals.css 의
 * `prefers-reduced-motion` 블록).
 *
 * <p>낭독은 하지 않는다 — 스스로 바뀌는 문구를 live region 으로 두면 읽던
 * 문장을 끊는다. 화면에 있는 한 줄을 그대로 읽어 가는 것으로 족하다.
 */
export function RotatingTip({
  tips = START_TIPS,
  intervalMs = START_TIP_INTERVAL_MS,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // 문구가 하나뿐이면 돌 것이 없다 — 타이머도 두지 않는다.
    if (tips.length < 2 || paused) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % tips.length),
      intervalMs,
    );
    return () => clearInterval(timer);
  }, [tips.length, intervalMs, paused]);

  if (tips.length === 0) return null;

  // 목록이 갈리며 짧아져도 빈 자리가 나오지 않게 — 인덱스는 항상 안쪽으로.
  const tip = tips[index % tips.length];

  return (
    <div
      className="flex justify-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* key 가 곧 애니메이션 방아쇠 — 문구가 바뀌면 페이드가 처음부터 다시. */}
      <p
        key={index}
        className="animate-tip-fade inline-flex items-center gap-xs text-brand-ink"
        style={{
          fontFamily: "var(--font-hero-body)",
          fontWeight: "var(--font-hero-body-weight)" as unknown as number,
          fontSize: 22,
        }}
      >
        <SparkIcon className="h-[18px] w-[18px] shrink-0 text-brand-primary" />
        {tip}
      </p>
    </div>
  );
}
