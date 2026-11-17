// 🏰 성채 팩 (📜 2026-11-14 · 메타인지 6 · DECISIONS 「🏰 성채던전 팩 · ➕ 추가 팩 관리」 · 정식 js/raid/bonus.js 규칙)
//   꼴 = { kind: 'castle', id: 'eval-N', floor, title, unit, theme, goal, bossPct: 60, rooms: [{ id, no(열림 차시), title, sprite, boss?, photo?, chain?, note?, video?, vers: [문항 판 × 7] }] }
//   문항 = 차시 팩 문항 꼴 그대로(toQ · 덧칸 say · why · groups · ref) · 판 0 = 첫 판 · 1~6 = 재도전 판
//   방 하나 = 몬스터 한 마리(1:1 · 혼자) · 열림 = 그 반 진도(연 차시 번호) ≥ 방 no · 👑 보스 방 = 열린 방(보스 빼고)의 60%(올림) 처치
//   처치 = 소문제 모두 · 기회 4 · 틀린 소문제만 다음 판 숫자로(raid.ts castleVers) · 소레이드 방 = 틀린 단계부터 · 실패 = 💧 벌 없음
//   저장: 팩 = prep/addons/castle/{id}(올린 글 그대로 + hide · at) · 처치 기록 = bonus/{반}/{번호}/{팩 id}/{방 id} = { clear?, tries, runs, at } (정식 경로)
import type { LessonPack, Question, Store } from '../model/types';
import { type Issue, recheckAll, toQ, versions } from './packUpload';
import { PACKS } from '../engine/packs';
import { forget } from '../engine/lessons';
import { CLASSES, lastClass, lastTest } from './school';

export interface CastleRoom { id: string; no: number; title: string; sprite: string; boss?: boolean; photo?: boolean; chain?: boolean; note?: string; video?: string; /** 방 카드 글 (#53 · 예 「⚔ 소레이드 · 5단계 · 📷 서술형」) */ card?: string; vers: Question[][] }
export interface CastlePack { kind: 'castle'; id: string; floor: number; title: string; unit: string; theme?: string; goal?: string; bossPct: number; rooms: CastleRoom[]; /** 👀 학생에게 숨김 */ hide?: boolean; /** 올린 때 */ at?: number; /** 올린 글 그대로 (⬇ 내려받기 · 다시 올리기) */ raw: Record<string, unknown> }
export interface CastleRec { clear?: boolean; tries?: number; runs?: number; at?: number; /** 📷 답은 맞힘 · 사진 단계 (그 숫자 그대로) */ ans?: { items: { question?: string; answer?: unknown; solution?: string; check?: Record<string, unknown> }[] }; /** 📷 통과한 결과 id */ legacy?: boolean; ph?: string; /** ⏳ 선생님 확인 기다리는 결과 id */ pend?: string; /** 📷 지난 최고 점수 (점수가 오르면 📜) */ phs?: number; /** 📜 #57 ✍ 혼자 다시 쓰기(숫자 바꾼 판) 통과 · 기다림 */ ph2?: string; pend2?: string }
export interface CastleChecked { pack: CastlePack | null; issues: Issue[]; stats: { rooms: number; items: number; versions: number; rechecked: number; ask: number } }

/** 저장 자리 (교사 쓰기 · 로그인한 사람 읽기 = 규칙 prep/$lesson 그대로 · 규칙 바꿀 일 없음) */
export const CASTLE_PATH = 'prep/addons/castle';
export const MAXV = 7;
/** 우리가 만든 정식 출신 층 = 지우기 대신 숨김만 */
export const OFFICIAL = /^eval-[1-3]$/;
/** 도감 이름표 꼴 「시트:줄」 + 색 돌리기 「@h300」 (정식 'castle1:1@h300') */
export const SPRITE_RE = /^[a-z][a-z0-9]*:\d+(@h\d{1,3})?$/;
/** 방 열림 차시 줄 「2~6차시」 */
export const spanOf = (P: CastlePack) => { const n = P.rooms.map((r) => r.no); return n.length ? (Math.min(...n) === Math.max(...n) ? `${n[0]}차시` : `${Math.min(...n)}~${Math.max(...n)}차시`) : ''; };
export const floorName = (P: CastlePack) => `${P.floor}층 ${P.title}`;

