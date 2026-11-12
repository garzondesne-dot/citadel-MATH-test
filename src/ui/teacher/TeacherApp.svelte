<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import './teacher.css';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { openRoom, roomPath } from '../../raid/actions';
  import { CLASSES, hasAccount, liveNow, newCode, newKey, resetPw, roster, setLast, setLive, type Live } from '../../school/school';
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

  function open(cls: string, L: LessonPack, test = false) {
    const code = newCode(), key = newKey();
    openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
    S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`${roomPath(code)}/meta/key`, key);
    if (!test) S.set(`${roomPath(code)}/meta/limit`, true);
    setLive(S, { code, cls, lesson: L.id, key, ...(test ? { test: true } : {}) });
    if (!test) setLast(S, cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code });
    page = 'live';
  }
  function closed() {
    if (live && liveR && !live.test && liveL) { const R2 = S.get<Room>(roomPath(live.code)); if (R2) setLast(S, live.cls, { lesson: live.lesson, no: liveL.no, at: S.now(), done: (R2.state.step ?? -1) >= liveL.steps.length, code: live.code }); }
    setLive(S, null); page = 'home';
  }
  let pupCls = $state(CLASSES[0] as string);
  let ver = $state(0);
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '학생'], ['prep', '📋', '준비'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
  const NOT_YET = '테스트 판에는 아직 없어요';
</script>

<div class="tp">
  {#if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      <THome {S} {packs} {now} {live} liveRoom={liveR} onopen={(c, L) => open(c, L)} onresume={() => (page = 'live')} ontest={(L) => open('1-1', L, true)} />
    {:else if tab === 'pupil'}
      <div class="tbar"><div class="t">학생<small>명단 · 비밀번호 0000 으로</small></div></div>
      <div class="mid">
        <div class="cls4" role="group" aria-label="반">{#each CLASSES as c (c)}<button type="button" class:on={pupCls === c} onclick={() => (pupCls = c)}>{c}반</button>{/each}</div>
        <div class="roll">
          {#each roster(pupCls) as p (p.uid)}
            {@const acc = ver >= 0 && hasAccount(S, p.cls, p.num)}
            <button type="button" class="rp" class:no={!acc} disabled={!acc} aria-label="{p.num}번 {p.name} {acc ? '비밀번호 0000 으로' : '아직 가입 안 함'}" onclick={() => { resetPw(S, p.cls, p.num); ver++; }}><b>{p.num}</b>{p.name}</button>
          {/each}
        </div>
        <p class="hint">가입한 학생 칸을 누르면 비밀번호가 <b>0000</b> 으로 바뀌어요 · 흐린 칸 = 아직 가입 안 함</p>
        <button type="button" class="item" disabled><span class="ic">📊</span><span class="tx"><b>대시보드</b><small>{NOT_YET}</small></span></button>
      </div>
    {:else}
      {@const rows = tab === 'prep' ? [['🗂', '수업 준비', '재도전 횟수 기본 3번 (기회 4번)'], ['📅', '시간표', '수업 탭 「시간표 넣기 ›」'], ['🧭', '진도', NOT_YET], ['📦', '차시 팩 올리기', NOT_YET]] : tab === 'news' ? [['💬', '의견', NOT_YET], ['📸', '사진 채점', NOT_YET], ['📝', '설문', NOT_YET], ['🧪', '출제 확인', NOT_YET], ['📢', '공지 · 선물', NOT_YET]] : [['🔑', '종합실 비밀번호', live ? `지금 수업 키 ${live.key}` : '수업을 열면 키가 생겨요'], ['🚪', '로그아웃', NOT_YET]]}
      <div class="tbar"><div class="t">{tab === 'prep' ? '준비' : tab === 'news' ? '소식' : '나'}</div></div>
      <div class="mid"><div class="list">{#each rows as [ic, t, s] (t)}<button type="button" class="item" disabled><span class="ic">{ic}</span><span class="tx"><b>{t}</b><small>{s}</small></span></button>{/each}</div></div>
    {/if}
    {#if live && liveL}
      <div class="lbar"><i class="live"></i><span>{live.cls}반 · {liveL.no}차시 · <b>{liveR && (liveR.state.step ?? -1) < 0 ? '대기실' : '수업 중'}</b></span><button type="button" onclick={() => (page = 'live')}>돌아가기 ›</button></div>
    {:else}
      <nav class="tabs" aria-label="교사 메뉴">{#each TABS as [k, ic, t] (k)}<button type="button" class:on={tab === k} aria-current={tab === k ? 'page' : undefined} onclick={() => (tab = k)}><span class="ico">{ic}</span>{t}</button>{/each}</nav>
    {/if}
  {/if}
</div>

<style>
  .cls4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .cls4 button { height: 44px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); }
  .cls4 button.on { border: 2px solid var(--accent); background: var(--surface-2); }
  .roll { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
  .rp { height: 40px; display: flex; align-items: center; justify-content: center; gap: 4px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); white-space: nowrap; }
  .rp b { font-size: 13px; opacity: 0.7; }
  .rp.no { opacity: 0.4; background: none; border-style: dashed; }
</style>
