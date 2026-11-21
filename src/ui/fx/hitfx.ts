// 💥 몬스터 피격 손맛 공용 조각 (📜 게시판 던전 #38 · #42 → 요청 #54 수업 레이드 TV · 학생 폰 · 교사 시연에도) — 화면 틀과 상관없이 DOM 에 바로 띄움 · 규칙 · 수치 안 바꿈
//   hitNumber = 피해 숫자 단계(보통 흰 · 치명 노랑 · 약점 빨강 · 스킬 크게 · 각성 금 · 빗나감 회색) · 폰 = 내 것 크게 · 친구 작게 · TV = 지금 크기 + 단계 색만
//   hitBits = 파편(몬스터 맞는 그림 종류 색 · 모양) · hitReel = 큰 공격 휘청 · crackStep = 75 · 50 · 25% 넘을 때 금 단계(MonCrack.svelte 가 그림)
//   흰 잔상 = 체력 막대 뒤에 <i class="hitfx-lag" style="width:…%"> (0.4초 머문 뒤 0.3초에 줄어듦)

export type HitTier = 'norm' | 'crit' | 'weak' | 'sk' | 'ult' | 'miss';
export type HitView = 'phone' | 'tv';
/** 단계 고르기 (먼저 맞는 것) */
export const hitTier = (o: { miss?: boolean; ult?: boolean; skill?: boolean; crit?: boolean; weak?: boolean }): HitTier => (o.miss ? 'miss' : o.ult ? 'ult' : o.skill ? 'sk' : o.crit ? 'crit' : o.weak ? 'weak' : 'norm');
/** 몬스터 맞는 그림 종류 → 파편 색 · 모양 */
export const BITS: Record<string, { c: string; r: string }> = { smash: { c: '#b8a898', r: '30%' }, ram: { c: '#b8a898', r: '30%' }, claw: { c: '#7ad86a', r: '2px' }, bite: { c: '#7ad86a', r: '2px' }, fire: { c: '#ff8a2a', r: '50%' }, ice: { c: '#bff0ff', r: '1px' }, poison: { c: '#6aff6a', r: '50% 50% 50% 0' }, beam: { c: '#fff7b0', r: '1px' }, bolt: { c: '#fff7b0', r: '1px' }, lash: { c: '#5ac85a', r: '0 70% 0 70%' } };
export const HIT_MS = { num: 900, numFriend: 600, numTv: 900, bit: 420, lagHold: 400, lagMs: 300 } as const;
const lowEnd = () => typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));

const CSS = `
.hitfx-num{position:absolute;z-index:40;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;font:900 22px var(--font,system-ui);color:#fff;-webkit-text-stroke:1px #000;paint-order:stroke fill;text-shadow:0 2px 0 #000;animation:hitfx-up .9s cubic-bezier(.2,1.4,.4,1) forwards}
.hitfx-num.me{font-size:40px;-webkit-text-stroke:3px #000;text-shadow:0 3px 0 #000,0 0 10px #0009;z-index:41}
.hitfx-num.fr{font-size:15px;opacity:.7;animation-duration:.6s}
.hitfx-num.tv{font-size:34px;-webkit-text-stroke:2px #000}
.hitfx-num.crit{color:#ffe066}.hitfx-num.crit.me{font-size:56px}.hitfx-num.weak{color:#ff4a3a}
.hitfx-num.sk.me{font-size:50px}.hitfx-num.sk.fr{font-size:19px}.hitfx-num.sk.tv{font-size:42px}
.hitfx-num.ult{color:#ffd34d;text-shadow:0 0 12px #ffb84a,0 3px 0 #6a3a00}.hitfx-num.ult.me{font-size:64px}.hitfx-num.ult.fr{font-size:22px}.hitfx-num.ult.tv{font-size:48px}
.hitfx-num.miss{color:#ccc}
.hitfx-num.sum{font-size:30px}.hitfx-num.sum.me{font-size:58px}.hitfx-num.sum.fr{font-size:20px}.hitfx-num.sum.tv{font-size:40px}
@keyframes hitfx-up{0%{opacity:0;scale:.4}15%{opacity:1;scale:1.25}30%{scale:1}100%{opacity:0;translate:0 -46px}}
.hitfx-bit{position:absolute;z-index:39;width:7px;height:7px;margin:-3px 0 0 -3px;pointer-events:none;box-shadow:0 0 4px #0008;animation:hitfx-bit .42s ease-out forwards}
@keyframes hitfx-bit{from{transform:translate(0,0) rotate(0);opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}
.hitfx-lag{position:absolute;left:0;top:0;bottom:0;background:#fff9;transition:width .3s ease-in .4s;pointer-events:none}
@media (prefers-reduced-motion:reduce){.hitfx-num,.hitfx-bit{animation-duration:.01s}}`;
let cssDone = false;
/** 공용 CSS 한 번 넣기 (부를 때 저절로) */
export function hitCss(): void { if (cssDone || typeof document === 'undefined') return; cssDone = true; const s = document.createElement('style'); s.id = 'hitfx-css'; s.textContent = CSS; document.head.appendChild(s); }