/** 🔎 성채 팩 검사 (글 또는 이미 읽은 값) — 꼴 · 보기 번호 · 판 0~6 · 방 id 겹침 · no · 보스 하나 · 도감 이름표 */
export function checkCastle(src: string | unknown, look: { sheet: (ref: string) => boolean }): CastleChecked {
  const out: Issue[] = [], stats = { rooms: 0, items: 0, versions: 0, rechecked: 0, ask: 0 };
  const err = (at: string, msg: string) => out.push({ at, msg, lvl: 'err' });
  let raw: unknown = src;
  if (typeof src === 'string') { try { raw = JSON.parse(src); } catch (e) { return { pack: null, issues: [{ at: '파일', msg: `JSON 으로 읽을 수 없어요 — ${(e as Error).message}`, lvl: 'err' }], stats }; } }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { pack: null, issues: [{ at: '파일', msg: '성채 팩 꼴이 아니에요', lvl: 'err' }], stats };
  const r = raw as Record<string, unknown>;
  if (r.kind !== 'castle') err('종류(kind)', `「${String(r.kind ?? '')}」 — 성채 팩은 "castle"`);
  const id = String(r.id ?? '');
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) err('팩 id(id)', `「${id}」 — 영어 소문자 · 숫자 · - 만 (예: eval-1)`);
  const floor = Number(r.floor);
  if (!(Number.isInteger(floor) && floor > 0)) err('층(floor)', `「${String(r.floor ?? '')}」 — 1 이상 정수`);
  if (!String(r.title ?? '').trim()) err('제목(title)', '칸이 비었어요');
  const bossPct = r.bossPct == null ? 60 : Number(r.bossPct);
  if (!(bossPct > 0 && bossPct <= 100)) err('보스 기준(bossPct)', `「${String(r.bossPct)}」 — 1 ~ 100`);
  const rooms0 = Array.isArray(r.rooms) ? (r.rooms as Record<string, unknown>[]) : null;
  if (!rooms0 || !rooms0.length) { err('방 목록(rooms)', '방이 하나도 없어요'); return { pack: null, issues: out, stats }; }
  const seen = new Set<string>(), rooms: CastleRoom[] = [];
  rooms0.forEach((m, k) => {
    const rid = String(m?.id ?? ''), nm = `${k + 1}번 방${rid ? ` 「${rid}」` : ''}`;
    if (!m || typeof m !== 'object') { err(nm, '방 칸이 비었어요'); return; }
    if (!rid) err(nm, '방 id(id)가 비었어요');
    else if (seen.has(rid)) err(nm, `방 id 「${rid}」 가 겹쳐요`);
    seen.add(rid);
    const no = Number(m.no);
    if (m.no == null || m.no === '') err(`${nm} · 열림 차시(no)`, '칸이 비었어요 — 이 방을 여는 차시 번호');
    else if (!(Number.isInteger(no) && no > 0)) err(`${nm} · 열림 차시(no)`, `「${String(m.no)}」 — 1 이상 정수`);
    const title = String(m.title ?? '').trim(); if (!title) err(`${nm} · 제목(title)`, '칸이 비었어요');
    const sprite = String(m.sprite ?? '').trim();
    if (!SPRITE_RE.test(sprite)) err(`${nm} · 그림(sprite)`, `「${sprite}」 — 도감 이름표 꼴 「시트:줄」 · 색 돌리기 「@h300」 (예: castle1:1@h300)`);
    else if (!look.sheet(sprite)) out.push({ at: `${nm} · 그림(sprite)`, msg: `「${sprite}」 이 도감에 없어 기본 그림으로 보여요`, lvl: 'ask' });
    const vraw = Array.isArray(m.vers) ? (m.vers as unknown[]) : null;
    if (!vraw || !vraw.length) { err(`${nm} · 판(vers)`, '판이 하나도 없어요 — [첫 판, 재도전 판 …]'); return; }
    if (!Array.isArray(vraw[0]) || !(vraw[0] as unknown[]).length) { err(`${nm} · 판 0`, '문항이 하나도 없어요'); return; }
    const at = title || nm;
    const vs = versions(vraw as never, at, out, (v, i) => `${at} · 판 ${v} · ${i + 1}번`);
    if (m.chain && vs.some((v) => v.length < 2)) err(`${at} · 소레이드(chain)`, '단계가 2개 이상이어야 해요');
    if (vs.length < MAXV) out.push({ at: `${at} · 판(vers)`, msg: `판 ${vs.length}개 — 재도전 판이 모자라면 앞 판을 다시 써요 (판 0 ~ 6 · 7개 권장)`, lvl: 'ask' });
    vs.forEach((v, kk) => { const rc = recheckAll(v, (i) => `${at} · 판 ${kk} · ${i + 1}번`, out); stats.rechecked += rc.done; stats.ask += rc.ask; });
    stats.rooms++; stats.items += vs[0]?.length ?? 0; stats.versions += vs.length;
    rooms.push({ id: rid, no, title, sprite, ...(m.boss ? { boss: true } : {}), ...(m.photo ? { photo: true } : {}), ...(m.chain ? { chain: true } : {}), ...(m.note ? { note: String(m.note) } : {}), ...(m.card ? { card: String(m.card).slice(0, 60) } : {}), ...(m.video ? { video: String(m.video) } : {}), vers: vs });
  });
  const bosses = rooms0.filter((m) => m && m.boss).length;
  if (bosses !== 1) err('👑 보스 방(boss)', bosses ? `보스 방이 ${bosses}개 — 한 층에 하나만` : '보스 방이 없어요 — 한 방에 "boss": true');
  if (out.some((x) => x.lvl === 'err')) return { pack: null, issues: out, stats };
  const pack: CastlePack = { kind: 'castle', id, floor, title: String(r.title), unit: String(r.unit ?? ''), ...(r.theme ? { theme: String(r.theme) } : {}), ...(r.goal ? { goal: String(r.goal) } : {}), bossPct, rooms, raw: strip(r), ...(r.hide ? { hide: true } : {}), ...(Number(r.at) ? { at: Number(r.at) } : {}) };
  return { pack, issues: out, stats };
}
/** 올린 글 그대로 (저장용 꼬리표 hide · at 은 뺌) */
function strip(r: Record<string, unknown>): Record<string, unknown> { const { hide: _h, at: _a, ...rest } = r; void _h; void _a; return rest; }

