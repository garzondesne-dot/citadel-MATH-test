// ✨ 맞는 순간 겹 (📜 2026-11-13 머리 DECISIONS 8f16f4d · 선생님 「응 그래」): 👍 이펙트 30 = 그림 그대로 + 새 엔진 「맞는 순간 겹」
//   맞는 칸 번쩍(계열 색 → 흰 점) · 계열 색 파편(불 = 불똥이 솟음 · 번개 = 지지직 · 얼음 = 조각 · 별 = 반짝 · 마법 = 빛 알갱이 · 나머지 = 네모 파편)
//   Ⅲ · Ⅳ = 더 많이 · 잠깐 멈춤 더 길게(attack.ts) · Ⅳ = 충격파 고리 · TV = 계열 색 화면 물듦 + 흔들림 한 단계 더 · 폰 = 그림 겹만(물듦 · 흔들림 그대로)
//   도트 = 낮은 해상도 캔버스(1/3) 를 nearest 로 키움 · 0.85초 뒤 지움 · 「동작 줄이기」 = 번쩍만
//   🔥 화염 폭발로 「지금 ↔ 얹은 것」 평가 👍(2026-11-14) → 👍 30 에 기본으로 켬 (LAYER_FX)
import type { Body } from './fx';
import { ICE } from '../manifest';
// ❄ 얼음 계열 = 🎨 결정 그림 조각도 튐 (ice-crystal · 📜 2026-11-14)
let crImg: HTMLImageElement | null = null;
const crystalImg = () => { if (!crImg && typeof Image !== 'undefined') { crImg = new Image(); crImg.src = ICE.crystal.src; } return crImg && crImg.complete && crImg.naturalWidth ? crImg : null; };

/** 👍 받은 30 (📜 2026-11-14 선생님 평가판 「🔥 화염 폭발 · 지금 ↔ 겹」 👍 → 30 모두 · 평가판 h-* 👍 그대로) */
export const LAYER_FX = new Set(['bash', 'chain', 'compass', 'crit', 'cut', 'cyclone', 'fire', 'flame', 'frost', 'gale', 'leaf', 'lightning', 'mana', 'meteor', 'moon', 'nova', 'orb', 'pillar', 'qed', 'ring', 'ruler', 'smite', 'spark', 'stars', 'sweep', 'thrust', 'thunder', 'upper', 'venn', 'wings']);
// 켜기 = 기본 👍 30 · ?layer=1 = 모든 스킬(비교용) · ?layer=0 = 끔(비교용 · 이 기기 기억)
let mode: 'all' | 'none' | 'up' = (() => { try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('layer') : null, v = q ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('citadel-layer') : null); return v === '1' ? 'all' : v === '0' ? 'none' : 'up'; } catch { return 'up'; } })();
export const setLayer = (v: boolean | null) => { mode = v == null ? 'up' : v ? 'all' : 'none'; try { if (v == null) localStorage.removeItem('citadel-layer'); else localStorage.setItem('citadel-layer', v ? '1' : '0'); } catch { /* 무시 */ } };
export const layerOn = (fx: string) => mode === 'all' || (mode === 'up' && LAYER_FX.has(fx));

