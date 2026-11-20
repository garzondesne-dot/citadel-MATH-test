<script lang="ts">
  import { swUpdate } from './pwa.svelte';
  import { busy } from './ui/busy.svelte';
  import { bindFeatures, feat } from './school/features.svelte';
  import { rememberBoot } from './boot';
  import { untrack } from 'svelte';
  import type { LessonPack } from './model/types';
  import { PACKS, packOf } from './engine/packs';
  import { carryOfRoom, withCarry } from './school/carry'; // 📦 올린 차시 팩은 main.ts 가 띄우기 전에 더함
  import { dressed } from './ui/rdun';
  import { submitScreen } from './ui/submit.svelte';
  import { answerOf, itemsFor } from './raid/raid';
  import type { Room } from './model/types';
  import { SUBJ } from './engine/subject';
  import { PROFILES } from './model/profiles';
  import { validate } from './engine/lessons';
  import type { Store } from './model/types';
  import type { Where } from './store/config';
  import { bindMe } from './store/meSync';
  import { isReady, whenReady } from './store/atomic';
  import { BUILD, BUILD_ID, REV } from './build';
  import { BETA, TEST_ADDR, verName } from './channel';
  import Student from './ui/Student.svelte';
  import Camp from './ui/camp/Camp.svelte';
  import Title from './ui/Title.svelte';
  import { loadAtk, loadHall, loadTeacher } from './ui/lazy'; // 📦 교사 · TV · 갤러리 = 따로 받는 묶음 (main.ts 가 미리 받아 둠)
  import { pupil, saveLogin, savedLogin, type Live, type Pupil } from './school/school';
  import { meBound } from './store/meSync';
  import { liveValue } from './ui/room.svelte';
  import { holdWake, wakeTip } from './ui/wake.svelte';

  const q = new URLSearchParams(location.search);
  const role = q.get('role');
  const code = (q.get('room') || 'TEST').toUpperCase();
  const props: { S: Store; where: Where } = $props(); // 🔌 「어느 서버」 = main.ts 가 고름 (#137) · 한 번 정하면 그대로
  const S = untrack(() => props.S), where = untrack(() => props.where);
  bindFeatures(S); // ⚙ 우리 학교 기능 (school/features) — 모든 화면이 feat('id') 로 읽음
  // 🚶 💡 로딩 첫 화면 기억 = 켜진 기능의 팁 + 내 용사 (기능이 바뀌면 · 화면을 떠날 때마다 다시 적음 · src/boot.ts)
  $effect(() => { rememberBoot(feat); });
  $effect(() => { const f = () => rememberBoot(feat); addEventListener('pagehide', f); document.addEventListener('visibilitychange', f); return () => { removeEventListener('pagehide', f); document.removeEventListener('visibilitychange', f); }; });
  // 🚪 뒤로 가기를 계속 눌러도 첫 화면(로그인)까지는 오지 않게 (📜 2026-11-13 밤 · 실수 방지) — 처음 화면은 「🚪 처음 화면으로」 단추로만
  //   로그인한 학생 캠프 · 교사 폰 · 교실 TV: 지금 자리에 문지기 기록 하나를 쌓고, 그 밖으로 나가려 하면 다시 쌓음
  const gateRole = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('role') : null;
  if (typeof history !== 'undefined' && (gateRole === 'teacher' || gateRole === 'hall' || (!gateRole && !!savedLogin()))) {
    if (!history.state?.gate) history.pushState({ gate: 1 }, '');
    addEventListener('popstate', (e) => { if (!(e.state as { gate?: number } | null)?.gate) history.pushState({ gate: 1 }, ''); });
  }
  // 화면 시험 고리(#163-① · 에뮬레이터 시험이 교사 · TV 표시를 REST 로 넣을 때 · 출시 전 메모 5): 이 폰의 로그인 uid
  // 화면 시험 고리: 이 기기 저장일 때만 경로에 값 넣기 (리모컨 🙋 줄 캡처 · 서버엔 없음)
  if (!(S as { auth?: unknown }).auth) (globalThis as { __dbSet?: (p: string, v: unknown) => void }).__dbSet = (p, v) => S.set(p, v);
  if (!(S as { auth?: unknown }).auth) (globalThis as { __dbGet?: (p: string) => unknown }).__dbGet = (p) => S.get(p); // 시험 고리 (이 기기 모드만)
  // · 그 학생이 지금 몬스터를 한 번에 다 맞힌 제출(리모컨 ✔ 초록 캡처)
  if (!(S as { auth?: unknown }).auth) (globalThis as { __perfect?: (code: string, mid: string, uid: string) => void }).__perfect = (code, mid, uid) => { const R = S.get<Room>(`rooms/${code}`), Lp = R ? packOf((R.meta as { lesson?: string }).lesson) : null; if (!R || !Lp) return; S.set(`rooms/${code}/subs/${mid}/${uid}/0`, itemsFor(Lp, R, mid, uid, 0).map(answerOf)); };
  (globalThis as { __uid?: () => string | null }).__uid = () => (S as { auth?: { currentUser: { uid: string } | null } }).auth?.currentUser?.uid ?? null;
  let netOk = $state(true);
  const sv = S as Store & { onNet?: (fn: (s: { connected: boolean }) => void) => () => void };
  sv.onNet?.((s) => (netOk = s.connected));
  // 🧩 #132 차시 = 방이 기억한 차시(meta.lesson) → 지금 열린 수업 → 6차시 · 팩은 src/packs 모두
  // 🏫 학교판(빈 과목 팩) = 처음엔 차시가 하나도 없음 → 올린 엑셀 차시(뒤에 PACKS 에 들어옴) · 그것도 없으면 빈 차시 (🐞 학교판 첫 화면 「steps」 멈춤)
  const NONE: LessonPack = { id: '', no: 0, title: '차시 없음', steps: [], monsters: {} } as unknown as LessonPack;
  const defL = (): LessonPack => packOf(SUBJ.defaultLesson) ?? PACKS[0] ?? NONE;
  const DEF = defL();
  const errs = PACKS.flatMap((p) => validate(p).map((e) => `${p.no}차시 ${e}`));
  // 🎲 그림 없는 차시 = 랜덤 던전을 입힘 · 방 meta.rdun = 시험으로 고른 던전 (ui/rdun.ts)
  const lessonOf = (c: string): LessonPack => dressed(withCarry(packOf(c ? S.get<string>(`rooms/${c}/meta/lesson`) : null) ?? (q.get('mode') === 'test' ? packOf(q.get('lesson')) : null) ?? packOf(S.get<Live>('school/live')?.lesson) ?? defL(), carryOfRoom(S, c || (S.get<Live>('school/live')?.code ?? '')), PACKS), c ? S.get<string>(`rooms/${c}/meta/rdun`) : null); // 📦 B 넘어온 몬스터 (meta/carry)
  // 던전 고르기 (다른 점 표 한 줄) — 주소 ?mode=class|test · 첫 화면에서 고름
  let modeKey = $state<'class' | 'test'>(q.get('mode') === 'class' ? 'class' : 'test');
  const P = $derived(PROFILES[modeKey]);

  // 학생 탭마다 따로인 이름표 (탭을 닫으면 사라짐)
  function tabId(): { uid: string; num: number } {
    try {
      const saved = sessionStorage.getItem('citadel-v1-tab');
      if (saved) return JSON.parse(saved) as { uid: string; num: number };
    } catch { /* 무시 */ }
    const taken = Object.values(S.get<Record<string, { num: number }>>(`rooms/${code}/players`) || {}).map((p) => p.num);
    let num = 1;
    while (taken.includes(num)) num++;
    const me = { uid: `u${Math.random().toString(36).slice(2, 9)}`, num };
    try { sessionStorage.setItem('citadel-v1-tab', JSON.stringify(me)); } catch { /* 무시 */ }
    return me;
  }
  // ⓪ 로그인한 폰 = 그 학생 (반 + 번호) · 아니면 탭마다 따로인 이름표(시험 · 두 탭 체험)
  let login = $state<Pupil | null>(savedLogin(S));
  // 🧑 학생 기록 = 그 학생으로 로그인한 폰이면 시험 서버 정식 경로에 (#141 · ?as 시험 · 교사 · TV 는 이 기기)
  const bindFor = (p: Pupil | null) => { if (p && !q.get('as') && where.kind !== 'device') bindMe(S, p.cls, p.num); };
  bindFor(untrack(() => login));
  // 🔑 로그인 기억(이 기기)은 있는데 서버 계정 주인(accounts/{반}/{번호}/uid)이 지금 로그인과 다름 = 다른 기기 · 다른 앱에서 로그인 · 세션이 바뀜
  //   예전 = 묶이지 않은 채 「이 기기 테스트 저장소」(💎 9,999 · 테스터)로 캠프가 열려 성채 · 기록이 0 으로 보임(🐞 2026-11-15 1-6 베타테 캡처) → 다시 로그인 화면
  //   계정 칸이 늦게 오면(거울) 그때 다시 묶음 · 다르다고 확인된 때만 로그아웃
  let relogin = $state(false), bindVer = $state(0);
  {
    const l0 = untrack(() => login), au = (S as Store & { auth?: { currentUser: { uid: string } | null } }).auth;
    if (l0 && where.kind !== 'device' && !q.get('as') && S.kind === 'server' && !meBound()) {
      let off: (() => void) | null = null, offA: (() => void) | null = null, done = false, acc: { uid?: string } | null = null;
      const check = () => {
        if (done || meBound() || !acc?.uid) return;
        const me = au?.currentUser?.uid;
        if (!me) return; // 로그인 확인이 아직(느린 인터넷) = 판단하지 않고 기다림 (정상 학생을 내보내지 않게)
        if (acc.uid === me) { bindFor(l0); if (meBound()) { done = true; bindVer++; } }
        else { done = true; saveLogin(null); login = null; relogin = true; }
        if (done) queueMicrotask(() => { off?.(); offA?.(); });
      };
      off = S.watch<{ uid?: string }>(`accounts/${l0.cls}/${l0.num}`, (a) => { acc = a; check(); });
      if (au) void import('firebase/auth').then((fa) => { offA = fa.onAuthStateChanged(au as import('firebase/auth').Auth, () => check()); });
    }
  }
  // 🐞 11/20 ① 받기 전 빈 값: 묶인 학생 = 내 칸(지갑 · EXP · 계정 · 카드 · 기록 · 성채/허수아비) 첫 값을 받은 뒤에 캠프를 엶
  //   (느린 망에서 캠프 · 허수아비 · 성채가 빈 기록으로 「처음」 판단 → 보상 다시 · 기록 객체 덮어쓰기를 막음 · 20초 넘으면 그냥 엶 = 쓰기는 store/me 가 막음)
  const MY_ROOTS = ['gem', 'xp', 'accounts', 'cards', 'records', 'bonus'];
  let myReady = $state(true);
  $effect(() => {
    void bindVer; void login;
    const b = meBound(); if (!b) { myReady = true; return; }
    const paths = MY_ROOTS.map((r) => `${r}/${b.cls}/${b.num}`);
    if (paths.every((x) => isReady(b.S, x))) { myReady = true; return; }
    myReady = false;
    let on = true; void whenReady(b.S, paths, 20000).then(() => { if (on) myReady = true; });
    return () => { on = false; };
  });
  // 🚪 QR 입장 (#138 ③): ?join=코드 → 로그인한 폰은 바로 그 수업 · 아니면 로그인 뒤 그 수업
  const joinCode = (q.get('join') || '').trim();
  if (joinCode && !role && untrack(() => login)) location.replace(`?role=student&room=${encodeURIComponent(joinCode)}`);
  // 시험 · 두 탭 체험: ?as=1-3:5 = 그 반 · 번호 학생으로 (로그인 없이)
  const asP = (() => { const m = TEST_ADDR ? /^(\d-\d):(\d+)$/.exec(q.get('as') || '') : null; // 🧪 ?as = 시험 주소만 (출시 막는 것 9)
    return m ? pupil(m[1] as string, Number(m[2]), S) : null; })();
  const me = untrack(() => (role === 'student' ? asP ? { uid: asP.uid, num: asP.num, nick: asP.name, cls: asP.cls } : (login && !q.get('tab') ? { uid: login.uid, num: login.num, nick: login.name, cls: login.cls } : { ...tabId(), nick: '', cls: '' }) : null));
  // 학생 캠프 = 내 반에 열린 수업 (없으면 닫힌 문)
  const lvApp = liveValue<Live>(S, 'school/live');
  // 🧪 테스트로 연 수업도 시험 서버에서는 그 반 학생 캠프 차원문을 엶 (#138 · 이 기기 두 탭 시험은 그대로)
  const campCode = $derived(role === 'camp' ? code : login && lvApp.v.val?.cls === login.cls && (!lvApp.v.val.test || where.kind !== 'device') ? lvApp.v.val.code : '');
  // 🔄 #134 ① 이 화면이 최신 판인지: 사이트 version.json(캐시 안 씀)과 BUILD 비교 → 같으면 「BETA · b15 ✔」 · 다르면 빨간 「b14 → b15 ↻」(누르면 새로 고침)
  let site = $state('');
  const checkVer = () => { if (typeof fetch !== 'undefined') fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.build) site = String(j.build) + (j.rev ? `·${j.rev}` : ''); }).catch(() => {}); };
  checkVer(); if (typeof window !== 'undefined') setInterval(checkVer, 5 * 60e3); // 수업 끝난 뒤에도 새 판을 알아채게 5분마다
  // ⏸ #163 ④ 수업 중 새 판 미룸(A): 내 반 수업이 열려 있는 동안(학생 = 내 반 · 교사 폰 · TV = 열린 수업이 있으면) 새 판 알림을 숨김 → 수업이 끝나면(열린 수업 칸이 비면) 보임
  const inClass = $derived(!!lvApp.v.val?.code && (role === 'teacher' || role === 'hall' || (!!login && lvApp.v.val.cls === login.cls) || (role === 'student' && !!code && lvApp.v.val.code === code)));
  // 🫥 #162 ① · #172 학생 화면(첫 화면 · 캠프 · 수업 · 게시판)엔 「BETA · 판」 · 「시험 서버」 글자를 숨김 → 캠프 ⚙ 설정 맨 아래 작은 「판」 줄 · 끊김 붉은 띠 · 새 판 ↻ 는 그대로
  const stuScreen = !role || role === 'student' || role === 'camp';
  submitScreen(stuScreen); // 📝 제출 모드 = 학생 화면만
  const verOld = $derived(!!site && site !== BUILD_ID && !inClass);
  // 🔄 #38 ③ 새 판 띠: 화면 맨 위 「🔄 새 판 b○○ · 눌러서 새로 고침」 · 첫 화면 · 캠프에서 막 열었을 때(20초 안 · 혼자 하는 판 아님) = 저절로 한 번(같은 판은 한 번만 · 되풀이 막기)
  //   수업 중 = #163 ④ 그대로 숨김(끝나면 보임) · 게시판 던전 · 허수아비 진행 중 · 오래 켜 둔 화면 = 띠만
  const born = Date.now();
  const reloadNew = () => { try { sessionStorage.setItem('citadel-upd', '1'); } catch { /* 사생활 창 */ } (window as { bootShow?: (t: string) => void }).bootShow?.('🔄 새 판 받는 중…'); void swUpdate().then(() => location.replace(`${location.pathname}?${[...new URLSearchParams(location.search)].filter(([k]) => k !== 'v').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).concat(`v=${site}`).join('&')}`)); };
  $effect(() => {
    if (!verOld || !(!role || role === 'camp') || busy.n || Date.now() - born > 20e3) return;
    // 🚨 11/19 ⓪ 되풀이 막기 = 같은 판 한 번 + 판 꼴이 달라도(옛 앱 「b227」 ↔ 새 앱 「b227·커밋」) 한 탭에서 10분에 한 번만
    try { const at = Number(sessionStorage.getItem('dgb-auto-at')) || 0; if (sessionStorage.getItem('dgb-auto') === site || Date.now() - at < 10 * 60e3) return; sessionStorage.setItem('dgb-auto', site); sessionStorage.setItem('dgb-auto-at', String(Date.now())); } catch { return; }
    untrack(reloadNew);
  });
  // 📱 학생 폰 = 앱이 열려 있는 동안 화면 꺼짐 방지 (📜 2026-11-14 선생님 「학생용 폰도 자동 화면 꺼짐 안 되게」 · DECISIONS 「📱 학생 폰 = 앱이 열려 있는 동안」)
  //   학생 앱 입구 한 곳: 로그인 뒤(캠프 · 수업 · 📋 게시판 · 🎯 허수아비 · 🏰 성채 · ⚒ 모루 · 내 용사 · 대기실 · 결과 전부) · 다른 앱 갔다 오면 다시 · 앱 닫으면 놓음 · 미지원 띠 한 번(b146)
  $effect(() => { if (!(stuScreen && (role === 'student' || role === 'camp' || !!login))) return; return holdWake(true); });
