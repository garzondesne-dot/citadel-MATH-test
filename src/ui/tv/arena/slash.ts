// ⚔ 용사 스킬 fx 새로 짓기 — 시제품 「⚔ 베기 Ⅰ~Ⅳ」 (2026-11-13 머리 🔨 · 선생님 「완전 새롭고 세련되게」 → 「B 시제품 먼저」)
//   구운 띠 1장 → PixiJS 로 그 자리에서 여러 겹: 계열 레시피(궤적 모양 · 색 3톤 + 흰 하이라이트 · 입자 · 소리 자리) × 단계 겹(Ⅰ 궤적 → Ⅱ + 번쩍 · 잔상 → Ⅲ + 입자 · 히트 스톱 → Ⅳ + 충격파 · 흔들림 · Glow)
//   숫자 = 아래 NUM 표 하나 (고치면 모두 바뀜) · 도트 = 낮은 해상도 렌더 텍스처(1/PIXEL) 하나에 모든 이펙트를 그려 nearest 로 키움 → 30개여도 그리기 한 번
//   TV 에서만(학생 폰 = 구운 띠 · tools/fxbake) · 필터 동시 2개까지 · 「동작 줄이기」 = 흔들림 · 번쩍 끔 · 🎆 화려한 연출 끔 = Ⅰ 궤적만
//   성능 (머리 📎 기준): 교실 TV 보통 사무용 PC · 30명 동시에도 50fps → 동시 상한 MAX_LIVE · 실제 fps 를 재서 50 아래면 한 단계씩 덜어 냄(입자 → 필터 → 겹) · 회복하면 되돌림 · 줄 서다 늦으면 지금 띠로
import { Container, Graphics, RenderTexture, Sprite, type Application } from 'pixi.js';
import { GlowFilter, ShockwaveFilter } from 'pixi-filters';

/** 단계 겹 · 길이 · 크기 표 (머리 요청 길이 Ⅰ 0.35 · Ⅱ 0.45 · Ⅲ 0.6 · Ⅳ 0.9) */
export const NUM = {
  PIXEL: 3, // 낮은 해상도 = 실제의 1/3 → nearest 로 3배
  MAX_LIVE: 6, // 동시 이펙트 상한 (넘치면 줄 · 0.6초 넘게 기다리면 지금 띠)
  WAIT_MAX: 600,
  BLUR_MAX: 0.3, // 번짐 계열(Glow · 충격파 번짐) = 0.3초 안 순간만
  FILTER_MAX: 2,
  FPS_LOW: 50, FPS_OK: 57,
  tiers: [
    { name: 'Ⅰ', dur: 0.35, arcs: 1, cross: false, len: 1.0, thick: 0.22, ghosts: 0, flash: 0, sparks: 0, hitstop: 0, shock: false, shake: 0, glow: false },
    { name: 'Ⅱ', dur: 0.45, arcs: 1, cross: false, len: 1.12, thick: 0.26, ghosts: 2, flash: 0.55, sparks: 0, hitstop: 0, shock: false, shake: 0, glow: false },
    { name: 'Ⅲ', dur: 0.6, arcs: 3, cross: false, len: 1.18, thick: 0.24, ghosts: 2, flash: 0.75, sparks: 16, hitstop: 0.06, shock: false, shake: 1, glow: false },
    { name: 'Ⅳ', dur: 0.9, arcs: 2, cross: true, len: 1.45, thick: 0.3, ghosts: 3, flash: 1, sparks: 26, hitstop: 0.08, shock: true, shake: 3, glow: true },
  ],
  shake: [0, 2, 4, 7], // 화면 흔들림 3단계(px · 감쇠 0.25초)
};
/** 계열 레시피 (나머지 13계열도 이 꼴로 더함) */
export const RECIPES: Record<string, { shape: 'crescent'; colors: [number, number, number]; hi: number; spark: 'square' | 'shard'; sound: string }> = {
  cut: { shape: 'crescent', colors: [0x0b3f78, 0x2f8fe0, 0xa8e2ff], hi: 0xffffff, spark: 'square', sound: 'cut' },
};
/** 🌙 쌍월 참(Ⅳ) 시제품 3가지 (🔨 2026-11-13 밤 평가판 👎 「쌍월이면 대표 스킬인데 신경 써 줘 · 하나도 안 멋져」 · 머리 📎 「NUM · RECIPES 값만 다르게」)
 *  A = 지금 Ⅳ · B = 초승달 두 개가 X 로 엇갈림(둘째 0.07초 뒤) + 맞는 순간 큰 흰 번쩍 + 파편 많이 · C = 더 두꺼운 호 + 잔상 길게(6겹 · 진하게)
 *  선생님이 고르면 고른 값이 Ⅳ 기본이 되고 나머지 계열로 넓힘 */
