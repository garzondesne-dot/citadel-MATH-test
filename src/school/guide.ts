// 📊 길잡이 (📜 2026-11-17 선생님 「길잡이 추천대로」 · 머리 🔨 #30 · 설계 hero-v2 docs/handoff/design/live-dash/README.md)
//   교사 폰 리모컨 「지금」 칸 윗줄 한 줄 띠 · 사실 한 줄 + 할 일 하나 · 저절로 실행하지 않음 · TV · 학생 폰에는 안 나옴
//   이번 판 = ④ 몬스터 사이 「이 속도면 +n분 → 🎯 복습으로」 · ⑤ 형성평가 앞 「약한 개념 → 📺 칸 다시 띄우기」
import type { LessonPack, Room, Step } from '../model/types';
import { bossLive, bossHp, cleared, stepIdx } from '../raid/raid';
import { concOf } from './records';
import { lessonCounts, T0 } from './ltime';
import { sentKey, sentOf } from './sendReview';

export const OVER_MIN = 5; // ④ 끝 시각을 5분 이상 넘으면
export const WEAK = 0.5; // ⑤ 오늘 첫 시도 50% 아래
export const FOLD_MS = 8000; // 8초 뒤 📊 점으로 접힘
export const LESSON_MIN = 50; // 끝 시각이 없으면 연 뒤 50분

export type Guide = { k: 'time' | 'weak'; text: string; act: string; why: string[]; mon?: string; concept?: string };

const done = (L: LessonPack, R: Room, s: Step, now: number) => (s.kind === 'monster' && !L.monsters[s.id]) /* 이 팩에 몬스터가 없는 칸 = 건너뜀 (sendReview leftSteps 와 같음) */ || !!sentOf(R)[sentKey(s)] || (s.kind === 'monster' && !!L.monsters[s.id] && cleared(L, R, s.id, now)) || (s.kind === 'boss' && !!L.boss && bossHp(L, R, now).won);
const no = (s: Step | undefined) => (/^(개념|문제) \d+/.exec(s?.title ?? '') || [s?.title ?? ''])[0];

/** 단계 하나 예상(분) · ltime 기본값과 같은 표 */
export function stepMin(L: LessonPack, R: Room | null, s: Step, mons = lessonCounts(L).mons): number {
  if (s.kind === 'intro') return T0.intro;
  if (s.kind === 'concept') return T0.concept;
  if (s.kind === 'monster') { const m = mons.find((x) => x.id === s.id); return T0.mon + (m ? m.n * (m.chain ? T0.chainStage : T0.item) : 0); }
  if (s.kind === 'boss') return (R ? bossLive(L, R).items : Number(L.boss?.items) || 0) * T0.bossItem;
  return 0;
}

/** 남은 단계 예상(분) — 지금 단계는 절반 · 끝난 · 보낸 · 수업 밖 단계 빼고 · 마무리 더함 · k = 이 차시 실측 ÷ 기본 예상 (실측 3번 이상일 때) */
export function leftMin(L: LessonPack, R: Room, now: number, k = 1): number {
  const i0 = Math.max(0, stepIdx(R)), mons = lessonCounts(L).mons;
  let m = 0;
  L.steps.forEach((s, i) => { if (i < i0 || s.later || done(L, R, s, now)) return; m += stepMin(L, R, s, mons) * (i === i0 ? 0.5 : 1); });
  return (m + T0.wrap) * k;
}

/** ⏰ 끝 시각 = 수업 마감(교시 끝 · 연 뒤 50분) · 없으면 방을 만든 뒤 50분 */
export const endAt = (R: Room) => Number(R.state.deadline) || Number(R.meta.created) + LESSON_MIN * 60e3;

