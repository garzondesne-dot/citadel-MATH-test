import type { LessonPack } from '../model/types';
// 🧩 차시 팩 목록 (#132) — src/packs/*.json 모두 · 차시 번호 순 (정식 차시 = tools/pack-from-release 가 만듦)
//   한 차시 파일을 두 수업으로 (정식 parts · 6 · 7차시): parts 하나 = 목록에 차시 하나 더 (id 「set-06@7」 · 차시 번호 7 · 단계 = from 부터 · 문항 · 생성기 = 같은 팩)
const mods = import.meta.glob<LessonPack>('./*.json', { eager: true, import: 'default' });
const base = Object.values(mods);
const parts = base.flatMap((p) => (p.parts || []).map((pt): LessonPack | null => {
  const k = p.steps.findIndex((s) => s.id === pt.from);
  return k < 0 ? null : { ...p, id: `${p.id}@${pt.no}`, no: pt.no, title: pt.title, partOf: p.id, steps: p.steps.slice(k), parts: undefined };
}).filter((x): x is LessonPack => !!x));
export const PACKS: LessonPack[] = [...base, ...parts].sort((a, b) => a.no - b.no);
export const packOf = (id: string | null | undefined): LessonPack | null => PACKS.find((p) => p.id === id) ?? null;
