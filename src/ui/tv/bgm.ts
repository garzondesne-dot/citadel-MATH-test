// 🎵 교실 TV 배경음 (#142-2 · 정식 audio.js bgm() 의 쉼터 부분): 쉼터 화면 · 놀이마다 곡 하나 · 0.8초 겹쳐 바꿈 · 반복
//   학생 폰은 수업 중 배경음 없음(DECISIONS 「🎵 배경음 다시 넣기」) · TV 🔊 를 끄면 멈춤 · 🙊 눈치 곡 = 「Music by JDSherbert」(TV 아래 표기)
import { artUrl, BGM } from '../manifest';
const VOL = 0.5;
let cur: { k: string; a: HTMLAudioElement } | null = null;
function fade(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = a.volume, t0 = performance.now();
  const go = () => { const k = Math.min(1, (performance.now() - t0) / ms); try { a.volume = from + (to - from) * k; } catch { /* 무시 */ } if (k < 1) requestAnimationFrame(go); else done?.(); };
  requestAnimationFrame(go);
}
/** k = 곡 자리(rest · bal · rev · quiz · nun · td) · null = 끔 */
export function tvBgm(k: string | null, on: boolean): void {
  if (typeof Audio === 'undefined') return;
  const want = on && k && BGM[k] ? k : null;
  if ((cur?.k ?? null) === want) return;
  const old = cur; cur = null;
  if (old) fade(old.a, 0, 800, () => old.a.pause());
  if (!want) return;
  const a = new Audio(artUrl(BGM[want]!)); a.loop = true; a.volume = 0;
  a.play().catch(() => { /* 아직 화면을 누르지 않음 → 다음 번에 */ });
  cur = { k: want, a }; fade(a, VOL, 800);
}
/** 지금 무슨 곡 (시험용) */
export const tvBgmNow = () => (cur ? { k: cur.k, paused: cur.a.paused } : null);
