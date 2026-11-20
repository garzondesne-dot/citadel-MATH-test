<script lang="ts">
  // ⚔ 일반 공격 타이밍 바 (정리.md 3: 실패 0 · 성공 ×1 · 치명 ×1.5) · 표시가 오가다가 누르면 멈춤 · 구간 = tune.ts
  import { onDestroy } from 'svelte';
  import { T } from '../../../board/atb/tune';
  import { timingOf, type Timing } from '../../../board/atb/engine';
  const { ondone }: { ondone: (t: Timing) => void } = $props();
  let p = $state(0), t0 = performance.now(), raf = 0, done = false;
  const loop = () => { const e = (performance.now() - t0) / T.timingMs, c = e % 2; p = c < 1 ? c : 2 - c; raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop); onDestroy(() => cancelAnimationFrame(raf));
  const stop = () => { if (done) return; done = true; cancelAnimationFrame(raf); const r = timingOf(p); try { if (r === 'crit') navigator.vibrate?.(40); } catch { /* 무시 */ } setTimeout(() => ondone(r), 260); };
  // 🧪 화면 시험: 구간 한가운데에서 멈춤
  (globalThis as unknown as { __atbTiming?: (k: Timing) => void }).__atbTiming = (k) => { p = k === 'crit' ? (T.timingCrit[0] + T.timingCrit[1]) / 2 : k === 'ok' ? T.timingOk[0] + 0.02 : 0.05; stop(); };
</script>

<div class="tb" role="dialog" aria-label="타이밍 바 · 멈추기를 눌러요" data-k="atb-timing">
  <div class="bar">
    <i class="ok" style:left="{T.timingOk[0] * 100}%" style:width="{(T.timingOk[1] - T.timingOk[0]) * 100}%"></i>
    <i class="crit" style:left="{T.timingCrit[0] * 100}%" style:width="{(T.timingCrit[1] - T.timingCrit[0]) * 100}%"></i>
    <b class="mk" style:left="{p * 100}%"></b>
  </div>
  <button type="button" class="stop" data-k="atb-stop" onpointerdown={stop}>멈추기!</button>
</div>

<style>
  .tb { position: absolute; left: 50%; bottom: 26%; transform: translateX(-50%); width: min(70%, 520px); display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 30; }
  .bar { position: relative; width: 100%; height: 26px; border-radius: 13px; background: #2a1a10; border: 3px solid #e2b04a; box-shadow: 0 0 14px #000a; overflow: hidden; }
  .ok { position: absolute; top: 0; bottom: 0; background: #5aa9ff99; }
  .crit { position: absolute; top: 0; bottom: 0; background: linear-gradient(#ffe68a, #f2b630); }
  .mk { position: absolute; top: -4px; bottom: -4px; width: 6px; margin-left: -3px; background: #fff; box-shadow: 0 0 6px #fff; border-radius: 3px; }
  .stop { min-height: 48px; padding: 0 28px; border-radius: 12px; border: 3px solid #8a5a1a; background: linear-gradient(#ffd77a, #e9a93a); color: #3a2205; font: 800 20px var(--font); box-shadow: 0 4px 0 #8a5a1a; }
</style>