/** 서버에서 돌아온 값 되살리기 — Firebase 는 빈 배열(ch: [])을 지우고 배열을 객체로 줄 수도 */
export function reviveRaw(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(reviveRaw);
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>, ks = Object.keys(o);
    if (ks.length && ks.every((k, i) => k === String(i))) return ks.map((k) => reviveRaw(o[k]));
    return Object.fromEntries(ks.map((k) => [k, reviveRaw(o[k])]));
  }
  return x;
}
/** 📦 올린 성채 팩 받기 (앱 시작 때 한 번) → 검사 통과분만 · 층 순서 */
export async function loadCastles(S: { get<T>(p: string): T | null; fetch?<T>(p: string): Promise<T | null> }, look: { sheet: (ref: string) => boolean } = { sheet: () => true }): Promise<CastlePack[]> {
  const v = (S.fetch ? await S.fetch<Record<string, unknown>>(CASTLE_PATH).catch(() => null) : S.get<Record<string, unknown>>(CASTLE_PATH)) || {};
  const out: CastlePack[] = [];
  for (const x of Object.values(v)) { const c = checkCastle(reviveRaw(x), look); if (c.pack) out.push(c.pack); else console.warn('올린 성채 팩 검사 실패', (x as { id?: string })?.id, c.issues.filter((i) => i.lvl === 'err')); }
  return out.sort((a, b) => a.floor - b.floor);
}
/** 저장할 값 = 올린 글 + 숨김 · 때 */
export const storeOf = (P: CastlePack, now: number) => ({ ...P.raw, ...(P.hide ? { hide: true } : {}), at: now });

