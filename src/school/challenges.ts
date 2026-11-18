// 🏆 도전과제 판 (📜 #68 · DECISIONS 「🏆 도전과제 판」 2026-11-18): 늘 보임(조건 · 진행 n/m · 못 한 것도) · 「🎁 받기」 기한 없음 · 과제마다 한 번
//   보상 = 하루 한도 밖 · gem log chal_{id} = { g, s, at, why } (받은 표시 = 이 키 · 누적 💎 #65 에 잡힘) · 기록에서 그때그때 셈(titles.ts 와 같음) · 수업 중 점수는 조건에 안 씀
//   칭호 보상 = 받기를 누르면 그 칭호(titles.ts 가 chal_ 키를 봄) · 이미 있는 칭호(노련한 탐험가 · 만 번째 베기) = 원래 조건 그대로
import type { TitleData } from '../model/titles';
import { seals } from '../model/titles';
import type { CastlePack } from './castle';
import { cumOf } from './cum';
import { KEY_CHEST } from './keys';
import { veteranN } from './explore';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
export interface ChalCtx { d: TitleData; gifts?: Record<string, unknown> | null; castles?: CastlePack[] }
export type Tier = 'seed' | 'adv' | 'leg';
export interface Reward { gem?: number; scroll?: number; title?: string; unlock?: string }
export interface Chal { id: string; tier: Tier; ic: string; name: string; cond: string; need: number; got: (c: ChalCtx) => number; reward: Reward; /** 받기 없이 조건만 채우면 끝(해금 같은 것) */ auto?: boolean; hide?: (c: ChalCtx) => boolean }

// ── 기록에서 세기 ──
const bon = (c: ChalCtx) => (isObj(c.d.bonus) ? (c.d.bonus as unknown as Record<string, Obj>) : {});
const logOf = (c: ChalCtx) => (isObj(c.d.gem?.log) ? (c.d.gem!.log as Record<string, Obj | null>) : {});
const keysLike = (c: ChalCtx, p: string) => Object.keys(logOf(c)).filter((k) => k.startsWith(p));
/** 🎯 허수아비(복습) 방 = 차시 칸(평가 eval- · review · board 빼기) 안의 몬스터 */
const dummyRooms = (c: ChalCtx) => Object.entries(bon(c)).filter(([k, v]) => isObj(v) && k !== 'review' && k !== 'board' && !k.startsWith('eval-')).flatMap(([, v]) => Object.values(v as Obj).filter(isObj));
const reviewClears = (c: ChalCtx) => dummyRooms(c).filter((m) => m.clear).length;
const reviewPlays = (c: ChalCtx) => dummyRooms(c).reduce((a, m) => a + (Number(m.tries) || 0), 0);
const prepTried = (c: ChalCtx) => Object.entries(isObj(bon(c).review) ? (bon(c).review as Obj) : {}).filter(([k, v]) => k.startsWith('prep_') && isObj(v) && Object.values(v).some((m) => isObj(m) && Number(m.tries) > 0)).length;
const castleRooms = (c: ChalCtx) => Object.entries(bon(c)).filter(([k, v]) => k.startsWith('eval-') && isObj(v)).flatMap(([, v]) => Object.values(v as Obj).filter(isObj));
const boardRecs = (c: ChalCtx) => Object.values(isObj(bon(c).board) ? (bon(c).board as Obj) : {}).filter(isObj).filter((r) => !r.left);
const cardsN = (c: ChalCtx) => Object.keys(isObj(c.d.cards) ? c.d.cards : {}).length;
const symN = (c: ChalCtx) => { const st = isObj(c.d.xr?.st) ? (c.d.xr!.st as Record<string, Obj>) : {}; return Object.values(st).reduce((t, by) => t + Object.values(isObj(by) ? by : {}).reduce<number>((u, v) => u + (Number(v) || 0), 0), 0); };
const chests = (c: ChalCtx) => keysLike(c, 'keychest_').reduce((a, k) => a + Math.floor((Number(logOf(c)[k]?.g) || 0) / KEY_CHEST.gem), 0);
const ph2N = (c: ChalCtx) => castleRooms(c).filter((m) => m.ph2).length;
const rewriteN = (c: ChalCtx) => Object.keys(c.gifts || {}).filter((k) => /^ult_.+_v$/.test(k)).length + ph2N(c);
const clear = (c: ChalCtx, pack: string, rooms: string[]) => rooms.some((r) => isObj(bon(c)[pack]) && isObj((bon(c)[pack] as Obj)[r]) && ((bon(c)[pack] as Record<string, Obj>)[r]!.clear));
const floorRooms = (c: ChalCtx) => (c.castles || []).filter((p) => p.floor >= 1 && p.floor <= 3).flatMap((p) => p.rooms.map((r) => ({ p: p.id, r: r.id })));
const floorClears = (c: ChalCtx) => floorRooms(c).filter((x) => clear(c, x.p, [x.r])).length;

