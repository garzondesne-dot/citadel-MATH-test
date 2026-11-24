// 🥏 알까기 판 그리기 (폰 · TV 같은 함수 · 📜 11/24 에셋 방 2 시안 v3)
//   판 = 나무 원판 그림(alk-board-v1) · 알 = 색 동그라미 + 이름표 · 내 알 = 금빛 테두리 · 무적 = 반투명 · 👑 = 1등 · 쉬는 고리(내 알만)
//   카메라 = 화면 가운데에 둘 판 자리(cx, cy) + 판 1 = k px · 창 밖 알 = 가장자리 ▶ + 이름 · 떨어짐 = 코드 먼지
import { AK, type Stone } from '../../rest/alkkagi';
import { AK_ART } from '../manifest';

/** 색 = 판 위 학생을 이름순으로 세운 차례 × 황금각 (모든 기기에서 같은 색 · 이웃끼리 다른 색) */
export const colorOf = (i: number) => `hsl(${Math.round(i * 137.508) % 360} 70% 55%)`;

export interface Cam { cx: number; cy: number; k: number }
export interface Dust { x: number; y: number; t0: number }
export interface DrawOpt {
  me?: string; crown?: string; label?: (u: string) => string; ar?: number; cam?: Cam; dpr?: number;
  /** 궤적 미리 보기 (판 단위) */ path?: { pts: [number, number][]; out: boolean; hit?: { x: number; y: number; dx: number; dy: number; out: boolean } } | null;
  /** 내 알 쉬는 고리 0 ~ 1 (1 = 다 참) */ ring?: number;
  /** 창 밖 알 = 가장자리 ▶ + 이름 */ edges?: boolean; dust?: Dust[]; now?: number;
}

/** 판 전체가 들어오는 카메라 (판 반지름 → min(W, H) / 2 × 0.94) */
export const fitCam = (W: number, H: number, R: number): Cam => ({ cx: 0, cy: 0, k: ((Math.min(W, H) / 2) * 0.94) / R });
/** 📺 종합실 = 원판 그림 테두리까지 캔버스에 꽉 (🔨 #17 · 떨어지는 선 = 그림 폭 × ring) */
export const fullCam = (W: number, H: number, R: number): Cam => ({ cx: 0, cy: 0, k: ((Math.min(W, H) / 2) * AK_ART.ring * 0.99) / R });

let boardImg: HTMLImageElement | null = null;
const board = () => { if (!boardImg && typeof Image !== 'undefined') { boardImg = new Image(); boardImg.src = `${import.meta.env.BASE_URL}${AK_ART.board}`; } return boardImg; };

