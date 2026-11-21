// 🐞 #98 버그 의견 자동 글: 화면 이름 · 판 번호 · 폰 기종 · 가로/세로 · 마지막 단추 20번 · 오류 (약 2KB) — 이 기기 메모리에만 · 보낼 때만 글로
//   + 사진 줄이기(긴 변 720px · JPEG 0.6)
import { BUILD, APP_VER } from '../build';

const taps: string[] = [], errs: string[] = [];
let on = false;
const short = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);
export function startTrace() {
  if (on || typeof window === 'undefined') return; on = true;
  window.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, a, [role="button"], [data-k]') as HTMLElement | null;
    if (!el) return;
    const k = el.getAttribute('data-k'), t = short(el.getAttribute('aria-label') || el.textContent || '', 18);
    taps.push(`${new Date().toTimeString().slice(0, 8)} ${k ? `[${k}] ` : ''}${t}`); if (taps.length > 20) taps.shift();
  }, true);
  window.addEventListener('error', (e) => { errs.push(short(String(e.message || e.error || '오류'), 120)); if (errs.length > 5) errs.shift(); });
  window.addEventListener('unhandledrejection', (e) => { errs.push(short(String((e.reason as Error)?.message || e.reason || '오류'), 120)); if (errs.length > 5) errs.shift(); });
}
function device(): string {
  const ua = navigator.userAgent || '', m = /\(([^)]+)\)/.exec(ua)?.[1] || '';
  const model = (navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } }).userAgentData?.platform || '';
  const br = /SamsungBrowser\/[\d.]+|Chrome\/[\d]+|Firefox\/[\d]+|Version\/[\d.]+ Mobile\/\w+ Safari|Safari\/[\d]+/.exec(ua)?.[0] || '';
  return short(`${m}${model ? ` · ${model}` : ''} · ${br}`, 160);
}
/** 화면 이름 = 주소 role + 열린 시트 제목 + 위 막대 제목 */
function screen(): string {
  const q = new URLSearchParams(location.search), role = q.get('role') || 'student';
  const sheet = document.querySelector('[role="dialog"] h2, .sheet .ttl, .sheet h2')?.textContent || '';
  const top = document.querySelector('header b, .ptop b, .top .ttl')?.textContent || '';
  return short(`${role}${top ? ` · ${top}` : ''}${sheet ? ` · 시트 ${sheet}` : ''}`, 120);
}
export function bugInfo(): string {
  const o = typeof matchMedia === 'function' && matchMedia('(orientation: landscape)').matches ? '가로' : '세로';
  const lines = [`화면: ${screen()}`, `판: v${APP_VER} ${BUILD}`, `기기: ${device()}`, `방향: ${o} ${innerWidth}×${innerHeight}`, `단추(최근 ${taps.length}): ${taps.join(' → ') || '없음'}`, `오류: ${errs.join(' | ') || '없음'}`];
  let s = lines.join('\n'); if (s.length > 2048) s = s.slice(0, 2048);
  return s;
}
/** 갤러리 사진 → 긴 변 720px · JPEG 0.6 dataURL */
export async function shrink(file: File, edge = 720, q = 0.6): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('사진을 열 수 없어요')); i.src = url; });
    const k = Math.min(1, edge / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
    let d = cv.toDataURL('image/jpeg', q);
    for (let qq = q - 0.15; d.length > 150_000 && qq > 0.2; qq -= 0.15) d = cv.toDataURL('image/jpeg', qq); // 너무 크면 한 단계씩 낮춤
    return d;
  } finally { URL.revokeObjectURL(url); }
}
