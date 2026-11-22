// 🛡 #103 수호자 「도와줘」 = 도전자 부탁 → 수호자 힌트 → 그 소문항 맞힘 = 🤝 구조 성공 (기록 한 칸 · MVP 도운 횟수 +1)
import { describe, expect, it } from 'vitest';
import { askHelp, sendHelp, earn, guardsOf } from '../src/board/atb/engine';
import { applyAct, battleOf, type Meta } from '../src/board/atb/net';
import { BOSSES } from '../src/board/atb/tune';

const meta = (gd: boolean): Meta => ({ v: 1, pid: 'p1', lid: 'L2', no: 2, diff: 'normal', seed: 7, t0: 0, slots: [
  { uid: 'a', cls: '1-1', num: 1, hero: 1, lv: 1, enh: 0, tier: 1, nick: '테스트 가' },
  { uid: 'b', cls: '1-1', num: 2, hero: 2, lv: 1, enh: 0, tier: 1, nick: '테스트 나', ...(gd ? { gd: true } : {}) },
  { bot: 'normal', hero: 3 }, { bot: 'normal', hero: 4 },
] });
const ok = { done: false, perfect: false, right: true }, bad = { done: false, perfect: false, right: false };

describe('🛡 #103 도와줘', () => {
  it('수호자 = 사람 자리만 · 봇 아님', () => {
    const S = battleOf(meta(true), BOSSES[2]!);
    expect(S.heroes.map((h) => !!h.gd)).toEqual([false, true, false, false]);
    expect(guardsOf(S, 0).map((h) => h.id)).toEqual([1]);
  });
  it('수호자 없음 = 부탁 못 함 · 수호자는 자기한테 부탁 안 함', () => {
    const S = battleOf(meta(false), BOSSES[2]!);
    expect(askHelp(S, 0)).toBe(false);
    const G = battleOf(meta(true), BOSSES[2]!);
    expect(askHelp(G, 1)).toBe(false);
  });
  it('부탁 → 힌트 → 맞힘 = 구조 성공 1 (수호자 기록 · 판 기록)', () => {
    const S = battleOf(meta(true), BOSSES[2]!);
    expect(applyAct(S, { k: 'ask', s: 0 })).toBe(true);
    expect(askHelp(S, 0)).toBe(false); /* 기다리는 중 = 한 번 */
    expect(S.ev.at(-1)).toMatchObject({ k: 'ask', who: 0 });
    expect(applyAct(S, { k: 'aid', s: 2, to: 0 })).toBe(false); /* 봇 = 수호자 아님 */
    expect(applyAct(S, { k: 'aid', s: 1, to: 0 })).toBe(true);
    expect(sendHelp(S, 1, 0)).toBe(false); /* 이미 보냄 */
    earn(S, 0, ok);
    expect(S.heroes[1]!.log.aids).toBe(1); expect(S.rec.aidOk).toBe(1); expect(S.asks?.[0]).toBeUndefined();
    expect(S.ev.some((e) => e.k === 'aid' && e.ok === true)).toBe(true);
    earn(S, 0, ok); expect(S.heroes[1]!.log.aids).toBe(1); /* 다음 소문항 = 안 셈 */
  });
  it('힌트 받고 틀림 = 구조 실패 (안 셈) · 기다리다 원문항 끝 = 부탁 취소', () => {
    const S = battleOf(meta(true), BOSSES[2]!);
    askHelp(S, 0); sendHelp(S, 1, 0); earn(S, 0, bad);
    expect(S.heroes[1]!.log.aids ?? 0).toBe(0); expect(S.ev.some((e) => e.k === 'aid' && e.ok === false)).toBe(true);
    askHelp(S, 0); earn(S, 0, { ...ok, done: true });
    expect(S.asks?.[0]).toBeUndefined(); expect(sendHelp(S, 1, 0)).toBe(false);
  });
  it('쓰러진 수호자 = 못 보냄 · 수호자가 모두 쓰러짐 = 부탁 못 함', () => {
    const S = battleOf(meta(true), BOSSES[2]!);
    askHelp(S, 0); S.heroes[1]!.down = true;
    expect(sendHelp(S, 1, 0)).toBe(false); expect(guardsOf(S, 0)).toEqual([]);
    delete S.asks![0]; expect(askHelp(S, 0)).toBe(false);
  });
});
