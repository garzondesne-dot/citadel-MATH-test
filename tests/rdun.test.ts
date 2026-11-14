// 🎲 랜덤 던전 입히기 (2026-11-14 · DECISIONS 「🎲 랜덤 던전」)
import { describe, expect, it } from 'vitest';
import { PACKS } from '../src/engine/packs';
import { dressed, rdunOf, artless } from '../src/ui/rdun';
import { RDUN, RDUN_IDS, spriteOf, SHEETS, runeAt } from '../src/ui/manifest';
import { ATTACKS } from '../src/raid/attacks';

describe('랜덤 던전', () => {
  it('던전 9곳 = 5칸 시트 · 몬스터 5 (+ 보스 줄) · 공격 id 가 공격 표에 있음 · 룬 자리 = 쓰러짐 칸엔 없음', () => {
    expect(RDUN_IDS.length).toBeGreaterThanOrEqual(9);
    for (const id of RDUN_IDS) {
      const D = RDUN[id]!, S = SHEETS[id]!;
      expect(S.cols).toBe(5); expect(D.names.length).toBe(D.rows);
      expect(D.rows).toBe(D.boss == null ? 5 : 6);
      [...D.attack, ...D.bossAttack].forEach((a) => expect(ATTACKS[a], `${id} ${a}`).toBeTruthy());
      for (let r = 0; r < D.rows; r++) { expect(runeAt(S, r, 4)).toBeNull(); expect(runeAt(S, r, 0), `${id} 줄 ${r} 대기 A 룬`).not.toBeNull(); }
    }
  });
  it('그림 있는 차시 = 그대로 · 고른 던전 = 그 던전 그림 · 공격 · 배경 · 몸 룬', () => {
    const L = PACKS.find((p) => p.no === 6)!;
    expect(artless(L)).toBe(false); expect(rdunOf(L)).toBe(''); expect(dressed(L)).toBe(L);
    const D = dressed(L, 'd01'), mids = D.steps.filter((s) => s.kind === 'monster').map((s) => s.id);
    expect(D.theme).toBe(RDUN.d01!.bg);
    mids.forEach((id, i) => { const sp = spriteOf(D.monsters[id]!.sprite); expect(sp.sheet.src).toBe(RDUN.d01!.src); expect(sp.row).toBe(i % 5); expect(sp.rune.length).toBeGreaterThan(0); expect(['bind', 'sleep']).toContain(D.monsters[id]!.attack); });
    expect(spriteOf(D.boss!.sprite).row).toBe(5); expect(D.boss!.attack).toEqual(['bind', 'sleep', 'smash']);
    const chain = mids.find((id) => D.monsters[id]!.chain); if (chain) expect(spriteOf(D.monsters[chain]!.sprite).elite).toBe(true);
    // 보스 그림이 아직 없는 던전 = 마지막 몬스터 색 돌림 + 대장
    const D3 = dressed(L, 'd03'), b = spriteOf(D3.boss!.sprite); expect(b.row).toBe(4); expect(b.hue).toBe(180); expect(b.elite).toBe(true);
  });
  it('그림 없는 차시 = 차례로 배정 (그림 지운 사본)', () => {
    const L = PACKS.find((p) => p.no === 6)!, bare = { ...L, id: 'bare', monsters: Object.fromEntries(Object.entries(L.monsters).map(([k, m]) => [k, { ...m, sprite: '' }])) };
    expect(artless(bare)).toBe(true); expect(RDUN_IDS).toContain(rdunOf(bare));
    expect(spriteOf(dressed(bare).monsters.m1!.sprite).sheet.cols).toBe(5);
  });
});
