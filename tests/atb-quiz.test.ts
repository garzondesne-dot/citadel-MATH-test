// 📝 게시판 던전 ATB 문제 공급 (📜 결정 #5 · #6 · U1 · U3 · U6)
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { checkUpload } from '../src/school/packUpload';
import { answerOf } from '../src/raid/raid';
import { answer, canSkip, easiestOf, nextOrigin, originsOf, questionsOf, skip, startRun } from '../src/board/atb/quiz';
import { askHelp, earn, sendHelp } from '../src/board/atb/engine';

const L2 = SUBJ.lessons.find((p) => p.no === 2)!;
const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: () => false };
const L11 = checkUpload(fs.readFileSync('tools/pack-upload/official/set-11.json', 'utf8'), look).pack!;
const bad = (q: { type: string }) => (q.type === 'number' ? -999 : q.type === 'ox' ? null : q.type === 'multi' ? [] : q.type === 'choice' ? 99 : 'zz');

describe('ATB 문제 공급', () => {
  it('원문항 = 몬스터 칸에서 복습 · 보강 뺌 (2차시 m1 ~ m4 · 11차시 m1 ~ m4 · 소레이드 2)', () => {
    expect(originsOf(L2).map((o) => o.mid)).toEqual(['m1', 'm2', 'm3', 'm4']);
    const o11 = originsOf(L11); expect(o11.map((o) => o.mid)).toEqual(['m1', 'm2', 'm3', 'm4']); expect(o11.filter((o) => o.chain).map((o) => o.mid)).toEqual(['m3', 'm4']);
    expect(o11.reduce((a, o) => a + o.n, 0)).toBe(15); // 설정표: 소문항 15개
    expect(easiestOf(originsOf(L2))!.mid).toBe('m2'); // 소문항 가장 적은 칸
  });
  it('소문항 정답 = 다음 칸 (첫 시도 = ○) · 끝까지 = 완주 · 오답 없이 = 퍼펙트 · 채점 ○ × 목록(Y8)', () => {
    let r = startRun('m1', 3); const qs = questionsOf(L2, r, 's');
    let gold = 0, done = false, perfect = false, marks: boolean[] | undefined;
    for (const q of qs) { const o = answer(L2, r, 's', answerOf(q)); r = o.run; gold += o.earn.gold ? 1 : 0; done = o.earn.done; perfect = o.earn.perfect; marks = o.earn.marks; }
    expect([gold, done, perfect]).toEqual([qs.length, true, true]); expect(marks).toEqual(qs.map(() => true));
  });
  it('오답 = 아무것도 안 줌 · 그 문항은 금색 아님 · 4번째 오답 = 새 숫자 판 · 진행도 처음부터', () => {
    let r = startRun('m1', 0); const q0 = questionsOf(L2, r, 's')[0]!;
    let o = answer(L2, r, 's', bad(q0) as never); expect(o.earn.right).toBe(false); r = o.run;
    o = answer(L2, r, 's', answerOf(q0)); expect(o.earn).toMatchObject({ right: true, gold: false }); r = o.run; expect(r.k).toBe(1); expect(r.marks).toEqual([false]);
    const q1 = questionsOf(L2, r, 's')[1]!;
    for (let i = 0; i < 2; i++) { o = answer(L2, r, 's', bad(q1) as never); r = o.run; expect(o.earn.swapped).toBe(false); }
    o = answer(L2, r, 's', bad(q1) as never); expect(o.earn.swapped).toBe(true); expect(o.run).toMatchObject({ ver: 1, k: 0, wrong: 0, clean: false });
    expect(questionsOf(L2, o.run, 's')[0]!.question).not.toBe(q0.question);
  });
  it('소레이드(사슬) = 마지막 단계에서만 완주 (충전은 원문항 통째 · Y1)', () => {
    let r = startRun('m3', 0); const qs = questionsOf(L11, r, 's'); const d: boolean[] = [];
    for (const q of qs) { const o = answer(L11, r, 's', answerOf(q)); r = o.run; d.push(o.earn.done); }
    expect(d.at(-1)).toBe(true); expect(d.slice(0, -1).every((x) => !x)).toBe(true);
  });
  it('다음 원문항 = 덜 푼 것 먼저 · 지정(실드용)이 있으면 그것', () => {
    const os = originsOf(L2); expect(nextOrigin(os, { m1: 1 })!.mid).toBe('m2'); expect(nextOrigin(os, {}, 'm4')!.mid).toBe('m4');
  });
});

