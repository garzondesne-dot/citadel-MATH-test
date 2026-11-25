<script lang="ts">
  import type { Store } from '../../model/types';
  import { ABC_TXT, abcSum, abcTally } from '../../school/abcSheet';
  // 🚪 던전 문 1차 · 교실 TV (📜 11/25 · 머리 🔨): 「통과 n / 전체」 + 반별 통과 수 · 규칙 그대로(교사 로그인 PC 가 학생 기록을 직접 셈)
  //   교사 로그인이 아닌 TV = 기록을 못 읽음 → 안내 한 줄
  const { S, now, admin }: { S: Store; now: number; admin: boolean } = $props();
  const tally = $derived.by(() => { void now; return admin ? abcTally(S) : []; });
  const sum = $derived(abcSum(tally));
  const pct = $derived(sum.total ? Math.round((sum.pass / sum.total) * 100) : 0);
</script>

<div class="door" data-k="tv-abc-door">
  <b class="dt">{ABC_TXT.door}</b>
  {#if admin}
    <p class="big" data-k="tv-abc-sum">통과 <b>{sum.pass}</b><small> / {sum.total}</small></p>
    <div class="bar" aria-label="통과 {pct}%"><i style:width="{pct}%"></i></div>
    <div class="rows">
      {#each tally as t (t.cls)}
        <div class="r" class:open={t.open} class:beta={t.beta} data-k="tv-abc-cls" data-cls={t.cls}>
          <span class="c">{t.open ? '🟢 ' : ''}{t.cls}반{t.beta ? ' 🧪' : ''}</span>
          <span class="m"><i style:width="{t.total ? (t.pass / t.total) * 100 : 0}%"></i></span>
          <span class="n">{t.pass} / {t.total}</span>
        </div>
      {/each}
    </div>
    <p class="how">📱 캠프 → 🏰 성채 → 📄 {ABC_TXT.name.replace('📄 ', '')}</p>
  {:else}
    <p class="how" data-k="tv-abc-login">통과 수는 교사로 로그인한 PC 에서 보여요</p>
  {/if}
</div>

<style>
  .door { display: grid; gap: 0.5em; padding: 0.8em 1em; border-radius: 0.8em; background: rgba(20, 12, 30, 0.82); border: 3px solid #f5b84a; color: #fff; font-size: clamp(14px, 1.5vw, 26px); box-shadow: 0 0 22px rgba(245, 184, 74, 0.35); }
  .dt { font: 900 1.15em var(--font); color: #ffd25a; }
  .big { margin: 0; font: 800 1.3em var(--font); } .big b { font-size: 2em; color: #ffd25a; } .big small { font-size: 0.9em; color: #e8e2f2; }
  .bar { height: 0.7em; border-radius: 999px; background: rgba(255, 255, 255, 0.15); overflow: hidden; } .bar i { display: block; height: 100%; background: linear-gradient(90deg, #c98a1c, #ffd25a); transition: width 0.6s ease-out; }
  .rows { display: grid; gap: 0.3em; }
  .r { display: grid; grid-template-columns: 6.5em minmax(0, 1fr) 4.5em; gap: 0.5em; align-items: center; font: 700 0.95em var(--font); }
  .r.beta { opacity: 0.6; }
  .m { height: 0.6em; border-radius: 999px; background: rgba(255, 255, 255, 0.12); overflow: hidden; } .m i { display: block; height: 100%; background: #4cc38a; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .how { margin: 0; font: 700 0.85em var(--font); color: #e8e2f2; }
</style>
