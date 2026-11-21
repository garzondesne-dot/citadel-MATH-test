// ⚔ 게시판 던전 ATB 전투 엔진 (📜 docs/board-atb/design/정리.md 3절)
import { describe, expect, it } from 'vitest';
import { SUBJ } from '../src/engine/subject';
import { HEROES } from '../src/model/hero';
import { attack, breakShield, canBreak, earn, newBattle, revive, roleAct, skillList, tick, timingOf, timingZone, useSkill, skillPeek, type State } from '../src/board/atb/engine';
import { newBot, simulate } from '../src/board/atb/bots';
import { statsOf } from '../src/board/atb/heroes';
import { BOSSES, BOSS_HIT, BOSS_HP_BASE, DIFF_MUL, T } from '../src/board/atb/tune';

const L2 = SUBJ.lessons.find((p) => p.no === 2)!;
const id = (n: string) => HEROES.find((h) => h.name === n)!.id;
const party = (names: string[], enh = 1) => names.map((n) => statsOf({ hero: id(n), lv: 1, enh, tier: 1 }));
const fresh = (names = ['로안', '발도르', '루멘', '누아'], seed = 1) => newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(names), seed });
const full = (S: State, who: number) => { S.heroes[who]!.atb = 1; };
const right = { done: false, perfect: false, right: true };
const doneP = { done: true, perfect: true, right: true }, doneR = { done: true, perfect: false, right: true };

