// 🏰 올린 성채 팩 목록 (📜 2026-11-14) — 앱 시작 때 한 번 받음(main.ts) · 교사가 올리기 · 숨기기 · 지우기를 하면 그 자리에서 바뀜(새로 고침 없이)
import type { CastlePack } from './castle';

export const castles = $state<{ list: CastlePack[] }>({ list: [] });
const sorted = (xs: CastlePack[]) => [...xs].sort((a, b) => a.floor - b.floor || (a.id < b.id ? -1 : 1));
/** 더하기 · 같은 id = 새 판이 대신함 */
export function addCastles(xs: CastlePack[]) { let l = castles.list.slice(); for (const p of xs) { const k = l.findIndex((x) => x.id === p.id); if (k >= 0) l.splice(k, 1, p); else l.push(p); } castles.list = sorted(l); }
export function removeCastle(id: string) { castles.list = castles.list.filter((x) => x.id !== id); }
export function setCastleHide(id: string, hide: boolean) { castles.list = castles.list.map((x) => (x.id === id ? { ...x, hide } : x)); }
/** 학생에게 보이는 층 (층 순서) */
export const visibleCastles = () => castles.list.filter((x) => !x.hide);