import { twinOf, type TwinV } from '../../fx/twin';
export { setTwin, twinOf, type TwinV } from '../../fx/twin';
type TwinX = { rad?: number; len?: number; thick?: number; ghosts?: number; flash?: number; sparks?: number; dur?: number; stagger?: number; bigFlash?: number; shards?: boolean; ghostGap?: number; ghostAlpha?: number; sweep?: number };
export const TWIN: Record<TwinV, TwinX> = {
  a: {},
  // rad = 호 반지름 배율(작을수록 많이 휨 = 초승달 · 긴 직선 꼬리 없음) · sweep = 호가 도는 각
  b: { rad: 0.5, len: 1.4, thick: 0.34, ghosts: 2, sparks: 46, stagger: 0.07, bigFlash: 1, shards: true, sweep: 1.05 },
  c: { rad: 0.56, len: 1.5, thick: 0.5, ghosts: 6, ghostGap: 0.07, ghostAlpha: 0.5, sparks: 30, dur: 1.0, sweep: 1.0 },
};
export type SlashO = { x: number; y: number; w: number; h: number; dir: number; tier: number; fam?: string; seed?: number; onImpact?: () => void; /** 쌍월 시제품 (없으면 지금 고른 것) */ v?: TwinV };

// 고정 난수 (같은 seed = 같은 그림 · 굽기와 실제가 같게)
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const ease = (p: number) => 1 - (1 - p) * (1 - p);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number; col: number };
/** 이펙트 하나 = t(초)의 순수 함수로 그림 (굽기 도구가 칸마다 부름) */
export class SlashFx {
  g = new Graphics(); t = 0; done = false; impacted = false; level = 0;
  T: (typeof NUM.tiers)[number] & TwinX; C: (typeof RECIPES)[string]; sparks: Spark[] = []; r: () => number;
  constructor(public o: SlashO, level = 0) { const T0 = NUM.tiers[clamp(o.tier, 0, 3)]!; this.T = o.tier >= 3 ? { ...T0, ...TWIN[o.v ?? twinOf()] } : T0; this.C = RECIPES[o.fam || 'cut'] ?? RECIPES.cut!; this.r = rng(o.seed ?? 7); this.level = level; this.makeSparks(); }
  get impactT() { return this.T.dur * 0.32; }
  makeSparks() {
    const n = Math.round(this.T.sparks * (this.level >= 1 ? 0.5 : 1)); this.sparks = [];
    const wide = this.T.shards ? 2.6 : 1.6, fast = this.T.shards ? 1.5 : 1;
    for (let i = 0; i < n; i++) { const a = (this.r() - 0.5) * wide + (this.o.dir > 0 ? 0 : Math.PI), sp = (30 + this.r() * 70) * fast; this.sparks.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25, life: 0.25 + this.r() * 0.3, size: this.r() < (this.T.shards ? 0.6 : 0.3) ? 2 : 1, col: this.r() < 0.4 ? this.C.hi : this.C.colors[2] }); }
  }
  /** 초승달 궤적 하나: 중심 (cx, cy) · 반지름 R · 각 a0→a1 · 머리 hp · 꼬리 tp (0~1) · 두께 th · 투명도 al */
  crescent(cx: number, cy: number, R: number, a0: number, a1: number, hp: number, tp: number, th: number, al: number) {
    if (hp <= tp || al <= 0.02) return;
    const g = this.g, N = 18, [c0, c1, c2] = this.C.colors;
    const band = (r0: number, r1: number, col: number, a: number) => {
      const pts: number[] = [];
      for (let i = 0; i <= N; i++) { const u = tp + (hp - tp) * (i / N), ang = a0 + (a1 - a0) * u, taper = Math.sin(Math.PI * ((u - tp) / Math.max(0.001, hp - tp))) ** 0.6; pts.push(cx + Math.cos(ang) * (R - (R - r1) * taper), cy + Math.sin(ang) * (R - (R - r1) * taper)); }
      for (let i = N; i >= 0; i--) { const u = tp + (hp - tp) * (i / N), ang = a0 + (a1 - a0) * u; pts.push(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); }
      g.poly(pts).fill({ color: col, alpha: a });
    };
    band(R, R - th * R, c0, al * 0.9); band(R * (1 - th * 0.15), R - th * R * 0.75, c1, al); band(R * (1 - th * 0.2), R - th * R * 0.38, c2, al);
    // 흰 하이라이트 = 머리 쪽 가는 선
    const pts: number[] = []; const h0 = Math.max(tp, hp - 0.35);
    for (let i = 0; i <= 10; i++) { const u = h0 + (hp - h0) * (i / 10), ang = a0 + (a1 - a0) * u; pts.push(cx + Math.cos(ang) * R * (1 - th * 0.22), cy + Math.sin(ang) * R * (1 - th * 0.22)); }
    g.moveTo(pts[0]!, pts[1]!); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!); g.stroke({ width: 1, color: this.C.hi, alpha: al });
  }
  /** t 초의 모습을 그림 (낮은 해상도 좌표) */
  draw(t: number, fancy = true, reduce = false) {
    const g = this.g, o = this.o, T = fancy ? this.T : NUM.tiers[0]!, d = this.T.dur; g.clear();
    const cx = o.x, cy = o.y, R = Math.max(o.w, o.h) * 0.85 * T.len * (this.T.rad ?? 1), dir = o.dir;
    const arcs = this.level >= 3 ? Math.min(1, T.arcs) : T.arcs;
    for (let k = 0; k < arcs; k++) {
      const off = T.cross ? k * (this.T.stagger ?? 0) : k * 0.12 * d, tt = t - off; if (tt < 0) continue;
      const span = T.dur * 0.75, p = clamp(tt / span), hp = ease(clamp(p / 0.55)), tp = clamp((p - 0.2) / 0.8) ** 1.4, al = 1 - clamp((p - 0.7) / 0.3);
      // 각: 궤적 가운데가 맞는 점(몸통 가운데)을 지나게 — 호의 중심을 맞는 점에서 R 만큼 떨어뜨림 · 용사 쪽에서 출발 → 몬스터 쪽으로 긋기 · Ⅳ 쌍월 = 엇갈린 두 줄 · Ⅲ = 조금씩 비켜 세 줄
      const flip = T.cross && k === 1 ? -1 : 1, phi = dir > 0 ? (flip > 0 ? Math.PI * 0.78 : Math.PI * 1.22) : (flip > 0 ? Math.PI * 0.22 : -Math.PI * 0.22);
      const rr = R * (1 - (T.cross ? 0 : k * 0.07)), hx = cx + (T.cross ? 0 : (k - (arcs - 1) / 2) * o.w * 0.16 * dir), hy = cy + (T.cross ? 0 : (k - (arcs - 1) / 2) * o.h * 0.1);
      const ox = hx - Math.cos(phi) * rr, oy = hy - Math.sin(phi) * rr, half = (this.T.sweep ?? 0.78) * Math.min(1.2, T.len), sg = (dir > 0 ? 1 : -1) * flip; // 📜 2026-11-13 밤 선생님 「A 인데 용사 기준 왼쪽에서 오른쪽 공격이 방향이 맞아 보임」 → 머리 = 용사 쪽에서 출발해 몬스터 쪽으로 (옛 = 반대)
      const a0 = phi + half * sg, a1 = phi - half * sg;
      const gg = this.T.ghostGap ?? 0.14, ga = this.T.ghostAlpha ?? 0.22;
      if (fancy && this.level < 3) for (let gi = T.ghosts; gi >= 1; gi--) this.crescent(ox, oy, rr, a0 + gg * gi * sg, a1 + gg * gi * sg, hp, tp, T.thick, al * (ga / (ga > 0.3 ? Math.sqrt(gi) : gi)));
      this.crescent(ox, oy, rr, a0, a1, hp, tp, T.thick, al);
    }
    // 번쩍 (맞는 순간 0.08초 · 동작 줄이기 = 끔)
    const it = this.impactT;
    // 번쩍 = 네 갈래 빛살 + 작은 흰 점 (0.1초 · 원판 대신)
    if (fancy && T.flash && !reduce && this.level < 3 && t >= it && t < it + 0.1) {
      const q = (t - it) / 0.1, L0 = Math.max(o.w, o.h) * (0.35 + 0.25 * q) * T.len, w0 = Math.max(1, 3 * (1 - q)), a = T.flash * (1 - q);
      for (const [dx, dy] of [[1, 0], [0, 1], [0.7, 0.7], [0.7, -0.7]] as const) { const l = dx && dy ? L0 * 0.55 : L0; g.poly([cx - dx * l, cy - dy * l, cx + dy * w0, cy - dx * w0, cx + dx * l, cy + dy * l, cx - dy * w0, cy + dx * w0]).fill({ color: this.C.hi, alpha: a }); }
      g.circle(cx, cy, Math.max(2, Math.max(o.w, o.h) * 0.08 * (1 - q))).fill({ color: this.C.hi, alpha: a });
    }
    // 💥 큰 흰 번쩍 (쌍월 B · 맞는 순간 0.14초 · 흰 원이 퍼지며 사라짐 + 빛살 1.6배)
    const bf = this.T.bigFlash ?? 0;
    if (fancy && bf && !reduce && this.level < 3 && t >= it && t < it + 0.14) {
      const q = (t - it) / 0.14, Rr = Math.max(o.w, o.h) * (0.25 + 0.55 * q) * T.len;
      g.circle(cx, cy, Rr).fill({ color: 0xffffff, alpha: bf * 0.85 * (1 - q) ** 1.5 }); g.circle(cx, cy, Rr * 0.55).fill({ color: this.C.colors[2], alpha: bf * 0.6 * (1 - q) });
      const L1 = Rr * 1.6, w1 = Math.max(1, 4 * (1 - q));
      for (const [dx, dy] of [[0.7, 0.7], [0.7, -0.7]] as const) g.poly([cx - dx * L1, cy - dy * L1, cx + dy * w1, cy - dx * w1, cx + dx * L1, cy + dy * L1, cx - dy * w1, cy + dx * w1]).fill({ color: 0xffffff, alpha: bf * (1 - q) });
    }
    // 입자 (맞는 순간부터 · 단순 물리 · 정사각 도트 · 쌍월 B = 날아가는 방향으로 긴 파편)
    if (fancy && t >= it) { const st = t - it, sh = !!this.T.shards; for (const s of this.sparks) { if (st > s.life) continue; const x = cx + s.vx * st, y = cy + s.vy * st + 60 * st * st, a = 1 - st / s.life;
      if (sh && s.size > 1) { const vy = s.vy + 120 * st, m = Math.hypot(s.vx, vy) || 1, L = 4; g.moveTo(Math.round(x), Math.round(y)).lineTo(Math.round(x - (s.vx / m) * L), Math.round(y - (vy / m) * L)).stroke({ width: 1, color: s.col, alpha: a }); }
      else g.rect(Math.round(x), Math.round(y), s.size, s.size).fill({ color: s.col, alpha: a }); } }
    if (t >= it && !this.impacted) { this.impacted = true; o.onImpact?.(); }
    if (t >= this.T.dur + (fancy ? 0.35 : 0)) this.done = true;
  }
}