// 🔁 📜 요청 #19 덧2 「같은 문제가 계속 나와요」 = 판마다 새 순서 · 새 판(버전) · 이 기기에서 본 판 피함
import { freshRun, pickVer, rngOf, shuffled, type Seen } from '../src/board/atb/quiz';
import { newBot, botStep } from '../src/board/atb/bots';
describe('ATB 문제 반복 없애기 (요청 #19 덧2)', () => {
  it('5판 내리 = 원문항마다 판(버전) 겹침 0 · 원문항 문제 묶음 겹침 0 (모든 차시)', () => {
    for (const L of SUBJ.lessons) {
      const seen: Seen = {}, sets = new Map<string, Set<string>>(), orders: string[] = [];
      for (let run = 0; run < 5; run++) {
        const seed = `me${1 + ((run * 2654 + L.no * 97) % 9999)}`, /* 고정 씨앗 = 흔들림 없음 (전: Math.random → 원문항 3개 차시는 5판 순서가 다 같을 때가 3000번에 2번) */ rnd = rngOf(`${seed}|q`), os = shuffled(originsOf(L), rnd);
        orders.push(os.map((o) => o.mid).join(''));
        for (const o of os) {
          const before = [...(seen[`${L.id}|${o.mid}`] ?? [])], r = freshRun(L, o.mid, seed, seen, [], rnd);
          if (!r.seed) expect(before).not.toContain(r.ver); // 묶음이 겹쳐 판을 넘긴 때만 예외
          const t = JSON.stringify(questionsOf(L, r, seed)), set = sets.get(o.mid) ?? new Set();
          const cap = new Set([1, 2, 3, 4, 5, 6].map((v) => JSON.stringify(questionsOf(L, { mid: o.mid, ver: v }, seed)))).size; // 📜 #53 세트0 뺌 = 작은 pool 은 판이 5개보다 적을 수 있음
          if (set.size < cap) expect(set.has(t), `${L.no}차시 ${o.mid} ${run + 1}판째`).toBe(false); set.add(t); sets.set(o.mid, set);
        }
      }
      if (originsOf(L).length > 2) expect(new Set(orders).size).toBeGreaterThan(1); // 원문항 순서도 판마다 바뀜
    }
  });
  it('7판 다 봤으면 = 가장 오래된 것부터 · 4번째 오답 = 본 판 · 친구 판 피함', () => {
    expect(pickVer([3, 1, 0, 2, 6, 5, 4], [])).toBe(3);
    expect(pickVer([3, 1, 0, 2, 6, 5, 4], [3])).toBe(1);
    expect(pickVer([0, 1, 2, 3, 4], [5])).toBe(6);
    let r = startRun('m1', 0); const qs = questionsOf(L2, r, 's');
    for (let i = 0; i < 4; i++) r = answer(L2, r, 's', bad(qs[0]!), [1, 2]).run;
    expect(r.ver).toBe(3);
  });
  it('친구(봇)끼리 같은 원문항 = 같은 판 동시에 안 나옴', () => {
    const bs = [1, 2, 3].map((w) => newBot(L2, w, 'normal', 7));
    const busy = (mid: string, who: number) => bs.filter((b) => b.who !== who && b.run?.mid === mid).map((b) => b.run!.ver);
    const S = { heroes: [0, 1, 2, 3].map(() => ({ atb: 0, ch: 0, down: false })), t: 999, shieldUp: false, cells: [] } as unknown as Parameters<typeof botStep>[1];
    for (const b of bs) { b.os = b.os.map(() => b.os.find((o) => o.mid === 'm1')!); botStep(L2, S, b, busy); }
    const vs = bs.map((b) => b.run!.ver); expect(new Set(vs).size).toBe(3);
  });
});

