// 🐞 11/23 학교판 명단 (친구 학교 「1-6 은 테스트 반 · 1-7 에 가짜 명단」) — 테스트 반 기본 1-6 = 우리 학교만 · 명단 없는 반 = 학교판 서버에선 빈 반 · 붙여넣기 = 가짜 이름 위에 합치지 않음
import { afterAll, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../src/store/device';

describe('명단 · 테스트 반', () => {
  afterAll(() => { vi.doUnmock('../src/channel'); vi.resetModules(); });
  it('우리 학교 = 1-6 테스트 반 그대로 · 붙여넣기 = 빈 명단에서 시작 · 바꾸기 = 기존 지움', async () => {
    vi.resetModules();
    const sc = await import('../src/school/school');
    const S = memoryStore();
    expect(sc.isBeta(S, '1-6')).toBe(true); expect(sc.isBeta(S, '1-7')).toBe(false);
    expect(sc.pasteRoster(S, '1-7', '1 가나다\n2 라마바')).toBe(2);
    expect(Object.keys(S.get<Record<string, string>>('roster/1-7')!)).toEqual(['1', '2']); // 예전 = 가짜 15명 + 2
    sc.pasteRoster(S, '1-7', '3 사아자');
    expect(Object.keys(S.get<Record<string, string>>('roster/1-7')!)).toEqual(['1', '2', '3']);
    sc.pasteRoster(S, '1-7', '1 차카타', true);
    expect(S.get('roster/1-7')).toEqual({ 1: '차카타' }); expect(S.get('rosterMask/1-7')).toEqual({ 1: '차*타' });
  });
  it('학교판 = 1-6 도 보통 반 · 명단 없는 반 = 빈 반(서버)', async () => {
    vi.resetModules(); vi.doMock('../src/channel', async (orig) => ({ ...(await orig<typeof import('../src/channel')>()), SCHOOL_BUILD: true }));
    const sc = await import('../src/school/school');
    const S = memoryStore();
    expect(sc.isBeta(S, '1-6')).toBe(false);
    S.set('school/cls/1-6/beta', true); expect(sc.isBeta(S, '1-6')).toBe(true); // 반 설정으로 켠 것은 그대로
    const srv = Object.assign(memoryStore(), { kind: 'server' as const });
    expect(sc.roster('1-7', srv as never)).toEqual([]);
  });
});
