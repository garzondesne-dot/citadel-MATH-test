// 채점표 「문제 짧게」 (#113 · #116): 묻는 부분만
import { expect, it } from 'vitest';
import { boss1 } from '../src/gens/set06';
import { shortQ } from '../src/ui/q/short';

it('6차시 형성평가 6문항 → 짧게', () => {
  expect(boss1().map(shortQ)).toEqual(['(A ∪ B)ᶜ = Aᶜ ( ) Bᶜ', 'n(Aᶜ) = ?', 'n(A ∩ B)', 'A − B', '전체집합 U = {1, 2, 3, 4, 5}의 부분집합 중에서 집합 A = {1, 2, 4}와 서로소인 집합을 모두 고르시오.', 'n(Aᶜ ∩ Bᶜ)']);
});
