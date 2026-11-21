// 📡 #48 게시판 던전(ATB) ↔ 베타 게시판 (docs/board-atb/SERVER-v1.md 1 · 2 · 3절) — 손발 #1 몫: 출발 메타 · 학생 기록 · ⭐ 정복 지도 · 반 공적
//   전투 네트워크(방장 엔진 · snap · act · hb · 봇 이어받기) · 결과 계산 = 손발 #2 (AtbNet · atbResultFor)
import type { LessonPack, Store } from '../model/types';
import { HEROES } from '../model/hero';
import { isBeta } from '../school/school';
import { MAX, POSTS, membersOf, type Post } from './team';
import { addMerit } from './war';
import type { AtbEnd, Meta as AtbMeta, Slot as AtbSlot } from './atb/net';

export const ATB = 'atb';
export type { AtbEnd, AtbMeta, AtbSlot };
/** 🧙 판에 들고 가는 내 용사 (모집 · 합류 때 글 mem/{uid}/g 에 같이 씀 · 손발 #2 net.ts HumanSlot) */
export interface Grow { h: number; lv: number; enh: number; tier: number; fx?: string; awk?: boolean }
const sum = (o: object | undefined) => Object.values((o || {}) as Record<string, number>).reduce((a, x) => a + (Number(x) || 0), 0);
/** 서버 판 = 모두 새 전투(ATB) · 🧪 테스트 반(1-6) · 교사 계정도 새 전투 — 기록 · ⭐ · 공적 · 💎 은 saveAtbResult · 화면 쪽에서 막음 (📜 2026-11-21 #65-1) · 이 기기 연습방(memory)만 옛 길 */
export const atbOnline = (S: Store, _p?: Post) => S.kind !== 'memory';
/** 출발 (방장 1번): meta → 글 play · code 'A'+pid · 빈자리 = 봇 (4칸 고정 · 봇 용사 = 아직 안 고른 용사 차례로) */
export function startAtb(S: Store, L: LessonPack, p: Post, seed = Math.floor(Math.random() * 2 ** 31)): AtbMeta {
  const ms = membersOf(p), used = new Set(ms.map((m) => m.hero));
  const free = HEROES.map((h) => h.id).filter((h) => !used.has(h));
  const slots: AtbSlot[] = ms.map((m) => { const g = (m as { g?: Grow }).g; return { uid: m.uid, cls: m.cls, num: m.num, hero: g?.h ?? m.hero, lv: g?.lv ?? 1, enh: g?.enh ?? 0, tier: g?.tier ?? 1, ...(g?.fx ? { fx: g.fx } : {}), ...(g?.awk ? { awk: true } : {}), nick: m.nick }; });
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
export function saveAtbResult(S: Store, ctx: { cls: string; num: number; L: LessonPack; pid: string; n: number; role?: 'g' | 'c' }, e: AtbEnd): { gem: number; merit: number; newStars: number } {
  const { cls, num, L, pid, n } = ctx, t = S.now();
  if (S.kind === 'memory' || !cls || !num || isBeta(S, cls)) return { gem: sum(e.gem), merit: 0, newStars: 0 };
  const merit = sum(e.merit), was = prevStars(S, cls, num, L.id), stars = Math.max(0, Math.min(3, e.stars | 0));
  S.set(`bonus/${cls}/${num}/board/${pid}_${t.toString(36)}`, { at: t, lid: L.id, no: L.no, n, role: ctx.role ?? 'c', job: e.role, win: !!e.win, clear: !!e.win, sec: e.sec, right: e.right, total: e.total, first: e.first ?? 0, stars, merit, ...((e as { acts?: object }).acts ? { acts: (e as { acts?: object }).acts } : {}), atb: true }); // 📊 #56 대시보드 = 첫 시도 · 활약(막기 · 구조 · 끊기 · 브레이크)
  if (stars > was) S.set(`bonus/${cls}/${num}/boardStar/${L.id}`, stars);
  return { gem: sum(e.gem), merit: addMerit(S, cls, num, merit, t), newStars: Math.max(0, stars - was) };
}
