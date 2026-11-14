// 🚨 강적 출현 · 🤝 구조 (📜 DECISIONS 2026-11-14 · board/team.ts)
import { describe, expect, it } from 'vitest';
import type { Given, Question, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, itemsFor, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { boardPack, freshAll } from '../src/board/board';
import { hintKey, markPauseHelp, raiseStrong, rescuesOf, strongOf } from '../src/board/team';

const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
function setup() {
  const L = boardPack(packOf('set-06')!), S: Store = { ...memoryStore(), kind: 'memory' }, C = 'Tr1';
  openRoom(S, L, C, PROFILES.board); S.set(`${roomPath(C)}/meta/fresh`, freshAll(L));
  heartbeat(S, C, 'g', 1, '수호'); heartbeat(S, C, 'c', 2, '도전');
  nextStep(S, L, C);
  const R = () => S.get<Room>(roomPath(C)) as Room, mid = stepOf(L, R())!.id;
  return { L, S, C, R, mid, roles: { g: 'g' as const, c: 'c' as const } };
}
describe('🚨 강적 출현 판정', () => {
  it('A = 그 차시 기록 없음 · 그 몬스터 칸 없음 · 아무도 안 함(n)', () => {
    expect(strongOf(null, null, 'm1', 0)).toBe('A');
    expect(strongOf({ mons: { m2: 'o' } }, null, 'm1', 0)).toBe('A');
    expect(strongOf({ mons: { m1: 'n' } }, null, 'm1', 0)).toBe('A');
  });
  it('B = 수업에서 못 맞힘(x · -)인데 복습 전 · 복습했으면 아님 · 맞혔으면 아님', () => {
    expect(strongOf({ mons: { m1: 'x' } }, null, 'm1', 0)).toBe('B');
    expect(strongOf({ mons: { m1: '-' } }, {}, 'm1', 0)).toBe('B');
    expect(strongOf({ mons: { m1: 'x' } }, { m1: 123 }, 'm1', 0)).toBeNull();
    expect(strongOf({ mons: { m1: 'o' } }, null, 'm1', 0)).toBeNull();
    expect(strongOf({ mons: { m1: 'f' } }, null, 'm1', 0)).toBeNull();
  });
  it('형성평가 = 문항별 bossM', () => {
    expect(strongOf({ bossM: 'ox' }, null, 'boss', 1)).toBe('B');
    expect(strongOf({ bossM: 'ox' }, null, 'boss', 0)).toBeNull();
    expect(strongOf({ bossM: 'o' }, null, 'boss', 3)).toBe('A');
  });
});
describe('🤝 구조', () => {
  it('알림 → 수호자 💡 힌트 → 도전자가 맞힘 = 구조 1', () => {
    const { L, S, C, R, mid, roles } = setup(), a = { mid, k: 0, at: S.now() };
    raiseStrong(S, C, 'c', a);
    expect(rescuesOf(L, R(), roles)).toEqual([]); // 아직 안 맞힘 · 도움 없음
    S.set(`${roomPath(C)}/bh/c/${hintKey(mid, 0)}`, { from: 'g', at: S.now() + 1 });
    submit(S, L, C, mid, 'c', itemsFor(L, R(), mid, 'c', 0).map(answerOf));
    expect(rescuesOf(L, R(), roles)).toMatchObject([{ g: 'g', c: 'c', key: hintKey(mid, 0) }]);
  });
  it('⏸ 설명으로 도와도 구조 · 도움 없이 혼자 맞히면 구조 아님 · 틀리면 아님', () => {
    const a1 = setup(), a = { mid: a1.mid, k: 0, at: a1.S.now() };
    raiseStrong(a1.S, a1.C, 'c', a);
    a1.S.set(`${roomPath(a1.C)}/bh/c/${hintKey(a1.mid, 0)}`, { from: 'g', at: a.at + 1 });
    submit(a1.S, a1.L, a1.C, a1.mid, 'c', wrong(itemsFor(a1.L, a1.R(), a1.mid, 'c', 0)));
    expect(rescuesOf(a1.L, a1.R(), a1.roles)).toEqual([]); // 틀림
    const b = setup(), a2 = { mid: b.mid, k: 0, at: b.S.now() };
    raiseStrong(b.S, b.C, 'c', a2);
    submit(b.S, b.L, b.C, b.mid, 'c', itemsFor(b.L, b.R(), b.mid, 'c', 0).map(answerOf));
    expect(rescuesOf(b.L, b.R(), b.roles)).toEqual([]); // 혼자
    const d = setup(), a3 = { mid: d.mid, k: 0, at: d.S.now() };
    raiseStrong(d.S, d.C, 'c', a3); markPauseHelp(d.S, d.C, 'g', 'c', a3);
    submit(d.S, d.L, d.C, d.mid, 'c', itemsFor(d.L, d.R(), d.mid, 'c', 0).map(answerOf));
    expect(rescuesOf(d.L, d.R(), d.roles)).toHaveLength(1);
  });
  it('🤝 완전 구조(A) = 구조 뒤 같은 몬스터 다음 소문제를 도움 없이 처음 맞힘 · 다음 소문제에 힌트를 받았으면 아님', () => {
    const { L, S, C, R, mid, roles } = setup(), a = { mid, k: 0, at: S.now() };
    raiseStrong(S, C, 'c', a); S.set(`${roomPath(C)}/bh/c/${hintKey(mid, 0)}`, { from: 'g', at: S.now() + 1 });
    submit(S, L, C, mid, 'c', itemsFor(L, R(), mid, 'c', 0).map(answerOf)); // 0 · 1 모두 처음 맞힘
    expect(rescuesOf(L, R(), roles)[0]!.full).toBe(true);
    const b = setup(), a2 = { mid: b.mid, k: 0, at: b.S.now() };
    raiseStrong(b.S, b.C, 'c', a2); b.S.set(`${roomPath(b.C)}/bh/c/${hintKey(b.mid, 0)}`, { from: 'g', at: b.S.now() + 1 }); b.S.set(`${roomPath(b.C)}/bh/c/${hintKey(b.mid, 1)}`, { from: 'g', at: b.S.now() + 2 });
    b.S.set(`${roomPath(b.C)}/bh/c/${hintKey(b.mid, 1)}`, { from: 'g', at: b.S.now() + 2 });
    submit(b.S, b.L, b.C, b.mid, 'c', itemsFor(b.L, b.R(), b.mid, 'c', 0).map(answerOf));
    expect(rescuesOf(b.L, b.R(), b.roles)[0]!.full).toBe(false);
  });
});
