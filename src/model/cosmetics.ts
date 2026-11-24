// 🎨 옷장 (꾸미기 상점 1차 · 📜 2026-11-25 선생님 컨펌 · 머리 🔨 · 설계 gem-sinks DESIGN-v1 2절)
//   겉모습만(전투 · 정답 · 보상 영향 없음) · 뽑기 없음 · 값은 정해져 있음 · 입어 보기 → 사기 · 되팔기 · 선물 없음
//   1차 = 코드로 되는 5종(이름표 색 8 · 이름표 테두리 4 · 공격 이펙트 색 6 · 발밑 빛 5 · 용사 카드 배경 색 무늬 6) · 그림이 필요한 것(카드 배경 그림 · 텐트 가구 · 용사 염색 · 둥지)은 뒤에
//   산 것 = 지갑 buys `cos_{물건}` (다른 산 것과 같은 길 · 늘기만) · 입은 것 = accounts/{반}/{번호}/cos { 종류: 물건 } (친구 · TV 가 읽음)
//   💎 로그 = gem/{반}/{번호}/log/cos_{물건} { g: 0, spend: 값, at, why } — g 0 = 받은 💎 셈(게시판 하루 200 · 누적)에 안 섞임
import { ECON_VER, type Wallet } from './wallet';

export type CosKind = 'nameColor' | 'nameFrame' | 'fx' | 'aura' | 'cardBg' | 'furn';
export type CosOn = Partial<Record<CosKind, string>>;
export interface CosItem { id: string; kind: CosKind; name: string; /** 색 · 무늬 값 (종류마다 뜻이 다름) */ v: string; v2?: string; /** 💎 값 (없으면 종류 값) */ price?: number; /** 그림 (art/… · 카드 배경 그림 · 가구) */ img?: string }

