// 👩‍🏫 체험판 (📜 2026-11-17 #33 · CLAUDE.md 「계정 · 저장 = 이 탭 메모리에만 · 닫으면 사라짐 · 서버에 안 닿음」)
//   main.ts 가 맨 먼저 부름 — trial/index.html(<meta name="dungeon-trial">) 이면 이 기기 저장(localStorage) = 이 탭 저장(sessionStorage)
//   → 내 용사 · 💎 · 설정이 탭을 닫으면 사라지고, 같은 기기의 실제 게임 기록(localStorage)과 섞이지 않음
if (typeof document !== 'undefined' && document.querySelector('meta[name="dungeon-trial"]')) {
  try { Object.defineProperty(window, 'localStorage', { configurable: true, get: () => window.sessionStorage }); } catch { /* 못 바꾸는 브라우저 = 그대로 */ }
}
export {};
