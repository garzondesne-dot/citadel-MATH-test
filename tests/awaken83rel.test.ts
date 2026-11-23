// 🚦 #83 정식 판 깃발 — 11/20 정식 = 로안만 → 11/21 결정 · 11/23 켬: 정식(release) 도 31명 (b236 처럼 다시 로안만이 되면 이 시험이 깨짐)
import { afterAll, describe, expect, it, vi } from 'vitest';

describe('정식 판 깃발', () => {
  afterAll(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it('release: 31명 각성 · 전용 칭호 30 · 그림 있는 용사 = 각성 그림', async () => {
    vi.stubEnv('VITE_CHANNEL', 'release'); vi.resetModules();
    const H = await import('../src/model/hero');
    const T = await import('../src/model/titles');
    expect(H.AWK_ALL).toBe(true);
    expect(H.TITLES.filter((t) => t.id.startsWith('awk_')).length).toBe(Object.keys(H.AWAKEN_T).length);
    for (const h of Object.keys(H.AWAKEN_T).map(Number)) { expect(H.awkTitle(h)).toBe(`awk_${h}`); expect(H.isAwkId(100 + h)).toBe(true); } // 용사 바꾸기 각성 조건 줄 = awkTitle 이 있는 용사 모두
    expect(H.awkTitle(0)).toBe('slash10k');
    expect(H.lookId({ hero: 18, enh: 10, fx: 'eclipse', title: 'awk_18' })).toBe(118);
    expect(Object.keys(H.AWK_ART).length).toBeGreaterThan(1);
    const d = { records: { a: { perfects: 99, won: true } } };
    expect(Array.isArray(T.earnedFrom(d))).toBe(true);
  });
  it('베타: 31명', async () => {
    vi.unstubAllEnvs(); vi.resetModules();
    const H = await import('../src/model/hero');
    expect(H.AWK_ALL).toBe(true); expect(H.lookId({ hero: 18, enh: 10, fx: 'eclipse', title: 'awk_18' })).toBe(118);
  });
});

describe('용사 바꾸기 각성 조건 줄 (🐞 11/23 회귀 막기)', () => {
  it('캠프 용사 탭 = awkTitle 있는 용사 모두 · 게시판 용사 확인 시트 = 각성 조건 줄', async () => {
    const fs = await import('node:fs');
    expect(fs.readFileSync('src/ui/camp/MyHero.svelte', 'utf8')).toMatch(/\{#if awkTitle\(pickH\)\}<AwakenBox/);
    const sh = fs.readFileSync('src/ui/board/atb/HeroSheet.svelte', 'utf8');
    expect(sh).toContain('data-k="hero-sheet-awk"'); expect(sh).toMatch(/awkTitle\(sel\)/);
  });
});
