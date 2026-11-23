// 🐞 11/23 사진 채점 중계소: 숫자 바꾼 판은 [문제] = 학생 화면 문제 글 (기준표 ask = 학습지 숫자는 판 0 에만)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const src = readFileSync(new URL('../tools/apps-script/photo-grade.gs', import.meta.url), 'utf8');
const ctx: Record<string, unknown> = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const askOf = ctx.askOf_ as (q: Record<string, unknown>, rub: Record<string, unknown>) => string;

describe('중계소 [문제] 글', () => {
  const rub = { ask: '문제 4) (a + 2/b)(b + 8/a) 의 최솟값' };
  it('판 0 = 기준표 ask', () => { expect(askOf({ ask: '문제 4) …' }, rub)).toBe(rub.ask); });
  it('새 앱 again = 학생 문제 글', () => { expect(askOf({ ask: '문제 4) (a + 3/b)(b + 12/a)', again: true }, rub)).toBe('문제 4) (a + 3/b)(b + 12/a)'); });
  it('지금 앱(b236) ✍ 실력 쓰기 표시 = 학생 문제 글', () => { const a = '(a + 3/b)(b + 12/a) (숫자 바꾼 판 · 기준표 단계는 같고 숫자만 이 문제 숫자)'; expect(askOf({ ask: a }, rub)).toBe(a); });
  it('{k} 자리 = 숫자 채움 · 기준표 ask 없으면 학생 글', () => { expect(askOf({ params: { k: 7 } }, { ask: 'x + {k}' })).toBe('x + 7'); expect(askOf({ ask: 'q' }, {})).toBe('q'); });
});