// ── 열림 · 👑 보스 ──
export interface CastleState { open: CastleRoom[]; plain: CastleRoom[]; cleared: number; need: number; boss: CastleRoom | null; bossOpen: boolean; isOpen: (r: CastleRoom) => boolean }
/** 🔓 교사 수동 해금 (📜 2026-11-15 DECISIONS 「성채(추가 팩) 방 = 교사 수동 해금」) — 서버 school/castleOpen/{팩}/{반}/{방} = true · school/castleAuto/{팩} = false(자동 해금 끔)
 *  열림 = 교사가 연 방 OR 자동(진도 · 👑 보스 60%) · 교사가 연 보스 = 60% 없이 · 자동 끔 = 교사가 연 방만 */
export interface Manual { open: Record<string, unknown>; auto: boolean }
export const MANUAL0: Manual = { open: {}, auto: true };
const ckc = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const openPath = (packId: string, cls: string) => `school/castleOpen/${ckc(packId)}/${ckc(cls)}`;
export const autoPath = (packId: string) => `school/castleAuto/${ckc(packId)}`;
export const manualOf = (S: Store, packId: string, cls: string): Manual => ({ open: (cls && S.get<Record<string, unknown>>(openPath(packId, cls))) || {}, auto: S.get<boolean>(autoPath(packId)) !== false });
/** 교사: 반들 × 방들 열기 · 잠그기 (rooms = 그 층 방 id · 전체 = 모든 방) */
export function setManual(S: Store, packId: string, classes: string[], rooms: string[], on: boolean) { for (const c of classes) for (const r of rooms) S.set(`${openPath(packId, c)}/${r}`, on ? true : null); }
export const setAuto = (S: Store, packId: string, on: boolean) => S.set(autoPath(packId), on ? null : false);

// ── 열림 · 👑 보스 ──
export interface CastleState { open: CastleRoom[]; plain: CastleRoom[]; cleared: number; need: number; boss: CastleRoom | null; bossOpen: boolean; isOpen: (r: CastleRoom) => boolean; auto: boolean; byTeacher: (r: CastleRoom) => boolean }
/** 열린 방 · 👑 보스 조건 (upto = 그 반이 연 마지막 차시 · all = 선생님 미리 보기 · man = 🔓 교사 해금) — 정식 roomsState(사진 방도 잠그지 않음) + 교사 해금 */
export function castleState(P: CastlePack, upto: number, recs: Record<string, CastleRec | undefined>, all = false, man: Manual = MANUAL0): CastleState {
  const boss = P.rooms.find((r) => r.boss) ?? null, auto = man.auto !== false;
  const byTeacher = (r: CastleRoom) => !!man.open?.[r.id];
  const plainOpen = (r: CastleRoom) => all || byTeacher(r) || (auto && r.no <= upto);
  const plain = P.rooms.filter((r) => !r.boss && plainOpen(r));
  const cleared = plain.filter((r) => recs[r.id]?.clear).length, need = Math.ceil((plain.length * (P.bossPct || 60)) / 100);
  const bossOpen = !!boss && (all || byTeacher(boss) || (auto && boss.no <= upto && plain.length > 0 && cleared >= need));
  const isOpen = (r: CastleRoom) => (r.boss ? bossOpen : plainOpen(r));
  return { open: P.rooms.filter(isOpen), plain, cleared, need, boss, bossOpen, isOpen, auto, byTeacher };
}
/** 🔁 다시 들어온 방의 첫 판 (정식: 처음 = 판 0 · 다시 = 판 1~) — 기회 4번이 판 6 을 넘지 않게 1 · 2 · 3 을 돌림 */
/** 🏰 옛 기록 (정식 bonus.js roomRec · lessons/eval-1.js LEGACY): 예전 1층 7마리(e1 ~ eb) 처치 = 그 방들 처치로 봄 · 읽을 때만 (서버 기록은 그대로) */
export const LEGACY: Record<string, Record<string, string[]>> = { 'eval-1': { e1: ['q01', 'q02'], e2: ['q03', 'q04'], e3: ['q05'], e4: ['q06', 'q07'], e5: ['q08'], e6: ['q09', 'q10'], eb: ['q11', 'q12'] } };
export function withLegacy(packId: string, recs: Record<string, CastleRec>): Record<string, CastleRec> {
  const L = LEGACY[packId]; if (!L) return recs;
  const out = { ...recs };
  for (const [old, ids] of Object.entries(L)) if (recs[old]?.clear) for (const id of ids) if (!out[id]?.clear) out[id] = { ...(out[id] || {}), clear: true, legacy: true } as CastleRec;
  return out;
}
export const baseVer = (rec: CastleRec | undefined) => { const n = Number(rec?.runs) || 0; return n ? 1 + ((n - 1) % 3) : 0; };

