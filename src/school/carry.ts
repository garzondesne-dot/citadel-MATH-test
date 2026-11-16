// 📦 B 지난 차시에서 넘어온 몬스터 = 다음 수업에 다시 등장 (📜 2026-11-16 머리 🔨 · 🎯 A 복습으로 보내기의 선택 칸)
//   다음 수업을 열 때 그 반의 지난 수업에서 🎯 보낸 몬스터(👑 형성평가 빼고 · 👑 는 허수아비 「⭐ 꼭 풀기」 그대로)
//   → 「도입 뒤 먼저 / 쉼터 뒤(= 몬스터 절반 뒤) / 안 함」 · 방 meta/carry = { from, ids, at }
//   단계 id = cv_{원래 차시}_{몬스터} · 그림 · 기록 = 원래 차시(prep 그림 · records/{반}/{번호}/{원래 차시}/mons/{몬스터})
//   수업에서 풀면(o · f) 원래 차시 기록의 s 를 바꿔서 허수아비 「📚 수업에서 넘어온 문제」에서 빠짐
import type { LessonPack, MonsterPack, Room, Step, Store } from '../model/types';
import { lastClass, lastTest } from './school';
import { lessonCounts, T0 } from './ltime';

export type CarryAt = 'intro' | 'mid';
export type Carry = { from: string; ids: string[]; at: CarryAt };
export type CarryOffer = { from: string; no: number; ids: string[]; names: string[]; code: string };
export const CARRY_AT: Record<CarryAt | 'none', string> = { intro: '도입 뒤 먼저', mid: '쉼터 뒤', none: '안 함' };
export const carryKey = (from: string, mid: string) => `cv_${from.replace(/[^A-Za-z0-9-]/g, '_')}_${mid}`;
const nameOf = (L: LessonPack, id: string) => { const s = L.steps.find((x) => x.id === id); return s ? (s.title.split(' · ')[0] ?? s.title) : id; };

/** 그 반 지난 수업(실제 · 🧪 테스트 중 나중 것)에서 보낸 몬스터 · 고른 차시와 같으면 없음 */
export function carryOffer(S: Store, cls: string, L: LessonPack, packs: LessonPack[]): CarryOffer | null {
  const cand = [lastClass(S, cls), lastTest(S, cls)].filter(Boolean).sort((a, b) => b!.at - a!.at);
  for (const lc of cand) {
    if (!lc || lc.lesson === L.id) continue;
    const P = packs.find((p) => p.id === lc.lesson), R = S.get<Room>(`rooms/${lc.code}`);
    const sent = (R?.state as { sent?: Record<string, number> } | undefined)?.sent || {};
    const ids = P ? P.steps.filter((s) => s.kind === 'monster' && !s.later && P.monsters[s.id] && sent[s.id]).map((s) => s.id) : [];
    if (P && ids.length) return { from: P.id, no: P.no, ids, names: ids.map((id) => nameOf(P, id)), code: lc.code };
    return null; // 가장 최근 수업만 봄 (그 전 것은 이미 허수아비)
  }
  return null;
}
/** ⏱ 넘어온 몬스터 분 = 몬스터 하나 T0.mon + 소문제 · 소레이드 단계 */
export function carryMin(P: LessonPack, ids: string[]): number {
  const c = lessonCounts(P);
  return Math.round(c.mons.filter((m) => ids.includes(m.id)).reduce((a, m) => a + T0.mon + m.n * (m.chain ? T0.chainStage : T0.item), 0) * 10) / 10;
}

const memo = new Map<string, LessonPack>();
/** 수업 팩 + 넘어온 몬스터 (단계 · 몬스터 · carryOf) — 같은 입력 = 같은 객체 */
export function withCarry(L: LessonPack, c: Carry | null | undefined, packs: LessonPack[]): LessonPack {
  if (!c || !c.ids?.length) return L;
  const P = packs.find((p) => p.id === c.from); if (!P) return L;
  const k = `${L.id}|${c.from}|${c.ids.join(',')}|${c.at}`, hit = memo.get(k); if (hit) return hit;
  const monsters: Record<string, MonsterPack> = { ...L.monsters }, carryOf: Record<string, { from: string; mid: string }> = {}, add: Step[] = [];
  for (const mid of c.ids) {
    const m = P.monsters[mid], s0 = P.steps.find((s) => s.id === mid); if (!m || !s0) continue;
    const id = carryKey(c.from, mid), [h, ...rest] = s0.title.split(' · ');
    monsters[id] = m; carryOf[id] = { from: c.from, mid };
    add.push({ kind: 'monster', id, title: [`⏪ ${h}`, `${P.no}차시`, ...rest].join(' · '), ...(s0.min ? { min: s0.min } : {}) });
  }
  if (!add.length) return L;
  const st = [...L.steps];
  let at: number;
  if (c.at === 'intro') { at = 0; while (at < st.length && st[at]!.kind === 'intro') at++; }
  else { const mi = st.map((s, i) => (s.kind === 'monster' && !s.later ? i : -1)).filter((i) => i >= 0); at = mi.length ? mi[Math.ceil(mi.length / 2) - 1]! + 1 : st.findIndex((s) => s.kind === 'boss'); if (at < 0) at = st.length; }
  st.splice(at, 0, ...add);
  const out: LessonPack = { ...L, steps: st, monsters, carryOf };
  memo.set(k, out); return out;
}
export const carryFrom = (L: LessonPack, id: string) => L.carryOf?.[id] ?? null;
export const isCarry = (L: LessonPack, id: string) => !!L.carryOf?.[id];
/** 방에서 읽어 입힘 (App · 교사 · TV 같은 길) */
export const carryOfRoom = (S: Store, code: string) => (code ? S.get<Carry>(`rooms/${code}/meta/carry`) : null);

/** 수업 끝 기록: 넘어온 몬스터를 풀었으면(o · f) 원래 차시 기록 칸을 바꿈 → 허수아비에서 빠짐 · 못 풀었으면 그대로(s) */
export function carryRecords(L: LessonPack, mons: Record<string, string>, base: string, get: <T>(p: string) => T | null, set: (p: string, v: unknown) => void) {
  for (const [id, st] of Object.entries(mons)) {
    const c = carryFrom(L, id); if (!c || (st !== 'o' && st !== 'f')) continue;
    const p = `${base}/${c.from}/mons/${c.mid}`, prev = get<string>(p);
    if (prev === 'o' || prev === 'f' || prev === 'p') continue;
    set(p, st);
  }
}
