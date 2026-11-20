<script lang="ts">
  // 📈 좌표평면 그래프 (📜 2026-11-20 함수 단원 · graph.ts 의 그림 글 → SVG) — 학생 · 교사 시연 · 리모컨 · TV 가 같은 그림
  //   색 = 글자 색(currentColor)을 따라감 → 보기를 고르면(금빛 바탕) 선도 같이 바뀜 · 두 번째 그래프 = 파랑 · -- = 점선
  import { endsOf, parseGraph, samplePlot, type GraphSpec } from '../graph';
  const { src, big = false }: { src: string; big?: boolean } = $props();
  const W = 120, P = 8;
  const spec = $derived.by((): GraphSpec | null => { try { return parseGraph(src); } catch { return null; } });
  const err = $derived.by(() => { try { parseGraph(src); return ''; } catch (e) { return (e as Error).message; } });
  const sx = (x: number, s: GraphSpec) => P + ((x - s.win[0]) / (s.win[1] - s.win[0])) * (W - 2 * P);
  const sy = (y: number, s: GraphSpec) => P + ((s.win[3] - y) / (s.win[3] - s.win[2])) * (W - 2 * P);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const path = (pts: [number, number][], s: GraphSpec) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${r1(sx(x, s))} ${r1(sy(y, s))}`).join('');
  const ticks = (a: number, b: number) => { const out: number[] = []; if (b - a > 24) return out; for (let t = Math.ceil(a); t <= Math.floor(b); t++) if (t !== 0) out.push(t); return out; };
  const ox = $derived(spec ? Math.min(Math.max(sx(0, spec), P), W - P) : 0), oy = $derived(spec ? Math.min(Math.max(sy(0, spec), P), W - P) : 0);
  const label = $derived(spec ? `그래프 ${spec.plots.map((p) => (p.kind === 'fn' ? p.src : p.kind === 'pts' ? `점 ${p.pts.map((q) => `(${q.join(', ')})`).join(' ')}` : `원 중심 (${p.c.join(', ')}) 반지름 ${p.r}`)).join(', ')}` : '그래프');
</script>

<svg class="graph" class:big viewBox="0 0 {W} {W}" role="img" aria-label={label} data-k="graph">
  {#if spec}
    <g class="grid">{#each ticks(spec.win[0], spec.win[1]) as t (t)}<line x1={sx(t, spec)} x2={sx(t, spec)} y1={P} y2={W - P} />{/each}{#each ticks(spec.win[2], spec.win[3]) as t (t)}<line y1={sy(t, spec)} y2={sy(t, spec)} x1={P} x2={W - P} />{/each}</g>
    <g class="axis">
      <line x1={P - 4} x2={W - P + 3} y1={oy} y2={oy} /><path d="M{W - P + 4} {oy}l-4 -2.5v5z" class="ah" />
      <line y1={W - P + 4} y2={P - 3} x1={ox} x2={ox} /><path d="M{ox} {P - 4}l-2.5 4h5z" class="ah" />
      <text x={W - 3} y={oy - 3} text-anchor="end">x</text><text x={ox + 3} y={6}>y</text><text x={ox - 2} y={oy + 7} text-anchor="end" class="o">O</text>
    </g>
    {#each spec.plots as p, k (k)}
      <g class="pl" class:c2={k % 2 === 1} class:dash={p.dash}>
        {#if p.kind === 'fn'}
          {#each samplePlot(p, spec.win) as seg, j (j)}<path d={path(seg, spec)} />{/each}
          {#each endsOf(p) as e, j (j)}<circle cx={r1(sx(e.at[0], spec))} cy={r1(sy(e.at[1], spec))} r="2.6" class:open={!e.closed} />{/each}
        {:else if p.kind === 'pts'}
          {#each p.pts as q, j (j)}<circle cx={r1(sx(q[0], spec))} cy={r1(sy(q[1], spec))} r="2.8" />{/each}
        {:else}
          <ellipse cx={sx(p.c[0], spec)} cy={sy(p.c[1], spec)} rx={(p.r / (spec.win[1] - spec.win[0])) * (W - 2 * P)} ry={(p.r / (spec.win[3] - spec.win[2])) * (W - 2 * P)} class="ring" />
        {/if}
      </g>
    {/each}
  {:else}
    <text x={W / 2} y={W / 2} text-anchor="middle" class="err">⚠ 그래프 글 오류</text><title>{err}</title>
  {/if}
</svg>

<style>
  .graph { display: block; width: 100%; max-width: 150px; height: auto; margin: 0 auto; color: inherit; }
  .graph.big { max-width: 220px; }
  .grid line { stroke: currentColor; stroke-opacity: 0.12; stroke-width: 0.6; }
  .axis line { stroke: currentColor; stroke-opacity: 0.6; stroke-width: 1; }
  .axis .ah { fill: currentColor; fill-opacity: 0.6; }
  .axis text { fill: currentColor; font: italic 8px var(--font, serif); fill-opacity: 0.75; }
  .axis text.o { font-style: normal; font-size: 7px; }
  .pl path, .pl .ring { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .pl circle { fill: currentColor; stroke: currentColor; stroke-width: 1.4; }
  .pl circle.open { fill: var(--surface-2, #fff); }
  .pl.c2 path, .pl.c2 .ring { stroke: #3fa7ff; }
  .pl.c2 circle { fill: #3fa7ff; stroke: #3fa7ff; }
  .pl.dash path, .pl.dash .ring { stroke-dasharray: 4 3; stroke-width: 1.4; stroke-opacity: 0.7; }
  .err { fill: var(--bad, #e44); font-size: 9px; }
</style>
