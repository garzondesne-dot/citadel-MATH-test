// 💡 친구에게 힌트 주기 (📜 2026-11-17 #23 · 옛 정식 #26 · #52 ②)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { PACKS } from '../src/engine/packs';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, openRoom, roomPath } from '../src/raid/actions';
import { isChain, whyStages } from '../src/raid/raid';
import { giveHint, hgOf, hintKeyOf, hintLines, hintState, tvHint, whyItems } from '../src/school/hintGive';
import { summaryOf } from '../src/school/records';
import { partsOf, xpOf } from '../src/school/reward';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
// 근거 줄(why)이 있는 소레이드가 든 첫 차시
const pick = () => { for (const L of PACKS) for (const s of L.steps) { if (s.kind !== 'monster' || !L.monsters[s.id]) continue; const S = mk(); openRoom(S, L, 'H0', PROFILES.test); const R = S.get<Room>(roomPath('H0'))!; if (isChain(L, R, s.id) && whyStages(whyItems(L, R, s.id)).length) return { L, mid: s.id }; } return null; };
const P = pick();
describe('💡 힌트 주기', () => {
  it('근거 줄이 있는 소레이드가 있음', () => { expect(P).toBeTruthy(); });
  it('근거 줄을 안 맞히면 못 줌 · 단추 없음', () => {
    const { L, mid } = P!, S = mk(); openRoom(S, L, 'H1', PROFILES.test); heartbeat(S, 'H1', 'a', 1, '가');
    const R = S.get<Room>(roomPath('H1'))!;
    expect(hintState(L, R, mid, 'a').next).toBeNull();
    expect(giveHint(S, L, R, 'H1', mid, 'a').ok).toBe(false);
  });
  it('준 힌트 = 줄마다 처음 준 1명 말풍선 · 👍 나머지 · 나는 「친구 힌트」에서 빠짐 · 기록 hg · EXP +1', () => {
    const { L, mid } = P!, S = mk(); openRoom(S, L, 'H2', PROFILES.test);
    for (const [u, n, nm] of [['a', 1, '가'], ['b', 2, '나'], ['c', 3, '다']] as const) heartbeat(S, 'H2', u, n, nm);
    const R0 = S.get<Room>(roomPath('H2'))!, its = whyItems(L, R0, mid), s0 = whyStages(its)[0]!, key = hintKeyOf(its, mid, s0);
    expect(key).toBe(mid);
    S.set(`${roomPath('H2')}/players/b/hint/${key}`, 100); S.set(`${roomPath('H2')}/players/a/hint/${key}`, 200);
    const R = S.get<Room>(roomPath('H2'))!;
    const t = tvHint(L, R, mid)!; expect(t.uid).toBe('b'); expect(t.nick).toBe('나'); expect(t.more).toBe(1); expect(t.text).toBe(its[s0]!.why!.text);
    expect(hintLines(L, R, mid, 'c')[0]!.by).toEqual(['b', 'a']); expect(hintLines(L, R, mid, 'a')[0]!.by).toEqual(['b']);
    expect(hgOf(R, 'a')).toBe(1); expect(hgOf(R, 'c')).toBe(0);
    expect((summaryOf(L, R, 'a', 'H2', S.now()) as { hg?: number }).hg).toBe(1);
    expect((summaryOf(L, R, 'c', 'H2', S.now()) as { hg?: number }).hg).toBeUndefined();
    const pa = partsOf(L, R, 'a', S.now()).parts, pc = partsOf(L, R, 'c', S.now()).parts;
    expect(pa.hintGive).toBe(1); expect(xpOf(pa) - xpOf(pc)).toBe(1);
  });
});
