// 📦 B 지난 차시에서 넘어온 몬스터 = 다음 수업에 다시 등장 (📜 2026-11-16 · 🎯 A 의 선택 칸)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { SUBJ } from '../src/engine/subject';
import { PROFILES } from '../src/model/profiles';
import { endClass, nextStep, openRoom } from '../src/raid/actions';
import { answerOf, itemsFor } from '../src/raid/raid';
import { items } from '../src/engine/lessons';
import { carryKey, carryMin, carryOffer, carryRecords, withCarry } from '../src/school/carry';
import { carryStates, summaryOf } from '../src/school/records';
import { noteOf, OPEN } from '../src/school/dummy';
import { prepPath } from '../src/school/prep';
import { setLast } from '../src/school/school';

const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });
const PACKS = SUBJ.lessons;
const L6 = PACKS.find((l) => l.id === 'set-06')!, L8 = PACKS.find((l) => l.no === 8)!;
const P = Object.values(PROFILES)[0]!;
const mons = (L: typeof L6) => L.steps.filter((s) => s.kind === 'monster' && !s.later).map((s) => s.id);

describe('📦 B 넘어온 몬스터', () => {
  it('제안 = 그 반 지난 수업에서 보낸 몬스터(👑 빼고) · 같은 차시면 없음', () => {
    const S = store(); openRoom(S, L6, 'A1', P); S.set('rooms/A1/meta/cls', '1-3'); nextStep(S, L6, 'A1'); nextStep(S, L6, 'A1'); endClass(S, L6, 'A1');
    setLast(S, '1-3', { lesson: L6.id, no: L6.no, at: S.now(), done: false, code: 'A1' });
    const o = carryOffer(S, '1-3', L8, PACKS)!;
    expect(o.from).toBe('set-06'); expect(o.ids).toEqual(mons(L6)); expect(o.ids).not.toContain('boss');
    expect(carryOffer(S, '1-3', L6, PACKS)).toBeNull();
    expect(carryOffer(S, '1-4', L8, PACKS)).toBeNull();
    expect(carryMin(L6, ['m1'])).toBeGreaterThan(5);
  });
  it('끼우기 = 도입 뒤 먼저 / 쉼터 뒤(몬스터 절반 뒤) · 같은 문제 · 그림은 원래 차시', () => {
    const a = withCarry(L8, { from: 'set-06', ids: ['m2', 'm3'], at: 'intro' }, PACKS), k2 = carryKey('set-06', 'm2');
    const nIntro = L8.steps.findIndex((s) => s.kind !== 'intro');
    expect(a.steps.slice(nIntro, nIntro + 2).map((s) => s.id)).toEqual([k2, carryKey('set-06', 'm3')]);
    expect(a.steps[nIntro]!.title).toMatch(/^⏪ 문제 \d · 6차시/);
    expect(a.monsters[k2]).toBe(L6.monsters.m2); expect(a.carryOf?.[k2]).toEqual({ from: 'set-06', mid: 'm2' });
    expect(items(a, k2, 's', 0)).toEqual(items(L6, 'm2', 's', 0)); // 첫 판 = 학습지 문제 그대로
    expect(prepPath(a, k2)).toBe('prep/set-06/img/m2');
    const b = withCarry(L8, { from: 'set-06', ids: ['m2'], at: 'mid' }, PACKS), mi = mons(L8), half = mi[Math.ceil(mi.length / 2) - 1]!;
    expect(b.steps[b.steps.findIndex((s) => s.id === half) + 1]!.id).toBe(k2);
    expect(withCarry(L8, null, PACKS)).toBe(L8);
    expect(withCarry(L8, { from: 'set-06', ids: ['m2'], at: 'mid' }, PACKS)).toBe(b); // 같은 입력 = 같은 객체
  });
  it('기록 = 원래 차시 · 풀면 허수아비에서 빠짐 · 못 풀면 그대로', () => {
    const LB = withCarry(L8, { from: 'set-06', ids: ['m2', 'm3'], at: 'intro' }, PACKS), k2 = carryKey('set-06', 'm2');
    const S = store(); openRoom(S, LB, 'B1', P);
    S.set('rooms/B1/players/u1', { name: 'x', at: S.now() });
    const R = () => S.get<Room>('rooms/B1')!;
    S.set(`rooms/B1/subs/${k2}/u1/0`, itemsFor(LB, R(), k2, 'u1', 0).map(answerOf));
    const rec = summaryOf(LB, R(), 'u1', 'B1', S.now());
    expect(Object.keys(rec.mons).some((k) => k.startsWith('cv_'))).toBe(false); // 이 차시 기록엔 안 들어감
    const cs = carryStates(LB, R(), 'u1', S.now());
    expect(cs[k2]).toBe('o');
    const D = store(); D.set('records/1-3/2/set-06', { mons: { m1: 'o', m2: 's', m3: 's' } });
    carryRecords(LB, cs, 'records/1-3/2', (p) => D.get(p), (p, v) => D.set(p, v));
    const r6 = D.get<{ mons: Record<string, string> }>('records/1-3/2/set-06')!;
    expect(r6.mons.m2).toBe('o'); expect(r6.mons.m3).toBe('s');
    const x = noteOf(L6, r6 as never, {}); expect(OPEN.has(x.mons[x.ids.indexOf('m2')]!)).toBe(false); expect(OPEN.has(x.mons[x.ids.indexOf('m3')]!)).toBe(true);
  });
});
