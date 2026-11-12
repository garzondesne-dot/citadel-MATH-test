// ✉ #130 선생님 메시지 · 답장 · 💎 — mail/{uid} 한 줄 + 💎 는 gifts/{uid}(mail) · 받는 사람 = 명단 그대로
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { allUids, classUids, mailLine, sendMail } from '../src/school/mail';
import { inbox } from '../src/school/inbox';
import { CLASSES, roster, uidOf } from '../src/school/school';

describe('메시지 · 답장 (#130)', () => {
  it('보내기 = 받는 사람마다 mail 한 줄 · 💎 있으면 gifts 도 같은 값', () => {
    const S = memoryStore(), us = [uidOf('1-3', 3), uidOf('1-5', 1)];
    expect(sendMail(S, us, '  내일 형성평가  ', 10, 'msg')).toBe(2);
    for (const u of us) {
      const m = Object.values(S.get<Record<string, { text: string; g: number; kind: string }>>(`mail/${u}`) || {});
      expect(m).toHaveLength(1); expect(m[0]).toMatchObject({ text: '내일 형성평가', g: 10, kind: 'msg' });
      expect(Object.values(S.get<Record<string, { g: number; mail: boolean }>>(`gifts/${u}`) || {})).toEqual([expect.objectContaining({ g: 10, mail: true })]);
    }
    expect(sendMail(S, us, '💎 없음', 0, 'reply')).toBe(2);
    expect(Object.keys(S.get<object>(`gifts/${us[0]}`) || {})).toHaveLength(1);
    expect(sendMail(S, us, '   ', 5, 'msg')).toBe(0);
  });
  it('반 전체 = 그 반 명단 · 모든 반 = 8반 명단 합', () => {
    const S = memoryStore();
    expect(classUids(S, '1-3')).toEqual(roster('1-3', S).map((p) => p.uid));
    expect(allUids(S)).toHaveLength(CLASSES.reduce((a, c) => a + roster(c, S).length, 0));
  });
  it('학생 💬 메시지마다 보낸 사람(반 · 번호) · 알림 한 줄', () => {
    const S = memoryStore();
    for (const x of inbox(S).filter((x) => x.kind === 'idea')) expect(x.from && roster(x.from.cls, S).some((p) => p.num === x.from!.num)).toBe(true);
    expect(mailLine({ kind: 'reply', text: '고칠게' }, 20)).toBe('✉ 선생님 답장 · 「고칠게」 · 💎 +20');
    expect(mailLine({ kind: 'msg', text: '안녕' }, 0)).toBe('✉ 선생님 메시지 · 「안녕」');
  });
});
