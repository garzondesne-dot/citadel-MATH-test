<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack } from './model/types';
  import { PACKS, packOf } from './engine/packs';
  import { SUBJ } from './engine/subject';
  import { PROFILES } from './model/profiles';
  import { validate } from './engine/lessons';
  import type { Store } from './model/types';
  import type { Where } from './store/config';
  import { bindMe } from './store/meSync';
  import { BUILD } from './build';
  import Hall from './ui/Hall.svelte';
  import Student from './ui/Student.svelte';
  import Camp from './ui/camp/Camp.svelte';
  import Title from './ui/Title.svelte';
  import AtkGallery from './ui/AtkGallery.svelte';
  import TeacherApp from './ui/teacher/TeacherApp.svelte';
  import { pupil, savedLogin, type Live, type Pupil } from './school/school';
  import { liveValue } from './ui/room.svelte';

  const q = new URLSearchParams(location.search);
  const role = q.get('role');
  const code = (q.get('room') || 'TEST').toUpperCase();
  const props: { S: Store; where: Where } = $props(); // 🔌 「어느 서버」 = main.ts 가 고름 (#137) · 한 번 정하면 그대로
  const S = untrack(() => props.S), where = untrack(() => props.where);
  // 화면 시험 고리(#163-① · 에뮬레이터 시험이 교사 · TV 표시를 REST 로 넣을 때 · 출시 전 메모 5): 이 폰의 로그인 uid
  (globalThis as { __uid?: () => string | null }).__uid = () => (S as { auth?: { currentUser: { uid: string } | null } }).auth?.currentUser?.uid ?? null;
  let netOk = $state(true);
  const sv = S as Store & { onNet?: (fn: (s: { connected: boolean }) => void) => () => void };
  sv.onNet?.((s) => (netOk = s.connected));
  // 🧩 #132 차시 = 방이 기억한 차시(meta.lesson) → 지금 열린 수업 → 6차시 · 팩은 src/packs 모두
  const DEF = packOf(SUBJ.defaultLesson) ?? PACKS[0]!;
  const errs = PACKS.flatMap((p) => validate(p).map((e) => `${p.no}차시 ${e}`));
  const lessonOf = (c: string): LessonPack => packOf(c ? S.get<string>(`rooms/${c}/meta/lesson`) : null) ?? packOf(S.get<Live>('school/live')?.lesson) ?? DEF;
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
  // 🚪 QR 입장 (#138 ③): ?join=코드 → 로그인한 폰은 바로 그 수업 · 아니면 로그인 뒤 그 수업
  const joinCode = (q.get('join') || '').trim();
  if (joinCode && !role && untrack(() => login)) location.replace(`?role=student&room=${encodeURIComponent(joinCode)}`);
  // 시험 · 두 탭 체험: ?as=1-3:5 = 그 반 · 번호 학생으로 (로그인 없이)
  const asP = (() => { const m = /^(\d-\d):(\d+)$/.exec(q.get('as') || ''); return m ? pupil(m[1] as string, Number(m[2]), S) : null; })();
  const me = untrack(() => (role === 'student' ? asP ? { uid: asP.uid, num: asP.num, nick: asP.name, cls: asP.cls } : (login && !q.get('tab') ? { uid: login.uid, num: login.num, nick: login.name, cls: login.cls } : { ...tabId(), nick: '', cls: '' }) : null));
  // 학생 캠프 = 내 반에 열린 수업 (없으면 닫힌 문)
  const lvApp = liveValue<Live>(S, 'school/live');
  // 🧪 테스트로 연 수업도 시험 서버에서는 그 반 학생 캠프 차원문을 엶 (#138 · 이 기기 두 탭 시험은 그대로)
  const campCode = $derived(role === 'camp' ? code : login && lvApp.v.val?.cls === login.cls && (!lvApp.v.val.test || where.kind !== 'device') ? lvApp.v.val.code : '');
  // 🔄 #134 ① 이 화면이 최신 판인지: 사이트 version.json(캐시 안 씀)과 BUILD 비교 → 같으면 「BETA · b15 ✔」 · 다르면 빨간 「b14 → b15 ↻」(누르면 새로 고침)
  let site = $state('');
  const checkVer = () => { if (typeof fetch !== 'undefined') fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.build) site = String(j.build); }).catch(() => {}); };
  checkVer(); if (typeof window !== 'undefined') setInterval(checkVer, 5 * 60e3); // 수업 끝난 뒤에도 새 판을 알아채게 5분마다
  // ⏸ #163 ④ 수업 중 새 판 미룸(A): 내 반 수업이 열려 있는 동안(학생 = 내 반 · 교사 폰 · TV = 열린 수업이 있으면) 새 판 알림을 숨김 → 수업이 끝나면(열린 수업 칸이 비면) 보임
  const inClass = $derived(!!lvApp.v.val?.code && (role === 'teacher' || role === 'hall' || (!!login && lvApp.v.val.cls === login.cls) || (role === 'student' && !!code && lvApp.v.val.code === code)));
  // 🫥 #162 ① · #172 학생 화면(첫 화면 · 캠프 · 수업 · 게시판)엔 「BETA · 판」 · 「시험 서버」 글자를 숨김 → 캠프 ⚙ 설정 맨 아래 작은 「판」 줄 · 끊김 붉은 띠 · 새 판 ↻ 는 그대로
  const stuScreen = !role || role === 'student' || role === 'camp';
  const verOld = $derived(!!site && site !== BUILD && !inClass);
