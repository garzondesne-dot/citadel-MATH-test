// 📚 수업 기록 = 정식 꼴 (#163 ③ · 정식 js/raid/result.js summary · note.js) — records/{반}/{번호}/{차시}
//   mons = { 몬스터: o(첫 시도 다 맞힘) · f(고쳐서 다 맞힘) · x(냈지만 못 다 맞힘) · -(남들은 냈는데 안 냄) · n(아무도 안 함) }
//   bossM = 형성평가 문항마다 'o · x · - · n' 한 줄 · boss = 맞힌 문항 수(체력 문항까지) · bossN = 체력 문항 수 · won = 보스 처치
//   더한 칸(정식에 없음 · 정식 앱은 무시): right · total = 맞힌 소문제 / 전체 (📋 게시판 수호자 기준) · loot · firstXp 는 있던 값 그대로
import { ccRecord } from './cc';
import { helpCount } from './help';
import { hgOf } from './hintGive';
import type { LessonPack, Room } from '../model/types';
import { activeIds, bossHp, bossLive, bossState, bossTries, chainRecord, isChain, itemsFor, mastery, plainRecord, resultOf } from '../raid/raid';
import { SUBJ } from '../engine/subject';

export type St = 'o' | 'f' | 'x' | '-' | 'n' | 's'; // s = 🎯 수업에서 복습으로 넘어온 문제 (📜 2026-11-16)
export interface RecRow { at: number; code: string; no: number; mons: Record<string, St>; conc?: Record<string, [number, number]>; names?: Record<string, string>; weak?: string[]; mis?: Record<string, [number, number]>; /** 🔁 고친 소문제 */ fixed?: number; misBase?: Record<string, [number, number]>; boss?: number; bossN?: number; bossM?: string; won?: boolean; miss: string[]; perfects: number; right: number; total: number; loot?: unknown; firstXp?: number; /** 🎯 형성평가를 복습으로 보냄 · 복습에서 풂(시각) */ bossSent?: boolean; bossReview?: number }

