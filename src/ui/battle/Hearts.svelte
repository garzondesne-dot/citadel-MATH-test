<script lang="ts" module>
  // 하트 쪼개짐은 「줄어든 것을 처음 본 순간」 한 번만 (채점표 뒤 단추가 다시 그려져도 · memo = 몬스터 · 학생)
  const seen = new Map<string, number>();
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { sfx } from '../sound.svelte';
  // ❤ 노란 단추 오른쪽 고정 칸 (📜 2026-11-13 밤 · 베타 v4 · 시안 ⑤⑥): 풀 때 = ❤ 남은 수(반 하트 · 빈 하트 = 테두리)
  //   💔 틀렸을 때 = 배너 · 안내 없이 줄어든 하트가 커졌다 두 조각으로 갈라져 떨어지며 사라짐(0.7초 · 「쨍」 · 짧은 진동 · 반 하트 = 반쪽만 · 동작 줄이기 = 흐려짐만)
  //   다 맞힌 뒤 = ⚡ 남은 수 · 🔥 재도전 판 = ⚡ + 🔒(판을 다 맞혀야 다음 ⚡)
  const { mode = 'heart', total = 4, left = 4, lock = false, memo = '' }: { mode?: 'heart' | 'energy'; total?: number; left?: number; lock?: boolean; memo?: string } = $props();
  const cells = $derived(Array.from({ length: Math.max(1, Math.ceil(total)) }, (_, i) => (left >= i + 1 ? 'full' : left > i ? 'half' : 'empty')));
  // 쪼개지는 칸: 지난번 남은 수(was) → 지금(left) 사이 · 칸마다 잃은 몫(1 = 통째 · 0.5 = 반쪽)
  let breaking = $state<{ i: number; half: boolean }[]>([]);
  const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function check(now: number) {
    if (!memo || mode !== 'heart') return;
    const was = seen.get(memo); seen.set(memo, now);
    if (was == null || now >= was) return;
    const out: { i: number; half: boolean }[] = [];
    for (let i = Math.floor(now); i < Math.ceil(was); i++) { const lostFrom = Math.max(i, now), lostTo = Math.min(i + 1, was); if (lostTo > lostFrom) out.push({ i, half: lostTo - lostFrom <= 0.5 }); }
    breaking = out; sfx('block', 0.8); try { navigator.vibrate?.(35); } catch { /* 무시 */ }
    setTimeout(() => (breaking = []), 760);
  }
  onMount(() => check(left));
  $effect(() => { check(left); });
  const brk = (i: number) => breaking.find((b) => b.i === i);
</script>

{#if mode === 'heart'}
  <span class="hs" role="img" aria-label="하트 {left} / {total}">
    {#each cells as c, i (i)}
      {@const b = brk(i)}
      <span class="cell">
        <svg class={c} viewBox="0 0 16 14" width="15" height="13" aria-hidden="true"><defs><clipPath id="hh{memo}{i}"><rect x="0" y="0" width="8" height="14" /></clipPath></defs>
          <path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="o" />{#if c === 'full'}<path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="f" />{:else if c === 'half'}<path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="f" clip-path="url(#hh{memo}{i})" />{/if}</svg>
        {#if b}
          <span class="brk" class:still={reduce()} class:halfonly={b.half} aria-hidden="true">
            {#each b.half ? ['r'] : ['l', 'r'] as side (side)}<svg class="pc {side}" viewBox="0 0 16 14" width="15" height="13"><path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" style="clip-path:{side === 'l' ? 'polygon(0 0,55% 0,40% 45%,55% 70%,45% 100%,0 100%)' : 'polygon(55% 0,100% 0,100% 100%,45% 100%,55% 70%,40% 45%)'}" /></svg>{/each}
          </span>
        {/if}
      </span>
    {/each}
  </span>
{:else}
  <span class="hs en" role="img" aria-label="기력 {left}{lock ? ' · 재도전 판을 다 맞혀야 다음 기력' : ''}"><b>⚡ {left}</b>{#if lock}<i>🔒</i>{/if}</span>
{/if}

<style>
  .hs { display: inline-flex; align-items: center; gap: 2px; padding: 4px 6px; border-radius: 10px; background: rgba(26, 19, 0, 0.14); }
  .cell { position: relative; display: inline-flex; }
  svg .o { fill: none; stroke: rgba(40, 20, 0, 0.6); stroke-width: 1.6; }
  svg .f { fill: var(--hp, #e5484d); stroke: #7a1a14; stroke-width: 1.2; }
  .brk { position: absolute; inset: 0; pointer-events: none; animation: pop 0.7s ease-out forwards; }
  .pc { position: absolute; left: 0; top: 0; }
  .pc path { fill: var(--hp, #e5484d); stroke: #7a1a14; stroke-width: 1.2; }
  .pc.l { animation: fallL 0.7s cubic-bezier(0.4, 0, 1, 1) forwards; }
  .pc.r { animation: fallR 0.7s cubic-bezier(0.4, 0, 1, 1) forwards; }
  @keyframes pop { 0% { transform: scale(1); } 22% { transform: scale(1.6); } 100% { transform: scale(1.3); } }
  @keyframes fallL { 0%, 28% { transform: none; opacity: 1; } 100% { transform: translate(-7px, 16px) rotate(-35deg); opacity: 0; } }
  @keyframes fallR { 0%, 28% { transform: none; opacity: 1; } 100% { transform: translate(7px, 16px) rotate(35deg); opacity: 0; } }
  .brk.still, .brk.still .pc { animation: fade 0.7s ease-out forwards; }
  @keyframes fade { from { opacity: 1; } to { opacity: 0; } }
  .en { background: #2a2200; padding: 4px 10px; gap: 4px; }
  .en b { color: #ffe066; font-size: 14px; font-weight: 900; }
  .en i { font-style: normal; font-size: 13px; }
</style>
