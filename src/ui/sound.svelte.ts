// 🔊 효과음 · 🎵 배경음 켜기 · 끄기 (#161 속성 소리 · B5 소리 탭 = 둘 따로 · 이 기기 기억 localStorage 'citadel-sound')
import { artUrl, SFX } from './manifest';
import { paperOn } from './submit.svelte';
export type SoundPref = { sfx: boolean; bgm: boolean };
const KEY = 'citadel-sound';
function load(): SoundPref { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { sfx: v.sfx !== false, bgm: v.bgm !== false }; } catch { /* 없음 */ } return { sfx: true, bgm: true }; }
export const soundPref = $state<SoundPref>(typeof localStorage !== 'undefined' ? load() : { sfx: true, bgm: true });
export function setSound(p: Partial<SoundPref>): void { Object.assign(soundPref, p); try { localStorage.setItem(KEY, JSON.stringify(soundPref)); } catch { /* 사생활 창 */ } }
const pool = new Map<string, HTMLAudioElement>();
/** 마지막에 낸 효과음 (시험용) */
export const sfxLog: string[] = [];
/** 🔊 번갈아 내는 소리 (정식 「번갈아」 방식 · 📜 2026-11-14 선생님 「지금 거랑 B C 사용해 줘」 = 🛡 방패 막는 소리 3개) */
const ROTATE: Record<string, string[]> = { block: ['block', 'blockB', 'blockC'] };
const turn: Record<string, number> = {};
export function sfx(k: string, vol = 0.7): void {
  const rot = ROTATE[k]; if (rot) { const n = turn[k] ?? 0; turn[k] = n + 1; k = rot[n % rot.length]!; }
  sfxLog.push(k); if (sfxLog.length > 20) sfxLog.shift();
  if (!soundPref.sfx || paperOn() || typeof Audio === 'undefined' || !SFX[k]) return; // 📝 제출 모드 = 소리 없음
  let a = pool.get(k); if (!a) { a = new Audio(artUrl(SFX[k]!)); pool.set(k, a); }
  try { a.currentTime = 0; a.volume = vol; void a.play().catch(() => { /* 아직 화면을 누르지 않음 */ }); } catch { /* 무시 */ }
}
