// 🌙 쌍월 v3 (다시 만듦 · 📜 2026-11-14 이펙트 평가) = 기본 · 폰 띠 · TV 값 (A 방향 + B 교차 · 더 큼)
import { describe, expect, it } from 'vitest';
import { twinOf } from '../src/ui/fx/twin';
import NEW from '../src/ui/fx/fx-new.json';
import fs from 'node:fs';

describe('🌙 쌍월 v3', () => {
  it('기본 = d', () => expect(twinOf()).toBe('d'));
  it('폰 띠 twin-d 있음 · 파일 있음', () => {
    const s = (NEW as { fx: Record<string, { src: string; n: number }> }).fx['twin-d']!;
    expect(s.src).toBe('pfx2/twin-d-v1.webp'); expect(s.n).toBeGreaterThan(20);
    expect(fs.existsSync(`public/art/${s.src}`)).toBe(true);
  });
  it('TV 값 = B 보다 크고 X 교차 · 큰 번쩍 · 파편', () => {
    const src = fs.readFileSync('src/ui/tv/arena/slash.ts', 'utf8'), m = /\n {2}d: \{([^}]*)\}/.exec(src)![1]!, b = /\n {2}b: \{([^}]*)\}/.exec(src)![1]!;
    const num = (s: string, k: string) => Number(new RegExp(`\\b${k}: ([\\d.]+)`).exec(s)![1]);
    expect(num(m, 'rad') * num(m, 'len')).toBeGreaterThan(num(b, 'rad') * num(b, 'len') * 1.3);
    expect(m).toMatch(/stagger/); expect(m).toMatch(/bigFlash: 1/); expect(m).toMatch(/shards: true/);
  });
});
