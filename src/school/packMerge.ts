// 📦 #82 같은 차시 팩 = 바꾸기 (📜 2026-11-20 선생님 「진행해」 · 머리 🔨 · 발단 = 11/19 같은 11차시를 다른 id 로 올렸더니 옛 팩이 안 덮이고 두 장 · 그 뒤 빼기 = 칸 그림 · 전 판까지 사라짐)
//   ① 올리는 팩 차시 번호(no)가 이미 있는 다른 팩과 같으면 「바꾸기(기본) / 따로 추가」 · 바꾸기 = 원래 id 그대로(수업 방 · 기록이 안 끊김)
//   ② 병합: 새 파일에 있는 칸만 덮어씀 · 없는 칸(열쇠 · 칸 그림 목록 · 영상 · 형성평가 짝 등)은 원래 팩 것 유지
//      몬스터 · 형성평가 = 같은 id 이고 문항 수 · 판 수가 같을 때만 문항마다 덧칸(say · why · help · review · kind · ref · groups)을 원래 것에서 채움
//      구조가 다르면(문항 수 · 판 수 · 소레이드 여부가 다름) 새 것 그대로 (덧칸 안 채움) — 열쇠 · 그림은 팩 칸이라 그대로 유지
//   ③ 요약 한 줄 + 줄어드는 칸(열쇠 · 그림 · 서술) = 빨간 경고
//   ④ 🗑 휴지통: 바꾸기 · 빼기 전 옛 팩 + 칸 그림(prep/{id}) = prep/trash/{키} · 목록 = prep/trashIdx/{키} (30일 · ↩ 되돌리기)
import type { LessonPack, Question, Store } from '../model/types';

type O = Record<string, unknown>;
const isO = (v: unknown): v is O => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 문항 덧칸 = 새 파일에 없으면 원래 것을 씀 */
export const ADDON = ['say', 'why', 'help', 'review', 'kind', 'ref', 'groups'] as const;

/** 같은 차시(no)의 다른 팩 (올리는 팩 id 와 다른 것 · 평가 층 · 나눈 뒷수업 빼고) */
export function sameNo(packs: LessonPack[], P: { id: string; no: number }): LessonPack[] {
  return packs.filter((x) => x.id !== P.id && x.no === P.no && !x.partOf && !x.id.startsWith('eval-'));
}

/** 문항 목록 모양 = [첫 판 수, 판마다 수…] (소레이드 · 생성기 = 'gen') */
function shapeOf(m: unknown): string {
  if (!isO(m)) return '';
  const pool = (x: unknown) => (isO(x) && Array.isArray(x.pool) ? (x.pool as unknown[][]).map((v) => (Array.isArray(v) ? v.length : -1)).join(',') : isO(x) && 'gen' in x ? 'gen' : '');
  return `${Array.isArray(m.first) ? m.first.length : -1}|${pool(m.retry)}|${m.chain ? `c:${pool(m.chain)}` : ''}|${Array.isArray(m.pool) ? (m.pool as unknown[][]).map((v) => (Array.isArray(v) ? v.length : -1)).join(',') : ''}|${m.items ?? ''}`;
}
/** 문항 하나: 같은 꼴이면 빠진 덧칸만 채움 */
function fillItem(n: O, o: unknown): O {
  if (!isO(o) || o.type !== n.type) return n;
  const out = { ...n }; for (const k of ADDON) if (out[k] == null && o[k] != null) out[k] = clone(o[k]);
  return out;
}
const fillList = (ns: unknown, os: unknown) => (Array.isArray(ns) && Array.isArray(os) ? ns.map((q, i) => (isO(q) ? fillItem(q, os[i]) : q)) : ns);
const fillPool = (np: unknown, op: unknown) => (isO(np) && isO(op) && Array.isArray(np.pool) && Array.isArray(op.pool) ? { ...np, pool: (np.pool as unknown[]).map((v, k) => fillList(v, (op.pool as unknown[])[k])) } : np);
/** 몬스터 · 형성평가 하나 */
function fillMon(n: O, o: unknown): { v: O; same: boolean } {
  if (!isO(o)) return { v: n, same: false };
  if (shapeOf(n) !== shapeOf(o)) return { v: n, same: false };
  const v: O = { ...n };
  for (const [k, x] of Object.entries(o)) if (!(k in v)) v[k] = clone(x); // 몬스터 칸(help · helps · reviews · links …) 없으면 원래 것
  if (Array.isArray(v.first)) v.first = fillList(v.first, o.first);
  if (v.retry) v.retry = fillPool(v.retry, o.retry);
  if (v.chain) v.chain = fillPool(v.chain, o.chain);
  if (Array.isArray(v.pool)) v.pool = (v.pool as unknown[]).map((x, k) => fillList(x, Array.isArray(o.pool) ? (o.pool as unknown[])[k] : null));
  return { v, same: true };
}

