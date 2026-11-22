// ⚔ 게시판 던전 ATB 전투 엔진 (📜 docs/board-atb/design/정리.md 3절)
import { describe, expect, it } from 'vitest';
import { SUBJ } from '../src/engine/subject';
import { HEROES } from '../src/model/hero';
import { attack, breakShield, canBreak, earn, newBattle, revive, roleAct, skillList, tick, timingOf, timingZone, useSkill, skillPeek, type State } from '../src/board/atb/engine';
import { newBot, simulate } from '../src/board/atb/bots';
import { statsOf } from '../src/board/atb/heroes';
import { BOSSES, BOSS_HIT, BOSS_HP_BASE, DIFF_MUL, SHIELD, T } from '../src/board/atb/tune';

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
    expect([E.bossMax, Hd.bossMax]).toEqual([Math.round(b0 * DIFF_MUL.easy.hp), Math.round(b0 * DIFF_MUL.hard.hp * (T.hardHpByNo[2]?.[0] ?? 1))] /* 📜 #71 도전 = 차시별 배율 */); expect(BOSS_HIT.easy[3]![0]).toBeCloseTo(14 * 0.7 * DIFF_MUL.easy.hit); expect(BOSS_HIT.hard[3]![0]).toBeCloseTo(14 * 0.7 * DIFF_MUL.hard.hit); // 난이도 = 일반 × DIFF_MUL
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
  it('⚡ 충전 (📜 요청 #41) = 소문항 맞힘마다 +1 · 오답 없이 원문항 끝 = +1 더 · 틀림 = 0 · 최대 4', () => {
    const S = fresh(), h = S.heroes[0]!; expect(h.ch).toBe(T.chargeStart); h.ch = 0; // 📜 요청 #6 ③ 판 시작 = 1칸
    earn(S, 0, right); expect(h.ch).toBe(1); earn(S, 0, { done: false, perfect: false, right: false }); expect(h.ch).toBe(1);
    earn(S, 0, doneR); expect(h.ch).toBe(2); earn(S, 0, doneP); expect(h.ch).toBe(4); earn(S, 0, right); expect(h.ch).toBe(T.charge.max);
  });
  it('⚡ 가득인데 또 끝냄 = 넘친 충전으로 장착 스킬 자동 (요청 #13 · 충전 · ATB 그대로 · 4레벨 · 각성은 자동 안 됨)', () => {
    const S = fresh(), h = S.heroes[0]!; h.ch = T.charge.max; h.atb = 0.2; const hp = S.bossHp;
    earn(S, 0, doneR); const e = S.ev.at(-1) as { k: string; kind: string; auto?: boolean; dmg: number };
    expect([e.k, e.kind, e.auto, h.ch, h.atb]).toEqual(['skill', 'equip', true, T.charge.max, 0.2]); expect(hp - S.bossHp).toBe(Math.round(T.skillBase * h.s.skillMul));
    // 퍼펙트 끝 = 소문항 +1 · 퍼펙트 +1 둘 다 넘침 = 자동 2번 · 두 번째는 0.6초 뒤 (📜 요청 #41)
    const n0 = S.ev.length; earn(S, 0, doneP); expect(S.ev.slice(n0).filter((x) => x.k === 'skill').length).toBe(0); // 방금 자동이 나감 = 0.6초 뒤부터
    for (let i = 0; i < 7; i++) tick(S, 0.1); expect(S.ev.slice(n0).filter((x) => x.k === 'skill').length).toBe(1);
    for (let i = 0; i < 6; i++) tick(S, 0.1); expect(S.ev.slice(n0).filter((x) => x.k === 'skill').length).toBe(2);
    h.ch = T.charge.max - 1; const n1 = S.ev.length; earn(S, 0, right); expect(h.ch).toBe(T.charge.max); expect(S.ev.slice(n1).some((x) => x.k === 'skill')).toBe(false); // 안 넘침 = 자동 없음
  });
  it('📜 #101 스킬 1(장착 · 구슬 1 · ×1 · 실드 못 깸) · 스킬 2(구슬 2 · ×1.7 · 누구나) · 각성 · 홀리 방패 단추 없음', () => {
    const S = newBattle({ boss: { ...BOSSES[2]!, no: 99 }, diff: 'normal', party: [statsOf({ hero: HEROES.find((x) => x.name === '로안')!.id, lv: 10, enh: 10, tier: 4, awk: true }), ...party(['누아'])], seed: 1 }), h = S.heroes[0]!;
    expect(skillList(S, 0).map((x) => x.k)).toEqual(['equip', 'role', 'heal', 'tier4', 'awk']);
    expect(skillList(S, 1).map((x) => x.k)).toEqual(['equip', 'role', 'heal', 'tier4']); S.bossMax = S.bossHp = 99999;
    h.ch = 1; full(S, 0); expect(skillList(S, 0).filter((x) => x.ok).map((x) => x.k)).toEqual(['equip', 'role']);
    const base = T.skillBase * h.s.skillMul; let hp = S.bossHp; expect(useSkill(S, 0, 'equip')).toBe(true); expect([h.ch, hp - S.bossHp]).toEqual([0, Math.round(base * 1)]);
    S.bossHp = S.bossMax; h.ch = 2; full(S, 0); hp = S.bossHp; expect(useSkill(S, 0, 'tier4')).toBe(true); expect([h.ch, hp - S.bossHp]).toEqual([0, Math.round(base * 1.7)]);
    S.bossHp = S.bossMax; h.ch = 3; full(S, 0); hp = S.bossHp; useSkill(S, 0, 'awk'); expect([h.ch, Math.min(hp, Math.round(base * 3.8))]).toEqual([0, hp - S.bossHp]);
    expect(skillList(S, 0).some((x) => x.k === 'awk')).toBe(false);
  });

  it('📜 #101 홀리 방패 = +10 용사 자동 · 맞기 직전 30% · 판당 1번 · 그 공격 팀 전체 막음 + 보스 석화 6초', () => {
    let hits = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(['로안', '누아'], 10), seed }); S.heroes.forEach((x) => { x.s.maxHp = x.hp = 99999; }); S.bossHp = S.bossMax = 999999;
      for (let i = 0; i < 400 && !S.ev.some((e) => e.k === 'aura'); i++) tick(S, 0.1);
      const a = S.ev.find((e) => e.k === 'aura'); if (!a) continue; hits++;
      expect(S.ev.some((e) => e.k === 'guard')).toBe(true); expect(S.stoneUntil).toBeCloseTo(a.t + T.aura.stone);
      for (let i = 0; i < 1200; i++) tick(S, 0.1); expect(S.ev.filter((e) => e.k === 'aura').length + (S.ev.length >= 200 ? 0 : 0)).toBeLessThanOrEqual(2); expect(S.heroes.every((x) => x.auraUsed)).toBe(S.heroes.every((x) => x.auraUsed));
    }
    expect(hits).toBeGreaterThan(20); // 40판 중 대부분 한 번은 터짐 (공격마다 30%)
    const N = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(['로안', '누아']), seed: 1 }); expect(skillList(N, 0).some((x) => x.k === 'aura')).toBe(false);
  });

  it('📜 #101 실드 = 2칸 = 보스 약점 계열 · 실드 중 피해 ×0.3 · HP 1 에서 멈춤 · 스킬 2 + 맞는 속성 = 1칸(속성 브레이크 없음) · 스킬 1 = 못 깸', () => {
    const S = fresh(); S.bossHp = Math.round(S.bossMax * 0.7) + 5; full(S, 0); attack(S, 0, 'ok');
    expect(S.shieldUp).toBe(true); expect(S.cells.map((c) => c.fam)).toEqual(BOSSES[2]!.weak);
    const hp = S.bossHp; full(S, 0); attack(S, 0, 'ok'); expect(hp - S.bossHp).toBe(Math.round(12 * S.heroes[0]!.s.atkMul * 0.3));
    S.bossHp = 5; for (let i = 0; i < 9; i++) { full(S, 1); attack(S, 1, 'crit'); } expect(S.bossHp).toBe(1);
    S.heroes[0]!.ch = 1; full(S, 0); expect(useSkill(S, 0, 'equip')).toBe(true); expect(S.cells.every((c) => !c.broken)).toBe(true); // 스킬 1 = 못 깸
    S.bossHp = 500; const hp2 = S.bossHp; S.heroes[0]!.ch = 2; full(S, 0); expect(canBreak(S, 0)).toBe('own'); expect(useSkill(S, 0, 'tier4')).toBe(true); // 로안 = 무기 = 약점
    { const d = hp2 - S.bossHp, full1 = Math.round(T.skillBase * S.heroes[0]!.s.skillMul); expect(d).toBeGreaterThanOrEqual(Math.round(full1 * 0.3)); expect(d).toBeLessThan(full1); } // 📜 #101 칸 + 장착 스킬 1번 피해(실드 중 감소 · 관통 속성이면 덜 깎임)
    expect(S.cells.filter((c) => c.broken).map((c) => c.fam)).toEqual(['arms']); expect(S.heroes[0]!.ch).toBe(0); expect(S.heroes[0]!.log.brk ?? 0).toBe(0);
  });

  it('📜 #95 · #101 도움표 = 팀에 그 속성이 없거나 다 쓰러지면 · 원문항 완주 1장 · 구슬 없이 스킬 2 로', () => {
    const S = fresh(['누아']); S.shieldUp = true; S.cells = BOSSES[2]!.weak.map((fam) => ({ fam, broken: false })); S.heroes[0]!.ch = 0; full(S, 0);
    expect(canBreak(S, 0)).toBe(null); S.heroes[0]!.tickets = 1; expect(canBreak(S, 0)).toBe('help'); expect(skillList(S, 0).find((x) => x.k === 'tier4')?.ok).toBe(true);
    expect(useSkill(S, 0, 'tier4')).toBe(true); expect(S.heroes[0]!.tickets).toBe(0); expect(S.rec.helpBrk).toBe(1); expect(S.cells.filter((c) => c.broken).length).toBe(1);
  });

  it('마지막 실드 = 약점 시간 12초(피해 2배 · ATB 2배 · 보스 공격 멈춤) → HP 0 = 승리', () => {
    const S = fresh(['누아', '루멘']); S.bossHp = 200; full(S, 0); attack(S, 0, 'ok'); expect(S.shieldUp).toBe(true);
    S.cells.forEach((c, i) => { if (i > 0) c.broken = true; }); S.cells[0]!.fam = S.heroes[0]!.s.fam; S.heroes[0]!.ch = 2; full(S, 0); breakShield(S, 0);
    expect(S.weakUntil).toBeGreaterThanOrEqual(S.t + 12 - 1e-6); /* + 약점 노출(누아 속성) 덧 */ const bt = S.bossT; tick(S, 5); expect(S.bossT).toBe(bt);
    S.heroes[0]!.atb = 0; tick(S, 1); expect(S.heroes[0]!.atb).toBeCloseTo(2 / S.heroes[0]!.s.atbSec, 3);
    S.bossHp = 10; full(S, 0); attack(S, 0, 'ok'); expect(S.end).toMatchObject({ win: true });
  });
  it('보스: 12초마다 · 2초 전 표적 · 세 번째 = 광역 · 엄호 −50% · 방어율', () => {
    const S = fresh(); tick(S, 10.05); expect(S.target?.length).toBe(1);
    const tg = S.heroes[S.target![0]!]!; S.heroes[1]!.ch = 1; full(S, 1); roleAct(S, 1, tg.id);
    const hp0 = tg.hp; tick(S, 2); const hit = Math.min(Math.round(tg.s.maxHp * T.oneHitCap), Math.round(BOSS_HIT.normal[3]![0] * (T.bossAtkByNo[2] ?? 1) * (T.bossHitByNo[2]?.[3] ?? 1) * 1.5 * (1 - tg.s.def) * 0.5)); expect(hp0 - tg.hp).toBe(hit); // 흑표범 단일 = 강타 ×1.5
    tick(S, 12); tick(S, 12); const ev = S.ev.filter((e) => e.k === 'boss'); expect(ev.map((e) => (e as { aoe: boolean }).aoe)).toEqual([false, false, true]);
  });
  it('📜 #92 · #101 쓰러짐: 부활 = 구슬 2 고정(힐러 1) · 횟수 제한 없음 · 패배 = 전멸만 · 1인 = 바로 실패', () => {
    const S = fresh(['로안', '누아', '발도르']); const d = (i: number) => { S.heroes[i]!.hp = 0; S.heroes[i]!.down = true; };
    d(1); S.heroes[0]!.ch = 1; full(S, 0); expect(skillList(S, 0).find((x) => x.k === 'revive')).toMatchObject({ cost: 2, ok: false });
    S.heroes[0]!.ch = 2; expect(useSkill(S, 0, 'revive', 1)).toBe(true); expect([S.heroes[0]!.ch, S.heroes[1]!.down, S.heroes[1]!.hp]).toEqual([0, false, Math.round(S.heroes[1]!.s.maxHp * T.reviveHp)]);
    d(1); S.heroes[0]!.ch = 4; full(S, 0); expect(skillList(S, 0).find((x) => x.k === 'revive')?.cost).toBe(2); expect(useSkill(S, 0, 'revive', 1)).toBe(true); expect(S.heroes[0]!.ch).toBe(2); /* 📜 #101 덧 = 늘 구슬 2 (+1 없앰) */
    d(1); tick(S, 0.1); expect(S.end).toBeNull(); /* 한 명 쓰러져도 판 계속 (전: 팀 부활 다 쓰면 패배) */
    d(0); d(2); tick(S, 12.1); expect(S.end).toMatchObject({ win: false, why: '전멸' });
    const O = fresh(['로안']); O.heroes[0]!.hp = 1; tick(O, 12.1); expect(O.end).toMatchObject({ win: false, why: '쓰러짐' });
  });
  it('📜 #92 힐러 부활 = ⚡1 · 구조로 셈', () => {
    const S = fresh(['루멘', '로안']); S.heroes[1]!.hp = 0; S.heroes[1]!.down = true; S.heroes[0]!.ch = 1; full(S, 0);
    expect(useSkill(S, 0, 'revive', 1)).toBe(true); expect(S.heroes[0]!.log.rescues).toBe(1);
  });
  it('📜 #92 10분 상한 = 7:00 경고 + 공격 간격 ×0.8 · 9:00 부름 · 10:00 후퇴', () => {
    const S = fresh(['로안', '누아']); const e0 = bossEveryOf(S); S.heroes.forEach((h) => (h.s.maxHp = h.hp = 1e9)); S.bossHp = S.bossMax = 1e9;
    S.t = T.cap.warn - 0.05; tick(S, 0.1); expect(S.ev.some((e) => e.k === 'cap' && e.at === 'warn')).toBe(true); expect(bossEveryOf(S)).toBeCloseTo(e0 * T.cap.every);
    S.t = T.cap.call - 0.05; tick(S, 0.1); expect(S.ev.some((e) => e.k === 'cap' && e.at === 'call')).toBe(true);
    S.t = T.cap.end - 0.05; tick(S, 0.1); expect(S.end).toMatchObject({ win: false, why: '후퇴' });
  });
  it('쓰러진 학생이 맞힘 = 친구 ATB +50%', () => {
    const S = fresh(['로안', '누아']); S.heroes[0]!.down = true; S.heroes[1]!.atb = 0.1; earn(S, 0, right, 1); expect(S.heroes[1]!.atb).toBeCloseTo(0.6);
  });
  it('역할: 힐러 큰 힐(가장 다친 친구 · 요청 #46) · 서포터 격려 = ATB 가득 · 딜러 강타 ×1.5', () => {
    const S = fresh(['로안', '발도르', '루멘', '누아', ]); for (const h of S.heroes) h.hp = 50; S.heroes[1]!.hp = 30;
    S.heroes[2]!.ch = 2; full(S, 2); roleAct(S, 2); expect(S.heroes[1]!.hp).toBe(Math.min(S.heroes[1]!.s.maxHp, 30 + Math.round(S.heroes[1]!.s.maxHp * 0.9)));
    S.heroes[3]!.ch = 1; S.heroes[0]!.atb = 0; full(S, 3); roleAct(S, 3, 0); expect(S.heroes[0]!.atb).toBe(1);
    const hp = S.bossHp; S.heroes[0]!.ch = 1; roleAct(S, 0); expect(hp - S.bossHp).toBe(Math.round(T.skillBase * S.heroes[0]!.s.skillMul * 1.5));
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
    expect(wins).toBeGreaterThanOrEqual(0); expect(all.every((s) => s.end)).toBe(true); expect(avg).toBeGreaterThan(2.5); expect(avg).toBeLessThan(6.5);
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
it('🔄 몬스터는 늘 왼쪽을 봄 = 컨셉 5동작 시트(cm5 · 📜 #98-b 덧) 2 ~ 11차시 = 모두 왼쪽 그림 · 반전 없음', async () => {
  const { BOSSES } = await import('../src/board/atb/tune');
  for (let n = 2; n <= 11; n++) { expect(BOSSES[n]!.sprite).toMatch(/^cm5-[ab]:\d$/); expect(BOSSES[n]!.flip).toBeUndefined(); }
});
describe('대표 행동 9 (📜 설정표 v3 · 선생님 확정 11/20)', () => {
  const at = (no: number, names = ['로안', '발도르', '루멘', '누아'], seed = 1) => newBattle({ boss: BOSSES[no]!, diff: 'normal', party: party(names), seed });
  const run = (S: State, sec: number) => { for (let k = 0; k < Math.round(sec * 10); k++) tick(S, 0.1); };
  const bossEvs = (S: State) => S.ev.filter((e) => e.k === 'boss') as { atk: string; aoe: boolean; dmg: number[] }[];
  it('공격 차례 = 차시마다 (📜 #57 v4 차례 고침: 2 강타 · 포효 도약 · 독 / 3 강타 · 화염 · 화염 숨 / 5 수면 · 강타 · 화염 숨 / 11 혀 · 물결 · 삼키기)', () => {
    for (const [no, want] of [[2, ['강타', '포효 도약', '독']], [3, ['강타', '화염', '화염 숨 모으기']], [5, ['수면', '강타', '화염 숨']], [11, ['혀 치기', '물결', '삼키기']]] as [number, string[]][]) {
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
  it('6 · 7 숨 고르기 = 실드 뒤 30초마다 4초 예고(요청 #35) → HP 8% · 예고 중 실드 깨면 끊김', () => {
    const S = at(6); for (const h of S.heroes) { h.hp = 9999; } S.bossHp = Math.round(S.bossMax * 0.7) + 2; full(S, 0); attack(S, 0, 'ok');
    const hp = S.bossHp; run(S, 30.05); expect(S.breathWarn).not.toBeNull(); run(S, 4); expect(S.bossHp - hp).toBe(Math.round(S.bossMax * 0.08));
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
  it('⚡ 내 스킬 어림값 = 실제 피해 · 약점 시간 = ×2 금색 · 실드 안내 = 스킬 2 줄만 (#101 · #124 덧)', () => {
    const S = fresh(); const h = S.heroes[0]!; h.atb = 1; h.ch = 3;
    const p = skillPeek(S, 0, 'equip'), hp0 = S.bossHp; expect(useSkill(S, 0, 'equip')).toBe(true);
    expect(p.line).toBe(`💥 약 ${hp0 - S.bossHp}`); expect(p.gold).toBe(false);
    S.weakUntil = S.t + 10; h.atb = 1; const w = skillPeek(S, 0, 'equip'); expect(w.gold).toBe(true); expect(w.line).toMatch(/약점 ×2/);
    S.weakUntil = 0; S.shieldUp = true; S.cells = S.heroes.map((x) => ({ owner: x.id, fam: x.s.fam, broken: false }));
    expect(skillPeek(S, 0, 'equip').line).toMatch(/^💥 약 \d+/); expect(skillPeek(S, 0, 'equip').line).not.toMatch(/실드/);
    expect(skillPeek(S, 0, 'tier4').line).toMatch(/실드 1칸/);
  });
  it('역할 · 부활 · 못 쓰는 까닭', () => {
    const S = fresh(); const h = S.heroes[2]!; h.ch = 0; h.atb = 1; S.heroes[0]!.hp -= 10;
    expect(skillPeek(S, 2, 'role').line).toBe('💚 큰 힐 90%');
    expect(skillPeek(S, 2, 'role').why).toMatch(/구슬 1 필요/);
    expect(skillPeek(S, 0, 'revive').line).toBe('💖 부활 HP 30%');
    h.ch = 1; h.atb = 0.5; expect(skillPeek(S, 2, 'role').why).toBe('ATB 차는 중');
  });
});

// 🛡 📜 요청 #35 보스 공격 3종 + 반응 막기
import { canReact, react, telegraphOf } from '../src/board/atb/engine';
describe('ATB 반응 막기 (요청 #35)', () => {
  const tele = (S: State, kind: string, aoe: boolean, to: number[]) => { S.nextAtk = kind as never; S.aoeNext = aoe; S.target = to; S.bossT = T.bossEvery - 3; };
  it('단일 = 탱커가 ATB 없이 ⚡1 로 대신 맞음(절반 · 느려짐 없음) · 같은 공격 둘째는 못 막음', () => {
    const S = fresh(); const tank = S.heroes.find((h) => h.s.role === 'tank')!, tgt = S.heroes.find((h) => h.s.role !== 'tank')!;
    tank.atb = 0; tank.ch = 2; tele(S, 'ice', false, [tgt.id]); expect(telegraphOf(S)?.cls).toBe('single');
    expect(canReact(S, tgt.id)).toBe(false); expect(canReact(S, tank.id)).toBe(true);
    const thp = tgt.hp, khp = tank.hp; expect(useSkill(S, tank.id, 'role')).toBe(true); expect(tank.ch).toBe(1); expect(tank.atb).toBe(0);
    expect(canReact(S, tank.id)).toBe(false);
    for (let i = 0; i < 40; i++) tick(S, 0.1);
    expect(tgt.hp).toBe(thp); expect(tank.hp).toBeLessThan(khp); expect(tank.slowUntil).toBeLessThanOrEqual(S.t - 1);
  });
  it('광역 = 서포터 결계(피해 ×0.7 · 느려짐 없음) + 격려 · 특수 = 딜러 강타로 끊음(안 나감)', () => {
    const S = fresh(); const sup = S.heroes.find((h) => h.s.role === 'support'), dl = S.heroes.find((h) => h.s.role === 'dealer')!;
    if (sup) { sup.ch = 1; tele(S, 'frost', true, S.heroes.map((h) => h.id)); expect(react(S, sup.id)).toBe(true); expect(S.blocked?.how).toBe('barrier'); for (let i = 0; i < 40; i++) tick(S, 0.1); expect(S.heroes.every((h) => h.slowUntil <= S.t)).toBe(true); }
    const S2 = fresh(); const d2 = S2.heroes.find((h) => h.s.role === 'dealer')!; d2.ch = 1; tele(S2, 'fire', true, S2.heroes.map((h) => h.id)); expect(telegraphOf(S2)?.cls).toBe('special');
    const hp0 = S2.heroes.map((h) => h.hp), b0 = S2.bossHp; expect(react(S2, d2.id)).toBe(true); expect(S2.bossHp).toBeLessThan(b0);
    for (let i = 0; i < 40; i++) tick(S2, 0.1); expect(S2.heroes.map((h) => h.hp)).toEqual(hp0); void dl;
  });
});

// 🌈 📜 요청 #36′ 속성 덧효과 8가지 = 장착 · 각성 스킬이 맞을 때만
import { attrFx, fxOfAttr } from '../src/board/atb/tune';
describe('ATB 속성 덧효과 (요청 #36′)', () => {
  const byFx = (fx: string) => HEROES.find((h) => fxOfAttr(String(h.attr)) === fx);
  const solo = (fx: string) => { const hh = byFx(fx)!; const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: [statsOf({ hero: hh.id, lv: 1, enh: 1, tier: 1 }), ...party(['발도르'])], seed: 3 }); S.heroes[0]!.atb = 1; S.heroes[0]!.ch = 4; return S; };
  it('녹스 = 저주 · 리라 = 감전 · 파셀 = 화상 (선생님 대조표)', () => {
    const at = (n: string) => fxOfAttr(String(HEROES.find((h) => h.name === n)?.attr));
    expect(at('녹스')).toBe('curse'); expect(at('파셀')).toBe('burn'); expect(at('로안')).toBe('pierce'); expect(at('루멘')).toBe('bless');
  });
  it('화상 = 3초 피해 30% · 감전 +1 · 얼림 +2 (합쳐 최대 4) · 일반 공격엔 없음', () => {
    const F = solo('burn'); const b0 = F.bossHp; useSkill(F, 0, 'equip'); const hit = b0 - F.bossHp; const b1 = F.bossHp; for (let i = 0; i < 35; i++) tick(F, 0.1);
    expect(b1 - F.bossHp).toBeGreaterThanOrEqual(Math.round(hit * attrFx.burn.pct) - 3);
    if (byFx('shock')) { const K = solo('shock'); K.bossT = 5; useSkill(K, 0, 'equip'); expect(K.bossT).toBe(4); }
    const N = solo('freeze'); N.bossT = 5; useSkill(N, 0, 'equip'); expect(N.bossT).toBe(3); N.heroes[0]!.atb = 1; useSkill(N, 0, 'equip'); N.heroes[0]!.atb = 1; useSkill(N, 0, 'equip'); expect(N.bossT).toBe(1);
    const N2 = solo('freeze'); N2.bossT = 5; attack(N2, 0, 'ok'); expect(N2.bossT).toBe(5);
  });
  it('약점 노출 · 축복 · 순풍 · 저주', () => {
    const W = solo('expose'); useSkill(W, 0, 'equip'); expect(W.exposeNext).toBe(attrFx.expose);
    const M = solo('bless'); M.heroes[1]!.hp = 10; useSkill(M, 0, 'equip'); expect(M.heroes[1]!.hp).toBe(10 + attrFx.bless);
    if (byFx('gust')) { const G = solo('gust'); G.heroes[0]!.atb = 1; useSkill(G, 0, 'equip'); expect(G.heroes[0]!.atb).toBeCloseTo(attrFx.gust, 5); }
    const C = solo('curse'); useSkill(C, 0, 'equip'); expect(C.curseUntil).toBeGreaterThan(C.t);
  });
});

// 👹 📜 요청 #37 보스 분노
import { rage as RAGE, ATK_SPECIAL } from '../src/board/atb/tune';
import { bossEveryOf, calmed, upcomingOf } from '../src/board/atb/engine';
describe('ATB 보스 분노 (요청 #37)', () => {
  it('HP 30% 아래 = 분노 한 번 · 간격 9초(일반) · 들어갈 때 특수 바로(예고 4초) · 피해 ×1.2', () => {
    const S = fresh(); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true }));
    S.bossHp = Math.floor(S.bossMax * 0.3) + 2; const h = S.heroes[0]!; h.atb = 1; attack(S, 0, 'crit');
    expect(S.rage).toBe(true); expect(bossEveryOf(S)).toBe(RAGE.every.normal);
    const sp = upcomingOf(S); expect(ATK_SPECIAL.has(sp) || sp === 'aoe').toBe(true);
    for (let i = 0; i < 2; i++) tick(S, 0.1); expect(S.target).not.toBeNull();
  });
  it('분노 중 팀 퍼펙트 2번 = 8초 진정(공격 안 함) → 다시 분노', () => {
    const S = fresh(); S.rage = true; S.bossT = 5;
    earn(S, 0, { done: true, perfect: true, right: true }); expect(calmed(S)).toBe(false);
    earn(S, 1, { done: true, perfect: true, right: true }); expect(calmed(S)).toBe(true);
    const n0 = S.bossN; for (let i = 0; i < 70; i++) tick(S, 0.1); expect(S.bossN).toBe(n0); expect(calmed(S)).toBe(true);
    for (let i = 0; i < 20; i++) tick(S, 0.1); expect(calmed(S)).toBe(false); expect(S.rage).toBe(true);
  });
});

// 👹 📜 요청 #40 공격 종류별 맞는 그림 + 상태 그림 자리
import { ATK_HIT, atkHitOf, mhitOf } from '../src/ui/manifest';
import { ATK_STATUS, STATUS_ROWS } from '../src/board/atb/tune';
describe('ATB 공격 종류 그림 · 상태 (요청 #40)', () => {
  it('보스 공격 사건 = 종류(kind) 실림 · 느려짐 = 건 공격(slowKind) 기억', () => {
    const S = fresh(); const h = S.heroes[1]!; h.cover = 0; S.nextAtk = 'dark' as never; S.aoeNext = true; S.target = S.heroes.map((x) => x.id); S.bossT = T.bossEvery - 0.05; S.weakUntil = 0;
    for (let i = 0; i < 40 && !S.ev.some((e) => e.k === 'boss'); i++) tick(S, 0.1);
    const e = S.ev.find((x) => x.k === 'boss') as Extract<State['ev'][number], { k: 'boss' }>; expect(e?.kind).toBe('dark');
    expect(S.heroes.some((x) => x.slowKind === 'dark' && x.slowUntil > S.t)).toBe(true);
  });
  it('ATK_HIT = 강타 · 독 · 불 · 얼음 · 채찍 · 빛줄기 · 표에 없으면 보스 짝', () => {
    expect([atkHitOf('smash', 'extra:4'), atkHitOf('poison', 'extra:4'), atkHitOf('fire13', 'extra:4'), atkHitOf('frost', 'extra:4'), atkHitOf('bind', 'extra:4'), atkHitOf('mirror', 'extra:4')]).toEqual(['smash', 'poison', 'fire', 'ice', 'lash', 'beam']);
    for (const k of ['basic', 'aoe', 'scale', 'sleep', 'confuse', 'fog']) { expect(ATK_HIT[k]).toBeUndefined(); expect(atkHitOf(k, 'extra:4')).toBe(mhitOf('extra:4')); }
  });
  it('상태 6가지 = 수면 · 속박 · 혼란 · 물결 · 어둠 · 냉기 (그림 6줄 순서)', () => {
    expect(STATUS_ROWS).toEqual(['sleep', 'bind', 'confuse', 'fog', 'dark', 'frost']);
    expect(new Set(Object.values(ATK_STATUS))).toEqual(new Set(STATUS_ROWS));
  });
});

// 💚 📜 요청 #46 힐 개편
import { healTarget, costOf } from '../src/board/atb/engine';
describe('ATB 힐 개편 (요청 #46)', () => {
  const healer = (S: State) => S.heroes.find((h) => h.s.role === 'healer')!;
  const other = (S: State) => S.heroes.find((h) => h.s.role !== 'healer')!;
  it('🩹 응급 힐 = 힐러 아닌 용사만 · ⚡1 · ATB · 1/3 · 나도 됨 · 다친 사람 없으면 못 씀', () => {
    const S = fresh(); const o = other(S), hl = healer(S); o.atb = 1; o.ch = 1; hl.atb = 1; hl.ch = 1;
    expect(skillList(S, hl.id).some((x) => x.k === 'heal')).toBe(false);
    expect(skillList(S, o.id).find((x) => x.k === 'heal')?.ok).toBe(false); // 다친 사람 없음
    o.hp = 10; expect(useSkill(S, o.id, 'heal', o.id)).toBe(true);
    expect(o.hp).toBe(10 + Math.round(o.s.maxHp / 3)); expect(o.ch).toBe(0); expect(o.atb).toBe(0); expect(o.log.heals).toBe(1);
  });
  it('💚 큰 힐 = 가장 다친 친구 90% · 30% 아래 = 구조 · 보스 공격 사이 제한 없음', () => {
    const S = fresh(); const hl = healer(S), o = other(S); o.hp = Math.floor(o.s.maxHp * 0.2); hl.atb = 1; hl.ch = 2;
    expect(healTarget(S)?.id).toBe(o.id);
    expect(roleAct(S, hl.id)).toBe(true); expect(o.hp).toBe(Math.min(o.s.maxHp, Math.floor(o.s.maxHp * 0.2) + Math.round(o.s.maxHp * 0.9)));
    expect(hl.log.rescues).toBe(1); expect(S.ev.some((e) => e.k === 'role' && e.rescue)).toBe(true);
    o.hp = 5; hl.atb = 1; expect(roleAct(S, hl.id)).toBe(true); // 같은 보스 차례에 또
  });
  it('힐러 일반 공격 맞힘 = 팀 모두 5% · 빗나감 = 없음 · 📜 #101 스킬 1 = 구슬 1 ×1', () => {
    const S = fresh(); const hl = healer(S); for (const h of S.heroes) h.hp = 20; hl.atb = 1;
    attack(S, hl.id, 'ok'); expect(S.heroes.every((h) => h.hp === 20 + Math.round(h.s.maxHp * 0.05))).toBe(true);
    const hp1 = S.heroes.map((h) => h.hp); hl.atb = 1; attack(S, hl.id, 'miss'); expect(S.heroes.map((h) => h.hp)).toEqual(hp1);
    expect(costOf(hl, 'equip')).toBe(1); expect(costOf(other(S), 'equip')).toBe(1); /* 📜 #101 힐러도 스킬 1 = 구슬 1 · ×1 */
    const p = skillPeek(S, hl.id, 'equip'), q = skillPeek(S, other(S).id, 'equip'); expect(p.cost).toBe(1); expect(q.cost).toBe(1);
  });
});

// 🛡 📜 요청 #46 ①② 한 방 상한 60% · 차시 기본 피해
describe('ATB 보스 피해 상한 · 차시 기본 피해 (요청 #46)', () => {
  it('보스 한 번 피해 = 그 용사 최대 체력의 60% 넘지 않음 (광역 · 분노 포함)', () => {
    const S = fresh(); const no = S.boss.no, old = T.bossAtkByNo[no];
    (T.bossAtkByNo as Record<number, number>)[no] = 50; S.rage = true;
    S.nextAtk = 'smash' as never; S.aoeNext = true; S.target = S.heroes.map((h) => h.id); S.bossT = T.bossEvery - 0.05; S.weakUntil = 0;
    for (let i = 0; i < 40 && !S.ev.some((e) => e.k === 'boss'); i++) tick(S, 0.1);
    const e = S.ev.find((x) => x.k === 'boss') as Extract<State['ev'][number], { k: 'boss' }>;
    e.to.forEach((id, i) => expect(e.dmg[i]).toBeLessThanOrEqual(Math.round(S.heroes[id]!.s.maxHp * 0.6)));
    expect(S.heroes.every((h) => !h.down)).toBe(true);
    if (old == null) delete (T.bossAtkByNo as Record<number, number>)[no]; else (T.bossAtkByNo as Record<number, number>)[no] = old;
  });
});

// ⚡ 📜 요청 #49 찍기 막기 = 소문항 틀린 횟수 → 충전 (0번 1 · 1번 ½ · 2번+ 0) · 퍼펙트 +1 · 넘친 ½ 은 모아 1 칸이면 자동
import { subGain } from '../src/board/atb/quiz';
describe('ATB 찍기 막기 (요청 #49)', () => {
  it('한 번에 = +1 · 한 번 틀림 = +½ · 두 번 이상 = 0 · 이미 가진 충전은 안 깎임', () => {
    expect([subGain(0), subGain(1), subGain(2), subGain(5)]).toEqual([1, 0.5, 0, 0]);
    const S = fresh(); const h = S.heroes[0]!; h.ch = 1;
    earn(S, 0, { done: false, perfect: false, right: true, miss: 0 }); expect(h.ch).toBe(2);
    earn(S, 0, { done: false, perfect: false, right: true, miss: 1 }); expect(h.ch).toBe(2.5);
    earn(S, 0, { done: false, perfect: false, right: true, miss: 3 }); expect(h.ch).toBe(2.5);
    earn(S, 0, { done: false, perfect: false, right: false }); expect(h.ch).toBe(2.5);
  });
  it('넘침 = 4 넘을 때 · ½ 두 번 = 자동 스킬 한 번', () => {
    const S = fresh(); const h = S.heroes[0]!; h.ch = 4;
    earn(S, 0, { done: false, perfect: false, right: true, miss: 1 }); expect(h.ch).toBe(4); expect(S.ev.some((e) => e.k === 'skill' && e.auto)).toBe(false);
    earn(S, 0, { done: false, perfect: false, right: true, miss: 1 }); expect(S.ev.filter((e) => e.k === 'skill' && e.auto).length).toBe(1);
  });
});
