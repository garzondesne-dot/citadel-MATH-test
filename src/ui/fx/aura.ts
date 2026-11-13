// ✨ 강화 오라 · 🛡 +10 홀리 방패 연출 = 정식 js/engine/aura.js 그대로 옮김 (2026-11-13 🔨 용사 fx)
//   오라: 용사 그림(.art) 상자에 직접 붙임 → 용사와 같이 움직이고 같은 크기로 줄고 늚 (1 도트 = 상자 폭 1.55% · cqw)
//   바닥 고리(뒤 + 발 앞 반쪽) · 발밑 색빛 · 도는 입자(앞 반 바퀴) · 10단계 = 머리 뒤 홀리 후광(+ 빛살)만 · 교실 TV = 입자 2개까지 · 폭 40px 미만 = 그림 오라 없음
//   guard(용사 칸, onHit): 날개(감쌈 → 뒤로 쫙) · 방패(빛 모임 → 생김 → 💥 맞음 → 금 → 부서짐) · 맞는 순간 = 1120ms
//   v1.0 다른 점: MutationObserver 대신 Svelte 액션 use:aura={{ lv, tv }}
import { AURA } from './fx';
import { artUrl } from '../manifest';

const nOrb = (lv: number, tv: boolean) => Math.min(tv ? 2 : 4, lv >= 10 ? 4 : lv >= 7 ? 3 : lv >= 4 ? 2 : 1);
let css = false;
function style() {
  if (css || typeof document === 'undefined') return; css = true;
  const a = AURA, u = (f: string) => `url('${artUrl(`art/${f}`)}')`, st: string[] = [];
  for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI * 2, x = Math.cos(t) * 32, y = Math.sin(t) * 5, f = Math.sin(t) > 0; st.push(`${((i / 24) * 100).toFixed(2)}%{transform:translate(calc(var(--p)*${x.toFixed(1)}),calc(var(--p)*${y.toFixed(1)})) scale(${f ? 1 : 0.7});opacity:${f ? 1 : 0.55};z-index:${f ? 3 : 0}}`); }
  const s = document.createElement('style'); s.id = 'aura-css';
  s.textContent = `.art.au{container-type:inline-size;--p:1.55cqw;overflow:visible}
.au-s{position:absolute;pointer-events:none;image-rendering:pixelated;display:block}
.au-g{left:calc(50% - var(--p)*32);bottom:calc(var(--p)*-4);width:calc(var(--p)*64);height:calc(var(--p)*14);border-radius:50%;background:radial-gradient(closest-side,var(--au) 0%,transparent 100%);opacity:.5;animation:auGl 1.6s ease-in-out infinite alternate;z-index:0}
@keyframes auGl{to{opacity:.28;transform:scaleX(.9)}}
.au-r{left:calc(50% - var(--p)*40);bottom:calc(var(--p)*-4);width:calc(var(--p)*80);height:calc(var(--p)*80);background:${u(a.ring)} 0 var(--ay)/400% 1000% no-repeat;animation:auF .8s steps(4) infinite;filter:drop-shadow(0 0 1px var(--au)) drop-shadow(0 0 calc(var(--p)*2) var(--au));z-index:0}
.au-r.f{clip-path:inset(89% 0 0 0);z-index:2}
.au-o{left:50%;bottom:calc(var(--p)*20);width:0;height:0;animation:auO var(--d) linear infinite;z-index:3}
.au-o>.au-s{left:calc(var(--p)*-6);top:calc(var(--p)*-6);width:calc(var(--p)*12);height:calc(var(--p)*12);background:${u(a.orbs)} 0 var(--ay)/400% 1000% no-repeat;animation:auF .6s steps(4) infinite;filter:drop-shadow(0 0 2px var(--au))}
.au-h{left:calc(50% + var(--hx,0)*1.25cqw - var(--p)*41);bottom:calc(var(--hy,49.6)*1.25cqw - var(--p)*41);width:calc(var(--p)*82);height:calc(var(--p)*82);background:${u(a.halo)} 0 0/400% 100% no-repeat;animation:auF 1s steps(4) infinite;z-index:0}
.au-hb{left:calc(50% + var(--hx,0)*1.25cqw - var(--p)*41);bottom:calc(var(--hy,49.6)*1.25cqw - var(--p)*41);width:calc(var(--p)*82);height:calc(var(--p)*82);background:${a.haloBurst ? u(a.haloBurst) : 'none'} 0 0/600% 100% no-repeat;animation:auF6 1.2s steps(6) infinite;z-index:0;opacity:.95}
/* 🎨 다듬기 ⑥ (2026-11-13): +4~+9 바닥 고리 = 납작한 타원(세로 줄무늬 그림 대신) · 입자 = 별 모양 */
.au-r.el{left:calc(50% - var(--p)*30);bottom:calc(var(--p)*-3);width:calc(var(--p)*60);height:calc(var(--p)*14);background:none;border-radius:50%;border:calc(var(--p)*1.8) solid var(--au);box-shadow:0 0 calc(var(--p)*3) var(--au),inset 0 0 calc(var(--p)*3) var(--au);filter:none;animation:auEl 1.4s ease-in-out infinite alternate;box-sizing:border-box}
.au-r.el.f{clip-path:inset(50% 0 0 0)}
@keyframes auEl{from{opacity:.95;transform:scale(1)}to{opacity:.6;transform:scale(1.06,1.1)}}
.au-o.st>.au-s{left:calc(var(--p)*-5.5);top:calc(var(--p)*-5.5);width:calc(var(--p)*11);height:calc(var(--p)*11);background:radial-gradient(circle,#fff 0 22%,var(--au) 45%);clip-path:polygon(50% 0,61% 38%,100% 50%,61% 62%,50% 100%,39% 62%,0 50%,39% 38%);animation:auTw .9s ease-in-out infinite alternate;filter:drop-shadow(0 0 2px var(--au))}
@keyframes auTw{from{transform:scale(.75) rotate(0)}to{transform:scale(1.1) rotate(45deg)}}
/* 🔧 화면 고침 1 (2026-11-13 머리 방 Pixel 7): 용사 그림이 .art 자기 배경이면 오라 뒤 겹(고리 · 후광 · 빛살)이 그 위에 그려져 얼굴을 가림 → 용사 그림을 한 겹 더(au-me · z 1) 올려 오라는 늘 용사 뒤 · 앞 반쪽 고리 · 입자만 앞 */
.au-me{inset:0;background:inherit;z-index:1}
@keyframes auF6{to{background-position-x:120%}}
@keyframes auF{to{background-position-x:133.333%}}
@keyframes auO{${st.join('')}}`;
  document.head.appendChild(s);
}
/** 오라 붙이기 (lv 0 = 없음) · 돌려주는 값 = 지우기 */
/** head = 그 상자 안 머리 자리 [가로 = 상자 가운데에서, 높이 = 상자 아래에서] (옛 칸 80 px 단위 · manifest heroHead 에 그림 칸 밀림을 더한 값) · +10 후광 · 빛살 중심 = 머리 뒤 */
export function deco(art: HTMLElement, lv: number, tv = false, head?: [number, number]): () => void {
  art.querySelectorAll(':scope > .au-s').forEach((e) => e.remove()); art.classList.remove('au');
  if (!lv) return () => {};
  const w = art.getBoundingClientRect().width; if (w && w < 40) return () => {};
  style(); art.classList.add('au');
  const i = lv >= 10 ? 6 : lv - 1, col = AURA.colors[lv - 1] || '#fff';
  if (head) { art.style.setProperty('--hx', String(head[0])); art.style.setProperty('--hy', String(head[1])); }
  art.style.setProperty('--ay', `${((i / 9) * 100).toFixed(3)}%`); art.style.setProperty('--au', col);
  const holy = lv >= 10 && !!AURA.halo;
  const el = !holy && lv >= 4 ? ' el' : '', st = !holy && lv >= 4 ? ' st' : '';
  const back = holy ? `<span class="au-s au-g"></span>${AURA.haloBurst ? '<span class="au-s au-hb"></span>' : ''}<span class="au-s au-h"></span>` : `<span class="au-s au-g"></span><span class="au-s au-r${el}"></span>`;
  const n = nOrb(lv, tv), dur = (3.4 - lv * 0.1).toFixed(2);
  const front = holy ? '' : `<span class="au-s au-r f${el}"></span>${Array.from({ length: n }, (_, j) => `<span class="au-s au-o${st}" style="--d:${dur}s;animation-delay:${((-Number(dur) * j) / n).toFixed(2)}s"><span class="au-s"></span></span>`).join('')}`;
  const me = getComputedStyle(art).backgroundImage !== 'none' ? '<span class="au-s au-me"></span>' : '';
  art.insertAdjacentHTML('afterbegin', back + me); art.insertAdjacentHTML('beforeend', front);
  return () => { art.querySelectorAll(':scope > .au-s').forEach((e) => e.remove()); art.classList.remove('au'); };
}
/** Svelte 액션: <i class="art" use:aura={{ lv, tv }}> */
export function aura(node: HTMLElement, p: { lv: number; tv?: boolean; head?: [number, number] }) {
  let off = () => {}; const run = (q: { lv: number; tv?: boolean; head?: [number, number] }) => { off(); requestAnimationFrame(() => { off = deco(node, q.lv, !!q.tv, q.head); }); };
  run(p);
  return { update: run, destroy: () => off() };
}
/** ⭐ +10 「첫 공격 막기」: 날개(6칸) · 방패(6칸) · 반환 = 방패에 맞는 순간(ms) · 0 = 그림 없음 */
/** 🎨 다듬기 ⑦ (2026-11-13): 방패 70% 크기(몬스터 · 체력 막대 안 가림) · 맞는 순간 몬스터 쪽 섬광(mon = 몬스터 칸) */
export function guard(host: HTMLElement | null, onHit?: () => void, fitH = 0, mon?: Element | null): number {
  const a = AURA; if (!host || !a.guardWings) return 0;
  const art = host.querySelector('.art') as HTMLElement | null; if (!art) return 0;
  const hr = host.getBoundingClientRect(), ar = art.getBoundingClientRect(); if (!ar.width) return 0;
  const p = fitH ? Math.min(ar.width * 0.0155, (fitH * 1.05) / 170) : ar.width * 0.0155, cx = ar.left - hr.left + ar.width / 2, by = hr.bottom - ar.bottom;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.querySelector('.gd-fx')?.remove();
  const u = (f: string) => `url('${artUrl(`art/${f}`)}')`, mk = (f: string, w: number, h: number, bot: number, z: number) => { const e = document.createElement('span'); e.className = 'gd-fx'; e.style.cssText = `position:absolute;pointer-events:none;image-rendering:pixelated;left:${cx - (w * p) / 2}px;bottom:${by + bot * p}px;width:${w * p}px;height:${h * p}px;background:${u(f)} 0 0/600% 100% no-repeat;z-index:${z};opacity:0`; host.appendChild(e); return e; };
  const SK = 0.7, W = mk(a.guardWings, 206, 103, -14.8, 3), S = mk(a.guardShield, 340 * SK, 170 * SK, -10.8 * SK, 6);
  W.style.filter = 'drop-shadow(0 0 4px #fff3c0aa)';
  const fr = (el: HTMLElement, f: number, o: number) => { el.style.transition = 'none'; el.style.opacity = String(o); el.style.backgroundPositionX = `${f * 20}%`; };
  const z0 = host.style.zIndex, lift = (on: boolean) => { art.style.transition = 'transform .25s ease-out'; art.style.transform = on ? `translateY(${-6 * p}px)` : ''; };
  host.style.zIndex = '30'; host.classList.add('gd-on');
  const at = (ms: number, fn: () => void) => setTimeout(fn, ms);
  at(0, () => { lift(true); W.style.zIndex = '5'; fr(W, 1, 1); });
  at(150, () => fr(W, 2, 1));
  at(450, () => { W.style.zIndex = '0'; fr(W, 3, 1); });
  at(510, () => fr(W, 4, 1));
  at(570, () => fr(W, 5, 1));
  at(620, () => fr(S, 0, 0.9)); at(710, () => fr(S, 1, 0.9)); at(800, () => fr(S, 2, 0.9));
  at(1120, () => { fr(S, 3, 1); onHit?.(); flashAt(mon); });
  at(1320, () => fr(S, 4, 0.95)); at(1560, () => fr(S, 5, 0.9));
  at(1860, () => { S.style.transition = 'opacity .35s'; S.style.opacity = '0'; });
  at(2070, () => { W.style.transition = 'opacity .45s'; W.style.opacity = '0'; lift(false); });
  at(2600, () => { W.remove(); S.remove(); art.style.transform = ''; host.style.zIndex = z0; host.classList.remove('gd-on'); });
  return 1120;
}
export const HIT_MS = 1120;
/** 💥 맞는 순간 몬스터 쪽 흰 · 금빛 섬광 (화면 고정 · 0.4초) */
function flashAt(mon?: Element | null) {
  if (!mon || !mon.isConnected || typeof document === 'undefined') return; const r = mon.getBoundingClientRect(); if (!r.width) return;
  const e = document.createElement('i'), d = Math.max(r.width, r.height) * 1.3;
  e.style.cssText = `position:fixed;z-index:40;pointer-events:none;left:${r.left + r.width / 2 - d / 2}px;top:${r.top + r.height / 2 - d / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,#fff3c0aa 38%,transparent 68%);mix-blend-mode:screen`;
  document.body.appendChild(e); e.animate?.([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.2 }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' }); setTimeout(() => e.remove(), 450);
}
