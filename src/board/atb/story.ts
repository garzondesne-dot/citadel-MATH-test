// 📜 게시판 던전 스토리 문구 (요청 #64 · 원본 = STORY-LINES-v1.md · 손발 #1 복사 대기) — 순수 데이터 · 비어 있으면 화면이 자리만 둠
//   enter = 등장(조우 말풍선 · 요청 #69) · rage = 분노 들어갈 때 · down = 쓰러질 때(결과 직전)
export type LineK = 'enter' | 'rage' | 'down';
export const BOSS_LINES: Partial<Record<number, Partial<Record<LineK, string>>>> = {};
export const bossLine = (no: number, k: LineK): string | null => BOSS_LINES[no]?.[k] ?? null;
/** 같은 차시 두 번째부터 = 조우 · 정찰 짧게 (요청 #69 · 이 폰 기록 · 판을 한 번이라도 끝내면) */
const MET = (no: number) => `atb-met:${no}`;
export function metBefore(no: number): boolean { try { return localStorage.getItem(MET(no)) === '1'; } catch { return false; } }
export function markMet(no: number): void { try { localStorage.setItem(MET(no), '1'); } catch { /* 무시 */ } }
/** ⏱ 조우 · 정찰 길이 (ms) · 처음 / 다시 */
export const INTRO = { meet: 2500, scout: 10000, meetShort: 1000, scoutShort: 5000, count: 3000 } as const;
