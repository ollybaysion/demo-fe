/**
 * 스냅샷 영속화 — IndexedDB.
 *
 * localStorage 의 오리진당 ~5MB 한도는 큰 표 한 장이면 끝난다. 게다가 한도를
 * 넘으면 쓰기가 조용히 실패해(best-effort) 새로고침 때 말없이 증발한다 —
 * IndexedDB 는 디스크 기반 쿼터(수백MB~GB)라 이 벽이 사라진다. 진실원이
 * 브라우저라는 구조는 그대로다: BE 는 여전히 무상태고, 그릇만 커진다.
 *
 * 저장 모양: 스냅샷 1건 = 레코드 1건(`snapshots` 스토어, keyPath `id`).
 * 통짜 배열 한 덩이로 넣으면 체크 토글 한 번에 전체를 재직렬화하게 되는데,
 * 대용량이 이 전환의 이유라 그 낭비를 두지 않는다. 목록 순서는 배열이
 * 아니면 사라지므로 id 순서를 `meta` 스토어에 따로 든다.
 *
 * 쓰기는 diff 로 한다 — {@link computePersistPlan} 이 이전/다음 배열을 참조
 * 비교해 바뀐 레코드만 put, 사라진 id 만 delete. 스토어의 순수 함수들이
 * 안 바뀐 항목의 참조를 보존하기 때문에 성립하는 계약이다.
 *
 * IndexedDB 가 없거나(SSR·일부 시크릿 모드) 열기에 실패하면 localStorage 로
 * 후퇴한다 — 오늘까지의 동작이 그대로 안전망이 된다. 반대로 IndexedDB 가
 * 살아 있으면 첫 로드에서 localStorage 세대를 한 번 이관하고 지운다.
 */

import { readJson, removeKey, writeJson } from "@/lib/storage";
import { SNAPSHOTS_STORAGE_KEY, migrateSnapshots } from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

const DB_NAME = "fdc-agent";
const DB_VERSION = 1;
const STORE_SNAPSHOTS = "snapshots";
const STORE_META = "meta";
const META_ORDER_KEY = "snapshot-order";

function hasIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

/** 열린 연결은 재사용, 실패는 캐시하지 않는다(다음 호출이 재시도). */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open 실패"));
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB 트랜잭션 실패"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB 트랜잭션 중단"));
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB 요청 실패"));
  });
}

/**
 * 저장된 스냅샷 전부를 목록 순서대로 읽는다.
 *
 * IndexedDB 가 비어 있으면 localStorage 세대를 찾아 한 번 이관한다(성공 시
 * 옛 키 삭제) — 배포 전 데이터가 말없이 사라지지 않게. 레코드는 코드보다
 * 오래 사는 사용자 데이터라 {@link migrateSnapshots} 로 접어 손상 항목을
 * 조용히 건너뛴다.
 */
export async function loadSnapshots(): Promise<DataSnapshot[]> {
  if (typeof window === "undefined") return [];
  if (!hasIdb()) {
    return migrateSnapshots(readJson<unknown>(SNAPSHOTS_STORAGE_KEY, null));
  }
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_META], "readonly");
    const all = await reqResult<unknown[]>(
      tx.objectStore(STORE_SNAPSHOTS).getAll(),
    );
    const order = await reqResult<unknown>(
      tx.objectStore(STORE_META).get(META_ORDER_KEY),
    );
    const stored = applyOrder(migrateSnapshots(all), order);
    if (stored.length > 0) return stored;

    const legacy = migrateSnapshots(
      readJson<unknown>(SNAPSHOTS_STORAGE_KEY, null),
    );
    if (legacy.length === 0) return [];
    await replaceAllSnapshots(legacy);
    removeKey(SNAPSHOTS_STORAGE_KEY);
    return legacy;
  } catch {
    // IndexedDB 실패 → localStorage 후퇴(오늘까지의 동작).
    return migrateSnapshots(readJson<unknown>(SNAPSHOTS_STORAGE_KEY, null));
  }
}

