<script lang="ts" module>
  // 칼 금 가기는 「줄어든 것을 처음 본 순간」 한 번만 (채점표 뒤 단추가 다시 그려져도 · memo = 몬스터 · 학생)
  const seen = new Map<string, number>(), boltSeen = new Set<string>();
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { sfx } from '../sound.svelte';
  import { paperOn } from '../submit.svelte';
  // ⚔ 칼 (📜 2026-11-15 선생님 「좋아 칼로 바꿔」 · DECISIONS 「❤ 하트 → ⚔ 칼」 · 규칙 · 수치는 11/13 하트 그대로 · 겉모습 · 낱말만)
  //   남은 칼 = 은빛 칼날 + 금빛 손잡이 · 반 칸 = 칼날 반 · 쓴 칼 = 회색 테두리 · 틀림 = 그 칼에 금이 가며 회색(0.7초 · 「쨍」 · 짧은 진동)
  //   보급 · 힐 = 칼 하나 초록 빛으로 돌아옴 · 다 맞힘(⚡ 칸으로 바뀜) = 남은 칼이 ⚡ 번개로 바뀌어 날아 들어옴(그 몬스터에서 한 번)
  // (옛) ❤ 노란 단추 오른쪽 고정 칸 (📜 2026-11-13 밤 · 베타 v4 · 시안 ⑤⑥): 풀 때 = ❤ 남은 수(반 하트 · 빈 하트 = 테두리)
  //   💔 틀렸을 때 = 배너 · 안내 없이 줄어든 하트가 커졌다 두 조각으로 갈라져 떨어지며 사라짐(0.7초 · 「쨍」 · 짧은 진동 · 반 하트 = 반쪽만 · 동작 줄이기 = 흐려짐만)
  //   다 맞힌 뒤 = ⚡ 남은 수 · 🔥 재도전 판 = ⚡ + 🔒(판을 다 맞혀야 다음 ⚡)
  const { mode = 'heart', total = 4, left = 4, lock = false, memo = '' }: { mode?: 'heart' | 'energy'; total?: number; left?: number; lock?: boolean; memo?: string } = $props();
  const cells = $derived(Array.from({ length: Math.max(1, Math.ceil(total)) }, (_, i) => (left >= i + 1 ? 'full' : left > i ? 'half' : 'empty')));
  // 쪼개지는 칸: 지난번 남은 수(was) → 지금(left) 사이 · 칸마다 잃은 몫(1 = 통째 · 0.5 = 반쪽)
  let breaking = $state<{ i: number; half: boolean }[]>([]), glow = $state(-1), bolt = $state(false);
  const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function check(now: number) {
    if (!memo || mode !== 'heart') return;
    const was = seen.get(memo); seen.set(memo, now);
    if (was != null && now > was) { sfx('heart-up', 0.75); glow = Math.max(0, Math.ceil(now) - 1); setTimeout(() => (glow = -1), 1100); return; } // ⚔ +1 (보급 · 힐 · 풀어냄) = 초록 빛 복귀
    if (was == null || now >= was) return;
    const out: { i: number; half: boolean }[] = [];
    for (let i = Math.floor(now); i < Math.ceil(was); i++) { const lostFrom = Math.max(i, now), lostTo = Math.min(i + 1, was); if (lostTo > lostFrom) out.push({ i, half: lostTo - lostFrom <= 0.5 }); }
    breaking = out; sfx('heart-break', 0.8); try { navigator.vibrate?.(35); } catch { /* 무시 */ }
    setTimeout(() => (breaking = []), 760);
  }
  onMount(() => { check(left); if (mode === 'energy' && memo && left > 0 && !boltSeen.has(memo)) { boltSeen.add(memo); if (!reduce()) { bolt = true; setTimeout(() => (bolt = false), 900); } } });
  $effect(() => { check(left); });
  const brk = (i: number) => breaking.find((b) => b.i === i);
</script>

