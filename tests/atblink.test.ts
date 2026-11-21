// 📡 #48 게시판 ↔ ATB: 출발 메타(4칸 · 빈자리 봇 · 글 play · code A) · 결과 저장(기록 · ⭐ 최고 별만 · 반 공적 · 테스트 반 = 안 씀)
import { describe, expect, it } from 'vitest';
import type { LessonPack, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { atbOnline, isAtb, prevStars, saveAtbResult, startAtb } from '../src/board/atbLink';
import { POSTS, type Post } from '../src/board/team';
import { weekOf } from '../src/board/war';

const T0 = Date.parse('2026-11-18T10:00:00+09:00');
const mk = (kind = 'server') => ({ ...memoryStore(), kind, now: () => T0 }) as Store;
const L = { id: 'set-06', no: 6 } as LessonPack;
const m = (uid: string, cls: string, num: number, hero: number, at: number) => ({ uid, cls, num, nick: uid, hero, role: 'c' as const, why: '', at });
const post = (mem: ReturnType<typeof m>[]): Post => ({ pid: 'p1', lesson: L.id, no: 6, at: 1, host: mem[0]!.uid, phase: 'wait', mem: Object.fromEntries(mem.map((x) => [x.uid, x])) });

describe('📡 출발', () => {
  it('2명 = 사람 2칸 + 봇 2칸 · 봇 용사 겹침 없음 · 글 play · code A', () => {
    const S = mk(), p = post([m('s1_3_1', '1-3', 1, 1, 1), m('s1_3_2', '1-3', 2, 2, 2)]);
    S.set(`${POSTS}/p1`, p);
    const meta = startAtb(S, L, p, 42);
    expect(meta.slots).toHaveLength(4);
    expect(meta.slots.slice(0, 2).map((s) => s.uid)).toEqual(['s1_3_1', 's1_3_2']);
    expect(meta.slots.slice(2).every((s) => s.bot === 'normal')).toBe(true);
    expect(new Set(meta.slots.map((s) => s.hero)).size).toBe(4);
    expect(S.get(`atb/p1/meta/seed`)).toBe(42);
    expect(S.get(`atb/p1/host`)).toBe('s1_3_1');
    const p2 = S.get<Post>(`${POSTS}/p1`)!; expect(p2.phase).toBe('play'); expect(isAtb(p2)).toBe(true);
  });
  it('테스트 반이 끼면 · 이 기기 체험 = 로컬 그대로', () => {
    expect(atbOnline(mk(), post([m('a', '1-3', 1, 1, 1), m('b', '1-6', 2, 2, 2)]))).toBe(false);
    expect(atbOnline(mk('memory'), post([m('a', '1-3', 1, 1, 1)]))).toBe(false);
    expect(atbOnline(mk(), post([m('a', '1-3', 1, 1, 1)]))).toBe(true);
  });
});

describe('🏁 결과 저장', () => {
  const end = (stars: number) => ({ win: true, sec: 300, right: 8, total: 10, stars, merit: { clear: 20, star: 5, act: 10 }, gem: { items: 30, clear: 20 }, role: 'c' as const });
  it('기록 한 줄 · ⭐ 최고 별만 올라감 · 반 공적 = 합 · 💎 = 합 돌려줌', () => {
    const S = mk(), ctx = { cls: '1-3', num: 7, L, pid: 'p1', n: 3 };
    expect(saveAtbResult(S, ctx, end(2))).toEqual({ gem: 50, merit: 35, newStars: 2 });
    expect(prevStars(S, '1-3', 7, L.id)).toBe(2);
    expect(saveAtbResult(S, ctx, end(1)).newStars).toBe(0);
    expect(prevStars(S, '1-3', 7, L.id)).toBe(2);
    const recs = Object.values(S.get<Record<string, { stars: number; atb: boolean }>>('bonus/1-3/7/board')!);
    expect(recs.length).toBe(1); // 같은 시각 = 같은 키 (실제 = 판마다 다른 시각)
    expect(S.get(`classWar/${weekOf(T0)}/sum/1-3`)).toBe(70);
  });
  it('테스트 반 = 아무것도 안 씀', () => {
    const S = mk(); expect(saveAtbResult(S, { cls: '1-6', num: 1, L, pid: 'p1', n: 1 }, end(3)).merit).toBe(0);
    expect(S.get('bonus')).toBeNull(); expect(S.get('classWar')).toBeNull();
  });
});
