// 🌀 마왕성 차원문 그리기 (📜 11/28 · 캔버스 하나 · TV = 움직임 · 폰 = 멈춘 그림 한 장)
//   홀(빈 통로) → 문 안 푸른 소용돌이(⚡ 에너지만큼 커지고 빨라짐) → 테두리 푸른빛(에너지만큼 · 144 = 금빛) → 돌 조각(명단 수 · 아래부터 · 늘 어두운 룬) → 켜진 룬
//   📜 11/28 설계 변경: 뼈대 완성 = 빛 모두 꺼짐 · 에너지 동안 마왕성은 안 보임 · 룬 10개 = 10.8 마다 하나 · +1 마다 맥박 + 빛 구슬이 문으로 · 마왕성 = 🌀 문 열기(open)에서 처음
//   조각 = 완성 문(gate-done 300 × 420)을 school/gate.ts regionAt · pieceOrder 로 나눔(그림 한 장 · 가면만 따로)
//   🧩 용사 반응(2차) 자리 = onLand(조각이 놓인 때 · 몇 번째) — 지금은 부르는 곳 없음
import { GATE_ART } from '../manifest';
import { E_BASE, REGIONS, RUNES, regionAt, pieceOrder, runesOn, type Region } from '../../school/gate';

const C = GATE_ART.cell, BX = GATE_ART.box;
type Img = HTMLImageElement;
const cache = new Map<string, Promise<Img>>();
const load = (src: string): Promise<Img> => {
  let p = cache.get(src);
  if (!p) { p = new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); cache.set(src, p); }
  return p;
};
/** 기호(청록) 픽셀 (anim2.py cy 와 같은 판정) */
const isSym = (r: number, g: number, b: number, a: number) => b > 140 && b - r > 60 && a > 100;
const mkCv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

interface PieceArt { dim: HTMLCanvasElement; cx: number; bottom: number; rs: Region[] }
interface Rune { cv: HTMLCanvasElement; x: number; y: number; r: Region }
/** 조각 (명단 수 n · 룬은 늘 어둡게) + 룬 10개 (켜진 그림 · 따로) */
function build(img: Img, n: number): { pieces: PieceArt[]; runes: Rune[]; sil: HTMLCanvasElement } {
  const cv = mkCv(C.w, C.h), c0 = cv.getContext('2d', { willReadFrequently: true })!; c0.drawImage(img, 0, 0);
  const d = c0.getImageData(0, 0, C.w, C.h).data;
  const byR = new Map<Region, number[]>(); for (const r of REGIONS) byR.set(r, []);
  for (let y = C.h - 1; y >= 0; y--) for (let x = 0; x < C.w; x++) { const i = (y * C.w + x) * 4; if (d[i + 3]! > 10) byR.get(regionAt(x, y))!.push(y * C.w + x); } // 아래 줄부터
  const put = (id: ImageData) => { const c = mkCv(C.w, C.h); c.getContext('2d')!.putImageData(id, 0, 0); return c; };
  const pieces = pieceOrder(n).map((p) => {
    let px: number[] = p.rs.flatMap((r) => byR.get(r)!);
    if (p.of > 1) { const per = Math.ceil(px.length / p.of); px = px.slice(p.k * per, (p.k + 1) * per); }
    const dim = new ImageData(C.w, C.h); let mx = 0, bottom = 0;
    for (const k of px) {
      const i = k * 4, x = k % C.w, y = (k / C.w) | 0, r = d[i]!, g = d[i + 1]!, b = d[i + 2]!, a = d[i + 3]!;
      dim.data.set(isSym(r, g, b, a) ? [r * 0.32 + 10, g * 0.34 + 12, b * 0.38 + 16, a] : [r, g, b, a], i);
      mx += x; if (y > bottom) bottom = y;
    }
    return { dim: put(dim), cx: mx / Math.max(1, px.length), bottom, rs: p.rs };
  });
  const runes = RUNES.map((r) => {
    const id = new ImageData(C.w, C.h); let sx = 0, sy = 0, ns = 0;
    for (const k of byR.get(r)!) { const i = k * 4, a = d[i + 3]!; if (isSym(d[i]!, d[i + 1]!, d[i + 2]!, a)) { id.data.set([Math.min(255, d[i]! + 40), Math.min(255, d[i + 1]! + 50), 255, a], i); sx += k % C.w; sy += (k / C.w) | 0; ns++; } }
    return { cv: put(id), x: sx / Math.max(1, ns), y: sy / Math.max(1, ns), r };
  });
  const sil = mkCv(C.w, C.h); sil.getContext('2d')!.drawImage(img, 0, 0);
  return { pieces, runes, sil };
}

