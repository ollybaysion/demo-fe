"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";
import { parseSnapshot, toQueryKey } from "@/lib/snapshot-parse";
import type { SnapshotParseError } from "@/lib/snapshot-parse";
import {
  SNAPSHOTS_STORAGE_KEY,
  autoLabel,
  findByContentHash,
  includedSnapshots,
  migrateSnapshots,
  pinnedSnapshots,
  removeSnapshot,
  setLabel as setLabelIn,
  toggleIncluded as toggleIncludedIn,
  togglePinned as togglePinnedIn,
  upsertFulfilling,
  upsertSnapshot,
} from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

/**
 * 데이터 스냅샷 패널의 상태.
 *
 * 규칙은 전부 `@/lib/snapshot-store` 의 순수 함수에 있고, 여기는 그것들에
 * `useState` 와 localStorage 를 두른 껍데기다. 서버는 관여하지 않는다 —
 * 등록·토글·삭제는 브라우저 안에서 끝난다.
 */

function newId(): string {
  // `snap-` 접두사 덕에 이 id 는 엔진 query_id 패턴을 그대로 만족한다 —
  // 라벨을 슬러그로 접을 수 없을 때 fallback 으로 쓸 수 있는 이유.
  return `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type AddSnapshotResult =
  | { ok: true; snapshot: DataSnapshot; replacedExisting: boolean }
  | ({ ok: false } & Omit<SnapshotParseError, "ok">);

export function useDataSnapshots() {
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  /**
   * 마지막으로 삭제된 스냅샷 — 실수로 지운 것을 한 번 되돌릴 수 있게 붙잡아 둔다.
   * 스냅샷은 SQL 재실행 없이는 다시 만들기 번거로운 데이터라, 삭제가 즉시
   * 확정되면 오클릭 한 번의 비용이 너무 크다. 메모리에만 든다(새로고침이면
   * 사라진다) — 휴지통을 만들 일은 아니고, 직후의 "앗" 을 구제하면 된다.
   */
  const [lastRemoved, setLastRemoved] = useState<DataSnapshot | null>(null);

  useEffect(() => {
    const stored = readJson<unknown>(SNAPSHOTS_STORAGE_KEY, null);
    const migrated = migrateSnapshots(stored);
    if (migrated.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSnapshots(migrated);
    }
  }, []);

  useEffect(() => {
    writeJson(SNAPSHOTS_STORAGE_KEY, snapshots);
  }, [snapshots]);

  /**
   * 붙여넣은 텍스트를 해석해 목록에 넣는다.
   *
   * 파싱이 치명적으로 실패하면 목록을 건드리지 않고 실패를 그대로 돌려준다 —
   * 호출부가 사용자에게 보여줄 수 있게. 같은 내용이 이미 있으면 새 항목을
   * 만들지 않고 기존 항목을 갱신한다(`replacedExisting`).
   *
   * 기본 포함값은 OFF 다. 등록만으로 요청이 무거워지지 않게, 동봉은 사용자가
   * 명시적으로 켠다. 예외는 요청 카드로 채운 경우인데(`opts.include`), 그건
   * 이미 "이 데이터가 필요하다"는 요구에 대한 응답이라 끄고 시작할 이유가 없다.
   *
   * `opts.queryKey` 를 주면 라벨에서 만들지 않고 그 값을 쓴다 — 요청 카드가 지정한
   * 키로 등록해야 백엔드가 충족 여부를 알아본다.
   */
  const addSnapshot = useCallback(
    (
      input: string,
      label: string,
      opts?: { include?: boolean; queryKey?: string },
    ): AddSnapshotResult => {
      const id = newId();
      const queryKey = opts?.queryKey ?? toQueryKey(label, id);
      const parsed = parseSnapshot(input, { queryKey });
      if (!parsed.ok) {
        return {
          ok: false,
          code: parsed.code,
          message: parsed.message,
          ...(parsed.where === undefined ? {} : { where: parsed.where }),
        };
      }

      const snapshot: DataSnapshot = {
        id,
        queryKey,
        // 이름이 비면 내용에서 만든다 — 등록을 붙여넣기만으로 끝내기 위해.
        label:
          label.trim() ||
          (parsed.columns.length > 0
            ? autoLabel(parsed.columns, parsed.rowCount)
            : queryKey),
        capturedAt: new Date().toISOString(),
        columns: parsed.columns,
        rows: parsed.rows,
        contentHash: parsed.contentHash,
        included: opts?.include === true,
        // 요청 충족은 "내용을 달라"는 요구에 대한 응답이라 📌 내용 푸시로 등록한다 —
        // 카탈로그만 실리면 모델은 표가 있다는 것만 알고 값은 보지 못한다.
        pinned: opts?.include === true,
        warnings: parsed.warnings,
      };

      // 중복 여부는 업데이터 밖에서 본다 — 업데이터는 순수해야 하고, 그 안에서
      // 값을 새어 나오게 하면 읽는 시점이 렌더 타이밍에 묶인다.
      const replacedExisting =
        findByContentHash(snapshots, snapshot.contentHash) !== undefined;
      setSnapshots((prev) =>
        opts?.include
          ? upsertFulfilling(prev, snapshot)
          : upsertSnapshot(prev, snapshot),
      );
      return { ok: true, snapshot, replacedExisting };
    },
    [snapshots],
  );

  const remove = useCallback(
    (id: string) => {
      const removed = snapshots.find((s) => s.id === id);
      if (removed) setLastRemoved(removed);
      setSnapshots((prev) => removeSnapshot(prev, id));
    },
    [snapshots],
  );

  /** 마지막 삭제를 되돌린다 — 토글 상태(동봉·📌)까지 지웠던 그대로. */
  const restoreLastRemoved = useCallback(() => {
    if (!lastRemoved) return;
    setSnapshots((prev) => upsertSnapshot(prev, lastRemoved));
    setLastRemoved(null);
  }, [lastRemoved]);

  const toggleIncluded = useCallback((id: string) => {
    setSnapshots((prev) => toggleIncludedIn(prev, id));
  }, []);

  const togglePinned = useCallback((id: string) => {
    setSnapshots((prev) => togglePinnedIn(prev, id));
  }, []);

  const setLabel = useCallback((id: string, label: string) => {
    setSnapshots((prev) => setLabelIn(prev, id, label));
  }, []);

  const clear = useCallback(() => {
    setSnapshots([]);
  }, []);

  return {
    snapshots,
    included: includedSnapshots(snapshots),
    pinned: pinnedSnapshots(snapshots),
    lastRemoved,
    addSnapshot,
    remove,
    restoreLastRemoved,
    toggleIncluded,
    togglePinned,
    setLabel,
    clear,
  };
}
