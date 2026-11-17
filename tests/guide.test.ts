// 📊 길잡이 (📜 2026-11-17 #30) — ④ 이 속도면 +n분 → 🎯 맨 뒤 몬스터 복습으로 · ⑤ 형성평가 앞 약한 개념 → 📺 칸 다시
import { describe, expect, it } from 'vitest';
import type { Given, LessonPack, Question, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, openRoom, roomPath, submit } from '../src/raid/actions';
import { itemsFor } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { sendToReview } from '../src/school/sendReview';
import { endAt, guideOf, leftMin, timeGuide, weakGuide } from '../src/school/guide';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const L0 = packOf('set-06')!;
const L: LessonPack = { ...L0, boss: { ...L0.boss!, links: ['m1', 'm2', '', '', '', ''] } };
const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
const ix = (id: string) => L.steps.findIndex((s) => s.id === id);
function room(deadlineIn: number) {
  const S = mk(); openRoom(S, L, 'G1', PROFILES.test); ['a', 'b', 'c'].forEach((u, i) => heartbeat(S, 'G1', u, i + 1, u));
  const R = () => S.get<Room>(roomPath('G1'))!;
  S.set(`${roomPath('G1')}/state/deadline`, S.now() + deadlineIn * 60e3);
  const go = (id: string) => S.set(`${roomPath('G1')}/state/step`, ix(id));
  return { S, R, go };
}

describe('📊 길잡이', () => {
  it('끝 시각 = 수업 마감 · 없으면 연 뒤 50분', () => {
    const { S, R } = room(30);
    expect(Math.round((endAt(R()) - S.now()) / 60e3)).toBe(30);
  });
  it('④ 시간이 넉넉하면 안 뜸 · 5분 이상 넘으면 「이 속도면 +n분」 + 맨 뒤 몬스터 · 짝 형성평가 문항', () => {
    const { S, R, go } = room(120); go('c2');
    expect(timeGuide(L, R(), S.now())).toBeNull();
    const { S: S2, R: R2, go: go2 } = room(5); go2('c2');
    const left = leftMin(L, R2(), S2.now());
    const g = timeGuide(L, R2(), S2.now())!;
    expect(g.k).toBe('time'); expect(g.mon).toBe('m3'); // 문제 4~7 = 수업 밖(later) → 수업 안 맨 뒤 = 문제 3
    expect(g.text).toBe(`📊 이 속도면 +${Math.ceil(left - 5)}분`);
    expect(g.act).toBe('🎯 문제 3 복습으로');
    // 문제 3 을 보내면 그다음 맨 뒤 = 문제 2 · 짝 형성평가 2번
    sendToReview(S2, 'G1', ['m3']);
    const g2 = timeGuide(L, R2(), S2.now())!;
    expect(g2.mon).toBe('m2'); expect(g2.why.join(' ')).toContain('형성평가 2번');
  });
  it('④ 몬스터 푸는 중 · 형성평가 · 쉼터 = 안 뜸', () => {
    const { S, R, go } = room(1); go('m2');
    expect(timeGuide(L, R(), S.now())).toBeNull();
    go('boss'); expect(timeGuide(L, R(), S.now())).toBeNull();
  });
  it('⑤ 다음이 형성평가 · 첫 시도 50% 아래 개념(형성평가에 있음) → 📺 그 개념 칸', () => {
    const { S, R, go } = room(120);
    go('m1'); ['a', 'b', 'c'].forEach((u) => submit(S, L, 'G1', 'm1', u, wrong(itemsFor(L, R(), 'm1', u, 0))));
    go('m3'); expect(weakGuide(L, R(), ['a', 'b', 'c'], S.now())).toBeNull(); // 아직 문제 3 남음 = 형성평가 앞 아님
    sendToReview(S, 'G1', ['m3']);
    const g = weakGuide(L, R(), ['a', 'b', 'c'], S.now())!;
    expect(g.k).toBe('weak'); expect(g.concept).toBe('c1');
    expect(g.text).toBe('📊 약한 개념 = 개념 1 · 0%'); expect(g.act).toBe('📺 개념 1 칸 다시 띄우기');
    expect(g.why.join(' ')).toContain('형성평가 1번'); expect(g.why[0]).toBe('오늘 몬스터 첫 시도 0 / 12 맞힘');
    expect(guideOf(L, R(), ['a', 'b', 'c'], S.now())?.k).toBe('weak'); // 시간 넉넉 = ⑤
  });
});
