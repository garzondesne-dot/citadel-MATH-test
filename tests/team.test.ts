// 📋 게시판 던전 팀 (#143 · ❓ #143-a B · b A): 역할 판정 · 합류 조건 · 출발 · ⏸ 멈춤(2번 · 2분 · 시간 뺌) · 💡 힌트(문제당 1번 · 답 가림) · 순위 · 보너스
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { heartbeat, nextStep, roomPath, submit } from '../src/raid/actions';
import { itemsFor, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { boardPack } from '../src/board/board';
import { bonusOf, canJoin, canStart, createLockedPost, createPost, joinLocked, LOCK, myPin, pinHash, pinWait, elapsed, hintOf, joinPost, pauseOff, pauseOn, pausesLeft, POSTS, rankOf, roleOf, sendHint, setReady, startTeam, stuckItem, thinkUsed, type Post } from '../src/board/team';

function clockStore() { let t = 1_000_000; const b = memoryStore(); return { S: { ...b, kind: 'memory', now: () => t } as Store, tick: (ms: number) => { t += ms; } }; }
const meA = { uid: 'a', cls: '1-3', num: 1, nick: '가', hero: 0 }, meB = { uid: 'b', cls: '1-5', num: 2, nick: '나', hero: 1 };

describe('🛡 역할 판정 (#143-a = B)', () => {
  it('정답률 ≥ 80% 또는 형성평가 만점 → 🛡 · 기록 없음 → 🌱', () => {
    expect(roleOf(null).role).toBe('c');
    expect(roleOf({ right: 8, total: 10 }).role).toBe('g');
    expect(roleOf({ right: 7, total: 10 }).role).toBe('c');
    expect(roleOf({ right: 3, total: 10, boss: { ok: 6, items: 6 } }).role).toBe('g');
    expect(roleOf({ right: 8, total: 10 }).why).toMatch(/80%/);
  });
});
describe('모집 · 합류 · 출발', () => {
  it('합류 조건: 수업 중 · 진도 전 · 끊김 · 4명 다 참 · 다른 반 됨', async () => {
    const { S } = clockStore(), L = packOf('set-06')!;
    const pid = createPost(S, L, meA, { right: 9, total: 10 }), p = () => S.get<Post>(`${POSTS}/${pid}`)!;
    expect(canJoin(p(), 'b', { open: true, inClass: true, online: true })).toMatch(/수업 중/);
    expect(canJoin(p(), 'b', { open: false, inClass: false, online: true })).toMatch(/진도 전/);
    expect(canJoin(p(), 'b', { open: true, inClass: false, online: false })).toMatch(/끊겼/);
    expect(canJoin(p(), 'b', { open: true, inClass: false, online: true })).toBe('');
    joinPost(S, p(), meB, null);
    expect(p().mem.b!.role).toBe('c'); expect(p().mem.a!.role).toBe('g');
    expect(canStart(p())).toBe(false); setReady(S, p(), 'b', true); expect(canStart(p())).toBe(true);
    ['c', 'd'].forEach((u, i) => joinPost(S, p(), { uid: u, cls: '1-1', num: i + 3, nick: u, hero: 0 }, null));
    expect(canJoin(p(), 'e', { open: true, inClass: false, online: true })).toMatch(/다 찼/);
    const code = startTeam(S, L, p(), 0);
    expect(p().phase).toBe('play'); expect(p().code).toBe(code);
    const R = S.get<Room>(roomPath(code))!; expect(R.state.headcount).toBe(1); expect(R.meta.retries).toBe(1);
  });
});
describe('⏸ 멈춤 · 💡 힌트', () => {
  function team() {
    const { S, tick } = clockStore(), L = boardPack(packOf('set-06')!), p0 = createPost(S, L, meA, { right: 9, total: 10 });
    joinPost(S, S.get<Post>(`${POSTS}/${p0}`)!, meB, null);
    const code = startTeam(S, L, S.get<Post>(`${POSTS}/${p0}`)!, 0);
    S.set(`${roomPath(code)}/meta/board/limit`, 600000); S.set(`${roomPath(code)}/meta/board/t0`, S.now());
    heartbeat(S, code, 'a', 1, '가'); heartbeat(S, code, 'b', 2, '나'); nextStep(S, L, code);
    return { S, tick, L, code, R: () => S.get<Room>(roomPath(code))! };
  }
  it('수호자 설명 2번 · 멈춘 동안 시간이 안 흐름 · 생각 1분은 팀에 1번', () => {
    const { S, tick, code, R } = team();
    tick(10000); expect(elapsed(R(), S.now())).toBe(10000);
    expect(pauseOn(S, code, R(), 'a')).toBe(true); expect(R().state.focus).toBe(true);
    tick(30000); expect(elapsed(R(), S.now())).toBe(10000);
    pauseOff(S, code, R()); tick(5000); expect(elapsed(R(), S.now())).toBe(15000);
    expect(pausesLeft(R(), 'a')).toBe(1); pauseOn(S, code, R(), 'a'); pauseOff(S, code, R()); expect(pauseOn(S, code, R(), 'a')).toBe(false);
    expect(thinkUsed(R())).toBe(false); expect(pauseOn(S, code, R(), 'b', true)).toBe(true); pauseOff(S, code, R()); expect(pauseOn(S, code, R(), 'b', true)).toBe(false);
  });
  it('힌트 = 받는 친구의 그 판 숫자 · 답 가림 · 문제당 1번', () => {
    const { S, L, code, R } = team(), s = stepOf(L, R())!;
    submit(S, L, code, s.id, 'b', itemsFor(L, R(), s.id, 'b', 0).map((q) => (q.type === 'multi' ? [] : -1)) as never);
    const it = stuckItem(L, R(), 'b')!; expect(it.mid).toBe(s.id);
    expect(it.q.question).toBe(itemsFor(L, R(), s.id, 'b', 1)[it.k]!.question); // 한 번 더 = 숫자 바뀐 판
    const h = hintOf(it.q); expect(h.endsWith('→ ?') || !/→/.test(h)).toBe(true);
    expect(sendHint(S, code, R(), L, 'a', 'b')).toBeNull(); expect(sendHint(S, code, R(), L, 'a', 'b')).toMatch(/이미/);
  });
});
describe('🏆 순위 · 보너스', () => {
  it('익명 순위 세 갈래 · 수호 +10% / 도전자 (최대 30%) · 도전자만 클리어 +50%', () => {
    const rows = { x: { s: 900, g: 10, c: 0, at: 1 }, y: { s: 700, g: 300, c: 5, at: 2 }, me: { s: 800, g: 100, c: 2, at: 3 } };
    expect(rankOf(rows, 'me')).toEqual({ n: 3, s: 2, g: 2, c: 2 });
    expect([bonusOf('g', 2, true, true), bonusOf('g', 4, true, false), bonusOf('c', 3, false, true), bonusOf('c', 3, true, true), bonusOf('c', 1, false, true)]).toEqual([0.1, 0.3, 0.5, 0, 0]);
  });
});

describe('🔒 입장 암호 (2026-11-13)', () => {
  it('해시만 boardLock · 글엔 lk 표시 · 맞으면 합류 · 틀리면 3번 → 1분 · 1분 뒤 다시', async () => {
    const { S, tick } = clockStore(), L = packOf('set-06')!;
    const pid = await createLockedPost(S, L, meA, { right: 9, total: 10 }, undefined, '4821'), p = () => S.get<Post>(`${POSTS}/${pid}`)!;
    expect(p().lk).toBe(true); expect(JSON.stringify(p())).not.toContain('4821');
    const lk = S.get<{ h: string }>(`${LOCK}/${pid}`)!; expect(lk.h).toBe(await pinHash(pid, '4821')); expect(JSON.stringify(lk)).not.toContain('4821');
    expect(myPin(pid)).toBe('4821'); // 모집한 기기만 기억 (서버엔 없음)
    expect(await joinLocked(S, p(), meB, null, undefined, '1111')).toMatch(/2번 남/);
    expect(await joinLocked(S, p(), meB, null, undefined, '2222')).toMatch(/1번 남/);
    expect(p().mem.b).toBeUndefined();
    expect(await joinLocked(S, p(), meB, null, undefined, '3333')).toMatch(/1분 뒤/);
    expect(await joinLocked(S, p(), meB, null, undefined, '4821')).toMatch(/초 뒤에 다시/); // 맞아도 1분 기다림
    expect(pinWait('b', pid, S.now())).toBeGreaterThan(59000);
    const meC = { ...meB, uid: 'c' }; expect(await joinLocked(S, p(), meC, null, undefined, '4821')).toBe(''); // 다른 학생은 따로
    tick(60001); expect(pinWait('b', pid, S.now())).toBe(0);
    expect(await joinLocked(S, p(), meB, null, undefined, '12')).toMatch(/4자리/);
    expect(await joinLocked(S, p(), meB, null, undefined, '4821')).toBe(''); expect(p().mem.b?.k).toBe(await pinHash(pid, '4821'));
  });
  it('암호 없는 글 = 그대로 (lk 없음 · boardLock 없음)', async () => {
    const { S } = clockStore(), pid = createPost(S, packOf('set-06')!, meA, null);
    expect(S.get<Post>(`${POSTS}/${pid}`)!.lk).toBeUndefined(); expect(S.get(`${LOCK}/${pid}`)).toBeNull();
  });
});