// 📦 📜 2026-11-20 선생님 「11차시 = 서버 팩 읽기」 = 같은 차시 번호면 서버 팩 먼저 · 설정표 없는 차시 = 기본 보스 표
import { atbLessons } from '../src/board/atb/lessons';
import { bossOf, BOSSES } from '../src/board/atb/tune';
import { newBattle } from '../src/board/atb/engine';
import { simulate } from '../src/board/atb/bots';
import { statsOf } from '../src/board/atb/heroes';
import { HEROES } from '../src/model/hero';
describe('ATB 차시 목록 = 서버 팩 (선생님 2026-11-20)', () => {
  it('서버 팩 = 같은 번호 앱 팩 대신 · 새 번호(11 · 13) 더함 · 나눈 수업 뺌 · 번호 순', () => {
    const up2 = { ...L2, id: 'ex-2' }, up13 = { ...L11, id: 'ex-13', no: 13 };
    const ls = atbLessons([L2, up2, L11, up13, { ...L2, id: 'x@3', no: 3, partOf: L2.id }], new Set(['ex-2', 'ex-13']));
    expect(ls.map((p) => `${p.no}:${p.id}`)).toEqual([`2:ex-2`, `11:${L11.id}`, '13:ex-13']);
  });
  it('설정표 없는 차시 = 기본 보스 표(초안) · 있는 차시 = 그대로', () => {
    const L15 = { ...L11, id: 'ex-18', no: 18 }, party = ['로안', '발도르', '루멘', '누아'].map((n) => statsOf({ hero: HEROES.find((h) => h.name === n)!.id, lv: 1, enh: 1, tier: 1, name: n }));
    for (let seed = 1; seed <= 3; seed++) { const S = newBattle({ boss: bossOf(18), diff: 'normal', party, seed }); simulate(L15, S, S.heroes.map((_, i) => newBot(L15, i, 'normal', seed))); expect(S.end).not.toBeNull(); }
    expect(bossOf(2)).toBe(BOSSES[2]); const b = bossOf(18); expect(b.no).toBe(18); expect(b.draft).toBe(true); expect(b.cycle.length).toBe(3); expect(new Set(b.weak).size).toBe(2);
  });
});

// 📄 📜 요청 #24 덧붙임 = 학습지 번호 표기
import { sheetNo, sheetTitle } from '../src/board/atb/quiz';
describe('ATB 학습지 번호 (요청 #24 덧붙임)', () => {
  it('제목 = 「n차시 학습지 · 문제 k (소문항) · i/전체」 · 숫자 바뀐 판도 같은 번호 · 소레이드 = 졸개 · 대장', () => {
    expect(sheetTitle(L2, 'm3', 1, 3)).toBe('2차시 학습지 · 문제 3 (2) · 2/3');
    const L8 = SUBJ.lessons.find((p) => p.no === 8)!; expect(sheetNo(L8, 'm1').no).toBe('1·2');
    const L6 = SUBJ.lessons.find((p) => p.no === 6)!; expect(sheetTitle(L6, 'u4', 3, 4)).toBe('6차시 학습지 · 문제 4 (대장) · 4/4'); expect(sheetTitle(L6, 'u4', 0, 4)).toMatch(/졸개 1/);
  });
  it('학습지 번호 없는 칸 = 「n차시 · 문제 k」 (목록: 앱 팩 2 ~ 10)', () => {
    const miss = SUBJ.lessons.flatMap((L) => originsOf(L).filter((o) => !sheetNo(L, o.mid).sheet).map((o) => `${L.no}:${o.mid}`));
    expect(miss).toEqual([]); // 4차시 「📖 복습」 칸 = 원문항에서 빠짐(이모지 앞머리도 복습 · 보강으로 봄)
    const L4 = SUBJ.lessons.find((p) => p.no === 4)!; expect(originsOf(L4).map((o) => o.mid)).toEqual(['m1', 'm2', 'm3']);
    const fake = { ...L4, steps: L4.steps.map((st) => (st.id === 'm2' ? { ...st, title: '집합 놀이' } : st)) }; expect(sheetTitle(fake, 'm2', 0, 2)).toBe('4차시 · 문제 2 (1) · 1/2');
  });
});

// ⭐ 📜 요청 #29 = 결과 별은 차시 정복 지도와 같은 규칙 (board gradeOf · goals STAR)
import { gradeOf } from '../src/board/board';
import { STAR } from '../src/board/goals';
describe('ATB 결과 별 = 지도 별 규칙 그대로 (요청 #29)', () => {
  it('틀림 + 안 푼 비율 ≤10% ⭐3 · ≤25% ⭐2 · ≤50% ⭐1 · 그 밖 0', () => {
    const st = (bad: number, none: number, total = 20) => STAR[gradeOf({ bad, none, total })] ?? 0;
    expect([st(2, 0), st(3, 2), st(5, 5), st(6, 6)]).toEqual([3, 2, 1, 0]);
  });
});

