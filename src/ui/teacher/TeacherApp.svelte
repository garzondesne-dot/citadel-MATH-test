<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import './teacher.css';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { openRoom, roomPath } from '../../raid/actions';
  import { liveNow, newCode, newKey, setLast, setLive, type Live } from '../../school/school';
  import { clock, useClock } from '../clock.svelte';
  import { liveValue } from '../room.svelte';
  import THome from './THome.svelte';
  import TLive from './TLive.svelte';

  // 📱 교사 폰 (#119 ⑫ ⑬ ⑭) — 수업이 없으면 아래 탭 5(수업 · 학생 · 준비 · 소식 · 나) · 수업이 열리면 탭 자리에 같은 높이 「수업 중 막대」(TLive)
  const { S, packs }: { S: Store; packs: LessonPack[] } = $props();
  const stopClock = useClock();
  const lv = untrack(() => liveValue<Live>(S, 'school/live'));
  onDestroy(() => { stopClock(); lv.stop(); });
  const now = $derived(clock.now);
  const live = $derived(lv.v.val);
  const liveR = $derived(live ? S.get<Room>(roomPath(live.code)) : null);
  const liveL = $derived(live ? packs.find((p) => p.id === live.lesson) ?? null : null);
  let page = $state<'home' | 'live'>(untrack(() => (liveNow(S) ? 'live' : 'home')));
  let tab = $state<'class' | 'pupil' | 'prep' | 'news' | 'me'>('class');

  function open(cls: string, L: LessonPack, test = false, from?: { step: number; fresh: string | null }) {
    const code = newCode(), key = newKey();
    openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
    S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`${roomPath(code)}/meta/key`, key);
    if (from) { S.set(`${roomPath(code)}/meta/resumeFrom`, from.step); if (from.fresh) S.set(`${roomPath(code)}/meta/fresh/${from.fresh}`, true); } // ⏯ 이어서
    if (!test) S.set(`${roomPath(code)}/meta/limit`, true);
    setLive(S, { code, cls, lesson: L.id, key, ...(test ? { test: true } : {}) });
    if (!test) setLast(S, cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code });
    page = 'live';
  }
  function closed() {
    if (live && !live.test && liveL) { const R2 = S.get<Room>(roomPath(live.code)); if (R2) setLast(S, live.cls, { lesson: live.lesson, no: liveL.no, at: S.now(), done: !!R2.state.stop?.done, code: live.code }); } // ⏯ 닫힌 그때 자리 = 방 state.stop
    setLive(S, null); page = 'home';
  }
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '학생'], ['prep', '📋', '준비'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
</script>

<div class="tp">
  {#if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      <THome {S} {packs} {now} {live} liveRoom={liveR} onopen={(c, L, from) => open(c, L, false, from)} onresume={() => (page = 'live')} ontest={(L) => open('1-1', L, true)} />
    {:else}
      <!-- 학생 · 준비 · 소식 · 나 = 선생님이 탭마다 시안을 따로 보는 중 (#119 · 컨펌 뒤 따로) -->
      <div class="tbar"><div class="t">{TABS.find((x) => x[0] === tab)?.[2]}</div></div>
      <div class="mid"><div class="empty"><b>🛠</b><span>준비 중</span><small>이 탭은 시안을 보고 만들어요</small></div></div>
    {/if}
    {#if live && liveL}
      <div class="lbar"><i class="live"></i><span>{live.cls}반 · {liveL.no}차시 · <b>{liveR && (liveR.state.step ?? -1) < 0 ? '대기실' : '수업 중'}</b></span><button type="button" onclick={() => (page = 'live')}>돌아가기 ›</button></div>
    {:else}
      <nav class="tabs" aria-label="교사 메뉴">{#each TABS as [k, ic, t] (k)}<button type="button" class:on={tab === k} aria-current={tab === k ? 'page' : undefined} onclick={() => (tab = k)}><span class="ico">{ic}</span>{t}</button>{/each}</nav>
    {/if}
  {/if}
</div>

<style>
  .empty small { font-size: 13px; color: var(--text-3); }
</style>