export function drawAk(g: CanvasRenderingContext2D, W: number, H: number, R: number, st: Record<string, Stone>, o: DrawOpt = {}) {
  const cam = o.cam ?? fitCam(W, H, R), k = cam.k, dpr = o.dpr ?? 1, ar = o.ar ?? AK.r;
  const X = (x: number) => W / 2 + (x - cam.cx) * k, Y = (y: number) => H / 2 + (y - cam.cy) * k;
  g.clearRect(0, 0, W, H);
  // 나무 원판 (그림 · 못 받으면 색)
  const bi = board();
  g.save(); g.beginPath(); g.arc(X(0), Y(0), R * k, 0, Math.PI * 2);
  // 그림 속 원판 = 그림 폭의 AK_ART.ring (지금 85.2% = 256 중 지름 218) → 원판 가장자리 = 판 반지름 R (떨어지는 선)
  if (bi?.complete && bi.naturalWidth) { const S = (R * k * 2) / AK_ART.ring; g.imageSmoothingEnabled = !AK_ART.pixel; g.imageSmoothingQuality = 'high'; g.drawImage(bi, X(0) - S / 2, Y(0) - S / 2, S, S); }
  else { const grd = g.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), R * k); grd.addColorStop(0, '#c99a5b'); grd.addColorStop(1, '#8a5a2b'); g.fillStyle = grd; g.fill(); g.lineWidth = Math.max(3 * dpr, k * 0.25); g.strokeStyle = '#e5484d'; g.stroke(); }
  g.restore();
  // 미리 보기
  const p = o.path;
  if (p && p.pts.length > 1) {
    g.save(); g.setLineDash([6 * dpr, 6 * dpr]); g.lineWidth = 3 * dpr; g.strokeStyle = p.out ? '#ff4d4f' : '#ffffff';
    g.beginPath(); p.pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke();
    if (p.hit) { g.strokeStyle = p.hit.out ? '#ff4d4f' : '#ffd34d'; g.beginPath(); g.moveTo(X(p.hit.x), Y(p.hit.y)); g.lineTo(X(p.hit.dx), Y(p.hit.dy)); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(X(p.hit.dx), Y(p.hit.dy), ar * k * 0.5, 0, Math.PI * 2); g.stroke(); }
    else { const [ex, ey] = p.pts[p.pts.length - 1]!; g.setLineDash([]); g.beginPath(); g.arc(X(ex), Y(ey), ar * k, 0, Math.PI * 2); g.stroke(); }
    if (p.out || p.hit?.out) { g.setLineDash([]); g.fillStyle = '#ff4d4f'; g.font = `800 ${14 * dpr}px system-ui, sans-serif`; g.textAlign = 'center'; const [ex, ey] = p.pts[p.pts.length - 1]!; g.fillText(p.out ? '이대로면 떨어짐!' : '밀어서 떨어뜨림!', X(ex), Y(ey) - 18 * dpr); }
    g.restore();
  }
  // 먼지 (떨어진 자리 · 0.7초)
  const now = o.now ?? 0;
  for (const d of o.dust ?? []) {
    const a = (now - d.t0) / 700; if (a < 0 || a > 1) continue;
    for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2 + i, rr = (0.4 + a * 1.6) * ar * k; g.fillStyle = `rgba(214, 190, 150, ${(1 - a) * 0.8})`; g.beginPath(); g.arc(X(d.x) + Math.cos(t) * rr, Y(d.y) + Math.sin(t) * rr, Math.max(2 * dpr, ar * k * 0.22 * (1 - a * 0.5)), 0, Math.PI * 2); g.fill(); }
  }
  // 알
  const order = Object.keys(st).sort(), r = ar * k, fs = Math.max(11 * dpr, Math.min(16 * dpr, r * 0.7));
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const off: { u: string; x: number; y: number }[] = [];
  for (const [u, s] of Object.entries(st)) {
    if (!s.on) continue;
    const x = X(s.x), y = Y(s.y), mine = u === o.me;
    if (x < -r || y < -r || x > W + r || y > H + r) { off.push({ u, x, y }); continue; }
    g.globalAlpha = s.inv > 0 ? 0.45 : 1;
    g.beginPath(); g.arc(x, y + r * 0.15, r, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = colorOf(order.indexOf(u)); g.fill();
    g.lineWidth = mine ? Math.max(3 * dpr, r * 0.2) : Math.max(1.5 * dpr, r * 0.08); g.strokeStyle = mine ? '#ffd34d' : 'rgba(255,255,255,0.85)'; g.stroke();
    const lab = o.label?.(u);
    if (lab) { g.font = `800 ${fs}px system-ui, sans-serif`; const tw = g.measureText(lab).width + 8 * dpr; g.fillStyle = mine ? 'rgba(245,184,74,0.95)' : 'rgba(10,12,16,0.72)'; g.fillRect(x - tw / 2, y + r + 2 * dpr, tw, fs + 4 * dpr); g.fillStyle = mine ? '#1a1206' : '#fff'; g.fillText(lab, x, y + r + 2 * dpr + (fs + 4 * dpr) / 2 + 1); }
    if (u === o.crown) { g.font = `${Math.max(14 * dpr, r * 0.9)}px system-ui, sans-serif`; g.fillText('👑', x, y - r * 1.3); }
    if (mine && o.ring != null && o.ring < 1) { g.beginPath(); g.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.ring); g.lineWidth = 3 * dpr; g.strokeStyle = '#6cc6ff'; g.stroke(); }
    g.globalAlpha = 1;
  }
  // 창 밖 알 = 가장자리 ▶ + 이름
  if (o.edges) {
    const m = 14 * dpr; g.font = `700 ${12 * dpr}px system-ui, sans-serif`;
    for (const e of off) {
      const dx = e.x - W / 2, dy = e.y - H / 2, s = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6)), ex = W / 2 + dx * s, ey = H / 2 + dy * s, a = Math.atan2(dy, dx);
      g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = colorOf(order.indexOf(e.u)); g.beginPath(); g.moveTo(8 * dpr, 0); g.lineTo(-6 * dpr, -6 * dpr); g.lineTo(-6 * dpr, 6 * dpr); g.closePath(); g.fill(); g.restore();
      const lab = o.label?.(e.u); if (lab) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(lab, Math.min(W - 30 * dpr, Math.max(30 * dpr, ex - Math.cos(a) * 22 * dpr)), Math.min(H - 10 * dpr, Math.max(10 * dpr, ey - Math.sin(a) * 16 * dpr))); }
    }
  }
}
