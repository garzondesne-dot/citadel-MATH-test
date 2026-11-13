// 📲 베타 PWA (#38): 서비스 워커 등록 · 설치 단추(beforeinstallprompt) · 설치됨 · 아이폰
//   등록 = 빌드된 사이트에서만(개발 서버 · ?nosw 는 안 함) · 새 판 = App 의 version.json 비교가 맡음(여기는 워커만 새로 받게)
export const pwa = $state<{ prompt: (Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) | null; installed: boolean; ios: boolean; sw: boolean }>({ prompt: null, installed: false, ios: false, sw: false });
let reg: ServiceWorkerRegistration | null = null;
export function startPwa(): void {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent || '';
  pwa.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  pwa.installed = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pwa.prompt = e as typeof pwa.prompt; });
  addEventListener('appinstalled', () => { pwa.installed = true; pwa.prompt = null; });
  const q = new URLSearchParams(location.search);
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD || q.has('nosw')) return;
  navigator.serviceWorker.register('./sw.js').then((r) => { reg = r; pwa.sw = true; }).catch(() => {});
}
/** 새 판을 알아챘을 때 · 워커도 새로 받아 둠 (새로 고침 전에) */
export const swUpdate = (): Promise<unknown> => reg?.update().catch(() => {}) ?? Promise.resolve();
/** 설치 단추 (안드로이드 · 크롬) */
export async function install(): Promise<boolean> {
  const p = pwa.prompt; if (!p) return false;
  await p.prompt(); const r = await p.userChoice?.catch(() => null); pwa.prompt = null;
  return r?.outcome === 'accepted';
}
