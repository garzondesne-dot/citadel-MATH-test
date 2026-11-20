// 🏹 📈 함수 입력 꼴 (📜 2026-11-20 머리 🔨 · 14차시~): 대응 화살표 잇기(match) · 그래프 고르기(choice · multi 보기 'graph:…')
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { items, bossItem } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';
import { filled, penLine } from '../src/engine/input';
import { answerOf } from '../src/raid/raid';
import { given } from '../src/raid/bots';
import { answerText } from '../src/school/keys';
import { compile, endsOf, graphError, parseGraph, samplePlot } from '../src/subjects/common-math2/graph';
import { pairsOf, togglePair } from '../src/subjects/common-math2/match';
import type { Question } from '../src/model/types';

const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: (id: string) => SUBJ.lessons.some((p) => p.id === id) };
const RAW = fs.readFileSync('tools/pack-upload/example-fn.json', 'utf8');
const errs = (t: string) => checkUpload(t, look).issues.filter((x) => x.lvl === 'err');
const withItem = (it: object) => { const p = JSON.parse(RAW); p.mons.m1.vers = [[it]]; return JSON.stringify(p); };
type M = Extract<Question, { type: 'match' }>;

describe('📈 식 읽기 · 그림 글', () => {
  it('사칙 · 거듭제곱 · 곱 생략 · 절댓값 · √ · 음수 기호', () => {
    const at = (s: string, x: number) => compile(s)(x);
    expect(at('2x-1', 3)).toBe(5); expect(at('2x−1', 3)).toBe(5); expect(at('-x^2', 3)).toBe(-9); expect(at('(x-1)/2', 5)).toBe(2);
    expect(at('3(x+1)', 1)).toBe(6); expect(at('x(x-1)', 4)).toBe(12); expect(at('|x|-2', -5)).toBe(3); expect(at('2|x-1|', -1)).toBe(4);
    expect(at('sqrt(x)', 9)).toBe(3); expect(at('√x', 16)).toBe(4); expect(at('(1/2)x', 6)).toBe(3); expect(at('x^2-3', 2)).toBe(1);
    expect(compile('y^2', 'y')(3)).toBe(9);
    expect(() => compile('2z')).toThrow(); expect(() => compile('(x+1')).toThrow(); expect(() => compile('x+')).toThrow();
  });
  it('그림 글: 여러 그래프 · 창 · 정의역 끝점 · 점선 · 점 · 원', () => {
    const g = parseGraph('y=2x+1;y=(x-1)/2;--y=x');
    expect(g.plots.map((p) => p.kind)).toEqual(['fn', 'fn', 'fn']); expect(g.plots[2]!.dash).toBe(true); expect(g.win).toEqual([-5, 5, -5, 5]);
    const d = parseGraph('y=x^2 [-2,2)@-3,3,-1,5'); expect(d.win).toEqual([-3, 3, -1, 5]);
    const f = d.plots[0] as Extract<typeof d.plots[0], { kind: 'fn' }>;
    expect(f.dom).toEqual({ a: -2, b: 2, ca: true, cb: false }); expect(endsOf(f)).toEqual([{ at: [-2, 4], closed: true }, { at: [2, 4], closed: false }]);
    expect(parseGraph('pts (1,1) (2,3) (3,−5)').plots[0]).toMatchObject({ kind: 'pts', pts: [[1, 1], [2, 3], [3, -5]] });
    expect(parseGraph('circle (0,0) 3').plots[0]).toMatchObject({ kind: 'circle', c: [0, 0], r: 3 });
    const xy = parseGraph('x=y^2').plots[0] as Extract<typeof d.plots[0], { kind: 'fn' }>; expect(xy.v).toBe('y');
    expect(samplePlot(xy, WINS)[0]!.every(([x, y]) => Math.abs(x - y * y) < 1e-9)).toBe(true); // x = y² 위 점
    for (const bad of ['', 'y=', 'z=x', 'y=x [3,1]', 'circle (0,0) -1', 'pts', 'y=x@1,0,0,1']) expect(graphError(bad), bad).not.toBeNull();
  });
  it('끊김: 1/x 은 0 근처에서 두 조각 · √ 은 음수 쪽 없음', () => {
    expect(samplePlot(parseGraph('y=1/x').plots[0] as never, WINS).length).toBe(2);
    const s = samplePlot(parseGraph('y=sqrt(x)').plots[0] as never, WINS); expect(s.length).toBe(1); expect(s[0]!.every(([x]) => x >= 0)).toBe(true);
  });
});
const WINS: [number, number, number, number] = [-5, 5, -5, 5];

