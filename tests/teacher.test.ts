// 📱 b8 교사 쪽 엔진 동작 (#119): 정찰 ±30초 · 체력 ±5% · 집중 + 쉼터 겹침 · +5분 한 번 · ◀ 앞 단계 · 결석 · 선물 · 수업 시작 마감
import { describe, expect, it } from 'vitest';
import type { LessonPack, Room, Store } from '../src/model/types';
import pack from '../src/packs/set-06.json';
import { PROFILES } from '../src/model/profiles';
import { memoryStore } from '../src/store/device';
import { appearNow, doorStart, endClass, extendTime, giveGift, heartbeat, nextStep, openRoom, prevStep, roomPath, scoutAdd, setAbsent, setFocus, setPct, setRest, submit } from '../src/raid/actions';
import { items } from '../src/engine/lessons';
import { activeIds, atkClock, seedOf, gameNow, isChain, itemsFor, monsterHp, solveLock, stepIdx, stepOf, timeLeft } from '../src/raid/raid';

const L = pack as LessonPack;
function setup() {
  const base = memoryStore();
  let t = Date.UTC(2026, 10, 12, 2, 5); // 11:05 KST (3교시)
  const S: Store & { tick: (ms: number) => void } = { ...base, kind: 'memory', get: base.get, set: base.set, watch: base.watch, now: () => t, tick: (ms) => { t += ms; } };
  openRoom(S, L, 'T', PROFILES.class);
  S.set(`${roomPath('T')}/meta/limit`, true);
  const beat = () => ['u1', 'u2', 'u3'].forEach((u, k) => heartbeat(S, 'T', u, k + 1, `학생 ${k + 1}`));
  beat();
  return { S, R: () => S.get<Room>(roomPath('T')) as Room, beat };
}
const toPlain = (S: Store, R: () => Room) => { for (let g = 0; g < 20; g++) { nextStep(S, L, 'T'); const st = stepOf(L, R()); if (st?.kind === 'monster' && !isChain(L, R(), st.id)) return; } };

describe('교사 쪽 엔진 (#119)', () => {
  it('수업 시작 = 그 교시 끝까지 마감 · 집중에도 남은 시간 흐름 · +5분 한 번', () => {
    const { S, R } = setup();
    nextStep(S, L, 'T');
    expect(R().state.deadline).toBe(Date.UTC(2026, 10, 12, 2, 50)); // 11:50 KST
    expect(timeLeft(R(), S.now())).toBe(45 * 60e3);
    expect(extendTime(S, 'T')).toBeNull();
    expect(timeLeft(R(), S.now())).toBe(50 * 60e3);
    expect(extendTime(S, 'T')).toMatch(/한 번/);
  });
  it('문 닫기: +5분을 안 썼으면 묻기 · 누르면 「문을 밀어 열었다」 · 수업 끝 = 닫힘', () => {
    const { S, R } = setup();
    nextStep(S, L, 'T'); S.tick(45 * 60e3);
    doorStart(S, 'T'); expect(R().state.door?.ask).toBe(true);
    extendTime(S, 'T'); expect(R().state.door).toBeNull(); expect(R().state.doorExt).toBe(S.now());
    endClass(S, L, 'T'); expect(R().state.closed).toBe(true);
  });
  it('정찰 +30 · −30 (남은 것보다 많이 줄이면 바로 등장)', () => {
    const { S, R } = setup();
    toPlain(S, R); S.tick(20_000);
    expect(solveLock(L, R(), S.now())!.left).toBe(40_000);
    scoutAdd(S, L, 'T', 30); expect(solveLock(L, R(), S.now())!.left).toBe(70_000);
    scoutAdd(S, L, 'T', -30); expect(solveLock(L, R(), S.now())!.left).toBe(40_000);
    S.tick(15_000); scoutAdd(S, L, 'T', -30); expect(solveLock(L, R(), S.now())!.on).toBe(false);
  });
  it('체력 기준 ±5% → 공동 체력이 바로 바뀜', () => {
    const { S, R } = setup();
    toPlain(S, R); appearNow(S, L, 'T');
    const id = stepOf(L, R())!.id, h0 = monsterHp(L, R(), id, S.now());
    setPct(S, 'T', h0.pct - 5);
    expect(monsterHp(L, R(), id, S.now()).pct).toBe(h0.pct - 5);
    expect(monsterHp(L, R(), id, S.now()).max).toBe(Math.floor((3 * h0.items * (h0.pct - 5)) / 100));
  });
  it('집중 + 쉼터가 겹쳐도 멈춘 시간은 한 번 · 둘 다 꺼야 이어감', () => {
    const { S, R } = setup();
    toPlain(S, R); appearNow(S, L, 'T'); S.tick(5_000);
    const g0 = gameNow(R(), S.now());
    setFocus(S, 'T', true); S.tick(10_000); setRest(S, 'T', true); S.tick(10_000); setFocus(S, 'T', false); S.tick(10_000);
    expect(gameNow(R(), S.now())).toBe(g0);
    expect(atkClock(L, R(), S.now())!.paused).toBe(true);
    setRest(S, 'T', false); S.tick(2_000);
    expect(gameNow(R(), S.now())).toBe(g0 + 2_000);
    expect(R().state.pauseMs).toBe(30_000);
  });
  it('◀ 앞 단계 · 입장 화면까지는 안 감', () => {
    const { S, R } = setup();
    nextStep(S, L, 'T'); nextStep(S, L, 'T'); expect(stepIdx(R())).toBe(1);
    prevStep(S, L, 'T'); expect(stepIdx(R())).toBe(0);
    prevStep(S, L, 'T'); expect(stepIdx(R())).toBe(0);
  });
  it('결석 = 인원에서 빠짐 · 선물 = 학생마다 gifts 한 줄 · TV 는 반 전체일 때만', () => {
    const { S, R } = setup();
    setAbsent(S, 'T', 'u3', true); expect(activeIds(R(), S.now())).toEqual(['u1', 'u2']);
    expect(giveGift(S, 'T', ['u1'], 5)).toBe(1);
    expect(R().state.gift ?? null).toBeNull(); // 몇 명만 = TV 없음
    expect(giveGift(S, 'T', ['u1', 'u2'], 10, true)).toBe(2);
    expect(Object.values(S.get<Record<string, { g: number }>>('gifts/u1') || {}).map((x) => x.g).sort()).toEqual([10, 5]);
    expect(R().state.gift).toMatchObject({ n: 2, g: 10 });
  });
});

