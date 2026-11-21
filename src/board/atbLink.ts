// 📡 #48 게시판 던전(ATB) ↔ 베타 게시판 (docs/board-atb/SERVER-v1.md 1 · 2 · 3절) — 손발 #1 몫: 출발 메타 · 학생 기록 · ⭐ 정복 지도 · 반 공적
//   전투 네트워크(방장 엔진 · snap · act · hb · 봇 이어받기) · 결과 계산 = 손발 #2 (AtbNet · atbResultFor)
import type { LessonPack, Store } from '../model/types';
import { HEROES } from '../model/hero';
import { isBeta } from '../school/school';
import { MAX, POSTS, membersOf, type Post } from './team';
import { addMerit } from './war';

export const ATB = 'atb';
export interface AtbSlot { uid?: string; cls?: string; num?: number; hero: number; nick?: string; role?: 'g' | 'c'; bot?: 'normal' }
export interface AtbMeta { v: 1; pid: string; lid: string; no: number; diff: 'normal'; seed: number; t0: number; slots: AtbSlot[] }
export interface AtbEnd { win: boolean; sec: number; right: number; total: number; first?: number; perfect?: boolean; stars: number; merit: Record<string, number>; gem: Record<string, number>; role?: 'g' | 'c'; why?: string }
const sum = (o: Record<string, number> | undefined) => Object.values(o || {}).reduce((a, x) => a + (Number(x) || 0), 0);
/** 🧪 테스트 반 · 연습방 = 로컬 그대로(atb 안 씀) */
export const atbOnline = (S: Store, p: Post) => S.kind !== 'memory' && !membersOf(p).some((m) => isBeta(S, m.cls));
/** 출발 (방장 1번): meta → 글 play · code 'A'+pid · 빈자리 = 봇 (4칸 고정 · 봇 용사 = 아직 안 고른 용사 차례로) */
export function startAtb(S: Store, L: LessonPack, p: Post, seed = Math.floor(Math.random() * 2 ** 31)): AtbMeta {
  const ms = membersOf(p), used = new Set(ms.map((m) => m.hero));
  const free = HEROES.map((h) => h.id).filter((h) => !used.has(h));
  const slots: AtbSlot[] = ms.map((m) => ({ uid: m.uid, cls: m.cls, num: m.num, hero: m.hero, nick: m.nick, role: m.role }));
  while (slots.length < MAX) slots.push({ bot: 'normal', hero: free.shift() ?? 1 });
  const meta: AtbMeta = { v: 1, pid: p.pid, lid: L.id, no: L.no, diff: 'normal', seed, t0: S.now() + 2000, slots };
  S.set(`${ATB}/${p.pid}/meta`, meta);
  S.set(`${ATB}/${p.pid}/host`, p.host);
  S.set(`${POSTS}/${p.pid}/code`, `A${p.pid}`); S.set(`${POSTS}/${p.pid}/phase`, 'play');
  return meta;
}
export const isAtb = (p: Post | null) => !!p?.code?.startsWith('A');
export const atbMeta = (S: Store, pid: string) => S.get<AtbMeta>(`${ATB}/${pid}/meta`);
/** 지금까지 그 차시 최고 별 (⭐ 골고루 돌기 · 손발 #2 계산의 prevStars) */
export const prevStars = (S: Store, cls: string, num: number, lid: string) => Math.max(0, Math.min(3, Number(S.get(`bonus/${cls}/${num}/boardStar/${lid}`)) || 0));
/** 끝 (각 폰 = 자기 것만): 학생 기록 · ⭐ 최고 별 · 반 공적 — 돌려주는 값 = 이번 판 💎 (지갑에 더하는 건 화면 쪽) · 공적 */
export function saveAtbResult(S: Store, ctx: { cls: string; num: number; L: LessonPack; pid: string; n: number }, e: AtbEnd): { gem: number; merit: number; newStars: number } {
  const { cls, num, L, pid, n } = ctx, t = S.now();
  if (S.kind === 'memory' || !cls || !num || isBeta(S, cls)) return { gem: sum(e.gem), merit: 0, newStars: 0 };
  const merit = sum(e.merit), was = prevStars(S, cls, num, L.id), stars = Math.max(0, Math.min(3, e.stars | 0));
  S.set(`bonus/${cls}/${num}/board/${pid}_${t.toString(36)}`, { at: t, lid: L.id, no: L.no, n, role: e.role ?? 'c', win: !!e.win, clear: !!e.win, sec: e.sec, right: e.right, total: e.total, stars, merit, atb: true });
  if (stars > was) S.set(`bonus/${cls}/${num}/boardStar/${L.id}`, stars);
  return { gem: sum(e.gem), merit: addMerit(S, cls, num, merit, t), newStars: Math.max(0, stars - was) };
}
