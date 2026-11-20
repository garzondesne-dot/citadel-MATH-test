// 🤖 게시판 던전 ATB — 봇 (📜 설계안 v1 8절 교사 연습방 · 정리.md 8): 보통 학생 · 도전 기준 · 무작위 제출 · 오답 후 재도전
//   봇은 진짜 차시 팩 문제를 quiz.ts 로 풂(맞힘 = 정답 · 틀림 = 엉뚱한 답) → 사람과 같은 ⚡ · 금색 · 완주 · 4번째 오답 규칙
import type { Given, LessonPack, Question } from '../../model/types';
import { answerOf } from '../../raid/raid';
import { answer, easiestOf, nextOrigin, originsOf, questionsOf, startRun, type Origin, type Run } from './quiz';
import { T } from './tune';
import { alive, attack, canRole, canSkill, earn, roleAct, tick, useSkill, weak, type SkillK, type State } from './engine';

export type BotKind = 'normal' | 'ideal' | 'random' | 'retry';
export interface Bot { who: number; kind: BotKind; acc: number; think: [number, number]; run: Run | null; due: number; /** ATB 가 가득 찬 시각 (-1 = 아님) */ fullAt: number; done: Record<string, number>; os: Origin[]; seed: string; rnd: number }
const ACT_SEC = 3;
export const BOT_LABEL: Record<BotKind, string> = { normal: '보통 학생', ideal: '도전 기준(완벽)', random: '무작위 제출', retry: '오답 후 힌트 · 재도전' };
const r01 = (b: Bot) => { let a = (b.rnd += 0x6d2b79f5); a = Math.imul(a ^ (a >>> 15), a | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; };
export function newBot(L: LessonPack, who: number, kind: BotKind, seed = 1): Bot {
  const acc = kind === 'ideal' ? 1 : kind === 'random' ? 0.3 : kind === 'retry' ? 0.5 : 0.6; // 설계 방 모의실험 = 정답률 60%
  const think: [number, number] = kind === 'ideal' ? [12, 18] : kind === 'random' ? [4, 8] : [12, 24]; // 소문항 하나 평균 18초 (sim2.py sub_sec)
  return { who, kind, acc, think, run: null, due: 0, fullAt: -1, done: {}, os: originsOf(L), seed: `bot${who}`, rnd: seed * 97 + who * 13 };
}
const wrongOf = (q: Question): Given => (q.type === 'number' ? -999 : q.type === 'ox' ? !(q as { answer: boolean }).answer : q.type === 'multi' ? [] : q.type === 'choice' ? ((q as { answerIndex: number }).answerIndex + 1) % Math.max(2, (q as { choices: string[] }).choices.length) : '모름') as Given;
/** 봇 한 걸음 (dt 초): 문제 풀기 + ATB 가 차면 행동 */
export function botStep(L: LessonPack, S: State, b: Bot): void {
  const h = S.heroes[b.who]; if (!h || S.end) return;
  // 문제 (쓰러져도 풂 = 친구 ATB)
  // 🛡 실드가 떴는데 내 칸을 깰 표가 없음 + 지금 문제가 가장 쉬운 칸이 아님 → 가장 쉬운 칸으로 바꿈 (U3 막힘 안전망 · 길게 이어진 원문항에 묶이지 않게)
  { const ez = easiestOf(b.os); if (b.run && ez && b.run.mid !== ez.mid && S.shieldUp && h.ch < 1 && S.cells.some((c) => c.owner === b.who && !c.broken)) b.run = null; }
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
  if (h.down || h.atb < 1 || S.t < h.stunUntil) { b.fullAt = -1; return; }
  if (b.fullAt < 0) b.fullAt = S.t;
  const r = act(S, b, S.t - b.fullAt >= T.autoAtkDelay);
  if (r) b.fullAt = -1;
  if (r === 'skill') b.due += ACT_SEC; // 스킬 = 누르는 동안(약 3초) 문제를 못 풂 · 자동 일반 공격 = 풀이를 안 멈춤(요청 #11)
}
function act(S: State, b: Bot, canAtk: boolean): 'skill' | 'auto' | false {
  const h = S.heroes[b.who]!, R = h.s.role, can = (k: SkillK) => canSkill(S, b.who, k);
  const down = S.heroes.find((x) => x.down);
  if (down && can('revive') && useSkill(S, b.who, 'revive', down.id)) return 'skill';
  if (can('shield') && useSkill(S, b.who, 'equip')) return 'skill'; // ⚡ 내 스킬 = 실드 칸 깸
  if (can('aura') && S.target && !weak(S) && useSkill(S, b.who, 'aura')) return 'skill'; // 🛡 오라 방패 = 예고가 뜨면
  if (can('awk') && (weak(S) || !S.shieldUp) && useSkill(S, b.who, 'awk')) return 'skill';
  if (canRole(S, b.who)) {
    if (R === 'healer' && alive(S).some((x) => x.hp < x.s.maxHp * 0.55) && roleAct(S, b.who)) return 'skill';
    if (R === 'tank' && S.target && S.target.length === 1 && !S.heroes[S.target[0]!]!.cover && roleAct(S, b.who, S.target[0])) return 'skill';
    if (R === 'support') { const f = alive(S).filter((x) => x.id !== b.who && x.ch >= 2 && x.atb < 0.5)[0]; if (f && roleAct(S, b.who, f.id)) return 'skill'; }
  }
  const shieldHold = S.shieldUp && S.cells.some((c) => !c.broken); // 실드 중엔 충전 아낌(×0.3 · 실드 깨기용) · 약점 시간에 몰아침
  const keep = shieldHold && h.ch <= 1;
  if (!keep && (weak(S) || h.ch >= T.charge.max || !shieldHold)) {
    if (R === 'dealer' && can('role') && roleAct(S, b.who)) return 'skill';
    if (can('equip') && (weak(S) || h.ch >= 2) && useSkill(S, b.who, 'equip')) return 'skill';
  }
  if (!canAtk || (S.t < S.mirrorUntil && h.hp < h.s.maxHp * 0.6)) return false; // 8 거울빛 = 일반 공격이 되돌아옴 → 다친 봇은 문제를 풂(설정표 「그동안은 타이밍 바 대신 문제」)
  attack(S, b.who, 'ok', true); return 'auto'; // 📜 요청 #11 봇 = 늘 문제 푸는 중 → 자동 일반 공격(치명 없음)
}
/** 머리 없는 한 판 (시험 · 연습방 「봇 4 관전」 빨리 감기) */
export function simulate(L: LessonPack, S: State, bots: Bot[], o: { dt?: number; maxT?: number } = {}): State {
  const dt = o.dt ?? 0.1, maxT = o.maxT ?? 900;
  while (!S.end && S.t < maxT) { tick(S, dt); for (const b of bots) botStep(L, S, b); }
  return S;
}
