// 🌟 나의 빛나는 순위 (📜 2026-11-25 머리 🔨): 나만 봄 · 가장 빛나는 갈래 하나만 띠로 · 등수 숫자 · 남의 순위 · 점수 · 낮은 순위는 안 보임
//   갈래 7 = 성장 · 끈기 · 꾸준함 · 탐험 · 정확 · 서술 · 끝까지 (도움 없음)
//   띠 사다리: ① 반 안 상위 30% 안 갈래(🔥 TOP 3 · ✨ 상위 10% · ✨ 상위 30%) → ② 📈 지난주의 나보다 ○○ +n → ③ 🙋 이번 달 끝까지 해낸 몬스터 n마리 (0 = 첫 몬스터를 기다리는 중)
//   ① 반 비교 = 학생 폰은 반 친구 기록을 못 읽음 → 계산 자리는 ❓ #빛나는-1 (손발 추천 A = 선생님 폰이 띠 글자만 bonus/{반}/{번호}/shine 에) · 그 칸이 없으면 ②부터
//   켜짐 = 2026-12-05 00:00 KST 부터 · 🧪 테스트 모드 = 날짜 무시 · 학교판 · 체험판 = 숨김
//   서버에 숫자를 쓰지 않음(폰에서 셈) · 대시보드 · 공개 칸 없음
import type { TitleData } from '../model/titles';
import { PACKS } from '../engine/packs';
import { mapLessons, starTotal, starsByNo, type BoardRec } from '../board/goals';
import { kstDate } from './examEvent';

export const SHINE_FROM = '2026-12-05';
export type ShineCat = 'grow' | 'grit' | 'steady' | 'explore' | 'exact' | 'write' | 'finish';
/** 갈래 순서 = 같은 등급일 때 앞의 것 */
export const SHINE_CATS: { k: ShineCat; name: string; ic: string; say: string }[] = [
  { k: 'grit', name: '끈기', ic: '🔥', say: '처음 틀려도 끝내 맞힌 몬스터 수' },
  { k: 'grow', name: '성장', ic: '🌱', say: '첫 주보다 첫 시도 정답률이 오른 만큼' },
  { k: 'steady', name: '꾸준함', ic: '📅', say: '허수아비 · 성채 복습한 날 수' },
  { k: 'finish', name: '끝까지', ic: '🏁', say: '형성평가까지 다 낸 수업 수' },
  { k: 'exact', name: '정확', ic: '🎯', say: '첫 시도에 다 맞힌 몬스터 수' },
  { k: 'write', name: '서술', ic: '✍', say: '숫자 바꾼 서술형 통과 수' },
  { k: 'explore', name: '탐험', ic: '🧭', say: '게시판 별 + 성채 방 처치 수' },
];
export const SHINE_BY = Object.fromEntries(SHINE_CATS.map((c) => [c.k, c])) as Record<ShineCat, (typeof SHINE_CATS)[number]>;
export type ShineScores = Record<ShineCat, number>;
export type ShineTier = 'top3' | 'p10' | 'p30';
/** 선생님 폰이 써 주는 칸 (❓ #빛나는-1 A) = 띠 글자 재료만 · 숫자 · 등수 없음 */
export interface ShineMark { cat: ShineCat; tier: ShineTier; at: number }

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const DAY = 86400e3, WEEK = 7 * DAY;
const NOT_ROOM = new Set(['board', 'review', 'mock', 'ach', 'egg', 'shine']);

interface Row { at: number; mons: string[]; bossM: string; perfect: number }
function rowsOf(d: TitleData): Row[] {
  const out: Row[] = [];
  for (const r of Object.values(d.records || {})) {
    if (!isObj(r)) continue;
    const at = Number(r.at) || 0, ms = Object.values(isObj(r.mons) ? r.mons : {});
    out.push({ at, mons: ms.filter((m): m is string => typeof m === 'string'), bossM: typeof r.bossM === 'string' ? r.bossM : '', perfect: ms.filter((m) => m === 'o' || (isObj(m) && !!m.perfect)).length });
  }
  return out;
}
const bon = (d: TitleData) => (isObj(d.bonus) ? (d.bonus as Record<string, unknown>) : {});
/** 🎯 허수아비 · 🏰 성채 방 기록 (방마다 마지막 판 시각 at) */
const roomRecs = (d: TitleData) => Object.entries(bon(d)).filter(([k, v]) => !NOT_ROOM.has(k) && isObj(v)).flatMap(([, v]) => Object.values(v as Obj).filter(isObj));
const castleRecs = (d: TitleData) => Object.entries(bon(d)).filter(([k, v]) => k.startsWith('eval-') && isObj(v)).flatMap(([, v]) => Object.values(v as Obj).filter(isObj));
const finished = (r: Row) => !!r.bossM && !r.bossM.includes('-') && /[ox]/.test(r.bossM);
const weekOf = (t: number) => { const d = Math.floor((t + 9 * 3600e3) / DAY); return Math.floor((d + 3) / 7); }; // 월요일 시작 (1970-01-01 = 목)
const firstRate = (rs: Row[]) => { let o = 0, n = 0; for (const r of rs) for (const m of r.mons) if (m === 'o' || m === 'f' || m === 'x') { n++; if (m === 'o') o++; } return n ? o / n : null; };

