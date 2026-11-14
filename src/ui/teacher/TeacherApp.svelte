<script lang="ts">
  import { HALLKEY } from '../../school/school';
  import { onDestroy, untrack } from 'svelte';
  import './teacher.css';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { openRoom, roomPath } from '../../raid/actions';
  import { liveNow, newCode, newKey, setLast, setLastTest, setLive, type Live } from '../../school/school';
  import { clock, useClock } from '../clock.svelte';
  import { liveValue } from '../room.svelte';
  import THome from './THome.svelte';
  import TLive from './TLive.svelte';
  import TPupils from './TPupils.svelte';
  import TPrep from './TPrep.svelte';
  import TNews from './TNews.svelte';
  import TMe from './TMe.svelte';
  import TGate from './TGate.svelte';
  import Sheet from '../battle/Sheet.svelte';
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
  // ?tab=me 등 = 처음 열 탭 (공격 갤러리 「‹ 나가기」 · 뒤로 가기 = 「나」 탭으로)
  const tab0 = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tab') : null;
  let tab = $state<'class' | 'pupil' | 'prep' | 'news' | 'me'>((['class', 'pupil', 'prep', 'news', 'me'] as const).find((k) => k === tab0) ?? 'class');
  // 🔁 새로 고침돼도 보던 탭으로 (📜 2026-11-14 모든 판 공통 화면 규칙 ①): 탭이 바뀌면 주소 ?tab= 만 고침(기록 안 늘림)
  $effect(() => { const t = tab; untrack(() => { try { const q = new URLSearchParams(location.search); if (q.get('tab') === t || (t === 'class' && !q.has('tab'))) return; q.set('tab', t); history.replaceState(history.state, '', `${location.pathname}?${q}`); } catch { /* 주소를 못 고치는 곳 */ } }); });
  let prepWant = $state(''); // ⑫ 「＋ n차시 · 준비 안 됨」 → 준비 탭 그 차시 (#130 ③)

  // 🔐 시험 서버 = 교사 로그인(admins)이 있어야 방을 만들 수 있음 (🚨 2026-11-13 밤 선생님 「수업 방이 개설 안 되네?」 · 로그인 없이 누르면 서버가 거부 → 「수업 방을 찾지 못했어요」)
  //   → 열기 전에 막고 「🔐 교사 로그인」으로 안내 (로그인 뒤 같은 반 · 차시로 다시 누름)
  type AS = Store & { auth?: unknown; isAdmin?: () => boolean };
  const needAdmin = () => !!(S as AS).auth && !(S as AS).isAdmin?.();
  let loginAsk = $state(false), loginGo = $state(false);
  const gate = needAdmin(); // 🔐 입구 (📜 2026-11-13 밤 선생님 「진행」): 서버인데 교사 로그인 안 한 폰 = 교사 화면 대신 로그인 화면만 (로그인하면 새로 고침)
  function open(cls: string, L: LessonPack, test = false, from?: { step: number; fresh: string | null }) {
    if (needAdmin()) { loginAsk = true; return; }
    const code = newCode(), key = S.get<string>(HALLKEY) || S.get<string>('school/teacher/hallKey') || newKey(); // 🖥 종합실 비밀번호 고정 (⑲) · 🔐 #163-① 교사만 읽는 secrets
    openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
    const pr = S.get<Record<string, number>>(`school/prep/${L.id}`); // 📋 차시 준비 기본값 (⑰) → 방에 옮겨 적음
    if (pr && !test) Object.entries(pr).forEach(([k, v]) => S.set(`${roomPath(code)}/meta/${k}`, v));
    S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`secrets/${code}/hallKey`, key); // 🔐 TV 는 이 키를 쳐서 hosts 에 등록 (방 meta · school/live 에는 키를 안 둠)
    if (from) { S.set(`${roomPath(code)}/meta/resumeFrom`, from.step); if (from.fresh) S.set(`${roomPath(code)}/meta/fresh/${from.fresh}`, true); } // ⏯ 이어서
    if (!test) S.set(`${roomPath(code)}/meta/limit`, true);
    setLive(S, { code, cls, lesson: L.id, ...(test ? { test: true } : {}) });
    (test ? setLastTest : setLast)(S, cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code }); // ⏯ 🧪 테스트도 이어서 (#133 · 따로 저장)
    page = 'live';
  }
  function closed() {
    if (live && liveL) { const R2 = S.get<Room>(roomPath(live.code)); if (R2) (live.test ? setLastTest : setLast)(S, live.cls, { lesson: live.lesson, no: liveL.no, at: S.now(), done: !!R2.state.stop?.done, code: live.code }); } // ⏯ 닫힌 그때 자리 = 방 state.stop
    setLive(S, null); page = 'home';
  }
  let wideDash = $state(false); // 📊 대시보드 펼친 화면이면 교사 폰 기둥(430) 대신 화면 전체
  let unread = $state(untrack(() => unreadN(S))); // 🔔 소식 탭 빨간 점 = 안 본 수
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '학생'], ['prep', '📋', '준비'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
</script>

<div class="tp" class:wide={wideDash && tab === 'pupil' && page === 'home'}>
  {#if gate}
    <TGate {S} />
  {:else if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      <THome {S} {packs} {now} {live} liveRoom={liveR} onopen={(c, L, from) => open(c, L, false, from)} onresume={() => (page = 'live')} ontest={(L, c, from) => open(c || '1-1', L, true, from)} onprep={(id) => { prepWant = id; tab = 'prep'; }} />
    {:else if tab === 'pupil'}
      <TPupils {S} ondash={(w) => (wideDash = w)} />
    {:else if tab === 'prep'}
      {#key prepWant}<TPrep {S} {packs} {now} want={prepWant} ontest={(L) => open('1-1', L, true)} />{/key}
    {:else if tab === 'news'}
      <TNews {S} {packs} onread={() => (unread = unreadN(S))} />
    {:else}
      {#key loginGo}<TMe {S} login0={loginGo} />{/key}
    {/if}
    {#if live && liveL}
      <div class="lbar"><i class="live"></i><span>{live.cls}반 · {liveL.no}차시 · <b>{liveR && (liveR.state.step ?? -1) < 0 ? '대기실' : '수업 중'}</b></span><button type="button" onclick={() => (page = 'live')}>돌아가기 ›</button></div>
    {:else}
      <nav class="tabs" aria-label="교사 메뉴">{#each TABS as [k, ic, t] (k)}<button type="button" class:on={tab === k} aria-current={tab === k ? 'page' : undefined} onclick={() => (tab = k)}>{#if k === 'news' && unread}<i class="rdot" aria-label="안 본 소식 {unread}">{unread}</i>{/if}<span class="ico">{ic}</span>{t}</button>{/each}</nav>
    {/if}
  {/if}
</div>

{#if loginAsk}
  <Sheet onclose={() => (loginAsk = false)} mainText="🔐 교사 로그인하러" onmain={() => { loginAsk = false; loginGo = true; tab = 'me'; }}>
    {#snippet title()}🔐 교사 로그인이 필요해요{/snippet}
    <p class="lq" data-k="need-login">시험 서버에 수업 방을 만들려면 이 폰이 교사로 로그인되어 있어야 해요<br /><small>「나」 탭 → 🔐 교사 로그인 → 다시 「▶ 수업 열기」</small></p>
  </Sheet>
{/if}


<style>
  .lq { margin: 0; text-align: center; color: var(--text-2); font-size: 15px; line-height: 1.5; } .lq small { color: var(--text-3); font-size: 13px; }
  .rdot { position: absolute; top: 6px; left: 55%; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--bad); color: #fff; font: 700 11px var(--font); font-style: normal; display: grid; place-items: center; }
</style>