/**
 * 상태 전이 하나를 저장소에 반영한다 — 바뀐 것만.
 *
 * 실패하면 localStorage 에 통짜로 쓴다(quota 초과면 그마저 조용히 실패하지만,
 * 그건 이 전환 이전의 바닥이지 새 구멍이 아니다).
 */
export async function persistSnapshots(
  prev: DataSnapshot[],
  next: DataSnapshot[],
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasIdb()) {
    writeJson(SNAPSHOTS_STORAGE_KEY, next);
    return;
  }
  const plan = computePersistPlan(prev, next);
  if (!plan.dirty) return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_META], "readwrite");
    const store = tx.objectStore(STORE_SNAPSHOTS);
    for (const id of plan.deletes) store.delete(id);
    for (const s of plan.puts) store.put(s);
    tx.objectStore(STORE_META).put(
      next.map((s) => s.id),
      META_ORDER_KEY,
    );
    await txDone(tx);
  } catch {
    writeJson(SNAPSHOTS_STORAGE_KEY, next);
  }
}

/**
 * 저장소를 이 목록으로 통째 교체한다 — 이관과 dev 시드가 쓰는 경로.
 * 성공하면 localStorage 세대도 지운다: 옛 키가 남아 있으면 다음 로드의
 * 이관 로직이 지운 데이터를 되살리는 사고가 난다.
 */
export async function replaceAllSnapshots(list: DataSnapshot[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasIdb()) {
    if (list.length === 0) removeKey(SNAPSHOTS_STORAGE_KEY);
    else writeJson(SNAPSHOTS_STORAGE_KEY, list);
    return;
  }
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_META], "readwrite");
    const store = tx.objectStore(STORE_SNAPSHOTS);
    store.clear();
    for (const s of list) store.put(s);
    tx.objectStore(STORE_META).put(
      list.map((s) => s.id),
      META_ORDER_KEY,
    );
    await txDone(tx);
    removeKey(SNAPSHOTS_STORAGE_KEY);
  } catch {
    if (list.length === 0) removeKey(SNAPSHOTS_STORAGE_KEY);
    else writeJson(SNAPSHOTS_STORAGE_KEY, list);
  }
}

/** 상태 전이 하나가 저장소에 요구하는 쓰기 — 순수 함수(테스트 대상). */
export function computePersistPlan(
  prev: DataSnapshot[],
  next: DataSnapshot[],
): {
  puts: DataSnapshot[];
  deletes: string[];
  orderChanged: boolean;
  dirty: boolean;
} {
  const prevById = new Map(prev.map((s) => [s.id, s]));
  const nextIds = new Set(next.map((s) => s.id));
  // 참조가 바뀐 항목만 쓴다 — 스토어 순수 함수들이 안 바뀐 항목의 참조를
  // 보존한다는 계약 위에 서 있다.
  const puts = next.filter((s) => prevById.get(s.id) !== s);
  const deletes = prev.filter((s) => !nextIds.has(s.id)).map((s) => s.id);
  const orderChanged =
    prev.length !== next.length || next.some((s, i) => prev[i]?.id !== s.id);
  return {
    puts,
    deletes,
    orderChanged,
    dirty: puts.length > 0 || deletes.length > 0 || orderChanged,
  };
}

/**
 * getAll(키 순서)로 읽은 목록을 저장된 id 순서로 되돌린다 — 순수 함수.
 * 순서 메타에 없는 항목은 뒤에 붙이고, 모르는 id 는 무시한다(둘 다
 * 메타가 어긋났을 때 데이터를 잃지 않는 쪽으로).
 */
export function applyOrder(
  list: DataSnapshot[],
  order: unknown,
): DataSnapshot[] {
  if (!Array.isArray(order)) return list;
  const byId = new Map(list.map((s) => [s.id, s]));
  const out: DataSnapshot[] = [];
  for (const id of order) {
    if (typeof id !== "string") continue;
    const s = byId.get(id);
    if (s) {
      out.push(s);
      byId.delete(id);
    }
  }
  for (const s of byId.values()) out.push(s);
  return out;
}
