// ⚔ 공격 이펙트 = 정식 js/engine/fx.js 그대로 옮김 (2026-11-13 선생님 「똑같이 옮겨 줘」 · 🔨 용사 fx)
//   pixelfx(MIT)로 구운 도트 띠 그림(public/art/pfx)을 CSS steps 로 한 번 재생 · 자리 = 몬스터 「보이는 몸통」에 맞춤
//   표(fx2 · fxbb · ranged · heroFaces · aura · bodies) = fx-data.json (정식 assets/manifest.js 에서 뽑음 · 손으로 고치지 않음)
//   계열 · 이름 = model/hero (hero-data.json · 정식 FAMS · NAMES) · 연출만 — 데미지 · 정답 판정과 무관
import DATA from './fx-data.json';
import NEWJ from './fx-new.json';
import { FAMS, SKILL_NAMES } from '../../model/hero';
import { artUrl } from '../manifest';
import './fx.css';

export type Spec = { src: string; w: number; h: number; n: number; fps: number; px: number; py: number; pk?: number; tx?: number; hit?: number[]; mm?: string; loop?: boolean };
export const FX2 = DATA.fx2 as { fx: Record<string, Spec>; proj: Record<string, Spec> };
const FXBB = DATA.fxbb as Record<string, number[]>;
export const RANGED = DATA.ranged as Record<string, string>;
export const FACES = DATA.heroFaces as { src: string; cols: number; rows: number; eyes: (number[] | null)[] };
export const AURA = DATA.aura as Record<string, unknown> & { ring: string; orbs: string; wings: string; guardWings: string; guardShield: string; halo: string; haloBurst?: string; colors: string[] };

export const COMBO: Record<string, { fam: string; base: string; elem: string; efx: string; mats: string[] }> = {
  flamecut: { fam: 'cut', base: 'moon', elem: 'fire', efx: 'ring', mats: ['moon', 'ring'] },
  boltthrust: { fam: 'sweep', base: 'sweep', elem: 'spark', efx: 'chain', mats: ['sweep', 'chain'] },
  frostsmash: { fam: 'smash', base: 'upper', elem: 'frost', efx: 'spikes', mats: ['upper', 'spikes'] },
};
export const TIER_SCALE = [1, 1.15, 1.3, 1.5];
const ACHV = ['wings', 'smite'];
export const KINDS = [...FAMS.flatMap((f) => f.ids), ...ACHV, ...Object.keys(COMBO)];
export const NAMES: Record<string, string> = SKILL_NAMES;
export const famOf = (k: string) => FAMS.find((f) => f.ids.includes(k)) ?? (COMBO[k] ? FAMS.find((f) => f.id === COMBO[k]!.fam) : null) ?? null;
export const tierOf = (k: string): number | 's' => { if (COMBO[k]) return 1; const f = famOf(k); return f ? f.ids.indexOf(k) : ACHV.includes(k) ? 's' : -1; };
// ⚔ 새 스킬 fx 시제품 (폰 = TV 원본을 구운 띠 · tools/fxbake/bake.cjs · fx-new.json): 켜면 그 스킬만 새 띠 · 지금은 ⚔ 베기 4개 · 선생님 채택 전엔 갤러리에서만 켬
import { twinOf } from './twin';
const NEW = NEWJ as unknown as { fx: Record<string, Spec>; bb: Record<string, number[]> };
// 📜 2026-11-14 선생님 「아직 용사 스킬이 예전 거네? 지금 옮겨 줘」 = 다시 만든 것은 만들면 바로 기본 (쌍월 참 A + 👎 다시 만든 스킬 NEW_SKILLS) · 👍 받은 옛 띠(베기 Ⅰ · 달빛 베기 Ⅱ 등)는 그대로
//   mode: auto = 기본(채택한 것만 새 띠) · all = 시제품 모두(?newfx) · old = 옛 띠만(갤러리 「옛 것」 비교)
import { NEW_SKILLS } from './twin';
const ADOPTED = new Set(['twin', ...NEW_SKILLS]);
let mode: 'auto' | 'all' | 'old' = 'auto';
export const setNewFx = (on: boolean | 'auto') => { mode = on === 'auto' ? 'auto' : on ? 'all' : 'old'; };
// 🌙 쌍월 참 시제품 (twin-a · b · c) = 갤러리 · TV ?twin= 이 고른 것 (slash.ts setTwin)
const twinKey = (k: string) => (k === 'twin' && NEW.fx[`twin-${twinOf()}`] ? `twin-${twinOf()}` : k);
export const isNewFx = (k: string) => !!NEW.fx[twinKey(k)] && (mode === 'all' || (mode === 'auto' && ADOPTED.has(k)));
export const spec = (k: string): Spec | null => (isNewFx(k) ? NEW.fx[twinKey(k)]! : FX2.fx[k] ?? (COMBO[k] ? FX2.fx[COMBO[k]!.base] ?? null : null));
const url = (sp: Spec) => artUrl(`art/${sp.src}`);
const imgs: Record<string, HTMLImageElement> = {};
export const load = (sp: Spec) => { const u = url(sp); if (!imgs[u] && typeof Image !== 'undefined') { const im = new Image(); im.src = u; imgs[u] = im; } return imgs[u]; };
export const preload = (ks: string | string[]) => [ks].flat().forEach((k) => { const sp = spec(k) ?? FX2.proj[k]; if (sp) load(sp); });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 🔲 #33 도트 패치: 배율 0.25 단위 · 자리 · 칸 크기 정수 픽셀 */
export const q4 = (s: number) => Math.max(0.25, Math.round(s * 4) / 4);
const px = (v: number) => Math.round(v);

