// 📈 #58 기호 톡 함수 줄 13 · 47줄 → 찜할 카드 · 찜 수 = 카드 하나로 셈
import { describe, expect, it } from 'vitest';
import { SUBJ } from '../src/engine/subject';

const T = SUBJ.symtalk!, C = SUBJ.cards!;
const ids = (t: string, func = true) => T.segments(t, { prop: true, func }).filter((s) => s.id).map((s) => `${s.text}=${s.id}`);
describe('기호 톡 함수 줄', () => {
  it('14차시부터만 켜짐 (성채 · 13차시 = 꺼짐)', () => {
    expect(T.funcOn!({ id: 'x', no: 14 })).toBe(true);
    expect(T.funcOn!({ id: 'x', no: 13 })).toBe(false);
    expect(T.funcOn!({ id: 'eval-4', no: 17 })).toBe(false);
  });
  it('긴 낱말 먼저 · f(x) 는 합성 · 역함수 일부가 아닐 때만 · 「함수」 한 낱말은 줄 아님', () => {
    expect(ids('함수 f : X → Y 의 정의역과 치역을 구하시오.')).toEqual(['f : X → Y=fmap', '정의역=domain', '치역=range']);
    expect(ids('일대일대응인 함수 f 에 대하여 f⁻¹(3) 의 값')).toEqual(['일대일대응=bij', 'f⁻¹=inverse']);
    expect(ids('(g∘f)(2) 의 값을 구하시오.')).toEqual(['g∘f=compose']);
    expect(ids('f(x) = 2x + 1 일 때 f(3)')).toEqual(['f(=fval', 'f(=fval']);
    expect(ids('직선 y = x 에 대하여 대칭')).toEqual(['직선 y = x=yx']);
    expect(ids('일대일함수이고 항등함수, 상수함수')).toEqual(['일대일함수=inj', '항등함수=ident', '상수함수=const']);
    expect(ids('f(x) = 2x + 1', false)).toEqual([]);
  });
  it('47줄 모두 찜할 카드가 있음 (모루에 있는 카드)', () => {
    const rows = Object.keys(C.bySym);
    expect(rows.length).toBeGreaterThanOrEqual(47);
    for (const r of rows) expect(SUBJ.forge!.unit.card(C.bySym[r]!.id), r).toBeTruthy();
    for (const r of ['bij', 'inverse', 'compose', 'fval', 'domain', 'range', 'yx', 'graph', 'fmap']) expect(C.bySym[r], r).toBeTruthy();
  });
  it('찜 수 = 아직 안 만든 카드 수 (같은 카드 줄 여럿 = 1 · 두 단원 합)', () => {
    expect(C.wishLeft({ in: true, bij: true }, {})).toBe(2);
    expect(C.wishLeft({ in: true, bij: true }, { bij: true })).toBe(1);
  });
});
