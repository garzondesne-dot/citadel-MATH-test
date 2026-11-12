<script lang="ts">
  import { onMount } from 'svelte';
  // ✏ 필기 (#119 ⑮ · 정식 ink.js): 누르면 곧바로 화면 어디든 · 색 3 · 지우개 · 모두 지움 · 끔 · 저장 안 함 · 다음 단계로 넘어가면 저절로 지움
  const { step, onclose }: { step: number; onclose: () => void } = $props();
  const COLORS = ['#e5484d', '#2f7de1', '#f5b84a'];
  let cv: HTMLCanvasElement;
  let color = $state(COLORS[0] as string), erase = $state(false);
  let ctx: CanvasRenderingContext2D | null = null, down = false, last: [number, number] | null = null;
  const size = () => { if (!cv) return; const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; ctx = cv.getContext('2d'); ctx?.scale(r, r); };
  const clear = () => ctx?.clearRect(0, 0, cv.width, cv.height);
  onMount(size);
  let lastStep = -2;
  $effect(() => { if (lastStep !== -2 && step !== lastStep) clear(); lastStep = step; });
  function pt(e: PointerEvent): [number, number] { return [e.clientX, e.clientY]; }
  function draw(e: PointerEvent) {
    if (!down || !ctx) return;
    const p = pt(e);
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color; ctx.lineWidth = erase ? 36 : 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(...(last ?? p)); ctx.lineTo(...p); ctx.stroke(); last = p;
  }
</script>

<svelte:window onresize={size} />
<canvas bind:this={cv} class="ink" aria-label="필기 판" onpointerdown={(e) => { down = true; last = pt(e); cv.setPointerCapture(e.pointerId); draw(e); }} onpointermove={draw} onpointerup={() => { down = false; last = null; }}></canvas>
<div class="inkbar" role="toolbar" aria-label="필기 도구">
  {#each COLORS as c (c)}<button type="button" class:on={!erase && color === c} aria-label="색 {c}" style:--c={c} onclick={() => { color = c; erase = false; }}></button>{/each}
  <button type="button" class="tx" class:on={erase} onclick={() => (erase = !erase)}>🧽 지우개</button>
  <button type="button" class="tx" onclick={clear}>🗑 모두 지움</button>
  <button type="button" class="tx" onclick={onclose}>✕ 필기 끔</button>
</div>

<style>
  .ink { position: absolute; inset: 0; z-index: 7; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  .inkbar { position: absolute; left: 50%; top: 10cqh; transform: translateX(-50%); z-index: 9; display: flex; gap: 0.8cqw; align-items: center; padding: 0.8cqh 1cqw; border-radius: 999px; background: rgba(8, 9, 12, 0.88); border: 1px solid rgba(255, 255, 255, 0.2); }
  .inkbar button { height: 6cqh; min-width: 6cqh; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.2); background: var(--c, rgba(255, 255, 255, 0.06)); color: #fff; font: 700 2.2cqh var(--font); cursor: pointer; }
  .inkbar button.tx { padding: 0 1.2cqw; }
  .inkbar button.on { border-color: #fff; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3); }
</style>
