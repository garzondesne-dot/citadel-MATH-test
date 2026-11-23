<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import type { Store } from '../../model/types';
  import { MAXT } from '../../school/survey';
  import { blank12, firstGap12, check12, INTRO12, NONE, Q12S, SCALE, SECS, submit12 } from '../../school/survey12';
  import { sfx } from '../sound.svelte';

  // 📝 12월 마무리 설문 창 (📜 11/23 · 22문항 · 아래 시트 · 이름 없이) — 생김새 = 11/17 설문 창과 같은 부품 · 눈금 같음
  //   보내기 = 빈칸이면 그 문항으로 · 보상 +5 EXP · 💎 +10 (한 번 · 한도 밖)
  const { S, cls, num, excluded, onpaid, onclose }: { S: Store; cls: string; num: number; excluded: boolean; onpaid: (gem: number, xp: number) => void; onclose: () => void } = $props();
  const a = $state(blank12());
  let err = $state(''), busy = $state(false), shakeQ = $state(0);
  let box = $state<HTMLElement | null>(null);
  const setV = (n: number, v: number) => { a.v[n] = v; if (err) err = ''; };
  async function send() {
    if (busy) return;
    const e = check12(a);
    if (e) { err = e; const g = firstGap12(a); shakeQ = g; box?.querySelector(`[data-q="${g}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => (shakeQ = 0), 500); return; }
    busy = true; err = '';
    try {
      const r = await submit12(S, cls, num, a, excluded, S.now());
      onpaid(r.gem, r.xp);
      sfx('correct', 0.8);
      onclose();
    } catch (x) { err = (x as { user?: boolean; message?: string }).user ? String((x as Error).message) : '보내지 못했어요. 다시 눌러 주세요.'; busy = false; }
  }
</script>

<Sheet {onclose} tall mainText={busy ? '보내는 중…' : '📝 보내기'} mainDisabled={busy} onmain={send} why={err}>
  {#snippet title()}📝 12월 마무리 설문{/snippet}
  <div class="sv" bind:this={box} data-k="survey12">
    <p class="anon">🔒 {INTRO12}</p>
    <p class="legend">1 전혀 아니다 · 2 아니다 · 3 보통 · 4 그렇다 · 5 매우 그렇다</p>
    {#each Q12S as q, i (q.n)}
      {#if i === 0 || Q12S[i - 1]!.sec !== q.sec}<p class="h">{SECS[q.sec]}</p>{/if}
      <div class="q" class:shake={shakeQ === q.n} data-q={q.n}>
        <p><b>{q.n}.</b> {q.t}</p>
        {#if q.kind === 'scale' || q.kind === 'scale0'}
          <div class="scale" role="radiogroup" aria-label="{q.n}번">{#each SCALE as s, v (v)}<button type="button" class:on={a.v[q.n] === v + 1} aria-pressed={a.v[q.n] === v + 1} title={s} data-sv="{q.n}-{v + 1}" onclick={() => setV(q.n, v + 1)}>{v + 1}</button>{/each}</div>
          {#if q.kind === 'scale0'}<button type="button" class="none" class:on={a.v[q.n] === 0} aria-pressed={a.v[q.n] === 0} data-sv="{q.n}-0" onclick={() => setV(q.n, 0)}>{a.v[q.n] === 0 ? '✓ ' : ''}{NONE}</button>{/if}
        {:else if q.kind === 'pick'}
          <div class="chips">{#each q.opts ?? [] as t, k (k)}<button type="button" class:on={a.v[q.n] === k} aria-pressed={a.v[q.n] === k} data-pk="{q.n}-{k}" onclick={() => setV(q.n, k)}>{a.v[q.n] === k ? '✓ ' : ''}{t}</button>{/each}</div>
        {:else if q.n === 21}
          <textarea maxlength={MAXT} rows="2" bind:value={a.say} data-k="sv12-say"></textarea>
        {:else}
          <textarea maxlength={MAXT} rows="2" bind:value={a.want} data-k="sv12-want"></textarea>
        {/if}
      </div>
    {/each}
    <p class="rw">보내면 +5 EXP · 💎 +10 (한 번)</p>
  </div>
</Sheet>

<style>
  .sv { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s4); }
  .sv p { margin: 0; font-size: 15px; line-height: 1.5; }
  .anon { padding: var(--s3); border-radius: var(--r); background: var(--surface-2); color: var(--text); font-weight: 600; }
  .legend { color: var(--text-3); font-size: 14px !important; }
  .h { font-weight: 700; margin-top: var(--s2) !important; }
  .q { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); background: var(--surface-2); }
  .q.shake { animation: nope 0.3s; box-shadow: inset 0 0 0 2px var(--bad); }
  .scale { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .scale button, .none, .chips button { min-height: var(--tap); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .none { font-size: 15px; color: var(--text-2); }
  .chips { display: flex; flex-direction: column; gap: 6px; }
  .chips button { text-align: left; padding: 0 var(--s3); font-size: 15px; }
  .scale button.on, .chips button.on, .none.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: none; transform: translateY(2px); }
  textarea { width: 100%; box-sizing: border-box; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 500 16px var(--font); padding: var(--s2); }
  .rw { color: var(--text-2); text-align: center; }
  @keyframes nope { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
</style>
