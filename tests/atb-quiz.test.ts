// 📝 게시판 던전 ATB 문제 공급 (📜 결정 #5 · #6 · U1 · U3 · U6)
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { checkUpload } from '../src/school/packUpload';
import { answerOf } from '../src/raid/raid';
import { answer, easiestOf, nextOrigin, originsOf, questionsOf, startRun } from '../src/board/atb/quiz';

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
