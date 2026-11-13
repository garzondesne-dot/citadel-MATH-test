// ⚙ 우리 학교 기능 = 스위치 틀 (V1-DESIGN 10절 · 2026-11-13 밤 선생님 「층 나누기 표 진행」)
//   프로그램은 하나 · 학교마다 다른 것은 서버 설정(school/features)뿐 → 코드는 `if (학교판)` 대신 늘 `feat('id')`
//   세 층: 🦴 뼈대(여기에 없음 = 늘 켜짐) · 🧩 추가 기능(이 표 · 스위치 하나) · 📚 과목 팩(필요한 것 = SUBJ 에 그 칸이 있나)
//   묶음(시작값) = 🪶 기본(뼈대만) · ⚔ 표준 · 🏰 전체 → 고른 뒤 낱낱이 더하고 뺌 · 설정이 없는 서버 = 🏰 전체(우리 학교 그대로)
//   잠김 = 켜 놓았어도 「필요한 것」이 없으면 꺼진 것과 같이(화면에서 통째로 사라짐) + 채우는 길 한 줄
import type { Store } from '../model/types';
import { SUBJ } from '../engine/subject';
import { applySchoolInfo, type SchoolInfo } from './school';
import { BELLS, PERIODS } from './bells';
const BELLS0 = structuredClone(BELLS), PERIODS0 = structuredClone(PERIODS);

export type FeatId =
  | 'hero' | 'rest-balance' | 'rest-flip' | 'rest-nunchi' | 'rest-defense' | 'rest-ox'
  | 'mon-attack' | 'forge' | 'symtalk' | 'citadel' | 'seteuk' | 'schedule' | 'photo'
  | 'survey' | 'author' | 'contest' | 'theme' | 'lesson-fx' | 'juice' | 'scarecrow' | 'board';
export type BundleId = 'basic' | 'standard' | 'full';
export interface Feat { id: FeatId; ic: string; name: string; sub: string; group: string; /** 켜려면 필요한 것 → 없으면 잠김 이유(채우는 길) · null = 됨 */ need?: (S: Store | null) => string | null }

const packNeed = (has: boolean, what: string) => (has ? null : `📚 과목 팩에 ${what}이(가) 없어요 · 「준비」 탭에서 팩을 올리면 열려요`);
export const FEATS: Feat[] = [
  { id: 'hero', ic: '🧙', name: '용사 · 스킬 · 강화', sub: '호칭 · 💎 상점 포함', group: '용사' },
  { id: 'scarecrow', ic: '🎯', name: '허수아비 · 혼자 복습', sub: '학습지 숫자 · 맞힌 문제는 바뀐 숫자', group: '복습' },
  { id: 'board', ic: '📋', name: '게시판 던전 · 팀 도전', sub: '1~4명 · 늘 바뀐 숫자', group: '복습' },
  { id: 'mon-attack', ic: '💥', name: '몬스터 공격 · 😡 분노', sub: '수업 중 몬스터가 반격', group: '수업' },
  { id: 'lesson-fx', ic: '🎆', name: '수업 연출', sub: '🔥 콤보 · 🦇 박쥐 · 🎁 보물 상자', group: '수업' },
  { id: 'juice', ic: '✨', name: '화려한 연출 (TV)', sub: '히트 스톱 · 흔들림 · 격파 충격파 · 느린 PC 면 끔', group: '수업' },
  { id: 'rest-balance', ic: '⚖', name: '쉼터 · 밸런스', sub: '', group: '쉼터 놀이' },
  { id: 'rest-flip', ic: '🔄', name: '쉼터 · 반대로', sub: '', group: '쉼터 놀이' },
  { id: 'rest-nunchi', ic: '🙊', name: '쉼터 · 눈치게임', sub: '', group: '쉼터 놀이' },
  { id: 'rest-defense', ic: '🏰', name: '쉼터 · 디펜스', sub: '', group: '쉼터 놀이' },
  { id: 'rest-ox', ic: '⭕', name: '쉼터 · OX', sub: '', group: '쉼터 놀이', need: () => packNeed(!!SUBJ.funOx?.length, 'OX 문장') },
  { id: 'forge', ic: '⚒', name: '모루 · 📖 도감', sub: '모루 연성법이 있는 과목 팩만', group: '과목 팩', need: () => packNeed(!!SUBJ.forge, '모루 연성법') },
  { id: 'symtalk', ic: '📖', name: '기호 톡', sub: '', group: '과목 팩', need: () => packNeed(!!SUBJ.symtalk, '기호 사전') },
  { id: 'citadel', ic: '🏯', name: '성채 던전', sub: '', group: '과목 팩', need: () => packNeed(!!SUBJ.camp?.floors?.some((f) => !f.off), '성채 평가 문항') },
  { id: 'seteuk', ic: '📝', name: '성취기준 · 오개념 · 세특 문장', sub: '', group: '과목 팩', need: () => packNeed(Object.keys(SUBJ.misconceptions || {}).length > 0, '오개념 카드') },
  { id: 'schedule', ic: '📅', name: '시간표 · 예약 수업 · ⏳ 보스 타임바', sub: '교시 시각 = 학교 일과표', group: '학교 정보' },
  { id: 'photo', ic: '📷', name: '서술형 사진 채점', sub: 'AI 채점', group: '학교 정보', need: (S) => (!S || S.get('school/ai/on') ? null : '🔑 AI 채점 연결이 필요해요 · 「나」 탭 「📷 사진 채점 연결」') },
  { id: 'survey', ic: '📝', name: '수업 설문', sub: '', group: '그 밖' },
  { id: 'author', ic: '✏', name: '출제 공방', sub: '학생이 문제를 냄', group: '그 밖' },
  { id: 'contest', ic: '🏁', name: '반 대항전', sub: '', group: '그 밖' },
  { id: 'theme', ic: '🎨', name: '테마', sub: '', group: '그 밖' },
];
const ALL = FEATS.map((f) => f.id);
export const BUNDLES: { id: BundleId; ic: string; name: string; sub: string; on: FeatId[] }[] = [
  { id: 'basic', ic: '🪶', name: '기본', sub: '뼈대만 · 수업 레이드 · 엑셀 차시 · 결과 · 복습', on: ['scarecrow', 'board'] }, // 복습 = 10절 🦴 뼈대 쪽 → 기본에도 켬 (스위치는 따로)
  { id: 'standard', ic: '⚔', name: '표준', sub: '뼈대 + 용사 · 쉼터 놀이 · 몬스터 공격', on: ['scarecrow', 'board', 'hero', 'rest-balance', 'rest-flip', 'rest-nunchi', 'rest-defense', 'rest-ox', 'mon-attack', 'lesson-fx', 'juice', 'theme'] },
  { id: 'full', ic: '🏰', name: '전체', sub: '과목 팩이 있을 때 · 우리 학교', on: ALL },
];
export interface FeatCfg { bundle: BundleId; on?: Partial<Record<FeatId, boolean>> }
export const PATH = 'school/features';
/** 설정이 없는 서버 = 🏰 전체 (지금 우리 학교 그대로 · 다른 학교는 처음 열 때 묶음을 고름) */
export const DEFAULT_CFG: FeatCfg = { bundle: 'full' };

