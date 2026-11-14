// 🔐 이 기기에 비밀값 기억 = 평문 0 (📜 2026-11-14 🐞 「종합실 입장할 때 비번 노출됨」 · 보안)
//   AES-GCM · 꺼낼 수 없는 키(extractable false)를 IndexedDB 에 두고 암호문만 저장 → localStorage · 개발자 도구에 비밀번호 글자가 보이지 않음
//   IndexedDB · crypto.subtle 이 없으면 기억하지 않음(평문으로 떨어뜨리지 않음)
const DB = 'citadel-secret', ST = 'box';
function idb(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch { ok(null); }
  });
}
const tx = <T>(db: IDBDatabase, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => new Promise<T | null>((ok) => { try { const q = f(db.transaction(ST, mode).objectStore(ST)); q.onsuccess = () => ok(q.result ?? null); q.onerror = () => ok(null); } catch { ok(null); } });
async function keyOf(db: IDBDatabase): Promise<CryptoKey | null> {
  const had = await tx<CryptoKey>(db, 'readonly', (s) => s.get('key')); if (had) return had;
  try { const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await tx(db, 'readwrite', (s) => s.put(k, 'key')); return k; } catch { return null; }
}
export async function boxSet(name: string, text: string | null): Promise<boolean> {
  const db = await idb(); if (!db) return false;
  if (text == null) { await tx(db, 'readwrite', (s) => s.delete(`v:${name}`)); return true; }
  const k = await keyOf(db); if (!k) return false;
  try { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text)); await tx(db, 'readwrite', (s) => s.put({ iv, ct }, `v:${name}`)); return true; } catch { return false; }
}
export async function boxGet(name: string): Promise<string> {
  const db = await idb(); if (!db) return '';
  const v = await tx<{ iv: Uint8Array; ct: ArrayBuffer }>(db, 'readonly', (s) => s.get(`v:${name}`)); if (!v) return '';
  const k = await keyOf(db); if (!k) return '';
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: v.iv as Uint8Array<ArrayBuffer> }, k, v.ct)); } catch { return ''; }
}