export interface GateView {
  /** 조각 수 (명단) · 놓인 조각(학생 통과) · 뼈대 완성(현자가 남은 조각) */
  n: number; placed: number; full: boolean;
  /** ⚡ 에너지 */ e: number;
  /** 🌀 문 열림 (0 ~ 1 · 열린 그림 = 마왕성이 처음 보임) */ open?: number;
}
interface Fly { k: number; t0: number; dur: number; dx: number; dy: number; sage: boolean }
interface Dot { x: number; y: number; vx: number; vy: number; r: number; a: number; c: string; g: number; f: number; to?: { x: number; y: number } }
const ease = (t: number) => (t < 0.75 ? 1 - (1 - t / 0.75) ** 3 : 1 + 0.05 * Math.sin(((t - 0.75) / 0.25) * Math.PI) * (1 - (t - 0.75) / 0.25)); // 빠르게 날아와 살짝 튕김 (anim2.py)

export class GateDraw {
  private ctx: CanvasRenderingContext2D;
  private img: { bg?: Img; done?: Img; hole?: Img; open?: Img } = {};
  private art: ReturnType<typeof build> | null = null;
  private pn = -1;
  private v: GateView = { n: 0, placed: 0, full: false, e: 0 };
  private shown = 0;
  private flies: Fly[] = [];
  private dots: Dot[] = [];
  private shake = 0; private raf = 0; private last = 0; private alive = true; private slow: ReturnType<typeof setTimeout> | undefined;
  /** 에너지 (그림이 부드럽게 따라감) · 맥박 · 소용돌이 각도 · 켜진 룬 (새로 켜질 때 반짝) */
  private eA = 0; private pulse = 0; private ang = 0; private runeN = 0; private runeFlash: number[] = [];
  private swirl = mkCv(BX.w, BX.h);
  /** 조각이 놓인 때 (🧩 용사 반응 2차 자리) */
  onLand: ((k: number, sage: boolean) => void) | null = null;
  constructor(private cv: HTMLCanvasElement, private o: { anim: boolean; crop?: [number, number, number, number] } = { anim: true }) {
    const [, , w, h] = o.crop ?? [0, 0, GATE_ART.W, GATE_ART.H];
    cv.width = w; cv.height = h;
    this.ctx = cv.getContext('2d')!;
    void Promise.all([load(GATE_ART.bg), load(GATE_ART.done), load(GATE_ART.hole), load(GATE_ART.open)]).then(([bg, done, hole, open]) => { this.img = { bg, done, hole, open }; this.rebuild(); this.kick(); }).catch(() => {});
  }
  private rebuild() { if (!this.img.done || this.pn === this.v.n) return; this.art = this.v.n > 0 ? build(this.img.done, this.v.n) : null; this.pn = this.v.n; this.glows.clear(); }
  private target() { return Math.min(this.v.n, this.v.full ? this.v.n : this.v.placed); }
  /** 처음 값 = 움직임 없이 그대로 */
  init(v: GateView) { this.v = { ...v }; this.rebuild(); this.shown = this.target(); this.eA = v.e; this.runeN = runesOn(v.e); this.kick(); }
  /** 값이 바뀜 = 새 조각은 0.6초 간격으로 날아옴 · 현자 = 남은 조각 빠르게 (빛은 켜지지 않음) */
  set(v: GateView) {
    const was = { ...this.v }; this.v = { ...v };
    if (v.n !== was.n) { this.rebuild(); this.shown = Math.min(this.shown, this.target()); }
    const goal = this.target(), queued = this.shown + this.flies.length, now = performance.now();
    if (!this.o.anim) { this.shown = goal; this.flies = []; this.eA = v.e; this.runeN = runesOn(v.e); this.kick(); return; }
    let at = Math.max(now, ...this.flies.map((f) => f.t0 + 600));
    for (let k = queued; k < goal; k++) {
      const sage = k >= Math.min(v.n, v.placed), side = (k % 2 ? 1 : -1) * (40 + ((k * 37) % 80));
      this.flies.push({ k, t0: at, dur: sage ? 520 : 820, dx: side, dy: -260 - (k % 3) * 40, sage }); at += sage ? 220 : 600;
    }
    if (goal < this.shown) { this.shown = goal; this.flies = []; }
    this.kick();
  }
  /** ⚡ +1 = 소용돌이 · 룬 · 테두리 맥박 + 빛 구슬이 문으로 빨려 듦 */
  light() {
    if (!this.o.anim) return;
    this.pulse = 1; const cx = BX.x + BX.w / 2, cy = BX.y + BX.h * 0.55;
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, R = 380 + Math.random() * 160; this.dots.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.6, vx: 0, vy: 0, r: 3 + Math.random() * 2.5, a: 1, c: i % 3 ? '#9fe6ff' : '#e6dbff', g: 0, f: 0.995, to: { x: cx, y: cy } }); }
    this.kick();
  }
  stop() { this.alive = false; cancelAnimationFrame(this.raf); clearTimeout(this.slow); }
  private kick() { if (!this.alive || this.raf) return; clearTimeout(this.slow); this.raf = requestAnimationFrame((t) => this.frame(t)); }
  private dust(p: PieceArt, sage: boolean) {
    const x = C.x + p.cx * C.s, y = C.y + p.bottom * C.s;
    for (let i = 0; i < (sage ? 6 : 14); i++) this.dots.push({ x: x + (Math.random() - 0.5) * 60, y: y - Math.random() * 6, vx: (Math.random() - 0.5) * 3.2, vy: -Math.random() * 1.8, r: 3 + Math.random() * 3, a: 0.6, c: sage ? '#b7c4d6' : '#968c7d', g: 0.04, f: 0.9 });
  }
  /** 그 덩어리가 다 놓였나 (룬 · 빛은 놓인 돌에만) */
  private placedR(r: Region) { const ps = this.art?.pieces ?? []; let last = -1; ps.forEach((p, k) => { if (p.rs.includes(r)) last = k; }); return last >= 0 && last < this.shown; }
  private frame(t: number) {
    this.raf = 0; if (!this.alive) return;
    const dt = Math.min(64, this.last ? t - this.last : 16); this.last = t;
    const { ctx } = this, [ox, oy, w, h] = this.o.crop ?? [0, 0, GATE_ART.W, GATE_ART.H], v = this.v, A = this.art, S = C.s;
    let busy = false;
    for (const f of [...this.flies]) if (t >= f.t0 + f.dur) { this.flies.splice(this.flies.indexOf(f), 1); this.shown = Math.max(this.shown, f.k + 1); const p = A?.pieces[f.k]; if (p) this.dust(p, f.sage); this.shake = Math.max(this.shake, f.sage ? 2 : 6); this.onLand?.(f.k, f.sage); }
    // ⚡ 에너지 따라가기 · 룬이 새로 켜지면 큰 반짝임
    if (Math.abs(this.eA - v.e) > 0.02) { this.eA += (v.e - this.eA) * Math.min(1, dt / 350); busy = true; } else this.eA = v.e;
    const rn = runesOn(this.eA);
    if (rn > this.runeN && this.o.anim && A) for (let k = this.runeN; k < rn; k++) { this.runeFlash[k] = t; const ru = A.runes[k]; if (ru) for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3; this.dots.push({ x: C.x + ru.x * S, y: C.y + ru.y * S, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.2, a: 1, c: '#c8f4ff', g: 0, f: 0.92 }); } }
    this.runeN = rn;
    const lvl = Math.min(1, Math.max(0, this.eA) / E_BASE), e = this.eA, gold = e >= 144, pl = this.pulse;
    if (this.pulse > 0.01) { this.pulse *= Math.pow(0.9, dt / 16); busy = true; } else this.pulse = 0;
    ctx.save(); ctx.clearRect(0, 0, w, h); ctx.translate(-ox, -oy);
    if (this.shake > 0.3) { ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake * 0.6); this.shake *= 0.86; busy = true; } else this.shake = 0;
    ctx.imageSmoothingEnabled = false;
    if (this.img.bg) ctx.drawImage(this.img.bg, 0, 0, GATE_ART.W, GATE_ART.H);
    const gateUp = !!A && this.shown >= A.pieces.length; // 문이 다 선 뒤에만 빛
    // 🌀 문 안 소용돌이 (에너지 0 = 어둠 · 108 = 문 안 가득 · 빨라짐) — 문이 다 선 뒤에만
    let live = false;
    if (gateUp && lvl > 0 && this.img.hole) { this.ang += (0.4 + 2.6 * lvl) * (dt / 1000) * (this.o.anim ? 1 : 0); this.drawSwirl(lvl, pl); ctx.drawImage(this.swirl, BX.x, BX.y); live = this.o.anim; }
    // 테두리 빛 (에너지만큼 · 144 금빛 · 맥박)
    if (gateUp && lvl > 0 && A) { const g = this.glow(gold ? '#ffd25a' : '#46beff'); ctx.globalAlpha = Math.min(1, 0.15 + 0.75 * lvl + 0.5 * pl) * (this.o.anim ? 0.85 + 0.15 * Math.sin(t / 600) : 1); ctx.drawImage(g, C.x - 40, C.y - 40); ctx.globalAlpha = 1; }
    // 조각 (룬 = 늘 어둡게)
    if (A) for (let k = 0; k < Math.min(this.shown, A.pieces.length); k++) ctx.drawImage(A.pieces[k]!.dim, C.x, C.y, C.w * S, C.h * S);
    if (A) for (const f of this.flies) {
      const p = A.pieces[f.k]; if (!p || t < f.t0) { busy = true; continue; }
      const u = Math.min(1, (t - f.t0) / f.dur), q = ease(u);
      ctx.globalAlpha = Math.min(1, u * 3); ctx.drawImage(p.dim, C.x + f.dx * (1 - q), C.y + f.dy * (1 - q), C.w * S, C.h * S); ctx.globalAlpha = 1; busy = true;
    }
    // ✨ 켜진 룬 (아래 기둥부터 · 맥박 · 새로 켜진 룬 = 0.8초 크게)
    if (A) for (let k = 0; k < rn; k++) {
      const ru = A.runes[k]!; if (!this.placedR(ru.r)) continue;
      const fl = this.runeFlash[k] ? Math.max(0, 1 - (t - this.runeFlash[k]!) / 800) : 0; if (fl > 0) busy = true;
      ctx.save(); ctx.shadowColor = '#8ce6ff'; ctx.shadowBlur = 10 + 20 * pl + 30 * fl; ctx.globalAlpha = Math.min(1, 0.85 + 0.15 * pl + fl);
      ctx.drawImage(ru.cv, C.x, C.y, C.w * S, C.h * S); if (fl > 0.2) ctx.drawImage(ru.cv, C.x, C.y, C.w * S, C.h * S);
      ctx.restore();
    }
    // 🌀 문 열림 = 열린 그림(마왕성이 처음 보임)
    const open = Math.max(0, Math.min(1, v.open ?? 0));
    if (open > 0 && this.img.open) { ctx.globalAlpha = open; ctx.drawImage(this.img.open, 0, 0, GATE_ART.W, GATE_ART.H); ctx.globalAlpha = 1; if (open < 1) busy = true; }
    // ✨ 각성: 180 = 룬에서 불티 · 216 = 별빛
    if (this.o.anim && A && e >= 180 && Math.random() < 0.3) { const ru = A.runes[(Math.random() * A.runes.length) | 0]!; this.dots.push({ x: C.x + ru.x * S, y: C.y + ru.y * S, vx: (Math.random() - 0.5) * 1.2, vy: -0.8 - Math.random(), r: 1.6, a: 0.9, c: '#ffe08a', g: -0.005, f: 0.985 }); }
    if (this.o.anim && e >= 216 && Math.random() < 0.35) this.dots.push({ x: 380 + Math.random() * 620, y: 10 + Math.random() * 400, vx: 0, vy: 0.1, r: 1.4 + Math.random() * 1.4, a: 1, c: '#fffbe0', g: 0, f: 0.975 });
    // 점 (빛 구슬 = 문 가운데로 빨려 듦)
    for (const d of this.dots) {
      if (d.to) { const dx = d.to.x - d.x, dy = d.to.y - d.y, L = Math.hypot(dx, dy) || 1, sp = Math.min(L, (6 + (420 - Math.min(420, L)) * 0.04) * (dt / 16)); d.x += (dx / L) * sp; d.y += (dy / L) * sp; if (L < 12) d.a = 0; }
      else { d.x += d.vx * (dt / 16); d.y += d.vy * (dt / 16); d.vy += d.g * (dt / 16); d.a *= Math.pow(d.f, dt / 16); }
      ctx.globalAlpha = Math.max(0, d.a); ctx.fillStyle = d.c; ctx.fillRect(Math.round(d.x - d.r), Math.round(d.y - d.r), Math.ceil(d.r * 2), Math.ceil(d.r * 2));
    }
    ctx.globalAlpha = 1; this.dots = this.dots.filter((d) => d.a > 0.04);
    ctx.restore();
    if (this.dots.length) busy = true;
    if (this.o.anim && (busy || this.flies.length)) this.raf = requestAnimationFrame((tt) => this.frame(tt));
    else if (live || (this.o.anim && gateUp && lvl > 0)) this.slow = setTimeout(() => this.kick(), 50); // 소용돌이 · 숨 쉬는 빛만 = 20fps (교실 PC)
  }
  /** 문 안 소용돌이 한 장 (문 안 모양 가면 · 크기 = 에너지 · 맥박 = 밝게) */
  private drawSwirl(lvl: number, pl: number) {
    const c = this.swirl.getContext('2d')!, W = BX.w, H = BX.h, cx = W / 2, cy = H * 0.55, R = (0.12 + 0.98 * lvl) * Math.hypot(W, H) * 0.55;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(220,250,255,${0.85 * Math.min(1, lvl * 1.6) + 0.15 * pl})`); g.addColorStop(0.35, `rgba(70,190,255,${0.75 * Math.min(1, lvl * 1.4)})`); g.addColorStop(0.75, `rgba(40,70,200,${0.5 * lvl})`); g.addColorStop(1, 'rgba(10,20,60,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) { // 나선 팔
      c.beginPath();
      for (let s = 0; s <= 40; s++) { const u = s / 40, a = this.ang + arm * (Math.PI / 2) + u * 4.2, r = u * R; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 1.15; if (s) c.lineTo(x, y); else c.moveTo(x, y); }
      c.strokeStyle = `rgba(180,240,255,${(0.25 + 0.45 * lvl + 0.3 * pl).toFixed(3)})`; c.lineWidth = 3 + 7 * lvl; c.stroke();
    }
    c.globalCompositeOperation = 'destination-in'; c.drawImage(this.img.hole!, 0, 0, W, H); c.globalCompositeOperation = 'source-over';
  }
  private glows = new Map<string, HTMLCanvasElement>();
  /** 테두리 빛 (문 모양을 흐리게 · 색마다 한 번 만들어 둠) */
  private glow(col: string): HTMLCanvasElement {
    let g = this.glows.get(col); if (g) return g;
    const W = C.w * C.s + 80, Hh = C.h * C.s + 80; g = mkCv(W, Hh);
    const c = g.getContext('2d')!; c.shadowColor = col; c.shadowBlur = 34; c.shadowOffsetX = W; c.imageSmoothingEnabled = false;
    if (this.art) c.drawImage(this.art.sil, 40 - W, 40, C.w * C.s, C.h * C.s); // 그림은 밖으로 · 그림자만 안에
    this.glows.set(col, g); return g;
  }
}
