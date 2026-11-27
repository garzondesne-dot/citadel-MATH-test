// 🌀 마왕성 차원문 짓기 (📜 2026-11-28 선생님 시안 확정 · 기말 대비 2차시 · 차시 팩 gate-1)
//   흐름 = 도입 단계(intro)에 gate 칸: 🎬 여는 장면 → 🧱 뼈대(📄 답안지 7/7) → ⚡ 에너지(🏰 성채 정답) → 🌀 현자가 문 열기
//   🧱 뼈대 = 그 반 명단 중 답안지 통과 수 · 조각 = 명단 수 · 기준 = 명단의 80%(올림) · 기준에 닿으면 남은 조각은 🧙 현자가 채움
//   🧱 뼈대 완성 순간 = 문은 다 섰지만 빛은 모두 꺼짐(룬 어둠 · 테두리 빛 없음 · 문 안 어둠) — 📜 11/28 설계 변경
//   ⚡ 에너지 = 문 안 푸른 소용돌이가 커지고 빨라짐 · 룬 10개가 아래부터 켜짐 · 테두리 푸른빛이 세짐 (마왕성은 🌀 문 열기에서 처음)
//   ⚡ 에너지 = 그 반 명단의 bonus/{반}/{번호}/gate/e 합 · 기준 108(모든 반 같음) · 144 각성 Ⅰ · 180 각성 Ⅱ · 216 각성 Ⅲ(전설의 문)
//     옛 성채 기록은 안 셈 · ⚡ 에너지 화면에서 연 성채 방을 맞히면 +1 (이미 처치한 방을 다시 맞혀도 +1) · 성채 기록 · 💎 · EXP 는 원래 성채 그대로
//   통과 보상 = 처음 7/7 한 번 💎 20 + EXP 20 (gem · xp log 「gate_pass」 = 한 번만)
//   저장 = 학생 = 내 칸 bonus/{반}/{번호}/gate (규칙 그대로) · 교사 = school/gate/opened/{반}(처음 연 때) · school/gate/tally/{반}(교사 기기가 센 반 합 · 학생 폰이 읽음)
//   반 합은 교사 기기(종합실 · 리모컨)만 셈 = 학생은 다른 학생 칸을 못 읽음 (규칙 그대로) · 이름 · 순위 없음
import type { LessonPack, Step, Store } from '../model/types';
import { abcRecPath, abcStep, type AbcRec } from './abcSheet';
import { isBeta, isExcluded, roster } from './school';
import { addTo } from '../store/atomic';

