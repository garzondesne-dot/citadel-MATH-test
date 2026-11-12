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
// @ts-ignore 원문 모듈(js)
import set06 from './set-06.js';
// @ts-ignore 원문 모듈(js)
import set08 from './set-08.js';
// @ts-ignore 원문 모듈(js)
import set09 from './set-09.js';
// @ts-ignore 원문 모듈(js)
import set10 from './set-10.js';
type Off = { monsters: Record<string, { make: (a: number, r: Rng) => Question[] }>; boss?: { sets: Record<number, Question[]>; make?: (i: number, a: number, r: Rng) => Question } };
const O: Record<string, Off> = { 'set-02': set02, 'set-03': set03, 'set-04': set04, 'set-05': set05, 'set-06': set06, 'set-08': set08, 'set-09': set09, 'set-10': set10 };
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
  'set06.m1': (v, r) => O['set-06']!.monsters['m1']!.make(v, r),
  'set06.m2': (v, r) => O['set-06']!.monsters['m2']!.make(v, r),
  'set06.m3': (v, r) => O['set-06']!.monsters['m3']!.make(v, r),
  'set06.u4': (v, r) => O['set-06']!.monsters['u4']!.make(v, r),
  'set06.u5': (v, r) => O['set-06']!.monsters['u5']!.make(v, r),
  'set06.u6': (v, r) => O['set-06']!.monsters['u6']!.make(v, r),
  'set06.u7': (v, r) => O['set-06']!.monsters['u7']!.make(v, r),
  'set06.m4': (v, r) => O['set-06']!.monsters['m4']!.make(v, r),
  'set06.m42': (v, r) => O['set-06']!.monsters['m42']!.make(v, r),
  'set06.m5': (v, r) => O['set-06']!.monsters['m5']!.make(v, r),
  'set06.m6': (v, r) => O['set-06']!.monsters['m6']!.make(v, r),
  'set06.b1': (v, r) => O['set-06']!.monsters['b1']!.make(v, r),
  'set08.m1': (v, r) => O['set-08']!.monsters['m1']!.make(v, r),
  'set08.m2': (v, r) => O['set-08']!.monsters['m2']!.make(v, r),
  'set08.m3': (v, r) => O['set-08']!.monsters['m3']!.make(v, r),
  'set08.m4': (v, r) => O['set-08']!.monsters['m4']!.make(v, r),
  'set08.m5': (v, r) => O['set-08']!.monsters['m5']!.make(v, r),
  'set09.m1': (v, r) => O['set-09']!.monsters['m1']!.make(v, r),
  'set09.m2': (v, r) => O['set-09']!.monsters['m2']!.make(v, r),
  'set09.m3': (v, r) => O['set-09']!.monsters['m3']!.make(v, r),
  'set09.m4': (v, r) => O['set-09']!.monsters['m4']!.make(v, r),
  'set09.m5': (v, r) => O['set-09']!.monsters['m5']!.make(v, r),
  'set10.m1': (v, r) => O['set-10']!.monsters['m1']!.make(v, r),
  'set10.m2': (v, r) => O['set-10']!.monsters['m2']!.make(v, r),
  'set10.m3': (v, r) => O['set-10']!.monsters['m3']!.make(v, r),
  'set10.m4': (v, r) => O['set-10']!.monsters['m4']!.make(v, r),
};
/** 보스: 시도 0 = 세트 1(학습지) · 1~ = 정식 boss.make (없으면 세트 2 · 정식 model.js bossItem 과 같음) */
const bossOf = (id: string) => (i: number, a: number, r: Rng): Question => { const b = O[id]!.boss!; return (!a ? b.sets[1]![i] : b.make ? b.make(i, a, r) : (b.sets[2] || b.sets[1])![i]) as Question; };
export const OFFICIAL_BOSS: Record<string, (i: number, a: number, r: Rng) => Question> = {
  'set02.boss': bossOf('set-02'),
  'set03.boss': bossOf('set-03'),
  'set04.boss': bossOf('set-04'),
  'set05.boss': bossOf('set-05'),
  'set06.boss': bossOf('set-06'),
  'set08.boss': bossOf('set-08'),
  'set09.boss': bossOf('set-09'),
  'set10.boss': bossOf('set-10'),
};
/** ⚔ 소레이드: 정식 chainItems(몬스터, 시드, 판) 그대로 (같은 난수 규칙: 시드|몬스터|chain|판) */
export const OFFICIAL_CHAIN: Record<string, (pass: number, r: Rng, seed?: string) => Question[]> = {
  'set06.u4': (pass, _r, seed = '') => (O['set-06'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('u4', seed, pass),
  'set06.u5': (pass, _r, seed = '') => (O['set-06'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('u5', seed, pass),
  'set06.u6': (pass, _r, seed = '') => (O['set-06'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('u6', seed, pass),
  'set06.u7': (pass, _r, seed = '') => (O['set-06'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('u7', seed, pass),
  'set09.m5': (pass, _r, seed = '') => (O['set-09'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('m5', seed, pass),
  'set10.m4': (pass, _r, seed = '') => (O['set-10'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('m4', seed, pass),
};
export const OFFICIAL_COMMIT = '59b40f3';
