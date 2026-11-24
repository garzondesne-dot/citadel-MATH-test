// 💚 📜 11/24 선생님 (DECISIONS 6849e1e) 대시보드 「💚 힐 준」 = 수업에서 친구에게 준 ⚡ 풀어 주기 수 (⛓ 묶기는 뺌) · 기록 칸 records/{반}/{번호}/{차시}.hl (규칙 그대로)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { healsGivenAll } from '../src/raid/raid';
import type { Room } from '../src/model/types';
describe('💚 힐 준', () => {
  it('몬스터 칸 · 👑 모두 더함 · ⛓ 묶기 뺌 · 남의 것 안 셈', () => {
    const R = { heals: { m1: { a: { x: 'b', y: 'c' }, b: { z: 'a' } }, boss: { a: { w: 'd', v: '!bind:c' } } } } as unknown as Room;
    expect(healsGivenAll(R, 'a')).toBe(3); expect(healsGivenAll(R, 'b')).toBe(1); expect(healsGivenAll(R, 'q')).toBe(0);
  });
  it('수업 끝 기록 hl · 대시보드 칸 「💚 힐 준」 = 「💡 힌트 준」 옆', () => {
    expect(readFileSync('src/school/records.ts', 'utf8')).toMatch(/const hl = healsGivenAll\(R, uid\); if \(hl\) Object\.assign\(out, \{ hl \}\)/);
    expect(readFileSync('src/school/views.ts', 'utf8')).toMatch(/'💡 힌트 준', '💚 힐 준'/);
  });
});
