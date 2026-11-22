// ⚔ #51 기사단 토벌 주간 — 주 번호(월요일 KST) · 공적 더하기(한도 · 테스트 반) · 순위 · 마감(한 번만 · 스위치 켜짐만 선물)
import { describe, expect, it } from 'vitest';
import type { Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { addGuardMerit, addMerit, closeWeek, GUARD_KEY, daysLeft, knightOf, lastKing, MERIT_MAX, prevWeek, standings, WAR, warClasses, weekOf } from '../src/board/war';

const KST = (s: string) => Date.parse(`${s}+09:00`);
function store(t: number) { const b = memoryStore(); return { ...b, kind: 'memory', now: () => t } as Store; }

describe('🗓 주 번호', () => {
  it('월요일 0시 KST 가 경계', () => {
    expect(weekOf(KST('2026-11-23T00:00:00'))).toBe('2026-11-23'); // 월
    expect(weekOf(KST('2026-11-22T23:59:59'))).toBe('2026-11-16'); // 일 밤
    expect(weekOf(KST('2026-11-21T12:00:00'))).toBe('2026-11-16'); // 토
    expect(prevWeek('2026-11-23')).toBe('2026-11-16');
    expect(daysLeft(KST('2026-11-16T09:00:00'))).toBe(7);
    expect(daysLeft(KST('2026-11-22T09:00:00'))).toBe(1);
  });
});

describe('⚔ 공적', () => {
  it('반 합 · 내 칸 increment · 한 판 최대 200 · 테스트 반 · 0 = 안 더함', () => {
    const t = KST('2026-11-18T10:00:00'), S = store(t), w = weekOf(t);
    expect(addMerit(S, '1-3', 7, 30)).toBe(30);
    expect(addMerit(S, '1-3', 8, 999)).toBe(MERIT_MAX);
    expect(addMerit(S, '1-6', 1, 50)).toBe(0); // 🧪 테스트 반
    expect(addMerit(S, '1-2', 1, 0)).toBe(0);
    expect(S.get(`${WAR}/${w}/sum/1-3`)).toBe(230);
    expect(S.get(`${WAR}/${w}/by/1-3/7`)).toBe(30);
    expect(S.get(`${WAR}/${w}/sum/1-6`)).toBeNull();
  });
  it('순위 = 5 기사단 · 테스트 반 빠짐 · 같은 공적 = 같은 등수 · 반 이름 바꾸기', () => {
    const t = KST('2026-11-18T10:00:00'), S = store(t), w = weekOf(t);
    expect(warClasses(S)).toEqual(['1-1', '1-2', '1-3', '1-4', '1-5']);
    addMerit(S, '1-2', 1, 50); addMerit(S, '1-4', 1, 50); addMerit(S, '1-1', 1, 10);
    S.set('school/knights/1-4', { name: '은하 늑대단' });
    const st = standings(S, w);
    expect(st.map((x) => [x.cls, x.rank])).toEqual([['1-2', 1], ['1-4', 1], ['1-1', 3], ['1-3', 4], ['1-5', 4]]);
    expect(knightOf(S, '1-4')).toEqual({ name: '은하 늑대단', crest: '🐺' });
  });
});

describe('🏁 주간 마감', () => {
  const seed = (S: Store, w: string) => {
    S.set(`${WAR}/${w}/sum`, { '1-1': 40, '1-2': 90, '1-3': 60, '1-4': 0 });
    S.set('accounts/1-2', { 1: { uid: 'x' }, 2: { uid: 'y' } }); S.set('accounts/1-3', { 5: { uid: 'z' } }); S.set('accounts/1-1', { 9: { uid: 'q' } });
  };
  it('스위치 끔 = done 만 · 선물 없음 · 두 번째 기기 = 아무것도 안 함', async () => {
    const t = KST('2026-11-23T08:00:00'), S = store(t); seed(S, '2026-11-16');
    const r = await closeWeek(S);
    expect(r).toEqual({ week: '2026-11-16', rank: ['1-2', '1-3', '1-1'], paid: 0 });
    expect(S.get(`${WAR}/2026-11-16/done`)).toMatchObject({ rank: ['1-2', '1-3', '1-1'], paid: false });
    expect(S.get('gifts')).toBeNull();
    expect(await closeWeek(S)).toBeNull();
    expect(lastKing(S, t)?.cls).toBe('1-2');
  });
  it('스위치 켬 = 1 · 2 · 3위 반 학생에게 💎 300 · 150 · 100 우편 (받기 전 보관)', async () => {
    const t = KST('2026-11-23T08:00:00'), S = store(t); seed(S, '2026-11-16'); S.set('school/war', { pay: true });
    const r = await closeWeek(S);
    expect(r?.paid).toBe(4);
    expect(S.get('gifts/s1_2_1/war_2026-11-16')).toMatchObject({ g: 300, got: false, hold: true });
    expect(S.get('gifts/s1_3_5/war_2026-11-16')).toMatchObject({ g: 150 });
    expect(S.get('gifts/s1_1_9/war_2026-11-16')).toMatchObject({ g: 100 });
  });
  it('📜 #72 4위 아래 반(공적 0 포함) = 💎 없는 편지만 · 1위 편지 = 왕의 기사단 문구', async () => {
    const t = KST('2026-11-23T08:00:00'), S = store(t); seed(S, '2026-11-16'); S.set('accounts/1-4', { 3: { uid: 'w' } }); S.set('school/war', { pay: true });
    const r = await closeWeek(S);
    expect(r?.paid).toBe(4);
    const g4 = S.get<{ g: number; fun: string; hold: boolean }>('gifts/s1_4_3/war_2026-11-16')!;
    expect(g4).toMatchObject({ g: 0, hold: true }); expect(g4.fun).toMatch(/이번 주도 수고했다/);
    expect(S.get<{ fun: string }>('gifts/s1_2_1/war_2026-11-16')!.fun).toMatch(/가장 많은 균열을 닫았다/);
  });
});

describe('🛡 #105 근위대 (교사 판)', () => {
  it('공적 = 주 guard 칸 · 반 순위 · 왕의 깃발 계산에서 빠짐 · 이 기기(memory) = 안 쌓임', () => {
    const t = Date.UTC(2026, 10, 18, 3), S = { ...store(t), kind: 'server' } as Store;
    addMerit(S, '1-1', 3, 50, t); expect(addGuardMerit(S, 120, t)).toBe(120); addGuardMerit(S, 999, t);
    expect(S.get(`${WAR}/${weekOf(t)}/${GUARD_KEY}`)).toBe(120 + MERIT_MAX);
    const st = standings(S, weekOf(t));
    expect(st.find((r) => r.cls === '1-1')?.rank).toBe(1); expect(st.some((r) => String(r.cls).includes('guard'))).toBe(false);
    expect(addGuardMerit(store(t), 50, t)).toBe(0);
  });
});
