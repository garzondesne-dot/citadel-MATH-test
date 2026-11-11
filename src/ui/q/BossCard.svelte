<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf } from '../../engine/input';
  import { bossItem, bossState, bossTries } from '../../raid/raid';
  import { bossSubmit } from '../../raid/actions';
  import QItem from './QItem.svelte';

  // 👑 형성평가 = 문항 하나씩 한 장 (#99 ① · 옛 문제 창 없앰 · 점수 · 재도전 규칙은 정식 그대로)
  //   문항마다 첫 시도 = 학습지 · 틀리면 생각 시간 뒤 숫자 바뀐 문제 · 기회 meta.bossTries · 맞히면 도달 = 보스 1 데미지
  //   보스를 이긴 뒤에도 남은 문항은 계속 풀 수 있음 (정식 bossView 와 같음)
  const { S, L, R, code, uid, now, locked }: { S: Store; L: LessonPack; R: Room; code: string; uid: string; now: number; locked: boolean } = $props();
  const st = $derived(bossState(L, R, uid));
  const firstOpen = (s: typeof st) => { const k = s.findIndex((x) => !x.ok && x.left > 0); return k < 0 ? 0 : k; };
  let cur = $state(-1);
  $effect(() => { if (cur < 0 && st.length) cur = firstOpen(st); });
  const s = $derived(st[cur]);
  const a = $derived(s?.next ?? 0);
  const q = $derived(cur >= 0 ? bossItem(L, R, uid, cur, a) : null);
  const key = $derived(`${cur}|${a}`);
  let given = $state<Given>(null);
  let formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; given = q ? emptyOf(q) : null; } });
  let thinkUntil = $state(0);
  let toast = $state('');
  const thinkLeft = $derived(Math.max(0, Math.ceil((thinkUntil - now) / 1000)));
  const lastSol = $derived(s && !s.ok && s.left <= 0 ? bossTries(L, R, uid).filter((t) => t.i === cur).pop()?.q?.solution : '');
  const lab = (x: (typeof st)[number]) => (x.ok ? '✔' : !x.n ? '' : x.left ? `✘${x.left}` : '📖');
  function send() {
    if (!q || !s || locked || thinkLeft > 0 || !filled(q, given)) return;
    const i = cur;
    if (!bossSubmit(S, L, code, uid, i, finalOf(q, given))) return;
    const s2 = bossState(L, S.get<Room>(`rooms/${code}`) as Room, uid);
    const me = s2[i];
    if (me?.ok) { toast = `✔ ${i + 1}번 도달! 보스에게 데미지`; const nx = s2.findIndex((x, k) => k > i && !x.ok && x.left > 0); cur = nx >= 0 ? nx : firstOpen(s2); }
    else { toast = me && me.left > 0 ? `✘ ${i + 1}번은 아직… 🤔 ${R.meta.think}초 생각하고 숫자가 바뀐 문제로 다시! (기회 ${me.left})` : `✘ ${i + 1}번 기회를 모두 썼어요 — 해설을 보며 학습지에 정리해요`; if (R.meta.think > 0) thinkUntil = Date.now() + R.meta.think * 1000; }
  }
</script>

<div class="tabs" role="tablist" aria-label="형성평가 문항">
  {#each st as x, i (i)}
    <button role="tab" class="tab" class:on={i === cur} class:ok={x.ok} class:spent={!x.ok && x.n > 0 && !x.left} aria-selected={i === cur} onclick={() => { cur = i; toast = ''; }}>{i + 1}번 {lab(x)}</button>
  {/each}
</div>
{#if s && q}
  <div class="paper">
    <div class="paper-h"><b>👑 형성평가 {cur + 1}번</b><small>{a === 0 ? '첫 시도 · 학습지 그대로' : `🔄 숫자가 바뀌었어요 · 재도전 ${a} / ${R.meta.bossTries - 1}`}</small></div>
    {#if s.ok}
      <p class="okc">✔ {cur + 1}번 도달 {s.first ? '(첫 시도)' : ''}</p>
    {:else if s.left <= 0}
      <p class="note">📖 기회를 모두 썼어요 — {lastSol || '해설을 보며 학습지에 정리해요'}</p>
    {:else}
      <QItem {q} i={cur} value={given} disabled={locked} runeLen={4} showNo={false} onchange={(v) => (given = v)} />
    {/if}
  </div>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  {#if !s.ok && s.left > 0}
    <div class="dock"><span class="slots">기회 {s.left}/{R.meta.bossTries}</span>
      <button class="go" disabled={locked || thinkLeft > 0 || !filled(q, given)} onclick={send}>{thinkLeft > 0 ? `🤔 ${thinkLeft}초 생각하기` : `⚔ ${cur + 1}번 내기`}</button></div>
  {/if}
{/if}

<style>
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
  .tab { min-height: 40px; padding: 4px 10px; }
  .tab.on { border-color: var(--accent); color: var(--accent); font-weight: 700; }
  .tab.ok { background: var(--muted); }
  .tab.spent { opacity: 0.6; }
  .paper { background: var(--card); border: 1px solid var(--muted); border-radius: 12px; padding: 10px 12px; min-width: 0; }
  .paper-h { display: flex; flex-wrap: wrap; gap: 4px 8px; justify-content: space-between; align-items: baseline; }
  .paper-h small { color: var(--sub); }
  .okc { color: var(--accent); font-weight: 700; }
  .note { font-size: 0.9rem; background: var(--muted); border-radius: 8px; padding: 6px 8px; overflow-wrap: anywhere; }
  .toast { font-weight: 700; text-align: center; margin: 8px 0 0; overflow-wrap: anywhere; }
  .dock { position: sticky; bottom: 0; display: flex; gap: 8px; align-items: center; padding: 8px 0; background: var(--bg); }
  .slots { color: var(--sub); font-size: 0.9rem; white-space: nowrap; }
  .go { flex: 1; min-height: 48px; font-size: 1.05rem; font-weight: 700; border-color: var(--accent); }
  .go:disabled { opacity: 0.5; }
</style>
