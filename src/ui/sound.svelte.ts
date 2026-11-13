// 🔊 효과음 · 🎵 배경음 켜기 · 끄기 (#161 속성 소리 · B5 소리 탭 = 둘 따로 · 이 기기 기억 localStorage 'citadel-sound')
import { artUrl, SFX } from './manifest';
export type SoundPref = { sfx: boolean; bgm: boolean };
const KEY = 'citadel-sound';
function load(): SoundPref { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { sfx: v.sfx !== false, bgm: v.bgm !== false }; } catch { /* 없음 */ } return { sfx: true, bgm: true }; }
export const soundPref = $state<SoundPref>(typeof localStorage !== 'undefined' ? load() : { sfx: true, bgm: true });
export function setSound(p: Partial<SoundPref>): void { Object.assign(soundPref, p); try { localStorage.setItem(KEY, JSON.stringify(soundPref)); } catch { /* 사생활 창 */ } }
const pool = new Map<string, HTMLAudioElement>();
/** 마지막에 낸 효과음 (시험용) */
export const sfxLog: string[] = [];
export function sfx(k: string, vol = 0.7): void {
  sfxLog.push(k); if (sfxLog.length > 20) sfxLog.shift();
  if (!soundPref.sfx || typeof Audio === 'undefined' || !SFX[k]) return;
  let a = pool.get(k); if (!a) { a = new Audio(artUrl(SFX[k]!)); pool.set(k, a); }
  try { a.currentTime = 0; a.volume = vol; void a.play().catch(() => { /* 아직 화면을 누르지 않음 */ }); } catch { /* 무시 */ }
}
