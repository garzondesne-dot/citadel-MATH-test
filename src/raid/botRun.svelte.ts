// 🤖 가상 학생 스위치 (교사 폰 · 🧪 테스트 수업만 · 이 탭이 살아 있는 동안) — 리모컨 화면을 떠났다 와도 그대로 돎
import type { LessonPack, Store } from '../model/types';
import { BOT_DEF, BOT_MAX, startBots, type Bots } from './bots';

export const bot = $state({ on: false, n: BOT_DEF, code: '' });
let cur: Bots | null = null;
export function setBots(S: Store, L: LessonPack, code: string, on: boolean, n = bot.n): void {
  cur?.stop(); cur = null;
  bot.n = Math.max(1, Math.min(BOT_MAX, Math.round(n))); bot.on = on; bot.code = on ? code : '';
  const g = globalThis as { __botSpeed?: number; __botAcc?: number }; // 시험 고리(e2e): 빠르게 · 맞힘 비율
  if (on) cur = startBots(S, L, code, bot.n, { speed: g.__botSpeed || 1, ...(g.__botAcc != null ? { acc: g.__botAcc, accBoss: g.__botAcc } : {}) });
}
/** 수업이 닫히거나 다른 수업이면 끔 */
export function botsOff(): void { cur?.stop(); cur = null; bot.on = false; bot.code = ''; }
