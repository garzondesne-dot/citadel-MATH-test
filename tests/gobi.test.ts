// 📊 우리 반 고비 (📜 2026-11-17 #14 · src/school/gobi.ts) — 반 합계만 · 3명 미만 칸 뺌 · 살아 있는 몬스터 = 오답 숨김 · 🔎 단추 차례
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Given, Room, Store } from '../src/model/types';
import { SUBJ } from '../src/engine/subject';
import { PROFILES } from '../src/model/profiles';
import { openRoom } from '../src/raid/actions';
import { answerOf, isChain, itemsFor } from '../src/raid/raid';
import { gobiCard, gobiMonster } from '../src/school/gobi';
import { reviewStep, stepReview } from '../src/school/help';

const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });
const P = Object.values(PROFILES)[0]!;
const L = SUBJ.lessons.find((l) => l.steps.some((s) => s.kind === 'monster' && l.monsters[s.id] && !l.monsters[s.id]!.chain))!;
const mid = L.steps.find((s) => s.kind === 'monster' && L.monsters[s.id] && !L.monsters[s.id]!.chain)!.id;

function room() {
  const S = store(); openRoom(S, L, 'G1', P);
  S.set('rooms/G1/state/step', L.steps.findIndex((s) => s.id === mid));
  const R = () => S.get<Room>('rooms/G1')!;
  const put = (u: string, a: number, wrongAt: number[], wrongAns = 'X') => {
    S.set(`rooms/G1/players/${u}`, { nick: u, at: S.now(), seen: S.now() });
    const qs = itemsFor(L, R(), mid, u, a);
    S.set(`rooms/G1/subs/${mid}/${u}/${a}`, qs.map((q, i) => (wrongAt.includes(i) ? wrongAns : answerOf(q)) as Given));
  };
  return { S, R, put };
}

describe('📊 우리 반 고비', () => {
  it('칸마다 = 처음 틀린 친구 · 재도전 · 다시 해낸 친구 · 3명 이상 같은 오답만', () => {
    expect(isChain(L, room().R(), mid)).toBe(false);
    const { R, put } = room();
    for (const u of ['a', 'b', 'c']) { put(u, 0, [0], '7'); put(u, 1, []); } // 1번 칸: 셋이 처음에 「7」로 틀림 → 다음 판에 해냄
    put('d', 0, []); // d = 한 번에
    const cells = gobiMonster(L, R(), mid);
    expect(cells[0]).toMatchObject({ n: 4, firstWrong: 3, retries: 3, comeback: 3 });
    expect(cells[0]!.top).toEqual({ ans: '7', n: 3 });
    if (cells[1]) expect(cells[1]).toMatchObject({ firstWrong: 0, retries: 0 });
  });
  it('2명뿐인 오답 = 「기타」(안 보임) · 3명 미만 칸 = 카드에서 뺌 · 살아 있는 몬스터 = 오답 숨김 · 응원 줄 숫자', () => {
    const { S, R, put } = room();
    put('a', 0, [0], '9'); put('b', 0, [0], '9'); put('c', 0, []);
    for (let k = 0; k < 12; k++) S.set(`rooms/G1/players/z${k}`, { nick: `z${k}`, at: S.now(), seen: S.now() }); // 몬스터가 살아 있게 (체력 = 인원)
    expect(gobiMonster(L, R(), mid)[0]!.top).toBeNull();
    const g = gobiCard(L, R(), mid, Date.now());
    expect(g.alive).toBe(true);
    expect(g.cells.every((c) => c.top === null)).toBe(true);
    expect(g.cells[0]).toMatchObject({ firstWrong: 2 });
    const { R: R2, put: put2 } = room(); put2('a', 0, [0]); put2('b', 0, []);
    expect(gobiCard(L, R2(), mid, Date.now()).cells).toEqual([]); // 2명 = 뺌
  });
  it('🔎 단추 = 하나라도 풀면 보임 · 누를 때마다 📊 고비 → (쓰러진 뒤) 자주 하는 실수 → 닫기 · 고비 동안 공격 시계 멈춤', () => {
    const { S, R, put } = room();
    expect(reviewStep(L, R(), mid).show).toBe(false);
    put('a', 0, []);
    const r0 = reviewStep(L, R(), mid);
    expect(r0.show).toBe(true); expect(r0.label).toBe('풀이'); expect(r0.next).toMatchObject({ mid, i: -2 });
    stepReview(S, 'G1', L, R());
    expect(R().state.review).toMatchObject({ i: -2 });
    expect((R().state as { demoAt?: number | null }).demoAt).not.toBeNull(); // 시계 멈춤
    expect(reviewStep(L, R(), mid).label).toBe('고비');
    stepReview(S, 'G1', L, R()); // 살아 있는 몬스터 = 자주 하는 실수 숨김 → 바로 닫힘
    expect(R().state.review ?? null).toBeNull();
    expect((R().state as { demoAt?: number | null }).demoAt ?? null).toBeNull(); // 시계 다시
  });
});
