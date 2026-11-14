// 🕘 최근 고른 차시 (📜 2026-11-14 선생님 「기본값을 최근 값으로」) — 이 기기 기억 · 최근 3개 · 앞 = 가장 최근
const KEY = 'ds.recentLessons';
export function recentLessons(): string[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 3) : []; } catch { return []; } }
export function pushRecent(id: string): string[] { const v = [id, ...recentLessons().filter((x) => x !== id)].slice(0, 3); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 막힘 */ } return v; }
