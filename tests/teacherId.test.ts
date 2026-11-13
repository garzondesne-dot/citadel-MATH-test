import { describe, expect, it } from 'vitest';
import { loginEmails, makeEmail, teacherEmail } from '../src/school/teacherId';
describe('B8 교사 아이디 칸 = 이메일도', () => {
  it('@ 있으면 이메일 그대로 → 예전 꼴 · 없으면 예전 꼴만', () => {
    expect(loginEmails(' Teacher@School.KR ')).toEqual(['teacher@school.kr', 't_teacherschool.kr@citadel.class']);
    expect(loginEmails('kim01')).toEqual(['t_kim01@citadel.class']);
    expect(teacherEmail('Kim 01!')).toBe('t_kim01@citadel.class');
    expect(makeEmail('kim01')).toBe('t_kim01@citadel.class'); expect(makeEmail('a@b.c')).toBe('a@b.c');
  });
});
