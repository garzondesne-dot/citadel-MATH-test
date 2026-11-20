// 🏅 W2 용사마다 스킬 · 칭호 (📜 2026-11-20 선생님 「내 용사에서 스킬 · 호칭 저장되면 용사 바꿔도 같이 저장된 걸로」)
import { describe, expect, it } from 'vitest';
import { bestSkill, emptyPlan, equipOf, save, switchHero, type Look } from '../src/model/draft';
import { isAwakened, ladder } from '../src/model/hero';
import { ECON_VER, type Wallet } from '../src/model/wallet';

const W = (ids: string[] = []): Wallet => ({ gem: 9999, scroll: 99, buys: ids.map((id) => ({ id, ver: ECON_VER, at: 1 })), ver: ECON_VER });
const L0: Look = { hero: 0, enh: 10, socket: { 0: 'twin' }, title: 'slash10k' };

describe('W2 용사 바꾸기', () => {
  it('처음 고르는 용사 = 그 속성 가진 것 중 가장 높은 스킬 · 칭호 = 지금 것', () => {
    const w = W(['hero_18', 'fx_claw', 'fx_phantom']);
    const L = switchHero(L0, 18, w, emptyPlan());
    expect(equipOf(L)).toBe('phantom'); expect(L.title).toBe('slash10k');
    expect(L.titles).toEqual({ 0: 'slash10k' });
  });
  it('아무것도 안 샀으면 Ⅰ', () => expect(bestSkill(W(), emptyPlan(), 18)).toBe(ladder(18)[0]));
  it('윗 칸을 가지면 아래 칸도 가짐(#78) → 가장 높은 것 = 산 칸', () => expect(bestSkill(W(['fx_eclipse']), emptyPlan(), 18)).toBe('eclipse'));
  it('돌아오면 그 용사에 저장된 스킬 · 칭호', () => {
    const w = W(['hero_18', 'fx_eclipse']);
    let L = switchHero(L0, 18, w, emptyPlan());
    L = { ...L, title: 'awk_18', socket: { ...L.socket, 18: 'eclipse' } };
    L = switchHero(L, 0, w, emptyPlan());
    expect(L.title).toBe('slash10k'); expect(equipOf(L)).toBe('twin');
    L = switchHero(L, 18, w, emptyPlan());
    expect(L.title).toBe('awk_18'); expect(equipOf(L)).toBe('eclipse');
  });
  it('각성 = 바꾼 뒤 그 용사 저장값으로 바르게 계산', () => {
    const w = W(['hero_18', 'fx_eclipse']);
    let L = switchHero({ ...L0, titles: { 18: 'awk_18' }, socket: { 0: 'twin', 18: 'eclipse' } }, 18, w, emptyPlan());
    expect(isAwakened({ hero: L.hero, enh: L.enh, fx: equipOf(L), title: L.title })).toBe(true);
    L = switchHero(L, 0, w, emptyPlan());
    expect(isAwakened({ hero: L.hero, enh: L.enh, fx: equipOf(L), title: L.title })).toBe(true); // 로안 = 쌍월 참 · 만 번째 베기
  });
  it('저장 = 지금 용사 칭호도 titles 에 · 옛 계정(titles 없음) = 지금 용사로 옮김', () => {
    const r = save(W(), emptyPlan(), { ...L0 }, { ...L0 }, 1);
    if (typeof r === 'string') throw new Error(r);
    expect(r.look.titles).toEqual({ 0: 'slash10k' });
  });
});
