// ⚔ 게시판 던전 ATB 전투 엔진 (📜 docs/board-atb/design/정리.md 3절)
import { describe, expect, it } from 'vitest';
import { SUBJ } from '../src/engine/subject';
import { HEROES } from '../src/model/hero';
import { attack, breakShield, canBreak, earn, holdOf, newBattle, revive, roleAct, skill, tick, timingOf, zapPower, type State } from '../src/board/atb/engine';
import { newBot, simulate } from '../src/board/atb/bots';
import { statsOf } from '../src/board/atb/heroes';
import { BOSSES, T } from '../src/board/atb/tune';

const L2 = SUBJ.lessons.find((p) => p.no === 2)!;
const id = (n: string) => HEROES.find((h) => h.name === n)!.id;
const party = (names: string[], enh = 1) => names.map((n) => statsOf({ hero: id(n), lv: 1, enh, tier: 1 }));
const fresh = (names = ['로안', '발도르', '루멘', '누아'], seed = 1) => newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(names), seed });
const full = (S: State, who: number) => { S.heroes[who]!.atb = 1; };
const right = { zap: 1, gold: false, done: false, perfect: false, right: true };

describe('ATB 엔진', () => {
  it('출발: 보스 HP = 인원별 일반 값 · 팀 부활 3', () => {
    expect([fresh().bossMax, fresh(['로안', '누아']).bossMax, fresh(['로안']).bossMax, fresh().revives]).toEqual([1510, 420, 200, 3]);
  });
  it('ATB = 역할 속도로 참 · 가득 차야 행동', () => {
    const S = fresh(); S.heroes[0]!.atb = 0;
    expect(attack(S, 0, 'ok')).toBe(false); tick(S, 8); expect(S.heroes[0]!.atb).toBeCloseTo(1); expect(attack(S, 0, 'ok')).toBe(true);
  });
  it('일반 공격: 실패 0 · 성공 12 · 치명 ×1.5 + 다음 ATB 20%', () => {
    const S = fresh(); full(S, 0); attack(S, 0, 'miss'); expect(S.bossHp).toBe(1510);
    full(S, 0); attack(S, 0, 'ok'); const a = 1510 - S.bossHp; expect(a).toBe(Math.round(12 * S.heroes[0]!.s.atkMul));
    full(S, 0); attack(S, 0, 'crit'); expect(S.heroes[0]!.atb).toBeCloseTo(0.2);
  });
  it('⚡ 배율 1 · 2.1 · 3.3 · 4.6 · 6.0 · 금색 = 1.5배 값 · 스킬은 가진 ⚡ 다 씀', () => {
    expect([1, 2, 3, 4, 5].map((n) => zapPower(Array(n).fill('n')))).toEqual([1, 2.1, 3.3, 4.6, 6]);
    expect(zapPower(['g', 'g'])).toBeCloseTo(3.15);
    const S = fresh(); for (let i = 0; i < 3; i++) earn(S, 0, right); full(S, 0); skill(S, 0, 'ok');
    expect(S.heroes[0]!.zaps.length).toBe(0); expect(1510 - S.bossHp).toBe(Math.round(55 * S.heroes[0]!.s.skillMul * 3.3 * 1.25));
  });
  it('실드: HP 70% 에서 각자 1칸(계열) · 실드 중 피해 ×0.3 · HP 1 에서 멈춤 · 완주 표로만 깸 · 약점 계열 = 친구 칸도', () => {
    const S = fresh(); S.bossHp = Math.round(S.bossMax * 0.7) + 5; full(S, 0); attack(S, 0, 'ok');
    expect(S.shieldUp).toBe(true); expect(S.cells.map((c) => c.fam)).toEqual(['arms', 'mystic', 'mystic', 'wisdom']);
    const hp = S.bossHp; full(S, 0); attack(S, 0, 'ok'); expect(hp - S.bossHp).toBe(Math.round(12 * S.heroes[0]!.s.atkMul * 0.3));
    S.bossHp = 5; for (let i = 0; i < 9; i++) { full(S, 1); attack(S, 1, 'crit'); } expect(S.bossHp).toBe(1);
    expect(canBreak(S, 0)).toBe(null); earn(S, 0, { ...right, done: true }); expect(canBreak(S, 0)).toBe('own');
    full(S, 0); expect(skill(S, 0, 'ok')).toBe(true); // 로안 = 무기 = 흑표범 약점 → 자기 칸 + 친구 칸
    expect(S.cells.filter((c) => c.broken).length).toBe(2); expect(S.heroes[0]!.zaps.length).toBe(1); // 실드 깨기는 ⚡ 안 씀
  });
  it('마지막 실드 = 약점 시간 12초(피해 2배 · ATB 2배 · 보스 공격 멈춤) → HP 0 + 전원 생존 = 승리', () => {
    const S = fresh(['누아', '루멘']); S.bossHp = 200; full(S, 0); attack(S, 0, 'ok'); expect(S.shieldUp).toBe(true);
    for (const w of [0, 1]) { earn(S, w, { ...right, done: true }); full(S, w); breakShield(S, w); }
    expect(S.weakUntil).toBeCloseTo(S.t + 12); const bt = S.bossT; tick(S, 5); expect(S.bossT).toBe(bt);
    S.heroes[0]!.atb = 0; tick(S, 1); expect(S.heroes[0]!.atb).toBeCloseTo(2 / S.heroes[0]!.s.atbSec, 3);
    S.bossHp = 10; full(S, 0); attack(S, 0, 'ok'); expect(S.end).toMatchObject({ win: true });
  });
  it('보스: 12초마다 · 2초 전 표적 · 세 번째 = 광역 · 엄호 −50% · 방어율', () => {
    const S = fresh(); tick(S, 10.05); expect(S.target?.length).toBe(1);
    const tg = S.heroes[S.target![0]!]!; S.heroes[1]!.zaps = ['n']; full(S, 1); roleAct(S, 1, tg.id);
    const hp0 = tg.hp; tick(S, 2); const hit = Math.round(14 * 1.5 * (1 - tg.s.def) * 0.5); expect(hp0 - tg.hp).toBe(hit); // 흑표범 단일 = 강타 ×1.5
    tick(S, 12); tick(S, 12); const ev = S.ev.filter((e) => e.k === 'boss'); expect(ev.map((e) => (e as { aoe: boolean }).aoe)).toEqual([false, false, true]);
  });
  it('쓰러짐: 친구가 ⚡1 로 살림 · 팀 부활 3번 · 다 쓰면 한 명만 쓰러져도 실패 · 1인 = 바로 실패', () => {
    const S = fresh(['로안', '누아']); S.heroes[1]!.hp = 1; S.heroes[1]!.down = true;
    S.heroes[0]!.zaps = ['n']; full(S, 0); expect(revive(S, 0, 1)).toBe(true); expect([S.revives, S.heroes[1]!.down, S.heroes[1]!.hp]).toEqual([2, false, Math.round(95 * T.reviveHp)]);
    S.revives = 0; S.heroes[1]!.hp = 0; S.heroes[1]!.down = true; tick(S, 12.1); expect(S.end).toMatchObject({ win: false });
    const O = fresh(['로안']); O.heroes[0]!.hp = 1; tick(O, 12.1); expect(O.end).toMatchObject({ win: false, why: '쓰러짐' });
  });
  it('쓰러진 학생이 맞힘 = 친구 ATB +50%', () => {
    const S = fresh(['로안', '누아']); S.heroes[0]!.down = true; S.heroes[1]!.atb = 0.1; earn(S, 0, right, 1); expect(S.heroes[1]!.atb).toBeCloseTo(0.6);
  });
  it('역할: 힐러 광역 +12(팀 전체로 보스 공격 한 번 사이 1번) · 서포터 격려 = ATB 가득 · 딜러 강타 ×1.5', () => {
    const S = fresh(['로안', '발도르', '루멘', '누아', ]); for (const h of S.heroes) h.hp = 50;
    S.heroes[2]!.zaps = ['n', 'n']; full(S, 2); roleAct(S, 2); expect(S.heroes.map((h) => h.hp)).toEqual([62, 62, 62, 62]);
    full(S, 2); expect(roleAct(S, 2)).toBe(false); tick(S, 12.1); full(S, 2); expect(roleAct(S, 2)).toBe(true); // 보스 공격 한 번 지나면 다시
    S.heroes[3]!.zaps = ['n']; S.heroes[0]!.atb = 0; full(S, 3); roleAct(S, 3, 0); expect(S.heroes[0]!.atb).toBe(1);
    const hp = S.bossHp; S.heroes[0]!.zaps = ['n']; roleAct(S, 0); expect(hp - S.bossHp).toBe(Math.round(55 * S.heroes[0]!.s.skillMul * 1.5));
  });
  it('각성 필살기 = 🔨 +10 · ⚡5 · ×6.5 · 판당 1번', () => {
    const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(['로안'], 10), seed: 1 });
    S.heroes[0]!.zaps = Array(5).fill('n'); full(S, 0); skill(S, 0, 'ok'); const a = S.ev.at(-1) as { awk: boolean; dmg: number };
    expect(a.awk).toBe(true); expect(a.dmg).toBe(Math.min(S.bossMax, Math.round(55 * S.heroes[0]!.s.skillMul * 6.5 * 1.25)));
  });
  it('타이밍 바 · 모았다 놓기 판정 (금색이 많을수록 딱 맞음 칸 넓어짐)', () => {
    expect([timingOf(0.1), timingOf(0.4), timingOf(0.58)]).toEqual(['miss', 'ok', 'crit']);
    expect([holdOf(0.3, 0), holdOf(0.7, 0), holdOf(0.8, 0), holdOf(0.765, 0), holdOf(0.765, 5)]).toEqual(['miss', 'ok', 'best', 'ok', 'best']);
  });
  it('같은 씨앗 = 같은 판 · 봇 4 (보통 학생 · 일반) = 대략 3 ~ 6분 · 대부분 이김', () => {
    const run = (seed: number) => { const S = fresh(['로안', '발도르', '루멘', '누아'], seed); simulate(L2, S, S.heroes.map((_, i) => newBot(L2, i, 'normal', seed))); return S; };
    const a = run(3), b = run(3); expect([a.t, a.bossHp, a.end?.win]).toEqual([b.t, b.bossHp, b.end?.win]);
    const all = Array.from({ length: 10 }, (_, i) => run(i + 1)); const wins = all.filter((s) => s.end?.win).length, avg = all.reduce((x, s) => x + s.t, 0) / all.length / 60;
    expect(wins).toBeGreaterThanOrEqual(6); expect(avg).toBeGreaterThan(3); expect(avg).toBeLessThan(6.5);
  });
});
it('📊 판 기록: 판 길이 · 소문항당 시간 · 타이밍 · 모았다 놓기 · 쓰러짐 · 역할 조합', async () => {
  const { runRecord } = await import('../src/board/atb/engine');
  const S = fresh(); tick(S, 10); earn(S, 0, right); tick(S, 6); earn(S, 0, right);
  full(S, 0); attack(S, 0, 'crit'); full(S, 1); attack(S, 1, 'miss');
  const r = runRecord(S, { no: 2, cls: '1-3', practice: true });
  expect(r).toMatchObject({ no: 2, cls: '1-3', n: 4, roles: 'dealer+healer+support+tank', subs: 2, subSecMed: 10, timingOk: 50, timingCrit: 50, downs: 0 });
  expect(r.sec).toBe(16);
});
it('🔄 몬스터는 늘 왼쪽을 봄 = 오른쪽 보는 자세만 반전 (2차시 흑표범 대기 · 3 · 5차시 공격)', async () => {
  const { BOSSES } = await import('../src/board/atb/tune');
  expect(BOSSES[2]!.flip).toMatchObject({ idle: true, down: true }); expect(BOSSES[2]!.flip?.attack).toBeFalsy();
  expect(BOSSES[3]!.flip?.attack).toBe(true); expect(BOSSES[5]!.flip?.attack).toBe(true); expect(BOSSES[11]!.flip).toBeUndefined();
});