/** 7갈래 내 점수 (폰에서 셈 · 저장 안 함) */
export function shineScores(d: TitleData, gifts?: Record<string, unknown> | null): ShineScores {
  const rows = rowsOf(d).filter((r) => r.at > 0);
  const weeks = [...new Set(rows.map((r) => weekOf(r.at)))].sort((a, b) => a - b);
  let grow = 0;
  if (weeks.length >= 2) {
    const a = firstRate(rows.filter((r) => weekOf(r.at) === weeks[0])), b = firstRate(rows.filter((r) => weekOf(r.at) === weeks[weeks.length - 1]));
    if (a != null && b != null) grow = Math.max(0, Math.round((b - a) * 100));
  }
  const days = new Set(roomRecs(d).map((m) => Number(m.at) || 0).filter((t) => t > 0).map(kstDate));
  const stars = starTotal(starsByNo((bon(d).board as Record<string, BoardRec> | undefined) || {}), mapLessons(PACKS));
  const all = rowsOf(d);
  return {
    grow,
    grit: all.reduce((a, r) => a + r.mons.filter((m) => m === 'f').length, 0),
    steady: days.size,
    explore: stars + castleRecs(d).filter((m) => m.clear).length,
    exact: all.reduce((a, r) => a + r.perfect, 0),
    write: Object.keys(gifts || {}).filter((k) => /^ult_.+_v$/.test(k)).length + castleRecs(d).filter((m) => m.ph2).length,
    finish: all.filter(finished).length,
  };
}

/** ② 📈 지난주(지난 7일 앞 7일)보다 이번 주(지난 7일) 가장 많이 는 갈래 · 시각이 있는 갈래만 */
export function weekGain(d: TitleData, now: number): { cat: ShineCat; n: number } | null {
  const rows = rowsOf(d), inW = (t: number, k: number) => t > now - (k + 1) * WEEK && t <= now - k * WEEK;
  const cnt = (k: number): Partial<ShineScores> => {
    const rs = rows.filter((r) => inW(r.at, k));
    return {
      grit: rs.reduce((a, r) => a + r.mons.filter((m) => m === 'f').length, 0),
      finish: rs.filter(finished).length,
      exact: rs.reduce((a, r) => a + r.perfect, 0),
      steady: new Set(roomRecs(d).map((m) => Number(m.at) || 0).filter((t) => inW(t, k)).map(kstDate)).size,
    };
  };
  const a = cnt(0), b = cnt(1);
  let best: { cat: ShineCat; n: number } | null = null;
  for (const c of SHINE_CATS) { const x = a[c.k], y = b[c.k]; if (x == null || y == null) continue; const n = x - y; if (n > 0 && (!best || n > best.n)) best = { cat: c.k, n }; }
  return best;
}
/** ③ 🙋 이번 달(KST) 끝까지 해낸 몬스터 (첫 시도 · 고쳐서 다 맞힘) */
export const monthDone = (d: TitleData, now: number) => { const m = kstDate(now).slice(0, 7); return rowsOf(d).filter((r) => r.at > 0 && kstDate(r.at).slice(0, 7) === m).reduce((a, r) => a + r.mons.filter((x) => x === 'o' || x === 'f').length, 0); };

const markOf = (v: unknown): ShineMark | null => (isObj(v) && SHINE_BY[v.cat as ShineCat] && ['top3', 'p10', 'p30'].includes(String(v.tier)) ? { cat: v.cat as ShineCat, tier: v.tier as ShineTier, at: Number(v.at) || 0 } : null);
const TIER_TXT: Record<ShineTier, string> = { top3: 'TOP 3', p10: '상위 10%', p30: '상위 30%' };

/** 띠 한 줄 + 누르면 보이는 설명 한 줄 */
export function shineBand(d: TitleData, now: number): { text: string; say: string; step: 1 | 2 | 3 } {
  const mk = markOf(bon(d).shine);
  if (mk) { const c = SHINE_BY[mk.cat]; return { text: `${mk.tier === 'top3' ? '🔥' : '✨'} 우리 반 ${c.name} ${TIER_TXT[mk.tier]}`, say: `${c.ic} ${c.name} = ${c.say}`, step: 1 }; }
  const g = weekGain(d, now);
  if (g) { const c = SHINE_BY[g.cat]; return { text: `📈 지난주의 나보다 ${c.name} +${g.n}`, say: `${c.ic} ${c.name} = ${c.say}`, step: 2 }; }
  const n = monthDone(d, now);
  return { text: n ? `🙋 이번 달 끝까지 해낸 몬스터 ${n}마리` : '🙋 첫 몬스터를 기다리는 중', say: '🙋 이번 달 끝까지 다 맞힌 몬스터 수', step: 3 };
}
/** 켜짐 = 12/5 00:00 KST 부터 · 🧪 = 날짜 무시 */
export const shineOn = (now: number, test: boolean) => test || kstDate(now) >= SHINE_FROM;

/** (A 안 · 선생님 폰) 반 학생 점수 → 학생마다 가장 빛나는 갈래 하나 (상위 30% 안 · 점수 0 은 빼고) · 등급 = 나보다 높은 친구 수로 */
export function classMarks(all: Record<string, ShineScores>, now: number): Record<string, ShineMark> {
  const ids = Object.keys(all), n = ids.length, out: Record<string, ShineMark> = {};
  if (n < 3) return out;
  const rank: Record<ShineTier, number> = { top3: 0, p10: 1, p30: 2 };
  for (const id of ids) {
    let best: ShineMark | null = null;
    for (const c of SHINE_CATS) {
      const me = all[id]![c.k]; if (!(me > 0)) continue;
      const above = ids.filter((o) => all[o]![c.k] > me).length;
      const tier: ShineTier | null = above < 3 ? 'top3' : above / n < 0.1 ? 'p10' : above / n < 0.3 ? 'p30' : null;
      if (tier && (!best || rank[tier] < rank[best.tier])) best = { cat: c.k, tier, at: now };
    }
    if (best) out[id] = best;
  }
  return out;
}
