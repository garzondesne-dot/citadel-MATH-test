// 💥 몬스터 공격 등록 표 (#152 · DECISIONS 「💥 v1.0 몬스터 공격 다양화」) — 차시 팩 monsters[id].attack / boss.attack(번갈아) = 이 표의 id
//   공통 약속: 문제 · 보기 · 고른 답 · 정답은 안 바뀜 · 효과 시간 ≤ 지금 멈춤 시간(lock) · 레이아웃 0(transform · 덮개만) · 깜빡임 ≤ 3번/초
//              집중 · 정찰 · 기호 톡 중엔 공격 없음 · 알림은 장면 띠 안 · 손으로 안 풀어도 시간이 지나면 저절로
//   lockInput = 효과 동안 답 입력을 막는가 (멈춤 · 파지직) · gesture = 손풀기 몸짓(있으면 일찍 풀림)
//   새 공격(#161) = 여기에 한 줄 + 화면 효과(ui/battle/AttackFx.svelte) 한 갈래
import type { LessonPack, Step } from '../model/types';
import { SUBJ } from '../engine/subject';

//   효과 시간 = attackMs (모두 3초 · 분노 4초 · 2026-11-13) · ms 칸은 옛 기록(쓰지 않음)
//   elem = 속성(#161 · 정식 상태이상 8 = 장면 띠 몬스터 → 용사 이펙트 · 용사 머리 위 상태 그림 · 속성 소리) · special = 던전 특수(그 차시 보스 셋째 공격)
//   손풀기 몸짓 = 겹치지 않게 하나씩: rub 문지르기 · tap4 톡톡 · hold 꾹 · swipe 좌우 쓸기 · dtap 두 번 톡 · touch 손가락 대기(닿은 곳만 보임 · 일찍 안 끝남) · drag 끌어다 꽂기
export type Elem = 'stun' | 'freeze' | 'bind' | 'burn' | 'poison' | 'shock' | 'confuse' | 'sleep';
export interface AttackDef { id: string; name: string; icon: string; tag: string; lockInput: boolean; elem: Elem; gesture?: 'rub' | 'tap4' | 'hold' | 'swipe' | 'dtap' | 'touch' | 'drag'; ms?: number }
export const ATTACKS: Record<string, AttackDef> = {
  pause: { id: 'pause', name: '멈춤', icon: '⏸', tag: '💥 몬스터 공격!', lockInput: true, elem: 'stun' },
  glitch: { id: 'glitch', name: '파지직', icon: '⚡', tag: '⚡ 파지직 공격!', lockInput: true, elem: 'shock' },
  fog: { ms: 3000, id: 'fog', name: '안개', icon: '🌫', tag: '🌫 안개 공격!', lockInput: false, gesture: 'rub', elem: 'sleep' },
  ice: { ms: 3000, id: 'ice', name: '얼음', icon: '🧊', tag: '🧊 얼음 공격!', lockInput: false, gesture: 'tap4', elem: 'freeze' },
  fire: { ms: 3000, id: 'fire', name: '화염', icon: '🔥', tag: '🔥 화염 공격!', lockInput: false, gesture: 'hold', elem: 'burn' },
  smash: { id: 'smash', name: '강타', icon: '💢', tag: '💢 강타!', lockInput: false, elem: 'stun' },
  // #161 새 6
  confuse: { id: 'confuse', name: '혼란', icon: '🌀', tag: '🌀 혼란 공격!', lockInput: false, elem: 'confuse' },
  wind: { id: 'wind', name: '바람', icon: '🌪', tag: '🌪 바람 공격!', lockInput: false, elem: 'stun' },
  poison: { id: 'poison', name: '독', icon: '☠️', tag: '☠️ 독 공격!', lockInput: false, elem: 'poison' },
  bind: { ms: 3000, id: 'bind', name: '속박', icon: '⛓', tag: '⛓ 속박 공격!', lockInput: true, gesture: 'swipe', elem: 'bind' },
  sleep: { ms: 3000, id: 'sleep', name: '수면', icon: '💤', tag: '💤 수면 공격!', lockInput: false, gesture: 'dtap', elem: 'sleep' },
  dark: { ms: 3000, id: 'dark', name: '어둠', icon: '🌑', tag: '🌑 어둠 공격!', lockInput: false, gesture: 'touch', elem: 'confuse' },
  // #161 던전 특수 2 (그 차시 보스만 · 짝 표 둘 다음 셋째 · 🔒 자물쇠 뺌)
  mirror: { id: 'mirror', name: '반사', icon: '🪞', tag: '🪞 반사 공격!', lockInput: false, elem: 'confuse' },
  // 🔒 자물쇠 = 뺌 (📜 2026-11-14 선생님 「A 뺌」 · 머리 e1880f6 · 9차시 보스 = 짝 표 둘만)
  scale: { id: 'scale', name: '저울', icon: '⚖️', tag: '⚖️ 저울 공격!', lockInput: false, elem: 'stun' },
};
/** 갤러리 · 시험 순서 (지금 6 → 새 6 → 특수 3) */
export const ATTACK_IDS = Object.keys(ATTACKS);
/** 효과 시간 (ms) = 모든 공격 3초 · 😡 분노 4초 (2026-11-13 선생님 「B1」 · 정식 멈춤 시간(보스 단계마다 길어짐)은 쓰지 않음 · 손으로 푸는 공격은 풀면 그대로 일찍 끝남) */
export const ATTACK_MS = 3000, ATTACK_MS_STRONG = 4000;
export const attackMs = (_a?: AttackDef, _lockSec?: number, strong = false) => (strong ? ATTACK_MS_STRONG : ATTACK_MS);
/** 세기: 몬스터 체력 50% 아래 = 강(분노) · 아니면 약 */
export const attackStrong = (hp: { left: number; max: number } | null | undefined) => !!hp && hp.max > 0 && hp.left > 0 && hp.left / hp.max < 0.5;
export const attackDef = (id: string | undefined) => ATTACKS[id || ''] ?? ATTACKS.pause!;
/** 보스 공격 목록 = 짝 표 둘 + 그 차시 던전 특수(있으면) · 돌아가며 */
//   던전 특수 = 과목 팩 SUBJ.specialAttacks[차시 번호] (⚙ 스위치 틀 · 차시 번호를 엔진에 두지 않음)
export function bossAttacks(L: LessonPack): string[] {
  const sp = SUBJ.specialAttacks?.[String(L.no)];
  return [...(L.boss?.attack || []), ...(sp && ATTACKS[sp] ? [sp] : [])];
}
/** 이 단계 · k번째 공격의 종류 (보스 = 목록을 차례로) */
export function attackOf(L: LessonPack, step: Step | null, k: number): AttackDef {
  if (!step) return ATTACKS.pause!;
  if (step.kind === 'boss') { const a = bossAttacks(L); return attackDef(a.length ? a[((k % a.length) + a.length) % a.length] : 'pause'); }
  return attackDef(L.monsters[step.id]?.attack);
}
