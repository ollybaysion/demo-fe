"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { maybeApplyDevSeed } from "@/lib/dev-seed";
import { loadSnapshots, persistSnapshots } from "@/lib/snapshot-idb";
import { parseSnapshot, toQueryKey } from "@/lib/snapshot-parse";
import type { SnapshotParseError } from "@/lib/snapshot-parse";
import {
  autoLabel,
  findByContentHash,
  includedSnapshots,
  removeSnapshot,
  setLabel as setLabelIn,
  setSourceSql as setSourceSqlIn,
  toggleIncluded as toggleIncludedIn,
  upsertFulfilling,
  upsertSnapshot,
} from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

/**
 * 데이터 스냅샷 패널의 상태.
 *
 * 규칙은 전부 `@/lib/snapshot-store` 의 순수 함수에 있고, 여기는 그것들에
 * `useState` 와 IndexedDB(`@/lib/snapshot-idb`)를 두른 껍데기다. 서버는
 * 관여하지 않는다 — 등록·토글·삭제는 브라우저 안에서 끝난다.
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

  /**
   * 저장소에 반영된 마지막 상태 — 쓰기 diff 의 기준점.
   * `null` 은 아직 로드 전이라는 뜻이고, 그동안의 쓰기는 미룬다(로드가
   * 끝나면 그 시점 상태와의 diff 로 한꺼번에 따라잡는다).
   */
  const persistedRef = useRef<DataSnapshot[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // dev 전용: ?seed=20 으로 열면 스토리지를 시드로 채운 뒤 읽는다.
      await maybeApplyDevSeed();
      const stored = await loadSnapshots();
      if (cancelled) return;
      persistedRef.current = stored;
      // 로드가 비동기라 그 사이 사용자가 이미 등록했을 수 있다 — 덮지 말고
      // 저장분 위에 얹는다(사용자 쪽이 최신). 다음 쓰기 diff 가 얹힌 것을
      // 저장소로 따라잡는다.
      setSnapshots((current) =>
        current.length === 0
          ? stored
          : current.reduce((acc, s) => upsertSnapshot(acc, s), stored),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const prev = persistedRef.current;
    if (prev === null || prev === snapshots) return;
    persistedRef.current = snapshots;
    void persistSnapshots(prev, snapshots);
  }, [snapshots]);

  /**
   * 붙여넣은 텍스트를 해석해 목록에 넣는다.
   *
   * 파싱이 치명적으로 실패하면 목록을 건드리지 않고 실패를 그대로 돌려준다 —
   * 호출부가 사용자에게 보여줄 수 있게. 같은 내용이 이미 있으면 새 항목을
   * 만들지 않고 기존 항목을 갱신한다(`replacedExisting`).
   *
   * 기본 포함값은 ON 이다 — 등록했다는 건 쓰겠다는 뜻이다(NotebookLM 이 소스를
   * 추가하면 기본 선택하는 것과 같은 관례). 무겁다 싶으면 체크를 해제한다.
   *
   * `opts.queryKey` 를 주면 라벨에서 만들지 않고 그 값을 쓴다 — 요청 카드가 지정한
   * 키로 등록해야 백엔드가 충족 여부를 알아본다.
   */
  const addSnapshot = useCallback(
    (
      input: string,
      label: string,
      opts?: { include?: boolean; queryKey?: string; sourceSql?: string },
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
          (parsed.columns.length > 0 ? autoLabel(parsed.columns) : queryKey),
        capturedAt: new Date().toISOString(),
        columns: parsed.columns,
        rows: parsed.rows,
        contentHash: parsed.contentHash,
        included: true,
        warnings: parsed.warnings,
        ...(opts?.sourceSql?.trim() ? { sourceSql: opts.sourceSql.trim() } : {}),
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

  const setLabel = useCallback((id: string, label: string) => {
    setSnapshots((prev) => setLabelIn(prev, id, label));
  }, []);

  /** 출처 쿼리 달기/고치기/지우기(`undefined` = 지움) — 테이블 칩이 여기서 파생된다. */
  const setSourceSql = useCallback((id: string, sql: string | undefined) => {
    setSnapshots((prev) => setSourceSqlIn(prev, id, sql));
  }, []);

  const clear = useCallback(() => {
    setSnapshots([]);
  }, []);

  return {
    snapshots,
    included: includedSnapshots(snapshots),
    lastRemoved,
    addSnapshot,
    remove,
    restoreLastRemoved,
    toggleIncluded,
    setLabel,
    setSourceSql,
    clear,
  };
}
