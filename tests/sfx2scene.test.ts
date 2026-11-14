import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SFX } from '../src/ui/manifest';
// 🔊 효과음 2차 → 장면 연결 (머리 🔨 2026-11-14 · 18종): 소리마다 src 어딘가에서 sfx('<id>' 로 부름 · ⭕ ❌ 는 교실 TV 에서 안 냄
const WIRED = ['energy-card', 'retry-start', 'lock', 'star-bonus', 'game-ok', 'game-no', 'enh-ok', 'enh-great', 'skill-unlock', 'hero-pick', 'combo', 'countdown', 'dummy-hit', 'castle-open', 'mail', 'board'];
// 베타에 장면이 아직 없음 = 연결 안 함 (장면이 생기면 WIRED 로 옮김)
const PENDING: Record<string, string> = {
  'enh-fail': '베타 강화 = 실패 없음 (정식도 실패 없음)',
  scroll: '베타 ✍ 서술형 📸 사진 채점이 아직 없음 (📜 조각 주는 길 없음)',
};
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(ts|svelte)$/.test(d.name) ? [path.join(dir, d.name)] : []));
}
const files = walk('src').map((f) => ({ f: f.split(path.sep).join('/'), s: fs.readFileSync(f, 'utf8') }));
const calls = (id: string) => files.filter((x) => x.s.includes(`sfx('${id}'`)).map((x) => x.f);

describe('🔊 효과음 2차 → 장면 (18종)', () => {
  it('18종 = 연결 16 + 장면 없음 2 · 모두 manifest 에 있음', () => {
    expect(WIRED.length + Object.keys(PENDING).length).toBe(18);
    for (const k of [...WIRED, ...Object.keys(PENDING)]) expect(SFX[k], k).toBe(`sfx/r2/${k}-v1.mp3`);
  });
  it.each(WIRED)('%s = src 에서 sfx() 로 부름', (id) => { expect(calls(id).length, id).toBeGreaterThan(0); });
  it('⭕ · ❌ 쉼터 결과 소리 = 학생 폰만 (src/ui/tv/** 에서 안 냄)', () => {
    for (const id of ['game-ok', 'game-no']) { const c = calls(id); expect(c.length).toBeGreaterThan(0); expect(c.filter((f) => f.startsWith('src/ui/tv/')), id).toEqual([]); }
  });
  it('겹침: 강화가 있으면 🔓 해금 소리는 안 냄 (else if)', () => {
    const s = files.find((x) => x.f.endsWith('src/ui/camp/MyHero.svelte'))!.s;
    expect(s).toMatch(/if \(P\.enh\) \{ if \(r\.great\) sfx\('enh-great', 0\.85\); else sfx\('enh-ok', 0\.85\); \} else if \(P\.sk\.length\) sfx\('skill-unlock'/);
  });
});
