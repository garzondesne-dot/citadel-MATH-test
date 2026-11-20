// 🤖 게시판 던전 ATB — 봇 (📜 설계안 v1 8절 교사 연습방 · 정리.md 8): 보통 학생 · 도전 기준 · 무작위 제출 · 오답 후 재도전
//   봇은 진짜 차시 팩 문제를 quiz.ts 로 풂(맞힘 = 정답 · 틀림 = 엉뚱한 답) → 사람과 같은 ⚡ · 금색 · 완주 · 4번째 오답 규칙
import type { Given, LessonPack, Question } from '../../model/types';
import { answerOf } from '../../raid/raid';
import { answer, easiestOf, nextOrigin, originsOf, questionsOf, startRun, type Origin, type Run } from './quiz';
import { alive, attack, canBreak, canRole, earn, revive, roleAct, skill, tick, weak, type Hold, type State, type Timing } from './engine';

export type BotKind = 'normal' | 'ideal' | 'random' | 'retry';
export interface Bot { who: number; kind: BotKind; acc: number; think: [number, number]; run: Run | null; due: number; done: Record<string, number>; os: Origin[]; seed: string; rnd: number }
const ACT_SEC = 3;
export const BOT_LABEL: Record<BotKind, string> = { normal: '보통 학생', ideal: '도전 기준(완벽)', random: '무작위 제출', retry: '오답 후 힌트 · 재도전' };
const r01 = (b: Bot) => { let a = (b.rnd += 0x6d2b79f5); a = Math.imul(a ^ (a >>> 15), a | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; };
export function newBot(L: LessonPack, who: number, kind: BotKind, seed = 1): Bot {
  const acc = kind === 'ideal' ? 1 : kind === 'random' ? 0.3 : kind === 'retry' ? 0.5 : 0.6; // 설계 방 모의실험 = 정답률 60%
  const think: [number, number] = kind === 'ideal' ? [12, 18] : kind === 'random' ? [4, 8] : [12, 24]; // 소문항 하나 평균 18초 (sim2.py sub_sec)
  return { who, kind, acc, think, run: null, due: 0, done: {}, os: originsOf(L), seed: `bot${who}`, rnd: seed * 97 + who * 13 };
}
const wrongOf = (q: Question): Given => (q.type === 'number' ? -999 : q.type === 'ox' ? !(q as { answer: boolean }).answer : q.type === 'multi' ? [] : q.type === 'choice' ? ((q as { answerIndex: number }).answerIndex + 1) % Math.max(2, (q as { choices: string[] }).choices.length) : '모름') as Given;
/** 봇 한 걸음 (dt 초): 문제 풀기 + ATB 가 차면 행동 */
export function botStep(L: LessonPack, S: State, b: Bot): void {
  const h = S.heroes[b.who]; if (!h || S.end) return;
  // 문제 (쓰러져도 풂 = 친구 ATB)
  // 🛡 실드가 떴는데 내 칸을 깰 표가 없음 + 지금 문제가 가장 쉬운 칸이 아님 → 가장 쉬운 칸으로 바꿈 (U3 막힘 안전망 · 길게 이어진 원문항에 묶이지 않게)
  { const ez = easiestOf(b.os); if (b.run && ez && b.run.mid !== ez.mid && S.shieldUp && h.tickets < 1 && S.cells.some((c) => c.owner === b.who && !c.broken)) b.run = null; }
  if (!b.run) { const prefer = S.shieldUp && S.cells.some((c) => c.owner === b.who && !c.broken) && b.kind !== 'ideal' ? easiestOf(b.os)?.mid : null; const o = nextOrigin(b.os, b.done, prefer); if (o) { b.run = startRun(o.mid, b.who + Math.floor(r01(b) * 7)); b.due = S.t + b.think[0] + r01(b) * (b.think[1] - b.think[0]); } }
  if (b.run && S.t >= b.due) {
    const q = questionsOf(L, b.run, b.seed)[b.run.k];
    if (q) {
      const ok = r01(b) < b.acc, o = answer(L, b.run, b.seed, ok ? answerOf(q) : wrongOf(q));
      earn(S, b.who, o.earn); b.run = o.run;
      if (o.earn.done) { b.done[b.run.mid] = (b.done[b.run.mid] || 0) + 1; b.run = null; }
      b.due = S.t + b.think[0] + r01(b) * (b.think[1] - b.think[0]);
    } else b.run = null;
  }
  if (h.down || h.atb < 1 || S.t < h.stunUntil) return;
  if (act(S, b)) b.due += ACT_SEC; // 행동하는 동안(약 3초)은 문제를 못 풂 (sim2.py atk_sec) · 행동 안 함(거울빛 기다림) = 문제를 계속 풂
}
const timingRoll = (b: Bot): Timing => { const x = r01(b); return b.kind === 'ideal' ? (x < 0.6 ? 'crit' : 'ok') : x < 0.15 ? 'miss' : x < 0.4 ? 'crit' : 'ok'; };
const holdRoll = (b: Bot): Hold => { const x = r01(b); return b.kind === 'ideal' ? 'best' : x < 0.2 ? 'miss' : x < 0.55 ? 'best' : 'ok'; };
function act(S: State, b: Bot): boolean {
  const h = S.heroes[b.who]!, R = h.s.role;
  const down = S.heroes.find((x) => x.down);
  if (down && S.revives > 0 && h.zaps.length >= 1 && revive(S, b.who, down.id)) return true;
  if (canBreak(S, b.who) && skill(S, b.who, holdRoll(b))) return true;
  if (canRole(S, b.who)) {
    if (R === 'healer' && alive(S).some((x) => x.hp < x.s.maxHp * 0.55) && roleAct(S, b.who)) return true;
    if (R === 'tank' && S.target && S.target.length === 1 && !S.heroes[S.target[0]!]!.cover && roleAct(S, b.who, S.target[0])) return true;
    if (R === 'support') { const f = alive(S).filter((x) => x.id !== b.who && x.zaps.length >= 2 && x.atb < 0.5)[0]; if (f && roleAct(S, b.who, f.id)) return true; }
  }
  const shieldHold = S.shieldUp && S.cells.some((c) => !c.broken); // 실드 중엔 ⚡ 아낌(×0.3) · 약점 시간에 몰아침
  if (h.zaps.length && (weak(S) || h.zaps.length >= 5 || (!shieldHold && h.zaps.length >= 3)) && skill(S, b.who, holdRoll(b))) return true;
  if (S.t < S.mirrorUntil && h.hp < h.s.maxHp * 0.6) return false; // 8 거울빛 = 일반 공격이 되돌아옴 → 다친 봇은 문제를 풂(설정표 「그동안은 타이밍 바 대신 문제」)
  attack(S, b.who, timingRoll(b)); return true;
}
/** 머리 없는 한 판 (시험 · 연습방 「봇 4 관전」 빨리 감기) */
export function simulate(L: LessonPack, S: State, bots: Bot[], o: { dt?: number; maxT?: number } = {}): State {
  const dt = o.dt ?? 0.1, maxT = o.maxT ?? 900;
  while (!S.end && S.t < maxT) { tick(S, dt); for (const b of bots) botStep(L, S, b); }
  return S;
}
