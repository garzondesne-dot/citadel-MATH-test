// ✔ 개념 체크 (📜 2026-11-15 머리 🔨): 팩 개념 단계 check 검사 · 30초 열기 · 한 번만 답 · 집계(맞힘 · 많이 고른 오답) · 기록 = records … /cc
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { memoryStore } from '../src/store/device';
import type { Room, Step, Store } from '../src/model/types';
import { answerCC, ccOpen, ccRecord, ccStats, closeCC, myCC, openCC, CC_SEC } from '../src/school/cc';

const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: (id: string) => SUBJ.lessons.some((p) => p.id === id) };
const base = () => JSON.parse(fs.readFileSync('tools/pack-upload/example-ex-11.json', 'utf8'));
const errs = (r: ReturnType<typeof checkUpload>) => r.issues.filter((x) => x.lvl === 'err').map((x) => x.msg).join(' ');

describe('✔ 개념 체크', () => {
  it('팩 검사: 개념 단계만 · OX(O/X · true/false) · 선다(보기 번호) · 틀리면 칸 · 이유', () => {
    const P = base(), c = P.steps.findIndex((s: { kind: string }) => s.kind === 'concept');
    P.steps[c].check = { type: 'ox', q: '공집합은 모든 집합의 부분집합이다', a: 'O', why: '∅ 의 원소가 없어서 「모든 원소가 B 에 속함」이 늘 참' };
    const r = checkUpload(JSON.stringify(P), look);
    expect(errs(r)).toBe('');
    expect(r.pack!.steps[c]!.check).toMatchObject({ type: 'ox', a: true });
    P.steps[c].check = { type: 'choice', q: '?', ch: ['가', '나'], a: 5, why: 'w' };
    expect(errs(checkUpload(JSON.stringify(P), look))).toMatch(/범위/);
    const m = P.steps.findIndex((s: { kind: string }) => s.kind === 'monster'); P.steps[c].check = undefined; P.steps[m].check = { type: 'ox', q: 'q', a: true, why: 'w' };
    expect(errs(checkUpload(JSON.stringify(P), look))).toMatch(/개념\(concept\) 단계에만/);
  });
  it('30초 열기 · 한 번만 답 · 집계 · 일찍 닫기 · 기록', () => {
    const S: Store = { ...memoryStore(), kind: 'memory' };
    const step: Step = { kind: 'concept', id: 'c1', title: '개념 1 · 부분집합', check: { type: 'choice', q: '?', ch: ['A', 'B', 'C'], a: 1, why: '왜' } };
    S.set('rooms/K1', { meta: {}, state: { step: 0, stepAt: 0 } });
    const R = () => S.get<Room>('rooms/K1') as Room;
    openCC(S, 'K1', 'c1');
    expect(ccOpen(R(), step, S.now())).toBe(true); expect(ccOpen(R(), step, S.now() + CC_SEC * 1000 + 1)).toBe(false);
    expect(answerCC(S, 'K1', 'a', step, 1)).toBe(true);
    expect(answerCC(S, 'K1', 'a', step, 2)).toBe(true); // 다시 내도 처음 답
    expect(answerCC(S, 'K1', 'b', step, 2)).toBe(false); expect(answerCC(S, 'K1', 'c', step, 2)).toBe(false); expect(answerCC(S, 'K1', 'd', step, 0)).toBe(false);
    expect(ccStats(R(), step)).toEqual({ n: 4, ok: 1, wrong: [{ label: 'C', n: 2 }, { label: 'A', n: 1 }] });
    expect(myCC(R(), step, 'b')).toMatchObject({ ok: false });
    closeCC(S, 'K1', R()); expect(ccOpen(R(), step, S.now() + 1)).toBe(false);
    expect(ccRecord(R(), [step], 'a')).toEqual({ c1: 1 }); expect(ccRecord(R(), [step], 'b')).toEqual({ c1: 0 }); expect(ccRecord(R(), [step], 'z')).toEqual({});
  });
});
