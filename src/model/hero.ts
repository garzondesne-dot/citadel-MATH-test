import { SUBJ } from '../engine/subject';
// 🧙 용사 · 스킬 사다리 · 강화 · 레벨 · 호칭 — 정식 값 그대로
//   표 = hero-data.json (tools/make-hero-data.cjs 가 정식 코드에서 뽑음 · 손으로 고치지 않음)
//   기준값 시험 = tests/parity.test.ts (정식 함수가 만든 사다리 · 값 · 레벨과 같음)
import DATA from './hero-data.json';

export type HeroInfo = (typeof DATA.heroes)[number];
/** 학생 용사 (선생님 전용은 빠짐) */
export const HEROES: HeroInfo[] = DATA.heroes.filter((h) => !(h as { teacher?: boolean }).teacher);
/** 👩‍🏫 선생님 전용 용사 (현자 7 · 수학자 17 · 📜 2026-11-13 밤 교사 B안 = 교사 로그인에서만 · 모두 열림) */
export const TEACHER_HEROES: HeroInfo[] = DATA.heroes.filter((h) => (h as { teacher?: boolean }).teacher);
/** ⚡ 용사별 각성 (📜 2026-11-20 선생님 · 메타인지 8 🔨 #83 · 옛 🌟 각성한 로안 #29 규칙을 30명에게)
 *   조건 4 = 그 용사 출전 · 🔨 강화 +10 이상 · 그 속성 Ⅳ 스킬(사다리 4번째) 장착 · 그 용사 전용 칭호 장착 → 각성 모습 · 하나라도 빠지면 원래 모습
 *   데미지 · 보상 · 스킬 그대로(속성 · 사다리 = 원래 용사) · 고르는 칸 아님 · ⚠ 10강 홀리 방패의 raid.ts awake() 와 다른 것
 *   모습 id = 로안 16(옛 판 기록 그대로) · 나머지 100 + 용사 번호 · 각성 그림이 없는 용사 = 그림만 원래 것(이름 · 컷인 · 스킬 연출은 각성) */
