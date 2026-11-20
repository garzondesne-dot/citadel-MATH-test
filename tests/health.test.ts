// 🩺 운영 데이터 건강 검진 (tools/ops/health.mjs · 읽기만) — 11/20 초기화 꼴 · 반쪽 노드 · 음수 · 이상값을 찾음
import { describe, expect, it } from 'vitest';
// @ts-expect-error mjs 도구
import { check, report } from '../tools/ops/health.mjs';

const T = {
  accounts: { '1-1': { 14: { uid: 'u14', hero: 0, title: 'none' }, 2: { uid: 'u2', hero: 3 }, 5: { at: 1 } } },
  gem: { '1-1': { 14: { total: 0, day: { '2026-11-19': 40 }, log: { raid_A: { g: 16 }, perfect_A: { g: 6 }, buy_hero_8: { g: -60 }, lv5: { g: 6 } } }, 2: { total: 120, scroll: -1, enh: 12, buy: [{ id: 'hero_3', ver: 1 }, { id: 'hero_3', ver: 1 }], log: { x: { g: 99999 } } }, 9: { scroll: 3 } } },
  xp: { '1-1': { 14: { total: 0, log: { raid_A: { xp: 120 } } }, 2: { total: 'abc' } } },
  records: { '1-1': { 14: { 'set-02': { boss: 3, at: 1 } }, 2: { 'set-03': { code: 'X' } } } },
  rooms: { A1: { state: { step: 0 }, meta: { lesson: 'x' }, players: { a: { nick: 'n', num: 1 }, g: { seen: 1 } } }, B2: { players: { z: { seen: 3 } } } },
  school: { live: { code: 'ZZ', cls: '1-1' } },
  gifts: { s1_1_2: { a: { g: -5 }, b: 7 } },
};
describe('🩺 건강 검진', () => {
  const R = check(T);
  it('① 초기화 꼴 = 1-1-14 (💎 · EXP · 용사 함께 0 · 기록은 있음) · 멀쩡한 학생은 안 잡음', () => {
    expect(R.zero.map((x: { who: string }) => x.who)).toEqual(['1-1-14']);
    expect(R.zero[0].what).toMatch(/초기화 꼴/);
  });
  it('② 반쪽: state 없는 방 · 사람 줄 · 없는 열린 수업 · uid 없는 계정 · total 없는 지갑 · 계정 없는 기록 · 반쪽 수업 기록', () => {
    const w = R.half.map((x: { who: string; what: string }) => `${x.who}:${x.what}`).join('\n');
    for (const s of ['방 B2:반쪽 방', '방 A1:이름 · 번호 없는', 'school/live:열린 수업 방이 없음', '1-1-5:계정 칸에 uid 없음', '1-1-9:지갑에 total 없음', '1-1-9:기록은 있는데 계정 칸 없음', '1-1-2:수업 기록 줄이 반쪽', '선물 1-1-2:선물 줄이 객체 아님']) expect(w).toContain(s);
  });
  it('③ 이상값: 음수 📜 · 강화 12 · 산 것 겹침 · 💎 기록 99999 · EXP 글자 · 선물 −5', () => {
    const w = R.odd.map((x: { who: string; what: string }) => `${x.who}:${x.what}`).join('\n');
    for (const s of ['1-1-2:gem.scroll 음수', '1-1-2:강화 범위 밖', '1-1-2:산 것 겹침', '1-1-2:💎 기록 한 줄 이상값', '1-1-2:xp.total 숫자 아님', '선물 1-1-2:선물 💎 이상값']) expect(w).toContain(s);
  });
  it('보고 = 반-번호만 (uid · 이름 없음)', () => { const t = report(R); expect(t).not.toMatch(/u14|u2\b/); expect(t).toContain('1-1-14'); });
  it('빈 트리 = 문제 없음', () => { const E = check({}); expect(E.zero.length + E.half.length + E.odd.length).toBe(0); });
});
