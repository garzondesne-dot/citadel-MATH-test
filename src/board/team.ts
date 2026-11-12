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
export interface Member { uid: string; cls: string; num: number; nick: string; hero: number; role: Role; why: string; ready?: boolean; at: number }
export interface Post { pid: string; lesson: string; no: number; at: number; host: string; phase: 'wait' | 'play' | 'done'; code?: string; mem: Record<string, Member> }

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
const mems = (p: Post | null) => Object.values(p?.mem || {}).filter(Boolean).sort((a, b) => a.at - b.at);
export const membersOf = mems;
export const hasGuard = (p: Post) => mems(p).some((m) => m.role === 'g');
/** 글 올리기 · 합류 · 나가기 · 준비 · 내리기 */
export function createPost(S: Store, L: LessonPack, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only?: string[]): string {
  const pid = `p${S.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, r = roleOf(rec, only);
  S.set(`${POSTS}/${pid}`, { pid, lesson: L.id, no: L.no, at: S.now(), host: me.uid, phase: 'wait', mem: { [me.uid]: { ...me, ...r, at: S.now(), ready: true } } });
  return pid;
}
export function canJoin(p: Post, uid: string, o: { open: boolean; inClass: boolean; online: boolean }): string {
  if (!o.online) return '서버와 끊겼어요';
  if (o.inClass) return '수업 중엔 합류할 수 없어요';
  if (!o.open) return '아직 진도 전이에요';
  if (p.phase !== 'wait') return '이미 출발했어요';
  if (p.mem?.[uid]) return '';
  if (mems(p).length >= MAX) return '자리가 다 찼어요';
  return '';
}
export function joinPost(S: Store, p: Post, me: Omit<Member, 'role' | 'why' | 'at'>, rec: Parameters<typeof roleOf>[0], only?: string[]) { S.set(`${POSTS}/${p.pid}/mem/${me.uid}`, { ...me, ...roleOf(rec, only), at: S.now(), ready: false }); }
/** 나가기: 출발 전 글 올린 사람 = 글 내림 · 그 밖(출발 뒤 글 올린 사람도) = 나만 빠짐 (#147 · 팀 진행은 남은 팀원이 이어받음) */
export const leavePost = (S: Store, p: Post, uid: string) => (p.host === uid && p.phase === 'wait' ? S.set(`${POSTS}/${p.pid}`, null) : S.set(`${POSTS}/${p.pid}/mem/${uid}`, null));
export const setReady = (S: Store, p: Post, uid: string, v: boolean) => S.set(`${POSTS}/${p.pid}/mem/${uid}/ready`, v);
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
