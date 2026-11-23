// 🥏 알까기 판 그리기 (폰 · TV 같은 함수) — 나무 원판 · 알 = 색 동그라미 + 이름 첫 글자 · 내 알 = 금빛 테두리 · 무적 = 반투명 · 👑 = 1등 · 쉬는 고리(내 알만)
import { AK, type Stone } from '../../rest/alkkagi';

/** 색 = 판 위 학생을 이름순으로 세운 차례 × 황금각 (모든 기기에서 같은 색 · 이웃끼리 다른 색) */
export const colorOf = (i: number) => `hsl(${Math.round(i * 137.508) % 360} 70% 55%)`;

export interface DrawOpt {
  me?: string; crown?: string; label?: (u: string) => string;
  /** 궤적 미리 보기 (판 단위) */ path?: { pts: [number, number][]; out: boolean; hit?: { x: number; y: number; dx: number; dy: number; out: boolean } } | null;
  /** 내 알 쉬는 고리 0 ~ 1 (1 = 다 참) */ ring?: number;
}

/** 판 단위 → 화면: 가운데 (W/2, H/2) · 반지름 R → min(W, H) / 2 × 0.94 */
export const scaleOf = (W: number, H: number, R: number) => (Math.min(W, H) / 2) * 0.94 / R;

export function drawAk(g: CanvasRenderingContext2D, W: number, H: number, R: number, st: Record<string, Stone>, o: DrawOpt = {}) {
  const k = scaleOf(W, H, R), cx = W / 2, cy = H / 2, X = (x: number) => cx + x * k, Y = (y: number) => cy + y * k;
  g.clearRect(0, 0, W, H);
  // 나무 원판 · 가장자리 붉은 띠
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R * k);
  grd.addColorStop(0, '#c99a5b'); grd.addColorStop(1, '#8a5a2b');
  g.beginPath(); g.arc(cx, cy, R * k, 0, Math.PI * 2); g.fillStyle = grd; g.fill();
  g.lineWidth = Math.max(3, k * 0.18); g.strokeStyle = '#e5484d'; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; for (let r = R * 0.25; r < R; r += R * 0.25) { g.beginPath(); g.arc(cx, cy, r * k, 0, Math.PI * 2); g.stroke(); }
  // 미리 보기
  const p = o.path;
  if (p && p.pts.length > 1) {
    g.save(); g.setLineDash([6, 6]); g.lineWidth = 3; g.strokeStyle = p.out ? '#ff4d4f' : '#ffffff';
    g.beginPath(); p.pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke();
    if (p.hit) { g.strokeStyle = p.hit.out ? '#ff4d4f' : '#ffd34d'; g.beginPath(); g.moveTo(X(p.hit.x), Y(p.hit.y)); g.lineTo(X(p.hit.dx), Y(p.hit.dy)); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(X(p.hit.dx), Y(p.hit.dy), AK.r * k * 0.5, 0, Math.PI * 2); g.stroke(); }
    else { const [ex, ey] = p.pts[p.pts.length - 1]!; g.setLineDash([]); g.beginPath(); g.arc(X(ex), Y(ey), AK.r * k, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  // 알
  const fs = Math.max(10, AK.r * k * 0.95);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const order = Object.keys(st).sort();
  for (const [u, s] of Object.entries(st)) {
    if (!s.on) continue;
    const x = X(s.x), y = Y(s.y), r = AK.r * k, mine = u === o.me;
    g.globalAlpha = s.inv > 0 ? 0.45 : 1;
    g.beginPath(); g.arc(x, y + r * 0.15, r, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = colorOf(order.indexOf(u)); g.fill();
    g.lineWidth = mine ? Math.max(3, r * 0.28) : Math.max(1.5, r * 0.1); g.strokeStyle = mine ? '#ffd34d' : 'rgba(255,255,255,0.85)'; g.stroke();
    const lab = o.label?.(u); if (lab) { g.fillStyle = '#10131a'; g.font = `800 ${fs}px system-ui, sans-serif`; g.fillText(lab, x, y + 1); }
    if (u === o.crown) { g.font = `${fs * 1.2}px system-ui, sans-serif`; g.fillText('👑', x, y - r * 1.35); }
    if (mine && o.ring != null && o.ring < 1) { g.beginPath(); g.arc(x, y, r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.ring); g.lineWidth = 3; g.strokeStyle = '#6cc6ff'; g.stroke(); }
    g.globalAlpha = 1;
  }
}
