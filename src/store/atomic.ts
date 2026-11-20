import type { Store } from '../model/types';
// 🐞 11/20 ① 받기 전 빈 값 · ② 통째로 덮어쓰기 — 저장 꽂개마다 같은 뜻으로 (서버 = increment · transaction · 이 기기 · 메모리 = 읽고 씀)

/** 그 칸 덩어리를 서버에서 받았나 (이 기기 · 메모리 = 늘 받음) */
export const isReady = (S: Pick<Store, 'loaded'>, path: string) => !S.loaded || S.loaded(path);
/** 칸들을 다 받을 때까지 기다림 (ms 넘으면 false · 받기 전 값으로 판단하지 않게) */
export function whenReady(S: Store, paths: string[], ms = 15000): Promise<boolean> {
  if (paths.every((p) => isReady(S, p))) return Promise.resolve(true);
  for (const p of paths) void S.get(p); // 받기 시작
  return new Promise((res) => {
    const t0 = Date.now(), tick = setInterval(() => { if (paths.every((p) => isReady(S, p))) { clearInterval(tick); res(true); } else if (Date.now() - t0 > ms) { clearInterval(tick); res(false); } }, 100);
  });
}
/** 수 칸에 n 더하기 */
export function addTo(S: Store, path: string, n: number): void {
  if (!Number.isFinite(n) || !n) return;
  if (S.add) { S.add(path, n); return; }
  S.set(path, (Number(S.get(path)) || 0) + n);
}
/** 최신 값에서 고쳐 쓰기 (fn = undefined 면 안 씀) */
export async function txOn<T>(S: Store, path: string, fn: (cur: T | null) => T | null | undefined): Promise<boolean> {
  if (S.tx) return S.tx<T>(path, fn);
  const v = fn(S.get<T>(path)); if (v === undefined) return false; S.set(path, v); return true;
}
