// 📈 그래프 글 늘리기 (📜 2026-11-20 머리 🔨 · 기하 단원 대비): 눈금 숫자 · 점 이름 · 선분 · 다각형 · 부등식 영역 · 이동 화살표 · 세로선 · 식=식 곡선
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { items } from '../src/engine/lessons';
import { compile2, contour, describe as say, fillRects, graphError, parseGraph, placeLabels, samplePlot, tickStep } from '../src/subjects/common-math2/graph';

const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: (id: string) => SUBJ.lessons.some((p) => p.id === id) };
const W: [number, number, number, number] = [-5, 5, -5, 5];

describe('📈 새 낱말 읽기', () => {
  it('옛 그림 글은 그대로 (함수 단원 예시 팩 글)', () => {
    for (const s of ['y=2x-1', 'x=y^2', 'circle (0,0) 3', 'y=|x|-2', 'y=2x+1;y=(x-1)/2;--y=x', 'y=x^2 [-2,2]@-3,3,-1,5', 'pts (1,1) (2,3)']) expect(graphError(s), s).toBeNull();
    expect(parseGraph('pts (1,1) (2,3)').plots[0]).toEqual({ kind: 'pts', pts: [[1, 1], [2, 3]], dash: false });
  });
  it('① 눈금 숫자 # · nums (창 뒤 · 창 없이) · 간격 1 · 2 · 5', () => {
    expect(parseGraph('y=x@-5,5,-5,5 #')).toMatchObject({ nums: true, win: [-5, 5, -5, 5] });
    expect(parseGraph('y=x nums')).toMatchObject({ nums: true }); expect(parseGraph('y=x;#').nums).toBe(true); expect(parseGraph('y=x').nums).toBe(false);
    expect([tickStep(-5, 5), tickStep(-10, 10), tickStep(-20, 30), tickStep(0, 100)]).toEqual([1, 2, 5, 10]);
  });
  it('② 점 이름 · ③ 선분 · 다각형(꼭짓점 이름) · ⑤ 화살표', () => {
    expect(parseGraph('pts A(1,2) B(3,4) (0,0)').plots[0]).toEqual({ kind: 'pts', pts: [[1, 2], [3, 4], [0, 0]], names: ['A', 'B', undefined], dash: false });
    expect(parseGraph('seg (0,0) (3,4)').plots[0]).toMatchObject({ kind: 'seg', pts: [{ at: [0, 0] }, { at: [3, 4] }] });
    expect(parseGraph('poly A(0,0) B(4,0) C(0,3)').plots[0]).toMatchObject({ kind: 'poly', pts: [{ at: [0, 0], name: 'A' }, { at: [4, 0], name: 'B' }, { at: [0, 3], name: 'C' }] });
    expect(parseGraph("arrow P(1,1) P'(3,2)").plots[0]).toMatchObject({ kind: 'arrow', pts: [{ name: 'P' }, { name: "P'" }] });
    for (const bad of ['seg (0,0)', 'seg (0,0) (1,1) (2,2)', 'poly (0,0) (1,1)', 'arrow (1,1)', 'pts 1,2', 'seg (0,0) zz']) expect(graphError(bad), bad).not.toBeNull();
  });
  it('④ 부등식 영역 = 맞는 쪽만 색칠 · 경계 실선/점선', () => {
    const g = parseGraph('y>2x-1;y<=x^2;x^2+y^2<4'), [a, b, c] = g.plots as Extract<typeof g.plots[0], { kind: 'ineq' }>[];
    expect([a!.op, b!.op, c!.op]).toEqual(['>', '<=', '<']);
    const inside = (p: typeof a, x: number, y: number) => fillRects(p!, W).some(([rx, ry, w, h]) => x >= rx && x <= rx + w && y >= ry && y <= ry + h);
    expect(inside(a, 0, 3)).toBe(true); expect(inside(a, 3, 0)).toBe(false);
    expect(inside(c, 0, 0)).toBe(true); expect(inside(c, 3, 3)).toBe(false);
    expect(contour(c!.g, W).every(([[x, y]]) => Math.abs(Math.hypot(x, y) - 2) < 0.15)).toBe(true); // 경계 = 반지름 2
    expect(parseGraph('y≥x').plots[0]).toMatchObject({ kind: 'ineq', op: '>=' });
  });
  it('⑥ x=2 세로선 · y=3 가로선 · 식=식 곡선(x²+y²=4)', () => {
    const v = parseGraph('x=2').plots[0] as Extract<ReturnType<typeof parseGraph>['plots'][0], { kind: 'fn' }>;
    expect(v.kind).toBe('fn'); expect(samplePlot(v, W)[0]!.every(([x]) => x === 2)).toBe(true);
    const h = parseGraph('y=3').plots[0] as typeof v; expect(samplePlot(h, W)[0]!.every(([, y]) => y === 3)).toBe(true);
    expect(parseGraph('x^2+y^2=4').plots[0]!.kind).toBe('curve'); expect(parseGraph('x=y').plots[0]!.kind).toBe('fn'); expect(parseGraph('xy=1').plots[0]!.kind).toBe('curve'); // x=y = y 의 식(직선) · xy=1 = 섞인 식
    expect(compile2('2xy+1')(2, 3)).toBe(13);
  });
  it('이름표 자리: 점과 · 서로 · 눈금 숫자와 안 겹침 · 틀 밖으로 안 나감', () => {
    const at: [number, number][] = [[60, 60], [62, 58], [64, 62], [117, 3]];
    const L = placeLabels(at.map((a, k) => ({ at: a, text: 'ABCD'[k]! })), at, [1, 1, 119, 119], 7, [[63, 48, 10, 7]]);
    const box = (l: (typeof L)[0]) => [l.x, l.y - 7 * 0.85, l.text.length * 7 * 0.62 + 1, 7] as const;
    const over = (p: readonly number[], q: readonly number[]) => p[0]! < q[0]! + q[2]! && q[0]! < p[0]! + p[2]! && p[1]! < q[1]! + q[3]! && q[1]! < p[1]! + p[3]!;
    for (let i = 0; i < L.length; i++) { const b = box(L[i]!); expect(b[0]).toBeGreaterThanOrEqual(1); expect(b[0] + b[2]).toBeLessThanOrEqual(119); expect(b[1]).toBeGreaterThanOrEqual(1); for (let j = i + 1; j < L.length; j++) expect(over(b, box(L[j]!)), `${i}-${j}`).toBe(false); }
  });
  it('읽어 주기(aria) = 이름 포함', () => {
    expect(say(parseGraph('poly A(0,0) B(4,0) C(0,3);seg (0,0) (1,1);arrow P(1,1) Q(3,2);y>x;pts A(1,2) #'))).toBe('다각형 ABC, 선분 (0, 0) (1, 1), 이동 화살표 P(1, 1) → Q(3, 2), 영역 y>x, 점 A(1, 2) (눈금 숫자)');
    expect(SUBJ.rich!.plain('graph:poly A(0,0) B(4,0) C(0,3)@-1,5,-1,4 #')).toBe('[그래프: poly A(0,0) B(4,0) C(0,3)]');
  });
});

