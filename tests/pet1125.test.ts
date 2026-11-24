// 🐾 둥지 (📜 2026-11-25 · 머리 🔨 · 설계 3절): 알 · 먹이 · 단계 · 꾸미기 · 이름 · 꼬리표
import { describe, expect, it } from 'vitest';
import { PET_CFG, PET_NAME_A, PET_NAME_B, activePet, buyEgg, buyPetCos, feed, nextOf, ownsPetCos, petClean, petCosOf, petFromTag, stageOf, togglePetCos, type PetState } from '../src/model/pets';
import { ECON_VER, type Wallet } from '../src/model/wallet';

const W = (gem: number): Wallet => ({ gem, scroll: 0, buys: [], ver: ECON_VER });
describe('🐾 둥지', () => {
  it('값 = 알 150 · 꾸미기 80 · 먹이 수업 5 · 허수아비 1 (하루 5) · 새끼 15 · 다 큼 50 · 이름 낱말 6 × 6', () => {
    expect(PET_CFG).toEqual({ egg: 150, cos: 80, lesson: 5, scare: 1, scareDay: 5, baby: 15, adult: 50 });
    expect(PET_NAME_A.length * PET_NAME_B.length).toBe(36);
  });
  it('알 사기 = 💎 −150 · 새 펫 = 데리고 다님 · 모자라면 까닭 · 여러 마리', () => {
    const w = W(320), st: PetState = {};
    const r = buyEgg(w, st, 'owl', '반짝 별', 1000);
    expect('id' in r && r.id).toBeTruthy(); expect(w.gem).toBe(170); expect(activePet(st)?.kind).toBe('owl'); expect(w.buys[0]!.id).toMatch(/^pet_egg_owl_/);
    const r2 = buyEgg(w, st, 'dragon', '꼬마 콩', 2000); expect('id' in r2).toBe(true); expect(w.gem).toBe(20); expect(Object.keys(st.list!).length).toBe(2); expect(activePet(st)?.kind).toBe('dragon');
    expect(buyEgg(w, st, 'slime', 'x', 3000)).toEqual({ err: '💎 130 이 모자라요' });
  });
  it('먹이: 수업 차시마다 한 번 +5 · 허수아비 하루 5까지 · 데리고 다니는 펫만 · 단계 0 → 1 → 2', () => {
    const st: PetState = {}; buyEgg(W(999), st, 'slime', '보송 구름', 1);
    expect(feed(st, { lesson: 'set-07' })).toBe(5); expect(feed(st, { lesson: 'set-07' })).toBe(0);
    for (let i = 0; i < 7; i++) feed(st, { scare: '2026-11-25' });
    expect(activePet(st)!.food).toBe(10); // 5 + 5 (하루 5까지)
    expect(feed(st, { scare: '2026-11-26' })).toBe(1);
    expect(stageOf(14)).toBe(0); expect(stageOf(15)).toBe(1); expect(stageOf(49)).toBe(1); expect(stageOf(50)).toBe(2);
    expect(nextOf(3)).toEqual([3, 15]); expect(nextOf(20)).toEqual([5, 35]); expect(nextOf(60)).toBeNull();
    expect(feed({}, { lesson: 'a' })).toBe(0); // 펫 없음
  });
  it('꾸미기 = 다 큰 펫만 · 펫마다 따로 · 자리마다 하나(머리 · 목)', () => {
    const w = W(999), st: PetState = {}; const r = buyEgg(w, st, 'dragon', '날쌘 불꽃', 1) as { id: string };
    expect(buyPetCos(w, st, r.id, 'pc_crown', 2)).toMatch(/다 큰 펫만/);
    st.list![r.id]!.food = 50;
    expect(buyPetCos(w, st, r.id, 'pc_crown', 2)).toBeNull(); expect(w.gem).toBe(999 - 150 - 80); expect(ownsPetCos(w, r.id, 'pc_crown')).toBe(true);
    let p = togglePetCos(st.list![r.id]!, 'pc_crown'); p = togglePetCos(p, 'pc_scarf'); p = togglePetCos(p, 'pc_santa');
    expect(petCosOf(p)).toEqual(['pc_scarf', 'pc_santa']); // 머리 = 하나 (왕관 → 산타)
    expect(petCosOf(togglePetCos(p, 'pc_scarf'))).toEqual(['pc_santa']);
  });
  it('서버 값 거르기 · 종합실 꼬리표', () => {
    expect(petClean({ list: { a: { kind: 'cat', food: 3 }, b: { kind: 'owl', food: '7', name: 'x', cos: 'pc_crown,zz' } } })).toEqual({ on: 'b', list: { b: { kind: 'owl', food: 7, name: 'x', cos: 'pc_crown' } } });
    expect(petFromTag('owl|60|pc_crown,zz')).toEqual({ kind: 'owl', food: 60, cos: 'pc_crown' });
    expect(petFromTag('cat|1|')).toBeNull(); expect(petFromTag(undefined)).toBeNull();
  });
});