export interface MergeRes { pack: LessonPack; kept: string[]; sameMon: string[]; newMon: string[] }
/** 원래 팩(old) 자리에 새 파일(neu)을 병합 — id = 원래 id */
export function mergePack(old: LessonPack, neu: LessonPack): MergeRes {
  const o = clone(old) as unknown as O, n = clone(neu) as unknown as O, out: O = { ...n, id: old.id }, kept: string[] = [];
  for (const [k, x] of Object.entries(o)) if (!(k in n) && !['rev', 'upAt', 'hide'].includes(k)) { out[k] = x; kept.push(k); }
  if (Array.isArray(o.imgCells) || Array.isArray(n.imgCells)) out.imgCells = [...new Set([...((n.imgCells as string[]) || []), ...((o.imgCells as string[]) || [])])];
  // 🐞 11/23 14차시 v6: 새 파일의 「video/v14-58.mp4」(앱에 없는 이름)가 서버에 올린 같은 영상 「rtdb:prep/ex-14/vid/v14-58」을 덮어 영상이 안 나왔음 → 같은 영상 이름이면 서버 것 유지
  const vbase = (u: unknown) => String(u ?? '').replace(/^.*\//, '').replace(/\.mp4$/i, '');
  if (isO(o.videos)) { const ov = o.videos as O, nv = (isO(n.videos) ? n.videos : {}) as O; out.videos = { ...ov, ...Object.fromEntries(Object.entries(nv).filter(([c, u]) => !(String(ov[c] ?? '').startsWith('rtdb:') && /^video\//.test(String(u)) && vbase(ov[c]) === vbase(u)))) }; }
  const sameMon: string[] = [], newMon: string[] = [], mons: O = {};
  for (const [id, m] of Object.entries(isO(n.monsters) ? n.monsters : {})) { const r = fillMon(m as O, isO(o.monsters) ? o.monsters[id] : null); mons[id] = r.v; (r.same ? sameMon : newMon).push(id); }
  out.monsters = mons;
  if (isO(n.boss)) { const r = fillMon(n.boss, o.boss); out.boss = r.v; (r.same ? sameMon : newMon).push('boss'); }
  return { pack: out as unknown as LessonPack, kept, sameMon, newMon };
}

/** 요약 칸 */
export interface Tally { steps: number; items: number; keys: number; say: number; img: number; vers: number }
export function tally(P: LessonPack | null | undefined): Tally {
  if (!P) return { steps: 0, items: 0, keys: 0, say: 0, img: 0, vers: 0 };
  let say = 0, items = 0, vers = 1;
  const each = (qs: unknown) => { if (Array.isArray(qs)) for (const q of qs) if (isO(q) && (q as { say?: unknown }).say) say++; };
  const pool = (r: unknown) => (isO(r) && Array.isArray(r.pool) ? (r.pool as unknown[]) : []);
  for (const m of Object.values(P.monsters || {})) {
    items += m.first?.length ?? 0; each(m.first); pool(m.retry).forEach(each); pool(m.chain).forEach(each);
    vers = Math.max(vers, 1 + pool(m.retry).length, pool(m.chain).length);
  }
  const b = P.boss as unknown as O | undefined; if (b) { items += Number(b.items) || 0; if (Array.isArray(b.pool)) (b.pool as unknown[]).forEach(each); }
  return { steps: P.steps?.length ?? 0, items, keys: P.keys?.length ?? 0, say, img: P.imgCells?.length ?? 0, vers };
}
/** 바꾸기 전 한 줄 (줄어드는 칸 = warn) */
export function diffLine(a: Tally, b: Tally): { text: string; warn: string[] } {
  const f = (lab: string, x: number, y: number) => `${lab} ${x} → ${y}${x === y && x ? '(유지)' : ''}`;
  const warn: string[] = [];
  if (b.keys < a.keys) warn.push(`🔑 열쇠 ${a.keys} → ${b.keys}`);
  if (b.img < a.img) warn.push(`🖼 그림 ${a.img} → ${b.img}칸`);
  if (b.say < a.say) warn.push(`✍ 서술 칸 ${a.say} → ${b.say}`);
  return { text: [f('단계', a.steps, b.steps), f('문제', a.items, b.items), f('🔑 열쇠', a.keys, b.keys), f('✍ 서술 칸', a.say, b.say), `🖼 그림 ${a.img} → ${b.img}칸`, f('숫자 판', a.vers, b.vers)].join(' · '), warn };
}

// ── 🗑 휴지통 ──
export const TRASH = 'prep/trash', TRASH_IDX = 'prep/trashIdx', TRASH_DAYS = 30;
export interface TrashRow { key: string; id: string; no: number; title: string; at: number; why: 'replace' | 'delete' }
type TS = Store & { trySet?: (p: string, v: unknown) => Promise<boolean>; fetch?: <T>(p: string) => Promise<T | null> };
const put = (S: TS, p: string, v: unknown) => (S.trySet ? S.trySet(p, v) : Promise.resolve((S.set(p, v), true)));
const read = async <T>(S: TS, p: string) => (S.fetch ? await S.fetch<T>(p).catch(() => null) : S.get<T>(p));
/** 옛 팩 + 칸 그림을 휴지통에 (실패 = false → 부르는 쪽은 바꾸기 · 빼기를 멈춤) */
export async function toTrash(S: TS, id: string, why: TrashRow['why'], now: number): Promise<boolean> {
  const pack = await read<LessonPack>(S, `prep/packs/${id}`); if (!pack || !isO(pack)) return true; // 서버에 없으면 넣을 것 없음
  const prep = await read<unknown>(S, `prep/${id}`), key = `${id}_${now}`;
  if (!(await put(S, `${TRASH}/${key}`, { pack, prep: prep ?? null }))) return false;
  return put(S, `${TRASH_IDX}/${key}`, { id, no: pack.no, title: pack.title, at: now, why });
}
export async function trashList(S: TS, now: number): Promise<TrashRow[]> {
  const idx = (await read<Record<string, Omit<TrashRow, 'key'>>>(S, TRASH_IDX)) || {}, out: TrashRow[] = [];
  for (const [key, r] of Object.entries(idx)) {
    if (!r) continue;
    if (now - Number(r.at) > TRASH_DAYS * 864e5) { await put(S, `${TRASH}/${key}`, null); await put(S, `${TRASH_IDX}/${key}`, null); continue; } // 30일 지남 = 비움
    out.push({ key, ...r });
  }
  return out.sort((a, b) => b.at - a.at);
}
/** ↩ 되돌리기: 지금 판(있으면)을 먼저 휴지통에 → 옛 팩 · 칸 그림을 제자리에 → 그 휴지통 칸 비움 */
export async function restoreTrash(S: TS, key: string, now: number): Promise<LessonPack | null> {
  const t = await read<{ pack: LessonPack; prep?: unknown }>(S, `${TRASH}/${key}`); if (!t?.pack) return null;
  const id = t.pack.id;
  if (!(await toTrash(S, id, 'replace', now))) return null;
  if (!(await put(S, `prep/packs/${id}`, t.pack))) return null;
  if (t.prep != null) await put(S, `prep/${id}`, t.prep);
  await put(S, `${TRASH}/${key}`, null); await put(S, `${TRASH_IDX}/${key}`, null);
  return t.pack;
}
export type { Question };