{#if paperOn()}
  <!-- 📝 제출 모드: 하트 대신 글자 -->
  <span class="ptx" data-k="left">{mode === 'heart' ? `남은 기회 ${Math.max(0, Math.floor(left))}번` : `더 해 볼 것 ${left}번`}</span>
{:else if mode === 'heart'}
  <span class="hs" role="img" aria-label="칼 {left} / {total}">
    {#each cells as c, i (i)}
      {@const b = brk(i)}
      <span class="cell" class:glow={glow === i}>
        <svg class={c} viewBox="0 0 10 22" width="12" height="24" aria-hidden="true"><defs><clipPath id="sh{memo}{i}"><rect x="0" y="0" width="10" height="7.5" /></clipPath></defs>
          <path d="M5 1 7 4 7 13 3 13 3 4Z" class="o" /><rect x="1.5" y="13" width="7" height="2" rx="1" class="g" /><rect x="4" y="15" width="2" height="4" class="h" /><circle cx="5" cy="20" r="1.3" class="g" />
          {#if c === 'full'}<path d="M5 1 7 4 7 13 3 13 3 4Z" class="f" /><path d="M5 2.5 5 12.5" class="sh" />{:else if c === 'half'}<path d="M5 1 7 4 7 13 3 13 3 4Z" class="f" clip-path="url(#sh{memo}{i})" />{/if}</svg>
        {#if b}<span class="brk" class:still={reduce()} aria-hidden="true"><svg viewBox="0 0 10 22" width="12" height="24"><path d="M5 1 7 4 7 13 3 13 3 4Z" class="f" /><path d="M5.5 2 3.8 6.5 6.2 8.5 4.2 12" class="ck" /></svg></span>{/if}
      </span>
    {/each}
  </span>
{:else}
  <span class="hs en" class:bolt role="img" aria-label="기력 {left}{lock ? ' · 재도전 판을 다 맞혀야 다음 기력' : ''}"><b>⚡ {left}</b>{#if lock}<i>🔒</i>{/if}</span>
{/if}

<style>
  .ptx { font: 500 13px var(--font); color: inherit; opacity: 0.85; white-space: nowrap; }
  .hs { display: inline-flex; align-items: center; gap: 2px; padding: 4px 6px; border-radius: 10px; background: rgba(26, 19, 0, 0.14); }
  .cell { position: relative; display: inline-flex; }
  svg .o { fill: none; stroke: rgba(40, 20, 0, 0.55); stroke-width: 0.9; }
  svg .f { fill: #e8edf5; stroke: #5b6578; stroke-width: 0.8; }
  svg .sh { stroke: #ffffff; stroke-width: 0.7; opacity: 0.8; }
  svg .g { fill: #e0a526; stroke: #6b4a0c; stroke-width: 0.5; }
  svg .h { fill: #7a4a1c; }
  svg.empty .g, svg.empty .h { fill: #8b8b8b; stroke: #555; }
  svg .ck { fill: none; stroke: #2a2a2a; stroke-width: 0.8; }
  .brk { position: absolute; inset: 0; pointer-events: none; animation: crack 0.7s ease-out forwards; }
  @keyframes crack { 0% { transform: scale(1); filter: none; opacity: 1; } 25% { transform: scale(1.5) rotate(-8deg); } 60% { filter: grayscale(1) brightness(0.8); opacity: 1; } 100% { transform: scale(1.2) rotate(6deg); filter: grayscale(1); opacity: 0; } }
  .brk.still { animation: fade 0.7s ease-out forwards; }
  @keyframes fade { from { opacity: 1; } to { opacity: 0; } }
  .cell.glow { animation: back 1.1s ease-out 1; }
  @keyframes back { 0% { filter: drop-shadow(0 0 0 #4cc38a); transform: scale(1.5); } 40% { filter: drop-shadow(0 0 6px #4cc38a) brightness(1.3); } 100% { filter: none; transform: none; } }
  .en.bolt b { animation: bolt 0.9s cubic-bezier(0.2, 0.8, 0.3, 1.2) 1; display: inline-block; }
  @keyframes bolt { 0% { transform: translateX(-60px) scale(0.6); opacity: 0; filter: drop-shadow(0 0 8px #ffe066); } 60% { opacity: 1; } 100% { transform: none; } }
  @media (prefers-reduced-motion: reduce) { .cell.glow, .en.bolt b { animation: none; } }
  .en { background: #2a2200; padding: 4px 10px; gap: 4px; }
  .en b { color: #ffe066; font-size: 14px; font-weight: 900; }
  .en i { font-style: normal; font-size: 13px; }
</style>
