// 👥 리모컨 학생판 (📜 2026-11-17 #24) — 칸 계산 · 배치 · 오늘 표
import { describe, expect, it } from 'vitest';
import type { Given, Question, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { chainSubmit, heartbeat, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, chainRecord, isChain, itemsFor } from '../src/raid/raid';
import { PACKS } from '../src/engine/packs';
import { boardCols, boardScroll, cellOf, givenName, swordDots, todayCols, todayRow } from '../src/school/stuBoard';

const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
function setup(chain: boolean) {
  for (const L of PACKS) for (const s of L.steps) {
    if (s.kind !== 'monster' || !L.monsters[s.id]) continue;
    const S = mk(); openRoom(S, L, 'SB', PROFILES.test); const R = () => S.get<Room>(roomPath('SB'))!;
    if (isChain(L, R(), s.id) !== chain) continue;
    heartbeat(S, 'SB', 'a', 1, '가'); heartbeat(S, 'SB', 'b', 2, '나');
    return { L, S, R, mid: s.id };
  }
  throw new Error('no monster');
}
describe('👥 학생판', () => {
  it('이름 = 성 뺌 · 두 글자 이름은 그대로 · 🤖 그대로', () => {
    expect(givenName('김하늘')).toBe('하늘'); expect(givenName('이결')).toBe('이결'); expect(givenName('·가상2')).toBe('·가상2'); expect(givenName('남궁민수')).toBe('궁민수');
  });
  it('배치 = 한 줄 max(5, ceil(n/4)) 최대 7 · 늘 4줄 · 29명부터 밀기', () => {
    expect([10, 20, 21, 24, 25, 28, 29, 35].map(boardCols)).toEqual([5, 5, 6, 6, 7, 7, 7, 7]);
    expect(boardScroll(28)).toBe(false); expect(boardScroll(29)).toBe(true);
  });
  it('일반 몬스터: 안 냄 = 칼 가득 · 진행 0 / 틀림 = 칼 하나 씀 · 재도전 1 / 다 맞힘 = ✔', () => {
    const { L, S, R, mid } = setup(false);
    const c0 = cellOf(L, R(), mid, 'a'); expect(c0.sub).toBe(false); expect(c0.prog).toBe(0); expect(swordDots(c0).on).toBe(Math.min(4, c0.slots));
    submit(S, L, 'SB', mid, 'a', wrong(itemsFor(L, R(), mid, 'a', 0)));
    const c1 = cellOf(L, R(), mid, 'a'); expect(c1.left).toBe(c0.left - 1); expect(c1.wrong).toBe(1); expect(c1.done).toBe(false);
    submit(S, L, 'SB', mid, 'a', itemsFor(L, R(), mid, 'a', 1).map(answerOf));
    const c2 = cellOf(L, R(), mid, 'a'); expect(c2.done).toBe(true); expect(c2.prog).toBe(1);
    const t = todayRow(L, R(), 'a'), k = todayCols(L).findIndex((x) => x.id === mid);
    expect(t.marks[k]!.t).toBe('ok'); expect(t.retry).toBe(1); expect(todayRow(L, R(), 'b').marks[k]!.t).toBe('none');
  });
  it('일반 몬스터: 칼을 다 쓰면 ⚔0', () => {
    const { L, S, R, mid } = setup(false);
    for (let a = 0; a < 8 && cellOf(L, R(), mid, 'b').left > 0; a++) submit(S, L, 'SB', mid, 'b', wrong(itemsFor(L, R(), mid, 'b', a)));
    const c = cellOf(L, R(), mid, 'b'); expect(c.left).toBe(0); expect(c.zero).toBe(true);
  });
  it('소레이드: 진행 = 단계 / 전체', () => {
    const { L, S, R, mid } = setup(true);
    const r = chainRecord(L, R(), mid, 'a'); chainSubmit(S, L, 'SB', mid, 'a', 0, 0, answerOf(r.items[0]!));
    const c = cellOf(L, R(), mid, 'a'); expect(c.got).toBe(1); expect(c.prog).toBeCloseTo(1 / r.n);
    expect(todayRow(L, R(), 'a').marks[todayCols(L).findIndex((x) => x.id === mid)]!.text).toBe(`1/${r.n}`);
  });
});
