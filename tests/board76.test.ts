import { describe, expect, it } from 'vitest';
import { LIFE, sweepOf, sweepAll, type Post, type Member } from '../src/board/team';

// ⏱ #76 게시판 방 저절로 닫기
const T = 1_800_000_000_000;
const m = (uid: string, at: number, seen?: number): Member => ({ uid, cls: '1-3', num: 1, nick: uid, hero: 0, role: 'c', why: '', at, ...(seen != null ? { seen } : {}) });
const post = (o: Partial<Post>): Post => ({ pid: 'p1', lesson: 'set-08', no: 8, at: T, host: 'a', phase: 'wait', mem: { a: m('a', T, T) }, ...o });

describe('⏱ sweepOf', () => {
  it('대기 10분 움직임 없음 = 해산 · 숨만으론 안 살아남음', () => {
    expect(sweepOf(post({ mem: { a: m('a', T, T + LIFE.waitIdle) } }), T + LIFE.waitIdle - 1000)).toBeNull();
    expect(sweepOf(post({ mem: { a: m('a', T, T + LIFE.waitIdle + 5000) } }), T + LIFE.waitIdle + 6000)).toMatchObject({ kind: 'dissolve' });
  });
  it('방장 숨 1분 끊김 → 먼저 들어온 살아 있는 팀원에게', () => {
    const p = post({ act: T, mem: { a: m('a', T, T), b: m('b', T + 2000, T + 70e3), c: m('c', T + 1000, T + 10e3) } });
    expect(sweepOf(p, T + 75e3)).toMatchObject({ kind: 'host', to: 'b' }); // c 도 끊김 → b
  });
  it('방장 끊김 · 남은 팀원도 끊김 = 해산', () => { expect(sweepOf(post({ mem: { a: m('a', T, T), b: m('b', T, T) } }), T + 2 * 60e3)).toMatchObject({ kind: 'dissolve' }); });
  it('옛 판 방장(숨 없음) = 넘기지 않음 · 10분 규칙만', () => { expect(sweepOf(post({ mem: { a: m('a', T), b: m('b', T, T + 3 * 60e3) } }), T + 3 * 60e3)).toBeNull(); });
  it('진행 10분 숨 없음 = 끝 · 끝난 글 하루 뒤 지움 · 팀원 없는 글 = 해산', () => {
    expect(sweepOf(post({ phase: 'play' }), T + LIFE.playIdle + 1)).toMatchObject({ kind: 'end' });
    expect(sweepOf(post({ phase: 'play', mem: { a: m('a', T, T + LIFE.playIdle) } }), T + LIFE.playIdle + 1)).toBeNull();
    expect(sweepOf(post({ phase: 'done' }), T + LIFE.doneKeep + 1)).toMatchObject({ kind: 'drop' });
    expect(sweepOf(post({ mem: {} }), T)).toMatchObject({ kind: 'dissolve' });
  });
  it('sweepAll: 해산 = 글 지우고 🔒 암호도 · 넘김 = host · 준비 · 끝 = done + idle', () => {
    const db: Record<string, unknown> = {};
    const S = { set: (k: string, v: unknown) => { db[k] = v; }, get: () => null, watch: () => () => {}, now: () => T } as never;
    sweepAll(S, { p1: post({ pid: 'p1', lk: true, mem: {} }), p2: post({ pid: 'p2', act: T, mem: { a: m('a', T, T - 2 * 60e3), b: m('b', T, T) } }), p3: post({ pid: 'p3', phase: 'play', at: T - LIFE.playIdle - 9, mem: {} }) }, T);
    expect(db['school/board/posts/p1']).toBeNull(); expect(db['boardLock/p1']).toBeNull();
    expect(db['school/board/posts/p2/host']).toBe('b'); expect(db['school/board/posts/p2/mem/b/ready']).toBe(true);
    expect(db['school/board/posts/p3/phase']).toBe('done'); expect(db['school/board/posts/p3/idle']).toBe(true);
  });
});
