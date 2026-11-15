// 💡 도움 3단 · 🔎 익명 풀이 팩 칸 (📜 2026-11-15 머리 🔨): 검사기가 help · review 를 읽음 · 틀리면 칸 · 이유 · helpOf = 첫 판 그대로 · 숫자 바뀐 판 = 개념 · 예제만 · 형성평가 없음
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { chainItems, items } from '../src/engine/lessons';
import { helpOf, handsOf, reviewsOf } from '../src/school/help';
import type { Question, Room } from '../src/model/types';

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
    expect(reviewsOf(r.pack!, 'm1')).toEqual([{ i: 0, k: 0, r: it0.review[0] }]); // 🔎 리모컨 단추 목록
    expect(reviewsOf(r.pack!, 'm2')).toEqual([]);
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

describe('🧩 13차시 덧칸 꼴 (몬스터 칸 help · review · 단계 check) = 운영 팩 + addons-13 합친 파일', () => {
  const raw = fs.readFileSync('docs/handoff/pack13/ex-13-with-addons.json', 'utf8');
  it('검사 통과 · first = 첫 출제 판만(소문항마다) · 숫자 바뀐 판 = 숨김 · 익명 풀이 focus 1부터 · 개념 체크 O/X · 선다 "0"', () => {
    const r = checkUpload(raw, look);
    expect(r.issues.filter((x) => x.lvl === 'err').map((x) => `${x.at} ${x.msg}`)).toEqual([]);
    const P = r.pack!, m1 = P.monsters.m1!;
    expect(Array.isArray(m1.help?.first)).toBe(true);
    const q0 = items(P, 'm1', 's', 0);
    q0.forEach((q, i) => { const h = helpOf(P, 'm1', i, q)!; expect(h.concept).toBeTruthy(); expect(h.first).toBe((m1.help!.first as string[])[i]); });
    const q1 = items(P, 'm1', 's', 1)[0];
    if (q1 && q1.question !== q0[0]!.question) expect(helpOf(P, 'm1', 0, q1)!.first).toBeUndefined();
    const rv = reviewsOf(P, 'm1'); expect(rv[0]!.i).toBe(-1); expect(rv[0]!.r.focus).toBe(3); expect(rv[0]!.r.lines.length).toBeGreaterThanOrEqual(3);
    expect(P.steps.find((s) => s.id === 'c1')!.check).toMatchObject({ type: 'ox', a: false });
    expect(P.steps.find((s) => s.id === 'c3')!.check).toMatchObject({ type: 'choice', a: 0 });
  });
});

describe('🧩 12차시 덧칸 = 꼴별 도움 (📜 2026-11-16 · helps[문항 kind] → help · first = 첫 판만 · 소레이드 = 한 꼴)', () => {
  const raw = fs.readFileSync('docs/handoff/pack12/ex-12-with-addons.json', 'utf8');
  const r = checkUpload(raw, look), P = r.pack!;
  it('검사 통과 · 꼴 경고 없음(helps 꼴이 모두 문항 꼴에 있음)', () => {
    expect(r.issues.filter((x) => x.lvl === 'err').map((x) => `${x.at} ${x.msg}`)).toEqual([]);
    expect(r.issues.filter((x) => /꼴 「/.test(x.msg)).map((x) => x.msg)).toEqual([]);
  });
  it('m1 첫 판 = 소문항 꼴의 개념 · 예제 + help.first[소문항] / 숫자 바뀐 판 = 그 꼴 개념 · first 숨김', () => {
    const m = P.monsters.m1!, q0 = items(P, 'm1', 's', 0);
    expect(q0.map((q) => q.kind)).toEqual(['루트', '소수', '부등식']);
    q0.forEach((q, i) => { const h = helpOf(P, 'm1', i, q)!; expect(h.concept).toBe(m.helps![q.kind!]!.concept); expect(h.first).toBe((m.help!.first as string[])[i]); expect(h.example!.q).toBe(m.helps![q.kind!]!.example!.q); });
    const pool = (m.retry as { pool: Question[][] }).pool.flat(), q8 = pool.find((q) => q.kind === '인원')!, q4 = pool.find((q) => q.kind === '홀짝')!;
    expect(helpOf(P, 'm1', 0, q8)).toMatchObject({ concept: m.helps!['인원']!.concept }); expect(helpOf(P, 'm1', 0, q8)!.first).toBeUndefined();
    expect(helpOf(P, 'm1', 2, q4)!.concept).toBe(m.helps!['홀짝']!.concept);
  });
  it('m2 = 꼴 없음 → 몬스터 help · m3 소레이드 = 첫 판 덧셈 · 곱 꼴 판 = 곱 개념', () => {
    const m2 = items(P, 'm2', 's', 0); expect(helpOf(P, 'm2', 1, m2[1])!.concept).toBe(P.monsters.m2!.help!.concept);
    const c0 = chainItems(P, 'm3', 's', 0), c1 = chainItems(P, 'm3', 's', 1);
    expect(c0.every((q) => q.kind === '덧셈')).toBe(true); expect(c1.every((q) => q.kind === '곱')).toBe(true);
    expect(helpOf(P, 'm3', 1, c1[1])!.concept).toBe(P.monsters.m3!.helps!['곱']!.concept);
    expect(helpOf(P, 'm3', 0, c0[0])!.concept).toBe(P.monsters.m3!.helps!['덧셈']!.concept);
  });
  it('검사기: helps 꼴이 문항 꼴에 없으면 ⚠(오류 아님)', () => {
    const J = JSON.parse(raw); J.monsters.m1.helps['없는꼴'] = { concept: 'x' };
    const r2 = checkUpload(JSON.stringify(J), look);
    expect(r2.issues.filter((x) => x.lvl === 'err')).toEqual([]);
    expect(r2.issues.some((x) => x.lvl === 'ask' && /없는꼴/.test(x.msg))).toBe(true);
  });
});
