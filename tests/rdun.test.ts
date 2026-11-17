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
      [...D.attack, ...D.bossAttack, ...(D.rowAttack ?? [])].forEach((a) => expect(ATTACKS[a], `${id} ${a}`).toBeTruthy());
      expect(D.rowAttack?.length, `${id} 줄마다 공격 (#43)`).toBe(D.names.length);
      for (let r = 0; r < D.rows; r++) { expect(runeAt(S, r, 4)).toBeNull(); expect(runeAt(S, r, 0), `${id} 줄 ${r} 대기 A 룬`).not.toBeNull(); }
    }
  });
  it('그림 있는 차시 = 그대로 · 고른 던전 = 그 던전 그림 · 공격 · 배경 · 몸 룬', () => {
    const L = PACKS.find((p) => p.no === 6)!;
    expect(artless(L)).toBe(false); expect(rdunOf(L)).toBe(''); expect(dressed(L)).toBe(L);
    const D = dressed(L, 'd01'), mids = D.steps.filter((s) => s.kind === 'monster').map((s) => s.id);
    expect(D.theme).toBe(RDUN.d01!.bg);
    mids.forEach((id, i) => { const sp = spriteOf(D.monsters[id]!.sprite); expect(sp.sheet.src).toBe(RDUN.d01!.src); expect(sp.row).toBe(i % 5); expect(sp.rune.length).toBeGreaterThan(0); expect(D.monsters[id]!.attack, `줄 ${sp.row}`).toBe(RDUN.d01!.rowAttack![sp.row]); }); // 📜 #43 그림 줄마다 공격 하나
    expect(spriteOf(D.boss!.sprite).row).toBe(5); expect(D.boss!.attack).toEqual(['bind', 'sleep', 'smash']);
    const chain = mids.find((id) => D.monsters[id]!.chain); if (chain) expect(spriteOf(D.monsters[chain]!.sprite).elite).toBe(true);
    // 보스 줄 없는 던전 = 보스 묶음 시트
    const D3 = dressed(L, 'd03'), b = spriteOf(D3.boss!.sprite); expect(b.sheet.names[b.row]).toBe('서리 여왕'); // 👑 보스 묶음 bg1
    expect(D3.boss!.attack![0]).toBe('ice'); expect(D3.monsters[mids[2]!]!.attack).toBe('ice'); // 📜 #43 서리 여왕 = 얼음 먼저 · 펭귄 기사 = 얼음
  });
  it('그림 없는 차시 = 차례로 배정 (그림 지운 사본)', () => {
    const L = PACKS.find((p) => p.no === 6)!, bare = { ...L, id: 'bare', monsters: Object.fromEntries(Object.entries(L.monsters).map(([k, m]) => [k, { ...m, sprite: '' }])) };
    expect(artless(bare)).toBe(true); expect(RDUN_IDS).toContain(rdunOf(bare));
    expect(spriteOf(dressed(bare).monsters.m1!.sprite).sheet.cols).toBe(5);
  });
  it('🖼 던전마다 자기 배경 (📜 2026-11-14 배경화면 12종 · rd-d01 … rd-d12 · 파일 있음 · 겹치지 않음)', async () => {
    const { DUNGEONS } = await import('../src/ui/manifest'); const fs = await import('fs');
    const bgs = Object.keys(RDUN).map((k) => RDUN[k]!.bg);
    expect(new Set(bgs).size).toBe(Object.keys(RDUN).length);
    for (const k of Object.keys(RDUN)) { const b = RDUN[k]!.bg; expect(b).toBe(`rd-${k}`); expect(DUNGEONS[b]).toBeTruthy(); expect(fs.existsSync(`public/${DUNGEONS[b]}`)).toBe(true); }
  });
});

// 🔊 #43 TV 맞는 소리 = 0.15초에 한 번 · 공격 종류 소리 표
import { atkSfx, tvHurt } from '../src/ui/sound.svelte';
describe('#43 소리', () => {
  it('맞는 소리 몰리면 0.15초에 한 번 · 공격 종류 소리', () => {
    expect(tvHurt(10_000)).toBe(true); expect(tvHurt(10_100)).toBe(false); expect(tvHurt(10_160)).toBe(true);
    expect(atkSfx(ATTACKS.fire!)).toBe('fire'); expect(atkSfx(ATTACKS.ice!)).toBe('frost'); expect(atkSfx(ATTACKS.poison!)).toBe('poison'); expect(atkSfx(ATTACKS.wind!)).toBe('wind'); expect(atkSfx(ATTACKS.smash!)).toBe('smash');
  });
});
import { setMuteAll, sfx, sfxLog } from '../src/ui/sound.svelte';
describe('#44 ⑤ TV 소리 끔', () => {
  it('끄면 효과음 전부 안 남 (기록은 남음 · 재생 없음) · 켜면 다시', () => {
    setMuteAll(true); expect(() => sfx('hurt')).not.toThrow(); expect(sfxLog.at(-1)).toBe('hurt'); setMuteAll(false);
  });
});
