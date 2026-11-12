// ⏱ 시계 하나 (5-1 겹침 줄이기): 몬스터 공격 · 정찰 · 남은 시간 · 접속 판정이 모두 이 값 하나를 읽는다
//   두 갈래로만 파생 (#118): ① 수업 시계 raid.classNow = 실제 시각(남은 수업 시간 · 문 닫기 · 집중에도 흐름) ② 게임 시계 raid.gameNow = 집중이면 멈춤 — 화면이 따로 타이머를 두지 않는다
//   탭마다 setInterval 하나뿐 · 화면은 이 값에 기대는 칸만 다시 그린다(Svelte 가 바뀐 칸만 고침)
export const TICK_MS = 200;
export const clock = $state({ now: Date.now() });
let timer: ReturnType<typeof setInterval> | null = null;
let users = 0;
export function useClock(): () => void {
  users++;
  if (!timer) timer = setInterval(() => { clock.now = Date.now(); }, TICK_MS);
  return () => {
    users--;
    if (users <= 0 && timer) { clearInterval(timer); timer = null; users = 0; }
  };
}
