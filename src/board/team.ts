import type { LessonPack, Question, Room, Store } from '../model/types';
import { PROFILES } from '../model/profiles';
import { openRoom, roomPath, setFocus } from '../raid/actions';
import { chainRecord, isChain, itemsFor, plainRecord, stepOf, bossItem, bossState, chainItems, BOSS_ID } from '../raid/raid';
import { freshAll, kstDay } from './board';
import { bossFullOf } from '../school/records';

// 📋 게시판 던전 팀 (#143 · DECISIONS 「🏕 v1.0 쉼터 · 📋 게시판 던전 확정」 · ❓ #143-a = B · #143-b = A)
//   모집 글 = school/board/posts/{pid} · 팀 방 = rooms/T{pid}(게시판 프로필 · 서버) · 학생끼리 자유 글 없음
//   🛡 수호자 = ⏸ 설명(레이드마다 2번 · 한 번 최대 2분 · 팀 전체 멈춤) + 💡 힌트(그 문제를 먼저 다 맞힌 뒤 · 친구마다 문제당 1번 · 받는 친구의 그 판 숫자로 · 답은 안 보임)
//   🌱 도전자 = 🙋 도와줘 하나 · 수호자 없는 팀 · 1인 = 길잡이(💡 자동 1번 + ⏸ 생각 1분 1번)
export const MAX = 4, PAUSE_N = 2, PAUSE_MS = 120000, THINK_MS = 60000;
export const POSTS = 'school/board/posts';
export type Role = 'g' | 'c';
export interface Member { uid: string; cls: string; num: number; nick: string; hero: number; role: Role; why: string; ready?: boolean; at: number; /** ⏱ #76 이 폰이 보낸 마지막 숨 (20초마다 · 서버 시각) */ seen?: number; /** 🛡 #79 수호자 명성 판 수 (모집 · 합류 때) */ fame?: number; /** 🔒 합류 때 낸 암호 해시 (규칙이 boardLock 과 맞춰 봄) */ k?: string }
export interface Post { pid: string; lesson: string; no: number; at: number; host: string; phase: 'wait' | 'play' | 'done'; code?: string; /** ⚔ #65 혼자 도전(나 + 봇 3) = 모집 목록에 안 보임 */ solo?: boolean; mem: Record<string, Member>; /** ⏱ #76 마지막 움직임(모집 · 합류 · 준비 · 나가기) */ act?: number; /** ⏱ #76 저절로 끝남 (손 놓은 판) */ idle?: boolean; /** 🔒 입장 암호 있음 (암호 해시는 boardLock/{pid} · 글과 따로) */ lk?: boolean }

