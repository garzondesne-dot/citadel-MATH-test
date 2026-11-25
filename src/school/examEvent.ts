// ⚔ 기말 대비 기간 장치 (📜 2026-11-25 · 머리 🔨 · 선생님 「기말고사 대비 기간임을 보여 주는 강렬한 장치」 → 「출정 컷인 + D-day 띠」 · 「시험지 = 진짜 마왕」)
//   기간 = 시험 날짜 15일 전 ~ 시험 날짜 (KST 날짜만 셈 · UTC 금지) · 다음 날부터 모두 사라짐
//   시험 날짜 = school/examDate (교사 ⚙ 한 칸 · 'off' = 끔) · 서버 값이 없으면 우리 학교 처음 값 2026-12-11(수학 기말 · 📜 11/26) · 학교판 = 처음 비어 있음 · 체험판 = 숨김(부르는 쪽)
//   ✏ 글(이름 · 대사 · 띠 · 안내 · 하늘)은 아래 EXAM_TXT 한 곳 (📜 11/25 「무지의 마왕」으로 다듬는 중 · 확정 글은 머리가 보냄 → 여기만 고침)
import type { Store } from '../model/types';
import { SCHOOL_BUILD } from '../channel';

export const EXAM_PATH = 'school/examDate';
export const EXAM_DEFAULT = '2026-12-11'; // 📜 11/26 선생님: 수학 기말 = 12월 11일(금) · 시험기간 시작 12/8
export const EXAM_SPAN = 15; // 시험 날짜 15일 전부터

/** ✏ 글 · 연출 값 한 곳 */
export const EXAM_TXT = {
  boss: '무지의 마왕',
  band: (d: number) => (d === 1 ? '📄 무지의 마왕 · 내일이다' : `📄 무지의 마왕까지 D-${d}`),
  bandDay: '📄 D-DAY · 오늘 무지의 마왕이 강림한다!',
  bandSub: '혼자 대비 = 🏰 성채 · 🎯 허수아비 · 📄 무지의 마왕 모의전',
  cutTitle: '⚔ 기말 대비 작전 개시',
  cut: [
    { who: '현자 올드윈', say: '지금까지 너희가 쓰러뜨린 몬스터는… 모두 그림자였다.' },
    { who: '', say: '' }, // ② 어둠 · 지지직 → 시험지가 떠오르고 눈을 뜸 (글 없음)
    { who: '현자 올드윈', say: (date: string) => `무지의 마왕은 ${md(date)}, 교실에서 기다린다.` },
    { who: '현자 올드윈', say: '무지의 마왕을 이길 힘은… 오직 너의 실력뿐이다.' },
  ],
  sky: { rgb: '220, 40, 30', max: 0.42, blend: 'multiply' as const }, // 🌇 캠프 빛 = 점점 붉어짐(세기 0 ~ 1 × max · 위쪽만 · 글자 칸은 그대로 · 📜 11/25 컨셉 v2)
  mock: {
    name: '📄 무지의 마왕 모의전',
    notice: '📄 이 시험지는 지금까지 수업 · 허수아비 문제 은행에서 컴퓨터가 무작위로 뽑은 연습이에요. 선생님이 고른 문제도, 기말고사 힌트도 전혀 없어요. 오직 내 실력을 재 보는 곳!',
    head: (n: number, k: number) => `🎲 문제 은행 ${n}문항 중 무작위 ${k}문항`,
    result: '이 점수는 연습이에요 · 성적에 안 들어가요 · 숫자가 바뀌어 몇 번이든 다시 도전',
    win: '무지의 마왕을 쓰러뜨렸다!',
    timeUp: '⏰ 시간 초과 · 계속 풀어도 돼요',
  },
} as const;
const md = (d: string) => { const [, m, dd] = d.split('-'); return `${Number(m)}월 ${Number(dd)}일`; };

/** KST 날짜 'YYYY-MM-DD' */
export const kstDate = (t: number) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const dayNo = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86400e3);
const ok = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/** 지금 쓰는 시험 날짜 ('' = 없음 · 끔) */
export function examDateOf(S: Pick<Store, 'get'> | null, school = SCHOOL_BUILD): string {
  const v = S?.get<string>(EXAM_PATH);
  if (v === 'off') return '';
  if (ok(v)) return v;
  return school ? '' : EXAM_DEFAULT;
}
/** 남은 날 (시험 날 = 0 · 지남 = 음수) · 날짜 없음 = null */
export const daysLeft = (date: string, now: number): number | null => (ok(date) ? dayNo(date) - dayNo(kstDate(now)) : null);
/** 기간 안? (15일 전 ~ 시험 날) */
export const inPeriod = (date: string, now: number) => { const d = daysLeft(date, now); return d != null && d >= 0 && d <= EXAM_SPAN; };
/** 🌇 캠프 빛 세기 0 ~ 1 (📜 11/25 컨셉 v2): (14 − 남은 날) ÷ 13 · 남은 날 = 시험 날 0시(KST)까지 소수 · 끊김 없이 · 시험 날 KST 18:00 부터 0 */
export function skyLevel(date: string, now: number): number {
  if (!ok(date)) return 0;
  const t0 = Date.parse(`${date}T00:00:00+09:00`), left = (t0 - now) / 86400e3;
  if (left > EXAM_SPAN || now >= t0 + 18 * 3600e3) return 0;
  return Math.max(0, Math.min(1, (14 - left) / 13));
}
export const skyColor = (lv: number) => `rgba(${EXAM_TXT.sky.rgb}, ${(EXAM_TXT.sky.max * lv).toFixed(3)})`;
export const bandText = (date: string, now: number) => { const d = daysLeft(date, now); return d == null || d < 0 || d > EXAM_SPAN ? '' : d === 0 ? EXAM_TXT.bandDay : EXAM_TXT.band(d); };

/** 컷인 본 기록 (기기 · 학생 · 시험 날짜마다 1번) */
export const cutKey = (who: string, date: string) => `citadel-exam-cut|${who}|${date}`;
export function cutSeen(who: string, date: string): boolean { try { return !!localStorage.getItem(cutKey(who, date)); } catch { return false; } }
export function markCut(who: string, date: string) { try { localStorage.setItem(cutKey(who, date), '1'); } catch { /* 사생활 창 */ } }