/** 💎 값 = 이 표 한 곳 (잔액을 보고 다시 맞출 때 여기만) */
export const COS_PRICE: Record<CosKind, number> = { nameColor: 40, nameFrame: 120, fx: 80, aura: 100, cardBg: 60, furn: 200 };
/** 💎 그림이 있는 물건 값 (같은 표 · 📜 11/25 설계 값표: 카드 배경 그림 150 · 텐트 가구 150 ~ 300) */
export const COS_ART_PRICE = { cardImg: 150, furn: { flag: 150, lamp: 200, desk: 250, plant: 150, chest: 300, rug: 200 } } as const;
export const COS_KINDS: { k: CosKind; ic: string; name: string }[] = [
  { k: 'nameColor', ic: '🏷', name: '이름표 색' },
  { k: 'nameFrame', ic: '✨', name: '이름표 테두리' },
  { k: 'fx', ic: '⚔', name: '공격 색' },
  { k: 'aura', ic: '🔆', name: '발밑 빛' },
  { k: 'cardBg', ic: '🪪', name: '카드 배경' },
  { k: 'furn', ic: '⛺', name: '텐트 가구' },
];
const I = (kind: CosKind, id: string, name: string, v: string, v2?: string): CosItem => ({ id, kind, name, v, ...(v2 ? { v2 } : {}) });
const ART = (f: string) => `art/cos/${f}`;
const CARD_IMG = (id: string, name: string, f: string): CosItem => ({ id, kind: 'cardBg', name, v: `#1a1424 url(${ART(f)}) center / cover no-repeat`, price: COS_ART_PRICE.cardImg, img: ART(f) });
const FURN = (k: keyof typeof COS_ART_PRICE.furn, name: string): CosItem => ({ id: `fu_${k}`, kind: 'furn', name, v: k, price: COS_ART_PRICE.furn[k], img: ART(`furn-${k}-v1.webp`) });
export const COS: CosItem[] = [
  // 🏷 이름표 색 = 글자 색 (어두운 바탕 · 밝은 바탕 모두 읽히는 밝기)
  I('nameColor', 'nc_gold', '금빛', '#ffd25a'), I('nameColor', 'nc_sky', '하늘', '#7cd4ff'), I('nameColor', 'nc_mint', '민트', '#6ee7b7'), I('nameColor', 'nc_rose', '장미', '#ff8fb1'),
  I('nameColor', 'nc_violet', '보라', '#c4a1ff'), I('nameColor', 'nc_flame', '불꽃', '#ff8a4c'), I('nameColor', 'nc_lime', '연두', '#c6f26b'), I('nameColor', 'nc_snow', '눈꽃', '#f4f8ff'),
  // ✨ 이름표 테두리 = 움직이는 테두리(CSS) · v = 주 색 · v2 = 둘째 색
  I('nameFrame', 'nf_spark', '반짝', '#ffe27a', '#fff6c8'), I('nameFrame', 'nf_fire', '불꽃', '#ff6a2b', '#ffc04d'), I('nameFrame', 'nf_star', '별', '#9fb6ff', '#ffffff'), I('nameFrame', 'nf_ice', '얼음', '#8fe8ff', '#e6fbff'),
  // ⚔ 공격 이펙트 색 = 내 공격 그림 색조 돌리기(도) · v2 = 견본 색
  I('fx', 'fx_red', '붉은', '-30', '#ff5b5b'), I('fx', 'fx_gold', '금빛', '30', '#ffd25a'), I('fx', 'fx_green', '초록', '100', '#5be08a'), I('fx', 'fx_cyan', '청록', '160', '#4fe3e3'),
  I('fx', 'fx_blue', '푸른', '210', '#5b8cff'), I('fx', 'fx_pink', '분홍', '290', '#ff7ad9'),
  // 🔆 발밑 빛 = 용사 발밑 동그란 빛
  I('aura', 'au_gold', '금빛', '#ffcf4a'), I('aura', 'au_blue', '푸른', '#5ab8ff'), I('aura', 'au_green', '초록', '#5be08a'), I('aura', 'au_purple', '보라', '#b07cff'), I('aura', 'au_red', '붉은', '#ff5b5b'),
  // 🪪 카드 배경 = 그라데이션 · 무늬 (CSS background)
  I('cardBg', 'cb_dawn', '새벽', 'linear-gradient(160deg,#2b1f4a 0%,#7a3b6b 55%,#f29a6b 100%)'),
  I('cardBg', 'cb_sea', '바다', 'linear-gradient(170deg,#0d2a4a 0%,#1f6f8b 60%,#7fd3d8 100%)'),
  I('cardBg', 'cb_forest', '숲', 'linear-gradient(165deg,#10261a 0%,#2f6b3a 60%,#a7d46f 100%)'),
  I('cardBg', 'cb_star', '별밤', 'radial-gradient(circle at 20% 30%,#fff8 0 1px,transparent 2px),radial-gradient(circle at 70% 20%,#fff8 0 1px,transparent 2px),radial-gradient(circle at 45% 70%,#fff6 0 1px,transparent 2px),linear-gradient(180deg,#0b1030 0%,#23215a 100%)'),
  I('cardBg', 'cb_check', '체크', 'repeating-conic-gradient(#3a2a55 0 25%,#4a3870 0 50%) 0 0/24px 24px'),
  I('cardBg', 'cb_stripe', '줄무늬', 'repeating-linear-gradient(135deg,#5a2430 0 12px,#7a3340 12px 24px)'),
  // 🪪 카드 배경 그림 4 (🎨 11/25 cos-cardbg-1~4 · 💎 150)
  CARD_IMG('cb_town', '마을 광장', 'cardbg-1-v1.webp'), CARD_IMG('cb_castle', '성채 앞', 'cardbg-2-v1.webp'), CARD_IMG('cb_boss', '마지막 보스 앞', 'cardbg-3-v1.webp'), CARD_IMG('cb_night', '밤하늘 언덕', 'cardbg-4-v1.webp'),
  // ⛺ 텐트 가구 6 (🎨 11/25 cos-furn6 · 여러 개 함께 놓음 · 캠프 텐트 둘레 자리)
  FURN('flag', '깃발'), FURN('lamp', '등불'), FURN('desk', '책상'), FURN('plant', '화분'), FURN('chest', '보물 상자'), FURN('rug', '양탄자'),
];
export const COS_BY: Record<string, CosItem> = Object.fromEntries(COS.map((c) => [c.id, c]));
export const priceOf = (c: CosItem) => c.price ?? COS_PRICE[c.kind];
export const cosPrice = (id: string) => { const c = COS_BY[id]; return c ? priceOf(c) : 0; };
export const cosBuyId = (id: string) => `cos_${id}`;
export const ownsCos = (w: Pick<Wallet, 'buys'>, id: string) => w.buys.some((b) => b.id === cosBuyId(id));

