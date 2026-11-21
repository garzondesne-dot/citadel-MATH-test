// ⚡ #94 각성 해금 연출 = 학생 · 용사마다 한 번 (기록 칸): 학생 = accounts/{반}/{번호}/awk/{용사} = 처음 본 시각(본인 칸 · 규칙 그대로) · 교사 · 🧪 · 체험판 = 이 기기
import type { Store } from '../model/types';
import { meBound } from '../store/meSync';
const LK = 'citadel-v1-awk-seen';
const local = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(LK) || '{}') || {}; } catch { return {}; } };
export function awkSeen(hero: number): boolean {
  const b = meBound(); if (b) return !!b.S.get(`accounts/${b.cls}/${b.num}/awk/${hero}`);
  return !!local()[hero];
}
export function markAwkSeen(hero: number, S?: Store): void {
  const b = meBound(); if (b) { b.S.set(`accounts/${b.cls}/${b.num}/awk/${hero}`, b.S.now()); return; }
  try { localStorage.setItem(LK, JSON.stringify({ ...local(), [hero]: S?.now() ?? Date.now() })); } catch { /* */ }
}
