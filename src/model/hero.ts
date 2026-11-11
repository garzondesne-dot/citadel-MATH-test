// 🧙 용사 · 스킬 사다리 · 강화 · 레벨 — 정식 값 그대로 (fx.js FAMS · NAMES · AFFINITY/NEXT · gem.js SHOP.fx · SCROLL_NEED · ENH · AURA_NAMES · grow.js level · HERO-LORE 이름)
//   기준값 시험 = tests/parity.test.ts (정식 코드가 만든 값과 같음)
export const TIER_NAMES = ['Ⅰ 기본', 'Ⅱ 숙련', 'Ⅲ 화려', 'Ⅳ 전설'];
export const FAMS: { id: string; name: string; ids: string[] }[] = [
  { id: 'cut', name: '⚔ 베기', ids: ['cut', 'moon', 'slash', 'twin'] },
  { id: 'smash', name: '🔨 강타', ids: ['bash', 'upper', 'hammer', 'quake'] },
  { id: 'sweep', name: '🌪 연격', ids: ['thrust', 'sweep', 'spin', 'reap'] },
  { id: 'wind', name: '🌬 바람', ids: ['wblade', 'gale', 'leaf', 'cyclone'] },
  { id: 'fire', name: '🔥 불', ids: ['flame', 'ring', 'fire', 'pillar'] },
  { id: 'spark', name: '⚡ 번개', ids: ['spark', 'chain', 'lightning', 'thunder'] },
  { id: 'frost', name: '❄ 얼음', ids: ['frost', 'spikes', 'ice', 'nova'] },
  { id: 'star', name: '✨ 별', ids: ['twinkle', 'mana', 'stars', 'meteor'] },
  { id: 'magic', name: '🔮 마법', ids: ['orb', 'crit', 'vortex', 'void'] },
  { id: 'math', name: '📐 수식', ids: ['ruler', 'compass', 'venn', 'qed'] },
  { id: 'sun', name: '☀ 빛', ids: ['radiant', 'bulwark', 'holysword', 'skylance'] },
  { id: 'dark', name: '🌑 어둠', ids: ['shade', 'claw', 'phantom', 'eclipse'] },
  { id: 'gear', name: '⚙ 기계', ids: ['wrench', 'cog', 'piston', 'drill'] },
  { id: 'water', name: '🌊 물', ids: ['aqua', 'wave', 'anchor', 'tsunami'] },
];
export const SKILL_NAMES: Record<string, string> = {
  cut: '⚔ 베기', moon: '⚔ 달빛 베기', slash: '⚔ 삼연 참격', twin: '⚔ 쌍월 참',
};
const AFFINITY: Record<number, string> = { 0: 'cut', 16: 'cut' };
const NEXT: Record<number, string> = {};
export const attrOf = (hero: number) => (NEXT[hero] && FAMS.some((f) => f.id === NEXT[hero]) ? NEXT[hero] : AFFINITY[hero]) as string;
export const famOfHero = (hero: number) => FAMS.find((f) => f.id === attrOf(hero)) ?? (FAMS[0] as (typeof FAMS)[number]);
/** 🪜 #96: 쓸 수 있는 스킬 = 지금 용사 사다리 4칸(내 속성 Ⅰ~Ⅳ) */
export const ladder = (hero: number) => famOfHero(hero).ids.slice();
/** 정식 SHOP.fx (사다리 Ⅱ~Ⅳ 값) · Ⅰ = 처음부터 가짐 */
export const SKILL_PRICE: Record<string, number> = { moon: 20, slash: 60, twin: 80 };
export const SKILL_SCROLL: Record<string, number> = { twin: 2 };
export const ENH: ({ g: number; s?: number } | null)[] = [null, { g: 10 }, { g: 15 }, { g: 20 }, { g: 25 }, { g: 30 }, { g: 40 }, { g: 50, s: 1 }, { g: 60, s: 1 }, { g: 80, s: 2 }, { g: 100, s: 2 }];
export const AURA_NAMES = ['', '은은한 흰빛', '새싹 초록', '맑은 하늘', '깊은 바다', '보랏빛 신비', '벚꽃 분홍', '황금 태양', '진홍 불꽃', '별빛 은하', '성스러운 후광'];
export const HERO_NAMES: Record<number, { name: string; job: string }> = { 0: { name: '로안', job: '검사' } };
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
    return { id, tier, name, gem, scroll, state: 'lock', why: `${TIER_NAMES[tier - 1] ?? ''} 먼저` };
  });
}
