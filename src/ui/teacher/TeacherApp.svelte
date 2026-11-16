<script lang="ts">
  import { BETA } from '../../channel';
  import { roster, HALLKEY } from '../../school/school';
  import { withCarry, carryOfRoom, type Carry } from '../../school/carry';
  import { onDestroy, untrack } from 'svelte';
  import { setTeacherSink } from '../../store/me.svelte';
  import { notePref, syncPush, watchTeacherNotes } from '../../school/notify.svelte';
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
  let prepWant = $state(''); // ⑫ 「＋ n차시 · 준비 안 됨」 → 준비 탭 그 차시 (#130 ③)

  // 🔐 시험 서버 = 교사 로그인(admins)이 있어야 방을 만들 수 있음 (🚨 2026-11-13 밤 선생님 「수업 방이 개설 안 되네?」 · 로그인 없이 누르면 서버가 거부 → 「수업 방을 찾지 못했어요」)
  //   → 열기 전에 막고 「🔐 교사 로그인」으로 안내 (로그인 뒤 같은 반 · 차시로 다시 누름)
  type AS = Store & { auth?: unknown; isAdmin?: () => boolean };
  const needAdmin = () => !!(S as AS).auth && !(S as AS).isAdmin?.();
  let loginAsk = $state(false), loginGo = $state(false);
  const gate = needAdmin(); // 🔐 입구 (📜 2026-11-13 밤 선생님 「진행」): 서버인데 교사 로그인 안 한 폰 = 교사 화면 대신 로그인 화면만 (로그인하면 새로 고침)
  // 🆕 바뀐 것 (📜 2026-11-15 · school/changes.ts): 교사 로그인한 폰 · 정식 = 못 본 판을 아래 창으로(확인했어요 = 본 판) + 소식 탭 한 통씩 / 베타 = 창 없이 소식 탭 한 통씩(그 자리에서 본 판)
  const tUid = untrack(() => (S as Store & { auth?: { currentUser: { uid: string } | null } }).auth?.currentUser?.uid ?? ((S as AS).auth ? '' : 'local'));
  const chan = chanOf();
  let newsList = $state<Change[]>(untrack(() => (!gate && tUid ? teacherSync(S, tUid, chan, BUILD, S.now(), chan === 'beta') : [])));
  const newsOpen = $derived(chan === 'rel' && newsList.length > 0);
  function newsOk() { if (tUid) S.set(teacherSeenPath(tUid, 'rel'), BUILD); newsList = []; }
  function open(cls: string, L: LessonPack, test = false, from?: { step: number; fresh: string | null }, carry?: Carry | null) {
    if (needAdmin()) { loginAsk = true; return; }
    const code = newCode(), key = S.get<string>(HALLKEY) || S.get<string>('school/teacher/hallKey') || newKey(); // 🖥 종합실 비밀번호 고정 (⑲) · 🔐 #163-① 교사만 읽는 secrets
    openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
    const pr = S.get<Record<string, number>>(`school/prep/${L.id}`); // 📋 차시 준비 기본값 (⑰) → 방에 옮겨 적음
    if (pr) Object.entries(pr).forEach(([k, v]) => S.set(`${roomPath(code)}/meta/${k}`, v)); // 🧪 테스트 수업도 차시 준비 값 그대로 (📜 2026-11-14)
    if (test && pr?.solve == null) S.set(`${roomPath(code)}/meta/solve`, PROFILES.class.scoutSec); // 🌫 몬스터 등장(정찰) 기본 60초 = 실제 수업 · 🧪 테스트 수업 같음 (📜 2026-11-14 선생님 「등장 시간 기본값 60초로」 · 학생 혼자 🧪 테스트 모드 5초는 그대로)
    S.set(`${roomPath(code)}/meta/names`, Object.fromEntries(roster(cls, S).map((p) => [p.uid, p.name]))); // 📜 2026-11-16 선생님 「이름 전부 표기」 = TV 는 가린 명단만 읽을 수 있어서 교사가 연 방에 전체 이름을 적음 (방 = 그 수업 사람만)
    S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`secrets/${code}/hallKey`, key); // 🔐 TV 는 이 키를 쳐서 hosts 에 등록 (방 meta · school/live 에는 키를 안 둠)
    if (from) { S.set(`${roomPath(code)}/meta/resumeFrom`, from.step); if (from.fresh) S.set(`${roomPath(code)}/meta/fresh/${from.fresh}`, true); } // ⏯ 이어서
    if (!test) S.set(`${roomPath(code)}/meta/limit`, true);
    if (carry && !from) S.set(`${roomPath(code)}/meta/carry`, carry); // 📦 B 지난 차시에서 넘어온 몬스터 (이어서 = 그 방의 것 그대로)
    setLive(S, { code, cls, lesson: L.id, ...(test ? { test: true } : {}) });
    (test ? setLastTest : setLast)(S, cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code }); // ⏯ 🧪 테스트도 이어서 (#133 · 따로 저장)
    page = 'live';
  }
  function closed() {
    if (live && liveL) { const R2 = S.get<Room>(roomPath(live.code)); if (R2) (live.test ? setLastTest : setLast)(S, live.cls, { lesson: live.lesson, no: liveL.no, at: S.now(), done: !!R2.state.stop?.done, code: live.code }); } // ⏯ 닫힌 그때 자리 = 방 state.stop
    setLive(S, null); page = 'home';
  }
  let wideDash = $state(false); // 📊 대시보드 펼친 화면이면 교사 폰 기둥(430) 대신 화면 전체
  let unread = $state(untrack(() => unreadN(S))); // 🔔 소식 탭 빨간 점 = 안 본 수 + 📷 확인할 사진
  const phStop = untrack(() => (S.kind === 'server' ? S.watch('photo', () => (unread = unreadN(S))) : () => {})); onDestroy(phStop);
  const TABS = [['class', '⚔', '수업'], ['pupil', '👥', '반 · 시간표'], ['prep', '📋', '준비'], ['news', '✉', '소식'], ['me', '🙂', '나']] as const;