/** 켜 놓았나 (묶음 + 낱낱 스위치 · 필요한 것은 보지 않음) */
export function wanted(c: FeatCfg | null | undefined, id: FeatId): boolean {
  const cfg = c && c.bundle ? c : DEFAULT_CFG, o = cfg.on?.[id];
  if (o != null) return o;
  return (BUNDLES.find((b) => b.id === cfg.bundle) ?? BUNDLES[2]!).on.includes(id);
}
/** 잠김 이유 (켰는데 필요한 것이 없음) · null = 됨 */
export const lockOf = (S: Store | null, id: FeatId): string | null => FEATS.find((f) => f.id === id)?.need?.(S) ?? null;
/** 상태 = 켬 · 끔 · 잠김(켰지만 필요한 것 없음) */
export const stateOf = (S: Store | null, c: FeatCfg | null | undefined, id: FeatId): 'on' | 'off' | 'locked' => (!wanted(c, id) ? 'off' : lockOf(S, id) ? 'locked' : 'on');

// ── 화면에서 쓰는 한 입구: feat('id') (반응형 · 서버 설정이 바뀌면 바로) ──
let cfg = $state<FeatCfg | null>(null), store: Store | null = null, stop: (() => void) | null = null;
/** 학교 정보가 바뀐 횟수 (화면이 다시 읽게) */
export const schoolInfo = $state({ ver: 0 });
/** 앱 시작 때 한 번 (App.svelte) · 시험은 setFeatCfg 로 직접 */
export function bindFeatures(S: Store) {
  stop?.(); store = S; cfg = S.get<FeatCfg>(PATH) ?? null;
  const s1 = S.watch<FeatCfg>(PATH, (v) => (cfg = v ?? null));
  // 🏫 학교 정보 (반 목록 · 교시) = school/info → 그 자리에서 바꿈
  const info = (v: SchoolInfo | null) => { applySchoolInfo(v, BELLS, PERIODS, { bells: BELLS0, periods: PERIODS0 }); schoolInfo.ver++; };
  info(S.get<SchoolInfo>('school/info')); const s2 = S.watch<SchoolInfo>('school/info', info);
  stop = () => { s1(); s2(); };
  (globalThis as { __featSet?: (c: FeatCfg | null) => void }).__featSet = (c) => S.set(PATH, c); // 화면 시험 고리(시험 3판 · 교사 화면과 같은 길)
}
export const setFeatCfg = (c: FeatCfg | null) => { cfg = c; };
export const featCfg = () => cfg ?? DEFAULT_CFG;
/** 🧩 이 기능이 지금 쓰이나 (켬 + 필요한 것 있음) — 꺼지면 화면에서 통째로 사라짐 */
export function feat(id: FeatId): boolean { return stateOf(store, cfg, id) === 'on'; }
/** 교사 화면: 묶음 고르기 (낱낱 스위치는 지움) · 낱낱 켬/끔 */
export function saveBundle(S: Store, b: BundleId) { S.set(PATH, { bundle: b }); }
export function saveOne(S: Store, id: FeatId, on: boolean) { const c = S.get<FeatCfg>(PATH) ?? DEFAULT_CFG; S.set(PATH, { bundle: c.bundle, on: { ...(c.on || {}), [id]: on } }); }
