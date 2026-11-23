<script lang="ts">
  import { untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { isRight, qOf, standingsAj, syl, type Aj, type Ans } from '../../rest/ajae';
  import { ajAnswer } from '../../rest/run';
  import SageHost from './SageHost.svelte';
  // 😆 아재 퀴즈 · 학생 폰 (📜 2026-11-24): 문제 · 빈칸 □ · 글자 칩 8칸 → 다 채우면 보냄 · 틀리면 흔들고 지움(다시) · 맞히면 「n등!」
  const { S, R, code, uid, now, f }: { S: Store; R: Room; code: string; uid: string; now: number; f: Aj } = $props();
  const q = $derived(qOf(f.qs[f.n - 1] ?? 0));
  const need = $derived(q ? syl(q.a).length : 0);
  let picked = $state<number[]>([]), bad = $state(false), key = '';
  $effect(() => { const k = f.rk; untrack(() => { if (k !== key) { key = k; picked = []; bad = false; } }); });
  const mine = $derived(((R as unknown as { fv?: Record<string, Record<string, Ans>> }).fv?.[f.rk]?.[uid]) ?? null);
  const done = $derived(!!q && !!mine && typeof mine === 'object' && isRight(q.no, mine.a));
  const word = $derived(picked.map((i) => f.chips[i] ?? '').join(''));
  function tap(i: number) {
    if (f.phase !== 'q' || done || picked.includes(i) || picked.length >= need) return;
    picked = [...picked, i]; bad = false;
    if (picked.length === need && q) {
      const w = picked.map((k) => f.chips[k] ?? '').join('');
      ajAnswer(S, code, f.rk, uid, w);
      if (w !== q.a) { bad = true; try { navigator.vibrate?.(120); } catch { /* 없음 */ } setTimeout(() => { picked = []; bad = false; }, 650); }
    }
  }
  const back = () => { if (!done && f.phase === 'q') { picked = picked.slice(0, -1); bad = false; } };
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const lastMine = $derived((f.last || []).findIndex(([u]) => u === uid));
  const st = $derived(standingsAj(f));
  const meSt = $derived(st.find((x) => x.u === uid));
</script>

<div class="aj" data-k="aj-phone" data-phase={f.phase}>
  {#if f.phase === 'intro'}
    <p class="band">😆 아재 퀴즈 {f.round ?? 1}회 · {f.qs.length}문제</p>
    <p class="rule">글자를 골라 정답을 완성해요 · 먼저 맞히면 <b>3 · 2 · 1점</b> · 틀려도 다시!</p>
    <p class="big">{sec}</p>
  {:else if f.phase === 'end'}
    <p class="band">🏆 끝!</p>
    <p class="rule" data-k="aj-me">{meSt ? `${meSt.rank}등 · ${meSt.pts}점` : '이번엔 점수가 없어요 · 다음엔 더 빨리!'}</p>
    <ol class="top">{#each st.slice(0, 3) as x (x.u)}<li class:me={x.u === uid}>{x.rank}등 · {x.pts}점{x.u === uid ? ' (나)' : ''}</li>{/each}</ol>
  {:else if q}
    <p class="band">{f.n} / {f.qs.length} · {f.phase === 'q' ? `${sec}초` : '정답 공개'}</p>
    <div class="qrow"><span class="host"><SageHost act={f.phase === 'show' ? 'laugh' : 'staff'} h={72} /></span><p class="q" data-k="aj-q">{q.q}</p></div>
    {#if f.phase === 'show'}
      <p class="ans" data-k="aj-ans">{q.a}</p><p class="why">{q.why}</p>
      <p class="rule">{lastMine >= 0 ? `🎉 ${lastMine + 1}번째로 맞힘 · +${f.last![lastMine]![1]}점` : done ? '맞혔어요 (점수는 3등까지)' : '다음 문제에서 다시!'}</p>
    {:else}
      <div class="ajs" class:bad class:ok={done} data-k="aj-slots">{#each Array(need) as _, k (k)}<span>{done ? syl(q.a)[k] : (picked[k] != null ? f.chips[picked[k]!] : '□')}</span>{/each}</div>
      {#if done}<p class="rule ok" data-k="aj-done">✅ 맞혔어요! {(() => { const r = Object.entries(((R as unknown as { fv?: Record<string, Record<string, Ans>> }).fv?.[f.rk]) || {}).filter(([, v]) => v && isRight(q.no, v.a)).sort((a, b) => a[1].at - b[1].at).findIndex(([u]) => u === uid); return r >= 0 ? `지금 ${r + 1}번째` : ''; })()}</p>
      {:else}
        <div class="chips" data-k="aj-chips">{#each f.chips as c, i (i)}<button type="button" class:used={picked.includes(i)} disabled={picked.includes(i)} data-c={c} onclick={() => tap(i)}>{c}</button>{/each}</div>
        <button type="button" class="del" data-k="aj-del" disabled={!picked.length} onclick={back}>⌫ 지우기</button>
        {#if bad}<p class="rule no" data-k="aj-bad">❌ 아니에요 · 다시!</p>{/if}
      {/if}
    {/if}
  {/if}
  <span class="sr" aria-live="polite">{word}</span>
</div>

<style>
  .aj { display: flex; flex-direction: column; align-items: center; gap: var(--s3); width: 100%; padding: var(--s2) 0; text-align: center; }
  .band { margin: 0; font: 800 16px var(--font); color: var(--accent); }
  .rule { margin: 0; font: 600 15px/1.5 var(--font); color: var(--text-2); } .rule.ok { color: var(--ok); } .rule.no { color: var(--bad); }
  .big { margin: 0; font: 900 48px var(--font); }
  .qrow { display: flex; align-items: center; gap: var(--s2); width: min(100%, 380px); }
  .host { flex: none; }
  .q { flex: 1; margin: 0; padding: var(--s3) var(--s4); border-radius: var(--r); background: #fff7e0; color: #2a1f14; font: 800 22px/1.4 var(--font); text-align: left; }
  .ans { margin: 0; font: 900 30px var(--font); color: var(--accent); } .why { margin: 0; font: 600 15px var(--font); color: var(--text-2); }
  .ajs { display: flex; flex-direction: row; justify-content: center; gap: 6px; } .ajs span { width: 44px; height: 52px; display: grid; place-items: center; border-radius: var(--r-sm); background: var(--surface-2); font: 800 24px var(--font); }
  .ajs.bad span { box-shadow: inset 0 0 0 2px var(--bad); animation: nope 0.3s; } .ajs.ok span { box-shadow: inset 0 0 0 2px var(--ok); }
  .chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: min(100%, 360px); }
  .chips button { min-height: var(--tap); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 800 22px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .chips button:active { transform: translateY(2px); box-shadow: none; } .chips button.used { opacity: 0.35; box-shadow: none; }
  .del { min-height: var(--tap); padding: 0 var(--s4); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); }
  .top { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font: 700 16px var(--font); } .top .me { color: var(--accent); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @keyframes nope { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  @media (prefers-reduced-motion: reduce) { .ajs.bad span { animation: none; } }
</style>
