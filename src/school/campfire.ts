// 🔥 모닥불 친구 (📜 2026-11-20 선생님 「학생들이 모닥불에 친구들이 놀러 왔으면 좋겠대」 · 「A + B 작게」 · 「전부 · 규칙 게시할게」)
//   ① 그루터기 3자리 = 같은 반 친구 용사 (고르는 순서 = 최근 같이 게시판 던전 한 친구 → 오늘 캠프에 온 친구 → 그 밖 같은 반 · 들어올 때마다 조금씩 바뀜)
//   ② 친구 누름 = 작은 카드(이름 · 칭호 · 스킬 · 「오늘: …」) + 인사 이모지 4개(👋 🔥 👍 ✨) · 친구 한 명에게 하루 1번 · 글 없음
//   ③ 받은 인사 = 다음 캠프 들어올 때 「🔥 ○○가 놀러 왔어요! 👋」(여러 명 = 「○○ 외 n명」) 한 번
//   서버 칸 (규칙 = firebase/database.rules.json · 선생님 게시)
//     campfire/{반}/{번호} = { day, enh, today } — 본인만 씀 · 로그인한 사람 읽음 (게시 전 = 쓰기 실패해도 그냥 둠 · 오라 · 오늘 한 줄 없음)
//     campHi/{반}/{받는}/{보낸} = { e, day } — 보낸 학생 본인만 · 하루 1번 · 받는 학생 · 교사만 읽음
import type { Store } from '../model/types';

export const CF = 'campfire', HI = 'campHi';
export const HI_EMOJI = ['👋', '🔥', '👍', '✨'] as const;
export const SEATS = 3;
type O = Record<string, unknown>;
const isO = (v: unknown): v is O => !!v && typeof v === 'object' && !Array.isArray(v);
export const kday = (t: number) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

export interface Cand { num: number; hero: number; title: string; fx: string; mate?: number; day?: string }
/** 고르기: 최근 같이 한 친구(mate 큰 순) → 오늘 온 친구 → 그 밖 · 같은 묶음 안 = seed 로 섞음(들어올 때마다 조금씩 바뀜) */
export function pickFriends(cands: Cand[], me: number, today: string, seed: number, n = SEATS): Cand[] {
  const rnd = (k: number) => { const x = Math.sin((k + 1) * 9301 + seed * 49297) * 233280; return x - Math.floor(x); };
  const pool = cands.filter((c) => c.num !== me && c.hero != null && !Number.isNaN(c.hero));
  const tier = (c: Cand) => (c.mate ? 0 : c.day === today ? 1 : 2);
  return pool.sort((a, b) => tier(a) - tier(b) || (tier(a) === 0 ? (b.mate ?? 0) - (a.mate ?? 0) : 0) || rnd(a.num) - rnd(b.num)).slice(0, n);
}
/** 최근 같이 게시판 던전 한 친구 = 게시판 글(mem)에 나와 같이 있던 같은 반 번호 → 마지막 시각 */
export function matesOf(posts: Record<string, unknown> | null, myUid: string, cls: string): Record<number, number> {
  const out: Record<number, number> = {};
  for (const p of Object.values(posts || {})) {
    if (!isO(p) || !isO(p.mem) || !(myUid in p.mem)) continue;
    for (const [u, m] of Object.entries(p.mem)) if (u !== myUid && isO(m) && m.cls === cls && Number(m.num)) out[Number(m.num)] = Math.max(out[Number(m.num)] ?? 0, Number(p.at) || 0);
  }
  return out;
}
/** 「오늘: 성채 2방 · 허수아비 1」 = 오늘 처음 처치한 칸 수 (bonus 기록 at · clear) */
export function todayLine(bonus: unknown, today: string): string {
  let castle = 0, review = 0;
  if (isO(bonus)) for (const [lid, mons] of Object.entries(bonus)) {
    if (!isO(mons) || lid === 'board' || lid === 'egg' || lid === 'review') continue;
    for (const m of Object.values(mons)) if (isO(m) && m.clear && Number(m.at) && kday(Number(m.at)) === today) { if (lid.startsWith('eval-')) castle++; else review++; }
  }
  return [castle ? `성채 ${castle}방` : '', review ? `허수아비 ${review}` : ''].filter(Boolean).join(' · ');
}
type TS = Store & { trySet?: (p: string, v: unknown) => Promise<boolean>; fetch?: <T>(p: string) => Promise<T | null> };
const put = (S: TS, p: string, v: unknown) => (S.trySet ? S.trySet(p, v).catch(() => false) : Promise.resolve((S.set(p, v), true)));
/** 내 칸 갱신 (게시 전 = 실패해도 조용히) */
export const writeMine = (S: TS, cls: string, num: number, v: { day: string; enh: number; today: string }) => put(S, `${CF}/${cls}/${num}`, v);
/** 인사 보내기 (하루 1번 · 이미 보냈으면 false) */
export async function sendHi(S: TS, cls: string, to: number, from: number, e: string, day: string): Promise<boolean> {
  if (!HI_EMOJI.includes(e as (typeof HI_EMOJI)[number]) || to === from) return false;
  return put(S, `${HI}/${cls}/${to}/${from}`, { e, day });
}
/** 받은 인사 중 아직 안 본 것 (seen = 이 기기에 마지막으로 본 날짜+보낸 번호 목록) */
export function freshHi(box: unknown, seen: string[]): { from: number; e: string; day: string }[] {
  if (!isO(box)) return [];
  return Object.entries(box).filter(([, v]) => isO(v) && typeof v.e === 'string' && typeof v.day === 'string').map(([k, v]) => ({ from: Number(k), e: String((v as O).e), day: String((v as O).day) })).filter((h) => !seen.includes(`${h.day}|${h.from}`)).sort((a, b) => (a.day < b.day ? 1 : -1));
}
/** 띠 글: 「🔥 ○○가 놀러 왔어요! 👋」 · 여러 명 = 「○○ 외 n명」 */
export function hiLine(list: { name: string; e: string }[]): string {
  if (!list.length) return '';
  const a = list[0]!; return `🔥 ${a.name}${list.length > 1 ? ` 외 ${list.length - 1}명이` : '가'} 놀러 왔어요! ${a.e}`;
}
/** 🧪 체험판 · 이 기기 = 가상 친구 */
export const FAKE: Cand[] = [{ num: 91, hero: 8, title: 'none', fx: '' }, { num: 92, hero: 31, title: 'none', fx: '' }, { num: 93, hero: 5, title: 'none', fx: '' }];
export const FAKE_NAME: Record<number, string> = { 91: '모험가 A', 92: '모험가 B', 93: '모험가 C' };
