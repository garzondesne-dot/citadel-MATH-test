// 📜 게시판 던전 보스 대사 (요청 #64 · 원본 = docs/board-atb/STORY-LINES-v1.md 2절) — 문구는 과목 팩(SUBJ.quests[차시].say)에만 · 없으면 화면이 자리만 둠
//   enter = 등장(조우 말풍선 · 요청 #69) · rage = 분노 들어갈 때 · down = 쓰러질 때(결과 직전)
import { SUBJ } from '../../engine/subject';
export type LineK = 'enter' | 'rage' | 'down';
export const bossLine = (no: number, k: LineK): string | null => SUBJ.quests?.[no]?.say?.[k] ?? null;
/** 같은 차시 두 번째부터 = 조우 · 정찰 짧게 (요청 #69 · 이 폰 기록 · 판을 한 번이라도 끝내면) */
const MET = (no: number) => `atb-met:${no}`;
export function metBefore(no: number): boolean { try { return localStorage.getItem(MET(no)) === '1'; } catch { return false; } }
export function markMet(no: number): void { try { localStorage.setItem(MET(no), '1'); } catch { /* 무시 */ } }
/** ⏱ 조우 · 정찰 길이 (ms) · 처음 / 다시 */
export const INTRO = { meet: 2500, scout: 10000, meetShort: 1000, scoutShort: 5000, count: 3000 } as const;
