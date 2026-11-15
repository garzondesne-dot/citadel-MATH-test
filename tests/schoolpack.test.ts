// 🏫 학교판 빈 과목 팩 (📜 머리 🔨 · CLAUDE.md 「🏫 학교판 규칙」): 우리 차시 · 모루 · 기호 톡 · 성채 · 오개념 · 성취기준 · OX · 성채 칭호 없음 · 엔진 공용(문항 꼴 · 그림)은 그대로
import { describe, expect, it } from 'vitest';
import SCHOOL from '../src/subjects/school/index';
import BASE from '../src/subjects/common-math2/index';
import LIST from '../tools/school/schools.json';

describe('🏫 학교판 과목 팩', () => {
  it('없는 것 = 차시 · 모루 · 기호 톡 · 성채 층 · 오개념 · 성취기준 · OX · 칭호', () => {
    expect(SCHOOL.id).toBe('school');
    expect(SCHOOL.lessons).toEqual([]); expect(SCHOOL.lessonList).toEqual([]);
    expect(SCHOOL.forge).toBeUndefined(); expect(SCHOOL.symtalk).toBeUndefined(); expect(SCHOOL.misLogic).toBeUndefined();
    expect(Object.keys(SCHOOL.misconceptions)).toEqual([]); expect(SCHOOL.standards).toEqual([]); expect(SCHOOL.funOx).toEqual([]);
    expect(SCHOOL.camp.floors.every((f) => f.off)).toBe(true); expect(SCHOOL.titles.list).toEqual([]);
    expect(SCHOOL.formats).toBe(BASE.formats); expect(SCHOOL.themes).toBe(BASE.themes);
  });
  it('학교 목록 = 공개 설정값만 (비밀 칸 없음) · 운영 서버 아님', () => {
    const s = (LIST as Record<string, { name?: string; subject?: string; fb?: Record<string, string> }>).srzmf!;
    expect(s.name).toBeTruthy(); expect(s.subject).toBeTruthy();
    expect(Object.keys(s.fb!).sort()).toEqual(['apiKey', 'appId', 'authDomain', 'databaseURL', 'measurementId', 'messagingSenderId', 'projectId', 'storageBucket']);
    expect(s.fb!.projectId).not.toBe('citadel-math'); expect(s.fb!.projectId).not.toBe('citadel-math-test-c6a9b');
  });
});
