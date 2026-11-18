import { describe, expect, it } from 'vitest';
import { cumOf, CUM_T0 } from '../src/school/cum';
// 💰 #65 누적 받은 💎 · 📜 = 옛 정식 earned + v1.0(옮긴 뒤) log 받은 것 + 받은 선물 + log 없는 한도 안(day − 한도 안 log − 석화)
const T = CUM_T0 + 1, D16 = Date.parse('2026-11-16T10:00:00+09:00');
describe('💰 #65 누적', () => {
  it('옛 earned 그대로 + 옮긴 뒤 받은 것만 · 쓴 것 · 보낸 것 · 되돌림 빼기', () => {
    const row = { earned: 500, scrollEarned: 7, day: { '2026-11-14': 80, '2026-11-16': 30 }, log: {
      raid_old: { g: 9, at: CUM_T0 - 1000 }, // 옛 = earned 에 이미 들어 있음
      raid_A: { g: 12, at: D16 }, streak3_x: { g: 5, at: D16 }, enh_1: { g: -40, at: D16 }, buy_x: { g: -10, at: D16 }, fs_1: { g: -4, at: D16 }, refund_1: { g: 120, at: D16 }, sell_1: { g: 20, at: D16 },
      s_ph_P_r1: { s: 1, at: D16 },
    } };
    const gifts = { t1: { g: 3, at: T, got: true }, t2: { g: 9, at: T }, ult_x: { g: 0, s: 1, at: D16, got: true }, petri_1: { g: 4, at: D16, got: true } };
    // log 받은 것 = 12 + 5 = 17 · 선물 = 3 + 4 = 7 (t2 = 안 받음) · day(11/16~) 30 − 한도 안 log 12 − 석화 4 = 14 (게시판 · 성채처럼 log 없는 것)
    expect(cumOf(row, gifts, 2)).toEqual({ gem: 500 + 17 + 7 + 14, scroll: 7 + 1 + 1 + 2 });
  });
  it('기록 없음 = 0 · 옛 기록만 = earned', () => {
    expect(cumOf(null, null)).toEqual({ gem: 0, scroll: 0 });
    expect(cumOf({ earned: 300, log: { raid_a: { g: 9, at: 1 } } }, {})).toEqual({ gem: 300, scroll: 0 });
  });
});