</script>

{#if where.blocked}<div class="blocked" role="alert">⛔ {where.blocked}</div>{/if}
{#if role !== 'dev' && (!stuScreen || (where.kind !== 'device' && !netOk))}<div class="srv" class:server={where.kind !== 'device'} class:off={where.kind !== 'device' && !netOk} class:tsrv={role === 'teacher'} class:hsrv={role === 'hall'} aria-label="저장 위치 {where.label}">{where.kind === 'device' ? '이 기기' : netOk ? where.label : '⚠ 끊김 · 다시 잇는 중'}</div>{/if}
{#if role !== 'dev'}{#if verOld}<button type="button" class="beta-pill old" class:hall={role === 'hall'} class:low={role === 'camp' || (!role && !!login)} class:tpill={role === 'teacher'} aria-label="옛 판 {BUILD} · 새 판 {site} · 새로 고침" onclick={() => location.replace(`${location.pathname}${location.search}${location.search ? '&' : '?'}v=${site}`)}>BETA · {BUILD} → {site} ↻</button>{:else if !stuScreen}<div class="beta-pill" class:hall={role === 'hall'} class:low={role === 'camp' || (!role && !!login)} class:tpill={role === 'teacher'} aria-label="테스트 버전 {BUILD}{site ? ' · 최신' : ''}">BETA · {BUILD}{site === BUILD ? ' ✔' : ''}</div>{/if}{:else}<div class="beta">BETA · {BUILD} · 테스트 버전 (서버에 닿지 않음 · 이 기기 저장)</div>{/if}
<main class:full={role !== 'dev'}>
  {#if errs.length}
    <p class="err">차시 팩 오류: {errs.join(' · ')}</p>
  {:else if role === 'hall'}
    <Hall {S} L={lessonOf(q.get('room') ? code : '')} {code} {P} fixed={!!q.get('room')} />
  {:else if role === 'camp'}
    <Camp {S} L={lessonOf(code)} {code} />
  {:else if role === 'teacher'}
    <TeacherApp {S} packs={q.get('packs') === '0' ? [] : PACKS} />
  {:else if role === 'student' && me}
    <Student {S} L={lessonOf(code)} {code} uid={me.uid} num={me.num} nick={me.nick} cls={me.cls} />
  {:else if !role && login}
    {#key campCode}<Camp {S} L={lessonOf(campCode)} code={campCode} pupil={login} />{/key}
  {:else if !role}
    <Title {S} onin={(p) => { bindFor(p); login = p; if (joinCode) location.href = `?role=student&room=${encodeURIComponent(joinCode)}`; }} />
  {:else if role === 'atk'}
    <AtkGallery />
  {:else if role === 'dev'}
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
</main>

<style>
  :global(html), :global(body) { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: var(--fs-body); -webkit-text-size-adjust: 100%; }
  :global(button) { cursor: pointer; font-family: var(--font); }
  :global(a) { color: var(--accent); }
  :global(button:focus-visible), :global(a:focus-visible) { outline: 3px solid var(--gem); outline-offset: 2px; }
  .beta { background: var(--accent); color: var(--on-accent); text-align: center; font-weight: 700; padding: var(--s1) var(--s2); font-size: var(--fs-small); }
  .blocked { position: fixed; top: 0; left: 0; right: 0; z-index: 99; padding: 8px 12px; background: var(--bad); color: #fff; font-weight: 700; font-size: 14px; text-align: center; }
  .srv { position: fixed; top: 42px; left: 50%; transform: translateX(-50%); z-index: 5; pointer-events: none; height: 20px; padding: 0 8px; border-radius: 10px; background: rgba(8, 9, 12, 0.55); color: var(--text-3); font-size: 11.5px; font-weight: 700; display: flex; align-items: center; white-space: nowrap; }
  .srv.server { color: var(--ok); } .srv.off { color: #fff; background: var(--bad); }
  .srv.tsrv { top: 0; left: auto; right: 2px; transform: none; height: 16px; font-size: 10.5px; opacity: 0.8; }
  .srv.hsrv { top: auto; bottom: 8px; left: 120px; transform: none; }
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
</style>
