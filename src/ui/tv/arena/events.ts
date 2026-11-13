// 📺 TV 전투 연출 사건 (#157 · 정식 hall.js attacks · updateFight · xpOf 를 옮김) — 순수 계산
//   학생마다 (공격 횟수 n · 깎은 데미지 dmg) 를 지난번과 비교 → 늘었으면 공격 사건 하나 · 정답 · 오답 글자는 만들지 않음(연출만)
import type { LessonPack, Room, Step } from '../../../model/types';
import { bossTries, chainRecord, chainSubs, isChain, plainRecord } from '../../../raid/raid';

export interface Snap { n: number; dmg: number; prac: boolean; perf?: boolean }
/** perfect = 이번 공격으로 그 학생이 다 맞힘(🎆 숫자 크고 노랗게) */
export interface Hit { u: string; dmg: number; kind: 'hit' | 'miss' | 'practice'; perfect?: boolean }

export function snapOf(L: LessonPack, R: Room, step: Step, u: string): Snap {
  if (step.kind === 'boss') { const t = bossTries(L, R, u); return { n: t.length, dmg: new Set(t.filter((x) => x.ok).map((x) => x.i)).size, prac: false }; }
  if (step.kind !== 'monster' || !L.monsters[step.id]) return { n: 0, dmg: 0, prac: false };
  if (isChain(L, R, step.id)) { const r = chainRecord(L, R, step.id, u); return { n: chainSubs(R, step.id, u).length, dmg: r.stage, prac: r.practice, perf: r.practice }; }
  const r = plainRecord(L, R, step.id, u); return { n: r.tries.length, dmg: r.best, prac: r.practice, perf: r.perfectAt >= 0 };
}

/** 지난 snap 과 비교한 공격 사건 (한 학생이 한 번에 여러 번 냈어도 사건 하나) */
export function hitsOf(was: Record<string, Snap>, now: Record<string, Snap>): Hit[] {
  const out: Hit[] = [];
  for (const [u, a] of Object.entries(now)) {
    const b = was[u] || { n: 0, dmg: 0, prac: false };
    if (a.n <= b.n) continue;
    const d = Math.max(0, a.dmg - b.dmg);
    out.push({ u, dmg: d, kind: d > 0 ? 'hit' : a.prac ? 'practice' : 'miss', ...(d > 0 && a.perf && !b.perf ? { perfect: true } : {}) });
  }
  return out;
}

/** +EXP (정식 control.js xpOf = 제출 2 + 맞힌 소문제 2 · 보스 = +10) — 몬스터가 쓰러질 때 머리 위에만 · 기록에 쓰지 않음 */
export function xpOf(L: LessonPack, R: Room, step: Step, u: string): number {
  if (step.kind === 'boss') return bossTries(L, R, u).length ? 10 : 0;
  const s = snapOf(L, R, step, u); return s.n ? s.n * 2 + s.dmg * 2 : 0;
}
