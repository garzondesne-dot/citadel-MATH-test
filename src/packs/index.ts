import type { LessonPack } from '../model/types';
// 🧩 차시 팩 목록 (#132) — src/packs/*.json 모두 · 차시 번호 순 (정식 차시 = tools/pack-from-release 가 만듦)
const mods = import.meta.glob<LessonPack>('./*.json', { eager: true, import: 'default' });
export const PACKS: LessonPack[] = Object.values(mods).sort((a, b) => a.no - b.no);
export const packOf = (id: string | null | undefined): LessonPack | null => PACKS.find((p) => p.id === id) ?? null;
