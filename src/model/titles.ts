// 🏅 얻은 호칭 = 기록에서 그때그때 계산 (정식 js/raid/titles.js earned 그대로 · 📜 2026-11-15 머리 「정식과 같게 · 얻은 것만」)
//   기록 = records · cards · xp · bonus · gem · photo (학생 한 명 칸) · 따로 저장하지 않음 · 고른 호칭만 accounts/{반}/{번호}/title
//   베타에 아직 없는 것: 📕 오답노트(오답 사냥꾼 = 못 얻음) · 던전 정복 메달(목록에 없음)
import { EGGS, eggsFound } from '../school/eggs';
import { SUBJ } from '../engine/subject';
import { level } from './hero';
import { veteranN } from '../school/explore';
import { PACKS } from '../engine/packs';
import { fameOf, legendOf, mapLessons, starTotal, starsByNo, STAR_TITLES, type BoardRec } from '../board/goals';
const bRecs = (d: TitleData) => ((d.bonus as Record<string, unknown> | undefined)?.board as Record<string, BoardRec> | undefined) || {};
const bStars = (d: TitleData) => starTotal(starsByNo(bRecs(d)), mapLessons(PACKS));

type Obj = Record<string, unknown>;
export interface TitleData { records?: Record<string, Obj>; cards?: Record<string, unknown>; xp?: number; xr?: Obj; bonus?: Record<string, Record<string, { clear?: boolean } | undefined>>; gem?: Obj; photo?: Obj }
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const recs = (d: TitleData) => Object.values(d.records || {}).filter(isObj);
const cardsOf = (d: TitleData, g?: number) => (SUBJ.forge?.unit.CARDS || []).filter((c) => (d.cards || {})[c.id] && (!g || (c as { grade?: number }).grade === g));
const won = (r: Obj) => !!r.won || (isObj(r.boss) && !!(r.boss as Obj).won);
const medals = (d: TitleData) => (isObj(d.gem?.medal) ? (d.gem!.medal as Record<string, number>) : {});
const logKeys = (d: TitleData) => Object.keys(isObj(d.gem?.log) ? (d.gem!.log as Obj) : {});
/** 🟪 업적(인장) = 허수아비 형성평가 재대결 처치 · 성채 층 👑 보스 방 처치 (옛 규칙 기록도 셈 — 정식 bonus.js seals) */
const LESSON_LEGACY: Record<string, string[]> = SUBJ.sealLegacy || {}; // 과목 팩 (옛 규칙 방 이름)
const FLOOR_BOSS: Record<string, string[]> = { 'eval-1': ['q12', 'eb'], 'eval-2': ['q11'], 'eval-3': ['q17'] };
export function seals(bonus: TitleData['bonus']): string[] {
  const b = bonus || {}, out: string[] = [];
  const legacy = (id: string) => (LESSON_LEGACY[id] || []).length > 0 && LESSON_LEGACY[id]!.every((m) => b[id]?.[m]?.clear);
  for (const id of Object.keys(b)) {
    if (id === 'review' || id === 'board') continue;
    if (FLOOR_BOSS[id]) { if (FLOOR_BOSS[id]!.some((r) => b[id]?.[r]?.clear) || legacy(id)) out.push(id); continue; }
    if (b[id]?.boss?.clear || legacy(id)) out.push(id);
  }
  return out;
}
function photoPass(d: TitleData) { let n = 0; for (const byId of Object.values(d.photo || {})) for (const x of Object.values(isObj(byId) ? byId : {})) if (isObj(x) && (x.status === 'pass' || x.ok === true)) n++; return n; }
const TESTS: Record<string, (d: TitleData) => boolean> = {
  none: () => true,
  dawn: () => true,
  first: (d) => recs(d).length > 0,
  slayer: (d) => recs(d).some(won),
  smith: (d) => cardsOf(d).length > 0,
  collector: (d) => cardsOf(d).length >= 5,
  magic: (d) => cardsOf(d, 2).length > 0,
  rare: (d) => cardsOf(d, 3).length > 0,
  grit: (d) => recs(d).reduce((a, r) => a + (Number(r.fixed) || 0), 0) >= 10,
  sage: (d) => { if (cardsOf(d).length >= 30) return true; const need = (SUBJ.forge?.unit.CARDS || []).filter((c) => (c as { no?: number }).no! <= 3); return need.length > 0 && need.every((c) => (d.cards || {})[c.id]); },
  king: (d) => !!(d.bonus?.['eval-1']?.q12?.clear || d.bonus?.['eval-1']?.eb?.clear),
  detective: (d) => !!d.bonus?.['eval-2']?.q11?.clear,
  sovereign: (d) => !!d.bonus?.['eval-3']?.q17?.clear,
  gambler: (d) => Object.values(medals(d)).reduce((a, b) => a + (Number(b) || 0), 0) >= 3,
  nunchi: (d) => (Number(medals(d).nun) || 0) >= 1,
  oxsurv: (d) => (Number(medals(d).ox) || 0) >= 3,
  steady: (d) => logKeys(d).some((k) => k.startsWith('streak10_')),
  quester: (d) => logKeys(d).some((k) => k.startsWith('quest_')),
  board_explore: (d) => bStars(d) >= STAR_TITLES.explore, // 🎯 #79 게시판 목표
  board_conquer: (d) => bStars(d) >= STAR_TITLES.conquer,
  board_legend: (d) => legendOf(starsByNo(bRecs(d)), mapLessons(PACKS)),
  guard1: (d) => fameOf(bRecs(d)) >= 3, guard2: (d) => fameOf(bRecs(d)) >= 10, guard3: (d) => fameOf(bRecs(d)) >= 25,
  hallmaker: (d) => logKeys(d).some((k) => k.startsWith('quest_p_')), // 🏛 #75 명예의 전당
  writer: (d) => photoPass(d) >= 3,
  hunter: () => false, // 📕 오답노트 = 베타에 아직 없음
  wall: (d) => (Number((isObj(d.xr?.ttl) ? (d.xr!.ttl as Obj) : {}).wall) || 0) >= 30,
  awake: (d) => (Number(d.gem?.enh) || 0) >= 10,
  slash10k: (d) => seals(d.bonus).length >= 3,
  // 🏆 #68 도전과제 칭호 = 받기를 누른 것(gem log chal_{과제})
  ahead: (d) => logKeys(d).includes('chal_prep1'),
  realskill: (d) => logKeys(d).includes('chal_rewrite3'),
  castlelord: (d) => logKeys(d).includes('chal_castleall'),
  scrollmaster: (d) => logKeys(d).includes('chal_scroll20'),
  dummyfriend: (d) => logKeys(d).includes('chal_review100') || eggsFound(d.bonus).includes('e7'), // 🥚 #74 이스터에그 7 과 같은 칭호 하나
  ...Object.fromEntries(EGGS.filter((e) => e.title.startsWith('egg_')).map((e) => [e.title, (d: TitleData) => eggsFound(d.bonus).includes(e.id)])), // 🥚 #74
  secret: (d) => logKeys(d).includes('chal_eggs'),
  explorer: (d) => veteranN((d.bonus as Record<string, unknown> | undefined)?.review as Record<string, unknown>) >= 3, // 🔥 #67 노련한 탐험가 = 예습 3개 차시(차시마다 처치 2+)
};
/** 얻은 호칭 id (got = 화면이 따로 아는 것 · 예: 💚 구조대 rescuer) */
export function earnedFrom(d: TitleData, got: string[] = []): string[] {
  const lv = level(Number(d.xp) || 0).lv, out = new Set<string>(got);
  for (const [id, t] of Object.entries(TESTS)) { try { if (t(d)) out.add(id); } catch { /* 그 칸만 못 얻음 */ } }
  for (let i = 1; i <= Math.min(lv, 10); i++) out.add(`lv${i}`);
  return [...out];
}
/** 서버 거울에서 한 학생 기록 모으기 */
export function titleData(S: { get<T>(p: string): T | null }, cls: string, num: number): TitleData {
  const g = <T>(root: string) => S.get<T>(`${root}/${cls}/${num}`);
  const xr = g<Obj>('xp') || {};
  return { records: g('records') || {}, cards: g('cards') || {}, xp: Number(xr.total) || 0, xr, bonus: g('bonus') || {}, gem: g('gem') || {}, photo: g('photo') || {} };
}