const ck = (c: string) => String(c || '').replace(/[.#$/[\]]/g, '_');
export const gateBase = (cls: string, num: number | string) => `bonus/${ck(cls || 'me')}/${num || 0}`; // castle.ts bonusBase 와 같은 꼴
export const GATE_PATH = 'school/gate';
export const openedPath = (cls: string) => `${GATE_PATH}/opened/${ck(cls)}`;
export const tallyPath = (cls: string) => `${GATE_PATH}/tally/${ck(cls)}`;
/** 내 칸: e = 에너지 합 · d/{날} = 그날 + · p = 연습 판 수 */
export const myGatePath = (base: string) => `${base}/gate`;

export const FRAME_PCT = 0.8;
export const E_BASE = 108;
export const E_STAGES = [144, 180, 216] as const;
export const PASS_GEM = 20, PASS_XP = 20, PASS_KEY = 'gate_pass';

/** 차원문 차시 팩인가 (단계 하나라도 gate) */
export const isGatePack = (L: Pick<LessonPack, 'steps'> | null | undefined): boolean => !!L?.steps?.some((s) => !!s.gate);
export const gateOf = (s: Step | null | undefined) => (s?.kind === 'intro' && s.gate ? s.gate : null);

// ── 🧱 뼈대 ──
export interface Frame { total: number; target: number; pass: number; placed: number; sage: number; full: boolean }
/** total = 명단 수 · pass = 통과 수 */
export function frameOf(total: number, pass: number): Frame {
  const n = Math.max(0, total | 0), p = Math.max(0, pass | 0), target = n ? Math.ceil(n * FRAME_PCT) : 0, placed = Math.min(n, p), full = n > 0 && p >= target;
  return { total: n, target, pass: p, placed, sage: full ? n - placed : 0, full };
}

// ── 조각 (완성 문 frame09 300 × 420 을 14 덩어리 → 명단 수만큼) ──
/** 덩어리 = 아래에서 위 순서 (받침 → 기둥 돌 → 옆돌 → 위 + ÷ → 쐐기 − × 마지막) */
export const REGIONS = ['bL', 'bR', 'p3L', 'p3R', 'p2L', 'p2R', 'p1L', 'p1R', 'sL', 'sR', 't1', 't4', 't2', 't3'] as const;
export type Region = (typeof REGIONS)[number];
/** 덩어리마다 픽셀 수 (frame09 알파 > 10 · 조각을 나눌 때 큰 덩어리부터) */
export const AREA: Record<Region, number> = { bL: 3798, bR: 3709, p3L: 2198, p3R: 2184, p2L: 1870, p2R: 1862, p1L: 2012, p1R: 2001, sL: 3223, sR: 3198, t1: 2431, t4: 2584, t2: 2190, t3: 2172 };
/** 그 픽셀의 덩어리 (anim2.py piece 그대로) */
export function regionAt(x: number, y: number): Region {
  if (y >= 340) return x < 150 ? 'bL' : 'bR';
  if (y >= 298) return x < 150 ? 'p3L' : 'p3R';
  if (y >= 262) return x < 150 ? 'p2L' : 'p2R';
  if (y >= 222) return x < 150 ? 'p1L' : 'p1R';
  if (y >= 160 && (x < 105 || x > 195)) return x < 150 ? 'sL' : 'sR';
  return x < 112 ? 't1' : x < 150 ? 't2' : x < 188 ? 't3' : 't4';
}
/** 조각 하나 = 덩어리들(rs) 의 가로 띠 k / of (아래부터 · of = 1 이면 덩어리 통째) */
export interface Piece { rs: Region[]; k: number; of: number }
/** 조각 n 개 (n < 14 = 이웃 덩어리를 묶음 · n ≥ 14 = 큰 덩어리부터 가로 띠로 나눔) · 놓는 순서 그대로 */
export function pieceOrder(n0: number): Piece[] {
  const n = Math.max(0, Math.floor(n0));
  if (!n) return [];
  if (n < REGIONS.length) {
    const out: Piece[] = [];
    REGIONS.forEach((r, i) => { const g = Math.floor((i * n) / REGIONS.length); (out[g] ??= { rs: [], k: 0, of: 1 }).rs.push(r); });
    return out;
  }
  const cut: Record<string, number> = Object.fromEntries(REGIONS.map((r) => [r, 1]));
  for (let left = n - REGIONS.length; left > 0; left--) { let best: Region = REGIONS[0]; for (const r of REGIONS) if (AREA[r] / cut[r]! > AREA[best] / cut[best]!) best = r; cut[best]!++; }
  return REGIONS.flatMap((r) => Array.from({ length: cut[r]! }, (_, k) => ({ rs: [r], k, of: cut[r]! })));
}

// ── ⚡ 에너지 ──
export interface Energy { e: number; pct: number; step10: number; stage: number; name: string; over: boolean }
export const STAGE_NAME = ['', '기준 달성', '각성 Ⅰ', '각성 Ⅱ', '각성 Ⅲ · 전설의 문'] as const;
export function energyOf(e0: number): Energy {
  const e = Math.max(0, Math.floor(Number(e0) || 0)), pct = Math.min(1, e / E_BASE);
  const stage = e < E_BASE ? 0 : 1 + E_STAGES.filter((x) => e >= x).length;
  return { e, pct, step10: Math.floor(pct * 10), stage, name: STAGE_NAME[stage] ?? '', over: e > E_BASE };
}
/** ✨ 문틀 룬 10개 (아래 기둥부터 · 위 + ÷ · 쐐기 − × 마지막) = 에너지 10.8 마다 하나 · 108 = 모두 (📜 11/28 설계 변경: 뼈대 완성 때는 모두 꺼짐) */
export const RUNES = ['p3L', 'p3R', 'p2L', 'p2R', 'p1L', 'p1R', 't1', 't4', 't2', 't3'] as const satisfies readonly Region[];
export const runesOn = (e: number) => Math.max(0, Math.min(RUNES.length, Math.floor((Math.max(0, Number(e) || 0) * RUNES.length) / E_BASE)));
/** 🌀 문 이름 (마지막 제목 · 예 「1-5반 · 각성 Ⅱ의 문」) */
export const doorName = (cls: string, e: number) => { const s = energyOf(e).stage; return `${cls}반 · ${s >= 2 ? `${STAGE_NAME[s]!.replace(' · 전설의 문', '')}의 문` : '마왕성 차원문'}`; };
/** 🌀 「우리 반 a% + 🧙 현자 b%」 = 에너지 몫 */
export const doorShare = (e: number) => { const a = Math.min(100, Math.round((Math.max(0, e) / E_BASE) * 100)); return { a, b: 100 - a }; };
/** ⚡ 몇 더할까: 에너지 화면에서 연 성채 방 + 맞힘 = 1 · 그 밖 = 0 */
export const energyGain = (o: { fromGate: boolean; correct: boolean }) => (o.fromGate && o.correct ? 1 : 0);

// ── 반 합 (교사 기기) ──
export const kstDay = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
export interface MyGate { e?: number; p?: number; d?: Record<string, number> }
/** 명단 (시험 계정 빼고 · 🧪 시험 반은 모두 = abcTally 와 같음) */
export const gateRoster = (S: Store, cls: string) => roster(cls, S).filter((p) => !isExcluded(S, cls, p.num) || isBeta(S, cls));
export interface Tally { n: number; pass: number; e: number; at?: number }
/** 반 합 = 명단 · 통과 · 에너지 (교사 · 교사 로그인 TV 만 다른 학생 칸을 읽음) */
export function gateTally(S: Store, cls: string): Tally {
  const st = gateRoster(S, cls);
  let pass = 0, e = 0;
  for (const p of st) {
    const b = gateBase(cls, p.num);
    if (abcStep(S.get<AbcRec>(abcRecPath(b))).kind === 'done') pass++;
    e += Math.max(0, Number(S.get<MyGate>(myGatePath(b))?.e) || 0);
  }
  return { n: st.length, pass, e };
}
/** 교사 기기가 센 반 합을 school/gate/tally/{반} 에 (바뀐 때만) → 학생 폰이 읽음 */
export function publishTally(S: Store, cls: string): Tally {
  const t = gateTally(S, cls), cur = S.get<Tally>(tallyPath(cls));
  if (!cur || cur.n !== t.n || cur.pass !== t.pass || cur.e !== t.e) S.set(tallyPath(cls), { ...t, at: S.now() });
  return t;
}
/** 학생 폰이 보는 반 합 (교사 기기가 적은 값 · 없으면 0) */
export const tallyOf = (S: Pick<Store, 'get'>, cls: string): Tally => { const v = S.get<Tally>(tallyPath(cls)); return { n: Number(v?.n) || 0, pass: Number(v?.pass) || 0, e: Number(v?.e) || 0, at: Number(v?.at) || 0 }; };
/** 이 반이 차원문 수업을 연 적 있나 (캠프 🌀 · 수업 밖 에너지) */
export const gateOpened = (S: Pick<Store, 'get'>, cls: string) => !!cls && !!S.get(openedPath(cls));
/** 교사가 차원문 차시를 열 때 (처음 한 번만 시각) */
export function markOpened(S: Store, cls: string): void { if (cls && !S.get(openedPath(cls))) S.set(openedPath(cls), S.now()); }

// ── 학생 내 칸 ──
/** ⚡ +1 (에너지 합 · 그날 +) */
export function addEnergy(S: Store, base: string, t: number): void { addTo(S, `${myGatePath(base)}/e`, 1); addTo(S, `${myGatePath(base)}/d/${kstDay(t)}`, 1); }
/** 📄 연습 판 +1 (기록 · 조각 · 에너지 · 보상 없음 · 판 수만) */
export const addPractice = (S: Store, base: string) => addTo(S, `${myGatePath(base)}/p`, 1);
export const myGate = (S: Pick<Store, 'get'>, base: string): MyGate => S.get<MyGate>(myGatePath(base)) || {};

/** 통과 보상 (처음 한 번 · log 「gate_pass」 가 있으면 0) → 쓸 칸 */
export function passWrites(gemLog: Record<string, unknown> | null | undefined, xpLog: Record<string, unknown> | null | undefined, at: number): { gem: number; xp: number; writes: Record<string, unknown> } {
  const w: Record<string, unknown> = {}; let gem = 0, xp = 0;
  if (!gemLog?.[PASS_KEY]) { gem = PASS_GEM; w[`gem/log/${PASS_KEY}`] = { g: PASS_GEM, at, why: '🧱 차원문 뼈대 · 답안지 통과' }; }
  if (!xpLog?.[PASS_KEY]) { xp = PASS_XP; w[`xp/log/${PASS_KEY}`] = { xp: PASS_XP, at, why: '🧱 차원문 뼈대 · 답안지 통과' }; }
  return { gem, xp, writes: w };
}
/** 통과 보상 주기 (gem/{반}/{번호} · xp/{반}/{번호} · 두 번 불러도 한 번) */
export function payPass(S: Store, cls: string, num: number, at: number): { gem: number; xp: number } {
  const gp = `gem/${ck(cls)}/${num}`, xp = `xp/${ck(cls)}/${num}`;
  const r = passWrites(S.get(`${gp}/log`), S.get(`${xp}/log`), at);
  for (const [k, v] of Object.entries(r.writes)) S.set(`${k.startsWith('gem/') ? gp : xp}/${k.slice(k.indexOf('/') + 1)}`, v);
  if (r.gem) addTo(S, `${gp}/total`, r.gem);
  if (r.xp) addTo(S, `${xp}/total`, r.xp);
  return { gem: r.gem, xp: r.xp };
}

/** 🎲 무작위 방 = 열린 방 중 아직 처치 안 한 방 먼저 (없으면 열린 방 아무거나) */
export function pickRoom<T extends { open: boolean; clear: boolean }>(rooms: T[], rnd: () => number = Math.random): T | null {
  const open = rooms.filter((r) => r.open), fresh = open.filter((r) => !r.clear), pool = fresh.length ? fresh : open;
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]! : null;
}

/** ✏ 글 한 곳 */
export const GATE_TXT = {
  name: '🌀 마왕성 차원문',
  sage: '너희가 쌓은 벽돌과 모은 빛이면 충분하다. … 마왕성 차원문이 열렸다. 그림자와 먼저 겨뤄 보아라. 진짜는 12월 10일, 교실에서 기다린다.',
  stone: '내 돌 한 조각이 차원문에 올라갔어요',
  random: '🎲 무작위로 한 문제',
  randomSub: '시험 문제와 상관없이 무작위로 나와요',
  practice: '📄 B세트로 연습하기',
  toEnergy: '⚡ 에너지 모으러 가기',
  pieceBanner: (n: number, t: number) => `🧱 돌 한 조각이 올라갔다! · ${n} / ${t}`,
  lightBanner: '⚡ 성채 정답! 빛 하나가 문으로',
  gain: (n: number) => `⚡ 내 에너지 +1 → 우리 반 ${n} / ${E_BASE}`,
} as const;

// ── 🌀 문 열기 (📜 11/28 시안 0: 리모컨 큰 단추 · TV 「앞으로 ▶」 = 문 단계에서 먼저 「🌀 문 열기 (영상)」 → 그다음 마무리) ──
type RoomLike = { state: { gateOpen?: number | null } } | null | undefined;
export const doorOpenAt = (R: RoomLike) => Number((R?.state as { gateOpen?: number } | undefined)?.gateOpen) || 0;
/** 지금 문 단계인데 아직 안 열림 = 큰 단추가 「🌀 문 열기」 */
export const doorPending = (s: Step | null | undefined, R: RoomLike) => gateOf(s) === 'door' && !doorOpenAt(R);
export const openDoor = (S: Store, code: string) => S.set(`rooms/${code}/state/gateOpen`, S.now());
/** 🚪 들어감 = 폰 「🌀 차원문으로 들어가기」 누른 학생 (방 내 칸 players/{uid}/gin) */
export const markEnter = (S: Store, code: string, uid: string) => S.set(`rooms/${code}/players/${uid}/gin`, S.now());
export const enteredOf = (R: { players?: Record<string, unknown> } | null | undefined) => Object.values(R?.players || {}).filter((p) => !!(p as { gin?: number } | null)?.gin).length;
/** 카드 · 리모컨 같은 숫자 */
export function gateCard(kind: 'sheet' | 'energy' | 'door' | null, t: Tally, entered = 0, online = 0): { k: string; n: number; m: number; bar: number; line: string } | null {
  if (kind === 'sheet') { const f = frameOf(t.n, t.pass); return { k: '🧱 답안지 통과', n: Math.min(t.pass, f.target), m: f.target, bar: f.target ? Math.min(1, t.pass / f.target) : 0, line: f.full ? `🧙 뼈대 완성 · 명단 ${t.n}명` : `목표 = ${t.n}명의 80% · 남은 ${Math.max(0, f.target - t.pass)}명` }; }
  if (kind === 'energy') { const r = runesOn(t.e), left = Math.max(0, E_BASE - t.e), en = energyOf(t.e); return { k: `⚡ 에너지 · 기준 ${E_BASE}`, n: t.e, m: E_BASE, bar: Math.min(1, t.e / E_BASE), line: `룬 ${r} / 10${left ? ` · 기준까지 +${left}` : en.stage >= 2 ? ` · ✨ ${en.name}` : ' · 기준 달성!'}` }; }
  if (kind === 'door') return { k: '🚪 차원문으로 들어감', n: entered, m: online, bar: online ? Math.min(1, entered / online) : 0, line: '각자 폰 「🌀 들어가기」 → 모의전' };
  return null;
}
