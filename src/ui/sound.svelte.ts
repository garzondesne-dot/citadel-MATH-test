// 🔊 효과음 · 🎵 배경음 켜기 · 끄기 (#161 속성 소리 · B5 소리 탭 = 둘 따로 · 이 기기 기억 localStorage 'citadel-sound')
import { artUrl, ELEM_FX, SFX } from './manifest';
import { actx } from './webaudio';
import { paperOn } from './submit.svelte';
import { playOnce } from './webaudio';
export type SoundPref = { sfx: boolean; bgm: boolean };
const KEY = 'citadel-sound';
// 🔇 학생 폰 = 배경음 처음 끔 (📜 2026-11-15 선생님 「긴급 패치」 · 안드로이드는 웹에서 무음 · 진동 모드를 알 수 없음) · 학생이 ⚙ 소리에서 켜면 그 폰 기억 · 이미 저장된 값(켠 학생)은 그대로
//   교사 폰(role=teacher · 내 캠프 from=me) · 종합실 TV(hall · tv) = 처음 켬 (예전 그대로) · 효과음은 모두 처음 켬
export const studentPhone = (): boolean => { if (typeof location === 'undefined') return false; const q = new URLSearchParams(location.search), r = q.get('role'); return !(r === 'teacher' || r === 'hall' || r === 'tv' || q.get('from') === 'me'); };
function load(): SoundPref { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { sfx: v.sfx !== false, bgm: v.bgm !== false }; } catch { /* 없음 */ } return { sfx: true, bgm: !studentPhone() }; }
export const soundPref = $state<SoundPref>(typeof localStorage !== 'undefined' ? load() : { sfx: true, bgm: true });
export function setSound(p: Partial<SoundPref>): void { Object.assign(soundPref, p); try { localStorage.setItem(KEY, JSON.stringify(soundPref)); } catch { /* 사생활 창 */ } fire(); }
// 🔉 duck (정식 audio.js · 2026-11-13 선생님 「전투 중에 시연 누르거나 문제 누르면 소리 음소거나 10%로」): 이유가 하나라도 있으면 효과음 · 배경음 모두 10%
const DUCK: Record<string, 1> = {};
export const duckK = () => (Object.keys(DUCK).length ? 0.1 : 1);
const subs: (() => void)[] = [];
/** 🔇 켜기 · 끄기나 duck 이 바뀌면 (배경음이 듣고 음량을 다시 맞춤) */
export function onSound(f: () => void): void { subs.push(f); }
function fire() { subs.forEach((f) => { try { f(); } catch { /* 무시 */ } }); }
export function duck(why: string, on: boolean): void { const was = duckK(); if (on) DUCK[why] = 1; else delete DUCK[why]; if (was !== duckK()) fire(); }
const pool = new Map<string, HTMLAudioElement>();
/** 마지막에 낸 효과음 (시험용) */
export const sfxLog: string[] = [];
if (typeof window !== 'undefined') (window as { __sfxLog?: string[] }).__sfxLog = sfxLog; // 시험 고리
/** 🔊 번갈아 내는 소리 (정식 「번갈아」 방식 · 📜 2026-11-14 선생님 「지금 거랑 B C 사용해 줘」 = 🛡 방패 막는 소리 3개) */
const ROTATE: Record<string, string[]> = { block: ['block', 'blockB', 'blockC'] };
const turn: Record<string, number> = {};
/** 🔇 이 화면 효과음 전부 끔 (📺 TV 「소리 끔」 = 공격 · 필살기 · 수업 사건 소리까지 · 📜 #44 ⑤ 선생님 「소리 없애야 되는데 왜 나오는 거야」) */
let muteAll = false;
export function setMuteAll(on: boolean): void { muteAll = on; }
/** 🎬 이유별 효과음 끔 (🐞 11/19 ③ A안: TV 🎬 영상이 열려 있는 동안 공격 · 맞음 소리 0 · 닫으면 되돌림 · 영상 소리 · 배경음 멈춤은 따로) */
const HUSH: Record<string, 1> = {};
export function hush(why: string, on: boolean): void { if (on) HUSH[why] = 1; else delete HUSH[why]; }
export const hushed = () => Object.keys(HUSH).length > 0;
export function sfx(k: string, vol = 0.7): void {
  const rot = ROTATE[k]; if (rot) { const n = turn[k] ?? 0; turn[k] = n + 1; k = rot[n % rot.length]!; }
  sfxLog.push(k); if (sfxLog.length > 20) sfxLog.shift();
  if (muteAll || hushed() || !soundPref.sfx || paperOn() || typeof Audio === 'undefined' || !SFX[k]) return; // 📝 제출 모드 = 소리 없음
  if (playOnce(artUrl(SFX[k]!), vol * duckK())) return; // 🔇 Web Audio = iOS 무음 스위치를 따름 · 없으면 아래 <audio>
  let a = pool.get(k); if (!a) { a = new Audio(artUrl(SFX[k]!)); pool.set(k, a); }
  try { a.currentTime = 0; a.volume = vol * duckK(); void a.play().catch(() => { /* 아직 화면을 누르지 않음 */ }); } catch { /* 무시 */ }
}

/** 🎛 만든 소리 (파일 없음 · Web Audio 로 합성 · 효과음 설정 · 끔 · 제출 모드 따름) → 멈추는 함수 (📜 게시판 던전 #39 심장 · 쉭 · 챙) */
export function synth(k: string, make: (c: AudioContext, out: GainNode) => (() => void) | void, vol = 0.5): () => void {
  sfxLog.push(k); if (sfxLog.length > 20) sfxLog.shift();
  if (muteAll || hushed() || !soundPref.sfx || paperOn()) return () => {};
  const c = actx(); if (!c) return () => {};
  const g = c.createGain(); g.gain.value = vol * duckK(); g.connect(c.destination);
  let stop: (() => void) | void; try { stop = make(c, g); } catch { /* 무시 */ }
  return () => { try { stop?.(); g.disconnect(); } catch { /* 무시 */ } };
}

/** 💥 몬스터 공격 종류 소리 (폰 · TV 같은 표 · 📜 #43) — 혼란 = 어질 · 어둠 = 먹물 · 독 = 거품 · 수면 = 하품 · 파지직 = 지지직 · 나머지 = 속성 소리 */
const ATK_SFX: Record<string, string> = { confuse: 'dizzy', dark: 'ink', poison: 'poison', sleep: 'yawn', glitch: 'glitch' };
export const atkSfx = (d: { id: string; elem?: string }): string => ATK_SFX[d.id] ?? (d.id === 'wind' ? ELEM_FX.gale : ELEM_FX[d.elem ?? ''])?.sfx ?? 'smash';
/** 🖥 TV 맞는 소리 = 「hurt」 작게 · 여럿이 몰리면 0.15초에 한 번 (📜 #43) */
let hurtAt = 0;
export function tvHurt(now = Date.now()): boolean { if (now - hurtAt < 150) return false; hurtAt = now; sfx('hurt', 0.35); return true; }