/** 띠 그림 하나 (x, y = 맞는 점) · s = 배율 · loop = 탄(날아가는 동안) */
export function strip(box: HTMLElement, sp: Spec, x: number, y: number, s: number, opt: { loop?: boolean; z?: number } = {}) {
  const el = document.createElement('i'); el.className = 'fx-spr' + (opt.loop ? ' loop' : '');
  s = q4(s); const W = px(sp.w * s), H = px(sp.h * s), dur = sp.n / sp.fps;
  el.style.cssText = `left:${px(x - sp.px * s)}px;top:${px(y - sp.py * s)}px;width:${W}px;height:${H}px;background-image:url('${url(sp)}');background-size:${W * sp.n}px ${H}px;--fx-end:${-W * sp.n}px;animation-duration:${dur.toFixed(3)}s;animation-timing-function:steps(${sp.n});${opt.z ? `z-index:${opt.z};` : ''}`;
  load(sp); box.appendChild(el);
  if (!opt.loop) setTimeout(() => el.remove(), dur * 1000 + 80);
  return el;
}
// 🎯 자리 잡기 v3: 그림의 「보이는 부분」(fxbb) 을 몬스터 「보이는 몸통」에 · ground = 발끝 · body = 몸통 가운데 · shot = 손 → 몸통
export const GROUND = ['flame', 'ring', 'fire', 'pillar', 'lightning', 'thunder', 'frost', 'spikes', 'ice', 'nova', 'mana', 'meteor', 'vortex', 'void', 'smite', 'hammer', 'quake', 'cyclone', 'leaf'];
export const SHOT = ['orb', 'chain'];
export const modeOf = (k: string) => (SHOT.includes(k) ? 'shot' : GROUND.includes(k) ? 'ground' : 'body');
const bbOf = (k: string, sp: Spec) => (isNewFx(k) ? NEW.bb[k] : FXBB[k]) ?? [0, 0, sp.w, sp.h];
function stripXY(box: HTMLElement, sp: Spec, left: number, top: number, sx: number, sy: number, opt: { z?: number; rot?: number; ox?: number; oy?: number; flip?: boolean } = {}) {
  const el = document.createElement('i'); el.className = 'fx-spr';
  const W = px(sp.w * sx), H = px(sp.h * sy), dur = sp.n / sp.fps;
  el.style.cssText = `left:${px(left)}px;top:${px(top)}px;width:${W}px;height:${H}px;background-image:url('${url(sp)}');background-size:${W * sp.n}px ${H}px;--fx-end:${-W * sp.n}px;animation-duration:${dur.toFixed(3)}s;animation-timing-function:steps(${sp.n});z-index:${opt.z || 20};${opt.rot ? `transform-origin:${(opt.ox ?? 0).toFixed(1)}px ${(opt.oy ?? 0).toFixed(1)}px;transform:rotate(${opt.rot.toFixed(3)}rad);` : opt.flip ? 'transform:scaleX(-1);' : ''}`;
  load(sp); box.appendChild(el); setTimeout(() => el.remove(), dur * 1000 + 80);
  return el;
}
export type Body = { x0: number; y0: number; x1: number; y1: number; w: number; h: number; cx: number; cy: number };
/** place(상자, 종류, { body, from, mult, perfect, flat, mode, dir }) → 끝나면 */
export function place(box: HTMLElement, kind: string, o: { body?: Body | null; from?: { x: number; y: number }; mult?: number; perfect?: boolean; flat?: boolean; mode?: string; dir?: number } = {}): Promise<unknown> {
  if (!box) return Promise.resolve();
  if (!KINDS.includes(kind) && !spec(kind)) kind = 'flame';
  const sp = spec(kind), B = o.body; if (!sp || !B) return play(box, kind, o);
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  const bb = bbOf(kind, sp) as [number, number, number, number], bw = Math.max(1, bb[2] - bb[0]), bh = Math.max(1, bb[3] - bb[1]), bcx = (bb[0] + bb[2]) / 2, bcy = (bb[1] + bb[3]) / 2;
  const w = B.x1 - B.x0, h = B.y1 - B.y0, cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, mode = isNewFx(kind) ? 'body' : o.mode || modeOf(kind);
  const t = tierOf(kind), tier = o.flat || isNewFx(kind) ? 1 : t === 's' ? TIER_SCALE[3]! : TIER_SCALE[t as number] || 1, mult = (o.mult || 1) * (o.perfect ? 1.15 : 1);
  let s = isNewFx(kind) ? w / bw : Math.min((w * (mode === 'ground' ? 1.15 : 1)) / bw, (h * (mode === 'ground' ? 1.9 : 1.4)) / bh);
  s = q4(clamp(s * tier * mult, 0.6, 8));
  let el: HTMLElement;
  if (mode === 'shot' && o.from) {
    const tx = sp.tx || bb[2], hit = { x: cx - w * 0.12, y: cy }, dx = hit.x - o.from.x, dy = hit.y - o.from.y, L = Math.max(20, Math.hypot(dx, dy));
    const sx = L / Math.max(10, tx - sp.px), sy = q4(clamp(Math.min(s, sx * 1.4), 0.6, 8));
    el = stripXY(box, sp, o.from.x - sp.px * sx, o.from.y - bcy * sy, sx, sy, { z: 21, rot: Math.atan2(dy, dx), ox: sp.px * sx, oy: bcy * sy });
  } else if (isNewFx(kind)) { el = stripXY(box, sp, cx - bcx * s, cy - bcy * s, s, s, { flip: (o.dir || 1) < 0 }); // 새 띠 = 몸통 상자에 그대로 (단계 크기 · 방향은 구울 때)
  } else if (!o.mode && (sp.mm === 'cross' || sp.mm === 'cross-wide')) {
    const R = box.getBoundingClientRect(), dir = o.dir || 1, sx = Math.min(w * 2.4, R.width * 0.9) / bw, sy = q4(clamp(Math.min(sx, (h * (sp.mm === 'cross' ? 1.2 : 1.9)) / bh) * tier * mult, 0.6, 8));
    const left = clamp(cx + dir * w * 0.2 - (bw * sx) / 2 - bb[0] * sx, -bb[0] * sx, R.width - bb[2] * sx);
    el = stripXY(box, sp, left, cy - bcy * sy, sx, sy, { flip: dir < 0 });
  } else if (!o.mode && (sp.mm === 'drop' || sp.mm === 'drop-wide')) {
    const sd = q4(clamp(Math.min((w * (sp.mm === 'drop' ? 1.3 : 2.2)) / bw, (B.y1 * 0.95) / Math.max(1, bb[3])) * tier * mult, 0.6, 8));
    el = stripXY(box, sp, cx - bcx * sd, B.y1 - bb[3] * sd, sd, sd);
  } else if (!o.mode && sp.mm === 'wide') {
    const s2 = q4(clamp(Math.min((w * 2) / bw, (h * 1.9) / bh) * tier * mult, 0.6, 8)); el = stripXY(box, sp, cx - bcx * s2, cy - bcy * s2, s2, s2);
  } else if (mode === 'ground') el = stripXY(box, sp, cx - bcx * s, B.y1 + h * 0.03 - bb[3] * s, s, s);
  else el = stripXY(box, sp, cx - bcx * s, cy - bcy * s, s, s);
  return new Promise((res) => setTimeout(() => res(el), (sp.n / sp.fps) * 1000));
}
/** 이펙트 한 번 (자리만 · 몸통 정보 없을 때) */
export function play(box: HTMLElement, kind: string, opt: { x?: number; y?: number; s?: number; scale?: number; floor?: number; perfect?: boolean; flat?: boolean } = {}): Promise<unknown> {
  if (!box) return Promise.resolve();
  if (!KINDS.includes(kind) && !spec(kind)) kind = 'flame';
  const sp = spec(kind); if (!sp) return Promise.resolve();
  const r = box.getBoundingClientRect();
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  const x = opt.x ?? r.width / 2, y = opt.y ?? r.height / 2;
  let s = opt.s || clamp((opt.scale || Math.min(r.width, r.height) / 520) / 0.3, 0.6, 3);
  if (opt.perfect) s *= 1.2;
  if (!opt.flat) { const t = tierOf(kind); s *= t === 's' ? TIER_SCALE[3]! : TIER_SCALE[t as number] || 1; }
  const floor = opt.floor ?? y + 22 * s, ground = !sp.tx && sp.py / sp.h > 0.7;
  const el = strip(box, sp, sp.tx ? x - sp.tx * s : x, sp.tx || ground ? floor : y, s, { z: 20 });
  return new Promise((res) => setTimeout(() => res(el), (sp.n / sp.fps) * 1000));
}
