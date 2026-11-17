// 👩‍🏫 체험판 v1.0 차시 (📜 2026-11-17 선생님 「체험판 만들자 · 테스트모드를 따로 만들어서 구동하게 만들면 체험판」 → 「12+3 · 규칙 그대로」 · 머리 🔨 #33)
//   ⚔ 12차시 귀류법 = 풀 체험 (운영 「(12차시) 차시팩_v3_형성평가짝」 그대로 묶음 · 서버 안 닿음)
//   🪶 3차시 포함 관계 = 가벼운 체험 (내장 차시 set-03)
//   다른 점 = CLAUDE.md 「👩‍🏫 체험판 규칙」 목록뿐
import RAW12 from './ex-12.json?raw';
import CASTLE1 from './castle-1.json?raw'; // 🏰 성채 1층 (운영 eval-1 그대로)
import type { TrialCfg } from '../../../model/subject';

export const TRIAL: TrialCfg = {
  cards: [
    { id: 'ex-12', ic: '⚔', name: '12차시 · 귀류법', tag: '풀 체험', sub: '도움 3단 · 익명 풀이 · 고비 · 개념 체크 · 소레이드 · 힌트 주기 · 서술형 · 형성평가 짝' },
    { id: 'set-03', ic: '🪶', name: '3차시 · 포함 관계', tag: '가벼운 체험', sub: '기본 레이드 · 영상' },
  ],
  raw: { 'ex-12': RAW12 },
  castle: CASTLE1,
  keep: {
    'ex-12': ['intro', 'c1', 'm1', 'c2', 'm2', 'm3', 'boss'], // 문제 2 = 🎯 복습으로 넘긴 것으로 (형성평가 짝 문항 빠짐) · 📝 오늘 정리 뺌
    'set-03': ['intro', 'c1', 'm1', 'c2', 'm2', 'boss'],
  },
  restAfter: { 'ex-12': 'm1', 'set-03': 'm1' },
  room: {
    'ex-12': { fresh1: true, sent: ['m2'] }, // 첫 판 = 한 번 더 판 1 (교과서 원문 숫자를 공개 체험판에 그대로 쓰지 않음)
    'set-03': { bossItems: 3 }, // 형성평가 3문항 (원래 수업은 7문항)
  },
};
