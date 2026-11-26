// 📜 11/26 선생님 「한 번 각성하면 유지」(B · 개선단 「칭호 바꾸면 각성이 풀려요」): 첫 각성 = 4칸 그대로 · 그 뒤(각성 기록 had) = 호칭 · 스킬을 바꿔도 각성 모습
import { describe, expect, it } from 'vitest';
import { AWAKEN_T, awakenChecks, awkId, awkTitle, isAwakened, lookId } from '../src/model/hero';
import { famOfHero } from '../src/model/hero';

const h = Number(Object.keys(AWAKEN_T).find((k) => Number(k) > 0 && AWAKEN_T[Number(k)]?.[1] !== 'craft'));
const full = () => ({ hero: h, enh: 10, fx: famOfHero(h).ids[3] as string, title: awkTitle(h) as string });
describe('⚡ 각성 유지', () => {
  it('처음 = 4칸 모두 있어야 각성 · 호칭을 바꾸면 풀림(기록 없을 때)', () => {
    expect(awakenChecks(full()).every((c) => c.ok)).toBe(true);
    expect(isAwakened(full())).toBe(true);
    expect(isAwakened({ ...full(), title: 'other' })).toBe(false);
  });
  it('한 번 각성한 기록(had) = 호칭 · 스킬을 바꿔도 각성 모습 · 다른 용사는 그대로', () => {
    expect(isAwakened({ ...full(), title: 'other', had: true })).toBe(true);
    expect(lookId({ hero: h, enh: 0, fx: 'cut', title: null, had: true })).toBe(awkId(h));
    expect(lookId({ hero: h, enh: 10, fx: 'cut', title: null, had: false })).toBe(h);
  });
});
