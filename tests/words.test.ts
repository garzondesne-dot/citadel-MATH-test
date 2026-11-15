// 💬 마지막 한마디 (정식 actions.js say 그대로 · 📜 2026-11-15 「A 되살림」): 20자 · 처음 + 고치기 1번 · 욕설 = ＊ + bad · 빈 글 막음
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { hideWords, roomPath, sayWords } from '../src/raid/actions';

describe('💬 마지막 한마디', () => {
  it('처음 · 고치기 1번 · 세 번째 막힘 · 20자 · 빈 글 · 거르개 · 숨김', () => {
    const S = memoryStore(), p = `${roomPath('W1')}/words/u1`;
    expect(sayWords(S, 'W1', 'u1', '   ')).toBe('한마디를 써 주세요.');
    expect(sayWords(S, 'W1', 'u1', '오늘 수업 정말 재밌었어요 다음에도 또 하고 싶어요')).toBe('');
    expect(S.get<{ t: string; n: number }>(p)!.t.length).toBeLessThanOrEqual(20); expect(S.get<{ n: number }>(p)!.n).toBe(1);
    expect(sayWords(S, 'W1', 'u1', '시 발 어렵다')).toBe('');
    expect(S.get<{ t: string; bad: boolean; n: number }>(p)).toMatchObject({ bad: true, n: 2 }); expect(S.get<{ t: string }>(p)!.t).toContain('＊');
    expect(sayWords(S, 'W1', 'u1', '또 고치기')).toMatch(/이미 고쳤어요/);
    hideWords(S, 'W1', 'u1', true); expect(S.get(`${roomPath('W1')}/wordHide/u1`)).toBe(true);
  });
});
