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
  import TPupils from './TPupils.svelte';
  import TPrep from './TPrep.svelte';
  import TNews from './TNews.svelte';
  import TMe from './TMe.svelte';
  import { unreadN } from '../../school/inbox';

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
  let prepWant = $state(''); // ⑫ 「＋ n차시 · 준비 안 됨」 → 준비 탭 그 차시 (#130 ③)

  function open(cls: string, L: LessonPack, test = false, from?: { step: number; fresh: string | null }) {
    const code = newCode(), key = S.get<string>('school/teacher/hallKey') || newKey(); // 🖥 종합실 비밀번호 고정 (⑲)
    openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
    const pr = S.get<Record<string, number>>(`school/prep/${L.id}`); // 📋 차시 준비 기본값 (⑰) → 방에 옮겨 적음
    if (pr && !test) Object.entries(pr).forEach(([k, v]) => S.set(`${roomPath(code)}/meta/${k}`, v));
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
  let wideDash = $state(false); // 📊 대시보드 펼친 화면이면 교사 폰 기둥(430) 대신 화면 전체
  let unread = $state(untrack(() => unreadN(S))); // 🔔 소식 탭 빨간 점 = 안 본 수
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '학생'], ['prep', '📋', '준비'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
</script>

<div class="tp" class:wide={wideDash && tab === 'pupil' && page === 'home'}>
  {#if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      <THome {S} {packs} {now} {live} liveRoom={liveR} onopen={(c, L, from) => open(c, L, false, from)} onresume={() => (page = 'live')} ontest={(L) => open('1-1', L, true)} onprep={(id) => { prepWant = id; tab = 'prep'; }} />
    {:else if tab === 'pupil'}
      <TPupils {S} ondash={(w) => (wideDash = w)} />
    {:else if tab === 'prep'}
      {#key prepWant}<TPrep {S} {packs} {now} want={prepWant} ontest={(L) => open('1-1', L, true)} />{/key}
    {:else if tab === 'news'}
      <TNews {S} {packs} onread={() => (unread = unreadN(S))} />
    {:else}
      <TMe {S} />
    {/if}
    {#if live && liveL}
      <div class="lbar"><i class="live"></i><span>{live.cls}반 · {liveL.no}차시 · <b>{liveR && (liveR.state.step ?? -1) < 0 ? '대기실' : '수업 중'}</b></span><button type="button" onclick={() => (page = 'live')}>돌아가기 ›</button></div>
    {:else}
      <nav class="tabs" aria-label="교사 메뉴">{#each TABS as [k, ic, t] (k)}<button type="button" class:on={tab === k} aria-current={tab === k ? 'page' : undefined} onclick={() => (tab = k)}>{#if k === 'news' && unread}<i class="rdot" aria-label="안 본 소식 {unread}">{unread}</i>{/if}<span class="ico">{ic}</span>{t}</button>{/each}</nav>
    {/if}
  {/if}
</div>

<style>
  .rdot { position: absolute; top: 6px; left: 55%; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--bad); color: #fff; font: 700 11px var(--font); font-style: normal; display: grid; place-items: center; }
</style>