</script>

<div class="tp" class:wide={wideDash && tab === 'pupil' && page === 'home'}>
  {#if gate}
    <TGate {S} />
  {:else if live && liveL && page === 'live'}
    {#key live.code}<TLive {S} L={liveL} {live} {now} onhome={() => (page = 'home')} onclose={closed} />{/key}
  {:else}
    {#if tab === 'class'}
      <THome {S} {packs} {now} {live} liveRoom={liveR} onopen={(c, L, from, cv) => open(c, L, false, from, cv)} onresume={() => (page = 'live')} ontest={(L, c, from, cv) => open(c || '1-1', L, true, from, cv)} onprep={(id) => { prepWant = id; tab = 'prep'; }} />
    {:else if tab === 'pupil'}
      <TPupils {S} {now} ondash={(w) => (wideDash = w)} />
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

{#if newsOpen}
  <Sheet onclose={newsOk} tall mainText="확인했어요" onmain={newsOk}>
    {#snippet title()}🆕 바뀐 것 · {newsList.length > 1 ? `${newsList[newsList.length - 1]?.ver} → ${BUILD}` : BUILD}{/snippet}
    <ChangeList list={newsList} chan="rel" />
  </Sheet>
{/if}
{#if loginAsk}
  <Sheet onclose={() => (loginAsk = false)} mainText="🔐 교사 로그인하러" onmain={() => { loginAsk = false; loginGo = true; tab = 'me'; }}>
    {#snippet title()}🔐 교사 로그인이 필요해요{/snippet}
    <p class="lq" data-k="need-login">{BETA ? '시험 서버' : '서버'}에 수업 방을 만들려면 이 폰이 교사로 로그인되어 있어야 해요<br /><small>「나」 탭 → 🔐 교사 로그인 → 다시 「▶ 수업 열기」</small></p>
  </Sheet>
{/if}


<style>
  .lq { margin: 0; text-align: center; color: var(--text-2); font-size: 15px; line-height: 1.5; } .lq small { color: var(--text-3); font-size: 13px; }
  .rdot { position: absolute; top: 6px; left: 55%; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--bad); color: #fff; font: 700 11px var(--font); font-style: normal; display: grid; place-items: center; }
</style>
