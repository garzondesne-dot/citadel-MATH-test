// 🤖 #100 빈자리 봇 = 보스 실드 속성 중 사람이 없는 속성 용사부터 (겹치지 않게) → 그다음 지금 순서
import { describe, expect, it } from 'vitest';
import { botHeroes } from '../src/board/atbLink';
import { bossOf, shieldOf } from '../src/board/atb/tune';
import { famOf } from '../src/board/atb/heroes';
import { HEROES } from '../src/model/hero';

const all = HEROES.map((h) => h.id);
describe('🤖 #100 봇 용사', () => {
  for (const no of [2, 3, 6, 10, 12]) {
    it(`${no}차시 · 혼자(나 + 봇 3) = 내가 없는 실드 속성(📜 #101 = 약점 2칸)을 봇이 먼저 하나씩`, () => {
      const me = all[0]!, free = all.filter((h) => h !== me), sh = shieldOf(bossOf(no));
      const bots = botHeroes(no, [me], free, 3), fams = bots.map(famOf);
      const want = sh.filter((f) => f !== famOf(me));
      expect(fams.slice(0, want.length)).toEqual(want);
      expect(new Set(bots).size).toBe(3);
      expect(bots.includes(me)).toBe(false);
    });
  }
  it('팀 3명 = 남은 한 칸만 · 사람과 같은 속성은 건너뜀', () => {
    const no = 6, sh = shieldOf(bossOf(no)), p0 = all.find((h) => famOf(h) === sh[0])!, ppl = [p0, ...all.filter((h) => h !== p0 && !sh.includes(famOf(h))).slice(0, 2)];
    const bots = botHeroes(no, ppl, all.filter((h) => !ppl.includes(h)), 1);
    expect(famOf(bots[0]!)).toBe(sh[1]);
  });
  it('실드 속성을 사람이 다 맡으면 = 지금 순서(남은 용사 차례로)', () => {
    const no = 6, sh = shieldOf(bossOf(no)), ppl = sh.slice(0, 2).map((f) => all.find((h) => famOf(h) === f)!).slice(0, 2);
    const free = all.filter((h) => !ppl.includes(h)), bots = botHeroes(no, [...ppl, ...sh.slice(2).map((f) => all.find((h) => famOf(h) === f && !ppl.includes(h))!)], free, 2);
    expect(bots).toHaveLength(2); expect(new Set(bots).size).toBe(2);
  });
});
