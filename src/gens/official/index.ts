// ⚠ 자동 생성 — tools/pack-from-release/convert.mjs · 정식 @ 59b40f3 · 손으로 고치지 않음
import type { Question } from '../../model/types';
import type { Rng } from '../../engine/rng';
// @ts-ignore 원문 모듈(js)
import set02 from './set-02.js';
// @ts-ignore 원문 모듈(js)
import set03 from './set-03.js';
// @ts-ignore 원문 모듈(js)
import set04 from './set-04.js';
// @ts-ignore 원문 모듈(js)
import set05 from './set-05.js';
type Off = { monsters: Record<string, { make: (a: number, r: Rng) => Question[] }>; boss?: { sets: Record<number, Question[]>; make?: (i: number, a: number, r: Rng) => Question } };
const O: Record<string, Off> = { 'set-02': set02, 'set-03': set03, 'set-04': set04, 'set-05': set05 };
/** 몬스터: (판, 난수) → 문항 · 정식 MONSTERS[id].make(판, 난수) */
export const OFFICIAL_GENS: Record<string, (v: number, r: Rng) => Question[]> = {
  'set02.r0': (v, r) => O['set-02']!.monsters['r0']!.make(v, r),
  'set02.m1': (v, r) => O['set-02']!.monsters['m1']!.make(v, r),
  'set02.s1': (v, r) => O['set-02']!.monsters['s1']!.make(v, r),
  'set02.m2': (v, r) => O['set-02']!.monsters['m2']!.make(v, r),
  'set02.m3': (v, r) => O['set-02']!.monsters['m3']!.make(v, r),
  'set02.m4': (v, r) => O['set-02']!.monsters['m4']!.make(v, r),
  'set02.s2': (v, r) => O['set-02']!.monsters['s2']!.make(v, r),
  'set03.m1': (v, r) => O['set-03']!.monsters['m1']!.make(v, r),
  'set03.m2': (v, r) => O['set-03']!.monsters['m2']!.make(v, r),
  'set03.m3': (v, r) => O['set-03']!.monsters['m3']!.make(v, r),
  'set03.m4': (v, r) => O['set-03']!.monsters['m4']!.make(v, r),
  'set04.r1': (v, r) => O['set-04']!.monsters['r1']!.make(v, r),
  'set04.m1': (v, r) => O['set-04']!.monsters['m1']!.make(v, r),
  'set04.m2': (v, r) => O['set-04']!.monsters['m2']!.make(v, r),
  'set04.m3': (v, r) => O['set-04']!.monsters['m3']!.make(v, r),
  'set04.b1': (v, r) => O['set-04']!.monsters['b1']!.make(v, r),
  'set04.b2': (v, r) => O['set-04']!.monsters['b2']!.make(v, r),
  'set04.b3': (v, r) => O['set-04']!.monsters['b3']!.make(v, r),
  'set05.m1': (v, r) => O['set-05']!.monsters['m1']!.make(v, r),
  'set05.m2': (v, r) => O['set-05']!.monsters['m2']!.make(v, r),
  'set05.m3': (v, r) => O['set-05']!.monsters['m3']!.make(v, r),
  'set05.m5': (v, r) => O['set-05']!.monsters['m5']!.make(v, r),
  'set05.b1': (v, r) => O['set-05']!.monsters['b1']!.make(v, r),
  'set05.b2': (v, r) => O['set-05']!.monsters['b2']!.make(v, r),
  'set05.b3': (v, r) => O['set-05']!.monsters['b3']!.make(v, r),
};
/** 보스: 시도 0 = 세트 1(학습지) · 1~ = 정식 boss.make (없으면 세트 2 · 정식 model.js bossItem 과 같음) */
const bossOf = (id: string) => (i: number, a: number, r: Rng): Question => { const b = O[id]!.boss!; return (!a ? b.sets[1]![i] : b.make ? b.make(i, a, r) : (b.sets[2] || b.sets[1])![i]) as Question; };
export const OFFICIAL_BOSS: Record<string, (i: number, a: number, r: Rng) => Question> = {
  'set02.boss': bossOf('set-02'),
  'set03.boss': bossOf('set-03'),
  'set04.boss': bossOf('set-04'),
  'set05.boss': bossOf('set-05'),
};
export const OFFICIAL_COMMIT = '59b40f3';
