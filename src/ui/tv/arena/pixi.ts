// 🎨 TV 전투 장면 = PixiJS 캔버스 (#157 · DECISIONS 「🎨 v1.0 PixiJS = 지금 TV 전투 장면부터」)
//   이 파일은 TV(?role=hall) 에서만 import() 로 불림 → 학생 폰 번들에 PixiJS 가 들어가지 않음(시험이 확인)
//   층 = 그림자 · 몬스터 · 체력 막대 · 용사단 · ✨ 이펙트 층(fx · 공격 · 데미지 · +EXP · 격파 · #152 · #161 몬스터 공격 이펙트가 여기에 붙음)
//   글자 판(위 막대 · 숫자 칸 · 조작 막대 · 문제 창 · 시연 폰)은 HTML 그대로 캔버스 위에
import { Application, Assets, ColorMatrixFilter, Container, Graphics, Particle, ParticleContainer, Rectangle, Sprite, Text, Texture, type TextureSource } from 'pixi.js';
import { ShockwaveFilter } from 'pixi-filters';
import { feat } from '../../../school/features.svelte';
import { arenaBox, partyLayout, TV_FS, TV_FW } from './layout';
import { SlashLayer, type SlashO } from './slash';
import { HERO, heroGeo, heroNudge, ICE, IDLE8, idle8Of, monNudge, monVis, spriteOf } from '../../manifest';
import { heroOf } from '../../../model/hero';

export interface Hero { u: string; hero: number; name: string; ok: boolean; off: boolean }
export interface ArenaState { boss: boolean; split: boolean; sprite: string; hp: { left: number; max: number } | null; hpLabel: string; down: boolean; shadow: boolean; heroes: Hero[] }
export interface Arena {
  readonly kind: 'pixi';
  update(st: ArenaState): void;
  hit(u: string, dmg: number, kind: 'hit' | 'miss' | 'practice'): void;
  /** ⚔ 정식 attack.js 를 DOM 층이 그릴 때: 그 용사 그림 숨김 · 몬스터만 반응(깜빡 · 흔들 · 숫자 · 베기 선 없음) */
  heroVisible(u: string, on: boolean): void;
  monHit(dmg: number, kind: 'hit' | 'miss' | 'practice', o?: HitO): void;
  /** 🎆 격파 예약: 다음 맞힘(1.5초 안 · 없으면 그때) = 마지막 일격 → 느리게 0.5초 · 충격파 · 조각 */
  armKill(): void;
  /** 🎆 화려한 연출 켬 · 끔 (🧩 스위치 · 동작 줄이기면 끔) */
  juice(on?: boolean): boolean;
  /** 시험: 마지막 격파 조각 수 · 가장 멀리 간 거리(px) · 충격파 붙었나 · 흔들림 최고 단계 */
  juiceStats(): { shards: number; far: number; wave: boolean; shake: number; stops: number };
  /** ⚔ 새 스킬 fx (시제품) · false = 못 받음 → 지금 띠 · 설정 · 상태(시험) */
  slash(o: SlashO, fall: () => void): boolean;
  slashCfg(c: { fancy?: boolean; level?: number | null }): void;
  slashStats(): { fps: number; level: number; live: number; queue: number };
  /** 🗿 석화 = 몬스터 회색 돌 · 둥실 멈춤 */
  stone(on: boolean): void;
  exp(u: string, text: string): void;
  banner(text: string | null): void;
  /** 🧊 얼음 공격 (2026-11-13): 용사마다 얼음 덩어리가 덮음 → ms 뒤 녹음 */
  freeze(ms: number): void;
  /** ✨ 이펙트 층 (#152 · #161 몬스터 공격 이펙트용) · 화면 크기 */
  fx: Container; size(): { W: number; H: number };
  destroy(): void;
}

/** 🎆 맞은 정도: perfect = 그 학생 다 맞힘(숫자 크고 노랗게) · ult = 필살기(흔들림 2단) */
export type HitO = { perfect?: boolean; ult?: boolean };
/** 🎆 화려한 연출 (🔨 TV 이펙트 첫 묶음 · 2026-11-13) — 숫자 표 하나 · 학생 폰 번들 0(이 파일은 TV 만)
 *  히트 스톱 · 흰 번쩍 · 흔들림 3단계(감쇠) · 데미지 숫자 튀어오름 · 격파 = 충격파 고리 + 조각 + 마지막 일격 느리게 */
