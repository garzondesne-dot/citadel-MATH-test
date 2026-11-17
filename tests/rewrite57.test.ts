// 📜 #57 ✍ 혼자 다시 쓰기 · 📜 +1 = 숫자 바꾼 판 (학습지 숫자 📜 뒤 문항당 한 번 더 · 키 ult_…_v 따로 · 같은 학생 = 늘 같은 판)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/subjects/common-math2';
import type { LessonPack, Question } from '../src/model/types';
import { checkCastle } from '../src/school/castle';
import { markPhoto, rewriteCastle, rewriteOf, rewriteVer } from '../src/school/photo';
import { photoScroll, ultKey } from '../src/raid/actions';
import { memoryStore } from '../src/store/device';
import { chainItems } from '../src/engine/lessons';
import L9 from '../src/subjects/common-math2/lessons/set-09.json';
const P = (f: string) => checkCastle(JSON.parse(readFileSync(new URL(`../tools/pack-upload/castle/${f}.json`, import.meta.url), 'utf8')), { sheet: () => true }).pack!;
const vers = (f: string, id: string) => P(f).rooms.find((r) => r.id === id)!.vers as unknown as Question[][];

describe('📜 #57 숫자 바꾼 판', () => {
  it('판 번호 = 학생 · 문항마다 늘 같음 · 1 ~ n−1 (판 0 = 학습지 숫자 아님)', () => {
    for (let n = 0; n < 40; n++) { const k = rewriteVer(`1-3_${n}`, 'q10', 7); expect(k).toBeGreaterThanOrEqual(1); expect(k).toBeLessThanOrEqual(6); expect(rewriteVer(`1-3_${n}`, 'q10', 7)).toBe(k); }
    expect(new Set(Array.from({ length: 30 }, (_, n) => rewriteVer(`u${n}`, 'm5', 6))).size).toBeGreaterThan(2);
  });
  it('🏰 2층 10 = 판 1~6 중 하나 · 문제 글 = 그 판 숫자 · 단계 줄 5 · 답 · 풀이 = 그 판', () => {
    const v = vers('eval-2', 'q10'), its = rewriteCastle(v, '1-3_5', 'q10'), k = rewriteVer('1-3_5', 'q10', 7);
    expect(its).toBe(v[k]);
    const r = rewriteOf(its);
    expect(r.stem).toMatch(/^10 실수 x/); expect(r.stem).not.toBe(rewriteOf(v[0]!).stem);
    expect(r.lines).toHaveLength(5); expect(r.lines[0]).toMatch(/^①/);
    expect(r.ph[0]!.question).toContain(r.stem); expect(r.ph[0]!.question).toContain('숫자 바꾼 판');
    expect(String(r.ph[0]!.answer)).toBe(String((its[4] as { answer?: unknown }).answer));
  });
  it('🏰 3층 17 (숫자 없는 증명) = 판 0 그대로', () => {
    const v = vers('eval-3', 'q17');
    for (let n = 1; n < 20; n++) expect(rewriteCastle(v, `1-3_${n}`, 'q17')).toBe(v[0]);
  });
  it('🎯 허수아비 9차시 문제 5 = 생성기 판 · 학습지 숫자와 다름 · 단계 질문이 문제 글', () => {
    const L = L9 as unknown as LessonPack, a = chainItems(L, 'm5', 'u|rw', rewriteVer('u', 'm5', 6)), w = chainItems(L, 'm5', 'u|rw', 0);
    const r = rewriteOf(a);
    expect(r.stem).toBe(''); expect(r.lines).toHaveLength(a.length);
    expect(r.lines.join()).not.toBe(rewriteOf(w).lines.join());
    expect(r.ph[0]!.question).toContain(r.lines[0]!);
  });
  it('📜 칸 = 학습지 숫자 칸과 따로 · 문항당 한 번 (최대 2)', () => {
    const S = memoryStore();
    expect(ultKey('1-3_5', 'set-09', 'm5', true)).toBe('gifts/1-3_5/ult_set-09_m5_v');
    expect(photoScroll(S, '1-3_5', 'set-09', 'm5')).toBe(true);
    expect(photoScroll(S, '1-3_5', 'set-09', 'm5')).toBe(false);
    expect(photoScroll(S, '1-3_5', 'set-09', 'm5', true)).toBe(true);
    expect(photoScroll(S, '1-3_5', 'set-09', 'm5', true)).toBe(false);
    expect(Object.keys(S.get<Record<string, unknown>>('gifts/1-3_5') || {}).sort()).toEqual(['ult_set-09_m5', 'ult_set-09_m5_v']);
  });
  it('⏳ 선생님 ✔ 인정 = 학습지 숫자 📜 를 이미 받았으면 다시 쓰기 📜', async () => {
    const S = memoryStore();
    await markPhoto(S, { c: '1-3', n: 5, k: 'set-09_m5', id: 'a' }, true);
    expect(S.get('gifts/s1_3_5/ult_set-09_m5')).toBeTruthy(); expect(S.get('gifts/s1_3_5/ult_set-09_m5_v')).toBeFalsy();
    await markPhoto(S, { c: '1-3', n: 5, k: 'set-09_m5', id: 'b' }, true);
    expect(S.get('gifts/s1_3_5/ult_set-09_m5_v')).toBeTruthy();
  });
});
