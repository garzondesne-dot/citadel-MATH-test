// 🧪 시험 주소 · 🅱 베타 구분 (📜 2026-11-14 출시 막는 것 9 「시험 고리 · ?as · BETA 띠 = 시험 주소에서만」)
//   TEST_ADDR = 내 컴퓨터(localhost · 127.0.0.1) = e2e · 개발 → 시험 고리(window.__*) · ?as · ?role=dev · fxbake · ?packs=0 · ?emu 가 됨
//   BETA = 시험 주소이거나 베타 사이트(/citadel-MATH-test/) → 「BETA · 판」 알약 · 「시험 서버」 글자
//   출시(정식 주소) = 둘 다 끔 → 시험 고리 이름은 잠가서 써도 무시 · 읽어도 없음 (아래 HOOKS · 새 고리는 여기에 더해야 tests/channel.test.ts 통과)
const loc = typeof location !== 'undefined' ? location : null;
export const TEST_ADDR = !!loc && /^(localhost|127\.0\.0\.1)$/.test(loc.hostname);
export const BETA = TEST_ADDR || (!!loc && /-test\//i.test(loc.pathname));

/** 시험 고리 이름 (window.__이름) — 출시에서는 잠금 */
export const HOOKS = [
  '__dbSet', '__dbGet', '__perfect', '__uid', '__TD_PICK', '__TD_SPEED', '__featSet', '__strike', '__bgm', '__board', '__BOARD_SEC', '__portalBurst', '__castle',
  '__sfxLog', '__pdfRects', '__fillHow', '__fillCut', '__fillRects', '__tvStrike', '__slash', '__tvAtk', '__tvKill', '__tvJuice', '__tvJuiceStats', '__tvTrue',
  '__tvGuard', '__arena', '__tvFreeze', '__tvMon', '__tvMonNow', '__tvMonSeen', '__tvPoses', '__tvPose', '__bake', '__tvFake', '__wake', '__botSpeed',
] as const;

/** 출시 주소면 고리 이름을 잠금 (main.ts 가 맨 먼저 부름 · 다른 모듈이 고리를 걸기 전에) */
export function lockHooks(on = !!loc && !TEST_ADDR): number {
  if (!on || typeof globalThis === 'undefined') return 0;
  let n = 0;
  for (const k of HOOKS) { try { Object.defineProperty(globalThis, k, { configurable: false, enumerable: false, get: () => undefined, set: () => { /* 출시 = 무시 */ } }); n++; } catch { /* 이미 잠김 */ } }
  return n;
}
lockHooks();
