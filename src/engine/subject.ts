import type { Subject } from '../model/subject';
import { ACTIVE_SUBJECT } from '../subjects/active';

// 🚪 엔진 → 과목 팩 한 입구 (#136): 엔진 코드는 과목 내용을 여기 SUBJ 로만 읽음 (과목 폴더 = src/subjects/<id>)
const ALL = import.meta.glob<Subject>('../subjects/*/index.ts', { eager: true, import: 'default' });
export function loadSubject(id: string = ACTIVE_SUBJECT): Subject {
  const s = Object.values(ALL).find((x) => x.id === id);
  if (!s) throw new Error(`과목 팩 없음: ${id}`);
  return s;
}
export const SUBJ: Subject = loadSubject();