describe('📦 팩 검사 · 예시 팩', () => {
  const RAW = fs.readFileSync('tools/pack-upload/example-geo.json', 'utf8');
  it('예시 팩 = 통과 · 버전마다 다른 그림', () => {
    const r = checkUpload(RAW, look);
    expect(r.issues.filter((x) => x.lvl === 'err')).toEqual([]);
    const P = r.pack!, v0 = items(P, 'm1', 's', 0), v1 = items(P, 'm1', 's', 1);
    expect(v0[0]!.question).toContain('[[graph:'); expect(v0[0]!.question).not.toBe(v1[0]!.question);
  });
  it('그림 글 오류 = 칸 · 이유 (보기 · 문제 글 안)', () => {
    const withItem = (it: object) => { const p = JSON.parse(RAW); p.mons.m1.vers = [[it]]; return checkUpload(JSON.stringify(p), look).issues.filter((x) => x.lvl === 'err').map((x) => x.msg).join(' / '); };
    expect(withItem({ type: 'choice', q: '고르시오', ch: ['graph:poly (0,0) (1,1)', 'graph:y=x'], a: '0' })).toContain('그래프 그림 글 「poly (0,0) (1,1)」');
    expect(withItem({ type: 'number', q: '[[graph:seg (0,0)]] 길이는?', a: '1' })).toContain('seg');
    expect(withItem({ type: 'number', q: '[[graph:y=x@3,1,0,1]] ?', a: '1' })).toContain('작은 수 먼저');
  });
});
it('곡선 조각 이어 붙이기 = 원 하나는 한 줄(점선이 이어짐)', async () => {
  const { chains, contour, parseGraph } = await import('../src/subjects/common-math2/graph');
  const c = parseGraph('x^2+y^2<4').plots[0] as { g: (x: number, y: number) => number };
  const L = chains(contour(c.g, [-5, 5, -5, 5]));
  expect(L.length).toBe(1); expect(L[0]!.length).toBeGreaterThan(40);
});
