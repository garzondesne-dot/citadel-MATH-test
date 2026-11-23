<script lang="ts">
  import type { LessonPack, Room, Store } from '../../model/types';
  import type { Live } from '../../school/school';
  import type { Carry } from '../../school/carry';
  import { DOW, hhmm, kst } from '../../school/bells';
  import { AUTO_NOTE, autoCfg, dayKey, dayOff, isOpenCls, setAuto, skipToday, todaySlots, type Slot } from '../../school/autoOpen';
  import Sheet from '../battle/Sheet.svelte';

  // 📅 오늘 시간표 (📜 2026-11-17 #21 E · 시안 Uj7jgeePofh2x9fmKzjqGZ ⑩ ⑪): ⚔ 수업 탭 맨 위 · 시간표를 쓸 때만 · 오늘 칸만 · 끝난 교시 흐리게
  //   바로 다음 수업 = 「▶ 바로 열기」(⭐ 다음 차시 · 확인 창) · 머리 오른쪽 「⏰ 자동 열기」(기본 끔) · 칸마다 「오늘 건너뛰기」 · 「이날은 자동 끔」
  const { S, packs, now, live, liveRoom, onopen }: {
    S: Store; packs: LessonPack[]; now: number; live: Live | null; liveRoom: Room | null;
    onopen: (cls: string, L: LessonPack, from?: { step: number; fresh: string | null }, carry?: Carry | null) => void;
  } = $props();
  let ver = $state(0);
  const k = $derived(kst(now));
  const rows = $derived.by(() => { void ver; return todaySlots(S, now, packs); });
  const cfg = $derived.by(() => { void ver; return autoCfg(S); });
  const day = $derived(dayKey(now));
  const offToday = $derived(!!cfg.off?.[day]);
  const openNow = $derived(!!live && !!liveRoom && !liveRoom.state.closed);
  let ask = $state<Slot | null>(null), offOpen = $state(false), offDay = $state('');
  const offDays = $derived(Object.keys(cfg.off || {}).filter((d) => cfg.off?.[d] && d >= day).sort());
</script>

<div class="card today" data-k="today">
  <div class="hd"><span class="lab">📅 오늘 시간표 · {k.m}/{k.d} ({DOW[k.dow]})</span>
    <button type="button" class="asw" class:on={!!cfg.on} role="switch" aria-checked={!!cfg.on} data-k="auto-sw" onclick={() => { setAuto(S, !cfg.on); ver++; }}>⏰ 자동 열기 <b>{cfg.on ? '켬' : '끔'}</b></button>
  </div>
  {#if cfg.on}<p class="hint" data-k="auto-note">⏰ {AUTO_NOTE} (화면이 꺼지면 안 열림)</p>{/if}
  {#if !rows.length}
    <p class="hint">오늘은 시간표에 수업이 없어요</p>
  {:else}
    <ul class="rows">
      {#each rows as r (r.p)}
        {@const open1 = isOpenCls(S, live, r.cls)}
        <li class:done={r.done} class:nx={r.next} data-p={r.p}>
          <span class="pp"><b>{r.p}</b><small>{r.hm}</small></span>
          <span class="tx"><b>{r.cls}반</b> · {r.L ? `⭐ ${r.L.no}차시` : '다음 차시 없음'}{#if open1}<em class="op">🟢 수업 중</em>{:else if r.opened}<em>⏰ 열었음</em>{:else if cfg.on && !offToday && !r.done}<em class:sk={r.skip}>{r.skip ? '건너뜀' : `⏰ ${hhmm(r.start)}`}</em>{/if}</span>
          {#if r.next && !open1 && r.L}<button type="button" class="go" data-k="go-now" disabled={openNow} onclick={() => (ask = r)}>▶ 바로 열기</button>
          {:else if cfg.on && !offToday && !r.done && !r.opened && !open1}<button type="button" class="sk" data-k="skip-{r.p}" onclick={() => { skipToday(S, now, r.p, !r.skip); ver++; }}>{r.skip ? '되살리기' : '오늘 건너뛰기'}</button>{/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if cfg.on}<div class="foot"><button type="button" class="tlink" data-k="day-off" onclick={() => { offDay = day; offOpen = true; }}>{offToday ? '⏸ 오늘은 자동 끔' : '이날은 자동 끔 ›'}</button><small>시작종에 종합실 PC 가 열어요 · 1분 전 🔔</small></div>{/if}
</div>
<p class="sep">— 수동으로 열기 —</p>

{#if ask && ask.L}
  <Sheet onclose={() => (ask = null)}>
    {#snippet title()}이 수업을 열까요?{/snippet}
    {#snippet act()}<div class="oarow"><button type="button" class="btn2" onclick={() => (ask = null)}>아니요</button><button type="button" class="btn" data-k="go-now-yes" onclick={() => { const a = ask; ask = null; if (a?.L) onopen(a.cls, a.L); }}>▶ 열기</button></div>{/snippet}
    <div class="oabox"><b class="oacls">{ask.p}교시 · {ask.cls}반</b><b class="oano">{ask.L.no}차시</b><span class="oatt">{ask.L.title}</span></div>
  </Sheet>
{/if}
{#if offOpen}
  <Sheet onclose={() => (offOpen = false)}>
    {#snippet title()}이날은 자동 끔{/snippet}
    {#snippet act()}<button type="button" class="btn" data-k="day-off-save" disabled={!offDay} onclick={() => { dayOff(S, offDay, !cfg.off?.[offDay]); ver++; offOpen = false; }}>{cfg.off?.[offDay] ? '이날 다시 켜기' : '이날 자동 끔'}</button>{/snippet}
    <input class="din" type="date" data-k="day-off-in" bind:value={offDay} />
    {#if offDays.length}<p class="hint">꺼 둔 날: {offDays.join(' · ')}</p>{/if}
  </Sheet>
{/if}

<style>
  .today .hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .asw { min-height: 40px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); box-shadow: 0 2px 0 var(--press-sh); } .asw b { color: var(--text-3); margin-left: 4px; } .asw.on { border-color: var(--accent); } .asw.on b { color: var(--accent); }
  .rows { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rows li { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 4px 6px 4px 8px; border-radius: var(--r-sm); background: var(--surface-2); }
  .rows li.done { opacity: 0.4; } .rows li.nx { box-shadow: inset 0 0 0 2px var(--accent); }
  .pp { display: flex; flex-direction: column; align-items: center; width: 44px; flex: none; } .pp b { font-size: 16px; } .pp small { font-size: 11px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .tx { flex: 1; min-width: 0; font-size: 14px; } .tx em { font-style: normal; margin-left: 6px; font-size: 12px; color: var(--text-2); } .tx em.sk { text-decoration: line-through; } .tx em.op { color: var(--ok); }
  .go { flex: none; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 0; background: var(--accent); color: var(--on-accent); font: 800 14px var(--font); } .go:disabled { opacity: 0.4; }
  .sk { flex: none; min-height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 600 12px var(--font); }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; } .foot small { color: var(--text-3); font-size: 12px; }
  .sep { margin: 2px 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .oabox { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0 4px; text-align: center; } .oacls { font-size: 22px; color: var(--text-2); } .oano { font-size: 40px; color: var(--accent); line-height: 1.1; } .oatt { font-size: 18px; font-weight: 700; }
  .oarow { display: flex; gap: 8px; } .oarow button { flex: 1; min-height: 52px; }
  .din { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 600 18px var(--font); padding: 0 12px; color-scheme: dark; }
  .hint { margin: 6px 0 0; font-size: 13px; color: var(--text-3); }
</style>
