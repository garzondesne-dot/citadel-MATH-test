// 📄 학습지 칸 그림 (#158 · 정식 prep/{차시}/img/{칸} = webp data URL · 서버에만 · 저장소에 넣지 않음)
//   나눈 차시(partOf)는 원래 차시의 칸 그림을 씀 (예: 7차시 = 원래 차시의 u4 … 칸)
//   그 단계에서만 한 장씩 받고 이 기기에 잠깐 기억 (실시간 거울에 넣지 않음)
import type { LessonPack, Store } from '../model/types';
const memo = new Map<string, Promise<string | null>>();
export const prepPath = (L: LessonPack, id: string) => `prep/${L.imgOf ?? L.partOf ?? L.id}/img/${id}`; // 📦 올린 팩 = imgOf 차시 그림을 빌려 씀
export function prepImg(S: Store, L: LessonPack, id: string): Promise<string | null> {
  const p = prepPath(L, id);
  let v = memo.get(p);
  if (!v) {
    v = (S.fetch ? S.fetch<string>(p) : Promise.resolve(S.get<string>(p))).then((x) => (typeof x === 'string' && x.startsWith('data:image') ? x : null)).catch(() => null);
    memo.set(p, v);
    void v.then((x) => { if (!x) setTimeout(() => memo.delete(p), 30000); }); // 아직 안 올렸으면 30초 뒤 다시 물어봄
  }
  return v;
}
/** 문제 단계의 개념 칸 = 그 문제 바로 앞의 개념 단계 */
export function conceptOf(L: LessonPack, id: string): string | null {
  const k = L.steps.findIndex((s) => s.id === id);
  for (let i = k - 1; i >= 0; i--) if (L.steps[i]!.kind === 'concept') return L.steps[i]!.id;
  return null;
}
