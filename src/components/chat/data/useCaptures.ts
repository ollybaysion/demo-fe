"use client";

import { useCallback, useState } from "react";
import { newId } from "@/lib/id";
import type { BrowseGroup, ClassifyImageResponse, ScreenOption } from "@/lib/types";

export type CaptureStatus =
  | "classifying"
  | "awaiting"
  | "confirmed"
  | "none"
  | "failed";

export type CaptureScreen = { value: string; label: string };

export type CaptureItem = {
  id: string;
  dataUrl: string;
  capturedAt: number;
  status: CaptureStatus;
  screen?: CaptureScreen;
  candidates: ScreenOption[];
  browse: BrowseGroup[];
};

/**
 * 캡처 화면 분류 상태(#189) — 붙여넣은 캡처가 화면 하나로 확정될 때까지의
 * 로컬 상태만 쥔다. **메모리 보관만**(영속화 비범위) — `useDataRequests` 와 같은
 * 이유다: 새로고침해서 되살아나면 이미 지나간 분류가 패널에 유령으로 남는다.
 * 5MB data URL 은 애초에 localStorage 예산 밖이기도 하다.
 */
export function useCaptures() {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);

  /** 캡처 한 장을 등록한다 — `classifying` 으로 목록 맨 위에 선다. */
  const add = useCallback((dataUrl: string): string => {
    const id = newId("capture:");
    const item: CaptureItem = {
      id,
      dataUrl,
      capturedAt: Date.now(),
      status: "classifying",
      candidates: [],
      browse: [],
    };
    setCaptures((prev) => [item, ...prev]);
    return id;
  }, []);

  /** 분류 응답 도착 — 후보·카탈로그를 채우고 사람의 선택을 기다린다. */
  const resolve = useCallback((id: string, res: ClassifyImageResponse) => {
    setCaptures((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "awaiting", candidates: res.candidates, browse: res.browse }
          : c,
      ),
    );
  }, []);

  /** 네트워크 실패 — BE 는 항상 200 이므로 이건 요청 자체가 실패한 경우뿐이다. */
  const fail = useCallback((id: string) => {
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "failed" } : c)),
    );
  }, []);

  /** [다시 시도] — 같은 캡처로 분류를 다시 건다. 진행 중 표시만 여기서 하고, 실제
   * 재요청은 호출부(`classifyCapture` → `resolve`/`fail`)가 잇는다. */
  const retry = useCallback((id: string) => {
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "classifying" } : c)),
    );
  }, []);

  /**
   * 화면 확정 — 후보·④ 브라우저에서 고르면 `screen` 이 실리고(`confirmed`),
   * ⑤ "일치하는 화면이 없음" 이면 `null` 을 넘긴다(`none`, 화면 미지정).
   */
  const confirm = useCallback((id: string, screen: CaptureScreen | null) => {
    setCaptures((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: screen ? "confirmed" : "none", screen: screen ?? undefined }
          : c,
      ),
    );
  }, []);

  /** "다시 선택" — 이미 받은 후보·카탈로그는 그대로 두고 고르는 화면으로 되돌린다. */
  const reclassify = useCallback((id: string) => {
    setCaptures((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "awaiting", screen: undefined } : c,
      ),
    );
  }, []);

  return { captures, add, resolve, fail, retry, confirm, reclassify };
}