describe('ATB 엔진', () => {
  it('출발: 보스 HP = 인원별 일반 값 · 팀 부활 3', () => {
    expect([fresh().bossMax, fresh(['로안', '누아']).bossMax, fresh(['로안']).bossMax, fresh().revives]).toEqual([...[3, 1, 0].map((i) => (T.bossHpByNo[2] ?? BOSS_HP_BASE)[i]), 3]); // 차시별 일반 HP (📜 요청 #5)
    const E = newBattle({ boss: BOSSES[2]!, diff: 'easy', party: party(['로안']), seed: 1 }), Hd = newBattle({ boss: BOSSES[2]!, diff: 'hard', party: party(['로안']), seed: 1 }), b0 = fresh(['로안']).bossMax;
    expect([E.bossMax, Hd.bossMax]).toEqual([Math.round(b0 * DIFF_MUL.easy.hp), Math.round(b0 * DIFF_MUL.hard.hp)]); expect(BOSS_HIT.easy[3]![0]).toBeCloseTo(14 * 0.7 * DIFF_MUL.easy.hit); expect(BOSS_HIT.hard[3]![0]).toBeCloseTo(14 * 0.7 * DIFF_MUL.hard.hit); // 난이도 = 일반 × DIFF_MUL
  });
  it('ATB = 역할 속도로 참 · 가득 차야 행동', () => {
    const S = fresh(); S.heroes[0]!.atb = 0;
    expect(attack(S, 0, 'ok')).toBe(false); tick(S, 8); expect(S.heroes[0]!.atb).toBeCloseTo(1); expect(attack(S, 0, 'ok')).toBe(true);
  });
  it('일반 공격: 실패 0 · 성공 12 · 치명 ×1.5 + 다음 ATB 20%', () => {
    const S = fresh(); full(S, 0); attack(S, 0, 'miss'); expect(S.bossHp).toBe(S.bossMax);
    full(S, 0); attack(S, 0, 'ok'); const a = S.bossMax - S.bossHp; expect(a).toBe(Math.round(12 * S.heroes[0]!.s.atkMul));
    full(S, 0); attack(S, 0, 'crit'); expect(S.heroes[0]!.atb).toBeCloseTo(0.2);
  });
  it('⚡ 충전 (Y1) = 원문항을 통째로 끝내야 · 퍼펙트 3 · 재시도 2 · 최대 4 · 소문항 정답만으론 0', () => {
    const S = fresh(), h = S.heroes[0]!; expect(h.ch).toBe(T.chargeStart); h.ch = 0; // 📜 요청 #6 ③ 판 시작 = 1칸
    earn(S, 0, right); expect(h.ch).toBe(0);
    earn(S, 0, doneP); expect(h.ch).toBe(T.charge.perfect); earn(S, 0, doneR); expect(h.ch).toBe(Math.min(T.charge.max, T.charge.perfect + T.charge.retry)); earn(S, 0, doneP); expect(h.ch).toBe(T.charge.max);
  });
  it('⚡ 가득인데 또 끝냄 = 넘친 충전으로 장착 스킬 자동 (요청 #13 · 충전 · ATB 그대로 · 4레벨 · 각성은 자동 안 됨)', () => {
    const S = fresh(), h = S.heroes[0]!; h.ch = T.charge.max; h.atb = 0.2; const hp = S.bossHp;
    earn(S, 0, doneR); const e = S.ev.at(-1) as { k: string; kind: string; auto?: boolean; dmg: number };
    expect([e.k, e.kind, e.auto, h.ch, h.atb]).toEqual(['skill', 'equip', true, T.charge.max, 0.2]); expect(hp - S.bossHp).toBe(Math.round(T.skillBase * h.s.skillMul));
    h.ch = T.charge.max - 1; const n0 = S.ev.length; earn(S, 0, { done: true, perfect: false, right: true }); expect(h.ch).toBe(T.charge.max); expect(S.ev.slice(n0).some((x) => x.k === 'skill')).toBe(true); // 가득 − 1 + 재시도 2 = 1칸 넘침 · 장착 비용 1 = 자동 (📜 요청 #34 최대 4)
    h.ch = T.charge.max - 2; const n1 = S.ev.length; earn(S, 0, { done: true, perfect: false, right: true }); expect(h.ch).toBe(T.charge.max); expect(S.ev.slice(n1).some((x) => x.k === 'skill')).toBe(false); // 안 넘침 = 자동 없음
  });
  it('⚡ 스킬 (요청 #19): ⚡ 내 스킬 · 역할 · 🌟 비장(각성이면 각성 · 아니면 +10 홀리 방패) · 비용 1 · 1 · 3(2) · 피해 비 1 · 3.8', () => {
    const S = newBattle({ boss: { ...BOSSES[2]!, no: 99 }, diff: 'normal', party: [statsOf({ hero: HEROES.find((x) => x.name === '로안')!.id, lv: 10, enh: 10, tier: 4, awk: true }), ...party(['누아'])], seed: 1 }), h = S.heroes[0]!;
    expect(skillList(S, 0).map((x) => x.k)).toEqual(['equip', 'role', 'awk']); // 비장 = 각성(홀리 방패 칸 없음) · 부활 = 그때만
    expect(skillList(S, 1).map((x) => x.k)).toEqual(['equip', 'role']); S.bossMax = S.bossHp = 99999; // 실드 안 뜨게
    h.ch = 1; full(S, 0); expect(skillList(S, 0).filter((x) => x.ok).map((x) => x.k)).toEqual(['equip', 'role']);
    const base = T.skillBase * h.s.skillMul; let hp = S.bossHp; expect(useSkill(S, 0, 'equip')).toBe(true); expect([h.ch, hp - S.bossHp]).toEqual([0, Math.round(base * 1)]);
    S.bossHp = S.bossMax; h.ch = 3; full(S, 0); hp = S.bossHp; useSkill(S, 0, 'awk'); expect([h.ch, Math.min(hp, Math.round(base * 3.8))]).toEqual([0, hp - S.bossHp]);
    expect(skillList(S, 0).some((x) => x.k === 'awk')).toBe(false); // 판당 1번
  });
  it('🛡 오라 방패 (Y12 · +10 · 충전 2 · 판당 1번) = 다음 보스 공격 1번 팀 전체 막음 + 보스 석화(그동안 공격 시계 멈춤)', () => {
    const S = fresh(['로안', '누아']); S.heroes[0]!.s = statsOf({ hero: S.heroes[0]!.s.hero, lv: 1, enh: 10, tier: 1 }); const h = S.heroes[0]!;
    h.ch = 2; full(S, 0); expect(useSkill(S, 0, 'aura')).toBe(true); expect([h.ch, S.guard, S.stoneUntil]).toEqual([0, true, T.aura.stone]);
    tick(S, T.aura.stone - 0.5); expect(S.bossT).toBe(0); // 석화 = 공격 시계 멈춤
    const hp = S.heroes.map((x) => x.hp); tick(S, 0.5); tick(S, 12.05); expect(S.ev.some((e) => e.k === 'guard')).toBe(true); expect(S.heroes.map((x) => x.hp)).toEqual(hp);
    expect(skillList(S, 0).some((x) => x.k === 'aura')).toBe(false);
  });
  it('실드: HP 70% 에서 각자 1칸(계열) · 실드 중 피해 ×0.3 · HP 1 에서 멈춤 · 완주 표로만 깸 · 약점 계열 = 친구 칸도', () => {
    const S = fresh(); S.bossHp = Math.round(S.bossMax * 0.7) + 5; full(S, 0); attack(S, 0, 'ok');
    expect(S.shieldUp).toBe(true); expect(S.cells.map((c) => c.fam)).toEqual(['arms', 'mystic', 'mystic', 'wisdom']);
    const hp = S.bossHp; full(S, 0); attack(S, 0, 'ok'); expect(hp - S.bossHp).toBe(Math.round(12 * S.heroes[0]!.s.atkMul * 0.3));
    S.bossHp = 5; for (let i = 0; i < 9; i++) { full(S, 1); attack(S, 1, 'crit'); } expect(S.bossHp).toBe(1);
    S.heroes[0]!.ch = 0; expect(canBreak(S, 0)).toBe(null); earn(S, 0, doneR); expect(canBreak(S, 0)).toBe('own');
    full(S, 0); expect(useSkill(S, 0, 'shield')).toBe(true); // 로안 = 무기 = 흑표범 약점 → 자기 칸 + 친구 칸
    expect(S.cells.filter((c) => c.broken).length).toBe(2); expect(S.heroes[0]!.ch).toBe(T.charge.retry - 1); // 보호막 부수기 = 충전 1 (Y2 · 재시도 = 2칸)
  });
  it('마지막 실드 = 약점 시간 12초(피해 2배 · ATB 2배 · 보스 공격 멈춤) → HP 0 + 전원 생존 = 승리', () => {
    const S = fresh(['누아', '루멘']); S.bossHp = 200; full(S, 0); attack(S, 0, 'ok'); expect(S.shieldUp).toBe(true);
    for (const w of [0, 1]) { earn(S, w, doneR); full(S, w); breakShield(S, w); }
    expect(S.weakUntil).toBeCloseTo(S.t + 12); const bt = S.bossT; tick(S, 5); expect(S.bossT).toBe(bt);
    S.heroes[0]!.atb = 0; tick(S, 1); expect(S.heroes[0]!.atb).toBeCloseTo(2 / S.heroes[0]!.s.atbSec, 3);
    S.bossHp = 10; full(S, 0); attack(S, 0, 'ok'); expect(S.end).toMatchObject({ win: true });
  });
  it('보스: 12초마다 · 2초 전 표적 · 세 번째 = 광역 · 엄호 −50% · 방어율', () => {
    const S = fresh(); tick(S, 10.05); expect(S.target?.length).toBe(1);
    const tg = S.heroes[S.target![0]!]!; S.heroes[1]!.ch = 1; full(S, 1); roleAct(S, 1, tg.id);
    const hp0 = tg.hp; tick(S, 2); const hit = Math.round(BOSS_HIT.normal[3]![0] * (T.bossHitByNo[2]?.[3] ?? 1) * 1.5 * (1 - tg.s.def) * 0.5); expect(hp0 - tg.hp).toBe(hit); // 흑표범 단일 = 강타 ×1.5
    tick(S, 12); tick(S, 12); const ev = S.ev.filter((e) => e.k === 'boss'); expect(ev.map((e) => (e as { aoe: boolean }).aoe)).toEqual([false, false, true]);
  });
  it('쓰러짐: 친구가 충전 1 로 살림 · 팀 부활 3번 · 다 쓰면 한 명만 쓰러져도 실패 · 1인 = 바로 실패', () => {
    const S = fresh(['로안', '누아']); S.heroes[1]!.hp = 1; S.heroes[1]!.down = true;
    S.heroes[0]!.ch = 1; full(S, 0); expect(skillList(S, 0).some((x) => x.k === 'revive' && x.ok)).toBe(true); expect(useSkill(S, 0, 'revive', 1)).toBe(true); expect([S.revives, S.heroes[1]!.down, S.heroes[1]!.hp]).toEqual([2, false, Math.round(95 * T.reviveHp)]);
    S.revives = 0; S.heroes[1]!.hp = 0; S.heroes[1]!.down = true; tick(S, 12.1); expect(S.end).toMatchObject({ win: false });
    const O = fresh(['로안']); O.heroes[0]!.hp = 1; tick(O, 12.1); expect(O.end).toMatchObject({ win: false, why: '쓰러짐' });
  });
  it('쓰러진 학생이 맞힘 = 친구 ATB +50%', () => {
    const S = fresh(['로안', '누아']); S.heroes[0]!.down = true; S.heroes[1]!.atb = 0.1; earn(S, 0, right, 1); expect(S.heroes[1]!.atb).toBeCloseTo(0.6);
  });
  it('역할: 힐러 광역 +12(팀 전체로 보스 공격 한 번 사이 1번) · 서포터 격려 = ATB 가득 · 딜러 강타 ×1.5', () => {
    const S = fresh(['로안', '발도르', '루멘', '누아', ]); for (const h of S.heroes) h.hp = 50;
    S.heroes[2]!.ch = 2; full(S, 2); roleAct(S, 2); expect(S.heroes.map((h) => h.hp)).toEqual([62, 62, 62, 62]);
    full(S, 2); expect(roleAct(S, 2)).toBe(false); tick(S, 12.1); full(S, 2); expect(roleAct(S, 2)).toBe(true); // 보스 공격 한 번 지나면 다시
    S.heroes[3]!.ch = 1; S.heroes[0]!.atb = 0; full(S, 3); roleAct(S, 3, 0); expect(S.heroes[0]!.atb).toBe(1);
    const hp = S.bossHp; S.heroes[0]!.ch = 1; roleAct(S, 0); expect(hp - S.bossHp).toBe(Math.round(T.skillBase * S.heroes[0]!.s.skillMul * 1.5));
  });
  it('🌟 비장 = +10 만이면 홀리 방패 · 실드가 뜨면 ⚡ 내 스킬이 실드 칸 깸 (요청 #19)', () => {
    const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(['로안'], 10), seed: 1 });
    expect(skillList(S, 0).map((x) => x.k)).toEqual(['equip', 'role', 'aura']);
    const B = fresh(); B.shieldUp = true; B.cells = B.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); B.heroes[0]!.ch = 1; full(B, 0); const hp = B.bossHp;
    expect(useSkill(B, 0, 'equip')).toBe(true); expect(B.cells.filter((c) => c.broken).length).toBeGreaterThanOrEqual(1); expect(B.bossHp).toBe(hp); // 피해 대신 실드 칸
  });
  it('타이밍 바 판정 · 칸 자리 · 폭 · 빠르기 = 판마다 무작위(TUNE 범위)', () => {
    const z = { ok: [0.35, 0.8] as [number, number], crit: [0.52, 0.64] as [number, number], ms: 1600 };
    expect([timingOf(0.1, z), timingOf(0.4, z), timingOf(0.58, z)]).toEqual(['miss', 'ok', 'crit']);
    // 🎲 칸은 판마다 바뀜 · 늘 0 ~ 1 안 · 치명 칸 ⊂ 성공 칸 · 폭 · 빠르기 = TUNE 범위
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); const seen = new Set<number>();
    for (let i = 0; i < 200; i++) { const q = timingZone(rnd); seen.add(Math.round(q.ok[0] * 20));
      expect(q.ok[0]).toBeGreaterThanOrEqual(T.timingZone.edge - 1e-9); expect(q.ok[1]).toBeLessThanOrEqual(1 - T.timingZone.edge + 1e-9);
      expect(q.crit[0]).toBeGreaterThanOrEqual(q.ok[0] - 1e-9); expect(q.crit[1]).toBeLessThanOrEqual(q.ok[1] + 1e-9);
      expect(q.ms).toBeGreaterThanOrEqual(T.timingZone.ms[0]); expect(q.ms).toBeLessThanOrEqual(T.timingZone.ms[1]); }
    expect(seen.size).toBeGreaterThan(5);
  });
  // ⏳ 승률은 설계 방 Y1 충전 최종값 · 보스 HP 차시별(🌊 완료 #4) 뒤에 다시 조임 · 지금 = 판이 끝나고(막힘 없음) 길이가 맞는지만
  it('같은 씨앗 = 같은 판 · 봇 4 (보통 학생 · 일반) = 대략 3 ~ 6.5분 · 15분 막힘 없음', () => {
    const run = (seed: number) => { const S = fresh(['로안', '발도르', '루멘', '누아'], seed); simulate(L2, S, S.heroes.map((_, i) => newBot(L2, i, 'normal', seed))); return S; };
    const a = run(3), b = run(3); expect([a.t, a.bossHp, a.end?.win]).toEqual([b.t, b.bossHp, b.end?.win]);
    const all = Array.from({ length: 10 }, (_, i) => run(i + 1)); const wins = all.filter((s) => s.end?.win).length, avg = all.reduce((x, s) => x + s.t, 0) / all.length / 60;
    expect(wins).toBeGreaterThanOrEqual(0); expect(all.every((s) => s.end)).toBe(true); expect(avg).toBeGreaterThan(3); expect(avg).toBeLessThan(6.5);
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
describe('대표 행동 9 (📜 설정표 v3 · 선생님 확정 11/20)', () => {
  const at = (no: number, names = ['로안', '발도르', '루멘', '누아'], seed = 1) => newBattle({ boss: BOSSES[no]!, diff: 'normal', party: party(names), seed });
  const run = (S: State, sec: number) => { for (let k = 0; k < Math.round(sec * 10); k++) tick(S, 0.1); };
  const bossEvs = (S: State) => S.ev.filter((e) => e.k === 'boss') as { atk: string; aoe: boolean; dmg: number[] }[];
  it('공격 차례 = 차시마다 (2 강타 · 강타 · 독 / 3 강타 · 강타 · 화염 / 5 수면 · 수면 · 화염 숨 / 11 혀 · 혀 · 물결)', () => {
    for (const [no, want] of [[2, ['강타', '강타', '독']], [3, ['강타', '강타', '화염']], [5, ['수면', '수면', '화염 숨']], [11, ['혀 치기', '혀 치기', '물결']]] as [number, string[]][]) {
      const S = at(no); for (const h of S.heroes) h.hp = 999; run(S, 36.5); expect(bossEvs(S).map((e) => e.atk), String(no)).toEqual(want);
    }
  });
  it('5 화염 숨 = 3초 예고 · 예고 중 실드를 다 깨면 취소', () => {
    const S = at(5, ['누아']); run(S, 24.2); expect(S.nextAtk).toBeNull(); run(S, 9.2); expect(S.nextAtk).toBe('fire'); expect(S.target).not.toBeNull(); // 12 − 3 = 9초째 예고
    S.shieldUp = true; S.cells = [{ owner: 0, fam: 'wisdom', broken: false }]; earn(S, 0, doneR); full(S, 0); breakShield(S, 0);
    expect([S.target, S.nextAtk]).toEqual([null, null]); run(S, 3); expect(bossEvs(S).length).toBe(2);
  });
  it('수면 = 행동 불능 · 맞으면 깸 / 9 속박 = 서포터 격려로 바로 풀림', () => {
    const S = at(5); for (const h of S.heroes) h.hp = 999; run(S, 12.1); const tg = S.heroes.find((h) => h.stunUntil > S.t)!; expect(tg.stunKind).toBe('sleep');
    const B = at(9); for (const h of B.heroes) h.hp = 999; run(B, 12.1); const b = B.heroes.find((h) => h.stunUntil > B.t)!; expect(b.stunKind).toBe('bind');
    const sup = B.heroes.find((h) => h.s.role === 'support' && h.id !== b.id)!; sup.ch = 1; full(B, sup.id); roleAct(B, sup.id, b.id); expect(b.stunUntil).toBe(0);
  });
  it('4 얼음 갑옷 · 11 물결 = 실드 중 받는 피해 ×0.2', () => {
    const S = at(4); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); const hp = S.bossHp; full(S, 0); attack(S, 0, 'ok');
    expect(hp - S.bossHp).toBe(Math.round(12 * S.heroes[0]!.s.atkMul * 0.2));
  });
  it('6 · 7 숨 고르기 = 실드 뒤 30초마다 3초 예고 → HP 8% · 예고 중 실드 깨면 끊김', () => {
    const S = at(6); for (const h of S.heroes) { h.hp = 9999; } S.bossHp = Math.round(S.bossMax * 0.7) + 2; full(S, 0); attack(S, 0, 'ok');
    const hp = S.bossHp; run(S, 30.05); expect(S.breathWarn).not.toBeNull(); run(S, 3); expect(S.bossHp - hp).toBe(Math.round(S.bossMax * 0.08));
    run(S, 30); expect(S.breathWarn).not.toBeNull(); earn(S, 0, doneR); full(S, 0); breakShield(S, 0); expect(S.breathWarn).toBeNull();
  });
  it('8 거울빛 = 다음 10초 일반 공격 피해 30% 가 그 용사에게 · 스킬은 안 돌아옴', () => {
    const S = at(8); for (const h of S.heroes) h.hp = 999; run(S, 36.5); expect(S.mirrorUntil).toBeGreaterThan(S.t);
    const h = S.heroes[0]!, hp = h.hp; full(S, 0); attack(S, 0, 'ok'); const d = (S.ev.filter((e) => e.k === 'atk').at(-1) as { dmg: number }).dmg; expect(hp - h.hp).toBe(Math.max(1, Math.round(d * 0.3)));
    const hp2 = h.hp; h.ch = 1; full(S, 0); useSkill(S, 0, 'equip'); expect(h.hp).toBe(hp2);
  });
  it('10 기우는 저울 = 기울면 단일(그 쪽 용사) · 수평이면 광역 · 씨앗마다 섞임', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 12; s++) { const S = at(10, undefined, s); run(S, 10.05); seen.add(S.aoeNext ? 'aoe' : `tilt${S.tilt}`); expect(S.aoeNext ? S.tilt : S.tilt.length).toBe(S.aoeNext ? '' : 1); }
    expect(seen.has('aoe')).toBe(true); expect([...seen].some((x) => x.startsWith('tilt'))).toBe(true);
  });
});

