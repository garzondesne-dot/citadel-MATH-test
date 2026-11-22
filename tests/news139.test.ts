// 📢 #139 v1.1 정식 새 소식 = b235 를 본 학생에게 b236 한 번 · 학생 3줄 · 교사 5줄
import { describe, expect, it } from 'vitest';
import { CHANGES, studentLines, unseen } from '../src/school/changes';

describe('#139 v1.1 새 소식', () => {
  const c = CHANGES.find((x) => x.ver === 'b236');
  it('b236 = 게시판 던전 정식 시작 · 교사 5줄 · 학생 3줄', () => {
    expect(c?.top).toBe('🎉 v1.1 · 게시판 던전 정식 시작');
    expect(c?.lines.length).toBe(5);
    expect(c?.student?.length).toBe(3);
  });
  it('b235 를 본 학생 = b236 하나만 · 학생 줄 3개', () => {
    const l = unseen('b235', 'b236');
    expect(l.map((x) => x.ver)).toEqual(['b236']);
    expect(studentLines(l)).toEqual(c?.student);
    expect(unseen('b236', 'b236')).toEqual([]);
  });
});
