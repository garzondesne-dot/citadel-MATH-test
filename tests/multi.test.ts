// ☑ 「모두 고르기」(multi) 전수 검사 (📜 2026-11-15 머리 🔨 · 정식 10차시 문제 3 (2) 「모두 틀림」 보고 확인)
//   ① 모든 차시 · 몬스터 · 소레이드 · 형성평가 · 판 0~24 에서 multi 문항 answer 가 비지 않음 · 정답을 고르면 정답 · 하나만 고르면(정답이 둘 이상일 때) 틀림
//   ② 10차시 문제 3 (2) 첫 판 = 교과서 보기 r→p · q→~p · ~q→~r · ~p→r · 정답 ①③ = [0, 2]
//   ③ 숫자 바꾼 판(chain3R): 포함 관계 안 ⊂ 가운데 ⊂ 바깥 을 「세계 4칸」으로 독립 계산 → answer 와 같음
import { describe, expect, it } from 'vitest';
import type { Question } from '../src/model/types';
import { PACKS, packOf } from '../src/engine/packs';
import { bossItem, chainItems, items } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';

const all = (): { where: string; q: Question }[] => {
  const out: { where: string; q: Question }[] = [];
  for (const L of PACKS) {
    for (const mid of Object.keys(L.monsters)) for (let v = 0; v < 25; v++) {
      items(L, mid, `S${v}`, v).forEach((q) => out.push({ where: `${L.id} ${mid} 판${v}`, q }));
      chainItems(L, mid, `S${v}`, v).forEach((q) => out.push({ where: `${L.id} ${mid} 소레이드 판${v}`, q }));
    }
    for (let i = 0; i < 12; i++) for (let a = 0; a < 6; a++) { let q: Question | null = null; try { q = bossItem(L, `S${a}`, i, a); } catch { /* 그 번호 없음 */ } if (q) out.push({ where: `${L.id} 형성평가 ${i} 시도${a}`, q }); }
  }
  return out;
};

describe('☑ 모두 고르기 (multi) 정답 전수', () => {
  const qs = all().filter((x) => x.q.type === 'multi');
  it('multi 문항이 있음', () => expect(qs.length).toBeGreaterThan(0));
  it('answer 빈 배열 0 · 정답 고르면 정답 · 일부만 고르면 틀림', () => {
    const empty = qs.filter((x) => !(x.q as { answer: number[] }).answer?.length).map((x) => x.where);
    expect(empty).toEqual([]);
    for (const { where, q } of qs) {
      const ans = (q as { answer: number[] }).answer;
      expect(grade(q, ans), where).toBe(true);
      if (ans.length > 1) expect(grade(q, [ans[0]!]), where).toBe(false);
    }
  });
  it('10차시 문제 3 (2) 첫 판 = 정답 ①③ [0, 2]', () => {
    const L = packOf('set-10')!, hit = Object.keys(L.monsters).flatMap((mid) => [...items(L, mid, 'X', 0), ...chainItems(L, mid, 'X', 0)]).find((q) => q.type === 'multi' && /참인 명제를 모두/.test(q.question));
    expect(hit).toBeTruthy();
    expect((hit as { options: string[] }).options).toEqual(['r → p', 'q → ~p', '~q → ~r', '~p → r']);
    expect((hit as { answer: number[] }).answer).toEqual([0, 2]);
    expect(grade(hit!, [0, 2])).toBe(true); expect(grade(hit!, [2])).toBe(false); expect(grade(hit!, [0])).toBe(false);
  });
  it('숫자 바꾼 판: 세계 4칸 독립 계산 = answer', () => {
    const chain = qs.filter((x) => /참인 명제를 모두/.test(x.q.question));
    expect(chain.length).toBeGreaterThan(10);
    for (const { where, q } of chain) {
      const order = (q as { check?: { order?: string[] } }).check!.order!; // 안 ⊂ 가운데 ⊂ 바깥 (모두 공집합 아님 · 바깥 ≠ 전체)
      const holds = (x: string, w: number) => w <= order.indexOf(x); // 세계 0 = 안 · 1 = 가운데만 · 2 = 바깥만 · 3 = 밖
      const lit = (s: string, w: number) => (s.startsWith('~') ? !holds(s.slice(1), w) : holds(s, w));
      const want = (q as { options: string[] }).options.map((s, i) => { const [a, b] = s.split(' → ') as [string, string]; return [0, 1, 2, 3].every((w) => !lit(a, w) || lit(b, w)) ? i : -1; }).filter((i) => i >= 0);
      expect((q as { answer: number[] }).answer, where).toEqual(want);
    }
  });
});
