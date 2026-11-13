<script lang="ts">
  import { onMount } from 'svelte';
  import { sfx } from '../sound.svelte';
  // ⛓ 사슬 (👹 몬스터 공격 다시 만들기 · 📜 2026-11-13 밤 선생님 「꽁꽁 묶인다는 느낌이 아니야」)
  //   들어옴 = 사슬 두 줄이 양옆 밖에서 날아와 X 로 감김(0.3초) → 「철컥」 조여듦(흰 번쩍 · 0.07초 멈춤 · 움찔) → 묶인 동안 가끔 팽팽하게 떨림
  //   cut 1 · 2 = 한 줄씩 금이 가며 늘어짐 · broken = 사슬이 조각조각 부서져 흩어짐 · pad = 가운데 자물쇠(🔒 자물쇠 공격 · open = 고리가 튕겨 올라감)
  //   카드(AttackFx) · 노란 단추(BottomAction) 같은 부품 · 동작 줄이기 = 날아옴 · 떨림 · 조각 없이 보였다 사라짐
  const { cut = 0, broken = false, pad = false, open = false, thin = false }: { cut?: number; broken?: boolean; pad?: boolean; open?: boolean; thin?: boolean } = $props();
  let w = $state(0), h = $state(0), clank = $state(false);
  const S = $derived(thin ? 11 : 15), RX = $derived(thin ? 6 : 8.5), RY = $derived(thin ? 3.4 : 4.8), SW = $derived(thin ? 2.2 : 3);
  // 두 줄 = 두 대각선 (조금 넘치게)
  const lines = $derived(w && h ? [[-0.06 * w, 0.12 * h, 1.06 * w, 0.88 * h], [-0.06 * w, 0.88 * h, 1.06 * w, 0.12 * h]] as const : []);
  type Link = { x: number; y: number; a: number; odd: boolean };
  const linksOf = (l: readonly number[]): Link[] => { const [x0, y0, x1, y1] = l as [number, number, number, number], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / S)), a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI; return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, a, odd: i % 2 === 1 })); };
  const chains = $derived(lines.map(linksOf));
  // 부서진 조각 (고리마다 하나 · 방향 · 회전은 자리로 정함 → 다시 그려도 같음)
  const frags = $derived(chains.flatMap((ls, k) => ls.filter((_, i) => i % 2 === 0).map((p, i) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453, r = s - Math.floor(s); return { ...p, dx: (r - 0.5) * 160, dy: -40 - r * 90, rot: (r - 0.5) * 540, d: 0.35 + r * 0.25 }; })));
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  onMount(() => { const t = setTimeout(() => { clank = true; sfx('block', 0.9); try { navigator.vibrate?.(30); } catch { /* 무시 */ } setTimeout(() => (clank = false), 160); }, reduce ? 0 : 300); return () => clearTimeout(t); });
  $effect(() => { if (broken) sfx('smash', 0.8); });
</script>

