<script lang="ts">
  // 📈 좌표평면 그래프 (📜 2026-11-20 함수 단원 · 기하 낱말 · graph.ts 의 그림 글 → SVG) — 학생 · 교사 시연 · 리모컨 · TV 가 같은 그림
  //   색 = 글자 색(currentColor)을 따라감 → 보기를 고르면(금빛 바탕) 선도 같이 바뀜 · 두 번째 그래프 = 파랑 · -- = 점선
  //   이름표 · 눈금 숫자 = 화면 좌표에서 자리 고름(점 오른쪽 위부터 · 겹치면 비켜 감)
  import { chains, contour, describe, endsOf, fillRects, parseGraph, placeLabels, samplePlot, tickStep, type GraphSpec, type Plot, type Pt } from '../graph';
  const { src, big = false }: { src: string; big?: boolean } = $props();
  const W = 120;
  const parsed = $derived.by((): { spec: GraphSpec | null; err: string } => { try { return { spec: parseGraph(src), err: '' }; } catch (e) { return { spec: null, err: (e as Error).message }; } });
  const spec = $derived(parsed.spec);
  const P = $derived(spec?.nums ? 11 : 8); // 눈금 숫자 = 왼쪽 · 아래 여백 조금 더
  const sx = (x: number, s: GraphSpec) => P + ((x - s.win[0]) / (s.win[1] - s.win[0])) * (W - 2 * P);
  const sy = (y: number, s: GraphSpec) => P + ((s.win[3] - y) / (s.win[3] - s.win[2])) * (W - 2 * P);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const path = (pts: [number, number][], s: GraphSpec) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${r1(sx(x, s))} ${r1(sy(y, s))}`).join('');
  const ticks = (a: number, b: number) => { const st = tickStep(a, b), out: number[] = []; if (b - a > 24 && !spec?.nums) return out; for (let t = Math.ceil(a / st) * st; t <= b + 1e-9; t += st) if (Math.abs(t) > 1e-9) out.push(+t.toFixed(6)); return out; };
  const ox = $derived(spec ? Math.min(Math.max(sx(0, spec), P), W - P) : 0), oy = $derived(spec ? Math.min(Math.max(sy(0, spec), P), W - P) : 0);
  const label = $derived(spec ? `그래프 ${describe(spec)}` : '그래프');
  const named = (p: Plot): Pt[] => (p.kind === 'pts' ? p.pts.map((at, k) => ({ at, name: p.names?.[k] })) : p.kind === 'seg' || p.kind === 'poly' || p.kind === 'arrow' ? p.pts : []);
  // 이름표 = 점 · 꼭짓점 이름 (같은 자리 같은 이름은 한 번)
  const labels = $derived.by(() => {
    if (!spec) return [];
    const seen = new Set<string>(), items: { at: [number, number]; text: string }[] = [], dots: [number, number][] = [];
    for (const p of spec.plots) for (const q of named(p)) { const s: [number, number] = [sx(q.at[0], spec), sy(q.at[1], spec)]; dots.push(s); if (!q.name) continue; const k = `${q.name}|${q.at}`; if (seen.has(k)) continue; seen.add(k); items.push({ at: s, text: q.name }); }
    const taken: [number, number, number, number][] = []; // 눈금 숫자 자리 = 이름표가 비켜 감
    for (const k of nx) { const w = String(k.t).length * 4; taken.push([k.x - w / 2, Math.min(oy + 7, W - 1) - 5.5, w, 6.5]); }
    for (const k of ny) { const w = String(k.t).length * 4; taken.push([Math.max(ox - 2, 7) - w, k.y - 3, w, 6.5]); }
    return placeLabels(items, dots, [1, 1, W - 1, W - 1], 7, taken);
  });
  const arrowHead = (a: [number, number], b: [number, number]) => { const L = 4.2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), p = (d: number) => `${r1(b[0] - L * Math.cos(ang + d))} ${r1(b[1] - L * Math.sin(ang + d))}`; return `M${r1(b[0])} ${r1(b[1])}L${p(0.45)}L${p(-0.45)}z`; };
  // 영역 = 칸 직사각형들을 한 길로 (같은 영역 안 겹침 = 한 번만 칠함)
  const fillPath = (p: Extract<Plot, { kind: 'ineq' }>, s: GraphSpec) => fillRects(p, s.win).map(([x, y, w, h]) => { const X = r1(sx(x, s)), Y = r1(sy(y + h, s)), X2 = r1(sx(x + w, s)), Y2 = r1(sy(y, s)); return `M${X} ${Y}H${X2}V${Y2}H${X}z`; }).join('');
  // 눈금 숫자 = 「O」 · 앞 숫자와 겹치면 그 숫자만 뺌 (좁은 보기 그림에서 「−1O」 처럼 붙어 읽히지 않게)
  const nx = $derived.by(() => { if (!spec?.nums) return [] as { t: number; x: number }[]; const out: { t: number; x: number }[] = [], oBox = [ox - 7.5, ox]; let last = -Infinity; for (const t of ticks(spec.win[0], spec.win[1])) { const x = sx(t, spec), w = String(t).length * 4.2, a = x - w / 2, b = x + w / 2; if (a < last + 1.2 || (b > oBox[0]! && a < oBox[1]!)) continue; out.push({ t, x }); last = b; } return out; });
  const ny = $derived.by(() => { if (!spec?.nums) return [] as { t: number; y: number }[]; const out: { t: number; y: number }[] = []; let last = Infinity; for (const t of ticks(spec.win[2], spec.win[3])) { const y = sy(t, spec); if ((y + 2.6 > oy + 0.5 && y - 3.6 < oy + 8) || Math.abs(y - oy) < 4 || y > last - 6.5) continue; /* 「O」 자리(원점 왼쪽 아래)와 겹치는 숫자 뺌 */ out.push({ t, y }); last = y; } return out; });
  const clipId = `gc${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg class="graph" class:big viewBox="0 0 {W} {W}" role="img" aria-label={label} data-k="graph">
  {#if spec}
    <defs><clipPath id={clipId}><rect x={P} y={P} width={W - 2 * P} height={W - 2 * P} /></clipPath></defs>
    <g class="grid">{#each ticks(spec.win[0], spec.win[1]) as t (t)}<line x1={sx(t, spec)} x2={sx(t, spec)} y1={P} y2={W - P} />{/each}{#each ticks(spec.win[2], spec.win[3]) as t (t)}<line y1={sy(t, spec)} y2={sy(t, spec)} x1={P} x2={W - P} />{/each}</g>
    <g clip-path="url(#{clipId})">
      {#each spec.plots as p, k (k)}{#if p.kind === 'ineq'}<path class="fill" d={fillPath(p, spec)} />{/if}{/each}
    </g>
    <g class="axis">
      <line x1={P - 4} x2={W - P + 3} y1={oy} y2={oy} /><path d="M{W - P + 4} {oy}l-4 -2.5v5z" class="ah" />
      <line y1={W - P + 4} y2={P - 3} x1={ox} x2={ox} /><path d="M{ox} {P - 4}l-2.5 4h5z" class="ah" />
      <text x={W - 3} y={oy - 3} text-anchor="end">x</text><text x={ox + 3} y={6}>y</text><text x={ox - 2} y={oy + 7} text-anchor="end" class="o">O</text>
      {#if spec.nums}
        {#each nx as k (k.t)}<text class="num" x={r1(k.x)} y={r1(Math.min(oy + 7, W - 1))} text-anchor="middle">{String(k.t).replace('-', '−')}</text>{/each}
        {#each ny as k (k.t)}<text class="num" x={r1(Math.max(ox - 2, 7))} y={r1(k.y + 2.3)} text-anchor="end">{String(k.t).replace('-', '−')}</text>{/each}
      {/if}
    </g>
    <g clip-path="url(#{clipId})">
      {#each spec.plots as p, k (k)}
        <g class="pl" class:c2={k % 2 === 1} class:dash={p.dash}>
          {#if p.kind === 'fn'}
            {#each samplePlot(p, spec.win) as seg, j (j)}<path d={path(seg, spec)} />{/each}
            {#each endsOf(p) as e, j (j)}<circle cx={r1(sx(e.at[0], spec))} cy={r1(sy(e.at[1], spec))} r="2.6" class:open={!e.closed} />{/each}
          {:else if p.kind === 'pts'}
            {#each p.pts as q, j (j)}<circle cx={r1(sx(q[0], spec))} cy={r1(sy(q[1], spec))} r="2.8" />{/each}
          {:else if p.kind === 'circle'}
            <ellipse cx={sx(p.c[0], spec)} cy={sy(p.c[1], spec)} rx={(p.r / (spec.win[1] - spec.win[0])) * (W - 2 * P)} ry={(p.r / (spec.win[3] - spec.win[2])) * (W - 2 * P)} class="ring" />
          {:else if p.kind === 'seg' || p.kind === 'poly'}
            <path d={path(p.pts.map((q) => q.at), spec) + (p.kind === 'poly' ? 'z' : '')} class:poly={p.kind === 'poly'} />
            {#each p.pts as q, j (j)}<circle cx={r1(sx(q.at[0], spec))} cy={r1(sy(q.at[1], spec))} r="1.9" />{/each}
          {:else if p.kind === 'arrow'}
            {@const a = [sx(p.pts[0]!.at[0], spec), sy(p.pts[0]!.at[1], spec)] as [number, number]}
            {@const b = [sx(p.pts[1]!.at[0], spec), sy(p.pts[1]!.at[1], spec)] as [number, number]}
            <path class="arw" d="M{r1(a[0])} {r1(a[1])}L{r1(b[0] - 3 * Math.cos(Math.atan2(b[1] - a[1], b[0] - a[0])))} {r1(b[1] - 3 * Math.sin(Math.atan2(b[1] - a[1], b[0] - a[0])))}" /><path class="arh" d={arrowHead(a, b)} />
          {:else if p.kind === 'curve' || p.kind === 'ineq'}
            {#each chains(contour(p.g, spec.win)) as c, j (j)}<path d={path(c, spec)} class:edge={p.kind === 'ineq'} class:strict={p.kind === 'ineq' && (p.op === '<' || p.op === '>')} />{/each}
          {/if}
        </g>
      {/each}
    </g>
    <g class="lab">{#each labels as l, k (k)}<text x={r1(l.x)} y={r1(l.y)}>{l.text}</text>{/each}</g>
  {:else}
    <text x={W / 2} y={W / 2} text-anchor="middle" class="err">⚠ 그래프 글 오류</text><title>{parsed.err}</title>
  {/if}
</svg>

<style>
  .graph { display: block; width: 100%; max-width: 150px; height: auto; margin: 0 auto; color: inherit; }
  .graph.big { max-width: 240px; }
  .grid line { stroke: currentColor; stroke-opacity: 0.12; stroke-width: 0.6; }
  .axis line { stroke: currentColor; stroke-opacity: 0.6; stroke-width: 1; }
  .axis .ah { fill: currentColor; fill-opacity: 0.6; }
  .axis text { fill: currentColor; font: italic 8px var(--font, serif); fill-opacity: 0.75; }
  .axis text.o { font-style: normal; font-size: 7px; }
  .axis text.num { font: 600 6.2px var(--font-plain, sans-serif); font-style: normal; fill-opacity: 0.7; }
  .pl path, .pl .ring { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .pl path.poly { fill: currentColor; fill-opacity: 0.1; stroke-width: 1.8; }
  .pl path.edge { stroke-width: 1.5; }
  .pl path.strict { stroke-dasharray: 3 2.2; stroke-linecap: butt; } /* 등호 없음 = 점선 */
  .pl circle { fill: currentColor; stroke: currentColor; stroke-width: 1.4; }
  .pl circle.open { fill: var(--surface-2, #fff); }
  .pl .arw { stroke-width: 1.6; stroke-dasharray: 3 2; stroke-linecap: butt; }
  .pl .arh { fill: currentColor; stroke: none; }
  .fill { fill: #ff9f1c; fill-opacity: 0.22; stroke: none; } /* 한 영역 = 한 길(줄무늬 없음) · 여러 영역 = 겹친 곳이 더 진함 */
  .pl.c2 path, .pl.c2 .ring { stroke: #3fa7ff; }
  .pl.c2 circle, .pl.c2 .arh { fill: #3fa7ff; stroke: #3fa7ff; }
  .pl.c2 path.poly { fill: #3fa7ff; }
  .pl.dash path, .pl.dash .ring { stroke-dasharray: 4 3; stroke-width: 1.4; stroke-opacity: 0.7; }
  .lab text { fill: currentColor; font: italic 700 7px var(--font, serif); paint-order: stroke; stroke: var(--surface-2, #fff); stroke-width: 1.6px; stroke-linejoin: round; }
  .err { fill: var(--bad, #e44); font-size: 9px; }
</style>