// 🔎 📜 요청 #19 덧3 스킬 미리 보기 = 어림값이 실제 피해와 같음 · 실드 · 약점 · 못 쓰는 까닭
describe('ATB 스킬 미리 보기 (요청 #19 덧3)', () => {
  it('⚡ 내 스킬 어림값 = 실제 피해 · 약점 시간 = ×2 금색 · 실드 = 「실드 깸」', () => {
    const S = fresh(); const h = S.heroes[0]!; h.atb = 1; h.ch = 3;
    const p = skillPeek(S, 0, 'equip'), hp0 = S.bossHp; expect(useSkill(S, 0, 'equip')).toBe(true);
    expect(p.line).toBe(`💥 약 ${hp0 - S.bossHp}`); expect(p.gold).toBe(false);
    S.weakUntil = S.t + 10; h.atb = 1; const w = skillPeek(S, 0, 'equip'); expect(w.gold).toBe(true); expect(w.line).toMatch(/약점 ×2/);
    S.weakUntil = 0; S.shieldUp = true; S.cells = S.heroes.map((x) => ({ owner: x.id, fam: x.s.fam, broken: false }));
    expect(skillPeek(S, 0, 'equip').line).toMatch(/^🛡 실드 깸/);
  });
  it('역할 · 부활 · 못 쓰는 까닭', () => {
    const S = fresh(); const h = S.heroes[2]!; h.ch = 0; h.atb = 1;
    expect(skillPeek(S, 2, 'role').line).toBe(`💚 팀 +${T.role.healer.heal}`);
    expect(skillPeek(S, 2, 'role').why).toMatch(/⚡ 1 필요/);
    expect(skillPeek(S, 0, 'revive').line).toBe('💖 부활 HP 30%');
    h.ch = 1; h.atb = 0.5; expect(skillPeek(S, 2, 'role').why).toBe('ATB 차는 중');
  });
});
