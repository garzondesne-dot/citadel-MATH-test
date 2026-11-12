// 📚 수업 기록 = 정식 꼴 (#163 ③ · 정식 js/raid/result.js summary · note.js) — records/{반}/{번호}/{차시}
//   mons = { 몬스터: o(첫 시도 다 맞힘) · f(고쳐서 다 맞힘) · x(냈지만 못 다 맞힘) · -(남들은 냈는데 안 냄) · n(아무도 안 함) }
//   bossM = 형성평가 문항마다 'o · x · - · n' 한 줄 · boss = 맞힌 문항 수(체력 문항까지) · bossN = 체력 문항 수 · won = 보스 처치
//   더한 칸(정식에 없음 · 정식 앱은 무시): right · total = 맞힌 소문제 / 전체 (📋 게시판 수호자 기준) · loot · firstXp 는 있던 값 그대로
import type { LessonPack, Room } from '../model/types';
import { activeIds, bossHp, bossState, chainRecord, isChain, mastery, plainRecord, resultOf } from '../raid/raid';

export type St = 'o' | 'f' | 'x' | '-' | 'n';
export interface RecRow { at: number; code: string; no: number; mons: Record<string, St>; boss?: number; bossN?: number; bossM?: string; won?: boolean; miss: string[]; perfects: number; right: number; total: number; loot?: unknown; firstXp?: number }

export function summaryOf(L: LessonPack, R: Room, uid: string, code: string, now: number, prev?: Partial<RecRow> | null): RecRow {
  const others = activeIds(R, now).filter((u) => u !== uid);
  const mons: Record<string, St> = {};
  let perfects = 0;
  for (const s of L.steps) {
    if (s.kind !== 'monster' || s.later || !L.monsters[s.id]) continue;
    let st: St;
    if (isChain(L, R, s.id)) {
      const r = chainRecord(L, R, s.id, uid);
      st = r.submitted ? (r.done ? (r.wrong === 0 ? 'o' : 'f') : 'x') : others.some((u) => chainRecord(L, R, s.id, u).submitted) ? '-' : 'n';
    } else {
      const r = plainRecord(L, R, s.id, uid), first = r.tries[0];
      st = r.submitted ? (first && first.correct === first.total ? 'o' : r.best >= r.total ? 'f' : 'x') : others.some((u) => plainRecord(L, R, s.id, u).submitted) ? '-' : 'n';
    }
    if (st === 'o') perfects++;
    mons[s.id] = st;
  }
  const res = resultOf(L, R, uid);
  const out: RecRow = { at: now, code: String(code), no: L.no, mons, miss: Object.entries(mons).filter(([, v]) => v === 'x' || v === '-').map(([k]) => k), perfects, right: res.right, total: res.total };
  if (L.boss) {
    const mast = mastery(L, R, uid), bs = bossState(L, R, uid), any = others.some((u) => bossState(L, R, u).some((x) => x.n > 0)), hpN = L.boss.hpItems ?? L.boss.items;
    out.boss = mast.slice(0, hpN).filter(Boolean).length; out.bossN = hpN;
    out.bossM = mast.map((ok, i) => (ok ? 'o' : bs[i]?.n ? 'x' : any ? '-' : 'n')).join('');
    out.won = !!bossHp(L, R, now).won;
  }
  if (prev?.loot) out.loot = prev.loot;
  if (prev?.firstXp) out.firstXp = prev.firstXp;
  return out;
}

/** 읽기 (정식 꼴 · 옛 v1.0 꼴 둘 다): 첫 시도 다 맞힌 몬스터 수 · 보스 처치 · 형성평가 만점 · 맞힌 비율 */
type Any = { mons?: Record<string, unknown>; boss?: number | { ok?: number; items?: number; won?: boolean }; bossN?: number; won?: boolean; right?: number; total?: number };
export const perfectsOf = (r: Any) => Object.values(r.mons || {}).filter((m) => m === 'o' || (typeof m === 'object' && !!(m as { perfect?: boolean })?.perfect)).length;
export const wonOf = (r: Any) => !!r.won || (typeof r.boss === 'object' && !!r.boss?.won);
export const bossFullOf = (r: Any) => (typeof r.boss === 'number' ? !!r.bossN && r.boss === r.bossN : !!r.boss?.items && r.boss.ok === r.boss.items);
