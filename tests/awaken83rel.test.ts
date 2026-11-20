// 🚦 #83 정식(release) 판 = 로안만 각성 (📜 11/20 「GPT 30명 뒤 정식」) · 베타 = 31명
import { afterAll, describe, expect, it, vi } from 'vitest';

describe('정식 판 깃발', () => {
  afterAll(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it('release: 로안만 · 전용 칭호 30 숨김 · 각성 그림 로안만', async () => {
    vi.stubEnv('VITE_CHANNEL', 'release'); vi.resetModules();
    const H = await import('../src/model/hero');
    const T = await import('../src/model/titles');
    expect(H.AWK_ALL).toBe(false);
    expect(H.TITLES.some((t) => t.id.startsWith('awk_'))).toBe(false);
    expect(H.awkTitle(18)).toBeNull(); expect(H.awkTitle(0)).toBe('slash10k');
    expect(H.lookId({ hero: 18, enh: 10, fx: 'eclipse', title: 'awk_18' })).toBe(18);
    expect(H.lookId({ hero: 0, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(16);
    expect(H.isAwkId(118)).toBe(false); expect(H.heroOf(118).id).not.toBe(118);
    expect(Object.keys(H.AWK_ART)).toEqual(['0']);
    const d = { records: { a: { perfects: 99, won: true } } };
    expect(T.earnedFrom(d).some((x) => x.startsWith('awk_'))).toBe(false);
    expect(H.awkFx(16)).toBe(H.ROAN_NEW);
  });
  it('베타: 31명', async () => {
    vi.unstubAllEnvs(); vi.resetModules();
    const H = await import('../src/model/hero');
    expect(H.AWK_ALL).toBe(true); expect(H.lookId({ hero: 18, enh: 10, fx: 'eclipse', title: 'awk_18' })).toBe(118);
  });
});
