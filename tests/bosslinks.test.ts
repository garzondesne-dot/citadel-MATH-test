// 👑 형성평가 짝 (📜 2026-11-17 #27): boss.links × 🎯 복습으로 보낸 몬스터 → 그 반 수업 형성평가에서 빠지는 문항
import { describe, expect, it } from 'vitest';
import type { LessonPack, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { bossSubmit, heartbeat, openRoom, roomPath } from '../src/raid/actions';
import { answerOf, bossDrop, bossHp, bossItem, bossLive, bossRecord, bossState } from '../src/raid/raid';
import { PACKS } from '../src/engine/packs';
import { sendToReview } from '../src/school/sendReview';
import { summaryOf } from '../src/school/records';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const base = PACKS.find((L) => L.boss && (L.boss.items || 0) >= 4 && L.steps.filter((s) => s.kind === 'monster').length >= 2)!;
const mons = base.steps.filter((s) => s.kind === 'monster' && base.monsters[s.id]).map((s) => s.id);
const n = base.boss!.items;
const links = Array.from({ length: n }, (_, i) => (i === 0 ? '' : i === 1 ? mons[0]! : i === 2 ? mons[1]! : ''));
const L: LessonPack = { ...base, boss: { ...base.boss!, links } };
function room() { const S = mk(); openRoom(S, L, 'BL', PROFILES.test); heartbeat(S, 'BL', 'a', 1, '가'); return { S, R: () => S.get<Room>(roomPath('BL'))! }; }

describe('👑 형성평가 짝 (boss.links)', () => {
  it('보낸 몬스터 없음 = 빠지는 문항 없음 · links 없는 팩도 그대로', () => {
    const { R } = room();
    expect(bossDrop(L, R())).toEqual([]); expect(bossDrop(base, R())).toEqual([]);
    expect(bossLive(L, R()).items).toBe(n);
  });
  it('몬스터 하나 보냄 → 짝 문항 빠짐 · 체력 · 할 문항 · 기록 = 남은 문항', () => {
    const { S, R } = room();
    const hp0 = bossHp(L, R(), S.now()).max;
    sendToReview(S, 'BL', [mons[0]!]);
    expect(bossDrop(L, R())).toEqual([1]);
    const lv = bossLive(L, R()); expect(lv.items).toBe(n - 1);
    expect(bossHp(L, R(), S.now()).max).toBeLessThan(hp0);
    const rec = bossRecord(L, R(), 'a'); expect(rec.todo.includes(1)).toBe(false); expect(rec.need.includes(1)).toBe(false);
    expect(bossState(L, R(), 'a')[1]!.drop).toBe(true);
    // 남은 문항을 모두 맞히면 끝 (빠진 문항 없이)
    rec.todo.forEach((i) => bossSubmit(S, L, 'BL', 'a', i, answerOf(bossItem(L, R(), 'a', i, 0)!)));
    const sm = summaryOf(L, R(), 'a', 'BL', S.now()) as { bossN?: number; bossM?: string; bossDrop?: number[] };
    expect(sm.bossN).toBe(lv.hp); expect(sm.bossM?.[1]).toBe('k'); expect(sm.bossDrop).toEqual([1]);
  });
  it('두 몬스터 보냄 → 둘 다 빠짐 · 개념만 문항("")은 늘 남음', () => {
    const { S, R } = room();
    sendToReview(S, 'BL', [mons[0]!, mons[1]!]);
    expect(bossDrop(L, R())).toEqual([1, 2]);
    expect(bossDrop(L, R()).includes(0)).toBe(false);
  });
});

describe('🎯 허수아비 = 빠진 형성평가 문항만 (원래 번호 · 판 그대로)', () => {
  it('pickBoss · droppedFor', async () => {
    const { pickBoss, droppedFor } = await import('../src/raid/raid');
    const { bossItem: packBossItem } = await import('../src/engine/lessons');
    expect(droppedFor(L, { bossDrop: [1, 2] }, mons[0]!)).toEqual([1]);
    expect(droppedFor(L, undefined, mons[0]!)).toEqual([]);
    const P: LessonPack = { ...L, boss: pickBoss(L.boss!, [2]) };
    expect(P.boss!.items).toBe(1);
    expect(JSON.stringify(packBossItem(P, 's', 0, 0))).toBe(JSON.stringify(packBossItem(L, 's', 2, 0)));
    expect(JSON.stringify(packBossItem(P, 's', 0, 2))).toBe(JSON.stringify(packBossItem(L, 's', 2, 2)));
  });
});

describe('👑 쉬는 문항 글 (📜 11/23 「🎯 허수아비로」 → 같은 글 세 곳)', () => {
  it('BOSS_DROP_TEXT · bossNote', async () => {
    const { BOSS_DROP_TEXT } = await import('../src/raid/raid');
    expect(BOSS_DROP_TEXT).toBe('오늘은 쉬어요 · 🎯 복습 허수아비에서 풀어요');
    const src = (await import('node:fs')).readFileSync('src/ui/q/BossForm.svelte', 'utf8');
    expect(src).toContain('text: BOSS_DROP_TEXT'); expect(src).not.toContain("'🎯 허수아비로'");
  });
});
