import { level as heroLevel } from '../model/hero';
import { SUBJ } from '../engine/subject';
import { makeRng } from '../engine/rng';
import type { Store } from '../model/types';
import { CLASSES, isExcluded, roster } from './school';
import { PACKS } from '../engine/packs';
import { conceptOf } from './prep';
import { BOSS, cellsOf, fullLesson, includedCells } from './statsCells';
import { MIS, seteukDraft, type SeteukIn } from './seteuk';
import { noteOf, type Bon, type Rec } from './dummy';
import { addDays, day as usageDay, loadUsage } from './usage';
import { seals as sealsOf } from '../model/titles';

// 📊 학생 기록 계산 (#124 학생 한 명 시트 · #125 대시보드) — 정식 js/raid/dash.js build() 를 같은 계산으로 옮김
//   records[번호][차시] = { conc: { 개념: [첫 시도 맞힘, 문항] }, names, boss(형성평가 첫 시도 맞힘), bossN, mis: { 오개념 코드: [틀림, 고침] } }
//   테스트 판 = 서버 기록이 없어 가짜 기록(반 · 번호로 늘 같은 값 · fakeClass) · 출시 때 서버 꽂개로 바꿈
export interface LessonRec { conc: Record<string, [number, number]>; names: Record<string, string>; boss: number; bossN: number; mis?: Record<string, [number, number]>; no: number; star?: boolean; fixedBy?: 'bonus' | null; /** 📊 이 반 수업에서 형성평가를 안 함(통계 칸 빠짐) */ noBoss?: boolean; /** 🎯 형성평가를 복습으로 보냄 · 복습에서 풂 */ bossSent?: boolean; bossReview?: number; revBoss?: number; revBossN?: number }
export type Records = Record<number, Record<string, LessonRec>>;
export interface Stud {
  cls: string; n: number; name: string; rec: Record<string, LessonRec>; went: number; heldN: number;
  part: number | null; boss: number | null; bossRaw: [number, number]; first: number | null; firstRaw: [number, number];
  conc: Record<string, { name: string; lesson: string; ok: number; total: number }>; std: Record<string, [number, number]>; mis: Record<string, [number, number]>;
  xp: number; lv: number; left: number; tries: number; x: boolean;
  /** 시트 · 대시보드 덧붙임 (테스트 판 가짜) */ extra: Extra;
}
export interface Extra { days: number[]; solves: number; fixes: number; gem: number; gemWeek: number; scroll: number; /** ✍ 연습 통과 = 학습지 숫자 서술형 통과한 문항 수 (옛 기록 = 모두 연습) */ photoOk: number; /** ✍ 실력 통과 = 숫자 바꾼 판 통과 (📜 #57 · 차시 = 📜 칸 ult_…_v · 성채 = ph2) */ photoV: number; photoRe: number; submit: number; stuck: number; sym: number; weekly: number[];
  /** 세특 기록 (정식 build 칸) */ hg: number; hints: number; tryEval: number; trySet: number; noteDone: number; cards: number; surveyed: boolean; /** 📊 한눈에 표 (정식 dash.js COLS · 서버) ⭕ OX [맞힘, 문항] · 💡 그림 힌트 펼친 수 · 💡 힌트 준 수 · 🪜 사다리(몬스터 → 1 대장 · 2 근거 줄 · 4 서술형) · 🧩 근거 줄 n/m · 🟪 업적 · 🃏 카드 */ ox?: [number, number]; hintN?: number; /** 🔁 화폐 전환 기록 (정식 gem/{반}/{번호}/conv · 2026-11-07) */ conv?: { at?: number; seals?: number; feather?: number; featherGem?: number; cardsUnpaid?: number; cardGem?: number; gemBefore?: number; gemAfter?: number } | null; lad?: Record<string, number>; ladW?: Record<string, string>; seals?: number; cardN?: number;
  /** 📖 기호 톡 누른 횟수 (정식 xp/{반}/{번호}/st/{차시}/{기호}) */ symt?: Record<string, Record<string, number>>; /** 🎯 허수아비로 한 차시 · 칸 (반 통계엔 안 들어감 · 학생 시트 표시) */ dummy?: { lid: string; no: number; cells: string[] }[] }