describe('🏹 대응 잇기 · 📦 팩 올리기 · 학생과 같은 함수', () => {
  const r = checkUpload(RAW, look), P = r.pack!;
  it('예시 팩 = 통과 · 버전 2 · 문항 꼴', () => {
    expect(r.issues.filter((x) => x.lvl === 'err')).toEqual([]);
    const q = items(P, 'm1', 's', 0)[0] as M;
    expect(q).toMatchObject({ type: 'match', xs: ['1', '2', '3'], ys: ['1', '3', '5', '7'], answer: [[0, 0], [1, 1], [2, 2]], xn: 'X', yn: 'Y' });
    expect((items(P, 'm1', 's', 1)[0] as M).xs).toEqual(['0', '1', '2']); // 🔥 한 판 더 = 대응이 바뀜
    expect((items(P, 'm1', 's', 0)[1] as M).alts).toEqual([[[0, 1], [1, 2], [2, 0]]]);
    expect(items(P, 'm2', 's', 0)[0]!.type).toBe('multi'); expect(String((items(P, 'm2', 's', 1)[0] as { options: string[] }).options[0])).toBe('graph:x=-y^2+2');
    expect(bossItem(P, 's', 0, 0)!.question).toContain('[[graph:');
  });
  it('채점: 순서 무관 · 겹친 화살표 하나로 · 모자람 · 넘침 = 틀림 · 여러 벌 · 빈 답', () => {
    const q = items(P, 'm1', 's', 0)[0]!, q2 = items(P, 'm1', 's', 0)[1]!;
    expect(grade(q, [[2, 2], [0, 0], [1, 1]])).toBe(true);
    expect(grade(q, [[2, 2], [0, 0], [1, 1], [1, 1]])).toBe(true);
    expect(grade(q, [[0, 0], [1, 1]])).toBe(false); expect(grade(q, [[0, 0], [1, 1], [2, 2], [2, 3]])).toBe(false);
    expect(grade(q, [])).toBe(false); expect(grade(q, null)).toBe(false);
    expect(grade(q2, [[0, 1], [1, 0], [2, 2]])).toBe(true); expect(grade(q2, [[0, 1], [1, 2], [2, 0]])).toBe(true); expect(grade(q2, [[0, 0], [1, 1], [2, 2]])).toBe(false);
    expect(grade(q, { 0: [0, 0], 1: { 0: 1, 1: 1 }, 2: [2, 2] } as never)).toBe(true); // 서버(Firebase) 칸 꼴
  });
  it('켜고 끄기 · 내 답 줄 · 정답 · 가상 학생 · 정답 한 줄', () => {
    const q = items(P, 'm1', 's', 0)[0]!;
    let g = togglePair([], 0, 0); g = togglePair(g, 1, 1); g = togglePair(g, 0, 0); expect(g).toEqual([[1, 1]]);
    expect(filled(q, [])).toBe(false); expect(filled(q, [[0, 1]])).toBe(true);
    expect(penLine(q, [[1, 1], [0, 0]], 0)).toBe('(1) 1→1, 2→3');
    expect(grade(q, answerOf(q))).toBe(true); expect(grade(q, given(q, true))).toBe(true); expect(grade(q, given(q, false))).toBe(false);
    expect(answerText(q)).toBe('1→1, 2→3, 3→5');
    expect(pairsOf([[0, 1], [0, 1], [-1, 2], ['a', 1], [2]])).toEqual([[0, 1]]);
  });
  it('그래프 보기: 채점 = 지금 choice · multi 그대로 · 내 답 줄 = 번호 ①', () => {
    const q = items(P, 'm2', 's', 0)[0]!, c = items(P, 'm2', 's', 0)[1]!;
    expect(grade(q, [0, 3])).toBe(true); expect(grade(q, [0])).toBe(false); expect(grade(c, 0)).toBe(true);
    expect(penLine(q, [0, 3], 0)).toBe('(1) ①, ④'); expect(penLine(c, 0, 1)).toBe('(2) ①'); expect(answerText(q)).toBe('①, ④');
    expect(SUBJ.rich!.plain('graph:y=2x+1;--y=x')).toBe('[그래프: y=2x+1, y=x]');
    // 문제 글 안 그림 = 정의역 [a,b] 의 ] 가 있어도 한 조각 · 끝이 ]] ] 여도
    const parts = SUBJ.rich!.parts('[[graph:y=x^2 [-2,2]@-3,3,-1,5]] 위 그래프에서 [[graph:y=x [0,1]]] 끝');
    expect(parts).toEqual([{ fig: { graph: 'y=x^2 [-2,2]@-3,3,-1,5', big: true } }, { text: ' 위 그래프에서 ' }, { fig: { graph: 'y=x [0,1]', big: true } }, { text: ' 끝' }]);
    expect(SUBJ.rich!.plain('[[graph:y=x [0,1]]] 끝')).toBe('[그래프: y=x [0,1]]  끝');
    expect(SUBJ.rich!.parts('[[venn:A|1 2]] 와 [[graph:y=x]]').length).toBe(3);
  });
  it('검사 문구 (선생님이 읽음)', () => {
    const base = { type: 'match', q: '이으시오', x: ['1', '2'], y: ['a', 'b'] };
    const msg = (it: object) => errs(withItem(it)).map((x) => x.msg).join(' / ');
    expect(msg({ ...base, a: '' })).toContain('정답 화살표(a)가 비었어요');
    expect(msg({ ...base, a: '0-5' })).toContain('Y 번호가 범위');
    expect(msg({ ...base, a: '3-0' })).toContain('X 번호가 범위');
    expect(msg({ ...base, a: '0>1' })).toContain('X번-Y번');
    expect(msg({ ...base, a: '0-0,0-0' })).toContain('두 번');
    expect(msg({ ...base, a: '0-0|0-0' })).toContain('같은 벌');
    expect(msg({ ...base, x: ['1'], a: '0-0' })).toContain('2 ~ 7개');
    expect(msg({ ...base, y: ['a', 'a'], a: '0-0' })).toContain('같은 것이 두 번');
    expect(msg({ type: 'match', q: '이으시오', a: '0-0' })).toContain('x · y 원소 배열');
    expect(msg({ type: 'zzz', q: '?' })).toContain('match');
  });
});
