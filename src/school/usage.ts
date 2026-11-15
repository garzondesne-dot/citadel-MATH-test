// 📈 활용 추이 기록 = 정식 js/raid/usage.js 그대로 옮김 (📜 2026-11-15 머리 🔨 「대시보드 = 옛 정식 그대로」 (a))
//   act/{반}/{날짜 YYYYMMDD}/{번호} = { v: 접속(하루 1) · r: 🎯 복습 풀이 · c: 🏰 성채 풀이 · f: 📕 오답 고침 · j: ⚔ 수업 참여 · at }
//   학생 기기가 자기 칸만 숫자를 더함 (가벼움 · 교사 대시보드만 읽음 · 학생 화면에는 안 나옴 · 성적 아님)
//   기록 시작 전 = ≈ 추정 (💎 log 의 복습 · 성채 · 이어하기 시각 + 허수아비 · 성채 방 마지막 시각) · 정식 perStudent 의 「그 전 7일」 늘 0 버그(주석이 else 를 삼킴)는 고쳐서 옮김
import type { Store } from '../model/types';

export type Act = { v?: number; r?: number; c?: number; f?: number; j?: number; pf?: number; at?: number; est?: number };
export type Days = Record<string, Record<string, Act>>;
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
const pad = (n: number) => String(n).padStart(2, '0');
/** 날짜 YYYYMMDD (KST) */
export const day = (t: number = Date.now()) => { const d = new Date(Number(t) + 9 * 3600e3); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; };
const fromYmd = (ymd: string, k = 0) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + k));
const toYmd = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
export const addDays = (ymd: string, k: number) => toYmd(fromYmd(ymd, k));
export const monday = (ymd: string) => { const d = fromYmd(ymd), w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return toYmd(d); };
export const actPath = (cls: string, num: number, t: number) => `act/${ck(cls)}/${day(t)}/${num}`;

/** 기록 하나 더하기 (기록은 덤 — 실패해도 게임은 그대로) */
export function bump(S: Store, cls: string, num: number, field: keyof Act, n = 1) {
  if (!cls || !num || S.kind !== 'server') return;
  try { const p = actPath(cls, num, S.now()), cur = S.get<Act>(p) || {}; S.set(p, { ...cur, [field]: (Number(cur[field]) || 0) + n, at: S.now() }); } catch { /* 무시 */ }
}
const once = (k: string) => { try { if (localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); return true; } catch { return true; } };
/** 🚪 접속 = 하루 한 번 */
export const visit = (S: Store, cls: string, num: number) => { if (cls && num && S.kind === 'server' && once(`citadel-act-v-${cls}-${num}-${day(S.now())}`)) bump(S, cls, num, 'v'); };
/** ⚔ 수업 참여 = 방마다 한 번 */
export const join = (S: Store, cls: string, num: number, code: string) => { if (cls && num && code && S.kind === 'server' && once(`citadel-act-j-${cls}-${num}-${code}`)) bump(S, cls, num, 'j'); };

type GemLog = Record<string, { log?: Record<string, { at?: number; why?: string }> } | null>;
type BonusAll = Record<string, Record<string, Record<string, { at?: number } | null> | null> | null>;
/** 기록을 시작하기 전 (≈ 추정): 💎 조각 기록(복습 해결 · 성채 · 이어하기)과 허수아비 · 성채 방 마지막 시각 */
export function backfill(gem: GemLog | null, bonus: BonusAll | null): Days {
  const est: Days = {};
  const add = (t: number | undefined, n: string, f: 'r' | 'c' | 'f') => { if (!t) return; const d = day(t), o = ((est[d] ||= {})[n] ||= { r: 0, c: 0, f: 0, est: 1 }); o[f] = (o[f] || 0) + 1; };
  for (const [n, g] of Object.entries(gem || {})) for (const [k, x] of Object.entries(g?.log || {})) { if (!x?.at) continue; if (/^review/.test(k)) add(x.at, n, 'f'); else if (/castle|eval|room/.test(k) || /성채/.test(x.why || '')) add(x.at, n, 'c'); else if (/rift/.test(k)) add(x.at, n, 'r'); }
  for (const [n, byL] of Object.entries(bonus || {})) for (const [lid, byM] of Object.entries(byL || {})) { if (lid === 'review' || lid === 'board') continue; for (const x of Object.values(byM || {})) if (x && x.at) add(x.at, n, /^eval/.test(lid) ? 'c' : 'r'); }
  return est;
}
/** 반 하나: { days, since(기록 시작일) } · 기록 전 날짜는 ≈ 추정으로 채움 */
export function loadUsage(S: Store, cls: string): { days: Days; since: string | null } {
  const k = ck(cls), act = S.get<Days>(`act/${k}`) || {}, days: Days = JSON.parse(JSON.stringify(act)), since = Object.keys(days).sort()[0] || null;
  const est = backfill(S.get<GemLog>(`gem/${k}`), S.get<BonusAll>(`bonus/${k}`));
  for (const [d, byN] of Object.entries(est)) { if (since && d >= since) continue; days[d] ||= {}; for (const [n, x] of Object.entries(byN)) days[d][n] = { ...x, ...(days[d][n] || {}) }; }
  for (const d of Object.keys(days)) { const byN = days[d] as unknown; if (Array.isArray(byN)) days[d] = Object.fromEntries(byN.map((x, i) => [String(i), x]).filter(([, x]) => x && typeof x === 'object')); }
  return { days, since };
}
const solvesOf = (x: Act) => (Number(x.r) || 0) + (Number(x.c) || 0) + (Number(x.f) || 0);
/** 주별 합계 (월요일 시작) */
export function weekly(days: Days, weeks = 8, today = day()) {
  const mon0 = monday(today), list = Array.from({ length: weeks }, (_, i) => addDays(mon0, -7 * (weeks - 1 - i)));
  return list.map((w) => {
    const s = { week: w, active: 0, solves: 0, visits: 0, fixes: 0, joins: 0, est: false }, who = new Set<string>(), vis = new Set<string>();
    for (let i = 0; i < 7; i++) { const byN = days[addDays(w, i)] || {}; for (const [n, x] of Object.entries(byN)) { if (!x || typeof x !== 'object') continue; const sv = solvesOf(x); s.solves += sv; s.fixes += Number(x.f) || 0; s.joins += Number(x.j) || 0; if (sv) who.add(n); if (x.v || sv || x.j) vis.add(n); if (x.est) s.est = true; } }
    s.active = who.size; s.visits = vis.size; return s;
  });
}
/** 학생별: 최근 7일 · 그 전 7일 수업 밖 풀이 · 마지막 활동일 (정식의 「그 전 7일」 늘 0 버그 고침) */
export function perStudent(days: Days, today = day()) {
  const out: Record<string, { now: number; prev: number; last: string; pf: number }> = {}, d7 = addDays(today, -6), d14 = addDays(today, -13);
  for (const [d, byN] of Object.entries(days)) for (const [n, x] of Object.entries(byN || {})) {
    if (!x || typeof x !== 'object') continue; // 🐞 번호가 1 부터 빽빽하면 서버가 배열로 줌([빈칸, 1번, …])
    const o = (out[n] ||= { now: 0, prev: 0, last: '', pf: 0 }), sv = solvesOf(x);
    if (d >= d7 && d <= today) { o.now += sv; o.pf += Number(x.pf) || 0; } else if (d >= d14 && d < d7) o.prev += sv;
    if ((x.v || sv || x.j) && d > o.last) o.last = d;
  }
  return out;
}
export const ymdLabel = (d: string) => `${+d.slice(4, 6)}/${+d.slice(6, 8)}`;