/** 방 하나 → 몬스터 하나짜리 차시 팩 (학생 레이드 화면 · MonsterForm · ChainView 를 그대로 씀 🪞) */
export function roomPack(P: CastlePack, r: CastleRoom, sprite = r.sprite): LessonPack {
  const id = `${P.id}~${r.id}`;
  return {
    v: 1, id, no: r.no, title: r.title, unit: P.unit, theme: r.boss ? 'citadel-boss' : 'citadel-room', defaultPct: 100,
    steps: [{ kind: 'monster', id: r.id, title: r.title }],
    monsters: { [r.id]: { title: r.title, sprite, attack: 'pause', first: r.vers[0], retry: { pool: r.vers.slice(1) }, ...(r.chain ? { chain: { pool: r.vers } } : {}), ...(r.note ? { noteText: r.note } : {}) } },
  };
}
/** 같은 id 를 다시 올림 = 지난 판 문항 기억 지움 */
export const forgetCastle = (P: CastlePack) => P.rooms.forEach((r) => forget(`${P.id}~${r.id}`));

// ── 진도 · 기록 ──
/** 반 진도 (정식 bonus.js upto = unlock/{반} = 그 반이 게임으로 연 가장 큰 차시) — 베타 = held/{반}(정식에서 옮긴 · 수업 시작 때 적힘 · 출시 대조: 6반 모두 unlock 과 같음)
 *  + school/last · 🧪 lastTest + 내 수업 기록 중 큰 것 · 반이 없으면(교사 · 시험 캠프) 모든 반 중 큰 것 · all = 👩‍🏫 교사 캠프(정식 교사 = 모든 방 열림) */