/** 몬스터 하나 기록 칸 (o 한 번에 · f 고침 · x 틀림 · - 안 냄(다른 친구는 냄) · n 아무도 안 냄) */
function monSt(L: LessonPack, R: Room, id: string, uid: string, others: string[]): St {
  if (isChain(L, R, id)) {
    const r = chainRecord(L, R, id, uid);
    return r.submitted ? (r.done ? (r.wrong === 0 ? 'o' : 'f') : 'x') : others.some((u) => chainRecord(L, R, id, u).submitted) ? '-' : 'n';
  }
  const r = plainRecord(L, R, id, uid), first = r.tries[0];
  return r.submitted ? (first && first.correct === first.total ? 'o' : r.best >= r.total ? 'f' : 'x') : others.some((u) => plainRecord(L, R, id, u).submitted) ? '-' : 'n';
}
/** 📦 넘어온 몬스터 칸 (단계 id → 칸) — 원래 차시 기록에 넣을 것 (school/carry.ts carryRecords) */
export function carryStates(L: LessonPack, R: Room, uid: string, now: number): Record<string, St> {
  const others = activeIds(R, now).filter((u) => u !== uid), out: Record<string, St> = {};
  for (const id of Object.keys(L.carryOf || {})) if (L.monsters[id]) out[id] = monSt(L, R, id, uid, others);
  return out;
}
export function summaryOf(L: LessonPack, R: Room, uid: string, code: string, now: number, prev?: Partial<RecRow> | null): RecRow {
  const others = activeIds(R, now).filter((u) => u !== uid);
  const mons: Record<string, St> = {}, sent = (R.state as { sent?: Record<string, number> }).sent || {};
  let perfects = 0;
  for (const s of L.steps) {
    if (s.kind !== 'monster' || s.later || !L.monsters[s.id] || L.carryOf?.[s.id]) continue; // 📦 넘어온 몬스터 = 원래 차시 기록 (carryStates)
    let st = monSt(L, R, s.id, uid, others);
    if (st === 'o') perfects++;
    if ((st === 'n' || st === '-') && sent[s.id]) st = 's'; // 🎯 안 푼 채 복습으로 보낸 몬스터
    mons[s.id] = st;
  }
  const cm = concOf(L, R, uid);
  const res = resultOf(L, R, uid);
  const out: RecRow = { at: now, code: String(code), no: L.no, mons, conc: cm.conc, names: cm.names, weak: cm.weak, ...(Object.keys(cm.mis).length ? { mis: cm.mis } : {}), ...(cm.fixed ? { fixed: cm.fixed } : {}), miss: Object.entries(mons).filter(([, v]) => v === 'x' || v === '-').map(([k]) => k), perfects, right: res.right, total: res.total };
  if (L.boss) {
    const mast = mastery(L, R, uid), bs = bossState(L, R, uid), any = others.some((u) => bossState(L, R, u).some((x) => x.n > 0)), hpN = L.boss.hpItems ?? L.boss.items, lv = bossLive(L, R), dr = new Set(lv.drop); // 👑 #27 빠진 문항 = 셈에서 뺌 · 칸 표시 k(허수아비로)
    out.boss = mast.slice(0, hpN).filter((ok, i) => ok && !dr.has(i)).length; out.bossN = lv.hp;
    out.bossM = mast.map((ok, i) => (dr.has(i) ? 'k' : ok ? 'o' : bs[i]?.n ? 'x' : sent.boss ? 's' : any ? '-' : 'n')).join('');
    if (lv.drop.length) (out as RecRow & { bossDrop?: number[] }).bossDrop = lv.drop;
    if (sent.boss && !mast.some(Boolean)) out.bossSent = true; // 🎯 👑 형성평가를 복습으로 보냄 → 허수아비 「⭐ 꼭 풀기」 · 대시보드 「수업 안 함 · 복습」
    out.won = !!bossHp(L, R, now).won;
  }
  { const cc = ccRecord(R, L.steps, uid); if (Object.keys(cc).length) (out as RecRow & { cc?: Record<string, number> }).cc = cc; } // ✔ 개념 체크 (참고 칸 · 성적 아님)
  { const h = helpCount(R, uid); if (h.hints) Object.assign(out, { hints: h.hints, help: h.help }); }
  { const hg = hgOf(R, uid); if (hg) Object.assign(out, { hg }); } // 💡 친구에게 준 힌트 수 (📜 2026-11-17 #23 · 옛 정식 hg · 대시보드 「💡 힌트 준」) // 💡 도움 연 칸 수 · 단계별 (📜 2026-11-17 미래교육상 ① · 옛 정식 hints 칸 · 성적 아님 · 대시보드 「💡 힌트」 · 엑셀 「그림 힌트(소문제)」)
  if (prev?.loot) out.loot = prev.loot;
  if (prev?.firstXp) out.firstXp = prev.firstXp;
  return mergeRow(prev, out);
}
/** 📌 개념별 첫 시도 · 🔎 오개념 (정식 js/raid/result.js compute 그대로 · 📜 2026-11-15)
 *  개념 칸 = 몬스터 바로 앞 개념 단계(처음 앞 = review) · L.split[몬스터] = 소문제마다 개념 · 형성평가 = boss.tags[문항] 없으면 'boss'
 *  안 낸 몬스터 · 안 한 형성평가는 넣지 않음(늦게 온 학생) · 소레이드 = 단계별 첫 시도 · 개념 태그 없는 팩 = 그 칸만 review/boss 로 */
