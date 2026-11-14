// ⛓ 몬스터 공격 묶기 = 정식 자동 묶기 그대로 (📜 2026-11-14 선생님 「A로 해 줘」 · 정식 js/raid/combo.js bindFor · release fff1568)
//   묶기 사건: ✨ 퍼펙트(개인 연속 2 · 3 · 4초 · 보스 문항 1 · 1.5 · 2초) · 🔥 콤보 단계(10 · 20 · 30 = 3 · 5 · 8초) · 연습 공격(v3 전 방만) · ⛓ 묶기 카드(!bind = 3초)
//   상한 = 단계 시작부터 30초 창마다 10초 · 상한 밖 = ⚡ 필살기(!ult) 15초 · 🌟 진필살기 TRUE_SEC · 🛡 홀리 방패 HOLY_SEC · 형성평가 퍼펙트 필살기 15초
//   hits 가 없는 학생(소레이드 · 예전 기록) = 학생마다 bindOf(⛓ 카드 × 3초) 더함 — 정식과 같게(창 상한 + 그대로 더함)
//   🦇 황금 박쥐는 베타에 아직 없음 → 박쥐 사건 없음(정식도 박쥐가 안 나오면 같은 값)
//   hits/{uid}/{키} = { at, ac } (학생 폰이 공격할 때) · m_{몬스터}_{시도} · b{세트}_{문항}_{n}(정식도 아직 안 씀)
import type { LessonPack, Room } from '../model/types';
import { activeIds, bossState, BOSS_ID, HOLY_SEC, holyTimes, isTrue, record, TRUE_SEC } from './raid';

export const GAP = 40e3;
const TIER_BIND: Record<number, number> = { 10: 3, 20: 5, 30: 8 };
const PF_BIND = [2, 3, 4], BOSS_PF_BIND = [1, 1.5, 2];
const PRAC_PER = 1, PRAC_MAX = 4;
export const CAP_WIN = 30, CAP = 10, ULT_BIND = 15, BIND_TOKEN = 3;
const keys = (o: unknown) => Object.keys((o as object) || {});
const NEWR = (R: Room) => Number(R.meta.version || 0) >= 3;
type St = Room['state'] & { cpAt?: number | null; cpMs?: number; video?: unknown };
type Hits = Record<string, Record<string, { at: number; ac?: number; ok?: boolean }>>;
const hitsOf = (R: Room) => ((R as { hits?: Hits }).hits || {}) as Hits;

/** 🧑‍🏫 필살기 가능(용사 속성 Ⅲ · Ⅳ) — 화면 쪽(ui/fx/attack)이 알려 줌 · 시험 · 서버 계산은 없으면 false (정식 DS.Attack 없을 때와 같음) */
let canUlt: (fx: string, hero: number) => boolean = () => false;
export const setCanUlt = (f: (fx: string, hero: number) => boolean) => { canUlt = f; };

// ── 콤보 시계 (멈춘 시간을 뺀 시각) ──
export const pausedNow = (st: St | undefined) => !!(st && (st.focus || st.rest || st.video));
export function activeNow(R: Room, now: number): number {
  const st = (R.state || {}) as St;
  return now - (Number(st.cpMs) || 0) - (st.cpAt != null && pausedNow(st) ? Math.max(0, now - st.cpAt) : 0);
}
/** 집중 · 쉼터 · 영상을 바꿀 때 같이 적을 값 (next = 바뀐 뒤 state 일부) */
export function cpPatch(st0: St | undefined, next: Partial<St>, now: number): Partial<St> {
  const st = st0 || ({} as St), was = pausedNow(st), will = pausedNow({ ...st, ...next } as St);
  if (!was && will) return { cpAt: now };
  if (was && !will) return { cpAt: null, cpMs: (Number(st.cpMs) || 0) + Math.max(0, now - (st.cpAt != null ? st.cpAt : now)) };
  return {};
}

