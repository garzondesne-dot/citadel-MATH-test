// 🛡 📜 게시판 던전 요청 #39 용사 피격 긴장감 = 만든 소리 (파일 없음 · Web Audio) + 진동 + 가장자리 단계
import { synth } from '../../sound.svelte';
import type { AtkClass } from '../../../board/atb/tune';

/** 남은 체력 → 가장자리 붉은 기운 단계 (0 = 없음 · 3 = 30% 아래 맥박(📜 #75) · 4 = 15% 아래 맥박 진하게 · 📜 #79 ① 70% · 50% 단계 없앰) */
export const edgeLv = (ratio: number): 0 | 3 | 4 => (ratio < 0.15 ? 4 : ratio < 0.3 ? 3 : 0);
/** 맞을 때 번쩍 진하기 = 받은 피해 비율 (최대 체력 대비) · 0.35 ~ 1 */
export const flashA = (dmg: number, maxHp: number): number => Math.max(0.35, Math.min(1, 0.35 + (dmg / Math.max(1, maxHp)) * 2.6));
/** 심장 박동 간격(초) · 진동 = 짧게 2번 */
export const BEAT = { every: 3, buzz: [40, 110, 40] as number[] };
/** 쉭 = 마지막 1.5초 · 3 · 2 · 1 숫자 = 마지막 3초 */
export const WHOOSH_SEC = 1.5, COUNT_SEC = 3;

export function vib(p: number | number[]): void { try { navigator.vibrate?.(p); } catch { /* 무시 */ } }

/** 💓 쿵-쿵 (낮은 사인 2번 · 작게) */
export function heartbeat(vol = 0.35): void {
  synth('heartbeat', (c, out) => {
    const t0 = c.currentTime;
    for (const [dt, f, a] of [[0, 62, 1], [0.24, 54, 0.7]] as const) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t0 + dt); o.frequency.exponentialRampToValueAtTime(f, t0 + dt + 0.08);
      g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(a, t0 + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2);
      o.connect(g).connect(out); o.start(t0 + dt); o.stop(t0 + dt + 0.25);
    }
  }, vol);
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer { if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf; const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (noiseBuf = b); }

/** 💨 쉭 = sec 동안 점점 커짐 · 광역 = 낮고 큼 · 단일 = 높고 날카로움 · 특수 = 웅웅(보라) → 멈춤 함수 */
export function whoosh(cls: AtkClass, sec = WHOOSH_SEC, vol = 0.45): () => void {
  return synth(`whoosh-${cls}`, (c, out) => {
    const t0 = c.currentTime, g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(cls === 'aoe' ? 1 : 0.75, t0 + sec); g.connect(out);
    const srcs: AudioScheduledSourceNode[] = [];
    if (cls === 'special') {
      for (const f of [98, 147]) { const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lfo.frequency.value = 6; lg.gain.value = f * 0.04; lfo.connect(lg).connect(o.frequency); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; o.connect(lp).connect(g); o.start(); lfo.start(); srcs.push(o, lfo); }
    } else {
      const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = cls === 'aoe' ? 0.8 : 4;
      bp.frequency.setValueAtTime(cls === 'aoe' ? 180 : 1800, t0); bp.frequency.exponentialRampToValueAtTime(cls === 'aoe' ? 420 : 4200, t0 + sec);
      s.connect(bp).connect(g); s.start(); srcs.push(s);
    }
    const end = t0 + sec + 0.25; for (const x of srcs) x.stop(end);
    return () => { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.03); for (const x of srcs) { try { x.stop(n + 0.12); } catch { /* 이미 멈춤 */ } } };
  }, vol);
}

/** 🛡 챙 (반응 막기로 표적 원이 깨짐) = 높은 금속 울림 */
export function clang(vol = 0.5): void {
  synth('clang', (c, out) => {
    const t0 = c.currentTime;
    for (const [f, a] of [[1320, 0.6], [1980, 0.35], [2640, 0.2]] as const) { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(a, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.65); }
  }, vol);
}