/** 🛡 판정 (❓ #143-a B · 숫자는 여기 한 곳): 그 차시 수업 기록 정답률 ≥ 80% 또는 형성평가 만점 → 수호자 · 기록 없으면 도전자 */
export const GUARD_RATE = 0.8;
export function roleOf(rec: { right?: number; total?: number; boss?: number | { ok?: number; items?: number }; bossN?: number; mons?: Record<string, unknown> } | null, only?: string[]): { role: Role; why: string } {
  // 정답률 = 맞힌 소문제 / 전체(v1.0 기록) · 정식 기록(소문제 수 없음) = 다 맞힌 몬스터(o · f) / 몬스터 · only = 나눈 차시의 문제만 (#163)
  const ms = Object.entries(rec?.mons || {}).filter(([k]) => !only || only.includes(k)).map(([, v]) => v);
  const tot = rec?.total && !only ? rec.total : ms.length;
  if (!rec || !tot) return { role: 'c', why: '🌱 이 차시 수업 기록이 아직 없어서 도전자예요' };
  const r = rec.total && !only ? (rec.right || 0) / rec.total : ms.filter((v) => v === 'o' || v === 'f').length / tot, bossFull = !only && bossFullOf(rec); // 정식 꼴 boss · bossN · 옛 꼴 둘 다
  if (bossFull) return { role: 'g', why: '🛡 이 차시 형성평가를 만점 받아서 수호자예요' };
  if (r >= GUARD_RATE) return { role: 'g', why: `🛡 이 차시 수업 정답률이 ${Math.round(r * 100)}%라서 수호자예요` };
  return { role: 'c', why: `🌱 이 차시 수업 정답률 ${Math.round(r * 100)}% · 같이 풀며 키워요` };
}
// 🐞 #47 (2026-11-21 선생님 「4인 던전에 여러 명 동시에 누르니까 7명까지 들어왔어」): 합류 = 「인원 읽기 → 자리 쓰기」가 따로라 동시에 누르면 모두 빈자리로 봄
//   → 모든 기기가 같은 줄(글 올린 사람 먼저 → 들어온 때 → uid)로 세워 앞 MAX 명만 자리 · 넘친 사람 = 자기 기기가 스스로 나감 + 「방이 꽉 찼어요」 (규칙 바꿈 없음)
const all = (p: Post | null) => Object.values(p?.mem || {}).filter(Boolean).sort((a, b) => (p && a.uid === p.host ? -1 : p && b.uid === p.host ? 1 : 0) || (Number(a.at) || 0) - (Number(b.at) || 0) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
/** 자리에 앉은 사람 = 앞 MAX 명 (화면 · 출발 · 역할 모두 이것만) */
const mems = (p: Post | null) => all(p).slice(0, MAX);
export const membersOf = mems;
/** 이 글에 넘쳐 들어온 사람인가 (자리 밖 = 나가야 함) */
export const overCap = (p: Post | null, uid: string) => !!p?.mem?.[uid] && !mems(p).some((m) => m.uid === uid);
export const hasGuard = (p: Post) => mems(p).some((m) => m.role === 'g');
// 🔒 입장 암호 (2026-11-13 선생님 「게시판 던전은 입장 암호 기능 추가해야 돼」): 숫자 4자리 · 서버엔 해시만(boardLock/{pid} = 아무도 못 읽음 · 규칙이 합류 때 맞춰 봄)
//   모집한 학생 = 이 기기에 암호 기억(대기실 위에만 보임) · 3번 틀리면 1분 뒤 다시(그 학생 · 그 글만 · 이 기기)
export const LOCK = 'boardLock', PIN_TRIES = 3, PIN_WAIT = 60000;
export const validPin = (pin: string) => /^\d{4}$/.test(pin);
export async function pinHash(pid: string, pin: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`citadel-board:${pid}:${pin}`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const newPid = (S: Store) => `p${S.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
type Ls = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
const memLs = new Map<string, string>(), MEM: Ls = { getItem: (k) => memLs.get(k) ?? null, setItem: (k, v) => void memLs.set(k, v), removeItem: (k) => void memLs.delete(k) };
const ls = (): Ls => { try { return typeof localStorage !== 'undefined' && localStorage ? localStorage : MEM; } catch { return MEM; } }; // 사생활 창 · 시험 = 이 탭 메모리
export const myPin = (pid: string) => { try { return ls()?.getItem(`citadel-board-pin-${pid}`) ?? ''; } catch { return ''; } };
const tryKey = (uid: string, pid: string) => `citadel-board-try-${uid}-${pid}`;
export function pinWait(uid: string, pid: string, now: number): number { try { const v = JSON.parse(ls()?.getItem(tryKey(uid, pid)) || 'null') as { n: number; until: number } | null; return v && v.until > now ? v.until - now : 0; } catch { return 0; } }
function pinMiss(uid: string, pid: string, now: number): number { try { const v = (JSON.parse(ls()?.getItem(tryKey(uid, pid)) || 'null') as { n: number; until: number } | null) || { n: 0, until: 0 }; const n = v.until && v.until <= now ? 1 : v.n + 1; const until = n >= PIN_TRIES ? now + PIN_WAIT : 0; ls()?.setItem(tryKey(uid, pid), JSON.stringify({ n: n >= PIN_TRIES ? 0 : n, until })); return PIN_TRIES - (n >= PIN_TRIES ? PIN_TRIES : n); } catch { return PIN_TRIES; } }
/** 글 올리기 · 합류 · 나가기 · 준비 · 내리기 */
export function createPost(S: Store, L: LessonPack, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only?: string[], lk = false, pid0?: string, solo = false): string {
  const pid = pid0 ?? newPid(S), r = roleOf(rec, only);
  S.set(`${POSTS}/${pid}`, { pid, lesson: L.id, no: L.no, at: S.now(), host: me.uid, phase: 'wait', act: S.now(), ...(lk ? { lk: true } : {}), ...(solo ? { solo: true } : {}), mem: { [me.uid]: { ...me, ...r, at: S.now(), seen: S.now(), ready: true } } });
  return pid;
}
/** 🔒 암호 건 글: 해시를 먼저 boardLock 에 → 글 · 모집한 기기에 암호 기억 */
export async function createLockedPost(S: Store, L: LessonPack, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only: string[] | undefined, pin: string): Promise<string> {
  if (!validPin(pin)) return createPost(S, L, me, rec, only);
  const pid = newPid(S);
  S.set(`${LOCK}/${pid}`, { h: await pinHash(pid, pin), at: S.now() }); try { ls()?.setItem(`citadel-board-pin-${pid}`, pin); } catch { /* 사생활 창 */ }
  return createPost(S, L, me, rec, only, true, pid);
}
export function canJoin(p: Post, uid: string, o: { open: boolean; inClass: boolean; online: boolean }): string {
  if (!o.online) return '서버와 끊겼어요';
  if (o.inClass) return '수업 중엔 합류할 수 없어요';
  if (!o.open) return '아직 진도 전이에요';
  if (p.phase !== 'wait') return '이미 출발했어요';
  if (p.mem?.[uid]) return '';
  if (all(p).length >= MAX) return '자리가 다 찼어요';
  return '';
}
export function joinPost(S: Store, p: Post, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only?: string[], k?: string) { S.set(`${POSTS}/${p.pid}/mem/${me.uid}`, { ...me, ...roleOf(rec, only), at: S.now(), seen: S.now(), ready: false, ...(k ? { k } : {}) }); S.set(`${POSTS}/${p.pid}/act`, S.now()); }
/** 🔒 암호 글 합류: 맞으면 '' · 틀리면 안내 · 서버 = 규칙이 판정(쓰기 성공 여부) · 이 기기 · 메모리 = 해시를 직접 비교 */
export async function joinLocked(S: Store & { trySet?: (path: string, v: unknown) => Promise<boolean> }, p: Post, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only: string[] | undefined, pin: string): Promise<string> {
  const now = S.now(), w = pinWait(me.uid, p.pid, now);
  if (w) return `⏳ ${Math.ceil(w / 1000)}초 뒤에 다시 해 봐요`;
  if (!validPin(pin)) return '숫자 4자리를 넣어요';
  const k = await pinHash(p.pid, pin), path = `${POSTS}/${p.pid}/mem/${me.uid}`, val = { ...me, ...roleOf(rec, only), at: now, ready: false, k };
  let ok: boolean;
  if (S.trySet) ok = await S.trySet(path, val);
  else { ok = S.get<{ h?: string }>(`${LOCK}/${p.pid}`)?.h === k; if (ok) S.set(path, val); }
  if (ok) { S.set(`${POSTS}/${p.pid}/act`, now); try { ls()?.removeItem(tryKey(me.uid, p.pid)); } catch { /* 무시 */ } return ''; }
  const left = pinMiss(me.uid, p.pid, now);
  return left > 0 ? `암호가 달라요 · ${left}번 남았어요` : '암호가 달라요 · 1분 뒤에 다시 해 봐요';
}
/** 나가기: 출발 전 글 올린 사람 = 글 내림 · 그 밖(출발 뒤 글 올린 사람도) = 나만 빠짐 (#147 · 팀 진행은 남은 팀원이 이어받음) */
export const leavePost = (S: Store, p: Post, uid: string) => { if (p.host === uid && p.phase === 'wait') { dissolve(S, p); return; } S.set(`${POSTS}/${p.pid}/mem/${uid}`, null); S.set(`${POSTS}/${p.pid}/act`, S.now()); };
export const setReady = (S: Store, p: Post, uid: string, v: boolean) => { S.set(`${POSTS}/${p.pid}/mem/${uid}/ready`, v); S.set(`${POSTS}/${p.pid}/act`, S.now()); };
export const canStart = (p: Post) => mems(p).every((m) => m.uid === p.host || m.ready);

/** ⚔ 출발 (글 올린 사람): 팀 방을 만들고 글에 방 코드 · 시간 = 팀 소문제 × 90초 */
export function startTeam(S: Store, L: LessonPack, p: Post, limitMs: number): string {
  const code = `T${p.pid}`, ms = mems(p);
  openRoom(S, L, code, PROFILES.board);
  S.set(`${roomPath(code)}/meta/fresh`, freshAll(L));
  S.set(`${roomPath(code)}/state/headcount`, 1); // 팀 공동 체력 = 소문제 수 (인원 × 가 아님)
  S.set(`${roomPath(code)}/meta/board`, { pid: p.pid, t0: S.now() + 2000, limit: limitMs, n: ms.length, guard: ms.some((m) => m.role === 'g'), roles: Object.fromEntries(ms.map((m) => [m.uid, m.role])) });
  S.set(`${POSTS}/${p.pid}/code`, code); S.set(`${POSTS}/${p.pid}/phase`, 'play');
  return code;
}
// ── ⏱ 팀 시계 (멈춘 시간 빼기) ──
export interface BMeta { pid?: string; t0: number; limit: number; n: number; guard: boolean; roles?: Record<string, Role>; paused?: number }
export interface BPause { at: number; by: string; think?: boolean }
export const bMeta = (R: Room) => (R.meta as unknown as { board?: BMeta }).board ?? null;
export const bPause = (R: Room) => ((R.state as unknown as { bp?: BPause | null }).bp ?? null);
export function elapsed(R: Room, now: number): number { const m = bMeta(R), p = bPause(R); if (!m) return 0; return Math.max(0, (p ? p.at : now) - m.t0 - (m.paused || 0)); }
export const timeLeft = (R: Room, now: number) => { const m = bMeta(R); return m ? Math.max(0, m.limit - elapsed(R, now)) : 0; };
/** ⏸ 수호자 설명(2번 · 2분) · 길잡이 생각(1번 · 1분) — 팀 전체 멈춤 = 게임 시계도 멈춤(집중과 같은 길) */
export const pausesLeft = (R: Room, uid: string) => PAUSE_N - (Number((R.meta as unknown as { bpUsed?: Record<string, number> }).bpUsed?.[uid]) || 0);
export const thinkUsed = (R: Room) => !!(R.meta as unknown as { thinkUsed?: boolean }).thinkUsed;
export function pauseOn(S: Store, code: string, R: Room, uid: string, think = false): boolean {
  if (bPause(R) || (think ? thinkUsed(R) : pausesLeft(R, uid) <= 0)) return false;
  if (think) S.set(`${roomPath(code)}/meta/thinkUsed`, true); else S.set(`${roomPath(code)}/meta/bpUsed/${uid}`, PAUSE_N - pausesLeft(R, uid) + 1);
  S.set(`${roomPath(code)}/state/bp`, { at: S.now(), by: uid, ...(think ? { think: true } : {}) });
  setFocus(S, code, true);
  return true;
}
export function pauseOff(S: Store, code: string, R: Room) {
  const p = bPause(R), m = bMeta(R); if (!p || !m) return;
  S.set(`${roomPath(code)}/meta/board/paused`, (m.paused || 0) + Math.max(0, S.now() - p.at));
  S.set(`${roomPath(code)}/state/bp`, null);
  setFocus(S, code, false);
}
export const pauseMax = (p: BPause) => (p.think ? THINK_MS : PAUSE_MS);
// ── 🙋 · 💡 ──
export const helpOn = (S: Store, code: string, uid: string, on: boolean) => S.set(`${roomPath(code)}/help/${uid}`, on ? S.now() : null);
/** 받는 친구가 지금 막힌 소문제 (그 판 숫자) */
export function stuckItem(L: LessonPack, R: Room, uid: string): { mid: string; k: number; q: Question } | null {
  const s = stepOf(L, R); if (!s) return null;
  if (s.kind === 'boss') { const st = bossState(L, R, uid), k = st.findIndex((x) => !x.ok); const q = k >= 0 ? bossItem(L, R, uid, k, st[k]!.next) : null; return q ? { mid: BOSS_ID, k, q } : null; }
  if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid); if (r.done) return null; const q = chainItems(L, R, s.id, uid, 0)[r.stage]; return q ? { mid: s.id, k: r.stage, q } : null; }
  const r = plainRecord(L, R, s.id, uid); if (r.perfect) return null;
  const its = itemsFor(L, R, s.id, uid, r.nextAttempt), last = r.tries.at(-1), k = last ? Math.max(0, last.marks.findIndex((x) => !x)) : 0;
  const q = its[k]; return q ? { mid: s.id, k, q } : null;
}
/** 💡 힌트 한 줄 = 차시 팩 풀이(근거 · 식) · 마지막 답 칸은 가림 */
export function hintOf(q: Question): string {
  const s = String(q.solution || '').trim();
  if (!s) return '💡 문제의 조건을 하나씩 다시 읽어 봐요';
  const i = s.lastIndexOf('→');
  return i > 0 ? `${s.slice(0, i).trim()} → ?` : s;
}
/** 수호자가 그 문제를 먼저 다 맞혔나 (힌트 조건) */
export function solvedStep(L: LessonPack, R: Room, uid: string): boolean {
  const s = stepOf(L, R); if (!s) return false;
  if (s.kind === 'boss') return bossState(L, R, uid).every((x) => x.ok);
  if (isChain(L, R, s.id)) return chainRecord(L, R, s.id, uid).done;
  return plainRecord(L, R, s.id, uid).perfect || plainRecord(L, R, s.id, uid).best === plainRecord(L, R, s.id, uid).total;
}
export const hintKey = (mid: string, k: number) => `${mid}_${k}`;
export function sendHint(S: Store, code: string, R: Room, L: LessonPack, from: string, to: string): string | null {
  const it = stuckItem(L, R, to); if (!it) return '이 친구는 지금 막힌 문제가 없어요';
  const key = hintKey(it.mid, it.k), had = (R as unknown as { bh?: Record<string, Record<string, unknown>> }).bh?.[to]?.[key];
  if (had) return '이 문제엔 이미 힌트를 보냈어요';
  S.set(`${roomPath(code)}/bh/${to}/${key}`, { from, at: S.now() });
  return null;
}
// ── 🏆 익명 순위 (학년 전체 · 차시별 · 이번 주) · 💎 ──
export const weekOf = (t: number) => { const d = new Date(t + 9 * 3600e3), day = (d.getUTCDay() + 6) % 7; return kstDay(t - day * 86400e3); };
export const RANK = 'school/board/rank';
export interface RankRow { s: number; g: number; c: number; at: number }
export function rankOf(rows: Record<string, RankRow> | null, mine: string) {
  const all = Object.entries(rows || {}), pos = (k: keyof RankRow) => { const me = rows?.[mine]; if (!me) return 0; return 1 + all.filter(([id, r]) => id !== mine && r[k] > me[k]).length; };
  return { n: all.length, s: pos('s'), g: pos('g'), c: pos('c') };
}
/** 수호 보너스 = 도전자 1명당 +10% (최대 +30%) · 🌱 도전자만 팀이 클리어 = +50% */
export function bonusOf(role: Role, n: number, guard: boolean, clear: boolean): number {
  if (role === 'g') return Math.min(0.3, 0.1 * Math.max(0, n - 1));
  return !guard && clear && n > 1 ? 0.5 : 0;
}
// ── 🚨 강적 출현 · 🤝 구조 (📜 DECISIONS 2026-11-14 「게시판 던전 강적 출현 · 구조 보상」) ──
//   ① 판정(도전자 폰 · 이유는 그 폰에만): (A) 그 차시 · 그 몬스터 수업 기록 없음 · 아무도 안 한 칸(n) / (B) 수업에서 못 맞힌 칸(x · -)인데 📕 복습 완료 기록 없음
//   ② 알림 = rooms/{방}/se/{도전자}/{몬스터_소문제} = { mid, k, at } (이유는 안 적음) · 같은 소문제는 한 번
//   ③ 🤝 구조 = 알림 뒤 수호자가 💡 힌트(bh · from) 또는 ⏸ 설명(rh/{수호자}/{도전자}_{키} = 시각)을 쓰고 → 도전자가 그 소문제를 맞힘
//      보상 = 수호자 💎 +5(하루 3번) · 도전자 💎 +3 · 하루 한도 100 안 (각자 자기 폰이 받음 · 게시판 끝 정산)
export const RESCUE = { guard: 5, chall: 3, perDay: 3 } as const;
export type SeAlert = { mid: string; k: number; at: number };
type RecLite = { mons?: Record<string, string>; bossM?: string } | null | undefined;
export function strongOf(rec: RecLite, reviewed: Record<string, unknown> | null | undefined, mid: string, k: number): 'A' | 'B' | null {
  if (!rec) return 'A';
  if (mid === BOSS_ID) { const c = rec.bossM?.[k]; if (c == null || c === 'n') return 'A'; return (c === 'x' || c === '-') && !reviewed?.boss ? 'B' : null; }
  const st = rec.mons?.[mid];
  if (st == null || st === 'n') return 'A';
  return (st === 'x' || st === '-') && !reviewed?.[mid] ? 'B' : null;
}
export const seOf = (R: Room | null) => ((R as unknown as { se?: Record<string, Record<string, SeAlert>> } | null)?.se) || {};
export const raiseStrong = (S: Store, code: string, uid: string, a: SeAlert) => S.set(`${roomPath(code)}/se/${uid}/${hintKey(a.mid, a.k)}`, a);
/** ⏸ 설명을 그 도전자 때문에 켰음 (구조 판정용 · 수호자 칸) */
export const markPauseHelp = (S: Store, code: string, g: string, c: string, a: SeAlert) => S.set(`${roomPath(code)}/rh/${g}/${c}_${hintKey(a.mid, a.k)}`, S.now());
/** 그 도전자가 그 소문제를 맞혔나 */
export function itemSolved(L: LessonPack, R: Room, uid: string, mid: string, k: number): boolean {
  if (mid === BOSS_ID) return !!bossState(L, R, uid)[k]?.ok;
  if (!L.monsters[mid]) return false;
  if (isChain(L, R, mid)) { const r = chainRecord(L, R, mid, uid); return r.done || r.stage > k; }
  return plainRecord(L, R, mid, uid).tries.some((t) => !!t.marks[k]);
}
/** 🤝 완전 구조 (📜 2026-11-15 선생님 「추천 A」): 구조 뒤 그 도전자가 같은 몬스터의 다음 소문제를 💡 · ⏸ 없이 첫 시도에 맞힘
 *  소레이드 = 다음 단계를 틀림 없이 · 형성평가 = 다음 문항 첫 시도 · 일반 몬스터 = 구조된 소문제를 처음 맞힌 그 제출에서 다음 소문제도 처음으로 맞힘 */
export function fullRescue(L: LessonPack, R: Room, c: string, mid: string, k: number): boolean {
  const k1 = k + 1, key1 = hintKey(mid, k1), helped = !!((R as unknown as { bh?: Record<string, Record<string, unknown>> }).bh?.[c]?.[key1]) || Object.values((R as unknown as { rh?: Record<string, Record<string, number>> }).rh || {}).some((x) => !!x?.[`${c}_${key1}`]);
  if (helped) return false;
  if (mid === BOSS_ID) { const b = bossState(L, R, c)[k1]; return !!b && b.first; }
  if (!L.monsters[mid]) return false;
  if (isChain(L, R, mid)) { const r = chainRecord(L, R, mid, c); return k1 < r.stFirst.length && !!r.stFirst[k1]; }
  const tr = plainRecord(L, R, mid, c).tries, at = tr.findIndex((t) => !!t.marks[k]);
  return at >= 0 && !!tr[at]!.marks[k1] && !tr.slice(0, at).some((t) => !!t.marks[k1]);
}
/** 구조 목록: { g 수호자, c 도전자, key, full 완전 구조 } — 알림 뒤 수호자의 💡 · ⏸ + 도전자가 맞힘 */
export function rescuesOf(L: LessonPack, R: Room, roles: Record<string, Role>): { g: string; c: string; key: string; full: boolean }[] {
  const out: { g: string; c: string; key: string; full: boolean }[] = [], bh = (R as unknown as { bh?: Record<string, Record<string, { from: string; at: number }>> }).bh || {}, rh = (R as unknown as { rh?: Record<string, Record<string, number>> }).rh || {};
  for (const [c, list] of Object.entries(seOf(R))) for (const [key, a] of Object.entries(list || {})) {
    if (!a || !itemSolved(L, R, c, a.mid, a.k)) continue;
    const byHint = bh[c]?.[key], g = byHint && roles[byHint.from] === 'g' && byHint.at >= a.at ? byHint.from : Object.keys(rh).find((u) => roles[u] === 'g' && Number(rh[u]?.[`${c}_${key}`]) >= a.at);
    if (g) out.push({ g, c, key, full: fullRescue(L, R, c, a.mid, a.k) });
  }
  return out;
}

// ── ⏱ #76 방 저절로 닫기 (📜 2026-11-18 머리 🔨 · 숫자는 여기 한 곳 · 시각 = 서버 시각 S.now) ──
//   대기: 10분 동안 아무 움직임(모집 · 합류 · 준비 · 나가기) 없음 → 해산 + 🔒 암호 지움
//   방장: 숨(20초마다)이 1분 끊김 → 살아 있는 팀원 중 먼저 들어온 사람에게 넘김 · 없으면 해산 (숨을 한 번도 안 보낸 옛 판 방장은 넘기지 않음 → 10분 규칙만)
//   진행: 팀 모두 10분 숨 없음 → 그 판 끝(기록 = 각자 폰이 돌아오면 결과 화면 · 글 = done · idle)
//   끝난 글: 하루 지나면 지움 · 아무 폰(게시판을 연 폰)이 30초마다 살펴 정리 (규칙 = 글 지우기 · 넘기기 · 암호 지우기 누구나)
export const LIFE = { beat: 20e3, hostGone: 60e3, waitIdle: 10 * 60e3, playIdle: 10 * 60e3, doneKeep: 24 * 3600e3, sweep: 30e3 } as const;
const tnum = (v: unknown) => Number(v) || 0;
/** 마지막 움직임 (모집 · 합류 · 준비 · 나가기) */
export const lastAct = (p: Post) => Math.max(tnum(p.act), tnum(p.at), ...mems(p).map((m) => tnum(m.at)));
/** 마지막 숨 (움직임 + 팀원 숨) */
export const lastBeat = (p: Post) => Math.max(lastAct(p), ...mems(p).map((m) => tnum(m.seen)));
export type Sweep = { kind: 'dissolve' | 'end' | 'drop'; why: string } | { kind: 'host'; to: string; why: string } | null;
export function sweepOf(p: Post, now: number): Sweep {
  if (!p || !p.pid) return null;
  const ms = mems(p);
  if (p.phase === 'done') return now - lastBeat(p) > LIFE.doneKeep ? { kind: 'drop', why: '끝난 지 하루' } : null;
  if (p.phase === 'play') return now - lastBeat(p) > LIFE.playIdle ? { kind: 'end', why: '진행 중 10분 숨 없음' } : null;
  if (!ms.length) return { kind: 'dissolve', why: '팀원 없음' };
  if (now - lastAct(p) > LIFE.waitIdle) return { kind: 'dissolve', why: '대기 10분 움직임 없음' };
  const h = p.mem?.[p.host];
  if (!h || (h.seen != null && now - tnum(h.seen) > LIFE.hostGone)) {
    const alive = ms.filter((m) => m.uid !== p.host && now - Math.max(tnum(m.seen), tnum(m.at)) <= LIFE.hostGone).sort((a, b) => tnum(a.at) - tnum(b.at));
    return alive[0] ? { kind: 'host', to: alive[0].uid, why: '방장 1분 끊김' } : { kind: 'dissolve', why: '방장 끊김 · 남은 팀원 없음' };
  }
  return null;
}
/** 해산 = 글 지움 → 그다음 🔒 암호 지움 (규칙: 글이 없어야 암호를 지울 수 있음) */
export function dissolve(S: Store, p: Post) {
  S.set(`${POSTS}/${p.pid}`, null);
  if (p.lk) { const t = (S as Store & { trySet?: (path: string, v: unknown) => Promise<boolean> }).trySet; if (t) void t.call(S, `${LOCK}/${p.pid}`, null); else S.set(`${LOCK}/${p.pid}`, null); }
}
/** 살펴서 정리 한 번 → 한 일 수 */
export function sweepAll(S: Store, posts: Record<string, Post> | null, now: number): number {
  let n = 0;
  for (const p of Object.values(posts || {})) {
    const w = sweepOf(p, now); if (!w) continue; n++;
    if (w.kind === 'dissolve' || w.kind === 'drop') dissolve(S, p);
    else if (w.kind === 'end') { S.set(`${POSTS}/${p.pid}/phase`, 'done'); S.set(`${POSTS}/${p.pid}/idle`, true); }
    else if (w.kind === 'host') { S.set(`${POSTS}/${p.pid}/host`, w.to); S.set(`${POSTS}/${p.pid}/mem/${w.to}/ready`, true); S.set(`${POSTS}/${p.pid}/act`, now); }
  }
  return n;
}
/** 내 숨 (대기 · 진행 중 20초마다) */
export const beat = (S: Store, p: Post, uid: string) => { if (p.mem?.[uid]) S.set(`${POSTS}/${p.pid}/mem/${uid}/seen`, S.now()); };