/** 화면 층: 낮은 해상도 렌더 텍스처 하나 + nearest 로 키운 스프라이트 · 이펙트 줄 · fps 재기 · 자동 덜어 내기 */
export class SlashLayer {
  draw = new Container(); rt: RenderTexture; out: Sprite; live: SlashFx[] = []; queue: { o: SlashO; at: number; fall: () => void }[] = [];
  level = 0; fps = 60; lowT = 0; okT = 0; filters = 0; fancy = true; reduce = false; forceLevel: number | null = null;
  shakeT = 0; shakeAmp = 0;
  constructor(public app: Application, public host: Container, public scene: Container, W: number, H: number) {
    this.rt = RenderTexture.create({ width: Math.ceil(W / NUM.PIXEL), height: Math.ceil(H / NUM.PIXEL), scaleMode: 'nearest', antialias: false, resolution: 1 });
    this.out = new Sprite(this.rt); this.out.scale.set(NUM.PIXEL); this.out.visible = false; host.addChild(this.out);
    this.reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    app.ticker.add(this.tick);
  }
  resize(W: number, H: number) { this.rt.resize(Math.ceil(W / NUM.PIXEL), Math.ceil(H / NUM.PIXEL)); }
  /** 새 이펙트 · false = 받지 못함(호출한 쪽이 지금 띠로) · 화면 좌표 */
  add(o: SlashO, fall: () => void): boolean {
    const P = NUM.PIXEL, lo: SlashO = { ...o, x: o.x / P, y: o.y / P, w: o.w / P, h: o.h / P };
    if (this.level >= 4) return false; // 너무 느림 = 지금 띠가 낫다
    if (this.live.length >= (this.level >= 2 ? 3 : NUM.MAX_LIVE)) { this.queue.push({ o: lo, at: performance.now(), fall }); return true; }
    this.start(lo); return true;
  }
  private start(o: SlashO) {
    const tier = this.fancy ? o.tier : 0, f = new SlashFx({ ...o, tier }, this.level); this.live.push(f); this.draw.addChild(f.g);
    const T = NUM.tiers[clamp(tier, 0, 3)]!;
    const imp = o.onImpact; f.o.onImpact = () => {
      imp?.();
      if (!this.fancy) return;
      if (T.shake && !this.reduce) { this.shakeAmp = Math.max(this.shakeAmp, NUM.shake[T.shake] ?? 0); this.shakeT = 0.25; }
      if (T.hitstop) f.t -= T.hitstop; // ⏸ 히트 스톱 = 이 이펙트 시간을 잠깐 멈춤
      if (T.shock && this.level < 2 && this.filters < NUM.FILTER_MAX) this.shock(o.x * NUM.PIXEL, o.y * NUM.PIXEL, Math.max(o.w, o.h) * NUM.PIXEL);
      if (T.glow && this.level < 2 && this.filters < NUM.FILTER_MAX) this.glow();
    };
  }
  private shock(x: number, y: number, size: number) {
    const f = new ShockwaveFilter({ center: { x, y }, amplitude: 18, wavelength: 90, brightness: 1.15, speed: Math.max(400, size * 3), radius: size * 2.4, time: 0 });
    this.filters += 1; this.scene.filterArea = this.app.screen; this.scene.filters = [...((this.scene.filters as unknown[]) || []), f] as never;
    const t0 = performance.now(), step = () => { const s = (performance.now() - t0) / 1000; f.time = s; if (s < NUM.BLUR_MAX + 0.25) requestAnimationFrame(step); else { this.scene.filters = ((this.scene.filters as unknown[]) || []).filter((x) => x !== f) as never; this.filters -= 1; f.destroy(); } };
    requestAnimationFrame(step);
  }
  private glow() {
    const f = new GlowFilter({ distance: 6, outerStrength: 2.2, innerStrength: 0, color: 0xcfeeff, quality: 0.2 });
    this.filters += 1; this.out.filters = [f];
    setTimeout(() => { this.out.filters = []; this.filters -= 1; f.destroy(); }, NUM.BLUR_MAX * 1000);
  }
  private tick = () => {
    const dt = Math.min(0.05, this.app.ticker.deltaMS / 1000), real = this.app.ticker.deltaMS / 1000; // 이펙트 시간 = 최대 0.05초씩 · fps 판단 = 실제 흐른 시간
    // fps (부드럽게) · 50 아래 1초 = 한 단계 덜어 냄 · 57 위 3초 = 한 단계 되돌림
    this.fps = this.fps * 0.9 + (1000 / Math.max(1, this.app.ticker.deltaMS)) * 0.1;
    if (this.forceLevel != null) this.level = this.forceLevel;
    else if (this.live.length) { if (this.fps < NUM.FPS_LOW) { this.lowT += real; this.okT = 0; if (this.lowT > 1 && this.level < 4) { this.level += 1; this.lowT = 0; } } else if (this.fps > NUM.FPS_OK) { this.okT += real; this.lowT = 0; if (this.okT > 3 && this.level > 0) { this.level -= 1; this.okT = 0; } } }
    // 줄: 자리가 나면 시작 · 너무 오래 기다리면 지금 띠
    while (this.queue.length && this.live.length < (this.level >= 2 ? 3 : NUM.MAX_LIVE)) { const q = this.queue.shift()!; if (performance.now() - q.at > NUM.WAIT_MAX) q.fall(); else this.start(q.o); }
    if (!this.live.length) { if (this.out.visible) { this.out.visible = false; this.app.renderer.render({ container: this.draw, target: this.rt, clear: true }); } this.unshake(); return; }
    for (const f of this.live) { f.t += dt; f.draw(Math.max(0, f.t), this.fancy, this.reduce); }
    for (const f of this.live.filter((x) => x.done)) { this.draw.removeChild(f.g); f.g.destroy(); }
    this.live = this.live.filter((x) => !x.done);
    this.out.visible = true;
    this.app.renderer.render({ container: this.draw, target: this.rt, clear: true });
    // 📳 흔들림 (감쇠)
    if (this.shakeT > 0) { this.shakeT -= dt; const k = Math.max(0, this.shakeT / 0.25); this.scene.x = (Math.random() - 0.5) * 2 * this.shakeAmp * k; this.scene.y = (Math.random() - 0.5) * 2 * this.shakeAmp * k; if (this.shakeT <= 0) this.unshake(); }
  };
  private unshake() { if (this.scene.x || this.scene.y) { this.scene.x = 0; this.scene.y = 0; } this.shakeAmp = 0; }
  destroy() { this.app.ticker.remove(this.tick); this.rt.destroy(true); }
}