/** ④ 이 속도면 +n분 → 🎯 남은 몬스터 중 맨 뒤를 복습으로 (짝 형성평가 문항도 같이 빠짐을 보여 줌) */
export function timeGuide(L: LessonPack, R: Room, now: number, k = 1): Guide | null {
  const i0 = stepIdx(R), cur = L.steps[i0];
  if (i0 < 0 || !cur || cur.kind === 'boss' || R.state.rest) return null;
  if (cur.kind === 'monster' && L.monsters[cur.id] && !done(L, R, cur, now)) return null; // 몬스터 푸는 중 = 아님 (몬스터 사이에만)
  const left = leftMin(L, R, now, k), over = (now + left * 60e3 - endAt(R)) / 60e3;
  if (over < OVER_MIN) return null;
  const cand = L.steps.filter((s, i) => i > i0 && s.kind === 'monster' && !s.later && L.monsters[s.id] && !done(L, R, s, now));
  const t = cand[cand.length - 1];
  if (!t) return null;
  const pair = (L.boss?.links || []).map((m, i) => (m === t.id ? i + 1 : 0)).filter(Boolean);
  const hhmm = (ms: number) => { const d = new Date(ms + 9 * 3600e3); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  return {
    k: 'time', mon: t.id,
    text: `📊 이 속도면 +${Math.ceil(over)}분`,
    act: `🎯 ${no(t)} 복습으로`,
    why: [`남은 단계 예상 ${Math.round(left)}분${k !== 1 ? ' (이 차시 실측 반영)' : ''} · 끝 ${hhmm(endAt(R))}`, `남은 몬스터 중 맨 뒤 = ${t.title}`, pair.length ? `👑 형성평가 ${pair.join(' · ')}번도 같이 허수아비로 빠져요` : '형성평가 문항은 그대로예요'],
  };
}

/** ⑤ 남은 몬스터 없이 다음 싸움이 👑 형성평가 · 오늘 몬스터 첫 시도 50% 아래 개념 중 가장 낮은 것(형성평가에 그 개념 문항이 있을 때) → 📺 그 개념 칸 다시 띄우기 */
export function weakGuide(L: LessonPack, R: Room, ids: string[], now: number): Guide | null {
  const i0 = stepIdx(R), cur = L.steps[i0];
  if (i0 < 0 || !cur || cur.kind === 'boss' || R.state.rest || !L.boss) return null;
  const next = L.steps.find((s, i) => i >= i0 && !s.later && (s.kind === 'monster' || s.kind === 'boss') && !done(L, R, s, now)); // 다음 싸움 = 👑 (사이의 개념 · 정리 칸은 괜찮음)
  if (!next || next.kind !== 'boss') return null;
  const tags = L.boss.tags || [], drop = new Set(bossLive(L, R).drop), sum: Record<string, [number, number]> = {};
  for (const u of ids) Object.entries(concOf(L, R, u).conc).forEach(([c, [ok, n]]) => { const v = (sum[c] ||= [0, 0]); v[0] += ok; v[1] += n; });
  const weak = Object.entries(sum)
    .filter(([c, [, n]]) => n > 0 && tags.some((t, i) => t === c && !drop.has(i)) && L.steps.some((s) => s.kind === 'concept' && s.id === c))
    .map(([c, [ok, n]]) => ({ c, r: ok / n, ok, n }))
    .filter((x) => x.r < WEAK)
    .sort((a, b) => a.r - b.r)[0];
  if (!weak) return null;
  const cs = L.steps.find((s) => s.id === weak.c)!, items = tags.map((t, i) => (t === weak.c && !drop.has(i) ? i + 1 : 0)).filter(Boolean);
  return {
    k: 'weak', concept: weak.c,
    text: `📊 약한 개념 = ${no(cs)} · ${Math.round(weak.r * 100)}%`,
    act: `📺 ${no(cs)} 칸 다시 띄우기`,
    why: [`오늘 몬스터 첫 시도 ${weak.ok} / ${weak.n} 맞힘`, `👑 형성평가 ${items.join(' · ')}번이 이 개념`, `${cs.title}`],
  };
}

/** 띠 하나 고름 (단계마다 많아야 1개 · ④ 먼저) */
export const guideOf = (L: LessonPack, R: Room, ids: string[], now: number, k = 1): Guide | null => timeGuide(L, R, now, k) ?? weakGuide(L, R, ids, now);
