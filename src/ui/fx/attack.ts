// ⚔ 공격 연출 = 정식 js/engine/attack.js 그대로 옮김 (2026-11-13 선생님 「똑같이 옮겨 줘」 · 🔨 용사 fx)
//   근접 = 몬스터 보이는 몸통 옆까지 돌진(잔상) → 공격 자세 → (Ⅲ · Ⅳ 연타) → 이펙트 · 멈칫 · 흔들림 · 밀림 → 제자리
//   원거리 · 쏘는 기술 = 제자리 한 걸음 → 탄 곡선 / 손에서 몸통까지 → 이펙트 · 틀림 = 튕겨냄(벌 없음) · 처치 = 충격파 + 크게
//   ⚡ 필살기 컷인(1.2초 · 얼굴 · 눈빛 · 이름 · 찢김) → 💥 광역(본 이펙트 + 네 귀퉁이 + 충격파 + 어둠막) · 🌟 진필살기 = 금빛 · 「眞」 · 조금 길게
//   폰(장면 띠) · TV(Pixi 위 DOM 층) · 갤러리 같은 함수 — 연출만 (데미지 · 체력 · 정답 판정과 무관)
//   v1.0 다른 점: 용사 그림 바꾸기(정식 DS.Art.hero) = o.pose 콜백 · 몬스터 보이는 몸통 = 요소의 data-bb(칸 비율) · 소리 = sound.svelte.ts
import { FACES, famOf, modeOf, place, play as fxPlay, preload as fxPreload, q4, RANGED, spec, strip, tierOf, COMBO, NAMES, FX2, type Body, type Spec } from './fx';
import { heroOf } from '../../model/hero';
import { artUrl } from '../manifest';
import { sfx } from '../sound.svelte';