export const CHALS: Chal[] = [
  // 🌱 첫걸음
  { id: 'castle1', tier: 'seed', ic: '🏰', name: '성채의 문', cond: '성채 방 1개 처치', need: 1, got: (c) => castleRooms(c).filter((m) => m.clear).length, reward: { gem: 20 } },
  { id: 'review1', tier: 'seed', ic: '🎯', name: '다시 한 번', cond: '배움터 복습 문제 1개 처치', need: 1, got: reviewClears, reward: { gem: 10 } },
  { id: 'prep1', tier: 'seed', ic: '📖', name: '한 발 앞서', cond: '배움터 예습 1개 차시 풀어 보기', need: 1, got: prepTried, reward: { title: 'ahead' } },
  { id: 'card1', tier: 'seed', ic: '⚒', name: '대장장이 견습', cond: '모루에서 카드 1장 만들기', need: 1, got: cardsN, reward: { gem: 10 } },
  { id: 'solo1', tier: 'seed', ic: '📋', name: '혼자서도', cond: '게시판 던전 개인전 1번', need: 1, got: (c) => boardRecs(c).filter((r) => Number(r.n) <= 1).length, reward: { gem: 20 } },
  { id: 'team1', tier: 'seed', ic: '🤝', name: '함께라서', cond: '게시판 던전 팀전 1번', need: 1, got: (c) => boardRecs(c).filter((r) => Number(r.n) >= 2).length, reward: { gem: 20 } },
  { id: 'quest1', tier: 'seed', ic: '✏', name: '출제자', cond: '출제 공방에서 문제 1개 내기(출제됨)', need: 1, got: (c) => keysLike(c, 'quest_').length, reward: { gem: 20 } },
  { id: 'sym10', tier: 'seed', ic: '💬', name: '기호 톡톡', cond: '기호 톡 10번', need: 10, got: symN, reward: { gem: 10 } },
  { id: 'note1', tier: 'seed', ic: '📕', name: '오답 사냥', cond: '틀리거나 안 푼 문제를 배움터 복습에서 1개 해결', need: 1, got: (c) => dummyRooms(c).filter((m) => m.fixAt).length, reward: { gem: 10 } },
  { id: 'chest1', tier: 'seed', ic: '🔑', name: '열쇠 줍기', cond: '입장 열쇠 보물상자 1개', need: 1, got: chests, reward: { gem: 10 } },
  // ⚔ 도전
  { id: 'floor1', tier: 'adv', ic: '👑', name: '1층의 왕', cond: '성채 1층 👑 보스 방 처치', need: 1, got: (c) => (clear(c, 'eval-1', ['q12', 'eb']) ? 1 : 0), reward: { scroll: 1 } },
  { id: 'floor2', tier: 'adv', ic: '🕵', name: '2층의 탐정', cond: '성채 2층 👑 보스 방 처치', need: 1, got: (c) => (clear(c, 'eval-2', ['q11']) ? 1 : 0), reward: { scroll: 1 } },
  { id: 'photo1', tier: 'adv', ic: '🧑‍🎓', name: '수식 책사', cond: '성채 ✍ 서술형 사진 첫 통과', need: 1, got: (c) => (keysLike(c, 's_ph_').length ? 1 : 0), reward: { unlock: '🧑‍🎓 수식 책사 남 · 여 용사' }, auto: true },
  { id: 'review30', tier: 'adv', ic: '🎯', name: '꾸준한 복습', cond: '배움터 복습 30판', need: 30, got: reviewPlays, reward: { gem: 50 } },
  { id: 'prep3', tier: 'adv', ic: '🔥', name: '예습왕', cond: '배움터 예습 3개 차시 (차시마다 몬스터 2개 이상 처치)', need: 3, got: (c) => veteranN(isObj(bon(c).review) ? (bon(c).review as Obj) : {}), reward: { title: 'explorer' } },
  { id: 'rewrite3', tier: 'adv', ic: '✍', name: '진짜 실력', cond: '✍ 실력 쓰기(숫자 바꾼 판) 통과 3번', need: 3, got: rewriteN, reward: { title: 'realskill' } },
  { id: 'streak10', tier: 'adv', ic: '🔁', name: '개근', cond: '10차시 연속 참여', need: 1, got: (c) => (keysLike(c, 'streak10_').length ? 1 : 0), reward: { gem: 30 } },
  { id: 'card10', tier: 'adv', ic: '🃏', name: '카드 수집가', cond: '모루 카드 10장', need: 10, got: cardsN, reward: { gem: 30 } },
  { id: 'rescue5', tier: 'adv', ic: '🛟', name: '구조대', cond: '게시판 던전 구조 5번', need: 5, got: (c) => keysLike(c, 'rescue_').length, reward: { gem: 30 } },
  { id: 'chest5', tier: 'adv', ic: '🧰', name: '열쇠 꾸러미', cond: '입장 열쇠 보물상자 5개', need: 5, got: chests, reward: { gem: 30 } },
  // 👑 전설
  { id: 'castleall', tier: 'leg', ic: '🏯', name: '성채의 군주', cond: '성채 1~3층 모든 방 처치', need: 1, got: (c) => { const n = floorRooms(c).length; return n && floorClears(c) >= n ? 1 : 0; }, reward: { scroll: 3, title: 'castlelord' }, hide: (c) => !floorRooms(c).length },
  { id: 'seal3', tier: 'leg', ic: '⚔', name: '만 번째 베기', cond: '🏆 업적(인장) 3개', need: 3, got: (c) => seals(c.d.bonus).length, reward: { title: 'slash10k' } },
  { id: 'scroll20', tier: 'leg', ic: '📜', name: '서술의 달인', cond: '받은 📜 서술 조각 모두 20개', need: 20, got: (c) => cumOf(c.d.gem as never, c.gifts as never, ph2N(c)).scroll, reward: { title: 'scrollmaster' } },
  { id: 'review100', tier: 'leg', ic: '🪆', name: '허수아비의 친구', cond: '배움터 복습 100판', need: 100, got: reviewPlays, reward: { title: 'dummyfriend' } },
  // 25 비밀 탐험가 = 비밀 도감(이스터에그)이 생기기 전까지 숨김 · 4 첫 손글씨 = 13 수식 책사와 합침
];
/** 진행 (n · m · 끝남 · 받음) */
export function chalState(ch: Chal, c: ChalCtx): { n: number; m: number; done: boolean; got: boolean } {
  let n = 0; try { n = ch.got(c); } catch { n = 0; }
  const m = ch.id === 'castleall' ? floorRooms(c).length || 1 : ch.need, cur = ch.id === 'castleall' ? floorClears(c) : n, done = ch.id === 'castleall' ? n >= 1 : n >= ch.need;
  return { n: Math.min(cur, m), m, done, got: ch.auto ? done : !!logOf(c)[`chal_${ch.id}`] };
}
/** 받을 것 수 (캠프 🏆 빨간 숫자) */
export const chalReady = (c: ChalCtx) => CHALS.filter((ch) => !ch.hide?.(c) && !ch.auto).filter((ch) => { const s = chalState(ch, c); return s.done && !s.got; }).length;
export const TIER_NAME: Record<Tier, string> = { seed: '🌱 첫걸음', adv: '⚔ 도전', leg: '👑 전설' };
/** 받기 = log chal_{id} 한 줄 (하루 한도 밖) · 이미 있으면 null */
export function claimOf(ch: Chal, c: ChalCtx, at: number): { key: string; row: { g: number; s?: number; at: number; why: string } } | null {
  const s = chalState(ch, c); if (!s.done || s.got || ch.auto) return null;
  return { key: `chal_${ch.id}`, row: { g: ch.reward.gem || 0, ...(ch.reward.scroll ? { s: ch.reward.scroll } : {}), at, why: `🏆 도전과제 · ${ch.name}` } };
}
