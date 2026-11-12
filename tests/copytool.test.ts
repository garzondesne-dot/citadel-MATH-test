// 🔁 #163 ② 복사 도구: 정식에는 읽기(GET)만 · 쓰는 곳이 정식이면 멈춤 · 몇 명 · 몇 건 · 옮긴 계정 = reset
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — .mjs 도구 (타입 없음)
import { countOf, prepAccounts, PATHS } from '../tools/copy-from-release/copy.mjs';

const code = readFileSync(new URL('../tools/copy-from-release/copy.mjs', import.meta.url), 'utf8');
describe('🔁 복사 도구 (#163 ②)', () => {
  it('정식 쪽 요청 = GET 하나뿐 · PUT 은 시험 서버(dst) 하나뿐', () => {
    const fetches = [...code.matchAll(/fetch\(`\$\{(SRC|DST)\}[^]*?method: '(\w+)'/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(fetches).toEqual(['SRC:GET', 'DST:PUT']);
    expect(/method: '(PATCH|POST|DELETE)'[^\n]*\$\{SRC\}/.test(code)).toBe(false);
    expect(code).toMatch(/citadel-math-default-rtdb[^\n]*정식 서버예요 — 멈춤/);
  });
  it('옮기는 칸 = V1-DESIGN 7절 · 몇 명 · 몇 건 · 계정 = reset', () => {
    expect(PATHS.slice(0, 8)).toEqual(['accounts', 'roster', 'rosterMask', 'gem', 'xp', 'cards', 'records', 'bonus']);
    expect(countOf('gem', { '1-3': { 1: { total: 5, day: {} }, 2: { total: 1 } } })).toEqual({ students: 2, items: 3 });
    expect(prepAccounts({ '1-3': { 1: { uid: 'old', hero: 3 } } })).toEqual({ '1-3': { 1: { uid: 'old', hero: 3, reset: true, from: 'release' } } });
  });
});