export const JUICE = {
  STOP_MS: 55, STOP_PERFECT_MS: 75, // ⏸ 히트 스톱 0.05~0.08초 (닿는 순간 몬스터 · 용사 트윈 멈춤)
  FLASH_MS: 34, // ⚪ 흰 번쩍 = 1~2 프레임
  SHAKE: [0, 0.004, 0.008, 0.014] as const, SHAKE_MS: [0, 180, 280, 460] as const, // 📳 0 작은 공격 · 1 강타(퍼펙트 · 3↑) · 2 필살기 · 3 격파 (화면 높이 비율 · 감쇠)
  NUM_POP: 1.7, NUM_PERFECT: 1.45, // 🔢 튀어오름 처음 배율 · 퍼펙트 글자 배율(노랑)
  SLOW_MS: 500, SLOW: 0.35, // 🐢 마지막 일격 0.5초 느리게
  WAVE_MS: 300, SHARDS: 6, SHARD_MS: 900, // 💥 충격파 0.3초 안(번짐은 순간만) · 조각 6 × 6 · 0.9초
};
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** 🧩 ⚙ 우리 학교 기능 「✨ 화려한 연출」 + 동작 줄이기 + ?fancy=0 + 이 기기 설정 */
export const juiceDefault = () => { if (reduceMotion() || !feat('juice')) return false; try { if (typeof location !== 'undefined' && /[?&]fancy=0\b/.test(location.search)) return false; return localStorage.getItem('citadel-fancy') !== '0'; } catch { return true; } };
type Tween = { t0: number; ms: number; f: (p: number) => void; done?: () => void };
const ease = (p: number) => 1 - (1 - p) * (1 - p);

