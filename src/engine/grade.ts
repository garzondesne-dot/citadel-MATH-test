import type { Given, Question } from '../model/types';
import { allSubsets, key } from './sets';

// 채점 — 정식 js/engine/quiz.js DS.Quiz.grade 와 같은 동작 (화면과 분리 · 학생 폰 · 종합실 · 시험이 같이 씀)
// 주의: multi 는 정식처럼 sort() 기본(글자) 정렬 뒤 비교 — 번호가 10 이상이어도 양쪽이 같은 정렬이라 결과는 같다
export function grade(q: Question, given: Given): boolean {
  switch (q.type) {
    case 'blanks': {
      const g = given as string[];
      return q.items.every((it, k) => g[k] === it.answer);
    }
    case 'ox':
      return given === q.answer;
    case 'number':
      return Number(given) === q.answer;
    case 'text': {
      const norm = (s: unknown) => String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase();
      return (q.answers || []).some((a) => norm(a) === norm(given));
    }
    case 'multi':
      return (given as number[]).slice().sort().join(',') === q.answer.slice().sort().join(',');
    case 'subsets': {
      const g = given as number[][];
      const want = new Set(allSubsets(q.base).map(key));
      const got = new Set(g.map(key));
      return got.size === g.length && got.size === want.size && [...want].every((k) => got.has(k));
    }
    default:
      return given === q.answerIndex;
  }
}