<div class="chainfx" class:clank class:broken class:still={reduce} bind:clientWidth={w} bind:clientHeight={h} aria-hidden="true" data-cut={cut}>
  {#if !broken}
    <svg {...{ width: w, height: h }} viewBox="0 0 {w || 1} {h || 1}">
      {#each chains as ls, k (k)}
        <g class="line l{k}" class:cr={cut > k} style:--from="{k ? 1 : -1}">
          {#each ls as p, i (i)}
            <g transform="translate({p.x} {p.y}) rotate({p.a})">
              {#if p.odd}<rect x={-RX * 0.95} y={-SW * 0.55} width={RX * 1.9} height={SW * 1.1} rx={SW * 0.5} class="bar" />
              {:else}<ellipse rx={RX} ry={RY} class="ring o" /><ellipse rx={RX} ry={RY} class="ring" style:stroke-width={SW} />{/if}
            </g>
          {/each}
        </g>
      {/each}
    </svg>
    {#if pad}
      <span class="pad" class:open style="left:{w / 2}px;top:{h / 2}px"><svg viewBox="0 0 40 46" width="40" height="46"><path class="shk" d="M11 20V13a9 9 0 0 1 18 0v7" /><rect x="5" y="19" width="30" height="24" rx="5" class="body" /><circle cx="20" cy="29" r="3.4" class="hole" /><rect x="18.6" y="30" width="2.8" height="7" rx="1.2" class="hole" /></svg></span>
    {/if}
    <i class="flash"></i>
  {:else}
    {#each frags as f, i (i)}<i class="frag" style="left:{f.x}px;top:{f.y}px;--dx:{f.dx}px;--dy:{f.dy}px;--rot:{f.rot}deg;--d:{f.d}s"></i>{/each}
  {/if}
</div>

<style>
  .chainfx { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
  svg { position: absolute; inset: 0; overflow: visible; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.75)); }
  .ring { fill: none; stroke: #d9dce6; } .ring.o { stroke: #3b3e49; stroke-width: 5.2; }
  .bar { fill: #aeb2c0; stroke: #3b3e49; stroke-width: 1.2; }
  /* 들어옴 = 양옆 밖에서 날아와 감김 → 철컥(살짝 조여듦) */
  .line { animation: chIn 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2) both, strain 1.6s 0.6s ease-in-out infinite; transform-box: view-box; transform-origin: 50% 50%; }
  .l1 { animation-delay: 0.05s, 1.4s; }
  @keyframes chIn { from { transform: translateX(calc(var(--from) * 70%)) scale(1.08); opacity: 0; } 70% { opacity: 1; } to { transform: none; } }
  @keyframes strain { 0%, 82%, 100% { transform: none; } 86% { transform: translate(1.5px, -1px) scale(1.012); } 90% { transform: translate(-1.5px, 1px) scale(1.006); } 94% { transform: translate(1px, 0); } }
  .clank svg { animation: tight 0.16s ease-out; }
  @keyframes tight { 0% { transform: scale(1.06); } 45% { transform: scale(0.97); } 100% { transform: none; } }
  .flash { position: absolute; inset: 0; background: #fff; opacity: 0; mix-blend-mode: screen; }
  .clank .flash { animation: flash 0.16s ease-out; }
  @keyframes flash { 0% { opacity: 0.4; } 100% { opacity: 0; } }
  /* 금 · 늘어짐 (한 줄씩) */
  .line.cr { opacity: 0.45; animation: sag 0.25s ease-out forwards; }
  @keyframes sag { to { transform: translateY(8%) rotate(3deg); } }
  /* 자물쇠 */
  .pad { position: absolute; transform: translate(-50%, -50%); filter: drop-shadow(0 2px 0 #000) drop-shadow(0 0 6px rgba(245, 184, 74, 0.8)); animation: padIn 0.3s 0.28s cubic-bezier(0.3, 1.6, 0.5, 1) both; }
  .pad .body { fill: #f5b84a; stroke: #6b4a0f; stroke-width: 2; } .pad .shk { fill: none; stroke: #c9ccd6; stroke-width: 4.5; stroke-linecap: round; } .pad .hole { fill: #3a2a08; }
  .pad.open .shk { animation: shk 0.25s ease-out forwards; }
  @keyframes padIn { from { transform: translate(-50%, -50%) scale(2); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
  @keyframes shk { to { transform: translateY(-7px) rotate(-18deg); transform-origin: 29px 20px; } }
  /* 부서짐 = 고리 조각이 튀어 흩어짐 */
  .frag { position: absolute; width: 9px; height: 6px; margin: -3px 0 0 -4.5px; border-radius: 3px; border: 2px solid #d9dce6; box-shadow: 0 0 0 1px #3b3e49; animation: frag var(--d) cubic-bezier(0.2, 0.6, 0.6, 1) forwards; }
  @keyframes frag { to { transform: translate(var(--dx), calc(var(--dy) + 140px)) rotate(var(--rot)); opacity: 0; } }
  .still .line, .still svg, .still .pad { animation: none !important; }
  .still .frag { animation: fade 0.25s forwards; } @keyframes fade { to { opacity: 0; } }
</style>