/** WebGL 이 없거나 실패하면 null → TV 는 DOM 장면으로 */
export async function createArena(host: HTMLElement, font: string): Promise<Arena | null> {
  const app = new Application();
  try { await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: false, roundPixels: true, preference: 'webgl', autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) }); }
  catch (e) { console.warn('PixiJS 시작 실패 → DOM 장면', e); try { app.destroy(); } catch { /* 무시 */ } return null; }
  if ((app.renderer as { type?: number }).type == null) return null;
  const cv = app.canvas as HTMLCanvasElement; cv.style.position = 'absolute'; cv.style.inset = '0'; cv.setAttribute('aria-hidden', 'true'); cv.dataset.arena = 'pixi';
  host.appendChild(cv);
  const W = () => app.screen.width, H = () => app.screen.height;
  const root = new Container(), shadowG = new Graphics(), monC = new Container(), hpC = new Container(), partyC = new Container(), fx = new Container();
  root.addChild(shadowG, monC, hpC, partyC, fx); app.stage.addChild(root);
  // ⚔ 새 스킬 fx 시제품 층 (slash.ts · 낮은 해상도 하나 · 장면 위) — 충격파 · 흔들림은 root 에
  const slashC = new Container(); app.stage.addChild(slashC);
  const SL = new SlashLayer(app, slashC, root, W(), H());
  app.renderer.on('resize', (w: number, h: number) => SL.resize(w, h));
  // 글자 = TV 한 글꼴 · 4 크기 · 2 굵기 (layout.TV_FS · TV_FW)
  const txt = (s: string, k: keyof typeof TV_FS, bold: boolean, fill: string | number, stroke = true) => new Text({ text: s, style: { fontFamily: font, fontSize: Math.round(H() * TV_FS[k]), fontWeight: String(bold ? TV_FW.bold : TV_FW.normal) as '700', fill, ...(stroke ? { stroke: { color: 0x000000, width: Math.max(2, H() * 0.004) } } : {}), align: 'center' } });

  const tex = new Map<string, Promise<TextureSource>>();
  const src = (url: string) => { let p = tex.get(url); if (!p) { p = Assets.load<Texture>(url).then((t) => { t.source.scaleMode = 'nearest'; return t.source; }); tex.set(url, p); } return p; };
  const frame = (s: TextureSource, x: number, y: number, w: number, h: number) => new Texture({ source: s, frame: new Rectangle(x, y, w, h) });

  // ── 트윈 · 애니메이션 ──
  const tweens = new Set<Tween>();
  // 🐢 가상 시계: 히트 스톱(0) · 느리게(0.35) 동안 트윈이 그만큼 늦게 흐름 · 실제 시간은 그대로
  let vt = performance.now(), lastT = vt, scale = 1, stopUntil = 0, slowUntil = 0;
  const tween = (ms: number, f: (p: number) => void, done?: () => void) => { tweens.add({ t0: vt, ms, f, done }); };
  let bob = 0, stoned = false, baseF: ColorMatrixFilter[] = [];
  const greyF = new ColorMatrixFilter(); greyF.greyscale(0.55, false);
  app.ticker.add(() => {
    const t = performance.now(); scale = t < stopUntil ? 0 : t < slowUntil ? JUICE.SLOW : 1; vt += (t - lastT) * scale; lastT = t;
    for (const w of [...tweens]) { const p = Math.min(1, (vt - w.t0) / w.ms); w.f(p); if (p >= 1) { tweens.delete(w); w.done?.(); } }
    bob = Math.round(Math.round(Math.sin(t / 520) * 2) / 2 * H() * 0.006); if (monSp && !st?.down && !stoned) monSp.y = Math.round(monY + bob); // 둥실 = #164 늘이기 없이 정수 px · 5단 계단
    if (t - heroT > 162) { heroT = t; heroF = (heroF + 1) % 8; for (const h of heroes.values()) if (!h.busy && h.tex) h.sp.texture = h.tex[(h.tex.length === 8 ? heroF : Math.floor(heroF / 2)) % h.tex.length]!; }
  });

  const visOf = (s: ArenaState) => { try { const sp = spriteOf(s.sprite); return monVis(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell); } catch { return 1; } };
  // ── 몬스터 ──
  let st: ArenaState | null = null, monSp: Sprite | null = null, monY = 0, monKey = '', monCx = 0, monTop = 0, monSize = 0;
  async function drawMon(s: ArenaState) {
    const sp = spriteOf(s.sprite), b = arenaBox(W(), H(), s.boss, s.split, visOf(s)), pose = s.down ? 'down' : 'idle', key = `${s.sprite}|${pose}|${W()}|${H()}|${s.split}|${s.shadow}`;
    monCx = b.mon.cx; monTop = b.mon.top; monSize = b.mon.size;
    shadowG.clear().ellipse(b.shadow.cx, b.shadow.y, b.shadow.w / 2, H() * 0.018).fill({ color: 0x000000, alpha: 0.45 });
    if (key === monKey) return; monKey = key;
    const so = await src(sp.url); if (key !== monKey) return;
    const col = sp.sheet.poses[pose], c = sp.sheet.cell, nd = monNudge(sp.sheet.src, sp.row, sp.sheet.poses.idle, c), k = b.mon.size / c;
    if (!monSp) { monSp = new Sprite(); monSp.anchor.set(0.5, 1); monC.addChild(monSp); }
    monSp.texture = frame(so, col * c, sp.row * c, c, c);
    monSp.scale.set(k); monSp.x = b.mon.cx + nd.dx * b.mon.size; monY = b.mon.top + b.mon.size + nd.dy * b.mon.size; monSp.y = monY;
    const f: ColorMatrixFilter[] = [];
    if (sp.hue) { const m = new ColorMatrixFilter(); m.hue(sp.hue, false); f.push(m); }
    if (s.shadow) { const m = new ColorMatrixFilter(); m.brightness(0.08, false); f.push(m); }
    baseF = f; monSp.filters = stoned ? [...f, greyF] : f;
  }
  // ── 체력 막대 (몬스터 바로 위 · 굵게 · 숫자) ──
  function drawHp(s: ArenaState) {
    hpC.removeChildren().forEach((c) => c.destroy());
    if (!s.hp || s.shadow) return;
    const b = arenaBox(W(), H(), s.boss, s.split, visOf(s)).hp, g = new Graphics(), r = b.h / 2, p = s.hp.max ? Math.max(0, s.hp.left) / s.hp.max : 0;
    g.roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, r + 3).fill({ color: 0x000000, alpha: 0.7 });
    g.roundRect(b.x, b.y, b.w, b.h, r).fill({ color: 0x2a0d10 });
    if (p > 0) g.roundRect(b.x, b.y, Math.max(b.h, b.w * p), b.h, r).fill({ color: 0xe5484d });
    g.roundRect(b.x, b.y, b.w, b.h * 0.45, r).fill({ color: 0xffffff, alpha: 0.12 });
    const n = txt(`HP ${s.hp.left} / ${s.hp.max}`, 'body', true, 0xffffff); n.anchor.set(0.5); n.x = b.x + b.w / 2; n.y = b.y + b.h / 2;
    const lab = txt(s.hpLabel, 'body', true, 0xffffff); lab.anchor.set(0.5, 1); lab.x = b.x + b.w / 2; lab.y = b.y - H() * 0.006;
    hpC.addChild(g, n, lab);
  }
  // ── 용사단 ──
  type HeroV = { c: Container; sp: Sprite; name: Text; tex: Texture[] | null; atk: Texture[] | null; busy: boolean; key: string; x: number; y: number; s: number };
  const heroes = new Map<string, HeroV>(); let heroT = 0, heroF = 0, partyKey = '';
  async function drawParty(s: ArenaState) {
    const slots = partyLayout(s.heroes.length, W(), H(), s.split), key = s.heroes.map((h) => `${h.u}:${h.hero}`).join(',') + `|${W()}|${H()}|${s.split}`;
    const keep = new Set(s.heroes.map((h) => h.u));
    for (const [u, h] of heroes) if (!keep.has(u)) { h.c.destroy({ children: true }); heroes.delete(u); }
    for (let i = 0; i < s.heroes.length; i++) {
      const hh = s.heroes[i]!, sl = slots[i]!;
      let v = heroes.get(hh.u);
      if (!v) { const c = new Container(), sp = new Sprite(), name = txt('', 'small', true, 0xffffff); sp.anchor.set(0.5, 1); name.anchor.set(0.5, 0); c.addChild(sp, name); partyC.addChild(c); v = { c, sp, name, tex: null, atk: null, busy: false, key: '', x: 0, y: 0, s: 1 }; heroes.set(hh.u, v); }
      const hk = `${hh.hero}|${sl.s.toFixed(3)}`;
      v.x = sl.x; v.y = sl.y; v.s = sl.s; v.c.x = sl.x; v.c.y = sl.y; v.c.zIndex = Math.round(sl.y);
      if (v.key !== hk) {
        v.key = hk;
        const url = `${import.meta.env.BASE_URL}art/heroes/${heroOf(hh.hero).sprite || 'hero-sword-v3c.webp'}`, nd = heroNudge(hh.hero, 0), g = heroGeo(hh.hero);
        // 새 화풍 세밀 시트(칸 192 × 144 · k=2) · 옛 80 × 64 둘 다: 칸 자르기 = 그림 칸 · 배율 = s ÷ k · 발 = 칸 아래 base
        const i8 = idle8Of(hh.hero); // 🫁 #169 대기 8프레임
        if (i8) void src(i8).then((so) => { if (v!.key !== hk) return; v!.tex = Array.from({ length: IDLE8.frames }, (_, k) => frame(so, k * HERO.w, hh.hero * HERO.h, HERO.w, HERO.h)); });
        void src(url).then((so) => { if (v!.key !== hk) return; if (!i8) v!.tex = Array.from({ length: HERO.cols }, (_, k) => frame(so, k * g.cw, HERO.idleRow * g.ch, g.cw, g.ch)); v!.atk = Array.from({ length: HERO.cols }, (_, k) => frame(so, k * g.cw, HERO.atkRow * g.ch, g.cw, g.ch)); if (v!.tex) v!.sp.texture = v!.tex[0]!; });
        v.sp.anchor.set(0.5, (g.ch - g.base) / g.ch);
        const ix = i8 ? (IDLE8.nd[hh.hero]?.[0] ?? 0) : null, iy = i8 ? (IDLE8.nd[hh.hero]?.[1] ?? 0) : 0; // 대기 8프레임 = 그 칸의 정중앙 값
        v.sp.scale.set((sl.flip ? -sl.s : sl.s) / g.k, sl.s / g.k); v.sp.x = (sl.flip ? -(ix ?? nd.dx) : (ix ?? nd.dx)) * sl.s; v.sp.y = (ix != null ? iy : nd.dy) * sl.s;
      }
      v.name.text = `${hh.ok ? '✓ ' : hh.off ? '📵 ' : ''}${hh.name}`; v.name.style.fill = hh.ok ? 0x4cc38a : hh.off ? 0xff8a80 : 0xffffff; v.name.y = H() * 0.004;
      v.c.alpha = hh.off ? 0.45 : 1;
    }
    partyC.sortableChildren = true;
    partyKey = key;
  }
  void partyKey;

  // ── ✨ 연출 ──
  function float(text: string, x: number, y: number, k: keyof typeof TV_FS, color: number, ms = 1100) {
    const t = txt(text, k, true, color); t.anchor.set(0.5, 1); t.x = x; t.y = y; fx.addChild(t);
    tween(ms, (p) => { t.y = y - H() * 0.08 * ease(p); t.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3; }, () => t.destroy());
  }
  function hit(u: string, dmg: number, kind: 'hit' | 'miss' | 'practice') {
    const v = heroes.get(u); if (!v || !monSp) return;
    const dir = v.x < monCx ? 1 : -1, x0 = v.x, dx = Math.min(Math.abs(monCx - v.x) * 0.35, W() * 0.08) * dir;
    v.busy = true; if (v.atk) v.sp.texture = v.atk[2]!;
    tween(380, (p) => { const q = p < 0.5 ? ease(p * 2) : ease((1 - p) * 2); v.c.x = x0 + dx * q; }, () => { v.busy = false; v.c.x = x0; });
    // 몬스터 깜빡 · 흔들
    const m = monSp, mx = m.x;
    setTimeout(() => {
      void mx; monHit(dmg, kind); if (kind === 'hit') slash();
    }, 170);
  }
  function stone(on: boolean) { if (on === stoned) return; stoned = on; if (monSp) monSp.filters = on ? [...baseF, greyF] : baseF; }
  function heroVisible(u: string, on: boolean) { const v = heroes.get(u); if (v) v.c.visible = on; }
  // 🎆 화려한 연출
  const JS = { shards: 0, far: 0, wave: false, shake: 0, stops: 0 };
  let fancy = juiceDefault(), killArm = 0, killT: ReturnType<typeof setTimeout> | undefined, shakeOn = false;
  const whiteF = new ColorMatrixFilter(); whiteF.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  function shake(lv: number) {
    if (lv > JS.shake) JS.shake = lv; if (!lv || shakeOn) return; shakeOn = true; const a = H() * JUICE.SHAKE[lv]!, t0 = performance.now(), ms = JUICE.SHAKE_MS[lv]!;
    const f = () => { const k = 1 - (performance.now() - t0) / ms; if (k <= 0) { root.x = root.y = 0; shakeOn = false; app.ticker.remove(f); return; } root.x = Math.round((Math.random() * 2 - 1) * a * k * k); root.y = Math.round((Math.random() * 2 - 1) * a * k * k); };
    app.ticker.add(f);
  }
  function flash(m: Sprite) { const f0 = m.filters ? [...(m.filters as ColorMatrixFilter[])] : []; m.filters = [...f0.slice(-1), whiteF]; setTimeout(() => { if (!m.destroyed) m.filters = stoned ? [...baseF, greyF] : baseF; }, JUICE.FLASH_MS); } // 필터 동시 2개까지
  function pop(text: string, perfect: boolean) {
    const x = monCx + (Math.random() - 0.5) * monSize * 0.3, y = monTop + monSize * 0.35, t = txt(text, 'big', true, perfect ? 0xffd25a : 0xffffff); t.anchor.set(0.5, 1); t.x = x; t.y = y; fx.addChild(t);
    if (!perfect) t.style.stroke = { color: 0xb3261e, width: Math.max(3, H() * 0.006) }; const k0 = perfect ? JUICE.NUM_PERFECT : 1;
    tween(1100, (p) => { const q = p < 0.18 ? p / 0.18 : 1; t.scale.set(k0 * (JUICE.NUM_POP - (JUICE.NUM_POP - 1) * ease(q))); t.y = y - H() * 0.09 * ease(p); t.alpha = p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28; }, () => t.destroy());
  }
  function kill() {
    killArm = 0; clearTimeout(killT); const m = monSp; if (!m || !fancy) return;
    slowUntil = performance.now() + JUICE.SLOW_MS; shake(3);
    // 💥 충격파 고리 (root 에 0.3초 · 끝나면 뗌)
    const cx = monCx, cy = monTop + monSize * 0.55, wf = new ShockwaveFilter({ center: { x: cx, y: cy }, amplitude: 30, wavelength: 140, brightness: 1.25, speed: Math.max(600, monSize * 4), radius: Math.max(W(), H()), time: 0 });
    root.filters = [wf]; JS.wave = true; const t0 = performance.now(); const wv = () => { const e = (performance.now() - t0) / 1000; wf.time = e; if (e * 1000 > JUICE.WAVE_MS) { root.filters = []; app.ticker.remove(wv); } }; app.ticker.add(wv);
    // 🧩 조각: 몬스터 그림을 6 × 6 으로 잘라 튀김 (ParticleContainer · 0.9초)
    const tx = m.texture, fr = tx.frame, n = JUICE.SHARDS, pw = fr.width / n, ph = fr.height / n, sc = Math.abs(m.scale.x);
    const pc = new ParticleContainer({ dynamicProperties: { position: true, rotation: true, color: true } }); fx.addChild(pc);
    const b = m.getBounds(), ps: { p: Particle; vx: number; vy: number; vr: number }[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = new Particle({ texture: new Texture({ source: tx.source, frame: new Rectangle(fr.x + i * pw, fr.y + j * ph, pw, ph) }), x: b.x + (i + 0.5) * pw * sc, y: b.y + (j + 0.5) * ph * sc, scaleX: sc, scaleY: sc, anchorX: 0.5, anchorY: 0.5 });
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, v = H() * (1.1 + Math.random() * 1.1);
      pc.addParticle(p); ps.push({ p, vx: (dx / d) * v, vy: (dy / d) * v - H() * 0.5, vr: (Math.random() - 0.5) * 12 });
    }
    JS.shards = ps.length; JS.far = 0; m.alpha = 0.25; let last = vt; const p0 = ps.map((s) => [s.p.x, s.p.y]); const g = H() * 2.2;
    tween(JUICE.SHARD_MS, (q) => { const dt = Math.min(0.05, Math.max(0, (vt - last) / 1000)); last = vt; for (const s of ps) { s.vy += g * dt; s.p.x += s.vx * dt; s.p.y += s.vy * dt; s.p.rotation += s.vr * dt; s.p.alpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4; } JS.far = Math.max(JS.far, ...ps.map((s, i) => Math.hypot(s.p.x - p0[i]![0]!, s.p.y - p0[i]![1]!))); }, () => { pc.destroy({ children: true }); if (!m.destroyed) m.alpha = 1; });
  }
  function monHit(dmg: number, kind: 'hit' | 'miss' | 'practice', o: HitO = {}) {
    const m = monSp; if (!m) return; const mx = m.x;
    if (kind !== 'hit') { float(kind === 'practice' ? '연습' : 'MISS', monCx, monTop + monSize * 0.45, 'title', 0xcfd3db, 900); return; }
    const wob = () => { m.tint = 0xff6b6b; tween(260, (p) => { m.x = mx + Math.sin(p * Math.PI * 6) * W() * 0.006 * (1 - p); }, () => { m.tint = 0xffffff; m.x = mx; }); };
    if (!fancy) { wob(); if (dmg > 0) float(`-${dmg}`, monCx + (Math.random() - 0.5) * monSize * 0.3, monTop + monSize * 0.35, 'big', 0xffd166); return; }
    const perfect = !!o.perfect, last = dmg > 0 && killArm > 0;
    stopUntil = performance.now() + (perfect ? JUICE.STOP_PERFECT_MS : JUICE.STOP_MS); JS.stops++; flash(m); wob();
    if (dmg > 0) pop(`-${dmg}`, perfect);
    if (last) kill(); else shake(o.ult ? 2 : perfect || dmg >= 3 ? 1 : 0);
  }
  function armKill() { if (!fancy) return; killArm = performance.now(); clearTimeout(killT); killT = setTimeout(() => { if (killArm) kill(); }, 1500); }
  function slash() {
    const g = new Graphics(), cx = monCx, cy = monTop + monSize * 0.5, r = monSize * 0.32;
    g.moveTo(cx - r, cy - r * 0.6).lineTo(cx + r, cy + r * 0.6).stroke({ width: Math.max(4, H() * 0.012), color: 0xffffff, alpha: 0.95, cap: 'round' });
    fx.addChild(g); tween(220, (p) => { g.alpha = 1 - p; g.scale.set(1 + p * 0.05); }, () => g.destroy());
  }
  function exp(u: string, text: string) { const v = heroes.get(u); if (v) float(text, v.x, v.y - HERO.h * v.s * 0.95, 'body', 0xf5b84a, 1400); }
  let ban: Container | null = null;
  function banner(text: string | null) {
    if (ban) { ban.destroy({ children: true }); ban = null; }
    if (!text) return;
    const c = new Container(), t = txt(text, 'big', true, 0xffd166), pad = H() * 0.02, g = new Graphics();
    t.anchor.set(0.5); g.roundRect(-t.width / 2 - pad * 2, -t.height / 2 - pad, t.width + pad * 4, t.height + pad * 2, pad).fill({ color: 0x08090c, alpha: 0.78 }).stroke({ width: 3, color: 0xf5b84a });
    c.addChild(g, t); c.x = st?.split ? W() * 0.27 : W() / 2; c.y = H() * 0.5; fx.addChild(c); ban = c;
    tween(260, (p) => { const k = 0.6 + 0.4 * ease(p); c.scale.set(k); c.alpha = p; });
  }

  // 🧊 얼음 (그림 · 📜 2026-11-13 밤 🎨 ice-tv 5칸): 용사마다 ① 발밑 서리 → ② 반 → ③ 다 얼음(0.1초씩) · 하늘색 · ms 뒤 ④ 녹으며 물방울 → ⑤ 거의 녹음(0.3초씩) → 사라짐
  //   그림을 못 받으면 = 옛 각진 덩어리 그대로(Graphics)
  let ice: (Graphics | Sprite)[] = [], iceT: ReturnType<typeof setTimeout>[] = [];
  const iceTex: Texture[] = [];
  void src(ICE.tv.src).then((so) => { for (let k = 0; k < ICE.tv.cols; k++) iceTex.push(new Texture({ source: so, frame: new Rectangle(k * ICE.tv.w, 0, ICE.tv.w, ICE.tv.h) })); }).catch(() => {});
  const BLK = [[0.18, 0], [0.62, 0.03], [0.92, 0.14], [1, 0.46], [0.94, 0.82], [0.7, 1], [0.26, 0.98], [0.04, 0.8], [0, 0.4], [0.06, 0.12]];
  function unfreeze(now: boolean) {
    iceT.forEach(clearTimeout); iceT = []; const gs = ice; ice = [];
    const back = () => { for (const v of heroes.values()) v.sp.tint = 0xffffff; };
    if (now) { gs.forEach((g) => g.destroy()); back(); return; }
    const sps = gs.filter((g): g is Sprite => g instanceof Sprite), grs = gs.filter((g) => !(g instanceof Sprite));
    if (sps.length && iceTex.length >= 5) { sps.forEach((g) => (g.texture = iceTex[3]!)); back(); iceT.push(setTimeout(() => sps.forEach((g) => (g.texture = iceTex[4]!)), 300)); iceT.push(setTimeout(() => tween(250, (p) => sps.forEach((g) => (g.alpha = 1 - p)), () => sps.forEach((g) => g.destroy())), 600)); }
    if (grs.length) tween(600, (p) => grs.forEach((g) => { g.alpha = 1 - p; g.y = p * H() * 0.008; }), () => { grs.forEach((g) => g.destroy()); back(); });
  }
  function freeze(ms: number) {
    unfreeze(true);
    for (const v of heroes.values()) {
      const b = v.sp.getBounds(), p = fx.toLocal({ x: b.x, y: b.y }), w = Math.abs(b.width), h = b.height;
      if (iceTex.length >= 5) {
        const sp = new Sprite(iceTex[0]!); sp.anchor.set(0.5, 1); const sc = (h * 1.12) / ICE.tv.h; sp.scale.set(sc); sp.x = p.x + w / 2; sp.y = p.y + h + h * 0.04; sp.alpha = 0.95;
        fx.addChild(sp); ice.push(sp); v.sp.tint = 0xbfe6ff;
        iceT.push(setTimeout(() => { if (!sp.destroyed) sp.texture = iceTex[1]!; }, 100)); iceT.push(setTimeout(() => { if (!sp.destroyed) sp.texture = iceTex[2]!; }, 200));
        continue;
      }
      const x0 = p.x + w * 0.22, y0 = p.y + h * 0.06, bw = w * 0.56, bh = h * 0.94, at = (a: number, c: number) => [x0 + a * bw, y0 + c * bh];
      const g = new Graphics();
      g.poly(BLK.flatMap(([a, c]) => at(a!, c!))).fill({ color: 0xcfefff, alpha: 0.42 }).stroke({ width: Math.max(1.5, h * 0.015), color: 0xffffff, alpha: 0.85 });
      g.poly([...at(0.14, 0.08), ...at(0.3, 0.08), ...at(0.22, 0.54), ...at(0.06, 0.54)]).fill({ color: 0xffffff, alpha: 0.42 });
      g.poly([...at(0.8, 0.14), ...at(0.86, 0.14), ...at(0.82, 0.34), ...at(0.76, 0.34)]).fill({ color: 0xffffff, alpha: 0.6 });
      for (const [a, c, k] of [[0.02, 0.92, 1], [0.96, 0.86, 0.8], [0.88, -0.02, 0.7]] as const) { const r = bw * 0.14 * k; g.poly([x0 + a * bw, y0 + c * bh - r, x0 + a * bw + r, y0 + c * bh - r * 0.2, x0 + a * bw + r * 0.4, y0 + c * bh + r, x0 + a * bw - r * 0.8, y0 + c * bh + r * 0.5]).fill({ color: 0xe6f8ff, alpha: 0.7 }); }
      fx.addChild(g); ice.push(g); v.sp.tint = 0xbfe6ff;
    }
    iceT.push(setTimeout(() => unfreeze(false), ms));
  }
  let raf = 0;
  return {
    kind: 'pixi', fx,
    size: () => ({ W: W(), H: H() }),
    update(s) {
      st = s; cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { void drawMon(s); drawHp(s); void drawParty(s); });
    },
    hit, exp, banner, freeze, heroVisible, monHit, stone, armKill,
    juice: (on) => { if (on != null) fancy = on; return fancy; },
    juiceStats: () => ({ ...JS }),
    slash: (o, fall) => SL.add(o, fall),
    slashCfg: (c) => { if (c.fancy != null) SL.fancy = c.fancy; if (c.level !== undefined) SL.forceLevel = c.level; },
    slashStats: () => ({ fps: Math.round(SL.fps), level: SL.level, live: SL.live.length, queue: SL.queue.length }),
    destroy() { SL.destroy(); iceT.forEach(clearTimeout); clearTimeout(killT); cancelAnimationFrame(raf); tweens.clear(); try { app.destroy({ removeView: true }, { children: true }); } catch { /* 무시 */ } },
  };
}
