// 🚩 💎 급증 표시 (📜 DECISIONS 「💎 자기 지갑 조작 = A + 📊 급증 표시」 · 2026-11-15 머리 「기준 = A」)
//   학생 폰이 자기 💎 칸을 쓸 수 있으므로(규칙 A) → 교사 화면이 볼 때마다 학생 💎 를 사진 찍어 두고(school/gemSeen) 지난 사진과 비교
//   설명되는 늘어남 = 하루 한도 안에서 받은 💎(gem.day 의 늘어난 합) + 한도 밖 보상(선생님 선물 · 쉼터 · 우편 · 연속 참여 · 레벨 · 업적 log) + 여유 TOL(모루 첫 카드 · 되돌려 받기 같은 기록 없는 작은 몫)
//   🚩 = 설명 안 되는 늘어남 > 0 · 또는 어느 날 한도 안 💎 가 100 을 넘음 · 학생에게 안 보임 · 💎 를 빼지 않음 · 교사 「확인함」으로 끔
import type { Store } from '../model/types';
import { roster, uidOf } from './school';

export const TOL = 30;
export const CAP = 100;
export interface Snap { t: number; day: number; at: number }
export interface GemRow { total?: number; day?: Record<string, number>; log?: Record<string, { g?: number; at?: number } | null> }
export interface Flag { at: number; from: number; to: number; extra: number; why: string }
/** 한도 밖 보상 log 키 (정식 · 베타 · 한도 안 키 raid_ · perfect_ · bossperfect_ · petri_ 는 day 로 셈) */
const FREE = /^(teacher_|streak|lv\d|seal|quest_|punch_|combo_|card_|fg_|gift)/;
const daySum = (r: GemRow) => Object.values(r.day || {}).reduce((a, v) => a + (Number(v) || 0), 0);
export const snapOf = (r: GemRow, at: number): Snap => ({ t: Number(r.total) || 0, day: daySum(r), at });
/** 지난 사진 → 지금: 🚩 이면 Flag · 아니면 null
 *  gifts = gifts/{pid} (받은 것 got · 만든 시각 at) · 지난 사진 뒤에 생긴 받은 선물만 셈 */
export function check(prev: Snap, r: GemRow, gifts: Record<string, { g?: number; at?: number; got?: boolean } | null> | null, at: number): Flag | null {
  const now = snapOf(r, at), grew = now.t - prev.t;
  const overCap = Object.entries(r.day || {}).find(([, v]) => Number(v) > CAP);
  if (overCap) return { at, from: prev.t, to: now.t, extra: Number(overCap[1]) - CAP, why: `${overCap[0]} 하루 한도 ${CAP} 넘음` };
  if (grew <= TOL) return null;
  const free = Object.entries(r.log || {}).filter(([k, x]) => x && FREE.test(k) && Number(x.at) > prev.at).reduce((a, [, x]) => a + (Number(x!.g) || 0), 0)
    + Object.values(gifts || {}).filter((x) => x && x.got && Number(x.at) > prev.at - 864e5).reduce((a, x) => a + (Number(x!.g) || 0), 0);
  const extra = grew - Math.max(0, now.day - prev.day) - free - TOL;
  return extra > 0 ? { at, from: prev.t, to: now.t, extra, why: '게임 기록으로 설명되지 않게 늘어남' } : null;
}

// ── 교사 화면이 부름 (학생 탭 · 대시보드 · 서버일 때만) ──
export const SEEN = 'school/gemSeen', FLAG = 'school/gemFlag';
/** 그 반 학생마다 사진 비교 → 🚩 적기 · 사진 새로 (같은 값이면 안 씀) */
export function watchGems(S: Store, cls: string): void {
  if (S.kind !== 'server') return;
  const at = S.now();
  for (const p of roster(cls, S)) {
    const r = S.get<GemRow>(`gem/${cls}/${p.num}`); if (!r) continue;
    const prev = S.get<Snap>(`${SEEN}/${cls}/${p.num}`), now = snapOf(r, at);
    if (prev && !S.get(`${FLAG}/${cls}/${p.num}`)) { const f = check(prev, r, S.get(`gifts/${uidOf(cls, p.num)}`), at); if (f) S.set(`${FLAG}/${cls}/${p.num}`, f); }
    if (!prev || prev.t !== now.t || prev.day !== now.day) S.set(`${SEEN}/${cls}/${p.num}`, now);
  }
}
export const flagOf = (S: Store, cls: string, n: number) => S.get<Flag>(`${FLAG}/${cls}/${n}`);
/** 교사 「확인함」 = 🚩 끔 (💎 는 그대로) */
export const clearFlag = (S: Store, cls: string, n: number) => S.set(`${FLAG}/${cls}/${n}`, null);
