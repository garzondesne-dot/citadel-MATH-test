<script lang="ts">
  import { onMount } from 'svelte';
  // ✏ 필기 (#119 ⑮ · #139 = 정식 js/raid/ink.js 그대로): 펜 빨강 · 파랑 · 검정 · 🖍 형광펜 · 🧽 지우개 | ↶ 되돌리기(한 획씩) · 🗑 모두 지움 · ✕ 필기 끔
  //   도구 = 화면 오른쪽 가운데 세로 · 획 목록으로 저장해 ↶ 는 마지막 획을 빼고 다시 그림 · 저장 · 전송 없음 · 다음 단계로 넘어가면 저절로 지움
  const { step, onclose }: { step: number; onclose: () => void } = $props();
  type Pen = { k: string; c: string | null; w: number; name: string };
  const PENS: Pen[] = [{ k: 'red', c: '#e5383b', w: 4, name: '빨강' }, { k: 'blue', c: '#1f6feb', w: 4, name: '파랑' }, { k: 'black', c: '#111', w: 4, name: '검정' }, { k: 'hi', c: 'rgba(255,221,0,.38)', w: 22, name: '형광펜' }, { k: 'er', c: null, w: 30, name: '지우개' }];
  type Stroke = { c: string | null; w: number; pts: [number, number][] };
  let cv: HTMLCanvasElement;
  let pen = $state<Pen>(PENS[0]!);
  let strokes: Stroke[] = [], cur: Stroke | null = null;
  let n = $state(0); // 획 수 (↶ · 🗑 흐림)
  let g: CanvasRenderingContext2D | null = null;
  function line(s: Stroke) {
    if (!g || !s.pts.length) return;
    g.save(); g.globalCompositeOperation = s.c ? 'source-over' : 'destination-out'; g.strokeStyle = s.c || '#000'; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(s.pts[0]![0], s.pts[0]![1]); s.pts.forEach(([x, y]) => g!.lineTo(x, y)); if (s.pts.length === 1) g.lineTo(s.pts[0]![0] + 0.1, s.pts[0]![1]); g.stroke(); g.restore();
  }
  const redraw = () => { if (!g) return; g.clearRect(0, 0, cv.width, cv.height); strokes.forEach(line); };
  const size = () => { if (!cv) return; const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); g = cv.getContext('2d'); g?.setTransform(d, 0, 0, d, 0, 0); redraw(); };
  const at = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const undo = () => { strokes.pop(); n = strokes.length; redraw(); };
  const clear = () => { strokes = []; n = 0; redraw(); };
  onMount(size);
  let lastStep = -2;
  $effect(() => { if (lastStep !== -2 && step !== lastStep) clear(); lastStep = step; });
  function down(e: PointerEvent) { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { c: pen.c, w: pen.w, pts: [at(e)] }; strokes.push(cur); n = strokes.length; line(cur); }
  function move(e: PointerEvent) { if (!cur) return; cur.pts.push(at(e)); redraw(); }
  const up = () => { cur = null; };
</script>

<svelte:window onresize={size} />
<canvas bind:this={cv} class="ink" aria-label="필기 판" data-strokes={n} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}></canvas>
<div class="inkbar" role="toolbar" aria-label="필기 도구" aria-orientation="vertical">
  {#each PENS as p (p.k)}<button type="button" class="b {p.k}" class:on={pen.k === p.k} aria-pressed={pen.k === p.k} aria-label={p.name} title={p.name} onclick={() => (pen = p)}>{p.k === 'hi' ? '🖍' : p.k === 'er' ? '🧽' : ''}</button>{/each}
  <hr />
  <button type="button" class="b" aria-label="되돌리기 (한 획)" title="되돌리기" disabled={!n} onclick={undo}>↶</button>
  <button type="button" class="b" aria-label="모두 지움" title="모두 지움" disabled={!n} onclick={clear}>🗑</button>
  <button type="button" class="b" aria-label="필기 끔" title="필기 끔" onclick={onclose}>✕</button>
</div>

<style>
  .ink { position: absolute; inset: 0; z-index: 7; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  /* 정식 .ink-tool: 오른쪽 가운데 세로 (위 막대 · 아래 조작 막대를 가리지 않음) */
  .inkbar { position: absolute; right: 1.2cqw; top: 50%; transform: translateY(-50%); z-index: 9; display: flex; flex-direction: column; align-items: center; gap: 1cqh; padding: 1.4cqh 0.7cqw; border-radius: 2.4cqh; background: rgba(8, 9, 12, 0.9); border: 1px solid rgba(255, 255, 255, 0.2); max-height: 72cqh; }
  .inkbar hr { width: 100%; border: 0; border-top: 1.5px solid rgba(255, 255, 255, 0.25); margin: 0.2cqh 0; }
  .b { width: 6.4cqh; height: 6.4cqh; min-width: 44px; min-height: 44px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.08); color: #fff; font: 700 2.8cqh var(--font); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .b.on { border-color: #fff; box-shadow: 0 0 0 3px var(--accent); }
  .b:disabled { opacity: 0.35; cursor: default; }
  .b.red { background: #e5383b; } .b.blue { background: #1f6feb; } .b.black { background: #111; } .b.hi { background: rgba(255, 221, 0, 0.38); }
</style>
