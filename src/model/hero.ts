import { SUBJ } from '../engine/subject';
// 🧙 용사 · 스킬 사다리 · 강화 · 레벨 · 호칭 — 정식 값 그대로
//   표 = hero-data.json (tools/make-hero-data.cjs 가 정식 코드에서 뽑음 · 손으로 고치지 않음)
//   기준값 시험 = tests/parity.test.ts (정식 함수가 만든 사다리 · 값 · 레벨과 같음)
import DATA from './hero-data.json';

export type HeroInfo = (typeof DATA.heroes)[number];
export const HEROES: HeroInfo[] = DATA.heroes;
export const heroOf = (id: number): HeroInfo => HEROES.find((h) => h.id === id) ?? (HEROES[0] as HeroInfo);
export const TIER_NAMES = ['Ⅰ 기본', 'Ⅱ 숙련', 'Ⅲ 화려', 'Ⅳ 전설'];
export const TN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
export const FAMS: { id: string; name: string; ids: string[] }[] = DATA.fams;
const FX = DATA.fx as Record<string, { name: string; fam: string; tier: number; price: number | null; scroll: number }>;
// 스킬 이름 = 엔진 기본 이름 · 과목 팩이 정한 이름이 있으면 그것 (#140 · SUBJ.skillNames)
export const SKILL_NAMES: Record<string, string> = Object.fromEntries(Object.entries(FX).map(([k, v]) => [k, SUBJ.skillNames?.[k] ?? v.name]));
export const SKILL_PRICE: Record<string, number> = Object.fromEntries(Object.entries(FX).filter(([, v]) => v.price != null).map(([k, v]) => [k, v.price as number]));
export const SKILL_SCROLL: Record<string, number> = Object.fromEntries(Object.entries(FX).filter(([, v]) => v.scroll).map(([k, v]) => [k, v.scroll]));
/** 「⚔ 달빛 베기」 → 「달빛 베기」 */
export const skillName = (id: string) => (SKILL_NAMES[id] ?? id).replace(/^\S+\s/, '');
export const attrOf = (hero: number) => HEROES.find((h) => h.id === hero)?.attr ?? 'cut'; // 16 각성한 로안 = 로안과 같은 ⚔
export const famOfHero = (hero: number) => FAMS.find((f) => f.id === attrOf(hero)) ?? (FAMS[0] as (typeof FAMS)[number]);
/** 🪜 #96: 쓸 수 있는 스킬 = 지금 용사 사다리 4칸(내 속성 Ⅰ~Ⅳ) */
export const ladder = (hero: number) => famOfHero(hero).ids.slice();
export const ENH: ({ g: number; s?: number } | null)[] = DATA.enh;
export const ENH_MAX = ENH.length - 1;
export const AURA_NAMES: string[] = DATA.aura as string[];
/** 정식 style.css .aura-1 ~ .aura-10 (빛 색 · 둘째 빛 · 번짐) */
export const AURA_CSS: [string, string, number][] = [['', '', 0], ['#e8eef8', '#ffffff', 3], ['#7dff9a', '#e6ffe9', 4], ['#6fd8ff', '#e6f8ff', 4], ['#3a7bff', '#cfe0ff', 5], ['#b06bff', '#f0e2ff', 5], ['#ff7ac8', '#ffe6f4', 6], ['#ffc23a', '#fff3c0', 6], ['#ff4a3a', '#ffd0b0', 7], ['#8a6bff', '#5ae8ff', 7], ['#ffd86a', '#fffbe6', 8]];
/** 🌟 강화 대성공 10% = 그 단계 💎 절반 돌려받기 (정식 gem.js GREAT) */
export const GREAT = 0.1;
export const HERO_NAMES: Record<number, { name: string; job: string }> = Object.fromEntries(HEROES.map((h) => [h.id, { name: h.name, job: h.job }]));
type Title = { id: string; name: string; tier: 'w' | 'b' | 'p' | 'o'; cond: string };
// 칭호 = 엔진 칭호 + 과목 칭호(SUBJ.titles · after 뒤에 끼움 · #136)
const BASE_T = DATA.titles as Title[], AT = BASE_T.findIndex((t) => t.id === SUBJ.titles.after) + 1;
export const TITLES: Title[] = [...BASE_T.slice(0, AT), ...SUBJ.titles.list, ...BASE_T.slice(AT)];
export const titleOf = (id: string) => TITLES.find((t) => t.id === id) ?? null;
export const STATS = DATA.stats;
export const PORTRAITS = DATA.portraits as unknown as { src: string; cols: number; rows: number; list: Record<string, [number, number]> };
export const SHEET = DATA.sheet;
/** 정식 Unit.CARDS 수 (도감 칸) */
export const CARD_TOTAL = 54;
const LV_TITLES = ['견습 용사', '풋내기 용사', '용사', '숙련 용사', '기사', '정예 기사', '기사단장', '수호자', '영웅', '전설의 용사'];
const need = (lv: number) => 40 + 20 * (lv - 1);
/** 정식 grow.js level: Lv.L → L+1 에 필요한 EXP = 40 + 20 × (L − 1) */
export function level(total: number) {
  let lv = 1, rest = Math.max(0, Number(total) || 0);
  while (rest >= need(lv) && lv < 99) { rest -= need(lv); lv++; }
  const title = lv <= LV_TITLES.length ? (LV_TITLES[lv - 1] as string) : `${LV_TITLES[LV_TITLES.length - 1]} ★${lv - LV_TITLES.length}`;
  return { lv, title, into: rest, next: need(lv), total: Number(total) || 0 };
}
export type Rung = { id: string; tier: number; name: string; state: 'equip' | 'own' | 'buy' | 'lock'; gem: number; scroll: number; why?: string };
/** 사다리 4칸 상태 (#96: 다음 칸만 살 수 있음 · Ⅳ 는 📜 도) */
export function rungs(hero: number, owned: string[], equip: string, wallet: { gem: number; scroll: number }): Rung[] {
  const ids = ladder(hero), have = new Set([ids[0] as string, ...owned]);
  const nextIdx = ids.findIndex((k) => !have.has(k));
  return ids.map((id, tier) => {
    const gem = SKILL_PRICE[id] ?? 0, scroll = SKILL_SCROLL[id] ?? 0, name = SKILL_NAMES[id] ?? id;
    if (have.has(id)) return { id, tier, name, gem, scroll, state: id === equip ? 'equip' : 'own' };
    if (tier === nextIdx) return wallet.gem >= gem && wallet.scroll >= scroll ? { id, tier, name, gem, scroll, state: 'buy' } : { id, tier, name, gem, scroll, state: 'lock', why: wallet.gem < gem ? `💎 ${gem - wallet.gem} 모자람` : `📜 ${scroll - wallet.scroll} 모자람` };
    return { id, tier, name, gem, scroll, state: 'lock', why: `${TN[tier - 1] ?? ''} 먼저` };
  });
}
/** 필살기 판정 한 줄 (정식 camp.js verdict) */
export const verdict = (tier: number) => (tier === 3 ? '⚡ 필살기 · 🌟 진필살기 모두 가능' : tier === 2 ? '⚡ 필살기 가능 · 🌟 진필살기는 Ⅳ 부터' : '필살기 없음 · ⚡ 는 Ⅲ 부터');
