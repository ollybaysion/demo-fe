"use client";

import { useEffect, useState } from "react";
import type {
  CompareData,
  CompareWindowDays,
  EquipmentDetail,
} from "@/demo/equipment";

/**
 * 설비 상세 + 같은 model 의 동종설비 목록을 동시에 fetch.
 * 호출부는 hook 만 — fetch 경로 / 응답 처리 / loading 상태 일임.
 */
export function useEquipmentDetail(name: string): {
  detail: EquipmentDetail | undefined;
  peers: EquipmentDetail[];
} {
  const [detail, setDetail] = useState<EquipmentDetail | undefined>(undefined);
  const [peers, setPeers] = useState<EquipmentDetail[]>([]);

  useEffect(() => {
    if (!name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(undefined);
      setPeers([]);
      return;
    }
    let cancelled = false;
    const enc = encodeURIComponent(name);
    Promise.all([
      fetch(`/api/fdc/v1/equipment/${enc}`).then((r) =>
        r.ok ? (r.json() as Promise<EquipmentDetail>) : undefined,
      ),
      fetch(`/api/fdc/v1/equipment/${enc}/peers`).then((r) =>
        r.ok ? (r.json() as Promise<EquipmentDetail[]>) : [],
      ),
    ])
      .then(([d, p]) => {
        if (cancelled) return;
        setDetail(d);
        setPeers(p ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(undefined);
        setPeers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { detail, peers };
}

export function useCompareData(
  currentId: string,
  baselineId: string,
  recipe: string,
  windowDays: CompareWindowDays,
): CompareData | null {
  const [data, setData] = useState<CompareData | null>(null);

  useEffect(() => {
    if (!currentId || !baselineId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    let cancelled = false;
    const url =
      `/api/fdc/v1/equipment/${encodeURIComponent(currentId)}/compare?` +
      new URLSearchParams({
        peerId: baselineId,
        recipe,
        window: String(windowDays),
      }).toString();
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<CompareData>) : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId, baselineId, recipe, windowDays]);

  return data;
}
