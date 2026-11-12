// 📋 게시판 던전 1인 (#143): 개념 없는 판 · 숫자 바뀐 판 · 하트 2 · 다 하면 다음 · 첫 시도 등급 · 💎 · 하루 한도
import { describe, expect, it } from 'vitest';
import type { Given, LessonPack, Question, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { bossSubmit, chainSubmit, heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, bossItem, bossState, chainRecord, isChain, isEnd, itemsFor, plainRecord, stepOf } from '../src/raid/raid';
import { items as packItems } from '../src/engine/lessons';
import { packOf } from '../src/engine/packs';
import { boardPack, firstTry, freshAll, gemsOf, gradeOf, itemCount, kstDay, stepDone } from '../src/board/board';
import { earnDaily } from '../src/model/wallet';

const L0 = packOf('set-06')!;
const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
function setup() {
  const L = boardPack(L0), S: Store = { ...memoryStore(), kind: 'memory' };
  openRoom(S, L, 'B1', PROFILES.board); S.set(`${roomPath('B1')}/meta/fresh`, freshAll(L));
  heartbeat(S, 'B1', 'me', 1, '나'); nextStep(S, L, 'B1');
  return { L, S, R: () => S.get<Room>(roomPath('B1')) as Room };
}
describe('📋 게시판 던전 1인 (#143)', () => {
  it('판 = 문제 → 형성평가만 (개념 · 도입 없음) · 하트 2 · 체력 = 소문제 수', () => {
    const { L, R } = setup();
    expect(L.steps.every((s) => s.kind === 'monster' || s.kind === 'boss')).toBe(true);
    expect(L.steps.at(-1)?.kind).toBe('boss');
    expect(R().meta.retries + 1).toBe(2);
    expect(itemCount(L, R())).toBeGreaterThan(10);
  });
  it('첫 판부터 숫자 바뀐 판 (학습지 원문 아님)', () => {
    const { L, R } = setup(), s = stepOf(L, R())!;
    if (isChain(L, R(), s.id)) return;
    const raw = packItems(L, s.id, 'x', 0).map((q) => q.question).join('|'), mine = itemsFor(L, R(), s.id, 'me', 0).map((q) => q.question).join('|');
    expect(mine).not.toBe(raw);
  });
  it('다 맞히며 끝까지 → 등급 S · 클리어 💎 = 12 + 4 · 하루 한도 100', () => {
    const { L, S, R } = setup();
    for (let g = 0; g < 40 && !isEnd(L, R()); g++) {
      const s = stepOf(L, R())!;
      if (s.kind === 'boss') { bossState(L, R(), 'me').forEach((x, i) => { if (!x.ok) bossSubmit(S, L, 'B1', 'me', i, answerOf(bossItem(L, R(), 'me', i, x.next)!)); }); }
      else if (isChain(L, R(), s.id)) { for (let k = 0; k < 12 && !chainRecord(L, R(), s.id, 'me').done; k++) { const r = chainRecord(L, R(), s.id, 'me'); chainSubmit(S, L, 'B1', s.id, 'me', r.stage, 0, answerOf(r.items[r.stage]!)); } }
      else submit(S, L, 'B1', s.id, 'me', itemsFor(L, R(), s.id, 'me', 0).map(answerOf));
      expect(stepDone(L, R(), 'me')).toBe(true);
      nextStep(S, L, 'B1');
    }
    expect(isEnd(L, R())).toBe(true);
    const f = firstTry(L, R(), 'me');
    expect(f.bad + f.none).toBe(0); expect(gradeOf(f)).toBe('S');
    expect(gemsOf({ right: f.ok, clear: true, n: 1 })).toEqual({ base: 16, team: 0, total: 16 });
    const w = { gem: 0, scroll: 0, buys: [], ver: 1, day: { '2026-11-12': 90 } };
    expect(earnDaily(w, 16, '2026-11-12', 100)).toBe(10); expect(w.gem).toBe(10); expect(earnDaily(w, 5, '2026-11-12', 100)).toBe(0);
    expect(earnDaily(w, 5, '2026-11-13', 100)).toBe(5); expect(w.day).toEqual({ '2026-11-12': 100, '2026-11-13': 5 });
    expect(kstDay(Date.UTC(2026, 10, 12, 15, 30))).toBe('2026-11-13'); // KST 자정 넘김
  });
  it('틀림 2번 → 기회 끝 = 다음으로 · 첫 시도 틀림 · 안 푼 문제 = 미제출 → 등급 C', () => {
    const { L, S, R } = setup(), s = stepOf(L, R())!;
    if (isChain(L, R(), s.id)) return;
    submit(S, L, 'B1', s.id, 'me', wrong(itemsFor(L, R(), s.id, 'me', 0)));
    expect(stepDone(L, R(), 'me')).toBe(false);
    submit(S, L, 'B1', s.id, 'me', wrong(itemsFor(L, R(), s.id, 'me', 1)));
    expect(plainRecord(L, R(), s.id, 'me').canRetry).toBe(false); expect(stepDone(L, R(), 'me')).toBe(true);
    const f = firstTry(L, R(), 'me');
    expect(f.ok).toBe(0); expect(f.bad).toBe(itemsFor(L, R(), s.id, 'me', 0).length); expect(f.none).toBeGreaterThan(0);
    expect(gradeOf(f)).toBe('C');
    expect(gemsOf({ right: 0, clear: false, n: 1 }).total).toBe(0);
  });
  it('팀 배수 1 · 1.1 · 1.2 · 1.3', () => {
    expect([1, 2, 3, 4].map((n) => gemsOf({ right: 12, clear: true, n }).total)).toEqual([16, 18, 19, 21]);
  });
});
