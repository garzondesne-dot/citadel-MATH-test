// 👥 게시판 동료 (📜 2026-11-14 선생님 「게시판 레이드 전투 화면에 동료들 표시 · 동료들 공격하는 장면」) — 순수 계산
import { describe, expect, it } from 'vitest';
import type { Given, Question, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, isChain, itemsFor, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { boardPack, freshAll } from '../src/board/board';
import { mateHits, matesOf, mateSnaps, queueHits, QUEUE_MAX, type MateHit } from '../src/ui/board/mates';

const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
function setup() {
  const L = boardPack(packOf('set-06')!), S: Store = { ...memoryStore(), kind: 'memory' }, C = 'Tp1';
  openRoom(S, L, C, PROFILES.board); S.set(`${roomPath(C)}/meta/fresh`, freshAll(L));
  heartbeat(S, C, 'me', 1, '나', { hero: 0, enh: 3, fx: 'flame' });
  heartbeat(S, C, 'b1', 2, 'b1', { hero: 5, enh: 4, fx: 'frost' });
  heartbeat(S, C, 'b2', 3, 'b2', { hero: 9 });
  nextStep(S, L, C);
  return { L, S, C, R: () => S.get<Room>(roomPath(C)) as Room };
}
const H = (u: string, k: number, kind: MateHit['kind'] = 'hit', dmg = 1): MateHit => ({ u, k, kind, dmg });

describe('👥 게시판 동료 (📜 2026-11-14)', () => {
  it('동료 = 팀 순서 · 나 빼고 · 최대 3 · 이름 = 팀 줄 이름 · 용사 · 강화 · 스킬 = 방 → 없으면 팀 글 용사', () => {
    const { R } = setup();
    const m = matesOf(['me', 'b1', 'b2', 'b3', 'b4'], 'me', R(), { b1: '1-3반 기사', b2: '1-3반 마법사' }, { b3: 7 });
    expect(m.map((x) => x.uid)).toEqual(['b1', 'b2', 'b3']);
    expect(m[0]).toEqual({ uid: 'b1', name: '1-3반 기사', hero: 5, enh: 4, fx: 'frost' });
    expect(m[1]).toMatchObject({ hero: 9, enh: 0, fx: '' });
    expect(m[2]).toMatchObject({ name: '친구', hero: 7 }); // 방 소식 전 = 팀 글 용사
    expect(matesOf(['me'], 'me', R(), {})).toEqual([]); // 1인 = 나만
  });
  it('공격 사건 = 동료가 낸 만큼 · 맞음(데미지) · 틀림(헛침) · 단계가 바뀌면 없음 · 글자 없음', () => {
    const { L, S, C, R } = setup(), s = stepOf(L, R())!;
    expect(s.kind).toBe('monster'); expect(isChain(L, R(), s.id)).toBe(false);
    const a = mateSnaps(L, R(), ['b1', 'b2'])!;
    submit(S, L, C, s.id, 'b1', itemsFor(L, R(), s.id, 'b1', 0).map(answerOf));
    submit(S, L, C, s.id, 'b2', wrong(itemsFor(L, R(), s.id, 'b2', 0)));
    const b = mateSnaps(L, R(), ['b1', 'b2'])!, hs = mateHits(a, b, 10);
    expect(hs.map((h) => [h.u, h.kind, h.k])).toEqual([['b1', 'hit', 11], ['b2', 'miss', 12]]);
    expect(hs[0]!.dmg).toBeGreaterThan(0); expect(hs[1]!.dmg).toBe(0);
    expect(JSON.stringify(hs)).not.toMatch(/정답|오답|⭕|❌/);
    expect(mateHits(null, b, 0)).toEqual([]); // 처음 본 모습 = 기억만
    expect(mateHits({ ...a, key: 'x' }, b, 0)).toEqual([]); // 다른 단계
    expect(mateHits(b, mateSnaps(L, R(), ['b1', 'b2'])!, 0)).toEqual([]); // 그대로면 없음
  });
  it('줄 = 들어온 순서대로 하나씩 · 너무 많으면 동료마다 하나로 묶음(데미지 합 · 맞힘 우선)', () => {
    const q = queueHits([H('b1', 1)], [H('b2', 2, 'miss', 0), H('b1', 3)]);
    expect(q.map((h) => `${h.u}:${h.k}`)).toEqual(['b1:1', 'b2:2', 'b1:3']);
    const many = Array.from({ length: QUEUE_MAX + 1 }, (_, i) => H(i % 2 ? 'b2' : 'b1', i + 1, i % 2 ? 'miss' : 'hit', i % 2 ? 0 : 1));
    const m = queueHits([], many);
    expect(m.map((h) => h.u)).toEqual(['b1', 'b2']);
    expect(m[0]).toMatchObject({ kind: 'hit', dmg: 4 }); expect(m[1]).toMatchObject({ kind: 'miss', dmg: 0 });
  });
});
