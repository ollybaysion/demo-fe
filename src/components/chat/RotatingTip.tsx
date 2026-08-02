"use client";

import { useEffect, useState } from "react";
import { START_TIP_INTERVAL_MS, START_TIPS } from "@/config/startTips";

type Props = {
  /** 돌릴 문구. 기본은 빈 시작 화면용 `START_TIPS`. */
  tips?: readonly string[];
  /** 다음 문구로 넘어가는 간격(ms). */
  intervalMs?: number;
};

/**
 * 한 줄 가이드 팁 — 입력창 **바로 아래**에서 문구만 바뀐다.
 *
 * 자리가 곧 의미다: 무엇을 쓸 수 있는지 알려주는 말은 쓰는 칸 곁에 있어야
 * 눈에 든다. 화면 위쪽 여백에 두면 헤드라인의 딸림줄로 읽히고 만다.
 *
 * <p>자리를 옮기거나 늘리지 않는 이유: 안내는 배경이지 사건이 아니다.
 * 높이가 들썩이면 위의 입력창이 밀려 "뭔가 일어났나" 싶어진다. 그래서
 * 교체는 짧은 페이드 하나로 끝낸다.
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
      className="mt-sm text-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* key 가 곧 애니메이션 방아쇠 — 문구가 바뀌면 페이드가 처음부터 다시. */}
      <p key={index} className="animate-tip-fade text-body-md text-brand-muted">
        <span className="text-brand-muted-soft">팁 · </span>
        {tip}
      </p>
    </div>
  );
}
