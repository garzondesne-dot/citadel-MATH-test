// 🎯 진도를 다 못 나간 문제 = A 복습으로 보내기 (📜 2026-11-16 · DECISIONS 「🎯 진도를 다 못 나간 문제」)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { SUBJ } from '../src/engine/subject';
import { PROFILES } from '../src/model/profiles';
import { endClass, nextStep, openRoom } from '../src/raid/actions';
import { stepIdx } from '../src/raid/raid';
import { isSent, leftSteps, sendToReview, sentKey, sentOf } from '../src/school/sendReview';
import { summaryOf } from '../src/school/records';
import { noteOf, OPEN } from '../src/school/dummy';

const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });
const L = SUBJ.lessons.find((l) => l.id === 'set-06')!;
const P = Object.values(PROFILES)[0]!;
describe('🎯 A 복습으로 보내기', () => {
  it('남은 몬스터 · 형성평가 목록 → 보내면 수업에서 건너뜀 · 닫으면 남은 것 저절로', () => {
    const S = store(); openRoom(S, L, 'K1', P); S.set('rooms/K1/meta/cls', '1-3');
    nextStep(S, L, 'K1'); // 첫 단계
    const R0 = () => S.get<Room>('rooms/K1')!;
    const ids0 = leftSteps(L, R0(), S.now()).map(sentKey);
    expect(ids0).toEqual([...L.steps.filter((s) => s.kind === 'monster').map((s) => s.id), 'boss']);
    sendToReview(S, 'K1', ['m2']);
    expect(isSent(R0(), L.steps.find((s) => s.id === 'm2'))).toBe(true);
    for (let k = 0; k < 6; k++) nextStep(S, L, 'K1');
    const seen = new Set<string>(); for (let k = 0; k < L.steps.length; k++) { const R = R0(); seen.add(L.steps[stepIdx(R)]?.id ?? 'end'); nextStep(S, L, 'K1'); }
    expect(seen.has('m2')).toBe(false); // 보낸 몬스터 = 건너뜀
    // 새 방 · 중간에 닫기 = 남은 것 저절로
    const S2 = store(); openRoom(S2, L, 'K2', P); S2.set('rooms/K2/meta/cls', '1-3'); nextStep(S2, L, 'K2'); nextStep(S2, L, 'K2');
    endClass(S2, L, 'K2');
    const sent = sentOf(S2.get<Room>('rooms/K2'));
    expect(Object.keys(sent).sort()).toEqual([...L.steps.filter((s) => s.kind === 'monster').map((s) => s.id), 'boss'].sort());
  });
  it('기록 = 안 푼 채 보낸 몬스터는 s · 👑 보냄 = bossSent · 허수아비에서 아직 안 풂(OPEN)', () => {
    const S = store(); openRoom(S, L, 'K3', P); nextStep(S, L, 'K3'); sendToReview(S, 'K3', ['m3', 'boss']);
    const rec = summaryOf(L, S.get<Room>('rooms/K3')!, 'u1', 'K3', S.now());
    expect(rec.mons.m3).toBe('s'); expect(rec.mons.m1).toBe('n'); expect((rec as { bossSent?: boolean }).bossSent).toBe(true);
    expect(rec.bossM).toMatch(/^s+$/);
    const x = noteOf(L, rec as never, {}); expect(OPEN.has(x.mons[x.ids.indexOf('m3')]!)).toBe(true); expect(x.boss.every((b) => !b || OPEN.has(b))).toBe(true);
  });
});
