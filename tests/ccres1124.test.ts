// ✔ 📜 11/24 선생님 (DECISIONS 6849e1e · A) 「쌤이 결과를 알 수가 없어」 = 리모컨: 체크가 닫히면 결과 창 한 번 + 그 차시 끝까지 「✔ 체크 결과」 단추 · 종합실 = 「낸 수」만 그대로
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ccStats } from '../src/school/cc';
import type { Room, Step } from '../src/model/types';
describe('✔ 체크 결과 창', () => {
  it('단계마다 맞힘 · 낸 수 · 많이 고른 오답 (닫힌 뒤 · 다른 단계로 넘어간 뒤에도 방 ready 로 다시 셈)', () => {
    const st = { id: 'c1', kind: 'concept', title: 'c', check: { type: 'ox', a: true } } as unknown as Step;
    const R = { ready: { cc_c1: { a: { a: true, ok: true }, b: { a: false, ok: false }, c: { a: false, ok: false } } }, state: { cc: { id: 'c9', at: 0, end: 0 } } } as unknown as Room;
    expect(ccStats(R, st)).toEqual({ n: 3, ok: 1, wrong: [{ label: 'X', n: 2 }] });
  });
  it('리모컨 = 닫힐 때 창 한 번 · 단추 「✔ 체크 결과」 · 종합실 = 낸 수만(맞힘 글자 없음)', () => {
    const tl = readFileSync('src/ui/teacher/TLive.svelte', 'utf8'), tv = readFileSync('src/ui/tv/TV.svelte', 'utf8');
    expect(tl).toMatch(/if \(ccWasOpen && !on && id/); expect(tl).toMatch(/data-k="cc-res-open".*✔ 체크 결과/); expect(tl).toMatch(/data-k="cc-res-sheet"/);
    expect(tv).toMatch(/✔ 개념 체크 · 준비 완료 <b>\{ccStats\(R, step\)\.n\}<\/b>/); expect(tv).not.toMatch(/ccStats\(R, step\)\.ok/);
  });
});
