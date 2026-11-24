// 📵 🔨 #14 (📜 11/24 선생님 「중간에 접속 끊기면 아웃 처리해 줘」 · DECISIONS a61d7d3): 🥏 🏁 😆 = 30초 넘게 끊기면 그 판만 아웃 · 점수 그대로 · 돌아와도 그 판엔 다시 안 들어감
import { describe, expect, it } from 'vitest';
import { dropOff, OUT_MS, type AnyFun } from '../src/rest/run';
import type { Room } from '../src/model/types';

const room = (now: number, on: string[], all: string[]) => ({ meta: {}, state: {}, players: Object.fromEntries(all.map((u, i) => [u, { num: i + 1, nick: u, seen: on.includes(u) ? now : 0 }])) }) as unknown as Room;
const stone = { x: 1, y: 1, vx: 0, vy: 0, on: 1, cd: 0, inv: 0, back: 0, l: '', lt: -9, f: 0, n: 0 };
const ids = ['a', 'b', 'c'], T = 1_800_000_000_000; // 실제 시각 (0 = 「접속 없음」이라 시험 시각은 크게)

describe('📵 쉼터 놀이 끊긴 학생 = 30초 뒤 그 판만 아웃', () => {
  it('🥏 알까기: 끊긴 지 30초 = 알이 판에서 내려가고 되살아나지 않음 · 점수 남음 · 30초 안에 돌아오면 그대로', () => {
    const f0 = { kind: 'ak', phase: 'play', g: 1, st: Object.fromEntries(ids.map((u) => [u, { ...stone }])), sc: { c: 7 } } as unknown as AnyFun;
    const f1 = dropOff(room(T, ['a', 'b'], ids), f0, T)!; expect((f1 as unknown as { off: Record<string, number> }).off.c).toBe(T);
    expect(dropOff(room(T + OUT_MS - 1, ['a', 'b'], ids), f1, T + OUT_MS - 1)).toBeNull(); // 아직 30초 안
    const f2 = dropOff(room(T + OUT_MS, ['a', 'b'], ids), f1, T + OUT_MS)! as unknown as { out: Record<string, true>; st: Record<string, { on: number; back: number }>; sc: Record<string, number> };
    expect(f2.out.c).toBe(true); expect(f2.st.c!.on).toBe(0); expect(f2.st.c!.back).toBeGreaterThan(1e6); expect(f2.sc.c).toBe(7); expect(f2.st.a!.on).toBe(1);
    const back = dropOff(room(T + 10, ['a', 'b', 'c'], ids), f1, T + 10)! as unknown as { off: Record<string, number> }; expect(back.off.c).toBeUndefined(); // 30초 안 돌아옴 = 아웃 없음
  });
  it('😆 아재 퀴즈: 아웃 = 「모두 맞힘」 셈에서 빠짐 · 점수 남음', () => {
    const f0 = { kind: 'aj', phase: 'q', g: 1, alive: { a: true, b: true, c: true }, score: { c: 3 } } as unknown as AnyFun;
    const f1 = dropOff(room(T, ['a', 'b'], ids), f0, T)!, f2 = dropOff(room(T + OUT_MS, ['a', 'b'], ids), f1, T + OUT_MS)! as unknown as { alive: Record<string, true>; out: Record<string, true>; score: Record<string, number> };
    expect(Object.keys(f2.alive)).toEqual(['a', 'b']); expect(f2.out.c).toBe(true); expect(f2.score.c).toBe(3);
  });
  it('🏁 땅따먹기: 아웃 표시 · 팀은 그대로(팀 보상 남음) · 모이기 중 · 끝난 판은 안 셈', () => {
    const f0 = { kind: 'lg', phase: 'pick', g: 1, team: { a: 0, b: 1, c: 0 } } as unknown as AnyFun;
    const f2 = dropOff(room(T + OUT_MS, ['a', 'b'], ids), dropOff(room(T, ['a', 'b'], ids), f0, T)!, T + OUT_MS)! as unknown as { out: Record<string, true>; team: Record<string, number> };
    expect(f2.out.c).toBe(true); expect(f2.team.c).toBe(0);
    expect(dropOff(room(T, [], ids), { ...f0, phase: 'join' } as AnyFun, T)).toBeNull();
    expect(dropOff(room(T, [], ids), { ...f0, phase: 'end' } as AnyFun, T)).toBeNull();
  });
});
