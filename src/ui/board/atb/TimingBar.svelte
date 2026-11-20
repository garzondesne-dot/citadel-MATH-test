<script lang="ts">
  // ⚔ 일반 공격 타이밍 바 (정리.md 3: 실패 0 · 성공 ×1 · 치명 ×1.5)
  //   📜 11/20 요청 #3 ⑥ = 판마다 성공 칸 자리 · 폭 · 치명 칸 · 바늘 빠르기가 바뀜(범위 = tune.ts T.timingZone)
  //   멈추기 단추는 따로 없음 → 「공격」 단추가 그 자리에서 「멈춤」으로 바뀜(AtbBattle 이 stop() 을 부름 · 손가락 안 옮김)
  import { onDestroy } from 'svelte';
  import { timingOf, timingZone, type Timing } from '../../../board/atb/engine';
  const { ondone }: { ondone: (t: Timing) => void } = $props();
  const z = timingZone(Math.random), dir0 = Math.random() < 0.5 ? 0 : 1; // 바늘 출발 = 왼쪽 · 오른쪽 무작위
  let p = $state(dir0), t0 = performance.now(), raf = 0, done = false, res = $state<Timing | ''>('');
  const loop = () => { const c = ((performance.now() - t0) / z.ms + dir0) % 2; p = c < 1 ? c : 2 - c; raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop); onDestroy(() => cancelAnimationFrame(raf));
  export function stop() { if (done) return; done = true; cancelAnimationFrame(raf); const r = timingOf(p, z); res = r; try { navigator.vibrate?.(r === 'crit' ? [30, 30, 60] : r === 'ok' ? 30 : 10); } catch { /* 무시 */ } setTimeout(() => ondone(r), 260); }
  // 🧪 화면 시험: 구간 한가운데에서 멈춤
  (globalThis as unknown as { __atbTiming?: (k: Timing) => void }).__atbTiming = (k) => { p = k === 'crit' ? (z.crit[0] + z.crit[1]) / 2 : k === 'ok' ? (z.ok[0] < z.crit[0] - 0.01 ? (z.ok[0] + z.crit[0]) / 2 : (z.crit[1] + z.ok[1]) / 2) : z.ok[0] > 0.1 ? z.ok[0] / 2 : (z.ok[1] + 1) / 2; stop(); };
</script>

<div class="tb" role="status" aria-label="타이밍 바 · 「멈춤」을 눌러요" data-k="atb-timing" data-ms={z.ms}>
  <div class="bar" class:hit={res === 'ok'} class:crit={res === 'crit'} class:miss={res === 'miss'}>
    <i class="ok" style:left="{z.ok[0] * 100}%" style:width="{(z.ok[1] - z.ok[0]) * 100}%"></i>
    <i class="cz" style:left="{z.crit[0] * 100}%" style:width="{(z.crit[1] - z.crit[0]) * 100}%"></i>
    <b class="mk" style:left="{p * 100}%"></b>
  </div>
  {#if res}<p class="rs {res}">{res === 'crit' ? '💥 치명!' : res === 'ok' ? '명중!' : '빗나감'}</p>{/if}
</div>

<style>
  .tb { position: absolute; left: 50%; bottom: 27%; transform: translateX(-50%); width: min(70%, 520px); display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 30; pointer-events: none; }
  .bar { position: relative; width: 100%; height: 28px; border-radius: 14px; background: #2a1a10; border: 3px solid #e2b04a; box-shadow: 0 0 14px #000a; overflow: hidden; }
  .bar.crit { animation: pop 0.26s; border-color: #fff3a0; box-shadow: 0 0 22px #ffd34d; } .bar.hit { border-color: #9fd0ff; } .bar.miss { filter: grayscale(0.7); }
  @keyframes pop { 50% { transform: scale(1.06); } }
  .ok { position: absolute; top: 0; bottom: 0; background: #5aa9ffaa; }
  .cz { position: absolute; top: 0; bottom: 0; background: linear-gradient(#ffe68a, #f2b630); box-shadow: 0 0 8px #ffd34d; }
  .mk { position: absolute; top: -4px; bottom: -4px; width: 6px; margin-left: -3px; background: #fff; box-shadow: 0 0 6px #fff; border-radius: 3px; }
  .rs { margin: 0; font: 900 26px var(--font); text-shadow: 0 2px 0 #000, 0 0 10px #000; } .rs.crit { color: #ffe066; font-size: 34px; } .rs.ok { color: #9fd0ff; } .rs.miss { color: #bbb; }
</style>
