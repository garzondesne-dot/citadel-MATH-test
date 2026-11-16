<script lang="ts">
  import { BETA } from '../../channel';
  import { withCarry, carryOfRoom, type Carry } from '../../school/carry';
  import { onDestroy, untrack } from 'svelte';
  import { setTeacherSink } from '../../store/me.svelte';
  import { notePref, syncPush, watchTeacherNotes } from '../../school/notify.svelte';
  import './teacher.css';
  import type { LessonPack, Room, Store } from '../../model/types';
    import { roomPath } from '../../raid/actions';
  import { liveNow, setLast, setLastTest, setLive, type Live } from '../../school/school';
  import { openLesson, type KeyMode } from '../../school/openLesson';
  import { testCls, type TestMode } from './flow';
  import { setBots } from '../../raid/botRun.svelte';
  import { endClass } from '../../raid/actions';
  import StuTry from './StuTry.svelte';
  import TSim from './TSim.svelte';
  import TSettings from './TSettings.svelte';
  import { dressed, rdunMeta } from '../rdun';
  import { dayKey, pickToday, skipToday, soonSlot } from '../../school/autoOpen';
  import { feat } from '../../school/features.svelte';
  import { notify } from '../../school/notify.svelte';
  import { clock, useClock } from '../clock.svelte';
  import { liveValue } from '../room.svelte';
  import THome from './THome.svelte';
  import TLive from './TLive.svelte';
  import TPupils from './TPupils.svelte';
  import TPacks from './TPacks.svelte';
  import TNews from './TNews.svelte';
  import TMe from './TMe.svelte';
  import TGate from './TGate.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { unreadN } from '../../school/inbox';
  import { chanOf, teacherSeenPath, teacherSync, type Change } from '../../school/changes';
  import { BUILD } from '../../build';
  import ChangeList from './ChangeList.svelte';

  // 📱 교사 폰 (#119 ⑫ ⑬ ⑭) — 수업이 없으면 아래 탭 5(수업 · 학생 · 준비 · 소식 · 나) · 수업이 열리면 탭 자리에 같은 높이 「수업 중 막대」(TLive)
  const { S, packs }: { S: Store; packs: LessonPack[] } = $props();
  setTeacherSink(untrack(() => S), true); // 👩‍🏫 교사 「내 용사」 → 서버 school/tlook (교실 TV 🎮 시연이 따름)
  const stopClock = useClock();
  const lv = untrack(() => liveValue<Live>(S, 'school/live'));
  const stopNotes = untrack(() => watchTeacherNotes(S));
  untrack(() => { if (notePref.on) setTimeout(() => void syncPush(S), 3000); }); // 🔔 앱을 닫아도 오는 알림 = 받는 주소 다시 적음(열 때마다 · 주소가 바뀌어도 이어지게) // 🔔 교사 알림 ① (교사 폰이 열려 있는 동안 · 「나」 → 🔔 알림 에서 켬)
  onDestroy(() => { stopClock(); lv.stop(); stopNotes(); });
  const now = $derived(clock.now);
  const live = $derived(lv.v.val);
  const liveR = $derived(live ? S.get<Room>(roomPath(live.code)) : null);
  const liveL = $derived.by(() => { const b = live ? packs.find((p) => p.id === live.lesson) ?? null : null; return b && live ? withCarry(b, carryOfRoom(S, live.code), packs) : b; }); // 📦 B 넘어온 몬스터
  let page = $state<'home' | 'live'>(untrack(() => (liveNow(S) ? 'live' : 'home')));
  // ?tab=me 등 = 처음 열 탭 (공격 갤러리 「‹ 나가기」 · 뒤로 가기 = 「나」 탭으로)
  const tab0 = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tab') : null;
  let tab = $state<'class' | 'pupil' | 'prep' | 'news' | 'me'>((['class', 'pupil', 'prep', 'news', 'me'] as const).find((k) => k === tab0) ?? 'class');
  // 🔁 새로 고침돼도 보던 탭으로 (📜 2026-11-14 모든 판 공통 화면 규칙 ①): 탭이 바뀌면 주소 ?tab= 만 고침(기록 안 늘림)
  $effect(() => { const t = tab; untrack(() => { try { const q = new URLSearchParams(location.search); if (q.get('tab') === t || (t === 'class' && !q.has('tab'))) return; q.set('tab', t); history.replaceState(history.state, '', `${location.pathname}?${q}`); } catch { /* 주소를 못 고치는 곳 */ } }); });
  let testWant = $state(''); // 📦 차시 카드 「🧪 테스트로 열기」 → ⚔ 수업 탭 🧪 + 그 차시 (📜 2026-11-17 #22)

  // 🔐 시험 서버 = 교사 로그인(admins)이 있어야 방을 만들 수 있음 (🚨 2026-11-13 밤 선생님 「수업 방이 개설 안 되네?」 · 로그인 없이 누르면 서버가 거부 → 「수업 방을 찾지 못했어요」)
  //   → 열기 전에 막고 「🔐 교사 로그인」으로 안내 (로그인 뒤 같은 반 · 차시로 다시 누름)
  type AS = Store & { auth?: unknown; isAdmin?: () => boolean };
  const needAdmin = () => !!(S as AS).auth && !(S as AS).isAdmin?.();
  let loginAsk = $state(false), setOpen = $state<'' | 'main' | 'login'>(''); // ⚙ 상시 설정 (📜 2026-11-17 #21 A)
  const gate = needAdmin(); // 🔐 입구 (📜 2026-11-13 밤 선생님 「진행」): 서버인데 교사 로그인 안 한 폰 = 교사 화면 대신 로그인 화면만 (로그인하면 새로 고침)
  // 🆕 바뀐 것 (📜 2026-11-15 · school/changes.ts): 교사 로그인한 폰 · 정식 = 못 본 판을 아래 창으로(확인했어요 = 본 판) + 소식 탭 한 통씩 / 베타 = 창 없이 소식 탭 한 통씩(그 자리에서 본 판)
  const tUid = untrack(() => (S as Store & { auth?: { currentUser: { uid: string } | null } }).auth?.currentUser?.uid ?? ((S as AS).auth ? '' : 'local'));
  const chan = chanOf();
  let newsList = $state<Change[]>(untrack(() => (!gate && tUid ? teacherSync(S, tUid, chan, BUILD, S.now(), chan === 'beta') : [])));
  const newsOpen = $derived(chan === 'rel' && newsList.length > 0);
  function newsOk() { if (tUid) S.set(teacherSeenPath(tUid, 'rel'), BUILD); newsList = []; }
  // 🧪 테스트 (📜 2026-11-17 #21): 📱 리모컨만 = 실제와 같은 방(테스트 반 계정 · 🤖 봇) · 🖥 = 이 폰 한 화면(종합실 + 리모컨) · 🎒 = 학생 폰 + 진행 리모컨 — 기록 안 남음
  let sim = $state<{ kind: 'tv' | 'stu'; L: LessonPack; n: number } | null>(null);
  function open(cls: string, L: LessonPack, test = false, from?: { step: number; fresh: string | null }, carry?: Carry | null, keyMode?: KeyMode, bots = 0) {
    if (needAdmin()) { loginAsk = true; return; }
    const code = openLesson(S, cls, L, { test, from, carry, keyMode });
    if (test && bots > 0) setBots(S, L, code, true, bots);
    page = 'live';
  }
  function openTest(L: LessonPack, mode: TestMode, bots: number, from?: { step: number; fresh: string | null }, carry?: Carry | null, keyMode?: KeyMode) {
    if (mode === 'remote') open(testCls(S), L, true, from, carry, keyMode, bots);
    else sim = { kind: mode === 'tv' ? 'tv' : 'stu', L: dressed(L, rdunMeta(S, L)), n: bots }; // 🎲 던전 = 교사 설정 그대로 (📜 #22)
  }
  function stopLive() { if (live && liveL) endClass(S, liveL, live.code); closed(); }
  function closed() {
    if (live && liveL) { const R2 = S.get<Room>(roomPath(live.code)); if (R2) (live.test ? setLastTest : setLast)(S, live.cls, { lesson: live.lesson, no: liveL.no, at: S.now(), done: !!R2.state.stop?.done, code: live.code }); } // ⏯ 닫힌 그때 자리 = 방 state.stop
    setLive(S, null); page = 'home';
  }
  let wideDash = $state(false); // 📊 대시보드 펼친 화면이면 교사 폰 기둥(430) 대신 화면 전체
  let unread = $state(untrack(() => unreadN(S))); // 🔔 소식 탭 빨간 점 = 안 본 수 + 📷 확인할 사진
  const phStop = untrack(() => (S.kind === 'server' ? S.watch('photo', () => (unread = unreadN(S))) : () => {})); onDestroy(phStop);
  // ⏰ 자동 열기 1분 전 🔔 (📜 2026-11-17 #21 E): 「1분 뒤 자동으로 열려요 · [취소] · [다른 차시]」 · 여는 것은 종합실 PC
  const soon = $derived(feat('schedule') ? soonSlot(S, now, packs) : null);
  const soonKey = $derived(soon ? `${dayKey(now)}|${soon.p}|${soon.L?.id ?? ''}` : '');
  let soonSeen = $state(''), soonPick = $state(false), soonRang = '';
  $effect(() => { const k = soonKey, sl = soon; if (!k || !sl || k === soonRang) return; soonRang = k; untrack(() => void notify('test', '⏰ 1분 뒤 자동으로 열려요', `${sl.p}교시 · ${sl.cls}반 · ${sl.L?.no ?? ''}차시`)); });
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '반 · 시간표'], ['prep', '📦', '차시 팩'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
</script>

<div class="tp" class:wide={wideDash && tab === 'pupil' && page === 'home'}>
  {#if gate}
    <TGate {S} />
  {:else if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      {#key testWant}<THome {S} {packs} {now} {live} liveRoom={liveR} pre={testWant} onopen={(c, L, from, cv, km) => open(c, L, false, from, cv, km)} onresume={() => (page = 'live')} onstop={stopLive} ontest={openTest} onprep={() => (tab = 'prep')} />{/key}
    {:else if tab === 'pupil'}
      <TPupils {S} {now} ondash={(w) => (wideDash = w)} />
    {:else if tab === 'prep'}
      <TPacks {S} {packs} ontest={(id) => { testWant = id; tab = 'class'; }} />
    {:else if tab === 'news'}
      <TNews {S} {packs} onread={() => (unread = unreadN(S))} />
    {:else}
      <TMe {S} />
    {/if}
    <button type="button" class="gear" data-k="tgear" aria-label="설정" onclick={() => (setOpen = 'main')}>⚙</button>
    {#if live && liveL}
      <div class="lbar"><i class="live"></i><span>{live.test ? '🧪 테스트' : `${live.cls}반`} · {liveL.no}차시 · <b>{liveR && (liveR.state.step ?? -1) < 0 ? '대기실' : '수업 중'}</b></span><button type="button" onclick={() => (page = 'live')}>돌아가기 ›</button></div>
    {:else}
      <nav class="tabs" aria-label="교사 메뉴">{#each TABS as [k, ic, t] (k)}<button type="button" class:on={tab === k} aria-current={tab === k ? 'page' : undefined} onclick={() => (tab = k)}>{#if k === 'news' && unread}<i class="rdot" aria-label="안 본 소식 {unread}">{unread}</i>{/if}<span class="ico">{ic}</span>{t}</button>{/each}</nav>
    {/if}
  {/if}
  <!-- ⚙ 설정 창 = .tp 안 (🐞 11/17: 밖에 그려져 .tp .item 카드 모양이 안 먹던 것) -->
  {#if setOpen}<TSettings {S} login0={setOpen === 'login'} onclose={() => (setOpen = '')} />{/if}
</div>

{#if soon && soonKey !== soonSeen}
  <Sheet onclose={() => { soonSeen = soonKey; soonPick = false; }}>
    {#snippet title()}🔔 1분 뒤 자동으로 열려요{/snippet}
    {#snippet act()}{#if !soonPick}<div class="oarow"><button type="button" class="btn2" data-k="soon-cancel" onclick={() => { if (soon) skipToday(S, now, soon.p, true); soonSeen = soonKey; }}>취소</button><button type="button" class="btn2" data-k="soon-other" onclick={() => (soonPick = true)}>다른 차시</button><button type="button" class="btn" data-k="soon-ok" onclick={() => (soonSeen = soonKey)}>그대로</button></div>{/if}{/snippet}
    <p class="lq" data-k="soon">{soon.p}교시 {soon.hm} · <b>{soon.cls}반 · {soon.L?.no}차시</b><br /><small>종합실 PC 가 시작종에 열어요</small></p>
    {#if soonPick}<div class="spk">{#each packs as P (P.id)}<button type="button" class="btn2" class:on={P.id === soon.L?.id} data-no={P.no} onclick={() => { if (soon) pickToday(S, now, soon.p, P.id); soonPick = false; }}>{P.no}차시</button>{/each}</div>{/if}
  </Sheet>
{/if}
{#if sim}{#if sim.kind === 'stu'}<StuTry L={sim.L} bots={sim.n} onclose={() => (sim = null)} />{:else}<TSim L={sim.L} bots={sim.n} onclose={() => (sim = null)} />{/if}{/if}
{#if newsOpen}
  <Sheet onclose={newsOk} tall mainText="확인했어요" onmain={newsOk}>
    {#snippet title()}🆕 바뀐 것 · {newsList.length > 1 ? `${newsList[newsList.length - 1]?.ver} → ${BUILD}` : BUILD}{/snippet}
    <ChangeList list={newsList} chan="rel" />
  </Sheet>
{/if}
{#if loginAsk}
  <Sheet onclose={() => (loginAsk = false)} mainText="🔐 교사 로그인하러" onmain={() => { loginAsk = false; setOpen = 'login'; }}>
    {#snippet title()}🔐 교사 로그인이 필요해요{/snippet}
    <p class="lq" data-k="need-login">{BETA ? '시험 서버' : '서버'}에 수업 방을 만들려면 이 폰이 교사로 로그인되어 있어야 해요<br /><small>오른쪽 위 ⚙ → 🔐 교사 로그인 → 다시 「▶ 수업 열기」</small></p>
  </Sheet>
{/if}


<style>
  /* ⚙ = 모든 탭 위 막대 오른쪽 끝 (기둥 640 안) */
  .gear { position: absolute; top: 0; right: max(4px, calc((100% - 640px) / 2 + 4px)); z-index: 5; width: 48px; height: var(--bar-top); border: 0; background: none; color: var(--text-2); font-size: 22px; }
  .tp :global(.tbar) { padding-right: 52px; }
  .oarow { display: flex; gap: 8px; } .oarow button { flex: 1; min-height: 52px; }
  .spk { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; } .spk .on { border: 2px solid var(--accent); }
  .lq { margin: 0; text-align: center; color: var(--text-2); font-size: 15px; line-height: 1.5; } .lq small { color: var(--text-3); font-size: 13px; }
  .rdot { position: absolute; top: 6px; left: 55%; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--bad); color: #fff; font: 700 11px var(--font); font-style: normal; display: grid; place-items: center; }
</style>
