// 🎖 「버그 사냥꾼」 (📜 11/24 선생님 「버그사냥꾼 칭호 만들어.」): 선생님이 주기만 · 회수 = 가장 늦은 줄 · 호칭만
import { describe, expect, it } from 'vitest';
import { bughHeld, bughLog, giveBugHunter, BUGH_TEXT } from '../src/school/bughunt';
import { earnedFrom } from '../src/model/titles';
import { titleOf } from '../src/model/hero';
describe('🎖 버그 사냥꾼', () => {
  it('주기 = 우편 + 💎 0 선물 · 알림 문구', () => {
    const w: Record<string, unknown> = {}; let t = 1_800_000_000_000;
    const S = { now: () => t, set: (p: string, v: unknown) => { w[p] = v; } } as never;
    const k = giveBugHunter(S, 'u1', true);
    expect((w[`gifts/u1/${k}m`] as { g: number }).g).toBe(0); expect((w[`mail/u1/${k}`] as { text: string }).text).toBe(BUGH_TEXT.on);
    t += 1000; const k2 = giveBugHunter(S, 'u1', false);
    expect(bughHeld([k])).toBe(true); expect(bughHeld([k, k2])).toBe(false); expect(bughHeld([k2, k])).toBe(false);
  });
  it('받은 줄 → 호칭 · 회수 뒤엔 없음 · 자동 지급 없음', () => {
    const on = bughLog(`bughOn_${(1000).toString(36)}m`, 0)!, off = bughLog(`bughOff_${(2000).toString(36)}m`, 0)!;
    expect(earnedFrom({ gem: { log: { [on.key]: on.row } } })).toContain('bughunter');
    expect(earnedFrom({ gem: { log: { [on.key]: on.row, [off.key]: off.row } } })).not.toContain('bughunter');
    expect(earnedFrom({})).not.toContain('bughunter');
    expect(titleOf('bughunter')?.name).toBe('버그 사냥꾼');
    expect(bughLog('fbk_x1m', 0)).toBeNull();
  });
});
