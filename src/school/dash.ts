import { makeRng } from '../engine/rng';
import type { Store } from '../model/types';
import { CLASSES, isExcluded, roster } from './school';
import { MIS, seteukDraft, type SeteukIn } from './seteuk';

// 📊 학생 기록 계산 (#124 학생 한 명 시트 · #125 대시보드) — 정식 js/raid/dash.js build() 를 같은 계산으로 옮김
//   records[번호][차시] = { conc: { 개념: [첫 시도 맞힘, 문항] }, names, boss(형성평가 첫 시도 맞힘), bossN, mis: { 오개념 코드: [틀림, 고침] } }
//   테스트 판 = 서버 기록이 없어 가짜 기록(반 · 번호로 늘 같은 값 · fakeClass) · 출시 때 서버 꽂개로 바꿈
export interface LessonRec { conc: Record<string, [number, number]>; names: Record<string, string>; boss: number; bossN: number; mis?: Record<string, [number, number]>; no: number; star?: boolean; fixedBy?: 'bonus' | null }
export type Records = Record<number, Record<string, LessonRec>>;
export interface Stud {
  cls: string; n: number; name: string; rec: Record<string, LessonRec>; went: number; heldN: number;
  part: number | null; boss: number | null; bossRaw: [number, number]; first: number | null; firstRaw: [number, number];
  conc: Record<string, { name: string; lesson: string; ok: number; total: number }>; std: Record<string, [number, number]>; mis: Record<string, [number, number]>;
  xp: number; lv: number; left: number; tries: number; x: boolean;
  /** 시트 · 대시보드 덧붙임 (테스트 판 가짜) */ extra: Extra;
}
export interface Extra { days: number[]; solves: number; fixes: number; gem: number; gemWeek: number; scroll: number; photoOk: number; photoRe: number; submit: number; stuck: number; sym: number; weekly: number[];
  /** 세특 기록 (정식 build 칸) */ hg: number; hints: number; tryEval: number; trySet: number; noteDone: number; cards: number; surveyed: boolean }
export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : null);
/** 성취기준 (정식 DS.Standards.of 자리 · 테스트 판 = 차시 묶음 셋) */
export const STANDARDS = [
  { id: '10공수2-02-01', name: '집합의 뜻 · 포함 관계', lessons: [2, 3] },
  { id: '10공수2-02-02', name: '집합의 연산', lessons: [4, 5, 6] },
  { id: '10공수2-02-03', name: '명제와 조건', lessons: [7, 8, 9, 10] },
];
const stdOf = (no: number) => STANDARDS.find((s) => s.lessons.includes(no))?.id ?? null;
export { MIS } from './seteuk';
const LESSONS = [
  { id: 'set-02', no: 2, title: '집합의 표현', concs: ['원소', '조건제시법', '원소의 개수'] },
  { id: 'set-03', no: 3, title: '포함 관계', concs: ['부분집합', '진부분집합', '부분집합의 개수'] },
  { id: 'set-04', no: 4, title: '교집합 · 합집합', concs: ['교집합', '합집합', '서로소'] },
  { id: 'set-05', no: 5, title: '여집합 · 차집합', concs: ['연산 법칙', '여집합', '차집합'] },
  { id: 'set-06', no: 6, title: '드모르간', concs: ['드모르간', '원소의 개수', '생활 속'] },
  { id: 'set-07', no: 7, title: '명제', concs: ['명제', '조건', '진리집합'] },
];
export const LESSON_LIST = LESSONS;
const level = (xp: number) => Math.max(1, Math.min(20, Math.floor(Math.sqrt(xp / 40)) + 1));