export function concOf(L: LessonPack, R: Room, uid: string) {
  const map: Record<string, string> = {}, names: Record<string, string> = { review: '지난 시간 복습', boss: '형성평가' };
  let cur = 'review';
  for (const s of L.steps) { if (s.kind === 'concept') { cur = s.id; names[s.id] = s.title.replace(/^개념 \d+ · /, ''); } if (s.kind === 'monster' && !L.carryOf?.[s.id]) map[s.id] = cur; }
  const conc: Record<string, { ok: number; total: number }> = {}, mis: Record<string, [number, number]> = {}, ML = SUBJ.misLogic;
  let fixed = 0; // 🔁 처음 틀렸다가 고친 소문제 수 (정식 result.js fixed + bossFixed · 대시보드 🔍 고침 패턴 · 세특)
  const bump = (c: string, ok: boolean) => { const v = (conc[c] ||= { ok: 0, total: 0 }); v.total++; if (ok) v.ok++; };
  const addMis = (codes: string[], fixed: boolean) => { for (const c of codes) { const v = (mis[c] ||= [0, 0]); v[0]++; if (fixed) v[1]++; } };
  const split = (L as unknown as { split?: Record<string, string[]> }).split || {};
  for (const s of L.steps) {
    if (s.kind !== 'monster' || !L.monsters[s.id]) continue;
    const sp = split[s.id];
    if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid); if (r.submitted) r.stFirst.forEach((ok, i) => bump(sp?.[i] || map[s.id]!, !!ok)); fixed += r.stOk.filter((ok, i) => ok && !r.stFirst[i]).length; continue; }
    const r = plainRecord(L, R, s.id, uid);
    if (!r.submitted) continue;
    const first = r.tries[0];
    fixed += Array.from({ length: r.total }, (_, i) => r.tries.some((t) => t.marks[i]) && !(first && first.attempt === 0 && first.marks[i])).filter(Boolean).length;
    Array.from({ length: r.total }, (_, i) => !!(first && first.attempt === 0 && first.marks[i])).forEach((ok, i) => bump(sp?.[i] || map[s.id]!, ok));
    if (ML) for (const tr of r.tries) { const items = itemsFor(L, R, s.id, uid, tr.attempt); items.forEach((q, i) => { if (tr.marks[i]) return; const later = r.tries.some((u) => u.attempt > tr.attempt && u.marks[i]); addMis(ML.classify(q, (tr.given || [])[i]), later); }); }
  }
  if (L.boss) {
    const tags = (L.boss as { tags?: string[] }).tags || [], bs = bossState(L, R, uid), mast = mastery(L, R, uid);
    if (bs.some((x) => x.firstTried)) bs.forEach((x, i) => bump(tags[i] || 'boss', x.first));
    fixed += mast.filter((ok, i) => ok && !bs[i]?.first).length;
    if (ML) for (const tr of bossTries(L, R, uid)) { if (tr.ok || !tr.q) continue; addMis(ML.classify(tr.q, tr.given, tr.a === 0 ? ML.bossTag(L.id, 1, tr.i) : null), !!mast[tr.i]); }
  }
  const order = Object.keys(conc).filter((c) => conc[c]!.total);
  const weak = order.map((c) => ({ c, r: conc[c]!.ok / conc[c]!.total })).filter((x) => x.r < 0.8).sort((a, b) => a.r - b.r).slice(0, 2).map((x) => x.c);
  return { conc: Object.fromEntries(order.map((c) => [c, [conc[c]!.ok, conc[c]!.total] as [number, number]])), names, weak, mis, fixed };
}
const did = (v: unknown) => v === 'o' || v === 'f' || v === 'x';
/** 🔁 같은 차시를 다시 열어도 칸마다 합침 (📜 2026-11-15 · 이어 하기 = 앞 수업 칸도 그 차시 기록에)
 *  이미 o · f · x 인 칸은 새 수업의 - · n 로 덮지 않음 · 새로 낸 칸만 바꿈(둘 다 냈으면 나중 것) · 형성평가도 문항마다 같은 규칙
 *  정식에서 온 칸(conc · mis · lad …)은 그대로 둠 (이 앱이 다시 계산하지 않는 칸) */
export function mergeRow(prev: (Partial<RecRow> & Record<string, unknown>) | null | undefined, cur: RecRow): RecRow {
  if (!prev || typeof prev !== 'object') return cur;
  const pm = (prev.mons || {}) as Record<string, St>, mons: Record<string, St> = { ...cur.mons };
  for (const [k, v] of Object.entries(pm)) if (did(v) && !did(mons[k])) mons[k] = v;
  const out: RecRow = { ...(prev as RecRow), ...cur, mons };
  // 📌 개념 칸 = 이번 수업에서 한 개념은 새 값 · 안 한 개념은 앞 값 그대로 · 🔎 오개념 = 앞 수업들 + 이번 수업(같은 수업을 다시 저장하면 이번 몫만 바뀜)
  { const pc = (prev as { cc?: Record<string, number> }).cc, cc2 = (cur as { cc?: Record<string, number> }).cc; if (pc || cc2) (out as { cc?: Record<string, number> }).cc = { ...(pc || {}), ...(cc2 || {}) }; }
  out.conc = { ...((prev.conc as RecRow['conc']) || {}), ...(cur.conc || {}) }; out.names = { ...((prev.names as RecRow['names']) || {}), ...(cur.names || {}) };
  const base = (String(prev.code) === String(cur.code) ? prev.misBase : prev.mis) as RecRow['mis'] | undefined, mis: Record<string, [number, number]> = {};
  for (const src of [base || {}, cur.mis || {}]) for (const [k, v] of Object.entries(src)) { const a = (mis[k] ||= [0, 0]); a[0] += Number(v?.[0]) || 0; a[1] += Number(v?.[1]) || 0; }
  if (Object.keys(mis).length) out.mis = mis; else delete out.mis;
  if (base && Object.keys(base).length) out.misBase = base; else delete out.misBase;
  out.miss = Object.entries(mons).filter(([, v]) => v === 'x' || v === '-').map(([k]) => k);
  out.perfects = Object.values(mons).filter((v) => v === 'o').length;
  const pb = String(prev.bossM || ''), cb = String(cur.bossM || '');
  if (pb && /[ox]/.test(pb) && !/[ox]/.test(cb)) { out.bossM = pb; out.boss = Number(prev.boss) || 0; out.bossN = Number(prev.bossN) || cur.bossN; out.won = !!prev.won || !!cur.won; } // 이번 수업에서 형성평가를 안 했으면 앞 수업 형성평가 그대로
  else if (pb && cb && /[ox]/.test(pb)) { out.bossM = cb.split('').map((c, i) => (c === 'o' || c === 'x' ? c : pb[i] === 'o' || pb[i] === 'x' ? pb[i]! : c)).join(''); out.boss = out.bossM.slice(0, out.bossN || out.bossM.length).split('').filter((c) => c === 'o').length; }
  if (!cur.total && Number(prev.total)) { out.right = Number(prev.right) || 0; out.total = Number(prev.total) || 0; }
  return out;
}

