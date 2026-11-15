// 📮 학생 우편함 (정식 mail.js 옮김 · 📜 2026-11-15 「우편 기능 활성화」)
import { describe, expect, it } from 'vitest';
import type { Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { claim, giftName, inbox, unreadOf } from '../src/school/mailbox';

const mem = (): Store => ({ ...memoryStore(), kind: 'memory', now: () => 5000 });
describe('📮 우편함', () => {
  it('받은 소식 = 선물 · 메시지 · 답장 · 공지 (최근 순 · 메시지에 붙은 💎 선물 줄은 안 겹침)', () => {
    const S = mem();
    S.set('gifts/p1', { a: { g: 5, at: 100, got: true }, fg_x: { g: 3, at: 300, fun: '🎁 1번 선물', from: 'release' }, m1m: { g: 10, at: 400, mail: true }, petri_1: { g: 2, at: 50 } });
    S.set('mail/p1', { m1: { text: '잘했어', g: 10, at: 400, kind: 'msg' }, fbr_1: { text: '고마워', g: 0, at: 200, kind: 'reply', q: '버그', got: true } });
    S.set('school/notice/1-3', { 500: { text: '내일 형성평가', at: 500 } });
    const L = inbox(S, 'p1', '1-3');
    expect(L.map((x) => `${x.k}:${x.id}`)).toEqual(['notice:500', 'msg:m1', 'gift:fg_x', 'reply:fbr_1', 'gift:a', 'gift:petri_1']);
    expect(L.find((x) => x.id === 'fg_x')!.sub).toContain('정식에서 옮김');
    expect(unreadOf(L, 0)).toBe(6); expect(unreadOf(L, 450)).toBe(3); // 공지 1 + 안 받은 선물 2 (fg_x · petri_1)
  });
  it('받기 = 안 받은 것만 한 번 (두 번째 = null) · 이미 받은 것 = null', () => {
    const S = mem(); S.set('gifts/p1', { fg_x: { g: 3, at: 1 }, a: { g: 5, got: true }, petri_9: { g: 2 }, 'ult_set-06_u4': { g: 0, s: 1 } });
    expect(claim(S, 'p1', 'fg_x')).toEqual({ g: 3, s: 0, x: 0, petri: false }); expect(claim(S, 'p1', 'fg_x')).toBeNull();
    expect(claim(S, 'p1', 'a')).toBeNull(); expect(claim(S, 'p1', 'petri_9')!.petri).toBe(true);
    expect(claim(S, 'p1', 'ult_set-06_u4')!.s).toBe(1);
  });
  it('선물 이름', () => { expect(giftName('petri_1', {})).toContain('석화'); expect(giftName('x', { fun: '🏰 디펜스' })).toBe('🏰 디펜스'); expect(giftName('x', {})).toContain('선생님'); });
});
