// ⏰ 오늘 시간표 · 자동 열기 · 수업 열기 한 입구 · 수업 길이 (📜 2026-11-17 #21 D · E)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { PACKS } from '../src/engine/packs';
import { BELLS, lessonLen, setBell, setLessonLen } from '../src/school/bells';
import { dueSlot, markOpened, nextAuto, setAuto, skipToday, soonSlot, starPack, todaySlots, dayOff, dayKey, pickToday } from '../src/school/autoOpen';
import { fixedKey, keyModeOf, KEYMODE, openLesson } from '../src/school/openLesson';
import { HALLKEY } from '../src/school/school';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
// 2026-11-16 월 · 한국 시각 = UTC + 9
const kst = (h: number, m: number) => Date.UTC(2026, 10, 16, h - 9, m);
const B0 = structuredClone(BELLS);

describe('⏰ 오늘 시간표', () => {
  it('오늘 칸만 · 끝난 교시 · 바로 다음 수업 · 테스트 반 빠짐 · ⭐ 다음 차시', () => {
    const S = mk(); S.set('school/sched', { 1: { 1: '1-3', 2: '1-6', 3: '1-4' }, 2: { 1: '1-5' } }); S.set('school/prog/1-4', 6);
    const r = todaySlots(S, kst(10, 30), PACKS);
    expect(r.map((x) => x.cls)).toEqual(['1-3', '1-4']); // 1-6 = 테스트 반
    expect(r[0]!.done).toBe(true); expect(r[1]!.next).toBe(true);
    expect(r[1]!.L?.no).toBe(6); expect(starPack(S, '1-3', PACKS)?.no).toBe(PACKS.filter((p) => p.no > 0).map((p) => p.no).sort((a, b) => a - b)[0]); // 🌀 차원문 차시(no 0) = ⭐ 아님
  });
  it('자동 열기: 기본 끔 · 켜면 1분 전 알림 · 시작종 ~ 5분 열 칸 · 건너뛰기 · 이날은 끔 · 연 칸은 다시 안 엶', () => {
    const S = mk(); S.set('school/sched', { 1: { 3: '1-4' } });
    const t0 = kst(11, 0);
    expect(dueSlot(S, t0, PACKS)).toBeNull();
    setAuto(S, true);
    expect(soonSlot(S, t0 - 30e3, PACKS)?.p).toBe(3);
    expect(dueSlot(S, t0 + 60e3, PACKS)?.cls).toBe('1-4');
    expect(dueSlot(S, t0 + 6 * 60e3, PACKS)).toBeNull();
    expect(nextAuto(S, t0 - 3600e3, PACKS)?.hm).toBe(BELLS[3]![0]);
    skipToday(S, t0, 3, true); expect(dueSlot(S, t0 + 1000, PACKS)).toBeNull();
    skipToday(S, t0, 3, false); expect(dueSlot(S, t0 + 1000, PACKS)).not.toBeNull();
    dayOff(S, dayKey(t0), true); expect(dueSlot(S, t0 + 1000, PACKS)).toBeNull(); dayOff(S, dayKey(t0), false);
    pickToday(S, t0, 3, PACKS[0]!.id); expect(dueSlot(S, t0 + 1000, PACKS)?.L?.id).toBe(PACKS[0]!.id);
    markOpened(S, t0, 3, 'X'); expect(dueSlot(S, t0 + 1000, PACKS)).toBeNull();
  });
});

describe('🔑 수업 열기 한 입구 · 종합실 키 방식', () => {
  it('🎲 수업마다 새로 · 📌 고정 · 옛 판(고정 번호만 있음) = 고정', () => {
    const S = mk(), L = PACKS[0]!;
    expect(keyModeOf(S)).toBe('new');
    S.set(HALLKEY, '4826'); expect(keyModeOf(S)).toBe('fixed'); expect(fixedKey(S)).toBe('4826');
    const c1 = openLesson(S, '1-3', L); expect(S.get(`secrets/${c1}/hallKey`)).toBe('4826');
    S.set(KEYMODE, 'new'); const c2 = openLesson(S, '1-3', L); expect(S.get(`secrets/${c2}/hallKey`)).toMatch(/^\d{4}$/);
    expect(S.get<{ code: string }>('school/live')?.code).toBe(c2);
    const c3 = openLesson(S, '1-6', L, { test: true }); expect(S.get<{ test?: boolean }>('school/live')?.test).toBe(true); expect(S.get(`rooms/${c3}/meta/limit`)).toBeFalsy();
  });
});

describe('📅 수업 길이 · 교시 시종', () => {
  it('기본 50분 · 끝 = 시작 + 길이 · 월~금 7교시', () => {
    const S = mk();
    expect(lessonLen(S)).toBe(50);
    setLessonLen(S, 45); expect(lessonLen(S)).toBe(45);
    const bl = S.get<Record<number, [string, string]>>('school/info/bells')!;
    expect(bl[1]).toEqual([B0[1]![0], '09:45']);
    setBell(S, 2, '10:05'); expect(S.get<Record<number, [string, string]>>('school/info/bells')![2]).toEqual(['10:05', '10:50']);
    expect(S.get<Record<number, number[]>>('school/info/periods')![5]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