/** 읽기 (정식 꼴 · 옛 v1.0 꼴 둘 다): 첫 시도 다 맞힌 몬스터 수 · 보스 처치 · 형성평가 만점 · 맞힌 비율 */
type Any = { mons?: Record<string, unknown>; boss?: number | { ok?: number; items?: number; won?: boolean }; bossN?: number; won?: boolean; right?: number; total?: number };
export const perfectsOf = (r: Any) => Object.values(r.mons || {}).filter((m) => m === 'o' || (typeof m === 'object' && !!(m as { perfect?: boolean })?.perfect)).length;
export const wonOf = (r: Any) => !!r.won || (typeof r.boss === 'object' && !!r.boss?.won);
export const bossFullOf = (r: Any) => (typeof r.boss === 'number' ? !!r.bossN && r.boss === r.bossN : !!r.boss?.items && r.boss.ok === r.boss.items);

/** 📜 #39 수업 닫을 때 교사 폰이 반 전체 수업 기록을 한 번에 (📜 2026-11-17 머리 · DECISIONS 「📋 1-3반 9차시 형성평가 「2명」 = 기록 버그」)
 *  예전 = 학생 폰이 그 방 화면에 있어야만 기록을 씀 → 형성평가 화면에서 바로 닫으면 대부분 빠짐 · 이제 방 기록(subs · chain · bossSub)으로 교사 폰이 씀
 *  학생 폰이 쓴 기록과 겹치면 mergeRow(더 좋은 쪽 · 같은 수업 다시 저장 = 이번 몫만) · 💎 · EXP 보상은 학생 폰만(두 번 안 줌) */
export async function classRecords(S: { get: <T>(p: string) => T | null; set: (p: string, v: unknown) => void; fetch?: <T>(p: string) => Promise<T | null>; now: () => number }, L: LessonPack, R: Room, code: string): Promise<number> {
  const cls0 = R.meta.cls; if (!cls0) return 0;
  const who = new Set<string>([...Object.keys(R.players || {}), ...Object.keys((R as { bossSub?: object }).bossSub || {})]);
  for (const byU of Object.values(R.subs || {})) Object.keys(byU || {}).forEach((u) => who.add(u));
  for (const byU of Object.values((R as { chain?: Record<string, object> }).chain || {})) Object.keys(byU || {}).forEach((u) => who.add(u));
  let n = 0;
  for (const u of who) {
    const m = /^s(\d+)_(\d+)_(\d+)$/.exec(u); if (!m) continue; // 학생 계정만 (봇 · 교사 · 탭 체험 빼고)
    const p = (R.players?.[u] || {}) as { teacher?: boolean; bot?: boolean };
    if (p.teacher || p.bot) continue;
    const cls = `${m[1]}-${m[2]}`, num = Number(m[3]); if (cls !== cls0) continue;
    const path = `records/${cls.replace(/[.#$/[\]]/g, '_')}/${num}/${L.id}`;
    const prev = (S.fetch ? await S.fetch<Partial<RecRow>>(path).catch(() => null) : S.get<Partial<RecRow>>(path)) ?? null;
    try { S.set(path, summaryOf(L, R, u, code, S.now(), prev)); n++; } catch (e) { console.warn('수업 기록', u, e); } // 한 학생 기록이 깨져도 나머지는 씀
  }
  return n;
}
