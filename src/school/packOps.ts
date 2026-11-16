import type { LessonPack, Store } from '../model/types';
import { PACKS, removePack, UPLOADED } from '../engine/packs';
import { deletable, PACK_PATH, PREV_PATH, recordedN, revive } from './packUpload';
import { SUBJ } from '../engine/subject';

// 📦 차시 카드 동작 (📜 2026-11-17 #22 ②): 👀 숨기기 · 🗑 빼기 · ↩ 바로 전 판 — 「📦 팩 올리기」 창과 같은 서버 칸 · 같은 규칙(set-NN · 앱 차시 = 지우지 않고 숨김만)
type TS = Store & { trySet?: (p: string, v: unknown) => Promise<boolean>; fetch?: <T>(p: string) => Promise<T | null> };
const put = (S: TS, p: string, v: unknown) => (S.trySet ? S.trySet(p, v) : Promise.resolve((S.set(p, v), true)));
const builtIn = new Set(SUBJ.lessons.map((p) => p.id));
export const canDelete = (id: string) => deletable(id, (x) => builtIn.has(x));
export const recOf = (S: Store, id: string) => recordedN(S.get<Record<string, unknown>>('records'), id);
export const isUploaded = (id: string) => UPLOADED.has(id);
export async function hidePack(S: TS, id: string, on: boolean): Promise<boolean> {
  if (!(await put(S, `${PACK_PATH}/${id}/hide`, on ? true : null))) return false;
  const pk = PACKS.find((p) => p.id === id); if (pk) pk.hide = on || undefined; return true;
}
export async function deletePack(S: TS, id: string): Promise<boolean> {
  if (!canDelete(id)) return false;
  if (!(await put(S, `${PACK_PATH}/${id}`, null))) return false;
  await put(S, `prep/${id}`, null); await put(S, `${PREV_PATH}/${id}`, null);
  removePack(id); return true;
}
/** ↩ 바로 전 판 (있으면) */
export async function prevOf(S: TS, id: string): Promise<LessonPack | null> {
  const p = `${PREV_PATH}/${id}`; const v = S.fetch ? await S.fetch<LessonPack>(p).catch(() => null) : S.get<LessonPack>(p);
  return v && typeof v === 'object' && (v as LessonPack).id === id ? (v as LessonPack) : null;
}
/** 전 판 ↔ 지금 판 맞바꿈 (한 번 더 누르면 다시 돌아옴) */
export async function revertPack(S: TS, id: string): Promise<boolean> {
  const prev = await prevOf(S, id); if (!prev) return false;
  const cur = S.fetch ? await S.fetch<LessonPack>(`${PACK_PATH}/${id}`).catch(() => null) : S.get<LessonPack>(`${PACK_PATH}/${id}`);
  if (!(await put(S, `${PACK_PATH}/${id}`, prev))) return false;
  if (cur) await put(S, `${PREV_PATH}/${id}`, cur);
  const k = PACKS.findIndex((x) => x.id === id); if (k >= 0) PACKS.splice(k, 1, revive(prev));
  return true;
}
