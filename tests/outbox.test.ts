import { describe, expect, it } from 'vitest';
import { makeOutbox, merge3, queued, trim, OUT_LIMIT, type OutItem, type OutStorage } from '../src/store/outbox';
const mem = (): OutStorage & { raw: OutItem[] } => { const o = { raw: [] as OutItem[], load: () => o.raw.map((x) => ({ ...x })), save: (l: OutItem[]) => { o.raw = l.map((x) => ({ ...x })); } }; return o; };
describe('📮 #81 B 폰 보관함', () => {
  it('넣기 → 저장 칸에 남음(앱 닫아도) · 확인 = 지움', () => {
    const st = mem(), b = makeOutbox(st);
    const id = b.put('gem/1-3/5/log/x', { g: 3 }, null, 'u1', 1000);
    expect(st.raw.length).toBe(1);
    expect(makeOutbox(st).count('u1')).toBe(1); // 다시 연 앱 = 그대로
    b.done(id); expect(st.raw.length).toBe(0);
  });
  it('같은 경로 = 한 줄 (처음 base · 마지막 v) · 먼저 보낸 확인은 새 줄을 안 지움', () => {
    const b = makeOutbox(mem());
    const a = b.put('xp/1-3/5/total', 11, 10, 'u1', 1), c = b.put('xp/1-3/5/total', 12, 11, 'u1', 2);
    b.done(a); expect(b.count('u1')).toBe(1);
    expect(b.list('u1')[0]).toMatchObject({ v: 12, base: 10 });
    b.done(c); expect(b.count()).toBe(0);
  });
  it('위 경로 줄 안에 아래 쓰기를 넣음 · 아래 줄 뒤 위 경로 = base 는 아래 줄이 알던 처음 값', () => {
    const b = makeOutbox(mem());
    b.put('bonus/1-3/5', { a: 1 }, { a: 0 }, 'u1', 1); b.put('bonus/1-3/5/b/c', 2, null, 'u1', 2);
    expect(b.list()).toHaveLength(1); expect(b.list()[0]!.v).toEqual({ a: 1, b: { c: 2 } });
    const b2 = makeOutbox(mem());
    b2.put('gem/1-3/5/total', 7, 5, 'u1', 1); // 거울: total 5 → 7 (아직 안 올라감)
    b2.put('gem/1-3/5', { total: 9, scroll: 1 }, { total: 7, scroll: 0 }, 'u1', 2); // 거울 base 에 7 이 섞여 있음
    expect(b2.list()).toHaveLength(1); expect(b2.list()[0]!.base).toEqual({ total: 5, scroll: 0 });
  });
  it('사람(로그인)마다 따로 셈', () => { const b = makeOutbox(mem()); b.put('gem/1-3/5/a', 1, null, 'u1', 1); b.put('gem/1-3/6/a', 1, null, 'u2', 1); expect(b.count('u1')).toBe(1); expect(b.count('u2')).toBe(1); });
  it('넣는 칸 = 학생 자기 칸만 (방 · 게시판 · 학교 칸은 뺌)', () => {
    for (const p of ['gem/1-3/5/log/x', 'xp/1-3/5', 'records/1-3/5/set-09', 'bonus/1-3/5/board/x', 'gifts/u/x', 'cards/1-3/5']) expect(queued(p)).toBe(true);
    for (const p of ['rooms/123/subs', 'school/board/posts/p', 'atb/p/hb', 'accounts/1-3/5/pend']) expect(queued(p)).toBe(false);
  });
  it('합치기: 서버 그대로 = 폰 값 · 수 = 늘어난 만큼만 더함 · 서버에 없는 칸 = 폰 값 · 서버가 지운 칸 = 지운 쪽', () => {
    expect(merge3({ total: 5 }, { total: 5 }, { total: 8 })).toEqual({ total: 8 });
    expect(merge3({ total: 4, scroll: 2 }, { total: 5, scroll: 2 }, { total: 8, scroll: 2 })).toEqual({ total: 7, scroll: 2 }); // 다른 폰이 1 씀 · 이 폰이 3 범 = 7
    expect(merge3({ log: { a: 1 } }, { log: {} }, { log: { b: 2 } })).toEqual({ log: { a: 1, b: 2 } }); // 로그 = 합집합
    expect(merge3({ log: {} }, { log: { a: 1 } }, { log: { a: 1, b: 2 } })).toEqual({ log: { b: 2 } }); // 서버가 a 를 지움 = 그대로 지움
    expect(merge3(null, null, { got: true })).toEqual({ got: true });
    expect(merge3('B', 'A', 'C')).toBe('B'); // 글이 서로 다름 = 서버 그대로
  });
  it('한도: 7일 지난 줄 버림 · 줄 수 넘으면 오래된 것부터(💎 · EXP 는 마지막까지)', () => {
    const now = 100 * 86400e3, mk = (i: number, path: string, at = now): OutItem => ({ id: `i${i}`, path, v: i, base: null, at, who: 'u' });
    expect(trim([mk(1, 'bonus/a', now - 8 * 86400e3), mk(2, 'bonus/b')], now).map((x) => x.id)).toEqual(['i2']);
    const many = [mk(0, 'gem/1-3/5/log/x'), ...Array.from({ length: OUT_LIMIT.items }, (_, i) => mk(i + 1, `bonus/1-3/5/k${i}`))];
    const t = trim(many, now); expect(t.length).toBe(OUT_LIMIT.items); expect(t[0]!.id).toBe('i0');
  });
});
