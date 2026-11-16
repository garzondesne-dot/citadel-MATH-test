// 🧪 시험 주소 · 🅱 베타 구분 (📜 2026-11-14 출시 막는 것 9 「시험 고리 · ?as · BETA 띠 = 시험 주소에서만」)
//   TEST_ADDR = 내 컴퓨터(localhost · 127.0.0.1) = e2e · 개발 → 시험 고리(window.__*) · ?as · ?role=dev · fxbake · ?packs=0 · ?emu 가 됨
//   BETA = 시험 주소이거나 베타 사이트(/citadel-MATH-test/) → 「BETA · 판」 알약 · 「시험 서버」 글자
//   출시(정식 주소) = 둘 다 끔 → 시험 고리 이름은 잠가서 써도 무시 · 읽어도 없음 (아래 HOOKS · 새 고리는 여기에 더해야 tests/channel.test.ts 통과)
const loc = typeof location !== 'undefined' ? location : null;
export const TEST_ADDR = !!loc && /^(localhost|127\.0\.0\.1)$/.test(loc.hostname);
/** 🏫 학교판 빌드 (VITE_SCHOOL) = 늘 정식 표시 (📜 2026-11-16 선생님 「내 친구는 베타 버전하고 정식 버전 굳이 나눌 필요 없게」 · 베타 주소에 있어도 「BETA」 · 「시험 서버」 · 🧪 낱말 없음) */
export const SCHOOL_BUILD = !!(import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SCHOOL_NAME;
export const BETA = !SCHOOL_BUILD && (TEST_ADDR || (!!loc && /-test\//i.test(loc.pathname)));
/** 화면 낱말 (📜 2026-11-15 머리 🔨 「정식에서 테스트 · 베타 낱말 빼기」): 앱 이름 · 통계에서 빠지는 반 이름 */
export const APP_NAME = BETA ? '던전 베타' : '모두의 던전';
export const XCLS = BETA ? '베타 반' : '시험 반';
/** 🏷 판 이름 (📜 2026-11-15 선생님 정정 · DECISIONS 맨 아래): 정식 = 「✅ 정식 bNNN」(초록) · 베타 = 「🧪 베타 bNNN」(주황) */
export const verName = (build: string) => (BETA ? `🧪 베타 ${build}` : `✅ 정식 ${build}`);
/** ✍ 만든 이 (첫 화면 · 학생 설정 맨 아래 · 교사 「나」) · 주소에 ?anon 이면 숨김 */
export const CREDIT_NAME = '김찬우';
export const showCredit = !(loc && new URLSearchParams(loc.search).has('anon'));

/** 시험 고리 이름 (window.__이름) — 출시에서는 잠금 */
export const HOOKS = [
  '__dbSet', '__dbGet', '__perfect', '__uid', '__TD_PICK', '__TD_SPEED', '__featSet', '__strike', '__bgm', '__board', '__BOARD_SEC', '__portalBurst', '__castle',
  '__sfxLog', '__pdfRects', '__fillHow', '__fillCut', '__fillRects', '__tvStrike', '__slash', '__tvAtk', '__tvKill', '__tvHeroes', '__tvJuice', '__tvJuiceStats', '__tvTrue',
  '__tvGuard', '__arena', '__tvFreeze', '__tvMon', '__tvMonNow', '__tvMonSeen', '__tvPoses', '__tvPose', '__bake', '__tvFake', '__wake', '__botSpeed', '__dummyPerfect', '__heroAtk', '__atkPlays', '__tvStrikeSet', '__tstrikes',
] as const;

/** 출시 주소면 고리 이름을 잠금 (main.ts 가 맨 먼저 부름 · 다른 모듈이 고리를 걸기 전에) */
export function lockHooks(on = !!loc && !TEST_ADDR): number {
  if (!on || typeof globalThis === 'undefined') return 0;
  let n = 0;
  for (const k of HOOKS) { try { Object.defineProperty(globalThis, k, { configurable: false, enumerable: false, get: () => undefined, set: () => { /* 출시 = 무시 */ } }); n++; } catch { /* 이미 잠김 */ } }
  return n;
}
lockHooks();
/** 🔗 지금 열린 사이트 주소 (QR · 안내 글) = 이 페이지가 있는 폴더 (정식 /Citadel-MATH/ · 베타 /citadel-MATH-test/ · 학교판 /…/s/<코드>/ · 체험판)
 *  🐞 2026-11-15 「QR 안 먹혀」: 예전 = location.origin + BASE_URL('./') → 「https://…github.io./」(경로가 빠지고 점이 붙음) */
export const siteUrl = (): string => (typeof location === 'undefined' ? './' : new URL('./', location.href).href);
