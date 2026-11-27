// 🐞 💎 11/27 「수업 EXP 놓친 것 채우기」 (DECISIONS 266e46a) — 채울 차시 고르기 (끝 화면과 같은 받음 칸 = xp log raid_{수업})
import { describe, expect, it } from 'vitest';
import { CATCH_SINCE, missedRaids } from '../src/school/rewardCatch';

const T = CATCH_SINCE + 3600e3;
describe('💎 놓친 수업 보상 · 채울 차시', () => {
  it('맞힌 것 있음 · 정식 출시 뒤 · 받음 칸(raid_{수업}) 없음만 · 차시 순서', () => {
    const recs = {
      'ex-13': { code: '300', no: 13, at: T, right: 3 },
      'ex-11': { code: '100', no: 11, at: T, right: 2 },
      'ex-12': { code: '200', no: 12, at: T, right: 0 }, // 맞힌 것 없음
      'set-09': { code: '090', no: 9, at: CATCH_SINCE - 1, right: 5 }, // 출시 전
      'ex-14': { code: '400', no: 14, at: T, right: 4 }, // 이미 받음
      'ex-15': { no: 15, at: T, right: 4 }, // 수업 코드 없음
    };
    expect(missedRaids(recs, { raid_400: { xp: 30 } }).map((x) => x.lid)).toEqual(['ex-11', 'ex-13']);
  });
  it('이 기기에서 「채울 것 없음」으로 본 수업 = 다시 안 물음 · 빈 기록 = 없음', () => {
    expect(missedRaids({ 'ex-11': { code: '100', no: 11, at: T, right: 2 } }, {}, new Set(['100']))).toEqual([]);
    expect(missedRaids({}, {})).toEqual([]);
  });
});
