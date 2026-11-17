// 🏰 #53 성채 서술형 7방 = 소레이드 (설계 #5 castle-chain.json · 선생님 컨펌 6개) — 올릴 팩 파일 · 체험판 1층이 검사기를 통과하고 단계 · 근거 줄 · 카드가 살아 있나
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCastle } from '../src/school/castle';
import R from '../src/subjects/common-math2/rubrics.json';
const P = (f: string) => JSON.parse(readFileSync(new URL(`../tools/pack-upload/castle/${f}.json`, import.meta.url), 'utf8'));
const WANT: Record<string, Record<string, number>> = { 'eval-1': { q07: 4, q11: 4 }, 'eval-2': { q07: 5, q10: 5 }, 'eval-3': { q15: 4, q16: 4, q17: 5 } };
describe('🏰 #53 성채 서술형 소레이드', () => {
  for (const f of Object.keys(WANT)) it(`${f} 팩 = 검사기 통과 · 서술형 방 소레이드 · 단계 수 · 판 7 · 💡 근거 줄 · 카드`, () => {
    const c = checkCastle(P(f), { sheet: () => true });
    expect(c.issues.filter((i) => i.lvl === 'err')).toEqual([]);
    for (const [rid, n] of Object.entries(WANT[f]!)) {
      const r = c.pack!.rooms.find((x) => x.id === rid)!;
      expect(r.chain && r.photo, rid).toBe(true);
      expect(r.vers.length, rid).toBe(7);
      for (const v of r.vers) expect(v.length, rid).toBe(n);
      expect(r.vers[0]!.some((q) => !!(q as { why?: unknown }).why), `${rid} 💡`).toBe(true);
      expect(r.card, rid).toBe(`⚔ 소레이드 · ${n}단계 · 📷 서술형`);
    }
  });
  it('체험판 1층 07 · 11 = 올릴 1층 팩과 같은 방', () => {
    const T = JSON.parse(readFileSync(new URL('../src/subjects/common-math2/trial/castle-1.json', import.meta.url), 'utf8')), E = P('eval-1');
    for (const id of ['q07', 'q11']) expect(T.rooms.find((x: { id: string }) => x.id === id)).toEqual(E.rooms.find((x: { id: string }) => x.id === id));
  });
  it('기준표 ask = 2층 07 · 10 · 3층 15 에도 (채점에 넣는 문제 글)', () => {
    const r = R as unknown as Record<string, Record<string, { ask?: string }>>;
    for (const [f, id] of [['eval-2', 'q07'], ['eval-2', 'q10'], ['eval-3', 'q15']] as const) expect(r[f]![id]!.ask, `${f} ${id}`).toMatch(/^\d\d /);
  });
});