export type Pose = 'idle' | 'walk' | 'attack' | 'think' | 'win';
export const projOf = (hero: number) => RANGED[String(Number(hero))] ?? null;
export const isRanged = (hero: number) => !!projOf(hero);
const ROUND: Record<string, boolean> = { witch: true, priest: true };
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rel = (el: Element, box: Element) => { const a = el.getBoundingClientRect(), b = box.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; };
/** 🎯 보이는 몸통: 칸에서 투명 여백을 뺀 상자 (data-bb = 「x0,y0,x1,y1」 칸 비율 · 없으면 정식 기본값) */
export function body(el: Element | null, scene: Element | null): Body | null {
  if (!el || !scene) return null;
  const art = (el.matches('.art') ? el : el.querySelector('.art')) ?? el;
  const r = rel(art, scene), isHero = art.classList.contains('hero') || !!el.closest('.hb');
  let f = (art as HTMLElement).dataset.bb?.split(',').map(Number) ?? (el as HTMLElement).dataset.bb?.split(',').map(Number);
  if (!f || f.length !== 4) f = isHero ? [0.28, 0.12, 0.72, 0.98] : [0.18, 0.15, 0.82, 0.95];
  if (art.classList.contains('flip')) f = [1 - f[2]!, f[1]!, 1 - f[0]!, f[3]!];
  const b = { x0: r.x + r.w * f[0]!, y0: r.y + r.h * f[1]!, x1: r.x + r.w * f[2]!, y1: r.y + r.h * f[3]! };
  return { ...b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
}
// 👁 교실 TV 는 「동작 줄이기」여도 늘 연출 (정식 setForce)
let force = false;
export const setForce = (on: boolean) => { force = on; };
const reduce = () => !force && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function shake(box: HTMLElement | null, amp = 3, ms = 180) {
  if (reduce() || !box) return;
  const t0 = performance.now();
  const f = (t: number) => { const k = 1 - (t - t0) / ms; if (k <= 0 || !box.isConnected) { box.style.translate = ''; return; } box.style.translate = `${((Math.random() - 0.5) * 2 * amp * k).toFixed(1)}px ${((Math.random() - 0.5) * 2 * amp * k).toFixed(1)}px`; requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
export const knock = (monBox: HTMLElement | null, d = 12) => { if (monBox?.animate) monBox.animate([{ translate: '0 0', filter: 'brightness(3)' }, { translate: `${d}px 0`, filter: 'brightness(1.2)', offset: 0.35 }, { translate: '0 0', filter: 'brightness(1)' }], { duration: 340, easing: 'ease-out' }); };
const hitstop = (box: HTMLElement, ms: number) => { box.classList.add('hitstop'); return wait(ms).then(() => box.classList.remove('hitstop')); };
function dmg(box: HTMLElement, x: number, y: number, txt = '−1') { const e = document.createElement('b'); e.className = 'atk-dmg'; e.textContent = txt; e.style.left = `${x}px`; e.style.top = `${y}px`; box.appendChild(e); setTimeout(() => e.remove(), 950); }
function wave(box: HTMLElement, x: number, y: number) { const e = document.createElement('i'); e.className = 'atk-wave'; e.style.left = `${x}px`; e.style.top = `${y}px`; box.appendChild(e); setTimeout(() => e.remove(), 650); }
// 🔊 정식 audio.js FAM_SFX (계열 → 맞는 소리)
const FAM_SFX: Record<string, string> = { cut: 'cut', smash: 'smash', sweep: 'sweep', wind: 'wind', fire: 'fire', spark: 'spark', frost: 'frost', star: 'star', magic: 'magic', math: 'magic', sun: 'star', dark: 'cut', gear: 'smash', water: 'wind' };
export const fxHit = (k: string) => sfx(FAM_SFX[famOf(k)?.id ?? ''] ?? 'special', 0.85);

type HitO = { mult?: number; finish?: boolean; noDmg?: boolean; ult?: boolean; onHit?: () => void; from?: { x: number; y: number }; dir?: number; cast?: boolean };
/** 맞는 순간: 이펙트 · 멈칫 · 흔들림 · 밀림 · −1 (처치면 충격파 + 크게) */
export async function impact(scene: HTMLElement, monBox: HTMLElement, fx: string, o: HitO = {}) {
  const B = body(monBox, scene); if (!B) return;
  const sp = spec(fx) ?? spec('flame'), shot = modeOf(fx) === 'shot';
  if (o.ult) void ultBlast(scene, monBox, fx); else if (!o.cast) void place(scene, fx, { body: B, from: o.from, mode: shot && !o.from ? 'body' : undefined, mult: o.mult, perfect: o.finish, dir: o.dir });
  const hit = sp?.hit || [0, 0.08, 0.18, 2];
  await wait((shot && o.from ? Math.min(0.9, hit[0] || 0.3) : Math.min(0.3, hit[0] || 0.06)) * 1000);
  if (!scene.isConnected) return;
  o.onHit?.();
  knock(monBox, o.finish ? 24 : 12); shake(scene, Math.max(2, hit[3] || 2) * (o.finish ? 2 : 1.2), Math.max(0.14, hit[2] || 0.18) * (o.finish ? 2000 : 1000));
  if (!o.noDmg) dmg(scene, B.cx, B.y0 + 6);
  if (o.finish) wave(scene, B.cx, B.y1);
  if (o.finish) sfx('finish', 0.95); else fxHit(fx);
  if (!o.noDmg) setTimeout(() => sfx('hurt', 0.55), 70);
  await hitstop(scene, (o.finish ? 0.32 : Math.max(0.05, hit[1] || 0.08)) * 1000);
}
type P2 = { x: number; y: number };
function dash(scene: HTMLElement, heroBox: HTMLElement, from0: number | P2, to0: number | P2, ms: number, ghosts: boolean) {
  const P = (v: number | P2) => (typeof v === 'number' ? { x: v, y: 0 } : v || { x: 0, y: 0 }); const from = P(from0), to = P(to0);
  return new Promise<void>((res) => {
    const t0 = performance.now(); let lastG = 0;
    const f = (t: number) => {
      const u = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - u, 2), x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e;
      heroBox.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (ghosts && t - lastG > 45 && u < 0.95 && !reduce()) {
        lastG = t; const a = heroBox.querySelector('.art');
        if (a) { const r = rel(a, scene), g = document.createElement('div'); g.className = 'atk-ghost'; g.style.cssText += `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`; g.innerHTML = a.outerHTML; const c = g.firstChild as HTMLElement; c.style.width = '100%'; c.style.height = '100%'; c.style.left = '0'; c.style.top = '0'; c.style.translate = ''; scene.appendChild(g); requestAnimationFrame(() => { g.style.opacity = '0'; }); setTimeout(() => g.remove(), 320); }
      }
      if (u < 1 && heroBox.isConnected) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
}
/** 원거리 탄: 곡선(2차 베지어)으로 날아가며 머리를 돌림 */
function fly(scene: HTMLElement, key: string | null, from: P2, to: P2, s: number, miss: boolean) {
  const sp = key ? FX2.proj[key] : null;
  if (!sp) return wait(200);
  const el = strip(scene, sp, from.x, from.y, s, { loop: true, z: 21 }); el.classList.add('atk-proj');
  s = q4(s);
  el.style.transformOrigin = `${Math.round(sp.px * s)}px ${Math.round(sp.py * s)}px`;
  const dist = Math.hypot(to.x - from.x, to.y - from.y), lift = Math.min(60, dist * 0.22), cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - lift;
  const ms = miss ? 320 : Math.max(260, Math.min(460, dist * 1.4)), t0 = performance.now();
  return new Promise<void>((res) => {
    const f = (t: number) => {
      const u = Math.min(1, (t - t0) / ms), v = 1 - u;
      const x = v * v * from.x + 2 * v * u * cx + u * u * to.x, y = v * v * from.y + 2 * v * u * cy + u * u * to.y;
      const tx = 2 * v * (cx - from.x) + 2 * u * (to.x - cx), ty = 2 * v * (cy - from.y) + 2 * u * (to.y - cy);
      el.style.left = `${Math.round(x - sp.px * s)}px`; el.style.top = `${Math.round(y - sp.py * s)}px`;
      if (!ROUND[key!]) el.style.transform = `rotate(${Math.atan2(ty, tx).toFixed(3)}rad)`;
      if (miss) el.style.opacity = String(1 - Math.max(0, u - 0.5) * 2);
      if (u < 1 && scene.isConnected) requestAnimationFrame(f); else { el.remove(); res(); }
    };
    requestAnimationFrame(f);
  });
}
// ⚡ 필살기 컷인 색 (계열)
export const ULT_COLOR: Record<string, [string, string]> = { wind: ['#9affd8', '#05301f'], cut: ['#9fe0ff', '#0b2a40'], smash: ['#ffb070', '#3a1a06'], sweep: ['#a0ffd0', '#06301e'], fire: ['#ff7a3a', '#3a0d00'], spark: ['#fff27a', '#2a2a00'], frost: ['#b8f0ff', '#062a3a'], star: ['#ffe9a0', '#2a2206'], magic: ['#d8a0ff', '#24063a'], math: ['#ffe27a', '#0a2c46'] };
let faceImg: HTMLImageElement | null = null;
export function preloadFaces() { if (faceImg || typeof Image === 'undefined') return; faceImg = new Image(); faceImg.src = artUrl(`art/${FACES.src}`); }
const faceReady = () => !!(faceImg && faceImg.complete && faceImg.naturalWidth);
const eyesOf = (n: number) => { const e = FACES.eyes[n]; return e ? `<i class="u-glint" style="left:${e[0]! * 100}%;top:${e[1]! * 100}%"></i><i class="u-glint" style="left:${e[2]! * 100}%;top:${e[3]! * 100}%;animation-delay:.38s"></i>` : ''; };
/** 얼굴 그림이 없으면 = 용사 도트 확대 (heroArt 콜백 · 없으면 빈 띠) */
function faceHtml(hero: number, heroArt?: (hero: number) => string) {
  const F = FACES, n = Number(hero) || 0;
  preloadFaces();
  if (n < F.cols * F.rows && F.eyes[n] !== null && faceReady()) { const c = n % F.cols, r = Math.floor(n / F.cols); return `<i class="u-facepic" style="background-image:url('${artUrl(`art/${F.src}`)}');background-size:${F.cols * 100}% ${F.rows * 100}%;background-position:${F.cols > 1 ? (c / (F.cols - 1)) * 100 : 0}% ${F.rows > 1 ? (r / (F.rows - 1)) * 100 : 0}%">${eyesOf(n)}</i>`; }
  return `<div class="u-face">${heroArt ? heroArt(hero) : ''}</div>`;
}
export type CutOpt = { gold?: boolean; guard?: boolean; peek?: boolean; quick?: boolean; mute?: boolean; host?: HTMLElement; name?: string; sub?: string; heroArt?: (hero: number) => string };
const esc = (s: string) => s.replace(/[<>&]/g, '');
/** ⚡ 필살기 컷인 (1.2초) · gold = 🌟 진필살기(금빛 · 眞 · 조금 길게) · guard = 🛡 홀리 방패(흰 · 하늘빛 · 짧게) */
export function cutin(hero: number, fx: string, opt: CutOpt = {}): Promise<void> {
  if (reduce() || typeof document === 'undefined') return wait(0);
  const fam = (famOf(fx) ?? { id: 'star' }).id, [c1, c2] = opt.guard ? ['#9fdcff', '#e6f6ff'] : opt.gold ? ['#ffd25a', '#fff3c0'] : ULT_COLOR[fam] ?? ULT_COLOR.star!;
  const d = document.createElement('div'); d.className = `ult${opt.gold ? ' true' : ''}${opt.guard ? ' guard' : ''}${opt.peek ? ' peek' : ''}`; d.style.setProperty('--uc', c1); d.style.setProperty('--uc2', c2);
  const crack = Array.from({ length: 9 }, (_, i) => `${(i * 12.5).toFixed(1)},${(50 + (i % 2 ? -1 : 1) * (6 + Math.random() * 10) + (i - 4) * 4).toFixed(1)}`).join(' ');
  const name = opt.peek ? `${esc(opt.name || '')}${opt.sub ? `<small class="u-sub">${esc(opt.sub)}</small>` : ''}` : opt.guard ? 'HOLY GUARD' : `${opt.gold ? '진필살기 · ' : ''}${esc(String(NAMES[fx] || '').replace(/^\S+\s/, ''))}!`;
  d.innerHTML = `<i class="u-dim"></i><div class="u-band">${faceHtml(hero, opt.heroArt)}<i class="u-eye" style="left:44%"></i><i class="u-eye" style="left:56%"></i></div>${opt.gold ? '<b class="u-true">眞</b>' : ''}${opt.guard ? '<i class="u-shield"></i>' : ''}<b class="u-name">${name}</b><i class="u-flash"></i><div class="u-tear"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${crack}" fill="none" stroke="#fff" stroke-width="1.6" style="filter:drop-shadow(0 0 2px ${c1})"/><polyline points="${crack}" fill="none" stroke="${c1}" stroke-width="0.5"/></svg></div>`;
  (opt.host || document.body).appendChild(d);
  if (opt.guard || opt.peek || opt.quick) { if (opt.quick && !opt.mute) sfx('special', 0.6); setTimeout(() => d.remove(), 1100); return wait(800); }
  if (!opt.mute) { sfx('special', 0.9); setTimeout(() => sfx('finish2', 0.95), 1000); }
  setTimeout(() => d.remove(), opt.gold ? 2000 : 1500);
  return wait(opt.gold ? 1450 : 1050);
}
/** 💥 필살기 광역: 본 이펙트(몸통 × 1.6) + 네 귀퉁이 4개 + 충격파 + 계열 섬광 + 어둠막 · 흔들림 6px */
export function ultBlast(scene: HTMLElement, monBox: HTMLElement | null, fx: string): Promise<void> {
  if (!scene) return wait(0);
  if (getComputedStyle(scene).position === 'static') scene.style.position = 'relative';
  const R = scene.getBoundingClientRect(), W = R.width, Hh = R.height;
  const M = monBox && monBox.isConnected ? rel(monBox, scene) : { x: W * 0.35, y: Hh * 0.25, w: W * 0.3, h: Hh * 0.45 };
  const cx = M.x + M.w / 2, cy = M.y + M.h * 0.52, sp = spec(fx) ?? spec('flame');
  const fam = (famOf(fx) ?? { id: 'star' }).id, c1 = (ULT_COLOR[fam] ?? ULT_COLOR.star!)[0];
  const cap = sp ? Math.min((W * 0.95) / sp.w, (Hh * 0.95) / sp.h) : 3, sMain = sp ? Math.max(0.8, Math.min(cap, (M.w * 1.6) / sp.w)) : 2;
  const dim = document.createElement('i'); dim.className = 'ult-dim'; scene.appendChild(dim); setTimeout(() => dim.remove(), 1500);
  const fl = document.createElement('i'); fl.className = 'ult-aoe'; fl.style.setProperty('--c', c1); fl.style.setProperty('--x', `${cx}px`); fl.style.setProperty('--y', `${cy}px`); scene.appendChild(fl); setTimeout(() => fl.remove(), 700);
  const ring = document.createElement('i'), d = 2.2 * Math.hypot(Math.max(cx, W - cx), Math.max(cy, Hh - cy)); ring.className = 'ult-ring'; ring.style.cssText = `left:${cx}px;top:${cy}px;width:${d}px;height:${d}px;--c:${c1}`; scene.appendChild(ring); setTimeout(() => ring.remove(), 650);
  const Bb = monBox && monBox.isConnected ? body(monBox, scene) : null;
  if (Bb) void place(scene, fx, { body: Bb, mode: modeOf(fx) === 'shot' ? 'body' : undefined, mult: 1.6, flat: true }); else void fxPlay(scene, fx, { x: cx, y: cy, floor: M.y + M.h * 0.9, s: sMain, flat: true });
  ([[0.17, 0.3], [0.83, 0.28], [0.2, 0.78], [0.8, 0.76]] as const).forEach(([fx0, fy0], i) => setTimeout(() => { if (scene.isConnected) void fxPlay(scene, fx, { x: W * fx0, y: Hh * fy0, floor: Hh * fy0 + 20, s: sMain * 0.6, flat: true }); }, 150 + i * 120));
  shake(scene, 6, 400); if (monBox) knock(monBox, 28);
  fxHit(fx); setTimeout(() => sfx('finish', 0.95), 180);
  return hitstop(scene, 200).then(() => wait(650));
}
const GHOSTS: Record<string, number> = { slash: 3, twin: 2, reap: 5, spin: 3, hammer: 2, quake: 2 };
function ghostsOf(scene: HTMLElement, heroBox: HTMLElement, to: P2, n: number) {
  if (reduce() || !heroBox.isConnected) return;
  const H = rel(heroBox, scene);
  for (let i = 1; i <= n; i++) {
    const g = document.createElement('div'), f = i / (n + 1); g.className = 'atk-echo'; g.innerHTML = heroBox.innerHTML;
    g.style.cssText = `left:${H.x + to.x * f}px;top:${H.y + to.y * f}px;width:${H.w}px;height:${H.h}px;animation-delay:${i * 40}ms`;
    scene.appendChild(g); setTimeout(() => g.remove(), 520 + i * 40);
  }
}
const handOf = (box: HTMLElement, scene: HTMLElement, dir: number) => { const a = box.querySelector('.art') || box, r = rel(a, scene); return { x: r.x + r.w * (dir > 0 ? 0.74 : 0.26), y: r.y + r.h * 0.5 }; };
export const TRAIL_C: Record<string, string> = { fire: '#ff7a1a', spark: '#ffe14a', frost: '#7fd3ff', wind: '#9ef0ff', star: '#fff3a0', magic: '#c08aff', math: '#ffd25a' };
/** ✨ 속성 무기 궤적: 근접 용사가 속성 스킬을 끼웠을 때 몸통 앞을 긋는 빛 호 0.28초 */
export function trail(scene: HTMLElement, B: Body, dir: number, fx: string) {
  const cb = COMBO[fx], f = famOf(fx), col = cb ? TRAIL_C[cb.elem] : f ? TRAIL_C[f.id] : undefined; if (!col || !scene.isConnected) return;
  if (cb) setTimeout(() => { if (scene.isConnected) void place(scene, cb.efx, { body: B, dir }); }, 330);
  const el = document.createElement('i'); el.className = 'atk-trail';
  const w = B.w * 0.75, h = B.h * 0.95, x = dir > 0 ? B.x0 + B.w * 0.4 - w : B.x1 - B.w * 0.4, y = B.y0 + B.h * 0.02;
  el.style.cssText = `position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(w)}px;height:${Math.round(h)}px;border-radius:50%;border:0 solid transparent;border-${dir > 0 ? 'right' : 'left'}:10px solid ${col};box-shadow:${dir > 0 ? '' : '-'}8px 0 14px -4px ${col}, inset ${dir > 0 ? '-' : ''}3px 0 0 -1px #fff;pointer-events:none;z-index:19;`;
  scene.appendChild(el);
  el.animate?.([{ opacity: 0, transform: `rotate(${-50 * dir}deg) scale(.7)` }, { opacity: 1, offset: 0.35 }, { opacity: 0, transform: `rotate(${40 * dir}deg) scale(1.05)` }], { duration: 280, easing: 'ease-out' });
  setTimeout(() => el.remove(), 300);
}
/** 공명 = 내 속성 스킬 (정식 ownReso · v1.0 사다리 = 내 속성만) */
export const resonates = (hero: number, fx: string) => { const f = famOf(fx); return !!f && f.id === heroOf(hero).attr; };
/** 정식 fit: 사다리 밖이면 그 용사 Ⅰ */
export const fit = (hero: number, fx: string) => { const f = famOf(fx); return f && f.id === heroOf(hero).attr ? fx : ['wings', 'smite'].includes(fx) ? fx : (spec(fx) ? fx : 'flame'); };
const tierN = (fx: string) => { const t = tierOf(fx); return typeof t === 'number' ? t : -1; };
/** ⚡ 필살기 = 내 속성 Ⅲ · Ⅳ · 🌟 진필살기 = 내 속성 Ⅳ (정식 canUlt · canTrue) */
export const canUlt = (fx: string, hero: number) => tierN(fx) >= 2 && resonates(hero, fx);
export const canTrue = (fx: string, hero: number) => tierN(fx) === 3 && resonates(hero, fx);
export const preload = (hero: number, fx: string) => { fxPreload(fx); const p = projOf(hero); if (p) fxPreload(p); if (canUlt(fx, hero)) preloadFaces(); };

export type PlayO = { heroBox: HTMLElement | null; monBox: HTMLElement | null; hero: number; fx: string; miss?: boolean; finish?: boolean; ultimate?: boolean; noDmg?: boolean; onHit?: (k?: { k: number; n: number }) => void; hits?: number; rest?: Pose; mult?: number; s?: number; ps?: number; pose?: (p: Pose) => void; heroArt?: (hero: number) => string };
/** ⚔ 공격 한 번 (정식 play 그대로) */
export async function attack(scene: HTMLElement | null, o: PlayO): Promise<void> {
  const { heroBox, monBox } = o, hero = Number(o.hero) || 0, fx = fit(hero, o.fx || 'flame'), reso = resonates(hero, fx), mult = (reso ? 1.15 : 1) * (o.ultimate ? 1.25 : 1) * (o.mult || 1);
  const setPose = (p: Pose) => o.pose?.(p);
  if (!scene || !heroBox || !monBox) { if (scene && !o.miss) void fxPlay(scene, fx, { s: o.s || 1.2 }); return; }
  if (getComputedStyle(scene).position === 'static') scene.style.position = 'relative';
  heroBox.style.translate = '';
  const H = rel(heroBox, scene), B = body(monBox, scene)!, rest = o.rest || 'think';
  const hc = { x: H.x + H.w / 2, y: H.y + H.h }, dir = hc.x <= B.cx ? 1 : -1;
  const shot = modeOf(fx) === 'shot', ranged = isRanged(hero), inPlace = shot || ranged;
  const hitO: HitO = { mult, finish: o.finish || o.ultimate, noDmg: o.noDmg, ult: o.ultimate, onHit: o.onHit ? () => o.onHit!() : undefined };
  if (reso) { heroBox.classList.add('atk-reso'); setTimeout(() => heroBox.classList.remove('atk-reso'), 1400); }
  if (o.ultimate) await cutin(hero, fx, { heroArt: o.heroArt });
  if (inPlace) {
    const gap = Math.hypot(B.cx - hc.x, B.cy - hc.y) || 1, k = Math.min(36, gap * 0.1) / gap, step = { x: (B.cx - hc.x) * k, y: (B.y1 - hc.y) * k * 0.5 };
    setPose('walk'); await dash(scene, heroBox, { x: 0, y: 0 }, step, 140, false);
    if (!scene.isConnected) return;
    setPose('attack'); await wait(120);
    const from = handOf(heroBox, scene, dir);
    if (o.miss) {
      sfx('launch', 0.6);
      const pk = ranged ? projOf(hero) : null;
      if (pk) await fly(scene, pk, from, { x: B.cx - dir * B.w * 0.2, y: B.y0 - B.h * 0.3 }, o.ps || Math.max(1, B.w / 110), true); else await wait(200);
      sfx('block', 0.75); monBox.animate?.([{ rotate: '0deg' }, { rotate: `${-6 * dir}deg` }, { rotate: '0deg' }], { duration: 300 });
    } else if (shot) {
      sfx('launch', 0.6);
      await impact(scene, monBox, fx, { ...hitO, from });
    } else {
      sfx('launch', 0.6);
      await fly(scene, projOf(hero), from, { x: B.cx, y: B.cy }, o.ps || Math.max(1, Math.min(2.4, B.w / 110)), false);
      if (!scene.isConnected) return;
      await impact(scene, monBox, fx, hitO);
    }
    await wait(o.ultimate ? 700 : 160);
    if (!scene.isConnected) return;
    await dash(scene, heroBox, step, { x: 0, y: 0 }, 140, false);
  } else {
    const R = scene.getBoundingClientRect(), edge = dir > 0 ? B.x0 + B.w * 0.12 : B.x1 - B.w * 0.12, hand0 = H.x + H.w * (dir > 0 ? 0.74 : 0.26);
    const to = { x: edge - hand0, y: Math.max(-H.y, Math.min(R.height - (H.y + H.h), B.y1 - hc.y)) };
    setPose('walk'); sfx('swing', 0.6);
    const big = !o.miss && tierN(fx) >= 2, hits = big ? Math.max(1, Math.min(5, Math.floor(Number(o.hits) || 1))) : 1;
    if (big) ghostsOf(scene, heroBox, to, GHOSTS[fx] || 2);
    await dash(scene, heroBox, { x: 0, y: 0 }, to, 240, true);
    if (!scene.isConnected) return;
    setPose('attack');
    const leap = !o.miss && (fx === 'hammer' || fx === 'quake') && !!heroBox.animate;
    if (leap) { heroBox.animate([{ translate: `${to.x}px ${to.y}px`, opacity: 1 }, { translate: `${to.x}px ${to.y - 150}px`, opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }); await wait(260); }
    if (!o.miss && !leap) trail(scene, B, dir, fx);
    await wait(110);
    for (let k = 0; k < hits - 1 && scene.isConnected; k++) {
      void place(scene, fx, { body: B, mult: mult * 0.8, dir }); await wait(90);
      o.onHit?.({ k, n: hits }); if (!o.noDmg) dmg(scene, B.cx + (k % 2 ? 14 : -14), B.y0 + 6 - k * 6); knock(monBox, 8); shake(scene, 2, 90);
      fxHit(fx); await wait(70);
    }
    if (o.miss) { sfx('block', 0.75); await dash(scene, heroBox, to, { x: to.x - dir * 18, y: to.y }, 120, false); monBox.animate?.([{ scale: '1' }, { scale: '1.08' }, { scale: '1' }], { duration: 260 }); shake(scene, 2, 120); await wait(140); }
    else await impact(scene, monBox, fx, { ...hitO, dir, onHit: o.onHit ? () => o.onHit!({ k: hits - 1, n: hits }) : undefined });
    if (leap) { heroBox.getAnimations().forEach((an) => an.cancel()); heroBox.animate([{ translate: `${to.x}px ${to.y - 40}px`, opacity: 0 }, { translate: `${to.x}px ${to.y}px`, opacity: 1 }], { duration: 160, easing: 'ease-in' }); }
    await wait(o.ultimate ? 700 : 140);
    if (!scene.isConnected) return;
    setPose('walk');
    const cur = (heroBox.style.translate || '0px 0px').split(' ').map(parseFloat);
    await dash(scene, heroBox, { x: cur[0] || 0, y: cur[1] || 0 }, { x: 0, y: 0 }, 230, false);
  }
  heroBox.style.translate = '';
  setPose(rest);
}
export type { Spec };