// ⏯ 수업 닫기 = 이어서 자리 저절로 기억 (#119 덧붙임 2): 처치 · 미처치 · 개념 · 마무리 네 경우 → 다음 수업 시작 단계
describe('이어서 자리 (#119 덧붙임 2)', () => {
  const play = (S: Store, R: () => Room, beat: () => void, id: string) => { // 접속한 셋이 그 몬스터를 모두 맞힘
    for (const u of ['u1', 'u2', 'u3']) { const qs = itemsFor(L, R(), id, u, 0); submit(S, L, 'T', id, u, qs.map((q) => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.type === 'number' ? q.answer : null)) as never); }
    beat();
  };
  const reopen = (S: Store, R: () => Room) => { // 새 방 = 저장된 자리부터
    const st = R().state.stop!;
    openRoom(S, L, 'N', PROFILES.class);
    S.set(`${roomPath('N')}/meta/resumeFrom`, st.step);
    if (st.fresh) S.set(`${roomPath('N')}/meta/fresh/${st.fresh}`, true);
    nextStep(S, L, 'N');
    return S.get<Room>(roomPath('N')) as Room;
  };
  it('처치됨 → 다음 단계부터', () => {
    const { S, R, beat } = setup();
    toPlain(S, R); appearNow(S, L, 'T');
    const id = stepOf(L, R())!.id; play(S, R, beat, id);
    expect(monsterHp(L, R(), id, S.now()).left).toBe(0);
    const i = stepIdx(R()); endClass(S, L, 'T');
    expect(R().state.stop).toEqual({ step: i + 1, fresh: null, done: false });
    expect(stepIdx(reopen(S, R))).toBe(i + 1);
  });
  it('처치 안 됨 → 그 몬스터부터 · 숫자 바꾼 판 (첫 시도가 학습지 원문이 아님)', () => {
    const { S, R } = setup();
    toPlain(S, R);
    const id = stepOf(L, R())!.id, i = stepIdx(R());
    endClass(S, L, 'T');
    expect(R().state.stop).toEqual({ step: i, fresh: id, done: false });
    const N = reopen(S, R);
    expect(stepIdx(N)).toBe(i);
    const orig = itemsFor(L, R(), id, 'u1', 0).map((q) => q.question).join('|'); // 지난 방 첫 시도(원문)
    expect(itemsFor(L, N, id, 'u1', 0).map((q) => q.question).join('|')).not.toBe(orig);
    expect(itemsFor(L, N, id, 'u1', 0)).toEqual(items(L, id, seedOf(N, 'u1'), 1)); // = 판 1 (숫자 바꾼 판)
  });
  it('개념 단계 → 그 단계부터', () => {
    const { S, R } = setup();
    nextStep(S, L, 'T'); expect(stepOf(L, R())!.kind).toBe('concept');
    endClass(S, L, 'T');
    expect(R().state.stop).toEqual({ step: 0, fresh: null, done: false });
  });
  it('마무리까지 감 → 다 끝남 (이어서 없음)', () => {
    const { S, R } = setup();
    for (let k = 0; k < 30; k++) nextStep(S, L, 'T');
    endClass(S, L, 'T');
    expect(R().state.stop?.done).toBe(true);
  });
});
