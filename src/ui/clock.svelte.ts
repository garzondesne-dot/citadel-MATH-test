// ⏱ 시계 하나 (5-1 겹침 줄이기): 몬스터 공격 · 정찰 · 남은 시간 · 접속 판정이 모두 이 값 하나를 읽는다
//   두 갈래로만 파생 (#118): ① 수업 시계 raid.classNow = 실제 시각(남은 수업 시간 · 문 닫기 · 집중에도 흐름) ② 게임 시계 raid.gameNow = 집중이면 멈춤(정찰 · 공격 · 생각 · 한 판 더 · 박쥐 · 콤보 · 놀이 · 연출) — 화면이 따로 타이머를 두지 않는다
//   탭마다 setInterval 하나뿐 · 화면은 이 값에 기대는 칸만 다시 그린다(Svelte 가 바뀐 칸만 고침)
export const TICK_MS = 200;
// 🐞 (📜 2026-11-15 「정찰 50초인데 60 · 지금 등장 눌러도 몇 초 뒤」): 화면 시계 = 서버 시각 (기기 시계 + 서버가 알려 준 차)
//   방에 적힌 시각(stepAt · solveEnd · deadline …)은 서버 시각으로 적힘 → 기기마다 시계가 어긋나도 TV · 폰 · 리모컨이 같은 초를 셈
let offset = 0;
export const serverNow = () => Date.now() + offset;
export const clock = $state({ now: Date.now() });
/** 서버 시각 차 (server.ts 가 .info/serverTimeOffset 을 받을 때마다) */
export function setClockOffset(ms: number): void { offset = Number(ms) || 0; clock.now = serverNow(); }
let timer: ReturnType<typeof setInterval> | null = null;
let users = 0;
export function useClock(): () => void {
  users++;
  if (!timer) timer = setInterval(() => { clock.now = serverNow(); }, TICK_MS);
  return () => {
    users--;
    if (users <= 0 && timer) { clearInterval(timer); timer = null; users = 0; }
  };
}