</script>

{#if where.blocked}<div class="blocked" role="alert">⛔ {where.blocked}</div>{/if}
{#if role !== 'dev' && (!stuScreen || (where.kind !== 'device' && !netOk))}<div class="srv" class:server={where.kind !== 'device'} class:off={where.kind !== 'device' && !netOk} class:tsrv={role === 'teacher'} class:hsrv={role === 'hall'} aria-label="저장 위치 {where.label}">{where.kind === 'device' ? '이 기기' : netOk ? where.label : '⚠ 끊김 · 다시 잇는 중'}</div>{/if}
{#if role !== 'dev'}{#if verOld}<button type="button" class="newbuild" class:hall={role === 'hall'} data-k="newbuild" aria-label="새 판 {site} · 눌러서 새로 고침 (지금 {BUILD_ID})" onclick={reloadNew}>🔄 새 판 {site} · 눌러서 새로 고침</button>{:else if !stuScreen}<div class="beta-pill" class:hall={role === 'hall'} class:low={role === 'camp' || (!role && !!login)} class:tpill={role === 'teacher'} class:rel={!BETA} aria-label="{verName(BUILD, REV)}{site ? ' · 최신' : ''}">{verName(BUILD, REV)}{site === BUILD_ID ? ' ✔' : ''}</div>{/if}{:else}<div class="beta">{BETA ? `BETA · ${BUILD_ID} · 테스트 버전 (서버에 닿지 않음 · 이 기기 저장)` : '서버에 닿지 않음 · 이 기기 저장'}</div>{/if}
{#if stuScreen && wakeTip.text}<p class="wtip" role="status" data-k="wake-tip">{wakeTip.text}<button type="button" aria-label="닫기" onclick={() => (wakeTip.text = '')}>✕</button></p>{/if}
<main class:full={role !== 'dev'}>
  <!-- 🐞 11/20 ③ 반쪽 데이터(서버 값이 비거나 반만 옴)로 화면 그리기가 터져도 앱 전체가 멈추지 않게 = 이 화면만 「다시 그리기」 -->
  <svelte:boundary onerror={(e) => console.error('화면 오류 (반쪽 데이터?)', e)}>
  {#if errs.length}
    <p class="err">차시 팩 오류: {errs.join(' · ')}</p>
  {:else if role === 'hall'}
    {#await loadHall() then M}<M.default {S} L={lessonOf(q.get('room') ? code : '')} {code} {P} fixed={!!q.get('room')} />{/await}
  {:else if role === 'camp'}
    <Camp {S} L={lessonOf(code)} {code} />
  {:else if role === 'teacher'}
    {#await loadTeacher() then M}<M.default {S} packs={TEST_ADDR && q.get('packs') === '0' ? [] : PACKS} />{/await}
  {:else if role === 'student' && me}
    <Student {S} L={lessonOf(code)} {code} uid={me.uid} num={me.num} nick={me.nick} cls={me.cls} />
  {:else if !role && login && !myReady}
    <p class="relogin" role="status" data-k="my-loading">📦 내 기록 불러오는 중…</p>
  {:else if !role && login}
    {#key `${campCode}|${bindVer}`}<Camp {S} L={lessonOf(campCode)} code={campCode} pupil={login} />{/key}
  {:else if !role}
    {#if relogin}<p class="relogin" role="alert" data-k="relogin">🔑 이 기기의 로그인이 풀렸어요 · 반 · 번호 · 비밀번호로 다시 로그인해 주세요</p>{/if}
    <Title {S} onin={(p, joined) => { if (joined) { try { sessionStorage.setItem('citadel-hero0', '1'); } catch { /* 무시 */ } } bindFor(p); login = p; if (joinCode) location.href = `?role=student&room=${encodeURIComponent(joinCode)}`; }} />
  {:else if role === 'fxbake' && TEST_ADDR}
    {#await import('./ui/tv/FxBake.svelte') then M}<M.default />{/await}
  {:else if role === 'atk'}
    {#await loadAtk() then M}<M.default />{/await}
  {:else if role === 'dev' && TEST_ADDR}
    <section class="home">
      <h1>모두의 던전 v1.0 테스트</h1>
      <p>{DEF.no}차시 {DEF.title} · 같은 브라우저에서 탭 두 개</p>
      <fieldset class="modes">
        <legend>던전</legend>
        {#each Object.values(PROFILES) as p (p.key)}
          <label><input type="radio" name="mode" value={p.key} bind:group={modeKey} /> {p.label} <small>정찰 {p.scoutSec}초</small></label>
        {/each}
      </fieldset>
      <p><a class="big" href="?role=hall&mode={modeKey}&room={code}" target="_blank">🖥 종합실</a></p>
      <p><a class="big" href="?role=student&room={code}" target="_blank">📱 학생</a></p>
      <p><a class="big" href="?role=camp&room={code}" target="_blank">🏕 학생 캠프</a></p>
      <p class="sub">종합실을 먼저 열고 「▶ 시작」 · 학생 탭을 더 열면 인원 · 체력이 늘어요.</p>
    </section>
  {/if}
  {#snippet failed(_e, reset)}<div class="crash" role="alert" data-k="crash"><p>⚠ 서버 값이 덜 와서 이 화면을 못 그렸어요</p><button type="button" data-k="crash-retry" onclick={() => setTimeout(reset, 300)}>↻ 다시 그리기</button> <button type="button" onclick={() => location.reload()}>새로 고침</button></div>{/snippet}
  </svelte:boundary>
</main>

<style>
  :global(html), :global(body) { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: var(--fs-body); -webkit-text-size-adjust: 100%; }
  :global(button) { cursor: pointer; font-family: var(--font); }
  :global(a) { color: var(--accent); }
  :global(button:focus-visible), :global(a:focus-visible), :global([role='button']:focus-visible) { outline: 3px solid var(--accent); outline-offset: 2px; }
  .beta { background: var(--accent); color: var(--on-accent); text-align: center; font-weight: 700; padding: var(--s1) var(--s2); font-size: var(--fs-small); }
  .blocked { position: fixed; top: 0; left: 0; right: 0; z-index: 99; padding: 8px 12px; background: var(--bad); color: #fff; font-weight: 700; font-size: 14px; text-align: center; }
  .srv { position: fixed; top: 42px; left: 50%; transform: translateX(-50%); z-index: 5; pointer-events: none; height: 20px; padding: 0 8px; border-radius: 10px; background: rgba(8, 9, 12, 0.55); color: var(--text-3); font-size: 11.5px; font-weight: 700; display: flex; align-items: center; white-space: nowrap; }
  .srv.server { color: var(--ok); } .srv.off { color: #fff; background: var(--bad); }
  .srv.tsrv { top: 0; left: auto; right: 2px; transform: none; height: 16px; font-size: 10.5px; opacity: 0.8; }
  .srv.hsrv { top: auto; bottom: 8px; left: 120px; transform: none; }
  .newbuild { position: fixed; top: 0; left: 0; right: 0; z-index: 60; margin: 0 auto; max-width: 430px; min-height: 44px; padding: calc(env(safe-area-inset-top, 0px) + 6px) var(--s4) 6px; border: 0; background: var(--accent); color: var(--on-accent); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--accent-sh, rgba(0, 0, 0, 0.4)); cursor: pointer; }
  .newbuild.hall { max-width: none; font-size: 18px; }
  .beta-pill { color: #f5a24a; } .beta-pill.rel { color: var(--ok); } /* 🏷 정식 초록 · 베타 주황 (📜 2026-11-15) */
  .beta-pill.old { pointer-events: auto; border: 1px solid var(--bad); color: #fff; background: var(--bad-bg); font: inherit; font-weight: 700; cursor: pointer; }
  .beta-pill.tpill.old { height: 22px; opacity: 1; }
  .beta-pill.hall { top: auto; bottom: 8px; left: 8px; transform: none; }
  .beta-pill.tpill { top: 0; left: 2px; transform: none; height: 16px; font-size: 11px; padding: 0 6px; opacity: 0.7; }
  .beta-pill.low { top: 62px; left: var(--s4); transform: none; }
  .beta-pill { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 5; pointer-events: none; height: 26px; padding: 0 10px; border-radius: 13px; background: rgba(8, 9, 12, 0.55); color: var(--accent); font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; }
  main { padding: var(--s4); }
  main.full { padding: 0; }
  .home { max-width: 430px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; gap: var(--s3); }
  .big { display: block; padding: 14px; min-height: var(--tap); border-radius: 14px; text-decoration: none; font-weight: 700; background: var(--surface); color: var(--text); border: 1px solid var(--line); box-shadow: 0 3px 0 var(--press-sh); }
  .sub { color: var(--text-2); }
  .modes { border: 1px solid var(--line); border-radius: var(--r); display: grid; gap: 6px; text-align: left; padding: var(--s3); }
  .modes label { min-height: 40px; display: flex; align-items: center; gap: var(--s2); }
  .modes small { color: var(--text-2); }
  .err { color: var(--bad); }
  /* 📜 2026-11-17 #17: 전투 화면(장면 띠 280) = 띠를 장면 아래로 (몬스터 · 용사를 가리지 않게) */
  :global(body:has([data-scene])) .wtip { top: calc(env(safe-area-inset-top, 0px) + 288px); }
  .wtip { position: fixed; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 60px); z-index: 60; width: min(400px, calc(100% - 32px)); display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); color: var(--text); font: 500 14px var(--font); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); } .wtip button { margin-left: auto; min-width: 40px; min-height: 40px; border: 0; background: none; color: var(--text-2); font-size: 16px; }
  .relogin { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 50; margin: 0; padding: 10px 14px; max-width: 92vw; border-radius: 12px; background: #2b1e10; border: 1px solid #f5b84a; color: #ffe3a8; font: 700 14px var(--font); text-align: center; }
  .crash { margin: 24px 16px; padding: 16px; border-radius: 12px; background: var(--card, #fff); color: var(--ink, #222); text-align: center; }
  .crash button { min-height: 48px; padding: 0 16px; margin: 6px; border-radius: 10px; }
</style>
