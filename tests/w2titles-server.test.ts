// 🏅 W2 용사마다 칭호 = accounts/{반}/{번호}/titles 에 저장 · 다시 열면 받아 옴 · 옛 계정(titles 없음)은 그대로 열림
import { describe, expect, it, vi } from 'vitest';
import type { Store } from '../src/model/types';

describe('W2 서버 저장', () => {
  it('titles 가 바뀌면 그 칸만 씀 · 서버 값을 받아 옴', async () => {
    vi.useFakeTimers();
    const data: Record<string, unknown> = { 'accounts/1-2/3': { uid: 'U3', hero: 0, title: 'slash10k' }, 'gem/1-2/3': { total: 10 }, 'xp/1-2/3': { total: 5 }, 'cards/1-2/3': {} };
    const writes: [string, unknown][] = [];
    const S = { kind: 'server', auth: { currentUser: { uid: 'U3' } }, loaded: () => true, get: (p: string) => { if (data[p] !== undefined) return data[p]; const [r, c, n, k] = p.split('/'); const o = data[`${r}/${c}/${n}`] as Record<string, unknown> | undefined; return k && o ? o[k] ?? null : null; }, set: (p: string, v: unknown) => { writes.push([p, v]); }, watch: () => () => {}, add: () => {}, tx: async () => {} } as unknown as Store;
    const { bindMe } = await import('../src/store/meSync');
    expect(bindMe(S, '1-2', 3)).toBe(true);
    const { useMe } = await import('../src/store/me.svelte');
    const M = useMe(0, 0, false, false);
    expect(M.me.title).toBe('slash10k'); expect(M.me.titles).toBeUndefined(); // 옛 계정 = 그대로
    writes.length = 0;
    M.me.titles = { 0: 'slash10k', 18: 'awk_18' }; M.save();
    expect(writes.filter(([p]) => p.endsWith('/titles'))).toEqual([['accounts/1-2/3/titles', { 0: 'slash10k', 18: 'awk_18' }]]);
    expect(writes.some(([p]) => p.endsWith('/total'))).toBe(false);
    vi.useRealTimers();
  });
});
