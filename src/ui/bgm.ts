// 🎵 배경음 한 곳 (📜 2026-11-14 「배경음 전부 되살림」 · 정식 js/engine/audio.js bgm() · duck() · bgmHold() 그대로 옮김)
//   자리 두 개: phone(학생 폰 = 첫 화면 · 개인 캠프 · 모루 창까지만) · tv(종합실 = 대기실 · 레이드 · 보스 · 승리 · 쉼터 · 놀이) — TV 곡이 있으면 TV 먼저
//   🎚 전투 음량 = scale (10% + 60% × (1 − 남은 체력)) · 부드럽게 따라감 · 🔉 duck = 시연 · 📄 문제 창 = 효과음 · 배경음 10%
//   ⏸ hold = 🎬 영상 · 📄 학습지 창 · 화면 숨김 · 🔇 배경음 끔 · 📝 제출 모드(폰) = 멈춤 · 🎉 승리 곡 = 한 번만
import { artUrl, BGM } from './manifest';
import { duckK, onSound, soundPref } from './sound.svelte';
import { paperOn } from './submit.svelte';
import { actx, WebTrack } from './webaudio';

/** 최대 음량 — 정식 bgm 0.16 : 효과음 0.25(0.28 × 0.9) 비율을 베타 효과음 0.7 에 맞춤 */
const MAX = 0.45;
const ONCE = ['win'];
type El = (HTMLAudioElement | WebTrack) & { _k?: string; _fade?: number };
const slot: { phone: string | null; tv: string | null } = { phone: null, tv: null };
const hold: Record<string, 1> = {};
let cur: El | null = null, fadeMs = 800, scale = 1, scaleT = 1, tick: ReturnType<typeof setInterval> | 0 = 0, winDone = '';

const hidden = () => typeof document !== 'undefined' && document.hidden;
function want(): string | null {
  const tv = slot.tv, k = tv !== null ? tv : paperOn() ? null : slot.phone;
  return !soundPref.bgm || hidden() || Object.keys(hold).length || !k || !BGM[k] ? null : k;
}
const vol = () => MAX * scale * duckK();
function fade(a: El, to: number, ms: number, done?: () => void) {
  const from = a.volume, t0 = Date.now(), id = (a._fade ?? 0) + 1; a._fade = id;
  const st = () => {
    if (a._fade !== id) return; // 새 페이드가 이어받음
    const k = Math.min(1, (Date.now() - t0) / ms);
    try { a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch { /* 무시 */ }
    if (k < 1) setTimeout(st, 40); else { a._fade = 0; done?.(); }
  };
  st();
}
function start(k: string): El | null {
  const c = actx(); // 🔇 Web Audio = iOS 무음 스위치를 따름 (<audio> 는 무시함) · 없으면 예전 <audio>
  if (!c && typeof Audio === 'undefined') return null;
  const a = (c ? new WebTrack(c, artUrl(BGM[k]!)) : Object.assign(new Audio(artUrl(BGM[k]!)), { preload: 'auto' })) as El; a._k = k; a.volume = 0;
  if (ONCE.includes(k)) a.addEventListener('ended', () => { if (cur === a) { cur = null; winDone = k; } });
  else a.loop = true;
  void a.play().catch(() => { /* 아직 화면을 누르지 않음 → 첫 터치 때 다시 */ });
  return a;
}
let queued = false;
/** 화면이 바뀌는 순간(첫 화면 → 캠프)에 끔 · 켬이 같이 오면 곡이 끊기지 않게 한 번에 */
function later(): void { if (queued) return; queued = true; queueMicrotask(() => { queued = false; apply(); }); }
function apply(): void {
  const k = want();
  if (k && ONCE.includes(k) && winDone === k && !cur) return; // 🎉 승리 = 한 번만
  if (cur && cur._k === k) { if (cur.paused) void cur.play().catch(() => {}); fade(cur, vol(), 400); return; }
  const old = cur; cur = null; if (old) fade(old, 0, fadeMs, () => old.pause());
  if (!k) return;
  winDone = ''; cur = start(k); if (cur) fade(cur, vol(), fadeMs);
}

/** where = 'phone' | 'tv' · k = 곡 자리(null = 없음) · scale = 🎚 전투 음량(0 ~ 1 · 없으면 1) */
export function bgm(k: string | null, where: 'phone' | 'tv' = 'phone', opt: { scale?: number; /** 곡 바꿈 교차 시간(ms · 없으면 0.8초) */ fadeMs?: number } = {}): void {
  fadeMs = opt.fadeMs ?? 800;
  const w = k || null, sc = opt.scale != null ? Math.max(0, Math.min(1, opt.scale)) : 1;
  if (slot[where] !== w) { slot[where] = w; if (sc !== scaleT) { scaleT = sc; scale = sc; } later(); }
  if (sc !== scaleT) { // 체력이 바뀌면 부드럽게
    scaleT = sc; if (tick) clearInterval(tick);
    tick = setInterval(() => { scale += (scaleT - scale) * 0.15; if (Math.abs(scaleT - scale) < 0.01) { scale = scaleT; clearInterval(tick); tick = 0; } if (cur && !cur._fade) try { cur.volume = vol(); } catch { /* 무시 */ } }, 80);
  }
}
/** ⏸ 이유가 하나라도 있으면 멈춤 (🎬 영상 · 📄 학습지 창) */
export function bgmHold(why: string, on: boolean): void { if (on) hold[why] = 1; else delete hold[why]; later(); }
/** 지금 상태 (시험용) */
export const bgmNow = () => ({ phone: slot.phone, tv: slot.tv, playing: cur?._k ?? null, paused: cur ? cur.paused : null, vol: cur ? +cur.volume.toFixed(3) : 0, hold: Object.keys(hold), scale: +scale.toFixed(2), duck: duckK() < 1 });

onSound(() => { if (cur && !cur._fade) try { cur.volume = vol(); } catch { /* 무시 */ } later(); }); // 🔇 끔 · 🔉 duck 이 바뀌면
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => apply()); // 화면 숨김이면 멈춤 · 돌아오면 다시
  document.addEventListener('pointerdown', () => { if (cur?.paused) void cur.play().catch(() => {}); }, { capture: true }); // 자동 재생이 막혔으면 첫 터치에
}
if (typeof window !== 'undefined') (window as unknown as { __bgm: unknown }).__bgm = bgmNow;
