// ♻ 지난 칸 되살리기 (📜 2026-11-15 선생님 「되살리기」 · 머리 B) — 정식 보관 서버 rooms(수업 방)의 칸별 제출로 학생 줄을 다시 채움
//   같은 차시를 다시 열 때 학생 줄이 덮여 앞 수업에서 낸 칸이 - · n 로 남은 것을 되살림
//   규칙 = 칸 합치기 A 와 같음: 이미 o · f · x 인 칸은 안 바꿈 · - · n 인 칸만 방 제출 · 정답으로 다시 계산한 o · f · x 로 채움 · 형성평가도 문항마다
//   💎 · EXP · 개념 칸(conc) · 오개념은 안 건드림(칸 상태 · 형성평가 점수만) · 쓰기는 따로(이 파일은 계산만)
import type { LessonPack, Room } from '../model/types';
import { bossState, chainRecord, isChain, mastery, plainRecord } from '../raid/raid';
import type { St } from './records';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
/** 서버가 빈칸 있는 배열을 {0:…,2:…} 로 돌려준 것 → 배열 (깊이까지) */
const deArr = (v: unknown): unknown => (Array.isArray(v) ? v.map(deArr) : isObj(v) && Object.keys(v).length && Object.keys(v).every((k) => /^\d+$/.test(k)) ? Object.keys(v).sort((a, b) => +a - +b).map((k) => deArr(v[k])) : v);
export let skipped = 0;
const tryJson = (x: string): unknown => { try { return JSON.parse(x); } catch { return x; } };
/** 정식 방 꼴 → 이 앱 방 꼴 (subs = 시도마다 JSON 글 → 배열 · 서버 배열 → {시도: 답}) */
export function normRoom(R0: Obj): Room {
  const R = JSON.parse(JSON.stringify(R0)) as Obj & { subs?: Record<string, Record<string, unknown>> };
  for (const m of Object.values(R.subs || {})) for (const u of Object.keys(m || {})) {
    const v = m[u], arr = Array.isArray(v) ? v : isObj(v) ? Object.values(v) : [];
    m[u] = Object.fromEntries(arr.map((x, i) => [i, deArr(typeof x === 'string' ? tryJson(x) : x)]).filter(([, x]) => x != null));
  }
  // 👑 형성평가 답 = bossTry[학생][문항][시도] (배열 답이 JSON 글로 저장된 것 되돌림)
  const bt = (R as Obj).bossTry as Record<string, unknown> | undefined;
  const pj = (x: unknown) => deArr(typeof x === 'string' && /^[[{]/.test(x) ? tryJson(x) : x);
  for (const u of Object.keys(bt || {})) { const byI = bt![u]; const ii = Array.isArray(byI) ? Object.fromEntries(byI.map((v, i) => [i, v])) : isObj(byI) ? byI : {}; bt![u] = Object.fromEntries(Object.entries(ii).filter(([, v]) => v != null).map(([i, byA]) => [i, Object.fromEntries(Object.entries(Array.isArray(byA) ? Object.fromEntries(byA.map((v, k) => [k, v])) : isObj(byA) ? byA : {}).filter(([, v]) => v != null).map(([a, g]) => [a, pj(g)]))])); }
  return R as unknown as Room;
}
/** 한 방에서 한 학생이 낸 칸 → 칸 상태 (낸 칸만) */
export function roomCells(L: LessonPack, R: Room, uid: string): { mons: Record<string, St>; bossM?: string } {
  const mons: Record<string, St> = {};
  for (const s of L.steps) {
    if (s.kind !== 'monster' || !L.monsters[s.id]) continue;
    try {
      if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid); if (r.submitted) mons[s.id] = r.done ? (r.wrong === 0 ? 'o' : 'f') : 'x'; continue; }
      const r = plainRecord(L, R, s.id, uid);
      if (!r.submitted) continue;
      const first = r.tries[0];
      mons[s.id] = first && first.correct === first.total ? 'o' : r.best >= r.total ? 'f' : 'x';
    } catch { skipped++; } // 읽을 수 없는 옛 답 꼴 = 그 칸만 건너뜀 (지금 상태 그대로)
  }
  let bossM: string | undefined;
  if (L.boss) try { const bs = bossState(L, R, uid); if (bs.some((x) => x.n > 0)) { const mast = mastery(L, R, uid); bossM = mast.map((ok, i) => (ok ? 'o' : bs[i]?.n ? 'x' : '-')).join(''); } } catch { skipped++; }
  return { mons, ...(bossM ? { bossM } : {}) };
}
const did = (v: unknown) => v === 'o' || v === 'f' || v === 'x';
export interface Patch { path: string; cells: string[]; mons: Record<string, St>; bossM?: string; boss?: number }
/** 학생 줄(rec) + 방 칸들 → 바뀌는 칸 (없으면 null) */
export function patchOf(rec: Obj | null, found: { mons: Record<string, St>; bossM?: string }[], bossN?: number): Omit<Patch, 'path'> | null {
  const cur = (isObj(rec?.mons) ? rec!.mons : {}) as Record<string, St>, mons = { ...cur }, cells: string[] = [];
  for (const f of found) for (const [k, v] of Object.entries(f.mons)) if (!did(mons[k]) && did(v)) { mons[k] = v; cells.push(k); }
  let bossM = String(rec?.bossM ?? ''), changedBoss = false;
  for (const f of found) if (f.bossM) {
    const b = bossM || '-'.repeat(f.bossM.length);
    const nb = f.bossM.split('').map((c, i) => (b[i] === 'o' || b[i] === 'x' ? b[i]! : c === 'o' || c === 'x' ? c : b[i] ?? c)).join('');
    if (nb !== bossM) { bossM = nb; changedBoss = true; }
  }
  if (changedBoss) cells.push('boss');
  if (!cells.length) return null;
  const out: Omit<Patch, 'path'> = { cells: [...new Set(cells)], mons };
  if (changedBoss) { out.bossM = bossM; out.boss = bossM.slice(0, bossN || bossM.length).split('').filter((c) => c === 'o').length; }
  return out;
}