const noOfLesson = (id: string) => PACKS.find((p) => p.id === id)?.no ?? (Number(/(\d+)$/.exec(id)?.[1]) || 0);
export function progressOf(S: Store, cls: string, recs: Record<string, unknown> = {}, all = false): number {
  if (all) return 99;
  const cs = cls ? [cls] : CLASSES;
  const held = cs.flatMap((c) => Object.keys(S.get<Record<string, unknown>>(`held/${c.replace(/[.#$/[\]]/g, '_')}`) || {}).map(noOfLesson));
  return Math.max(0, ...held, ...Object.keys(recs).map(noOfLesson), ...cs.flatMap((c) => [Number(lastClass(S, c)?.no) || 0, Number(lastTest(S, c)?.no) || 0]));
}
/** 처치 기록 자리 (정식 bonus/{반}/{번호}) */
export const bonusBase = (cls: string, num: number | string) => `bonus/${(cls || 'me').replace(/[.#$/[\]]/g, '_')}/${num || 0}`;
/** 처치 n명 (교사 카드) = 그 팩에서 방을 하나라도 처치한 학생 */
export function clearedBy(tree: Record<string, Record<string, Record<string, Record<string, CastleRec>>>> | null, packId: string): number {
  let n = 0;
  for (const c of Object.values(tree || {})) for (const st of Object.values(c || {})) if (Object.values(st?.[packId] || {}).some((x) => x?.clear)) n++;
  return n;
}
/** 다시 올린 판과 지난 판: 같은 방 id = 처치 기록 그대로 이어짐 · 빠진 방 · 새 방 */
export function diffRooms(old: CastlePack, neu: CastlePack): { keep: string[]; gone: string[]; added: string[] } {
  const o = new Set(old.rooms.map((r) => r.id)), n = new Set(neu.rooms.map((r) => r.id));
  return { keep: [...n].filter((x) => o.has(x)), gone: [...o].filter((x) => !n.has(x)), added: [...n].filter((x) => !o.has(x)) };
}
/** ⬇ 내려받기 zip = 팩 JSON(올린 글 그대로 · 다시 올리면 같은 팩) + README */
export async function castleZip(P: CastlePack): Promise<{ name: string; bytes: Uint8Array }> {
  const { zipSync, strToU8 } = await import('fflate');
  const files: Record<string, Uint8Array> = { [`${P.id}.json`]: strToU8(JSON.stringify(P.raw, null, 1)), 'README.txt': strToU8(`🏰 ${floorName(P)} · 방 ${P.rooms.length}개 · 열림 ${spanOf(P)}\n이 zip 의 .json 을 「📦 팩 올리기」에 그대로 올리면 같은 성채 팩이에요.\n`) };
  return { name: `(성채 ${P.floor}층) ${P.id}.zip`, bytes: zipSync(files) };
}

// 💎 성채 보상 = 정식 그대로 (📜 2026-11-14 머리 「보상 없음은 안 됨 — 정식 release 코드 값 그대로」 · js/raid/gem.js G · js/raid/grow.js XP · js/raid/bonus.js win)
//   처음 처치한 방만: 방 8 · 👑 보스 방 24 · 🎁 성채 첫 방(평생 한 번) 4 · 첫 판에 틀림 없이 6 = 하루 한도 안 · 🏆 업적(그 층 보스 처음 처치 = 인장) 12 = 한도 밖
//   EXP = 방 처음 처치 5 + 업적 10 · 📷 서술형 통과 6 · 다시 처치 = 보상 없음
export const CASTLE_GEM = { room: 8, roomBoss: 24, roomFirst: 6, first: 4, seal: 12 } as const;
export const CASTLE_XP = { clear: 5, seal: 10, photo: 6 } as const;
/** 📷 서술형 통과 (정식 G.photo 6 · 하루 한도 안 · 처음만) · 📜 = 처음 통과 1 + 만점 1 + 점수가 오르면 1 (정식 scrollWin) */
export const CASTLE_PHOTO_GEM = 6;
export const photoScrolls = (w: { score?: number; total?: number; up?: boolean } | null) => 1 + (w && Number(w.total) > 0 && w.score === w.total ? 1 : 0) + (w?.up ? 1 : 0);
export interface CastleWin { first: boolean; boss: boolean; firstCastle: boolean; flawless: boolean; sealed: boolean }
/** 받을 것 (줄마다 = 💎 n · 이유 · 한도 밖?) + EXP */
export function castleReward(w: CastleWin): { gems: { n: number; why: string; free?: boolean }[]; xp: number } {
  if (!w.first) return { gems: [], xp: 0 };
  const gems: { n: number; why: string; free?: boolean }[] = [{ n: w.boss ? CASTLE_GEM.roomBoss : CASTLE_GEM.room, why: '성채 방 처치' }];
  if (w.firstCastle) gems.push({ n: CASTLE_GEM.first, why: '성채 첫 방' });
  if (w.flawless) gems.push({ n: CASTLE_GEM.roomFirst, why: '첫 판에 처치' });
  if (w.sealed) gems.push({ n: CASTLE_GEM.seal, why: '🏆 업적', free: true });
  return { gems, xp: CASTLE_XP.clear + (w.sealed ? CASTLE_XP.seal : 0) };
}
