// 📱 화면 꺼짐 방지 (📜 2026-11-14 선생님 「교사 폰 리모컨은 자동 화면 꺼짐 안 되게 해 줘」 · DECISIONS 40af77e · 정식 js/engine/ui.js DS.UI.wake 그대로)
//   Screen Wake Lock: 리모컨 · 학생 수업 · 교실 TV 화면이 열려 있는 동안 켬 · 다른 앱을 보다 돌아오면 다시 켬(브라우저가 가려지면 저절로 풀어서) · 화면을 떠나면 놓음
//   여러 화면이 같이 잡을 수 있음(TV 안 🎮 시연 폰) → 잡은 수를 세서 마지막이 놓을 때만 끔
//   지원 안 되는 폰(wakeLock 없음 · 실패 · 앱 안 브라우저) = 정식 #70 처럼 수업 입장 때 한 번만 안내 띠(이 기기 기억)
type Lock = { release(): Promise<void>; addEventListener(t: 'release', f: () => void): void };
const S = { lock: null as Lock | null, holds: 0, failed: false };
const nav = () => (typeof navigator !== 'undefined' ? (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<Lock> } }) : null);
async function grab(): Promise<boolean> {
  const n = nav();
  try { if (n?.wakeLock && !S.lock && document.visibilityState === 'visible') { const l = await n.wakeLock.request('screen'); S.lock = l; l.addEventListener('release', () => { if (S.lock === l) S.lock = null; }); } } catch { S.failed = true; /* 지원 안 함 · 배터리 절약 모드 */ }
  return !!S.lock;
}
function drop() { const l = S.lock; S.lock = null; if (l) l.release().catch(() => {}); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.holds > 0) void grab(); });
/** 안내 띠 글 (화면이 보여 주고 ✕ 로 닫음) */
export const wakeTip = $state({ text: '' });
export const TIP = '📱 화면이 자꾸 꺼지면: 설정 → 화면 자동 꺼짐 시간을 길게 · 또는 📲 앱으로 설치';
const TIP_KEY = 'citadel-wake-tip';
/** 화면이 열릴 때 부름 → 놓는 함수 (onDestroy 에) · tip = 지원 안 되면 이 기기에서 한 번만 띠 */
export function holdWake(tip = false): () => void {
  S.holds += 1;
  void grab().then((ok) => {
    if (!tip || ok || (nav()?.wakeLock && !S.failed)) return;
    try { if (localStorage.getItem(TIP_KEY)) return; localStorage.setItem(TIP_KEY, '1'); } catch { return; }
    wakeTip.text = TIP;
  });
  let done = false;
  return () => { if (done) return; done = true; S.holds = Math.max(0, S.holds - 1); if (!S.holds) drop(); };
}
/** 시험용 */
export const wakeState = () => ({ held: !!S.lock, holds: S.holds, failed: S.failed });
if (typeof window !== 'undefined') (window as unknown as { __wake: typeof wakeState }).__wake = wakeState;
