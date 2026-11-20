// 📦 게시판 던전 차시 목록 (📜 2026-11-20 선생님 「11차시 = 서버에 올린 팩 읽기」)
//   목록 = 앱에 묶인 팩 + 서버에 올린 팩(교사 차시 팩 목록과 같은 것 · main.ts 가 부팅 때 PACKS 에 더함)
//   같은 차시 번호 = 서버 팩 먼저 · 나눈 수업(partOf) 뺌 · 원문항 없는 팩 뺌 · 차시 번호 순
import type { LessonPack } from '../../model/types';
import { originsOf } from './quiz';
export function atbLessons(packs: readonly LessonPack[], uploaded: ReadonlySet<string>): LessonPack[] {
  const by = new Map<number, LessonPack>();
  for (const p of packs) {
    if (p.partOf || !(p.no > 0) || originsOf(p).length === 0) continue;
    const had = by.get(p.no); if (!had || (uploaded.has(p.id) && !uploaded.has(had.id))) by.set(p.no, p);
  }
  return [...by.values()].sort((a, b) => a.no - b.no);
}