/** 피해 숫자 하나 · host = 자리 기준 요소(position 있음) · x · y = host 안 px · text = 「−12」 · 「💥 치명! −20」 같은 글 */
export function hitNumber(host: HTMLElement | null, x: number, y: number, text: string, o: { tier?: HitTier; mine?: boolean; view?: HitView; sum?: boolean } = {}): HTMLElement | null {
  if (!host) return null; hitCss();
  const el = document.createElement('b'), tier = o.tier ?? 'norm', who = o.view === 'tv' ? 'tv' : o.mine ? 'me' : 'fr';
  el.className = `hitfx-num ${tier} ${who}${o.sum ? ' sum' : ''}`; el.dataset.k = 'hitfx-num'; el.textContent = text; el.style.left = `${x}px`; el.style.top = `${y}px`;
  host.appendChild(el); setTimeout(() => el.remove(), o.view === 'tv' ? HIT_MS.numTv : o.mine ? HIT_MS.num : HIT_MS.numFriend); return el;
}
/** 피해 숫자 글 (단계 머리말 + 숫자) */
export const hitText = (dmg: number, tier: HitTier): string => (tier === 'miss' ? '빗나감' : `${tier === 'crit' ? '💥 치명! ' : tier === 'weak' ? '약점! ' : ''}−${dmg}`);
/** 여러 타 = 마지막에 「합계 −n」 */
export const hitSum = (host: HTMLElement | null, x: number, y: number, total: number, o: { tier?: HitTier; mine?: boolean; view?: HitView } = {}) => hitNumber(host, x, y, `합계 −${total}`, { ...o, sum: true });
/** 파편 = 몬스터 맞는 그림 종류 색 · 모양 · 4 ~ 6개(큰 공격 ×2 · 저사양 3개) */
export function hitBits(host: HTMLElement | null, x: number, y: number, kind: string, mul = 1): void {
  if (!host) return; hitCss();
  const P = BITS[kind] ?? BITS.smash!, n = lowEnd() ? 3 : (4 + Math.floor(Math.random() * 3)) * mul;
  for (let i = 0; i < n; i++) { const el = document.createElement('i'); el.className = 'hitfx-bit'; const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 50; el.style.cssText = `left:${x}px;top:${y}px;background:${P.c};border-radius:${P.r};--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v - 20}px;--rot:${Math.round(Math.random() * 360)}deg`; host.appendChild(el); setTimeout(() => el.remove(), HIT_MS.bit); }
}
/** 큰 공격 = 몬스터가 뒤로 밀리며 비틀 (strong = 2배 · px = 밀리는 거리) */
export function hitReel(el: HTMLElement | null, strong = false, px = 24): void {
  const k = strong ? 2 : 1; el?.animate?.([{ translate: '0 0', rotate: '0deg' }, { translate: `${Math.round(px * k)}px 0`, rotate: `${-6 * k}deg`, offset: 0.3 }, { translate: '0 0', rotate: '0deg' }], { duration: 480 + 120 * (k - 1), easing: 'ease-out' });
}
/** 금 단계 = 체력 비율 → 0 ~ 3 (75 · 50 · 25%) */
export const crackLevel = (hp: number, max: number): 0 | 1 | 2 | 3 => { const r = max > 0 ? hp / max : 1; return r <= 0.25 ? 3 : r <= 0.5 ? 2 : r <= 0.75 ? 1 : 0; };
/** 줄어드는 중에 단계를 새로 넘었나 → 새 단계(넘으면 크게 휘청 · 「쿵」) · 아니면 null */
export const crackStep = (prevLv: number, hp: number, max: number): number | null => { const lv = crackLevel(hp, max); return lv > prevLv ? lv : null; };
/** 단계 넘음 = 크게 휘청 (위아래로 한 번 더) */
export function crackShake(el: HTMLElement | null, px = 16): void { el?.animate?.([{ translate: '0 0', rotate: '0deg' }, { translate: `${px}px 4px`, rotate: '-4deg', offset: 0.25 }, { translate: `-${Math.round(px / 2)}px 0`, rotate: '3deg', offset: 0.6 }, { translate: '0 0', rotate: '0deg' }], { duration: 500, easing: 'ease-out' }); }
/** 😵 용사 상태 그림 이름 (src/ui/board/atb/AtbFx.svelte 에 name 으로 · 6칸 줄 시트 · 루프) · 물결 = water · 모르는 상태 = null(지금 표시 그대로) */
export const hstOf = (st: string): string | null => ({ sleep: 'hst-sleep', bind: 'hst-bind', confuse: 'hst-confuse', fog: 'hst-water', water: 'hst-water', slow: 'hst-water', dark: 'hst-dark', frost: 'hst-frost', ice: 'hst-frost' } as Record<string, string>)[st] ?? null;