export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : null);
/** 성취기준 (정식 DS.Standards.of 자리 · 테스트 판 = 차시 묶음 셋) */
export const STANDARDS = SUBJ.standards; // 과목 팩 (#136)
const stdOf = (no: number) => STANDARDS.find((s) => s.lessons.includes(no))?.id ?? null;
export { MIS } from './seteuk';
const LESSONS = SUBJ.lessonList; // 과목 팩 (#136)
export const LESSON_LIST = LESSONS;
const level = (xp: number) => heroLevel(xp).lv; // 🐞 2026-11-15 「애들 레벨이 이상한데?」: 예전 = 가짜 대시보드용 임시 식(√) → 학생 캠프 · 내 용사와 같은 정식 grow.js level 하나

/** 정식 build(): 수업한 차시 = 기록이 하나라도 있는 차시 · 학생마다 참여 · 형성평가 첫 시도 · 개념 첫 시도 · 성취기준 · 오개념 */
export function build(cls: string, byN: Record<number, string>, records: Records, xp: Record<number, number>, extra: Record<number, Extra>, x: (n: number) => boolean) {
  const ns = Object.keys(byN).map(Number).filter(Boolean).sort((a, b) => a - b);
  // 차시 번호 · 이름 = 과목 차시 목록 → 올린 차시 팩 → 기록 안 no (🐞 2026-11-15 「대시보드에 6차시까지밖에」: 8 · 9차시가 과목 목록(2~7)에 없어 「0차시」로 맨 앞에 묻혔음)
  const recNo = (id: string) => { for (const n of ns) { const v = Number((records[n]?.[id] as LessonRec | undefined)?.no); if (v) return v; } return 0; };
  const metaOf = (id: string) => { const l = LESSONS.find((x) => x.id === id) ?? PACKS.find((x) => x.id === id); const no = l?.no || recNo(id) || Number(/(\d+)$/.exec(id)?.[1]) || 0; return { no, title: l?.title ?? `${no}차시` }; };
  const held = [...new Set(ns.flatMap((n) => Object.keys(records[n] || {})))].map((id) => ({ id, ...metaOf(id) })).sort((a, b) => a.no - b.no);
  const studs: Stud[] = ns.map((n) => {
    const rec = records[n] || {}, went = held.filter((l) => rec[l.id]);
    let ok = 0, tot = 0, bo = 0, bt = 0;
    const conc: Stud['conc'] = {}, std: Stud['std'] = {}, mis: Stud['mis'] = {};
    went.forEach((l) => {
      const r = rec[l.id] as LessonRec;
      Object.entries(r.conc || {}).forEach(([c, v]) => { ok += v[0]; tot += v[1]; conc[`${l.id}|${c}`] = { name: r.names?.[c] || c, lesson: l.id, ok: v[0], total: v[1] }; const sd = c === 'review' ? null : stdOf(l.no); /* 정식 Standards.of: 지난 시간 복습은 그 차시 성취기준에 넣지 않음 */ if (sd) { const a = (std[sd] = std[sd] || [0, 0]); a[0] += v[0]; a[1] += v[1]; } });
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
  const k = `${cls}|${S ? JSON.stringify(S.get(`roster/${cls}`) || S.get(`school/roster/${cls}`) || {}) : ''}|${S ? JSON.stringify(S.get('tester') || S.get('school/test') || {}) : ''}|${S?.get('school/cls') ? JSON.stringify(S.get('school/cls')) : ''}`;
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
      photoOk: Math.floor(r() * 3), photoV: Math.floor(r() * 2), photoRe: Math.floor(r() * 2), submit: Math.round(70 + 30 * diligence), stuck: Math.floor((1 - skill) * 6 * r()), sym: Math.floor(r() * 30 * diligence),
      weekly: Array.from({ length: 6 }, (_, w) => Math.round((10 + 40 * diligence) * (0.6 + 0.1 * w) * (0.8 + 0.4 * r()))),
      hg: r() < 0.4 ? 1 + Math.floor(r() * 3) : 0, hints: Math.floor(r() * 4 * (1 - skill)), tryEval: r() < diligence ? Math.floor(r() * 12) : 0, trySet: Math.floor(r() * 6 * diligence), noteDone: Math.floor(r() * 4 * diligence), cards: Math.floor(r() * 10 * diligence), surveyed: r() < 0.8,
    };
  }
  const v = build(cls, byN, records, xp, extra, (n) => isExcluded(S, cls, n));
  cache.set(k, v);
  return v;
}
/** 🚀 출시 막는 것 4 (📜 2026-11-15): 서버(시험 서버 · 출시) = 진짜 기록만 · 가짜 기록은 서버 없는 이 기기 판에서만
 *  records/{반}/{번호}/{차시} = 정식 꼴(conc · names · boss · bossN · mis · no) · 베타가 새로 적은 기록은 conc 가 없을 수 있음(형성평가 · 참여만 셈)
 *  xp/{반}/{번호}/total · gem/{반}/{번호} = total · scroll · day(날짜 → 그날 받은 💎) · 나머지 덧붙임(사진 · 막힘 · 기호 …)은 아직 0 */
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function realClass(S: Store, cls: string) {
  const bonAll = S.get<Record<string, Record<string, Record<string, { tries?: number; mis?: Record<string, [number, number]> } | null>>>>(`bonus/${cls}`) || {}, cardAll = S.get<Record<string, Record<string, unknown>>>(`cards/${cls}`) || {};
  const recAll = S.get<Record<string, Record<string, Partial<LessonRec> & Record<string, unknown>>>>(`records/${cls}`) || {}, xpAll = S.get<Record<string, { total?: number; st?: Record<string, Record<string, number>> }>>(`xp/${cls}`) || {}, gemAll = S.get<Record<string, { total?: number; scroll?: number; day?: Record<string, number> }>>(`gem/${cls}`) || {};
  const byN: Record<number, string> = {}, records: Records = {}, xp: Record<number, number> = {}, extra: Record<number, Extra> = {};
  const now = S.now(), dayK = (t: number) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10), week = new Set(Array.from({ length: 7 }, (_, i) => dayK(now - i * 864e5)));
  // 📊 반 통계 = 그 반 수업에서 연 칸만 (📜 2026-11-15 · statsCells.ts): 차시마다 통계에 넣는 칸 → 안 연 몬스터의 개념 칸 · 형성평가 점수는 뺌(학생 기록은 그대로)
  const lids = [...new Set(Object.values(recAll).flatMap((x) => Object.keys(x || {})))];
  const inc: Record<string, { cells: Set<string>; dropConc: Set<string> } | null> = {};
  for (const lid of lids) {
    const L = fullLesson(lid); if (!L) { inc[lid] = null; continue; }
    const all = cellsOf(L).map((c) => c.id), recs = Object.values(recAll).map((x) => x?.[lid]).filter(isObj) as never[];
    const cells = includedCells(S, cls, lid, recs, all), byC: Record<string, boolean[]> = {};
    for (const id of all) if (id !== BOSS) { const c = conceptOf(L, id); if (c) (byC[c] ||= []).push(cells.has(id)); }
    inc[lid] = { cells, dropConc: new Set(Object.entries(byC).filter(([, v]) => v.length && !v.some(Boolean)).map(([c]) => c)) };
  }
  const dropped = new Set<string>(); // 🧹 뺀 까닭 (대시보드 「개념별 약점」 한 줄)
  for (const p of roster(cls, S)) {
    byN[p.num] = p.name; records[p.num] = {};
    for (const [lid, r] of Object.entries(recAll[p.num] || {})) {
      if (!isObj(r)) continue;
      const no = Number(r.no) || LESSONS.find((l) => l.id === lid)?.no || PACKS.find((l) => l.id === lid)?.no || 0;
      const bad = (c: string) => (SUBJ.badConc || []).some((b) => b.lid === lid && b.c === c && Number(r.at) > 0 && Number(r.at) < b.before && (dropped.add(b.why), true)); // 🧹 옛 판 계산 오류
      const f = inc[lid], noBoss = !!f && !f.cells.has(BOSS), conc = Object.fromEntries(Object.entries(isObj(r.conc) ? r.conc : {}).filter(([c]) => (!f || !f.dropConc.has(c)) && !bad(c))) as LessonRec['conc'];
      records[p.num]![lid] = { conc, names: (isObj(r.names) ? r.names : {}) as LessonRec['names'], boss: noBoss ? 0 : Number(r.boss) || 0, bossN: noBoss ? 0 : Number(r.bossN) || 0, ...(isObj(r.mis) ? { mis: r.mis as LessonRec['mis'] } : {}), no, star: !noBoss && !!r.bossN && Number(r.boss) >= Number(r.bossN), fixedBy: null, ...(noBoss ? { noBoss: true } : {}), ...(r.bossSent ? { bossSent: true } : {}), ...(r.bossReview ? { bossReview: Number(r.bossReview), revBoss: Number(r.boss) || 0, revBossN: Number(r.bossN) || 0 } : {}) }; // 🎯 형성평가 복습으로 보냄 · 복습에서 풂 (📜 2026-11-16 · 통계는 빠진 채 칸에만)
    }
    xp[p.num] = Number(xpAll[p.num]?.total) || 0;
    const g = gemAll[p.num] || {}, day = isObj(g.day) ? g.day : {};
    // 🏰 성채 · 🎯 복습 기록(bonus/{반}/{번호}/{차시 · 평가}/{방}) = 정식 dash.js 그대로: 오개념(mis)을 학생 오개념에 합침 · 도전 수 · 평가 방(eval-) · 복습 방(set-) 따로
    const bon = bonAll[p.num] || {}, rows = Object.entries(bon).filter(([k, l]) => isObj(l) && k !== 'review' && k !== 'board').flatMap(([lid, l]) => Object.values(l as Record<string, unknown>).filter(isObj).map((m) => ({ lid, m: m as { tries?: number; mis?: Record<string, [number, number]> } })));
    // 🎯 허수아비(복습) 기록 = 반 통계에 안 넣음 (📜 2026-11-15 · 예전 정식 dash.js 는 오개념에 합쳤음) · 학생 시트에 「🎯 허수아비로 함」만
    const dummy = Object.entries(bon).filter(([k, l]) => isObj(l) && !/^eval-/.test(k) && k !== 'review' && k !== 'board').map(([lid, l]) => ({ lid, no: LESSONS.find((x) => x.id === lid)?.no ?? PACKS.find((x) => x.id === lid)?.no ?? 0, cells: Object.keys(l as Record<string, unknown>) })).filter((d) => d.cells.length).sort((a, b) => a.no - b.no);
    // 📷 서술형 (photo/{반}/{번호}/{차시_방}/{id} · 중계소가 씀): 통과 = 통과했거나 선생님 ✔ 인정한 방 수 · 다시 = ✏ 재도전 장 수
    const ph = (S.get<Record<string, Record<string, { status?: string; ok?: boolean }>>>(`photo/${cls.replace(/[.#$/[\]]/g, '_')}/${p.num}`)) || {};
    const photoOk = Object.values(ph).filter((byId) => Object.values(byId || {}).some((x) => x?.status === 'pass' || x?.ok === true)).length, photoRe = Object.values(ph).reduce((a, byId) => a + Object.values(byId || {}).filter((x) => x?.status === 'retry').length, 0);
    const gv = S.get<Record<string, unknown>>(`gifts/${p.uid}`) || {}, photoV = Object.keys(gv).filter((k) => /^ult_.+_v$/.test(k)).length + rows.filter((x) => /^eval-/.test(x.lid) && !!(x.m as { ph2?: string }).ph2).length; // ✍ 실력 통과 (📜 #57 덧)
    const triesOf = (re: RegExp) => rows.filter((x) => re.test(x.lid)).reduce((a, x) => a + (Number(x.m.tries) || 0), 0);
    extra[p.num] = { days: Array.from({ length: 14 }, () => 0), solves: triesOf(/./), fixes: Object.values(recAll[p.num] || {}).reduce((a, r) => a + (isObj(r) ? Number(r.fixed) || 0 : 0), 0), gem: Number(g.total) || 0, gemWeek: Object.entries(day).filter(([d]) => week.has(d)).reduce((a, [, v]) => a + (Number(v) || 0), 0), scroll: Number(g.scroll) || 0, photoOk, photoV, photoRe, submit: 0, stuck: 0, sym: Object.values(isObj(xpAll[p.num]?.st) ? xpAll[p.num]!.st! : {}).reduce((t, by) => t + Object.values(by || {}).reduce((u, v) => u + (Number(v) || 0), 0), 0), symt: isObj(xpAll[p.num]?.st) ? xpAll[p.num]!.st! : {}, weekly: Array.from({ length: 6 }, () => 0), hg: 0, hints: 0, tryEval: triesOf(/^eval-/), trySet: triesOf(/^set-/), noteDone: 0, cards: Object.keys(cardAll[p.num] || {}).length, surveyed: S.get(`surveyDone/${cls.replace(/[.#$/[\]]/g, '_')}/${p.num}`) === true, dummy };
  }
  // 📈 최근 14일 수업 밖 활동(풀이 수 · 앞 7 = 그 전 7일 · 뒤 7 = 최근 7일) = 활용 추이 기록(act · 기록 전 ≈ 추정) · 반 비교 「수업 밖 7일 활동」 · 학생 시트
  const U = loadUsage(S, cls).days, today = usageDay(now);
  for (const p of roster(cls, S)) { const e = extra[p.num]; if (!e) continue; e.days = Array.from({ length: 14 }, (_, i) => { const x = U[addDays(today, i - 13)]?.[String(p.num)]; return x ? (Number(x.r) || 0) + (Number(x.c) || 0) + (Number(x.f) || 0) : 0; }); }
  // 📊 한눈에 표 덧붙임 (정식 dash.js build 그대로): OX · 힌트 · 사다리 · 업적 · 카드 · ❗ 남은 문제(오답노트 = 허수아비 목록과 같은 셈)
  for (const p of roster(cls, S)) {
    const e = extra[p.num]; if (!e) continue;
    const raw = Object.entries(recAll[p.num] || {}).filter(([, r]) => isObj(r)) as [string, Record<string, unknown>][], bon = (bonAll[p.num] || {}) as Record<string, Bon>;
    const ox: [number, number] = [0, 0], lad: Record<string, number> = {}, ladW: Record<string, string> = {};
    let hintN = 0;
    for (const [, r] of raw) {
      if (Array.isArray(r.ox)) { ox[0] += Number(r.ox[0]) || 0; ox[1] += Number(r.ox[1]) || 0; }
      hintN += Number(r.hints) || 0;
      for (const [m, v] of Object.entries(isObj(r.lad) ? r.lad : {})) lad[m] = Math.max(lad[m] || 0, Number(v) || 0);
      for (const [m, v] of Object.entries(isObj(r.ladW) ? r.ladW : {})) ladW[m] = String(v);
    }
    const g0 = (gemAll[p.num] || {}) as { conv?: Extra['conv'] };
    Object.assign(e, { hints: hintN, conv: isObj(g0.conv) ? g0.conv : null, ox, hintN, lad, ladW, hg: raw.reduce((a, [, r]) => a + (Number(r.hg) || 0), 0), seals: sealsOf(bon as never).length, cardN: Object.keys(isObj(cardAll[p.num]) ? cardAll[p.num]! : {}).length });
  }
  const out = build(cls, byN, records, xp, extra, (n) => isExcluded(S, cls, n));
  (out as { dropped?: string[] }).dropped = [...dropped];
  for (const st of out.studs) { // ❗ 남은 문제 = 정식 DS.Note.lesson(…).left (형성평가 있는 수업 차시만 · 성채 평가 차시 빼기)
    let left = 0, done = 0, sub = 0, opened = 0; // ❗ 남은 문제 · 📕 오답 고침 완료(정식 noteDone = 허수아비로 바로잡은 칸 'p')
    for (const [lid, r] of Object.entries(recAll[st.n] || {})) { if (!isObj(r) || /^eval-/.test(lid)) continue; const L = fullLesson(lid); if (!L?.boss) continue; const x = noteOf(L, r as Rec, (bonAll[st.n] || {})[lid] as Bon | undefined); left += x.left; done += x.mons.filter((m) => m === 'p').length + x.boss.slice(0, x.hp).filter((m) => m === 'p').length; for (const m of Object.values(isObj((r as Record<string, unknown>).mons) ? ((r as Record<string, unknown>).mons as Record<string, string>) : {})) { if (m === 'o' || m === 'f' || m === 'x') { sub++; opened++; } else if (m === '-') opened++; } }
    st.left = left; st.extra.noteDone = done; st.extra.submit = opened ? Math.round((100 * sub) / opened) : 0; // 제출률 = 수업에서 연 몬스터 중 낸 것
  }
  // 🔎 오개념 = 수업 기록 + 🏰 성채(평가 방 eval-) 기록 (정식 dash.js 그대로 · 🎯 허수아비는 빼기 · 📜 2026-11-15 머리 🔨 (c))
  for (const st of out.studs) for (const [lid, l] of Object.entries(bonAll[st.n] || {})) {
    if (!/^eval-/.test(lid) || !isObj(l)) continue;
    for (const m of Object.values(l as Record<string, { mis?: Record<string, [number, number]> } | null>)) for (const [k, v] of Object.entries(isObj(m?.mis) ? m!.mis! : {})) { const a = (st.mis[k] ||= [0, 0]); a[0] += Number(v?.[0]) || 0; a[1] += Number(v?.[1]) || 0; }
  }
  return out;
}
/** 대시보드 · 학생 시트가 쓰는 한 곳: 서버 = 진짜 · 이 기기 = 가짜 */
export const classData = (S: Store | null, cls: string) => (S && S.kind === 'server' ? realClass(S, cls) : fakeClass(S, cls));
/** 📝 세특 초안 (#127 · 함수 하나 seteukDraft · 학생 시트 · 대시보드 · 엑셀 모두) — 대시보드 기록 → 세특 기록 */
export const seteukOf = (s: Stud): SeteukIn => ({ went: s.went, heldN: s.heldN, conc: s.conc, std: s.std, boss: s.boss, hg: s.extra.hg, fixed: s.extra.fixes, mis: s.mis, photoN: s.extra.photoOk + (s.extra.photoV || 0) + s.extra.photoRe, photoRev: s.extra.photoRe, hints: s.extra.hints, tryEval: s.extra.tryEval, trySet: s.extra.trySet, noteDone: s.extra.noteDone, cards: s.extra.cards, symN: s.extra.sym, surveyed: s.extra.surveyed });
export const stdName = (id: string) => STANDARDS.find((d) => d.id === id)?.name ?? null;
export const memoParts = (s: Stud) => seteukDraft(seteukOf(s), stdName);
export const memoOf = (s: Stud) => memoParts(s).main;
