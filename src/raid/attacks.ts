// 💥 몬스터 공격 등록 표 (#152 · DECISIONS 「💥 v1.0 몬스터 공격 다양화」) — 차시 팩 monsters[id].attack / boss.attack(번갈아) = 이 표의 id
//   공통 약속: 문제 · 보기 · 고른 답 · 정답은 안 바뀜 · 효과 시간 ≤ 지금 멈춤 시간(lock) · 레이아웃 0(transform · 덮개만) · 깜빡임 ≤ 3번/초
//              집중 · 정찰 · 기호 톡 중엔 공격 없음 · 알림은 장면 띠 안 · 손으로 안 풀어도 시간이 지나면 저절로
//   lockInput = 효과 동안 답 입력을 막는가 (멈춤 · 파지직) · gesture = 손풀기 몸짓(있으면 일찍 풀림)
//   새 공격(#161) = 여기에 한 줄 + 화면 효과(ui/battle/AttackFx.svelte) 한 갈래
import type { LessonPack, Step } from '../model/types';

export interface AttackDef { id: string; name: string; icon: string; tag: string; lockInput: boolean; gesture?: 'rub' | 'tap4' | 'hold' }
export const ATTACKS: Record<string, AttackDef> = {
  pause: { id: 'pause', name: '멈춤', icon: '⏸', tag: '💥 몬스터 공격!', lockInput: true },
  glitch: { id: 'glitch', name: '파지직', icon: '⚡', tag: '⚡ 파지직 공격!', lockInput: true },
  fog: { id: 'fog', name: '안개', icon: '🌫', tag: '🌫 안개 공격!', lockInput: false, gesture: 'rub' },
  ice: { id: 'ice', name: '얼음', icon: '🧊', tag: '🧊 얼음 공격!', lockInput: false, gesture: 'tap4' },
  fire: { id: 'fire', name: '화염', icon: '🔥', tag: '🔥 화염 공격!', lockInput: false, gesture: 'hold' },
  smash: { id: 'smash', name: '강타', icon: '💢', tag: '💢 강타!', lockInput: false },
};
export const attackDef = (id: string | undefined) => ATTACKS[id || ''] ?? ATTACKS.pause!;
/** 이 단계 · k번째 공격의 종류 (보스 = 목록을 차례로) */
export function attackOf(L: LessonPack, step: Step | null, k: number): AttackDef {
  if (!step) return ATTACKS.pause!;
  if (step.kind === 'boss') { const a = L.boss?.attack || []; return attackDef(a.length ? a[((k % a.length) + a.length) % a.length] : 'pause'); }
  return attackDef(L.monsters[step.id]?.attack);
}