/** 사기 → 틀리면 까닭 한 줄 · 되면 null (지갑을 바로 고침 · 저장은 부르는 쪽) */
export function buyCos(w: Wallet, id: string, now: number): string | null {
  const c = COS_BY[id]; if (!c) return '없는 물건이에요';
  if (ownsCos(w, id)) return '이미 가진 물건이에요';
  const g = priceOf(c); if (w.gem < g) return `💎 ${g - w.gem} 이 모자라요`;
  w.gem -= g; w.buys = [...w.buys, { id: cosBuyId(id), ver: ECON_VER, at: now }];
  return null;
}
/** 💎 로그 한 줄 (g 0 · spend = 쓴 값) */
export const cosLog = (id: string, at: number) => ({ key: cosBuyId(id), row: { g: 0, spend: cosPrice(id), at, why: `🎨 ${COS_BY[id]?.name ?? id} ${COS_KINDS.find((k) => k.k === COS_BY[id]?.kind)?.name ?? ''}`.trim() } });

/** 서버 값 → 믿을 수 있는 입은 것만 (없는 물건 · 다른 종류 칸은 버림) */
export function cosClean(v: unknown): CosOn {
  const out: CosOn = {}; if (!v || typeof v !== 'object') return out;
  for (const [k, id] of Object.entries(v as Record<string, unknown>)) {
    if (k === 'furn' && typeof id === 'string') { const ids = id.split(',').filter((x) => COS_BY[x]?.kind === 'furn'); if (ids.length) out.furn = [...new Set(ids)].join(','); continue; } // ⛺ 가구 = 여러 개 「,」로
    const c = typeof id === 'string' ? COS_BY[id] : undefined; if (c && c.kind === k) out[k as CosKind] = id as string;
  }
  return out;
}
/** 입은 것 중 실제로 가진 것만 (산 기록이 없는데 입은 칸 = 벗김) */
export function cosWorn(w: Pick<Wallet, 'buys'>, on: CosOn | undefined): CosOn {
  const out: CosOn = {};
  for (const [k, id] of Object.entries(cosClean(on)) as [CosKind, string][]) {
    if (k === 'furn') { const ids = id.split(',').filter((x) => ownsCos(w, x)); if (ids.length) out.furn = ids.join(','); } else if (ownsCos(w, id)) out[k] = id;
  }
  return out;
}
/** ⛺ 놓은 가구 목록 */
export const furnOf = (on?: CosOn | null): string[] => (on?.furn ? on.furn.split(',').filter((x) => COS_BY[x]?.kind === 'furn') : []);
/** 입었나 (가구 = 목록 안에 있나) */
export const isWorn = (on: CosOn, c: CosItem) => (c.kind === 'furn' ? furnOf(on).includes(c.id) : on[c.kind] === c.id);
/** 입기 · 벗기 (가구 = 목록에 넣고 빼기 · 나머지 = 종류마다 하나) */
export function toggleWear(on: CosOn, c: CosItem): CosOn {
  const out: CosOn = { ...on };
  if (c.kind === 'furn') { const f = furnOf(on), has = f.includes(c.id), nx = has ? f.filter((x) => x !== c.id) : [...f, c.id]; if (nx.length) out.furn = nx.join(','); else delete out.furn; return out; }
  if (on[c.kind] === c.id) delete out[c.kind]; else out[c.kind] = c.id;
  return out;
}

// 보이는 값 (부품이 씀)
export const nameColorOf = (on?: CosOn | null) => (on?.nameColor ? COS_BY[on.nameColor]?.v ?? '' : '');
export const nameFrameOf = (on?: CosOn | null) => (on?.nameFrame ? COS_BY[on.nameFrame] ?? null : null);
export const fxHueOf = (on?: CosOn | null) => (on?.fx ? Number(COS_BY[on.fx]?.v) || 0 : 0);
export const auraColorOf = (on?: CosOn | null) => (on?.aura ? COS_BY[on.aura]?.v ?? '' : '');
export const cardBgOf = (on?: CosOn | null) => (on?.cardBg ? COS_BY[on.cardBg]?.v ?? '' : '');
/** 공격 그림에 덮는 CSS filter (없으면 '') */
export const fxFilter = (on?: CosOn | null) => { const h = fxHueOf(on); return h ? `hue-rotate(${h}deg) saturate(1.25)` : ''; };