/** 계열 색 [어두운 · 가운데 · 밝은] + 파편 모양 */
const PAL: Record<string, { c: [string, string, string]; k: 'ember' | 'zap' | 'shard' | 'star' | 'mote' | 'chip' }> = {
  fire: { c: ['#b3260e', '#ff7a1a', '#ffd25a'], k: 'ember' },
  spark: { c: ['#8a6a00', '#ffe14a', '#fffbd0'], k: 'zap' },
  frost: { c: ['#1d5f8a', '#7fd3ff', '#e8fbff'], k: 'shard' },
  water: { c: ['#0d4a8a', '#4aa8ff', '#d0ecff'], k: 'chip' },
  star: { c: ['#8a6a10', '#ffe27a', '#fffbe0'], k: 'star' },
  sun: { c: ['#a8620a', '#ffc24a', '#fff2c0'], k: 'star' },
  magic: { c: ['#4a1a8a', '#c08aff', '#f0e0ff'], k: 'mote' },
  dark: { c: ['#2a0a3a', '#8a4ad0', '#e0c8ff'], k: 'mote' },
  math: { c: ['#7a5a00', '#ffd25a', '#fff6d0'], k: 'star' },
  wind: { c: ['#0d6a4a', '#9ef0d0', '#f0fff8'], k: 'chip' },
  sweep: { c: ['#0d6a3a', '#a0ffd0', '#f0fff6'], k: 'chip' },
  cut: { c: ['#0b3f78', '#9fe0ff', '#ffffff'], k: 'chip' },
  smash: { c: ['#6a3008', '#ffb070', '#fff0e0'], k: 'chip' },
  gear: { c: ['#4a4a52', '#c9ccd6', '#ffffff'], k: 'chip' },
};
const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PX = 3;
/** 맞는 순간 겹 그리기 · tier = 0~3(Ⅰ~Ⅳ) · tv = 화면 물듦 */
export function overlay(scene: HTMLElement, B: Body, fam: string, tier: number, tv: boolean) {
  if (!scene.isConnected) return;
  const P = PAL[fam] ?? PAL.cut!, red = reduce();
  const size = Math.max(B.w, B.h) * (1.9 + tier * 0.25), W = Math.ceil(size / PX), H = W;
  const cv = document.createElement('canvas'); cv.className = 'fx-layer'; cv.width = W; cv.height = H;
  cv.style.cssText = `position:absolute;left:${Math.round(B.cx - (W * PX) / 2)}px;top:${Math.round(B.cy - (H * PX) / 2)}px;width:${W * PX}px;height:${H * PX}px;image-rendering:pixelated;pointer-events:none;z-index:24`;
  scene.appendChild(cv); const g = cv.getContext('2d'); if (!g) { cv.remove(); return; }
  if (tv && !red) { const t = document.createElement('i'); t.className = 'fx-tint'; t.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:23;background:${P.c[1]};mix-blend-mode:screen;opacity:${0.16 + tier * 0.04};transition:opacity .22s ease-out`; scene.appendChild(t); requestAnimationFrame(() => requestAnimationFrame(() => (t.style.opacity = '0'))); setTimeout(() => t.remove(), 300); }
  // 파편 (자리 · 방향 = 고정 난수 아님 · 매번 조금 다르게)
  const n = red ? 0 : [12, 20, 32, 44][tier] ?? 20, cx = W / 2, cy = H / 2, r0 = (Math.max(B.w, B.h) / PX) * 0.18;
  const ps = Array.from({ length: n }, () => { const a = Math.random() * Math.PI * 2, sp = (24 + Math.random() * 46) * (1 + tier * 0.15); return { x: cx + Math.cos(a) * r0 * Math.random(), y: cy + Math.sin(a) * r0 * Math.random(), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (P.k === 'ember' ? 34 : 10), life: 0.4 + Math.random() * 0.4, c: P.c[Math.random() < 0.35 ? 2 : Math.random() < 0.6 ? 1 : 0]!, s: Math.random() < 0.25 ? 3 : 2 }; });
  const shock = tier >= 3 && !red, t0 = performance.now(), END = 0.85;
  const ci = fam === 'frost' && !red ? crystalImg() : null, CN = ICE.crystal.n, CC = ICE.crystal.cell;
  const cps = ci ? Array.from({ length: 3 + tier * 2 }, (_, i) => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4; const sp = 22 + Math.random() * 30; return { k: [0, 2, 4, 6, 1, 5, 7, 3][i % 8]!, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, s: (Math.max(B.w, B.h) / PX) * (0.16 + Math.random() * 0.1) }; }) : [];
  const f = () => {
    const t = (performance.now() - t0) / 1000; g.clearRect(0, 0, W, H);
    // 번쩍 = 계열 색 빛살 8갈래가 뻗었다 사라짐 + 작은 흰 속 (원판 아님 · 0.14초)
    if (t < 0.14) { const q = t / 0.14, L = (Math.max(B.w, B.h) / PX) * (0.22 + 0.38 * Math.sqrt(q)) * (1 + tier * 0.12), w = Math.max(1, Math.round(3 * (1 - q)));
      g.globalAlpha = 1 - q * q;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2, l = k % 2 ? L * 0.6 : L; for (let d = 0; d < l; d++) { g.fillStyle = d < l * 0.35 ? '#fff' : d < l * 0.7 ? P.c[2] : P.c[1]; g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), w, w); } }
      if (t < 0.08) { g.fillStyle = '#fff'; const c = Math.round((Math.max(B.w, B.h) / PX) * 0.12); g.fillRect(Math.round(cx - c / 2), Math.round(cy - c / 2), c, c); } }
    // Ⅳ 충격파 고리 (0.32초)
    if (shock && t < 0.32) { const q = t / 0.32; g.globalAlpha = 1 - q; g.strokeStyle = P.c[2]; g.lineWidth = Math.max(1, 3 * (1 - q)); g.beginPath(); g.arc(cx, cy, (W / 2) * (0.2 + 0.78 * q), 0, Math.PI * 2); g.stroke(); }
    for (const p of ps) {
      if (t > p.life) continue; const a = 1 - t / p.life, grav = P.k === 'ember' ? -40 : 90, x = Math.round(p.x + p.vx * t), y = Math.round(p.y + p.vy * t + 0.5 * grav * t * t); g.globalAlpha = a; g.fillStyle = p.c;
      if (P.k === 'zap') { g.fillRect(x, y, p.s + 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
      else if (P.k === 'star') { g.fillRect(x, y - 1, 1, 3); g.fillRect(x - 1, y, 3, 1); }
      else if (P.k === 'shard') { g.fillRect(x, y, 1, p.s + 1); }
      else if (P.k === 'ember') { const ss = t > p.life * 0.6 ? Math.max(1, p.s - 1) : p.s; g.fillRect(x, y, ss, ss); if (Math.random() < 0.6) { g.fillStyle = P.c[2]; g.fillRect(x, y, 1, 1); } }
      else g.fillRect(x, y, p.s, p.s);
    }
    if (ci && t > 0.03) for (const c of cps) { const q = Math.min(1, t / 0.7); g.globalAlpha = 1 - q; g.save(); g.translate(cx + c.vx * t, cy + c.vy * t + 45 * t * t); g.rotate(c.rot + c.vr * t); g.imageSmoothingEnabled = false; g.drawImage(ci, c.k * CC, 0, CC, CC, -c.s / 2, -c.s / 2, c.s, c.s); g.restore(); }
    g.globalAlpha = 1;
    if (t < END && cv.isConnected) requestAnimationFrame(f); else cv.remove();
  };
  requestAnimationFrame(f);
}
