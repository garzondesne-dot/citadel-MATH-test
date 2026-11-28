// 🎬 차원문 문 여는 영상 = 이 컴퓨터에 둔 파일 (📜 2026-11-28 선생님 「TV 컴퓨터에서 파일 고르기」)
//   교실 재생판(시판 음원 · 저작권) = 서버 · 저장소에 안 올림 → 종합실 ⚙ 에서 이 PC 의 mp4 를 한 번 고름 → IndexedDB 에 이 PC 만 기억
//   문 열기 때 고른 파일이 있으면 그 파일 · 없으면 게임판(GATE_ART.video) · 둘 다 없으면 그림 전환
//   IndexedDB 가 안 되면(사생활 창 등) 이번 창에서만 기억 · 다시 고르면 됨
const DB = 'citadel-gate-video', ST = 'v', KEY = 'door';
let mem: { blob: Blob; name: string } | null = null;
let url: string | null = null;

function open(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    } catch (e) { no(e); }
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  const db = await open();
  return new Promise((ok, no) => { const r = f(db.transaction(ST, mode).objectStore(ST)); r.onsuccess = () => ok(r.result as T); r.onerror = () => no(r.error); });
}
const setUrl = (b: Blob | null) => { if (url) URL.revokeObjectURL(url); url = b ? URL.createObjectURL(b) : null; return url; };

/** 고른 파일 기억 (이 PC) · 돌려줌 = 재생 주소 */
export async function pickDoorVideo(f: File): Promise<string> {
  mem = { blob: f, name: f.name };
  try { await tx('readwrite', (s) => s.put({ blob: f, name: f.name }, KEY)); } catch { /* 이번 창만 */ }
  return setUrl(f)!;
}
/** 기억한 파일 (없으면 null) */
export async function doorVideo(): Promise<{ url: string; name: string } | null> {
  if (!mem) { try { const v = await tx<{ blob: Blob; name: string }>('readonly', (s) => s.get(KEY)); if (v?.blob) mem = v; } catch { /* 없음 */ } }
  if (!mem) return null;
  return { url: url || setUrl(mem.blob)!, name: mem.name };
}
/** 지우기 */
export async function clearDoorVideo(): Promise<void> {
  mem = null; setUrl(null);
  try { await tx('readwrite', (s) => s.delete(KEY)); } catch { /* 없음 */ }
}
