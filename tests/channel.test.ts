// 🧪 출시 막는 것 9: 시험 고리(window.__이름) = 시험 주소(내 컴퓨터)에서만 · 출시 주소는 잠가서 써도 무시
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { HOOKS, lockHooks } from '../src/channel';

const files = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.(ts|svelte)$/.test(f) ? [p] : []; });
describe('🧪 시험 고리 잠금', () => {
  it('src 의 모든 window.__이름 고리가 잠금 목록(HOOKS)에 있음 (새 고리를 더하면 여기에도)', () => {
    const used = new Set<string>();
    for (const f of files('src')) { if (f.endsWith('channel.ts')) continue; const s = readFileSync(f, 'utf8'); for (const m of s.matchAll(/(?:globalThis|window)[^.;\n]{0,160}?\)?\.(__[A-Za-z_]+)/g)) used.add(m[1]!); }
    const missing = [...used].filter((k) => !(HOOKS as readonly string[]).includes(k));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(20);
  });
  it('잠그면 써도 무시 · 읽어도 없음', () => {
    const g = globalThis as Record<string, unknown>;
    expect(lockHooks(true)).toBe(HOOKS.length);
    g.__board = { solve: () => 1 }; g.__BOARD_SEC = 0.1;
    expect(g.__board).toBeUndefined(); expect(g.__BOARD_SEC).toBeUndefined();
  });
});
