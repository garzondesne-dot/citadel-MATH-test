// ✂ 학습지 PDF 칸 자르기 계산 (정식 prep.js autoRects 옮김 + 베타 다듬음): 글자 줄 → 칸 틀 (가짜 줄 · 실제 PDF 는 tools/e2e/packpdf.cjs)
import { describe, expect, it } from 'vitest';
import { anchorsOf, autoRects, nudge, slotsOf, type Line } from '../src/school/pdfcrop';
import type { Step } from '../src/model/types';

const L = (p: number, x0: number, y: number, s: string, x1 = x0 + 0.3): Line => ({ p, x0, x1, y, h: 0.012, s });
const steps: Step[] = [
  { kind: 'intro', id: 'intro', title: '도입 · 🔁 전시 확인', img: 'review' }, { kind: 'concept', id: 'c1', title: '개념 1 · 대우' }, { kind: 'monster', id: 'm1', title: '문제 1' },
  { kind: 'concept', id: 'c2', title: '개념 2 · 문자' }, { kind: 'monster', id: 'm2', title: '문제 2' }, { kind: 'boss', id: 'boss', title: '형성평가' },
];
const lines: Line[] = [
  L(1, 0.066, 0.147, '🔁전시 확인(지난 시간) ①명제와', 0.447), L(1, 0.498, 0.147, '②r은 q이기 위한 충분조건', 0.899),
  L(1, 0.067, 0.205, '생각 열기 🎢'), L(1, 0.065, 0.24, '어느 놀이공원은'), L(1, 0.067, 0.382, 'STEP 1 대우를 이용한 증명법'), L(1, 0.065, 0.42, '어떤 명제가 참이면'),
  L(1, 0.06, 0.62, '👾몬스터1 거울 웅덩이 두꺼비'), L(1, 0.06, 0.65, '문제 1) 다음 명제의 대우를'), L(1, 0.07, 0.8, '✏ 풀이 · 메모'),
  L(1, 0.52, 0.205, 'STEP 2 수를 문자로'), L(1, 0.52, 0.25, 'k가 자연수일 때'), L(1, 0.52, 0.34, '👾몬스터2 충분 나비'), L(1, 0.52, 0.37, '문제 2) 빈칸을 채워'),
  L(2, 0.52, 0.11, '✔ 11차시 형성평가 (혼자 풀기)'), L(2, 0.52, 0.2, '1. 어떤 명제의 대우가'), L(2, 0.52, 0.56, '맞은 개수 / 5'),
];
describe('✂ PDF 칸 자르기', () => {
  const r = autoRects(lines, slotsOf(steps));
  it('도입 = 전시 확인 가로 전체 · 개념 1 = 생각 열기부터 STEP 1 까지(다음 몬스터 위)', () => {
    expect(r.review![0]).toMatchObject({ p: 1, x: 0.02, w: 0.96 }); expect(r.review![0]!.y).toBeCloseTo(0.139, 3);
    expect(r.c1![0]).toMatchObject({ x: 0.02, w: 0.48 }); expect(r.c1![0]!.y).toBeCloseTo(0.197, 3); expect(r.c1![0]!.y + r.c1![0]!.h).toBeLessThan(0.62);
  });
  it('문제 1 = 「몬스터 1」 줄부터 「✏ 풀이 · 메모」 위까지 · 오른쪽 단 = 개념 2 · 문제 2 · 형성평가 = 맞은 개수까지', () => {
    expect(r.m1![0]!.y).toBeCloseTo(0.612, 3); expect(r.m1![0]!.y + r.m1![0]!.h).toBeLessThan(0.8);
    expect(r.c2![0]).toMatchObject({ x: 0.5, w: 0.48 }); expect(r.m2![0]!.p).toBe(1);
    expect(r.boss![0]!.p).toBe(2); expect(r.boss![0]!.y + r.boss![0]!.h).toBeGreaterThan(0.56);
  });
  it('못 찾은 칸 = null · 팩 find(칸 → 찾을 글자)가 먼저', () => {
    const r2 = autoRects(lines, slotsOf([...steps, { kind: 'concept', id: 'c9', title: '개념 9 · 없는 칸' }]));
    expect(r2.c9).toBeNull();
    const r3 = autoRects(lines, slotsOf(steps, '', { c2: 'k가 자연수일 때' })); expect(r3.c2![0]!.y).toBeGreaterThan(0.23);
  });
  it('조정 = 위 · 아래 늘리고 줄이기 (1.5%씩 · 쪽 밖으로 안 나감)', () => {
    const a = [{ p: 1, x: 0, y: 0.5, w: 1, h: 0.2 }];
    expect(nudge(a, 'top', 1)[0]).toMatchObject({ y: 0.485, h: 0.215 }); expect(nudge(a, 'bottom', -1)[0]!.h).toBeCloseTo(0.185, 4);
    expect(nudge([{ p: 1, x: 0, y: 0.005, w: 1, h: 0.2 }], 'top', 1)[0]!.y).toBe(0);
  });
});

describe('🐞 2026-11-14 개념 칸 제목 「오늘 정리」(이모지 없음) ↔ 학습지 「📝 오늘 정리」', () => {
  it('앞 기호 · 이모지를 건너뛰고 제목 글자로 찾음 · 예전 「^제목」은 못 찾음', () => {
    const a = anchorsOf([{ id: 'recap', kind: 'concept', title: '오늘 정리' }])[0]!;
    expect(a.some((r) => r.test('📝 오늘 정리'))).toBe(true);
    expect(/^\s*오늘\s*정리/.test('📝 오늘 정리')).toBe(false);
    const b = anchorsOf([{ id: 'recap', kind: 'concept', title: '📝 오늘 정리' }])[0]!;
    expect(b.some((r) => r.test('📝 오늘 정리'))).toBe(true);
  });
});
