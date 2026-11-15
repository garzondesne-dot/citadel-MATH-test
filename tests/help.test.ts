// 💡 도움 3단 · 🔎 익명 풀이 팩 칸 (📜 2026-11-15 머리 🔨): 검사기가 help · review 를 읽음 · 틀리면 칸 · 이유 · helpOf = 첫 판 그대로 · 숫자 바뀐 판 = 개념 · 예제만 · 형성평가 없음
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { items } from '../src/engine/lessons';
import { helpOf, handsOf } from '../src/school/help';
import type { Room } from '../src/model/types';

const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: (id: string) => SUBJ.lessons.some((p) => p.id === id) };
const base = () => JSON.parse(fs.readFileSync('tools/pack-upload/example-ex-11.json', 'utf8'));
const firstItem = (P: ReturnType<typeof base>) => { const m = P.mons.m1; return (m.vers ? m.vers[0] : m.first)[0]; };
const errs = (r: ReturnType<typeof checkUpload>) => r.issues.filter((x) => x.lvl === 'err').map((x) => x.msg);

describe('💡 도움 3단 · 🔎 익명 풀이 팩 칸', () => {
  it('help · review 가 있는 팩 = 통과 · 문항에 그대로 붙음', () => {
    const P = base(), it0 = firstItem(P);
    it0.help = { concept: '집합의 원소를 빠짐없이 나열해요', first: 'A = { 1, 2, □ }', example: { q: 'B = { x | x 는 4 이하 자연수 }', sol: 'B = { 1, 2, 3, 4 }' } };
    it0.review = [{ lines: ['A = {1, 2}', 'B = {2, 3}', 'A ∪ B = {1, 2, 2, 3}'], focus: 2, ask: '같은 원소를 두 번 써도 될까요?', wrong: true }];
    const r = checkUpload(JSON.stringify(P), look);
    expect(errs(r)).toEqual([]);
    const q = items(r.pack!, 'm1', 's', 0)[0]!;
    expect(q.help?.concept).toContain('나열');
    expect(q.review?.[0]).toMatchObject({ focus: 2, wrong: true });
    expect(helpOf(r.pack!, 'm1', 0, q)).toEqual(q.help);
    // 숫자 바뀐 판(생성기 · help 없음) = 첫 판 개념 · 예제만 · 첫 줄(first)은 숨김
    const q1 = items(r.pack!, 'm1', 's', 1)[0]!;
    const h1 = helpOf(r.pack!, 'm1', 0, { ...q1, help: undefined });
    expect(h1).toEqual({ concept: it0.help.concept, example: it0.help.example });
    expect(helpOf(r.pack!, 'boss', 0, q)).toBeNull(); // 👑 형성평가 = 도움 3단 안 엶
  });
  it('틀린 help · review = 칸 · 이유', () => {
    const P = base(), it0 = firstItem(P);
    it0.help = { first: '빈칸' };
    expect(errs(checkUpload(JSON.stringify(P), look)).join(' ')).toMatch(/concept/);
    it0.help = { concept: '개념', example: { q: '예제' } };
    expect(errs(checkUpload(JSON.stringify(P), look)).join(' ')).toMatch(/예제/);
    delete it0.help; it0.review = [{ lines: ['한 줄'], focus: 3 }];
    expect(errs(checkUpload(JSON.stringify(P), look)).join(' ')).toMatch(/살펴볼 줄/);
  });
  it('✋ 손든 학생 = 그 몬스터만', () => {
    const R = { players: { a: { hand: { mid: 'm1', at: 1 } }, b: { hand: { mid: 'm2', at: 1 } }, c: {} } } as unknown as Room;
    expect(handsOf(R, 'm1')).toEqual(['a']);
  });
});
