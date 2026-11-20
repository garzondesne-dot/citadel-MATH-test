// 🚨 11/20 학생 기록 「초기화」: 서버 거울이 지갑 칸을 아직 안 받았을 때 시작 값으로 덮어쓰지 않음 · 받은 뒤 서버 값을 씀
import { describe, expect, it, vi } from 'vitest';
import type { Store } from '../src/model/types';

describe('🚨 지갑 받기 전 덮어쓰기 막기', () => {
  it('받기 전 = 서버에 아무것도 안 씀 · 받은 뒤 = 서버 값(💎 187 · EXP 475 · 용사 6)', async () => {
    vi.useFakeTimers();
    const data: Record<string, unknown> = {}, writes: string[] = [], subs: Record<string, ((v: unknown) => void)[]> = {};
    let ok = false;
    data['accounts/1-1/14'] = { uid: 'U14', hero: 6, title: 'none' }; // 계정 칸 = 로그인 때 이미 받음(묶기 조건) · 지갑 · EXP · 카드만 아직
    const mine = (p: string) => p.startsWith('accounts');
    const S = { kind: 'server', auth: { currentUser: { uid: 'U14' } }, loaded: (p: string) => ok || mine(p), get: (p: string) => (ok || mine(p) ? data[p] ?? null : null), set: (p: string, v: unknown) => { writes.push(p); data[p] = v; }, watch: (p: string, f: (v: unknown) => void) => { (subs[p] ??= []).push(f); return () => {}; }, now: () => 0 } as unknown as Store;
    const { bindMe } = await import('../src/store/meSync');
    expect(bindMe(S, '1-1', 14)).toBe(true); writes.length = 0;
    const { useMe } = await import('../src/store/me.svelte');
    const M = useMe(0, 0, false, false);
    M.save();
    expect(writes).toEqual([]); // 받기 전 = 쓰기 없음 (예전 = total 0 · xp 0 · hero 0 덮어씀)
    data['gem/1-1/14'] = { total: 187, scroll: 2 }; data['xp/1-1/14'] = { total: 475 }; data['cards/1-1/14'] = { inter: true }; ok = true;
    vi.advanceTimersByTime(400);
    expect(M.me.wallet.gem).toBe(187); expect(M.me.xp).toBe(475); expect(M.me.hero).toBe(6);
    writes.length = 0; M.save(); expect(writes.filter((w) => w.endsWith('/total'))).toEqual([]); // 🐞 ② 안 바뀐 칸은 다시 쓰지 않음 (예전 = total 187 통째로)
    vi.useRealTimers();
  });
});
