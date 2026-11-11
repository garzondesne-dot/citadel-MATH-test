// 정식과 같은 동작 확인 — tests/fixtures/parity-set06-m1.json (정식 코드가 직접 만든 기준값 · tools/make-parity-fixture.cjs)
// 난수 · 문항(질문 · 보기 · 정답 · 해설) · 채점 · 기록(재도전 v3 · 체력)이 정식과 글자 하나까지 같아야 한다
import { describe, expect, it } from 'vitest';
import type { Given, LessonPack, Question, Room } from '../src/model/types';
import pack from '../src/packs/set-06-m1.json';
import fx from './fixtures/parity-set06-m1.json';
import { makeRng } from '../src/engine/rng';
import { items } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';
import { itemsFor, monsterHp, record } from '../src/raid/raid';

const L = pack as LessonPack;

describe(`정식과 같음 (${fx.from})`, () => {
  it('난수', () => {
    for (const r of fx.rng) {
      const g = makeRng(r.seed);
      expect([g(), g(), g(), g(), g()]).toEqual(r.seq);
    }
  });

  it('문항 (시드 40 × 판 0~3)', () => {
    for (const c of fx.items) {
      const got = items(L, 'm1', c.seed, c.v).map((q) => {
        const m = q as Extract<Question, { type: 'multi' }>;
        return { question: m.question, options: m.options, answer: m.answer, solution: m.solution };
      });
      expect(got, `${c.seed} 판 ${c.v}`).toEqual(c.items);
    }
  });

  it('채점 (빈 답 · 정답 · 하나 빠짐 · 하나 더 · 순서 바꿈)', () => {
    for (const c of fx.grade) {
      const q = items(L, 'm1', c.seed, 1).find((x) => x.question === c.question);
      expect(q, c.question).toBeTruthy();
      expect(grade(q as Question, c.given as Given), `${c.question} ${JSON.stringify(c.given)}`).toBe(c.ok);
    }
  });

  it('기록 · 재도전 v3 · 체력', () => {
    for (const c of fx.record) {
      // 정식은 active 로 접속을 셈 → 여기서는 방금 소식이 온 학생으로
      const R: Room = { meta: { code: 'PAR', lesson: 'set-06', version: 3, created: 0 }, state: { step: 0 }, players: { u1: { num: 1, nick: '', seen: 1000 } },
        subs: { m1: { u1: c.subs as Record<string, Given[]> } } };
      const rec = record(L, R, 'm1', 'u1');
      expect({ best: rec.best, total: rec.total, left: rec.left, perfect: rec.perfect, practice: rec.practice, fix: rec.fix, canRetry: rec.canRetry }, c.name)
        .toEqual({ best: c.best, total: c.total, left: c.left, perfect: c.perfect, practice: c.practice, fix: c.fix, canRetry: c.canRetry });
      expect((itemsFor(L, R, 'm1', 'u1', rec.nextAttempt)[0] as Question).question, `${c.name}: 다음 문제`).toBe(c.nextFirstQ);
      expect(monsterHp(L, R, 'm1', 1000), `${c.name}: 체력`).toEqual(c.hp);
    }
  });
});
