<script lang="ts">
  import type { Question } from '../../model/types';
  import { chipToggle } from '../../engine/input';
  // 🔘 칩 · 여러 개 고르기 (정식 P8 · #41 두 칸 고르기 groups · ∅ 단추 q.empty)
  type Multi = Extract<Question, { type: 'multi' }>;
  const { q, value, disabled = false, onchange, marks = null, box = false }: { q: Multi; value: number[]; disabled?: boolean; onchange: (v: number[]) => void;
    /** ☑ 지난번 틀린 답의 ✔ · ✘ (multiFb.ts · 글자 취소선 없음 · 테두리 + 구석 배지) */ marks?: { ok: number[]; bad: number[] } | null; /** 처음 틀렸을 때 = ☐ 체크 상자 모양 */ box?: boolean } = $props();
  const okS = $derived(new Set(marks?.ok || [])), badS = $derived(new Set(marks?.bad || []));
  const on = $derived(new Set(value || []));
  // 📜 2026-11-15 보기 가독성 (머리 🔨 · 10차시 「q → ~p」 가 좁은 칸에서 두 줄로 꺾임): 긴 보기(문장 · 식) = 2 × 2 격자 · 폭 전체 · 한 줄(줄바꿈 금지) · 큰 글자
  //   아주 긴 보기(12자 넘음) = 한 줄에 하나 · 짧은 칩(1 · 2 · ∅)은 예전 그대로
  const longest = $derived(Math.max(0, ...q.options.map((o) => String(o).length)));
  const wide = $derived(longest > 3), one = $derived(longest > 12);
  const parts = $derived.by(() => {
    if (!q.groups?.length) return [{ label: '', from: 0, n: q.options.length }];
    let b0 = 0;
    return q.groups.map((g) => { const p = { label: g.label, from: b0, n: g.n }; b0 += g.n; return p; });
  });
</script>

{#each parts as p (p.from)}
  <div class="grp">
    {#if p.label}<b class="grp-h">{p.label}</b>{/if}
    <div class="chips" class:wide class:one>
      {#each q.options.slice(p.from, p.from + p.n) as o, j (p.from + j)}
        {@const k = p.from + j}
        <button type="button" class="chip" class:on={on.has(k)} aria-pressed={on.has(k)} class:empty={(q.empty || []).includes(k)} class:m-ok={okS.has(k)} class:m-bad={badS.has(k)} class:box {disabled} onclick={() => onchange(chipToggle(q, value, k))}>{#if box}<span class="cb" aria-hidden="true">{on.has(k) ? '☑' : '☐'}</span>{/if}{o}{#if okS.has(k)}<i class="mk ok" aria-label="맞은 보기">✔</i>{:else if badS.has(k)}<i class="mk bad" aria-label="틀린 보기">✘</i>{/if}</button>
      {/each}
    </div>
  </div>
{/each}

<style>
  .grp { display: flex; flex-direction: column; gap: 6px; }
  .grp-h { font-size: var(--fs-small); color: var(--text-2); overflow-wrap: anywhere; }
  .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 6px; }
  .chip { min-height: 50px; min-width: 0; padding: 0 4px; border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); box-shadow: 0 3px 0 var(--press-sh); overflow-wrap: anywhere; transition: transform var(--t); }
  .chip:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .chips.wide { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s2); }
  .chips.one { grid-template-columns: 1fr; }
  .chips.wide .chip { min-height: 56px; padding: 0 var(--s2); font-size: 21px; white-space: nowrap; overflow-wrap: normal; word-break: keep-all; }
  .chips.one .chip { white-space: normal; word-break: keep-all; font-size: 19px; }
  .chip.empty { border-style: dashed; border-color: var(--line); }
  .chip { position: relative; overflow: visible; }
  .chip.m-ok { border-color: var(--ok); }
  .chip.m-bad { border-color: var(--bad); }
  .chip.on.m-ok { box-shadow: 0 0 0 2px var(--ok), 0 3px 0 var(--accent-sh); }
  .mk { position: absolute; top: -8px; right: -6px; width: 20px; height: 20px; border-radius: 10px; display: grid; place-items: center; font-style: normal; font-size: 12px; font-weight: 800; line-height: 1; color: #fff; box-shadow: 0 0 0 2px var(--bg); }
  .mk.ok { background: var(--ok); } .mk.bad { background: var(--bad); }
  .cb { margin-right: 6px; font-size: 0.95em; }
  .chip:disabled { opacity: 0.4; box-shadow: none; }
</style>