interface Ev { k: string; u: string | null; at: number; ac: number; m: string; kind: 'm' | 'b'; a?: number; correct?: number; total?: number; pf?: boolean; fx?: boolean; prac?: boolean; set?: number; i?: number; n?: number; ok?: boolean; streak?: number; bind?: number; combo?: number }
export interface Bind { at: number; sec: number; m: string; why: string; u?: string }
export function events(L: LessonPack, R: Room, now = Infinity): Ev[] {
  const out: Ev[] = [], hits = hitsOf(R);
  activeIds(R, Number.isFinite(now) ? now : Date.now()).forEach((u) => {
    const recs: Record<string, ReturnType<typeof record>> = {};
    Object.entries(hits[u] || {}).forEach(([k, h]) => {
      if (!h || typeof h.at !== 'number') return;
      const ac = typeof h.ac === 'number' ? h.ac : h.at;
      let mm = /^m_(.+)_(\d+)$/.exec(k);
      if (mm) {
        const mid = mm[1]!, a = Number(mm[2]); if (!L.monsters[mid]) return;
        const rec = recs[mid] || (recs[mid] = record(L, R, mid, u)); if (rec.chain) return;
        const t = rec.tries.find((x) => x.attempt === a); if (!t) return;
        const pAt = rec.perfectAt >= 0 ? rec.tries[rec.perfectAt]!.attempt : -1, all = t.total > 0 && t.correct === t.total;
        out.push({ k, u, at: h.at, ac, m: mid, kind: 'm', a, correct: t.correct, total: t.total, pf: a === 0 && all, fx: a > 0 && a === pAt, prac: pAt >= 0 && a > pAt });
        return;
      }
      mm = /^b([12])_(\d+)_(\d+)$/.exec(k);
      if (mm) out.push({ k, u, at: h.at, ac, m: 'boss', kind: 'b', set: Number(mm[1]), i: Number(mm[2]), n: Number(mm[3]), ok: !!h.ok });
    });
  });
  return out.sort((x, y) => x.at - y.at || String(x.u).localeCompare(String(y.u)) || x.k.localeCompare(y.k));
}
const tokBinds = (R: Room, mid: string, uid: string) => Object.values(R.heals?.[mid]?.[uid] || {}).filter((v) => typeof v === 'string' && v.startsWith('!bind')).map((v) => Number(String(v).split('@')[1]) || 0);
/** 한 번에: 퍼펙트 연속 · 콤보 사슬 · 묶기 사건 (정식 analyze · 박쥐 없음) */
export function analyze(L: LessonPack, R: Room, now = Infinity) {
  const ev = events(L, R, now), streak: Record<string, number> = {}, bstreak: Record<string, number> = {}, prac: Record<string, number> = {}, mastered: Record<string, boolean> = {}, binds: Bind[] = [];
  let cur = 0, lastAc: number | null = null, best = 0;
  const endChain = () => { if (cur > best) best = cur; cur = 0; };
  ev.forEach((e) => {
    let inc = 0;
    if (e.kind === 'm') {
      if (e.a === 0) streak[e.u!] = e.pf ? (streak[e.u!] || 0) + 1 : 0;
      if (e.pf) { e.streak = streak[e.u!]; e.bind = PF_BIND[Math.min(e.streak!, 3) - 1]; binds.push({ at: e.at, sec: e.bind!, m: e.m, why: 'pf', u: e.u! }); inc = 1; }
      if (e.fx) inc = 1;
      if (e.prac && !NEWR(R)) { const pk = `${e.u}|${e.m}`, had = prac[pk] || 0, s = Math.min(PRAC_MAX - had, (e.correct || 0) * PRAC_PER); if (s > 0) { prac[pk] = had + s; binds.push({ at: e.at, sec: s, m: e.m, why: 'prac', u: e.u! }); e.bind = s; } }
    } else {
      if (e.set === 1 && e.n === 0) {
        bstreak[e.u!] = e.ok ? (bstreak[e.u!] || 0) + 1 : 0;
        if (e.ok) { e.pf = true; e.streak = bstreak[e.u!]; e.bind = BOSS_PF_BIND[Math.min(e.streak!, 3) - 1]; binds.push({ at: e.at, sec: e.bind!, m: 'boss', why: 'pf', u: e.u! }); }
      }
      const mk = `${e.u}|${e.i}`;
      if (e.ok && !mastered[mk]) { mastered[mk] = true; inc = 1; }
    }
    if (!inc) return;
    if (lastAc != null && e.ac - lastAc > GAP) endChain();
    const before = cur; cur += inc; lastAc = e.ac;
    [10, 20, 30].forEach((t) => { if (before < t && cur >= t) binds.push({ at: e.at, sec: TIER_BIND[t]!, m: e.m, why: `tier${t}` }); });
    e.combo = cur;
  });
  if (NEWR(R)) Object.entries(R.heals || {}).forEach(([m, byU]) => Object.keys(byU || {}).forEach((u) => tokBinds(R, m, u).forEach((at) => { if (at <= now) binds.push({ at, sec: BIND_TOKEN, m, why: 'tok', u }); })));
  if (cur > best) best = cur;
  return { ev, binds, cur, lastAc, best };
}
/** 🔥 지금 콤보 (끊겼으면 0) */
export function comboNow(an: ReturnType<typeof analyze>, R: Room, now: number) {
  if (an.lastAc == null || !an.cur) return { n: 0, left: 0 };
  const gap = activeNow(R, now) - an.lastAc;
  return gap > GAP ? { n: 0, left: 0 } : { n: an.cur, left: Math.max(0, 1 - gap / GAP) };
}
/** ⛓ 묶기 합계 (초) — 정식 bindFor 그대로 (mid = 몬스터 id · 'boss') */
export function bindFor(L: LessonPack, R: Room, mid: string, now = Infinity, an?: ReturnType<typeof analyze>): number {
  const A = an || analyze(L, R, now), m = mid === BOSS_ID ? 'boss' : mid;
  const t0 = Number(R.state.stepAt) || 0, win: Record<number, number> = {};
  A.binds.filter((b) => b.m === m && b.at <= now).forEach((b) => { const w = Math.max(0, Math.floor((b.at - t0) / (CAP_WIN * 1000))); win[w] = (win[w] || 0) + b.sec; });
  let total = Object.values(win).reduce((a, s) => a + Math.min(CAP, s), 0);
  const ids = activeIds(R, Number.isFinite(now) ? now : Date.now());
  if (m !== 'boss') Object.values(R.heals?.[m] || {}).forEach((byK) => Object.values(byK || {}).forEach((v) => { if (v === '!ult') total += ULT_BIND; else if (isTrue(v)) total += TRUE_SEC; }));
  else if (L.boss) ids.forEach((u) => { const p = (R.players?.[u] || {}) as { fx?: string; hero?: number }, f = bossState(L, R, u).map((s) => s.first); if (f.length && f.every(Boolean) && canUlt(String(p.fx || ''), Number(p.hero) || 0)) total += ULT_BIND; });
  total += holyTimes(R, m === 'boss' ? BOSS_ID : m).length * HOLY_SEC;
  if (m !== 'boss' && L.monsters[m]) { const hits = hitsOf(R); ids.forEach((u) => { if (!keys(hits[u]).some((k) => k.startsWith(`m_${m}_`))) total += NEWR(R) ? tokBinds(R, m, u).length * BIND_TOKEN : 0; }); }
  return Math.round(total * 10) / 10;
}
