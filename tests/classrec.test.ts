// 📜 #39 수업 닫을 때 교사 폰이 반 전체 수업 기록 (형성평가에서 바로 닫아도 · 학생 폰 없이)
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { packOf } from '../src/engine/packs';
import { bossSubmitAll, endClass, openRoom, roomPath } from '../src/raid/actions';
import { answerOf, bossItem, bossRecord } from '../src/raid/raid';
import { bossIdx } from '../src/school/formative';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const L = packOf('set-09')!;
describe('📜 #39 반 전체 수업 기록', () => {
  it('형성평가 화면에서 바로 닫음 → 낸 학생 모두 기록 · 정답 수대로 bossM · 봇 · 다른 반 · 교사 빼고 · 학생 폰 기록과 합침', async () => {
    const S = mk(); openRoom(S, L, 'C1', PROFILES.class); const P = roomPath('C1');
    S.set(`${P}/meta/cls`, '1-3'); S.set(`${P}/state/step`, bossIdx(L));
    const sub = (u: string, right: boolean) => { const R = S.get<Room>(P)!, r = bossRecord(L, R, u); bossSubmitAll(S, L, 'C1', u, Object.fromEntries(r.todo.map((i) => [i, answerOf(bossItem(L, R, u, i, right ? r.next(i) : r.next(i) + 1)!)]))); };
    expect(Object.keys(S.get<Room>(P)!.bossSub || {})).toEqual([]);
    sub('s1_3_1', true); sub('s1_3_2', false); sub('s1_4_9', true);
    expect(Object.keys(S.get<Room>(P)!.bossSub || {}).sort()).toEqual(['s1_3_1', 's1_3_2', 's1_4_9']);
    S.set(`${P}/players/s1_3_5`, { num: 5, cls: '1-3' }); // 들어왔지만 안 냄
    S.set(`${P}/players/b1`, { bot: true });
    S.set('records/1-3/2/set-09', { at: 1, code: 'C1', no: 9, mons: { m1: 'o' }, loot: { gem: 3 } }); // 학생 폰이 먼저 쓴 기록
    endClass(S, L, 'C1'); await new Promise((r) => setTimeout(r, 20));
    const r1 = S.get<{ bossM: string; boss: number }>('records/1-3/1/set-09')!, r2 = S.get<{ bossM: string; mons: Record<string, string>; loot?: unknown }>('records/1-3/2/set-09')!;
    expect(r1.bossM).toBe('oooo'); expect(r1.boss).toBe(4);
    expect(r2.bossM).toMatch(/x/); expect(r2.mons.m1).toBe('o'); expect(r2.loot).toEqual({ gem: 3 });
    expect(S.get('records/1-3/5/set-09')).toBeTruthy();
    expect(S.get('records/1-4/9/set-09')).toBeNull();
  });
});
