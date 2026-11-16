import type { LessonPack, Room, Step } from '../../model/types';
import { isChain } from '../../raid/raid';
import { CLASSES, isBeta as isBetaCls } from '../../school/school';

// 📱 교사 폰 「오늘 흐름」 · 단계 색 막대 (#119 ⑬ ⑭) — 화면 표시만(규칙 아님)
//   분 = 팩의 min(#132 · 입력판) · 없으면 어림값(도입 3 · 개념 2 · 문제 5 · ⚔ 소레이드 9 · 👑 형성평가 6) · 색 = 묶음(도입 · 개념 · 문제 · 소레이드 · 형성평가)
export const COLOR = { intro: '#5b6478', concept: '#c9902e', monster: '#c9902e', chain: '#b8662f', boss: '#a8423f' } as const;
export type Kind = keyof typeof COLOR;
export const kindOf = (L: LessonPack, R: Room | null, s: Step): Kind => s.kind === 'monster' && L.monsters[s.id]?.chain && (!R || isChain(L, R, s.id)) ? 'chain' : s.kind;
const MIN: Record<Kind, number> = { intro: 3, concept: 2, monster: 5, chain: 9, boss: 6 };
/** 분 = 차시 팩의 min (#132 · 선생님 입력판) · 없으면 어림값 */
export const minOf = (L: LessonPack, R: Room | null, s: Step) => (s.later ? 0 : s.min ?? MIN[kindOf(L, R, s)]);
export const total = (L: LessonPack, R: Room | null) => L.steps.reduce((a, s) => a + minOf(L, R, s), 0);
/** 짧은 이름 (막대 · 단추): 「개념 1 · ○○」 → 「개념 1」 · 「형성평가 · 그림자 드래곤」 → 「형성평가」 */
export const short = (s: Step | null | undefined) => (s ? (s.kind === 'boss' ? '형성평가' : s.title.split(' · ')[0] ?? s.title) : '');
const num = (s: Step) => /(\d+)/.exec(short(s))?.[1] ?? '';
/** 흐름 묶음 (5줄 안쪽): 소레이드 · 형성평가 앞에서 끊음 */
export function groups(L: LessonPack, R: Room | null) {
  const out: { kind: Kind; label: string; min: number; from: number }[] = [];
  let cur: { kinds: Kind[]; steps: Step[]; from: number } | null = null;
  const flush = () => {
    if (!cur || !cur.steps.length) return;
    const cs = cur.steps.filter((s) => s.kind === 'concept'), ms = cur.steps.filter((s) => s.kind === 'monster');
    const rng = (xs: Step[], w: string) => (xs.length ? `${w} ${num(xs[0] as Step)}${xs.length > 1 ? `~${num(xs[xs.length - 1] as Step)}` : ''}` : '');
    const kind: Kind = cur.kinds.includes('boss') ? 'boss' : cur.kinds.includes('chain') ? 'chain' : cur.kinds.includes('intro') && cur.kinds.length === 1 ? 'intro' : 'concept';
    const label = kind === 'boss' ? '👑 형성평가' : kind === 'intro' ? '도입' : [rng(cs, '개념'), rng(ms, '문제') + (kind === 'chain' ? ' ⚔' : '')].filter(Boolean).join(' · ');
    out.push({ kind, label, min: cur.steps.reduce((a, s) => a + minOf(L, R, s), 0), from: cur.from });
    cur = null;
  };
  L.steps.forEach((s, i) => {
    if (s.later) return;
    const k = kindOf(L, R, s);
    if (k === 'chain' && cur && cur.kinds.includes('monster') && !cur.kinds.includes('chain')) {
      // 소레이드 바로 앞 개념은 소레이드 묶음으로 (개념 4 · 문제 4~7 ⚔)
      const tail: Step[] = [];
      while (cur.steps.length && cur.steps[cur.steps.length - 1]?.kind === 'concept') { tail.unshift(cur.steps.pop() as Step); cur.kinds.pop(); }
      const from = L.steps.indexOf(tail[0] ?? s);
      flush();
      if (tail.length) cur = { kinds: tail.map(() => 'concept' as Kind), steps: tail, from };
    }
    if (k === 'boss') flush();
    if (k === 'concept' && cur && cur.kinds.includes('chain')) flush();
    if (!cur) cur = { kinds: [], steps: [], from: i };
    cur.kinds.push(k); cur.steps.push(s);
    if (k === 'boss') flush();
  });
  flush();
  return out;
}

// 🧪 수업 탭 테스트 (📜 2026-11-17 #21): 📱 리모컨만 · 🖥 종합실 + 리모컨 한 화면 · 🎒 학생 폰
export type TestMode = 'remote' | 'tv' | 'stu';
export const TEST_MODES: { k: TestMode; ic: string; t: string; sub: string }[] = [
  { k: 'remote', ic: '📱', t: '리모컨만', sub: '교사 폰 + 종합실 + 테스트 반 폰' },
  { k: 'tv', ic: '🖥', t: '종합실 + 리모컨', sub: '이 폰 한 화면' },
  { k: 'stu', ic: '🎒', t: '학생 폰', sub: '학생 화면 + 진행 리모컨' },
];
/** 🧪 테스트 전용 반 = 수업 탭 · 시간표 · 대시보드 반 목록에서 숨김 (우리 학교 = 1-6 · 계정 · 명단 그대로) */
export const hiddenCls = (S: import('../../model/types').Store | null, c: string) => isBetaCls(S, c);
/** 📱 리모컨만 = 테스트 반 학생 계정만 들어옴 · 테스트 반이 없는 학교판 = 'test'(아무도 못 들어옴 · 🤖 봇만) */
export const testCls = (S: import('../../model/types').Store | null) => CLASSES.find((c) => isBetaCls(S, c)) ?? 'test';
