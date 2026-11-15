// 📖 기호 톡 누른 횟수 = 정식 symtalk.js 그대로 (📜 2026-11-15 머리 🔨): 로그인한 그 학생만 · 차시 칸 · 모아서 한 번에 · 대시보드 = 많이 누른 순 · 차시 거르기
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../src/store/device';
import { bindMe, unbindMe } from '../src/store/meSync';
import { flushSym, rank, setSymLesson, tapSym } from '../src/school/symtap';
import { view } from '../src/school/views';
import { SUBJ } from '../src/engine/subject';

describe('📖 기호 톡 기록', () => {
  it('로그인한 학생 = xp/반/번호/st/차시/기호 +n · 안 묶인 폰 = 안 셈', () => {
    vi.useFakeTimers();
    const S = { ...memoryStore(), kind: 'server' as const, auth: { currentUser: { uid: 'u5' } } };
    S.set('accounts/1-3/5', { uid: 'u5' });
    setSymLesson('set-06'); tapSym('in'); // 아직 안 묶임
    vi.advanceTimersByTime(2000); expect(S.get('xp/1-3/5/st')).toBeNull();
    expect(bindMe(S, '1-3', 5)).toBe(true);
    tapSym('in'); tapSym('in'); tapSym('notin'); vi.advanceTimersByTime(1600);
    expect(S.get('xp/1-3/5/st/set-06')).toEqual({ in: 2, notin: 1 });
    tapSym('in'); flushSym(); expect(S.get('xp/1-3/5/st/set-06/in')).toBe(3);
    unbindMe(); vi.useRealTimers();
  });
  it('rank = 많이 누른 순 · 누른 학생 수 · 차시 거르기 · 사전에 없는 기호 뺌', () => {
    const st = [{ 'set-06': { in: 3, zz: 9 }, 'set-07': { notin: 1 } }, { 'set-06': { in: 1, notin: 2 } }, null];
    expect(rank(st, (k) => k !== 'zz')).toEqual([{ id: 'in', n: 4, who: 2 }, { id: 'notin', n: 3, who: 2 }]);
    expect(rank(st, (k) => k !== 'zz', 'set-07')).toEqual([{ id: 'notin', n: 1, who: 1 }]);
  });
  it('대시보드(서버) = 진짜 기록 · 차시 거르기 · 없으면 「아직 누른 기록이 없어요」', () => {
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 5: '가', 6: '나' });
    expect(view(S, '1-3', 'sym').note).toBe('아직 누른 기록이 없어요.');
    S.set('xp/1-3', { 5: { total: 1, st: { 'set-06': { in: 3 } } }, 6: { total: 1, st: { 'set-07': { in: 1, notin: 2 } } } });
    const v = view(S, '1-3', 'sym'), BY = SUBJ.symtalk!.BY;
    expect(v.list!.map((x) => [x.nm, x.pc])).toEqual([[BY.in!.sym, '4번 · 2명'], [BY.notin!.sym, '2번 · 1명']]);
    expect(v.pick!.opts.map((o) => o[0])).toEqual(['', 'set-06', 'set-07']);
    expect(view(S, '1-3', 'sym', false, 'set-07').list!.map((x) => x.pc)).toEqual(['2번 · 1명', '1번 · 1명']);
  });
});
