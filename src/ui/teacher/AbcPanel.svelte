<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Store } from '../../model/types';
  import { ABC_PATH, ABC_SETS, ABC_TXT, abcKeys, abcOpen, abcSum, abcTally, normKey } from '../../school/abcSheet';
  import { CLASSES, clsLabel, isBeta } from '../../school/school';
  // 🚪 던전 문 1차 · 교사 (📜 11/25 · 머리 🔨): ① 반마다 답안지 열기 · 닫기(수업에서 열어 둔 동안만 학생이 냄) + 통과 수 ② 정답표 A · B · C (7자리 · 코드에 없음 · 이 칸에만)
  const { S }: { S: Store } = $props();
  let ver = $state(0); { const tk = setInterval(() => ver++, 3000); onDestroy(() => clearInterval(tk)); }
  const tally = $derived.by(() => { void ver; return abcTally(S); });
  const sum = $derived(abcSum(tally));
  const rows = $derived.by(() => { void ver; return CLASSES.map((c) => tally.find((t) => t.cls === c) ?? { cls: c, pass: 0, total: 0, beta: isBeta(S, c), open: abcOpen(S, c) }); }); // 명단을 아직 안 올린 반도 열고 닫기는 됨
  const keys = $derived.by(() => { void ver; return abcKeys(S); });
  let draft = $state<Record<string, string>>({}), msg = $state('');
  const setOpen = (cls: string, on: boolean) => { S.set(`${ABC_PATH}/open/${cls.replace(/[.#$/[\]]/g, '_')}`, on ? true : null); ver++; };
  function saveKey(set: string) {
    const v = normKey(draft[set] ?? '');
    if (!v) { msg = `${set}세트 · ① ~ ④ 일곱 개를 적어 주세요 (예: 2413241)`; return; }
    S.set(`${ABC_PATH}/key/${set}`, v); draft[set] = ''; msg = `${set}세트 정답표를 저장했어요`; ver++;
  }
  const show = (k?: string) => (k ? [...k].map((d) => '①②③④'[Number(d) - 1]).join(' ') : '— 비어 있음');
</script>

<div class="ap" data-k="abc-panel">
  <p class="sum" data-k="abc-sum">{ABC_TXT.door} · 통과 <b>{sum.pass}</b> / {sum.total}</p>
  <p class="lab2">① 답안지 열기 · 수업에서 열어 둔 반만 학생이 낼 수 있어요</p>
  <div class="cls">
    {#each rows as t (t.cls)}
      <button type="button" class="item" class:on={t.open} role="switch" aria-checked={t.open} data-k="abc-open" data-cls={t.cls} onclick={() => setOpen(t.cls, !t.open)}>
        <span class="ic">{t.open ? '🟢' : '⚪'}</span><span class="tx"><b>{clsLabel(S, t.cls)} · {t.open ? '열림' : '닫힘'}</b><small>{t.total ? `통과 ${t.pass} / ${t.total}` : '명단 없음'}</small></span>
      </button>
    {/each}
  </div>
  <p class="lab2">② 정답표 · 세트마다 ① ~ ④ 일곱 개 (학생에겐 안 보이고 채점에만 써요)</p>
  {#each ABC_SETS as s (s)}
    <div class="key" data-k="abc-key" data-set={s}>
      <span class="kl"><b>{s}세트</b><small data-k="abc-key-now">{show(keys[s])}</small></span>
      <input class="fld" type="text" inputmode="numeric" maxlength="20" placeholder="예: 2413241" aria-label="{s}세트 정답" bind:value={draft[s]} />
      <button type="button" class="sv" disabled={!(draft[s] ?? '').trim()} onclick={() => saveKey(s)}>저장</button>
    </div>
  {/each}
  {#if msg}<p class="msg" role="status" data-k="abc-msg">{msg}</p>{/if}
  <p class="outq sm">C세트까지 못 통과하면 C 에서 틀린 번호만 다시 입력해요 · 정답은 학생에게 안 보여요</p>
</div>

<style>
  .ap { display: grid; gap: 10px; }
  .sum { margin: 0; padding: 12px; border-radius: 12px; background: var(--surface-2); font: 700 15px var(--font); text-align: center; } .sum b { font-size: 22px; color: var(--accent); }
  .lab2 { margin: 4px 0 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .cls { display: grid; gap: 8px; }
  .item { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line, #444); background: var(--surface); color: var(--text); text-align: left; font: inherit; }
  .item.on { border: 2px solid var(--ok); }
  .ic { font-size: 20px; } .tx { display: grid; } .tx small { color: var(--text-2); font-size: 13px; }
  .key { display: grid; grid-template-columns: 96px minmax(0, 1fr) 64px; gap: 8px; align-items: center; }
  .kl { display: grid; } .kl small { font-size: 13px; color: var(--text-2); letter-spacing: 0.02em; }
  .fld { min-height: 48px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line, #444); background: var(--surface); color: var(--text); font: 600 16px var(--font); min-width: 0; }
  .sv { min-height: 48px; border-radius: 10px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 15px var(--font); }
  .sv:disabled { opacity: 0.4; }
  .msg { margin: 0; font: 700 14px var(--font); color: var(--accent); }
  .outq { margin: 0; color: var(--text-2); } .sm { font-size: 13px; }
</style>
