// 캠프 정보판 규칙: 스킬 사다리 4칸(#96 · 다음 칸만 · Ⅳ = 📜) · 💰 지갑 { id, ver } 자동 이전
import { describe, expect, it } from 'vitest';
import { rungs } from '../src/model/hero';
import { ECON_VER, MIGRATE, migrate } from '../src/model/wallet';

describe('스킬 사다리 4칸', () => {
  it('처음 = Ⅰ 장착 · Ⅱ 살 수 있음 · Ⅲ Ⅳ 잠김(앞 칸 먼저)', () => {
    expect(rungs(0, [], 'cut', { gem: 9999, scroll: 30 }).map((r) => r.state)).toEqual(['equip', 'buy', 'lock', 'lock']);
  });
  it('💎 모자라면 다음 칸도 잠김 + 이유', () => {
    const r = rungs(0, [], 'cut', { gem: 10, scroll: 0 })[1];
    expect(r).toMatchObject({ state: 'lock', why: '💎 10 모자람' });
  });
  it('Ⅳ = 💎 80 + 📜 2 · 📜 모자라면 잠김', () => {
    const r = rungs(0, ['moon', 'slash'], 'slash', { gem: 999, scroll: 1 });
    expect(r.map((x) => x.state)).toEqual(['own', 'own', 'equip', 'lock']);
    expect(r[3]).toMatchObject({ gem: 80, scroll: 2, why: '📜 1 모자람' });
  });
});

describe('💰 지갑 자동 이전 (DECISIONS 「💰 경제 변경 규칙」 ④)', () => {
  it('지금 판이면 그대로', () => {
    const w = { gem: 5, scroll: 1, buys: [{ id: 'fx_moon', ver: ECON_VER, at: 1 }], ver: ECON_VER };
    expect(migrate(w)).toMatchObject({ gem: 5, buys: [{ id: 'fx_moon', ver: ECON_VER }], ver: ECON_VER });
  });
  it('옛 판 → 표대로 옮기고 기록 · 값(💎)은 그대로', () => {
    MIGRATE[0] = { fx_old: 'fx_moon' };
    try {
      const out = migrate({ gem: 7, scroll: 0, buys: [{ id: 'fx_old', ver: 0, at: 1 }, { id: 'fx_keep', ver: 0, at: 2 }], ver: 0 });
      expect(out.buys).toEqual([{ id: 'fx_moon', ver: 1, at: 1 }, { id: 'fx_keep', ver: 1, at: 2 }]);
      expect(out.gem).toBe(7);
      expect(out.log).toEqual(['경제 0 → 1 판 옮김']);
    } finally { delete MIGRATE[0]; }
  });
});
