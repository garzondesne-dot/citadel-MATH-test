// ⏱ 수업 시간 영향 (📜 2026-11-16 선생님 「기능을 켜고 끌 때마다 차시 운영 시간에 미치는 영향을 알 수 있게」 · DECISIONS 「📦 차시 팩 · 기능 단계」)
//   처음 값(머리 기준 · 실측 전) = 아래 T0 · 차시마다 그 팩의 도입 · 개념 · 몬스터(소문제 · 소레이드 단계) · 형성평가 · 체크 · 익명 풀이 수로 셈
//   실측 = 수업을 닫을 때 교사 기기가 걸린 분을 school/ltime/{차시}/{기능 서명}/{수업} 에 적음(성적 아님) → 같은 차시 · 같은 기능 3번 이상 = 실측 평균(「실측 n회」)
import type { LessonPack, Store } from '../model/types';
import { chainItems, items } from '../engine/lessons';

/** 처음 값 (분) — 📜 2026-11-16 선생님 「추천대로」 = C: 운영 서버 지난 수업(11/5 ~ 11/13 · 5반 · 4차시)의 몬스터 사이 간격 15개를 읽기만 해서 맞춘 값
 *  개념 단계 1.7 · 몬스터 하나 5.8(정찰 포함 · 소문제 수와 거의 상관없음 = 함께 풂) · 소문제 · 소레이드 단계 0.2 / 기록이 없는 도입 · 형성평가 · 마무리 = 머리 처음 값 그대로 */
export const T0 = { intro: 3, concept: 1.7, mon: 5.8, item: 0.2, chainStage: 0.2, bossItem: 1, wrap: 3, cc: 1, review: 2, rest: 2.5, fx: 0.5 } as const;
export const LIMIT = 50;
export const REAL_MIN = 3;
/** 시간에 들어가는 기능 (나머지 = 0분 · 「각자 · 돌면서」) */
export type TimeFeat = 'cc' | 'review' | 'rest' | 'lesson-fx';
export const ZERO_FEATS = ['help3', 'sword', 'qpaper', 'pre', 'stamp'] as const;
const REST_IDS = ['rest-balance', 'rest-flip', 'rest-nunchi', 'rest-defense', 'rest-ox', 'rest-dragon'];

/** 그 차시 팩에서 세는 것 */
export function lessonCounts(L: LessonPack) {
  const st = L.steps || [];
  const mons = st.filter((s) => s.kind === 'monster' && !s.later && L.monsters[s.id]).map((s) => { // 🎯 later = 수업 밖(허수아비 도전) → 시간 0 (📜 11/17 #26 ④)
    const m = L.monsters[s.id]!, chain = !!m.chain;
    let n = 0; try { n = chain ? chainItems(L, s.id, 'est', 0).length : items(L, s.id, 'est', 0).length; } catch { n = 0; }
    const rv = (m.reviews?.length || 0) + Object.values(m.reviewsBy || {}).reduce((a, x) => a + (x?.length || 0), 0) + (m.first || []).reduce((a, q) => a + (q?.review?.length || 0), 0);
    return { id: s.id, n, chain, reviews: rv };
  });
  return {
    intro: st.filter((s) => s.kind === 'intro').length,
    concept: st.filter((s) => s.kind === 'concept').length,
    checks: st.filter((s) => s.kind === 'concept' && s.check).length,
    mons,
    reviews: mons.reduce((a, m) => a + m.reviews, 0),
    bossItems: st.some((s) => s.kind === 'boss') && L.boss ? Number(L.boss.items) || 0 : 0,
  };
}
/** 풀 팩 = 덧칸(도움 3단 · 익명 풀이 · 개념 체크)이 하나라도 있음 */
export function packTier(L: LessonPack | null | undefined): 'basic' | 'full' {
  if (!L) return 'basic';
  if ((L.steps || []).some((s) => s.check)) return 'full';
  for (const m of Object.values(L.monsters || {})) {
    if (m.help || m.helps || m.reviews?.length || m.reviewsBy) return 'full';
    if ((m.first || []).some((q) => q?.help || q?.review?.length)) return 'full';
  }
  return 'basic';
}
const r1 = (x: number) => Math.round(x * 10) / 10;
export type Est = { base: number; feats: { id: TimeFeat; min: number; on: boolean }[]; extra: number; total: number; real: { n: number; min: number } | null; over: boolean; cut: { id: TimeFeat; min: number } | null };
/** 이 차시 예상 = 기본 + 켠 기능 (실측 3번 이상이면 실측 평균) */
export function estimate(L: LessonPack, on: (id: string) => boolean, measured?: Record<string, number> | null): Est {
  const c = lessonCounts(L);
  const base = r1(c.intro * T0.intro + c.concept * T0.concept + c.mons.reduce((a, m) => a + T0.mon + m.n * (m.chain ? T0.chainStage : T0.item), 0) + c.bossItems * T0.bossItem + T0.wrap);
  const restOn = REST_IDS.some((id) => on(id));
  const feats: Est['feats'] = [
    { id: 'cc', min: r1(c.checks * T0.cc), on: on('cc') },
    { id: 'review', min: r1(c.reviews * T0.review), on: on('review') },
    { id: 'rest', min: T0.rest, on: restOn },
    { id: 'lesson-fx', min: T0.fx, on: on('lesson-fx') },
  ];
  const extra = r1(feats.filter((f) => f.on).reduce((a, f) => a + f.min, 0));
  const vals = Object.values(measured || {}).map(Number).filter((x) => x > 0);
  const real = vals.length >= REAL_MIN ? { n: vals.length, min: r1(vals.reduce((a, x) => a + x, 0) / vals.length) } : null;
  const total = real ? real.min : r1(base + extra);
  const cut = feats.filter((f) => f.on && f.min > 0).sort((a, b) => b.min - a.min)[0] ?? null;
  return { base, feats, extra, total, real, over: total > LIMIT, cut: total > LIMIT && cut ? { id: cut.id, min: cut.min } : null };
}
/** 실측 묶음 = 시간에 들어가는 기능 켬/끔 서명 */
export const timeSig = (on: (id: string) => boolean) => ['cc', 'review', 'lesson-fx'].map((id) => (on(id) ? 1 : 0)).join('') + (REST_IDS.some((id) => on(id)) ? '1' : '0');
export const ltimePath = (lid: string, sig: string) => `school/ltime/${lid.replace(/[.#$/[\]]/g, '_')}/${sig}`;
/** 수업을 닫을 때 (교사 기기 · 🧪 테스트 수업 빼고) */
export function recordTime(S: Store, lid: string, code: string, t0: number, t1: number, sig: string) {
  const min = r1((t1 - t0) / 60000);
  if (!(min > 1 && min < 180)) return;
  S.set(`${ltimePath(lid, sig)}/${code}`, min);
}
export const TIME_NAME: Record<TimeFeat, string> = { cc: '✔ 개념 체크', review: '🔎 익명 풀이', rest: '🏕 쉼터 놀이', 'lesson-fx': '🎆 수업 연출' };
/** 화면 한 줄 */
export const estLine = (e: Est) => (e.real ? `이 차시 실측 평균 ${e.total}분 / ${LIMIT}분 · 실측 ${e.real.n}회` : `이 차시 예상 = 기본 ${e.base}분 + 켠 기능 ${e.extra}분 = ${e.total}분 / ${LIMIT}분`);
export const cutLine = (e: Est) => (e.cut ? `${TIME_NAME[e.cut.id]} 끄면 ${e.cut.min}분 줄어요` : '');
