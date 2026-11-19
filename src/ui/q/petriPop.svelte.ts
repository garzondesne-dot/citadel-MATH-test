// 🗿 석화 중에 맞힘 = 학생 폰 토스트 「🗿 💎 +n (캠프에서 받기)」 (📜 2026-11-19 선생님 · b228) — petriAward 가 돌려준 값 > 0 일 때만
//   문제 화면(ChainView · MonsterForm · BossForm · BossCard)이 petriAward 대신 이것을 부름 · 그리기 = Student.svelte 한 곳
import type { Store } from '../../model/types';
import { petriAward } from '../../raid/actions';
export const petriToast = $state<{ msg: string; at: number }>({ msg: '', at: 0 });
let timer: ReturnType<typeof setTimeout> | null = null;
export function showPetri(n: number): void {
  if (!(n > 0)) return;
  petriToast.msg = `🗿 💎 +${n} (캠프에서 받기)`; petriToast.at = Date.now();
  if (timer) clearTimeout(timer); timer = setTimeout(() => { petriToast.msg = ''; }, 2500);
}
export function petriPop(S: Store, code: string, me: string, mid: string, n: number): number {
  const g = petriAward(S, code, me, mid, n); showPetri(g); return g;
}
