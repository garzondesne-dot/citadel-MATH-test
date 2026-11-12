// 🔌 #137 「어느 서버」 안전장치: 운영 프로젝트(citadel-math)는 어떤 칸으로 와도 연결 거부 · 시험 프로젝트는 통과
import { expect, it } from 'vitest';
import { isForbidden } from '../src/store/config';

it('운영 서버 설정 = 거부', () => {
  expect(isForbidden({ projectId: 'citadel-math' })).toBe(true);
  expect(isForbidden({ projectId: 'x', databaseURL: 'https://citadel-math-default-rtdb.firebaseio.com' })).toBe(true);
  expect(isForbidden({ projectId: 'x', authDomain: 'citadel-math.firebaseapp.com' })).toBe(true);
  expect(isForbidden({ databaseURL: 'https://citadel-math-default-rtdb.asia-southeast1.firebasedatabase.app' })).toBe(true);
});
it('시험 프로젝트 · 에뮬레이터 = 통과', () => {
  expect(isForbidden({ projectId: 'citadel-math-test', databaseURL: 'https://citadel-math-test-default-rtdb.firebaseio.com', authDomain: 'citadel-math-test.firebaseapp.com' })).toBe(false);
  expect(isForbidden({ projectId: 'demo-citadel-test', databaseURL: 'http://127.0.0.1:9000/?ns=demo-citadel-test-default-rtdb' })).toBe(false);
  expect(isForbidden(undefined)).toBe(false);
});
