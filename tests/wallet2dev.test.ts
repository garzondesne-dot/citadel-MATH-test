// 🐞 11/20 ② 통째로 덮어쓰기: 두 기기 · 늦게 온 거울 · 수업 보상과 캠프 저장이 서로 지우지 않음 (store/me.svelte.ts · store/atomic.ts)
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';

/** 한 서버(memory)를 두 기기가 나눠 씀 · 기기마다 「받음」 표시 따로 */
function device(shared: Store, uid: string, loaded: () => boolean): Store {
  return { ...shared, kind: 'server', loaded: () => loaded(), auth: { currentUser: { uid } } } as unknown as Store;
}
async function fresh() { vi.resetModules(); return { sync: await import('../src/store/meSync'), me: await import('../src/store/me.svelte') }; }

describe('🐞 ② 지갑 = 늘어난 만큼만', () => {
  let S: Store;
  beforeEach(() => {
    S = memoryStore();
    S.set('accounts/1-2/7', { uid: 'U7', hero: 3, title: 'none' });
    S.set('gem/1-2/7', { total: 100, scroll: 2, enh: 1, ver: 1, buy: [{ id: 'hero_3', ver: 1, at: 1 }], log: { raid_A: { g: 10 } } });
    S.set('xp/1-2/7', { total: 300 });
  });
  it('두 기기: A 가 💎 +20 · B 가 💎 −30(구매) = 90 (예전 = 나중 기기 값으로 덮어씀)', async () => {
    const A = await fresh(); A.sync.bindMe(device(S, 'U7', () => true), '1-2', 7); const MA = A.me.useMe(0, 0);
    const B = await fresh(); B.sync.bindMe(device(S, 'U7', () => true), '1-2', 7); const MB = B.me.useMe(0, 0);
    MA.me.wallet.gem += 20; MA.save();
    MB.me.wallet.gem -= 30; MB.me.wallet.buys = [...MB.me.wallet.buys, { id: 'hero_9', ver: 1, at: 2 }]; MB.save();
    await Promise.resolve();
    expect(S.get('gem/1-2/7/total')).toBe(90);
    expect((S.get<{ id: string }[]>('gem/1-2/7/buy') || []).map((b) => b.id).sort()).toEqual(['hero_3', 'hero_9']);
    expect(MA.me.wallet.gem).toBe(90); // 다른 기기 몫도 이 폰에 옮겨짐
    expect(S.get('gem/1-2/7/log/raid_A')).toEqual({ g: 10 }); // 정식 log 는 그대로
  });
  it('수업 보상(서버에서 더함) 뒤 캠프가 옛 값으로 저장해도 보상이 남음', async () => {
    const A = await fresh(); A.sync.bindMe(device(S, 'U7', () => true), '1-2', 7); const M = A.me.useMe(0, 0);
    S.set('gem/1-2/7/total', 116); S.set('xp/1-2/7/total', 340); // 다른 화면이 보상 줌
    M.me.wallet.scroll += 1; M.save();
    expect(S.get('gem/1-2/7/total')).toBe(116); expect(S.get('xp/1-2/7/total')).toBe(340); expect(S.get('gem/1-2/7/scroll')).toBe(3);
  });
  it('받기 전에 받은 선물(+5) = 받은 뒤 서버 값에 더해짐 (예전 = 받으면 선물 몫이 사라짐)', async () => {
    vi.useFakeTimers();
    let ok = false;
    const A = await fresh(); const D = device(S, 'U7', () => ok);
    expect(A.sync.bindMe({ ...D, loaded: (p: string) => ok || p.startsWith('accounts') } as Store, '1-2', 7)).toBe(true);
    const M = A.me.useMe(0, 0);
    M.me.wallet.gem += 5; M.save(); // 받기 전 = 쓰지 않음
    expect(S.get('gem/1-2/7/total')).toBe(100);
    ok = true; vi.advanceTimersByTime(400);
    expect(M.me.wallet.gem).toBe(105); expect(S.get('gem/1-2/7/total')).toBe(105); expect(M.me.hero).toBe(3);
    vi.useRealTimers();
  });
  it('처음 온 학생(받은 뒤 정말 빈 칸) = 계정 · 판 칸을 만듦 · 💎 0', async () => {
    S.set('gem/1-2/7', null); S.set('xp/1-2/7', null); S.set('accounts/1-2/7', { uid: 'U7' });
    const A = await fresh(); A.sync.bindMe(device(S, 'U7', () => true), '1-2', 7); A.me.useMe(0, 0);
    expect(S.get('accounts/1-2/7/hero')).toBe(0); expect(S.get('gem/1-2/7/ver')).toBe(1); expect(S.get('gem/1-2/7/total') ?? 0).toBe(0);
  });
});

describe('🐞 ② 선물 받기 = 한 번만', () => {
  it('claimOnce: 처음 = 받음 · 두 번째(다른 폰 · 다시 누름) = null', async () => {
    const S = memoryStore(); S.set('gifts/s1_2_7/g1', { g: 30, at: 1, got: false, hold: true });
    const { claimOnce } = await import('../src/school/mailbox');
    const [a, b] = await Promise.all([claimOnce(S, 's1_2_7', 'g1'), claimOnce(S, 's1_2_7', 'g1')]);
    expect([a, b].filter(Boolean)).toHaveLength(1); expect((a || b)!.g).toBe(30);
    expect(S.get('gifts/s1_2_7/g1/got')).toBe(true);
    expect(await claimOnce(S, 's1_2_7', 'g1')).toBeNull();
  });
});