// ⚡ 📜 요청 #49 소문항 틀린 횟수 = 답에 실림 · 소문항마다 얻은 충전(gains)
import { answer as ans49, startRun as start49, questionsOf as qs49 } from '../src/board/atb/quiz';
import { answerOf as ao49 } from '../src/raid/raid';
import { wrongOf as wo49 } from '../src/board/atb/bots';
describe('ATB 찍기 막기 · 문제 쪽 (요청 #49)', () => {
  it('틀린 횟수 = 소문항마다 · 맞히면 0 으로 · gains = 1 · ½ · 0', () => {
    const L = SUBJ.lessons.find((p) => p.no === 2)!, mid = Object.keys(L.monsters).find((m) => (qs49(L, start49(m, 0), 's').length ?? 0) >= 3)!;
    let r = start49(mid, 0); const q = () => qs49(L, r, 's')[r.k]!;
    let o = ans49(L, r, 's', ao49(q())); expect(o.earn.miss).toBe(0); r = o.run;
    o = ans49(L, r, 's', wo49(q())); r = o.run; o = ans49(L, r, 's', ao49(q())); expect(o.earn.miss).toBe(1); r = o.run;
    o = ans49(L, r, 's', wo49(q())); r = o.run; o = ans49(L, r, 's', wo49(q())); r = o.run; o = ans49(L, r, 's', ao49(q())); expect(o.earn.miss).toBe(2); r = o.run;
    expect(r.gains?.slice(0, 3)).toEqual([1, 0.5, 0]);
  });
});

// 🚫 📜 요청 #53 세트0 빼기 = 판 100번 돌려 세트0(판 0 문항) 0번 · 세트0 만 있는 원문항 뺌
import { set0Only as s0only, variantOf as varOf, normVer as nv } from '../src/board/atb/quiz';
import { items as itemsOf, chainItems as chainOf } from '../src/engine/lessons';
describe('ATB 세트0 빼기 (요청 #53)', () => {
  it('모든 차시 · 판 100번 = 세트0 문항 0번 · 4번째 오답 새 판도 1 ~ 6', () => {
    for (const L of SUBJ.lessons) for (const o of originsOf(L)) {
      const set0 = JSON.stringify(L.monsters[o.mid]!.chain ? chainOf(L, o.mid, 's', 0) : itemsOf(L, o.mid, 's', 0)), seen: Seen = {};
      expect(s0only(L, o.mid)).toBe(false);
      for (let i = 0; i < 100; i++) { const r = freshRun(L, o.mid, 's', seen, [], rngOf(`r${i}`)); expect(r.ver).toBeGreaterThanOrEqual(1); expect(varOf(L, o.mid, r.ver)).toBeGreaterThan(0); const t = JSON.stringify(questionsOf(L, { mid: o.mid, ver: r.ver }, 's')); if (L.monsters[o.mid]!.first || 'pool' in (L.monsters[o.mid]!.chain ?? {}) || !('gen' in L.monsters[o.mid]!.retry)) expect(t, `${L.no}차시 ${o.mid}`).not.toBe(set0); }
    }
    expect([nv(0), nv(7), nv(-1), nv(6)]).toEqual([6, 1, 5, 6]);
  });
});
describe('⏭ #123 넘기기', () => {
  it('같은 소문항 3번 틀림 = 넘기기 가능 · 넘김 = 다음 소문항 · 맞힘 아님 · 충전 0 · 원문항 끝이면 done', () => {
    let r = startRun('m1', 0); const q0 = questionsOf(L2, r, 's1')[0]!;
    expect(canSkip(r)).toBe(false);
    for (let i = 0; i < 3; i++) r = answer(L2, r, 's1', bad(q0)).run;
    expect(canSkip(r)).toBe(true); expect(r.k).toBe(0);
    const n = questionsOf(L2, r, 's1').length, o = skip(L2, r, 's1');
    expect(o.earn).toMatchObject({ skip: true, right: false, gold: false, perfect: false, done: n === 1 });
    if (n > 1) { expect(o.run.k).toBe(1); expect(o.run.subMiss).toBe(0); expect(canSkip(o.run)).toBe(false); }
  });
  it('엔진: 넘김 = 충전 0 · skips 1 · 도와줘 기다림 취소 · 구조 성공 안 셈', () => {
    const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: [statsOf({ hero: 1, lv: 1, enh: 0, tier: 1 }), statsOf({ hero: 2, lv: 1, enh: 0, tier: 1 })], seed: 3 });
    S.heroes[1]!.gd = true; askHelp(S, 0); sendHelp(S, 1, 0); const ch0 = S.heroes[0]!.ch;
    earn(S, 0, { done: false, perfect: false, right: false, skip: true });
    expect(S.heroes[0]!.ch).toBe(ch0); expect(S.heroes[0]!.log.skips).toBe(1); expect(S.asks?.[0]).toBeUndefined(); expect(S.heroes[1]!.log.aids ?? 0).toBe(0);
  });
});
