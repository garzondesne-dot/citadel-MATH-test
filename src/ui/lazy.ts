// 📦 화면 묶음 나누기 (📜 2026-11-16 머리 「로딩 줄이기 = 엔진 묶음 나누기」): 학생 첫 화면(로그인 · 캠프 · 수업)에 안 쓰는 큰 화면은 따로 받음
//   교사 폰(리모컨) · 교실 TV(종합실) · 공격 갤러리 = 그 주소로 열 때만 · main.ts 가 화면을 띄우기 전에 그 묶음을 먼저 받아 둠(첫 화면 = 로딩 용사 그대로 · 빈 화면 없음)
//   같은 약속(promise)을 다시 쓰니 App.svelte 의 {#await} 는 바로 풀림
const once = <T>(f: () => Promise<T>) => { let p: Promise<T> | null = null; return () => (p ??= f()); };
export const loadTeacher = once(() => import('./teacher/TeacherApp.svelte'));
export const loadHall = once(() => import('./Hall.svelte'));
export const loadAtk = once(() => import('./AtkGallery.svelte'));
// 🏕 캠프 · 수업 화면에서 여는 큰 화면 (허수아비 · 게시판 · 성채 · 쉼터 놀이) = 따로 받되 화면이 뜬 뒤 쉬는 틈에 미리 받아 둠 → 누를 때 · 쉼터가 열릴 때 멈칫 없음
export const loadDummy = once(() => import('./dummy/Dummy.svelte'));
export const loadPrep = once(() => import('./dummy/Prep.svelte')); // 📖 #66 배움터 · 예습
export const loadBoard = once(() => import('./board/Board.svelte'));
export const loadCastle = once(() => import('./castle/Castle.svelte'));
export const loadQuest = once(() => import('./quest/QuestDesk.svelte')); // ✏ #75 출제 공방
export const loadFunPhone = once(() => import('./rest/FunPhone.svelte'));
/** 학생 화면(로그인 · 캠프 · 수업)이 뜬 뒤 한 번: 쉬는 틈에 위 묶음을 미리 받음 */
export function prefetchStudent(): void {
  const go = () => { void loadFunPhone().catch(() => null); void loadDummy().catch(() => null); void loadPrep().catch(() => null); void loadBoard().catch(() => null); void loadCastle().catch(() => null); };
  const w = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1500);
}
/** 그 주소(role)에 필요한 큰 화면 묶음 (없으면 바로) */
export function preloadRole(role: string | null): Promise<unknown> {
  if (role === 'teacher') return loadTeacher();
  if (role === 'hall') return loadHall();
  if (role === 'atk') return loadAtk();
  return Promise.resolve();
}