/** 정식 build(): 수업한 차시 = 기록이 하나라도 있는 차시 · 학생마다 참여 · 형성평가 첫 시도 · 개념 첫 시도 · 성취기준 · 오개념 */
export function build(cls: string, byN: Record<number, string>, records: Records, xp: Record<number, number>, extra: Record<number, Extra>, x: (n: number) => boolean) {
  const ns = Object.keys(byN).map(Number).filter(Boolean).sort((a, b) => a - b);
  const held = [...new Set(ns.flatMap((n) => Object.keys(records[n] || {})))].map((id) => ({ id, no: LESSONS.find((l) => l.id === id)?.no ?? 0, title: LESSONS.find((l) => l.id === id)?.title ?? id })).sort((a, b) => a.no - b.no);
  const studs: Stud[] = ns.map((n) => {
    const rec = records[n] || {}, went = held.filter((l) => rec[l.id]);
    let ok = 0, tot = 0, bo = 0, bt = 0;
    const conc: Stud['conc'] = {}, std: Stud['std'] = {}, mis: Stud['mis'] = {};
    went.forEach((l) => {
      const r = rec[l.id] as LessonRec;
      Object.entries(r.conc || {}).forEach(([c, v]) => { ok += v[0]; tot += v[1]; conc[`${l.id}|${c}`] = { name: r.names?.[c] || c, lesson: l.id, ok: v[0], total: v[1] }; const sd = stdOf(l.no); if (sd) { const a = (std[sd] = std[sd] || [0, 0]); a[0] += v[0]; a[1] += v[1]; } });
      Object.entries(r.mis || {}).forEach(([k, v]) => { const a = (mis[k] = mis[k] || [0, 0]); a[0] += v[0]; a[1] += v[1]; });
      bo += Math.min(Number(r.boss) || 0, Number(r.bossN) || 0); bt += Number(r.bossN) || 0;
    });
    const e = extra[n] as Extra;
    const left = went.reduce((a, l) => { const r = rec[l.id] as LessonRec; return a + Math.max(0, r.bossN - r.boss); }, 0);
    return { cls, n, name: byN[n] as string, rec, went: went.length, heldN: held.length, part: pct(went.length, held.length), boss: pct(bo, bt), bossRaw: [bo, bt], first: pct(ok, tot), firstRaw: [ok, tot], conc, std, mis, xp: xp[n] || 0, lv: level(xp[n] || 0), left, tries: e.solves, x: x(n), extra: e };
  });
  return { held, studs };
}
/** 성취도 = 성취기준마다 첫 시도 비율의 평균 · 도달 ≥ 80 · 근접 ≥ 60 · 미달 */
export const achieve = (s: Stud) => { const v = Object.values(s.std).filter((a) => a[1]).map((a) => (100 * a[0]) / a[1]); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
export const band = (v: number | null) => (v == null ? '' : v >= 80 ? '도달' : v >= 60 ? '근접' : '미달');

/** 🧪 테스트 판 가짜 기록 — 반 · 번호로 늘 같은 값 (실제 학생 아님) */
const cache = new Map<string, ReturnType<typeof build>>();
export function fakeClass(S: Store | null, cls: string) {
  const k = `${cls}|${S ? JSON.stringify(S.get(`school/roster/${cls}`) || {}) : ''}|${S ? JSON.stringify(S.get('school/test') || {}) : ''}|${S?.get('school/cls') ? JSON.stringify(S.get('school/cls')) : ''}`;
  const hit = cache.get(k); if (hit) return hit;
  const ci = CLASSES.indexOf(cls), held = LESSONS.slice(0, 4 + (ci % 3));
  const byN: Record<number, string> = {}, records: Records = {}, xp: Record<number, number> = {}, extra: Record<number, Extra> = {};
  for (const p of roster(cls, S)) {
    const r = makeRng(`fake|${cls}|${p.num}`), skill = 0.45 + 0.5 * r(), diligence = 0.3 + 0.7 * r();
    byN[p.num] = p.name; records[p.num] = {}; xp[p.num] = Math.round(200 + 3000 * skill * diligence);
    held.forEach((l) => {
      if (r() < 0.08 * (1.4 - diligence)) return; // 불참
      const conc: LessonRec['conc'] = {}, mis: LessonRec['mis'] = {};
      l.concs.forEach((c) => { const t = 2 + Math.floor(r() * 3); conc[c] = [Math.min(t, Math.round(t * (skill + (r() - 0.5) * 0.4))), t]; });
      if (r() > skill) { const code = Object.keys(MIS)[Math.floor(r() * Object.keys(MIS).length)] as string; mis[code] = [1 + Math.floor(r() * 3), Math.floor(r() * 2)]; }
      const bossN = 6, boss = Math.max(0, Math.min(bossN, Math.round(bossN * (skill + (r() - 0.5) * 0.3))));
      records[p.num]![l.id] = { conc, names: {}, boss, bossN, mis, no: l.no, star: boss === bossN, fixedBy: boss < 3 && r() < diligence ? 'bonus' : null };
    });
    const days = Array.from({ length: 14 }, () => (r() < diligence * 0.75 ? 1 + Math.floor(r() * 4) : 0));
    extra[p.num] = {
      days, solves: days.reduce((a, b) => a + b, 0) * 3, fixes: Math.floor(r() * 8 * diligence), gem: Math.round(40 + 260 * diligence), gemWeek: Math.round(60 * diligence), scroll: Math.floor(r() * 6),
      photoOk: Math.floor(r() * 3), photoRe: Math.floor(r() * 2), submit: Math.round(70 + 30 * diligence), stuck: Math.floor((1 - skill) * 6 * r()), sym: Math.floor(r() * 30 * diligence),
      weekly: Array.from({ length: 6 }, (_, w) => Math.round((10 + 40 * diligence) * (0.6 + 0.1 * w) * (0.8 + 0.4 * r()))),
      hg: r() < 0.4 ? 1 + Math.floor(r() * 3) : 0, hints: Math.floor(r() * 4 * (1 - skill)), tryEval: r() < diligence ? Math.floor(r() * 12) : 0, trySet: Math.floor(r() * 6 * diligence), noteDone: Math.floor(r() * 4 * diligence), cards: Math.floor(r() * 10 * diligence), surveyed: r() < 0.8,
    };
  }
  const v = build(cls, byN, records, xp, extra, (n) => isExcluded(S, cls, n));
  cache.set(k, v);
  return v;
}
/** 📝 세특 초안 (#127 · 함수 하나 seteukDraft · 학생 시트 · 대시보드 · 엑셀 모두) — 대시보드 기록 → 세특 기록 */
export const seteukOf = (s: Stud): SeteukIn => ({ went: s.went, heldN: s.heldN, conc: s.conc, std: s.std, boss: s.boss, hg: s.extra.hg, fixed: s.extra.fixes, mis: s.mis, photoN: s.extra.photoOk + s.extra.photoRe, photoRev: s.extra.photoRe, hints: s.extra.hints, tryEval: s.extra.tryEval, trySet: s.extra.trySet, noteDone: s.extra.noteDone, cards: s.extra.cards, symN: s.extra.sym, surveyed: s.extra.surveyed });
export const stdName = (id: string) => STANDARDS.find((d) => d.id === id)?.name ?? null;
export const memoParts = (s: Stud) => seteukDraft(seteukOf(s), stdName);
export const memoOf = (s: Stud) => memoParts(s).main;
