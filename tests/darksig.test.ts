// 🌗 폰 다크 모드 · 삼성 인터넷 웹 페이지 다크 모드 무시 (📜 2026-11-14 · 🐞 11/17 「흰 색 · 보석 깨짐」): 미디어 조건은 dark (only 붙으면 잘못된 CSS = 신호 사라짐)
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
describe('🌗 다크 신호', () => {
  const css = fs.readFileSync('src/theme/tokens.css', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
  it('prefers-color-scheme: dark 묶음 있음 · only 붙은 잘못된 조건 없음', () => {
    for (const t of [css, html]) { expect(t).toMatch(/@media \(prefers-color-scheme: dark\)/); expect(t).not.toMatch(/prefers-color-scheme:\s*only/); }
  });
  it('color-scheme 은 only dark (메타 + :root)', () => { expect(html).toMatch(/name="color-scheme" content="only dark"/); expect(css).toMatch(/:root \{ color-scheme: only dark; \}/); });
});
