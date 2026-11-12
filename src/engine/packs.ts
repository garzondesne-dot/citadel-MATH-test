import type { LessonPack } from '../model/types';
import { SUBJ } from './subject';
// 🧩 차시 팩 목록 (#132 · #136) — 과목 팩의 차시 모두(SUBJ.lessons) · 차시 번호 순
//   한 차시 팩을 두 수업으로 (parts): parts 하나 = 목록에 차시 하나 더 (id 「<팩>@<번호>」 · 단계 = from 부터 · 문항 · 생성기 = 같은 팩)
const base = SUBJ.lessons;
const parts = base.flatMap((p) => (p.parts || []).map((pt): LessonPack | null => {
  const k = p.steps.findIndex((s) => s.id === pt.from);
  return k < 0 ? null : { ...p, id: `${p.id}@${pt.no}`, no: pt.no, title: pt.title, partOf: p.id, steps: p.steps.slice(k), parts: undefined };
}).filter((x): x is LessonPack => !!x));
export const PACKS: LessonPack[] = [...base, ...parts].sort((a, b) => a.no - b.no);
export const packOf = (id: string | null | undefined): LessonPack | null => PACKS.find((p) => p.id === id) ?? null;
