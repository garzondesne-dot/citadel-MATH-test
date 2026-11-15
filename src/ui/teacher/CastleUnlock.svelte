<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import { CLASSES } from '../../school/school';
  import { autoPath, castleState, floorName, manualOf, progressOf, setAuto, setManual, type CastlePack } from '../../school/castle';

  // 🔓 해금 관리 (📜 2026-11-15 DECISIONS 「성채(추가 팩) 방 = 교사 수동 해금」 · 선생님 「전체 해금 · 문제별 해금」)
  //   반 칩(+ 모든 반) → 🔓 전체 해금 / 🔒 전체 잠금 · 방마다 스위치 · 「자동 해금」(진도 · 👑 60%) 켬/끔 = 층마다
  //   열림 = 교사가 연 방 OR 자동 · 교사가 연 👑 보스 = 60% 없이 · 저장 = school/castleOpen/{팩}/{반}/{방} (교사만 쓰기 · 규칙 그대로)
  const { S, P, onclose }: { S: Store; P: CastlePack; onclose: () => void } = $props();
  const ALL = '모든 반';
  let cls = $state(CLASSES[0] ?? ALL), ver = $state(0), note = $state('');
  const stop = untrack(() => [S.watch('school/castleOpen', () => ver++), S.watch(autoPath(P.id), () => ver++)]); onDestroy(() => stop.forEach((f) => f()));
  const targets = $derived(cls === ALL ? CLASSES : [cls]);
  const auto = $derived.by(() => { void ver; return S.get<boolean>(autoPath(P.id)) !== false; });
  /** 방이 교사 해금인가 (모든 반 = 모든 반이 다 열려 있을 때 켬) */
  const on = (rid: string) => { void ver; return targets.every((c) => !!manualOf(S, P.id, c).open[rid]); };
  /** 자동으로 열려 있나 (반 하나일 때만 · 진도 기준) */
  const autoLine = $derived.by(() => {
    void ver; if (cls === ALL) return null;
    const up = progressOf(S, cls), st = castleState(P, up, {}, false, { open: {}, auto });
    return { up, isOpen: st.isOpen };
  });
  const say = (t: string) => { note = t; setTimeout(() => (note = ''), 2200); };
  function all(open: boolean) { setManual(S, P.id, targets, P.rooms.map((r) => r.id), open); ver++; say(`${cls === ALL ? '모든 반' : `${cls}반`} · ${floorName(P)} ${open ? '🔓 전체 해금' : '🔒 교사 해금 모두 끔'}`); }
  function one(rid: string) { const v = !on(rid); setManual(S, P.id, targets, [rid], v); ver++; }
</script>

<Sheet {onclose} tall mainText="닫기">
  {#snippet title()}🔓 해금 관리 · {floorName(P)}{/snippet}
  <div class="ul" data-k="castle-unlock">
    <div class="chips" role="tablist" aria-label="반">{#each [...CLASSES, ALL] as c (c)}<button type="button" role="tab" class:on={cls === c} aria-selected={cls === c} data-cls={c} onclick={() => (cls = c)}>{c === ALL ? c : `${c}반`}</button>{/each}</div>
    <div class="row"><button type="button" class="b1" data-k="unlock-all" onclick={() => all(true)}>🔓 전체 해금</button><button type="button" class="b2" data-k="lock-all" onclick={() => all(false)}>🔒 전체 잠금</button></div>
    <button type="button" class="auto" role="switch" aria-checked={auto} data-k="auto-switch" onclick={() => { setAuto(S, P.id, !auto); ver++; }}><span><b>자동 해금</b><small>{auto ? '진도(그 차시를 배우면) · 👑 보스 = 열린 방 60% 처치 · 교사가 연 방은 더해져요' : '꺼짐 = 선생님이 연 방만 열려요 (모든 반 · 이 층)'}</small></span><i class="sw" class:on={auto} aria-hidden="true"></i></button>
    <p class="hint">{cls === ALL ? '모든 반에 같이 적용 · 스위치 켬 = 모든 반이 열려 있음' : autoLine ? `${cls}반 진도 ${autoLine.up}차시 · 「자동」 = 지금 자동으로 열린 방` : ''}</p>
    <ul class="rooms">
      {#each P.rooms as r (r.id)}
        {@const o = on(r.id)}
        <li><button type="button" class="rm" role="switch" aria-checked={o} data-room={r.id} onclick={() => one(r.id)}>
          <span class="nm"><b>{r.boss && !r.title.startsWith('👑') ? '👑 ' : ''}{r.title}</b><small>{r.no}차시{r.boss ? ' · 교사가 열면 60% 없이' : ''}{autoLine && auto && !r.boss && autoLine.isOpen(r) ? ' · 자동 열림' : ''}</small></span>
          <em class:open={o}>{o ? '🔓 열림' : '🔒'}</em></button></li>
      {/each}
    </ul>
    {#if note}<p class="note" role="status">{note}</p>{/if}
  </div>
</Sheet>

<style>
  .ul { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s4); }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .chips button { flex: none; min-height: 40px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .row { display: flex; gap: var(--s2); }
  .b1, .b2 { flex: 1; min-height: 48px; border-radius: 12px; font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .b1 { border: 0; background: var(--accent); color: var(--on-accent); } .b2 { border: 1px solid var(--line); background: none; color: var(--text); }
  .b1:active, .b2:active { transform: translateY(2px); box-shadow: none; }
  .auto { display: flex; align-items: center; gap: var(--s3); min-height: 56px; padding: var(--s2) var(--s3); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); text-align: left; font: inherit; }
  .auto span { flex: 1; display: flex; flex-direction: column; gap: 2px; } .auto b { font-size: 15px; } .auto small { font-size: 13px; color: var(--text-2); }
  .sw { flex: none; width: 44px; height: 26px; border-radius: 13px; background: var(--line); position: relative; }
  .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 10px; background: #fff; transition: left var(--t); }
  .sw.on { background: var(--ok); } .sw.on::after { left: 21px; }
  .hint, .note { margin: 0; font-size: 13px; color: var(--text-2); }
  .rooms { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rm { width: 100%; min-height: 52px; display: flex; align-items: center; gap: var(--s2); padding: 6px var(--s3); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); text-align: left; font: inherit; }
  .rm[aria-checked='true'] { border-color: var(--ok); }
  .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; } .nm b { font-size: 14px; } .nm small { font-size: 13px; color: var(--text-3); }
  .rm em { font-style: normal; font: 700 13px var(--font); color: var(--text-3); } .rm em.open { color: var(--ok); }
</style>
