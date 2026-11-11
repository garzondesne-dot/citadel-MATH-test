// 🧙 내 용사 시트의 「고름 → 💾 저장」 (정식 #98 규칙 그대로 · 화면은 그리기만)
//   고른 것(용사 사기 · 강화 · 스킬 칸 사기 · 출전 · 끼울 스킬 · 호칭)은 저장 전까지 💎 가 화면에서만 빠져 보임 → 저장 = 한 번에(반쯤 저장 없음)
//   산 것 = 지갑 buys { id: 'hero_8' | 'fx_moon', ver, at } (💰 경제 변경 규칙 ④) · 🌟 강화 대성공 10% = 그 단계 💎 절반 돌려받기(저장할 때)
//   📝 제출 모드 구조: 지급(이 파일 · 기록)과 보여 주기(화면 · 토스트)를 떼어 둠 — 저장 결과에 보여 줄 것(great)만 돌려줌
import { ECON_VER, type Wallet } from './wallet';
import { ENH, GREAT, HEROES, heroOf, ladder, SKILL_PRICE, SKILL_SCROLL, TITLES } from './hero';

export interface Look { hero: number; enh: number; socket: Record<string, string>; title: string }
export interface Plan { heroes: number[]; enh: number; sk: string[] }
export const emptyPlan = (): Plan => ({ heroes: [], enh: 0, sk: [] });
const has = (w: Wallet, id: string) => w.buys.some((b) => b.id === id);

/** 가진 용사 = 처음부터 열림 · 산 것 · 고른 것 (도전 · 도감 · 사진 해금은 기록이 생기면 open 으로) */
export const ownsHero = (w: Wallet, P: Plan, id: number, opened: number[] = []) => !!heroOf(id).open || opened.includes(id) || has(w, `hero_${id}`) || P.heroes.includes(id);
/** 가진 스킬 = 사다리 Ⅰ · 산 것 · 고른 것 · 윗 칸을 가지면 아래 칸도(정식 #78) */
export function ownsSkill(w: Wallet, P: Plan, hero: number, id: string): boolean {
  const lad = ladder(hero), i = lad.indexOf(id);
  if (i === 0) return true;
  if (has(w, `fx_${id}`) || P.sk.includes(id)) return true;
  return i > 0 && lad.slice(i + 1).some((k) => has(w, `fx_${k}`) || P.sk.includes(k));
}
export const nextSkill = (w: Wallet, P: Plan, hero: number) => ladder(hero).findIndex((id) => !ownsSkill(w, P, hero, id));
export const equipOf = (L: Look) => L.socket[String(L.hero)] ?? (ladder(L.hero)[0] as string);

export function cost(P: Plan, enh0: number) {
  let g = 0, s = 0;
  P.heroes.forEach((id) => { g += heroOf(id).price ?? 0; });
  for (let k = 1; k <= P.enh; k++) { const c = ENH[enh0 + k]; if (c) { g += c.g; s += c.s ?? 0; } }
  P.sk.forEach((id) => { g += SKILL_PRICE[id] ?? 0; s += SKILL_SCROLL[id] ?? 0; });
  return { g, s };
}
export const left = (w: Wallet, P: Plan, enh0: number) => { const c = cost(P, enh0); return { gem: w.gem - c.g, scroll: w.scroll - c.s }; };
export const dirty = (P: Plan, L0: Look, L: Look) => !!(P.heroes.length || P.enh || P.sk.length || L.hero !== L0.hero || L.title !== L0.title || JSON.stringify(L.socket) !== JSON.stringify(L0.socket));

/** 강화 한 칸 더 고를 수 있나 */
export function canEnh(w: Wallet, P: Plan, enh0: number) {
  const nx = ENH[enh0 + P.enh + 1]; if (!nx) return false;
  const l = left(w, P, enh0); return l.gem >= nx.g && l.scroll >= (nx.s ?? 0);
}
/** 다음 스킬 칸을 살 수 있나 (다음 칸만 · 값 · 📜) */
export function canSkill(w: Wallet, P: Plan, hero: number, enh0: number) {
  const i = nextSkill(w, P, hero); if (i < 0) return false;
  const id = ladder(hero)[i] as string, l = left(w, P, enh0);
  return SKILL_PRICE[id] != null && l.gem >= (SKILL_PRICE[id] ?? 0) && l.scroll >= (SKILL_SCROLL[id] ?? 0);
}
/** 💎 로 살 수 있는 안 가진 용사가 있나 (「용사 바꾸기」 파란 점) */
export const canHero = (w: Wallet, P: Plan, enh0: number, opened: number[] = []) => HEROES.some((h) => h.price != null && !ownsHero(w, P, h.id, opened) && left(w, P, enh0).gem >= h.price);

/** 얻은 호칭 (🧪 테스트 · 체험 = 모두 · 정식 settings 와 같음) — 수업 기록이 생기면 판정 함수를 붙임 */
export const earnedTitles = (test: boolean, got: string[] = []) => (test ? TITLES.map((t) => t.id) : ['none', 'dawn', ...got]);

export interface Saved { wallet: Wallet; look: Look; great: number; back: number }
/** 💾 저장 = 한 번에. 모자라면 오류 글(화면이 보여 줌) · rnd = 대성공 굴림(시험에서 고정) */
export function save(w: Wallet, P: Plan, L0: Look, L: Look, now: number, rnd: () => number = Math.random): Saved | string {
  const c = cost(P, L0.enh);
  if (w.gem < c.g) return `💎 조각이 ${c.g - w.gem}개 모자라요.`;
  if (w.scroll < c.s) return `📜 서술 조각이 ${c.s - w.scroll}개 모자라요.`;
  const buys = w.buys.map((b) => ({ ...b }));
  for (const id of P.heroes) { if (has(w, `hero_${id}`)) return '이미 해금한 것이 있어요 — 창을 다시 열어 주세요.'; buys.push({ id: `hero_${id}`, ver: ECON_VER, at: now }); }
  for (const id of P.sk) { if (has(w, `fx_${id}`)) return '이미 해금한 것이 있어요 — 창을 다시 열어 주세요.'; buys.push({ id: `fx_${id}`, ver: ECON_VER, at: now }); }
  let back = 0, great = 0;
  for (let k = 1; k <= P.enh; k++) { const e = ENH[L0.enh + k]; if (e && rnd() < GREAT) { back += Math.floor(e.g / 2); great++; } }
  const log = [...(w.log ?? [])];
  if (P.heroes.length || P.sk.length || P.enh) log.push(`상점 💎 −${c.g}${c.s ? ` · 📜 −${c.s}` : ''}${great ? ` · 🌟 대성공 ${great} · 💎 +${back}` : ''}`);
  return { wallet: { ...w, gem: w.gem - c.g + back, scroll: w.scroll - c.s, buys, ver: ECON_VER, log }, look: { hero: L.hero, enh: L0.enh + P.enh, socket: { ...L.socket }, title: L.title }, great, back };
}
