// 🆕 바뀐 것 알림 (📜 2026-11-15 · school/changes.ts): 판 건너뛰기 · 처음 = 이번 판만 · 같은 판 두 번 X · 학생 줄 최대 5 · 목록 꼴 (코드 · 파일 이름 없음)
import { describe, expect, it } from 'vitest';
import { CHANGES, studentLines, studentNews, teacherNews, teacherSeenPath, teacherSync, unseen, upTo, vnum, type Change } from '../src/school/changes';
import { BUILD } from '../src/build';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';

const mk = (v: string, stu: string[] = []): Change => ({ ver: v, date: '2026-11-15', channel: 'release', top: `${v} 고침`, lines: [], check: [], more: [], student: stu });
const ALL = [mk('b203', ['a']), mk('b204'), mk('b205', ['b', 'c']), mk('b206', ['d', 'e', 'f', 'g'])];
const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });

describe('🆕 바뀐 것', () => {
  it('목록 꼴(압축): 판마다 하나 · 지금 판까지 · 맨 위 줄 · 줄 5 · 확인할 것 2 · 줄 길이 · 학생 3줄 · 코드 · 파일 이름 없음', () => {
    const vers = CHANGES.map((c) => c.ver);
    expect(new Set(vers).size).toBe(vers.length);
    expect(vers).toContain(BUILD);
    const len = (t: string) => [...t].length;
    for (const c of CHANGES) {
      expect(c.top.trim()).not.toBe('');
      expect(c.lines.length).toBeLessThanOrEqual(5); expect(c.check.length).toBeLessThanOrEqual(2);
      for (const t of [c.top, ...c.lines, ...c.check, ...c.more]) { expect(len(t), t).toBeLessThanOrEqual(34); expect(t).not.toMatch(/\.(ts|svelte|js|json)\b|src\/|tools\//); }
      expect(c.student.length).toBeLessThanOrEqual(3);
    }
  });
  it('못 본 판 = 최신부터 · 건너뛴 판 모두 · 처음 = 이번 판만 · 이미 본 판 = 없음', () => {
    expect(unseen('b204', 'b206', ALL).map((c) => c.ver)).toEqual(['b206', 'b205']);
    expect(unseen(null, 'b206', ALL).map((c) => c.ver)).toEqual(['b206']);
    expect(unseen('b206', 'b206', ALL)).toEqual([]);
    expect(upTo('b205', ALL).map((c) => c.ver)).toEqual(['b205', 'b204', 'b203']);
    expect(vnum('b207')).toBe(207);
  });
  it('🎒 학생 줄 = 여러 판 묶어 최대 5줄', () => {
    expect(studentLines(unseen('b202', 'b206', ALL))).toEqual(['d', 'e', 'f', 'g', 'b']);
  });
  it('교사 소식 = 판마다 한 통 · 같은 판 두 번 X · 베타는 학생 새 소식 줄도 · 본 판 기억(정식 · 베타 따로)', () => {
    const S = store();
    expect(teacherNews(S, ALL[3]!, 'beta', 1)).toBe(true);
    expect(teacherNews(S, ALL[3]!, 'beta', 2)).toBe(false);
    const n = S.get<{ title: string; body: string }>('school/inbox/news_beta_b206')!;
    expect(n.title).toMatch(/🧪 \[베타 b206\]/); expect(n.body).toMatch(/학생에게 갈 새 소식/); expect(n.body.split('\n')[0]).toBe('★ b206 고침');
    const got = teacherSync(S, 't1', 'rel', 'b206', 10, true);
    expect(got.map((c) => c.ver)).toEqual(['b206']); // 처음 = 이번 판만
    expect(S.get('school/inbox/news_rel_b206')).toBeTruthy();
    expect(S.get(teacherSeenPath('t1', 'rel'))).toBe('b206');
    expect(S.get(teacherSeenPath('t1', 'beta'))).toBeNull();
  });
  it('🎒 학생 우편 = 학생 줄 있는 판만 · 같은 판 두 번 X', () => {
    const S = store();
    studentNews(S, 's1', [ALL[3]!, ALL[1]!], 1); studentNews(S, 's1', [ALL[3]!], 5);
    const m = S.get<Record<string, { text: string; kind: string; at: number }>>('mail/s1')!;
    expect(Object.keys(m)).toEqual(['news_b206']); expect(m.news_b206!.kind).toBe('news'); expect(m.news_b206!.at).toBeGreaterThanOrEqual(1);
  });
});
