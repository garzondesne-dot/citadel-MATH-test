// 🚀 출시 복사 도구: 정식에는 읽기(GET)만 · 쓰는 곳이 정식이면 멈춤 · 백업 폴더 없이는 쓰지 않음
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../tools/copy-from-release/copy.mjs', import.meta.url), 'utf8');
describe('🚀 복사 도구 (copy.mjs)', () => {
  it('정식 쪽 요청 = GET 하나뿐 · 쓰기는 시험 서버(DST) 하나뿐', () => {
    const fetches = [...code.matchAll(/fetch\(`\$\{(SRC|DST)\}[^\n]*?method(?:: '(\w+)')?/g)].map((m) => `${m[1]}:${m[2] ?? 'var'}`);
    expect(fetches).toEqual(['SRC:GET', 'DST:var']);
    expect(code.match(/\$\{SRC\}/g)!.length).toBe(1 + (code.match(/console\.log\([^\n]*\$\{SRC\}/g)?.length ?? 0));
    expect(code).toMatch(/citadel-math-default-rtdb[^\n]*정식 서버예요 — 멈춤/);
  });
  it('백업 폴더(--out) 없이는 쓰지 않음 · 백업 → 비우기 → 넣기 → 대조 순서', () => {
    expect(code).toMatch(/if \(!OUT && !DRY\) throw/);
    const i = (s: string) => code.indexOf(s);
    expect(i('beta-backup-')).toBeLessThan(i("'DELETE'"));
    expect(i("'DELETE'")).toBeLessThan(i("'PUT', val"));
    expect(i("'PUT', val")).toBeLessThan(i('compare(off, after'));
    expect(code).toMatch(/process\.exit\(3\)/);
  });
});