/** 🚦 30명 각성 = 베타만 · 정식(release 빌드) = 로안만 (📜 11/20 선생님 「각성 외형 = GPT 30명 끝날 때까지 정식 대기」 · 30명 그림이 오면 이 줄만 true) */
export const AWK_ALL = import.meta.env?.VITE_CHANNEL !== 'release';
/** 정식에서도 로안 각성에 새 연출(A1 금빛 컷인 · A2 ✦ 금빛 이름 · A3 전용 연출)을 줌 — 선생님 a/b 고르기 (a = true) */
export const ROAN_NEW = true;
export type StatKey = 'str' | 'grit' | 'focus' | 'brave' | 'explore' | 'craft';
/** 🏅 전용 칭호 기준 (손발 테스트 #1 운영 읽기 · 상위 약 20% · DECISIONS 11/20) — 바꾸면 이 표만 */
export const AWK_NEED: Record<StatKey, number> = { str: 170, grit: 35, focus: 20, brave: 7, explore: 30, craft: 20 };
export const STAT_LABEL: Record<StatKey, string> = { str: '⚔ 힘', grit: '🛡 끈기', focus: '🎯 집중', brave: '👑 용기', explore: '🧭 탐험', craft: '⚒ 연성' };
/** 용사 → [전용 칭호 이름, 기록] (hero-v2 docs/handoff/awaken-titles-draft.md 그대로 · 로안 = 만 번째 베기 · 바르코 = 🏆 업적 3) */
export const AWAKEN_T: Record<number, [string, StatKey | 'seals']> = {
  1: ['밤을 읽는 마녀', 'focus'], 2: ['빗나가지 않는 화살', 'focus'], 3: ['그림자 걸음', 'explore'], 4: ['꺼지지 않는 등불', 'grit'],
  5: ['천 번 찌른 창', 'str'], 6: ['무너지지 않는 산', 'grit'], 8: ['맹세를 지킨 방패', 'brave'], 9: ['주먹 하나의 왕', 'str'],
  10: ['춤추는 칼날', 'focus'], 11: ['노래가 된 카드', 'craft'], 12: ['실패를 금으로', 'grit'], 13: ['일곱 바다의 선장', 'seals'],
  14: ['얼어붙은 시간', 'focus'], 15: ['야수와 맺은 약속', 'craft'], 18: ['혈월의 기사', 'brave'], 19: ['증명하는 자', 'grit'],
  20: ['x 를 찾은 자', 'explore'], 21: ['멈추지 않는 엔진', 'explore'], 22: ['방화벽을 뚫은 자', 'focus'], 23: ['용을 길들인 자', 'brave'],
  24: ['번개를 벤 검', 'str'], 25: ['쓰러져도 일어서는 자', 'grit'], 26: ['숲의 사냥꾼', 'explore'], 27: ['셈의 달인', 'focus'],
  28: ['완벽한 원', 'explore'], 29: ['황금 저울', 'craft'], 30: ['하늘의 눈', 'explore'], 31: ['전장의 날개', 'brave'],
  32: ['정령의 친구', 'str'], 33: ['별이 가리킨 길', 'grit'],
};
/** 전용 칭호 id (로안 = slash10k) */
export const awkTitle = (hero: number) => (hero === 0 ? 'slash10k' : AWK_ALL && AWAKEN_T[hero] ? `awk_${hero}` : null);
export const AWK_TITLES = (AWK_ALL ? Object.entries(AWAKEN_T) : []).map(([h, [name, k]]) => ({ id: `awk_${h}`, name, tier: 'o' as const, cond: k === 'seals' ? '🏆 업적 3개' : `${STAT_LABEL[k]} ${AWK_NEED[k]}`, hero: Number(h) }));
/** 🖼 각성 그림이 있는 용사 (그림이 없으면 원래 그림 · 📜 11/20 「선생님 GPT 시트 30명이 끝날 때까지 정식 배포 대기」) */
/** ⚡ 각성 GPT 시트가 들어온 용사 (🔨 #44 · 선생님 GPT 2026-11-21 · 녹스 v8 방식 · 칸델 32 = 아직) */
export const AWK_HAVE = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 33];
/** 용사 그림 이름 줄기 (hero-witch-v7.webp → witch) */
export const heroKey = (id: number) => /^hero-(.+?)-v\d+[a-z]?\.webp$/.exec(String(DATA.heroes.find((h) => h.id === id)?.sprite ?? ''))?.[1] ?? '';
export const AWK_ART: Record<number, string> = AWK_ALL ? { 0: 'hero-blond-v7.webp', ...Object.fromEntries(AWK_HAVE.map((id) => [id, `hero-${heroKey(id)}-awk-v9.webp`])) } : { 0: 'hero-blond-v7.webp' };
/** 🚫 이 판에서 칭호를 얻을 수 없는 기록 (학교판 모루 끔 = ⚒ 연성 · features 가 알려 줌 · 📜 11/20 「그 용사 각성 막음」) */
let craftOn: () => boolean = () => true;
export const setCraftOn = (f: () => boolean) => { craftOn = f; };
export const awakenBlocked = (hero: number) => AWAKEN_T[hero]?.[1] === 'craft' && !craftOn();
export const BLOND = { base: 0, to: 16, enh: 10, fx: 'twin', title: 'slash10k' } as const; // 📜 11/17 옛 🌟 각성한 로안 (모습 id 16 은 그대로)
export const AWK_ENH = 10;
export type LookIn = { hero?: number | null; enh?: number | null; fx?: string | null; title?: string | null };
/** 각성 모습 id (그 용사가 각성했을 때) */
export const awkId = (hero: number) => (hero === 0 ? BLOND.to : 100 + hero);
/** 모습 id → 원래 용사 (각성 아니면 그대로) */
export const baseOf = (id: number) => (id === BLOND.to ? 0 : id >= 100 && AWAKEN_T[id - 100] ? id - 100 : id);
export const isAwkId = (id: number) => id === BLOND.to || (AWK_ALL && id >= 100 && !!AWAKEN_T[id - 100]);
/** ⚡ 새 각성 연출(A1 컷인 · A2 ✦ · A3)을 이 모습에 줄까 */
export const awkFx = (id: number) => isAwkId(id) && (AWK_ALL || ROAN_NEW);
/** 용사 hero 의 각성 조건 4칸 (p = 지금 모습 · hero 를 안 주면 p.hero) */
export const awakenChecks = (p: LookIn, hero: number = Number(p.hero) || 0) => {
  const fx = (famOfHero(hero).ids[3]) as string, t = awkTitle(hero);
  return [
    { k: 'hero', t: `${heroOf(hero).name} 출전`, ok: Number(p.hero) === hero },
    { k: 'enh', t: `🔨 강화 +${AWK_ENH}`, ok: (Number(p.enh) || 0) >= AWK_ENH },
    { k: 'fx', t: `⚔ ${skillName(fx)} 장착`, ok: p.fx === fx },
    { k: 'title', t: `🏅 호칭 「${(t && titleOf(t)?.name) || '?'}」 장착`, ok: !!t && p.title === t },
  ];
};
export const isAwakened = (p: LookIn) => { const h = Number(p.hero) || 0; return !!awkTitle(h) && !awakenBlocked(h) && awakenChecks(p, h).every((c) => c.ok); };
/** 옛 이름 (로안 칸) */
export const blondChecks = (p: LookIn) => awakenChecks(p, 0);
export const isBlond = (p: LookIn) => Number(p.hero) === 0 && isAwakened(p);
/** 보이는 모습 id (조건이 맞으면 각성 id · 아니면 고른 용사) */
export const lookId = (p: LookIn) => { const h = Number(p.hero) || 0; return isAwakened(p) ? awkId(h) : h; };
const AWK_INFO = new Map<number, HeroInfo>();
function awkInfo(id: number): HeroInfo {
  let v = AWK_INFO.get(id);
  if (!v) {
    const b = baseOf(id), r = DATA.heroes.find((h) => h.id === b) as HeroInfo;
    v = { ...r, id, name: `각성한 ${r.name}`, nick: b === 0 ? '만 번을 넘은 검' : AWAKEN_T[b]![0], sprite: AWK_ART[b] || r.sprite, price: null } as unknown as HeroInfo;
    AWK_INFO.set(id, v);
  }
  return v;
}
export const heroOf = (id: number): HeroInfo => (isAwkId(id) ? awkInfo(id) : DATA.heroes.find((h) => h.id === id) ?? (HEROES[0] as HeroInfo));
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
export const attrOf = (hero: number) => (DATA.heroes as HeroInfo[]).find((h) => h.id === baseOf(hero))?.attr ?? 'cut'; // 16 각성한 로안 = 로안과 같은 ⚔
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
const T0: Title[] = [...BASE_T.slice(0, AT), ...SUBJ.titles.list, ...BASE_T.slice(AT)], AK = T0.findIndex((t) => t.id === 'slash10k') + 1;
/** ⚡ 용사 전용 칭호 30 = 「만 번째 베기」 바로 뒤 */
export const TITLES: Title[] = [...T0.slice(0, AK), ...AWK_TITLES, ...T0.slice(AK)];
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
