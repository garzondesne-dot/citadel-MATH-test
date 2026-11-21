<script lang="ts">
  import { untrack } from 'svelte';
  import { APP_NAME, BETA } from '../../channel';
  import { teacherIn as teacherIn0, toTitle as toTitle0 } from './teacherAuth';
  import SoundToggles from '../SoundToggles.svelte';
  import { soundPref } from '../sound.svelte';
  import type { Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import ThemePicker from '../ThemePicker.svelte';
  import { install, pwa } from '../../pwa.svelte';
  import { feat, saveOne } from '../../school/features.svelte';
  import { savedTheme, setTheme, THEMES, type Theme } from '../../theme/theme';
  import { lessonLen, setLessonLen } from '../../school/bells';
  import { KNIGHTS, WAR_CFG, knightOf, payOn, warClasses } from '../../board/war';

  // ⚙ 교사 폰 상시 설정 (📜 2026-11-17 #21 A · 시안 92y5uHBaWvACKgsCQWU6VF): 모든 탭 오른쪽 위 ⚙ → 아래 시트 하나
  //   교사 계정 · 소리 · 테마 · 앱 설치 · 로그아웃 · 📅 시간표(쓰는 중이면 끄기 한 줄 · 수업 길이) — 옛 「나」 탭 줄을 옮김 (기능 · 저장 그대로)
  const { S, onclose, login0 = false }: { S: Store; onclose: () => void; login0?: boolean } = $props();
  // svelte-ignore state_referenced_locally
  let page = $state<'main' | 'login' | 'sound' | 'theme' | 'app' | 'out' | 'sched' | 'war'>(login0 ? 'login' : 'main'), ver = $state(0);
  const sound = $derived.by(() => { void ver; return S.get<string>('school/teacher/sound') || '보통'; });
  let theme = $state<Theme>(savedTheme());
  const themeName = $derived(THEMES.find((x) => x.id === theme)?.name ?? '');
  type AS = Store & { auth?: import('firebase/auth').Auth; isAdmin?: () => boolean };
  const { srv, admin, who } = untrack(() => ({ srv: !!(S as AS).auth, admin: (S as AS).isAdmin?.() ?? false, who: (S as AS).auth?.currentUser?.email ?? '' }));
  let email = $state(''), pw = $state(''), lerr = $state(''), busy = $state(false);
  async function teacherIn(make: boolean) { busy = true; lerr = await teacherIn0(S, email, pw, make); busy = false; }
  const sched = $derived.by(() => { void ver; return feat('schedule'); });
  const len = $derived.by(() => { void ver; return lessonLen(S); });
  // ⚔ #51 반 이름 · 문장 · 💎 지급 스위치 (school/knights · school/war = 교사만)
  const CRESTS = ['🦁', '🦅', '🐻', '🐺', '🦌', '🐉', '🦊', '🐯', '🦉', '🐢', '🦈', '🛡'];
  const knights = $derived.by(() => { void ver; return warClasses(S).map((c) => ({ cls: c, ...knightOf(S, c) })); });
  const pay = $derived.by(() => { void ver; return payOn(S); });
  const setKnight = (c: string, v: { name?: string; crest?: string }) => { const k = knightOf(S, c), name = (v.name ?? k.name).trim().slice(0, 12) || k.name; S.set(`${KNIGHTS}/${c}`, { name, crest: v.crest ?? k.crest }); ver++; };
  const TT: Record<typeof page, string> = { main: '⚙ 설정', login: '🔐 교사 계정', sound: '🔊 소리 · 교사 폰', theme: '🎨 테마', app: '📲 홈 화면에 추가', out: '🚪 처음 화면으로 갈까요?', war: '⚔ 기사단 토벌 주간', sched: '📅 시간표 · 수업 길이' };
</script>

<Sheet onclose={() => (page === 'main' ? onclose() : (page = 'main'))} tall={page === 'theme'} mainText={page === 'login' ? (busy ? '…' : '로그인') : page === 'out' ? '' : page === 'main' ? '닫기' : '‹ 설정으로'} mainDisabled={page === 'login' && (busy || !email || pw.length < 6)} onmain={() => (page === 'login' ? teacherIn(false) : page === 'main' ? onclose() : (page = 'main'))}>
  {#snippet title()}{TT[page]}{/snippet}
  {#if page === 'main'}
    <div class="list" data-k="tset">
      {#if srv}<button type="button" class="item" class:warn={!admin} data-k="set-login" onclick={() => (page = 'login')}><span class="ic">🔐</span><span class="tx"><b>{admin ? '교사로 로그인됨' : '교사 로그인'}</b><small>{admin ? who : '명단 · 기록 · 수업 열기에 필요 · 처음 한 번'}</small></span></button>{/if}
      <button type="button" class="item" data-k="set-sound" onclick={() => (page = 'sound')}><span class="ic">{(!soundPref.sfx && !soundPref.bgm) || sound === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>소리</b><small>교사 폰 · {sound} · 효과음 {soundPref.sfx ? '켜짐' : '꺼짐'} · 배경음 {soundPref.bgm ? '켜짐' : '꺼짐'}</small></span></button>
      {#if feat('theme')}<button type="button" class="item" data-k="set-theme" onclick={() => (page = 'theme')}><span class="ic">🎨</span><span class="tx"><b>테마 · {themeName}</b><small>이 교사 폰만 · 교실 TV 는 TV 에서</small></span></button>{/if}
      <button type="button" class="item" data-k="install" disabled={pwa.installed} onclick={async () => { if (!(await install())) page = 'app'; }}><span class="ic">📲</span><span class="tx"><b>{pwa.installed ? '홈 화면 앱으로 열림' : '홈 화면에 추가'}</b><small>{pwa.installed ? BETA ? '「던전 베타」 앱 · 정식 앱과 따로' : '「모두의 던전」 앱' : pwa.prompt ? `누르면 바로 설치 · 「${APP_NAME}」` : pwa.ios ? '아이폰 = 공유 → 홈 화면에 추가' : '앱처럼 바로 열기'}</small></span></button>
      {#if sched}<button type="button" class="item" data-k="set-sched" onclick={() => (page = 'sched')}><span class="ic">📅</span><span class="tx"><b>시간표 쓰는 중</b><small>수업 길이 {len}분 · 끄기</small></span></button>{/if}
      {#if srv && admin}<button type="button" class="item" data-k="set-war" onclick={() => (page = 'war')}><span class="ic">⚔</span><span class="tx"><b>기사단 토벌 주간</b><small>반 이름 · 문장 · 💎 지급 {pay ? '켬' : '끔'}</small></span></button>{/if}
      <button type="button" class="item" data-k="out" onclick={() => (page = 'out')}><span class="ic">🚪</span><span class="tx"><b>로그아웃 · 처음 화면</b><small>{admin ? who : '학생 · 교사 고르는 첫 화면으로'}</small></span></button>
    </div>
  {:else if page === 'login'}
    {#if admin}<p class="ok">✅ {who} · 교사</p>{/if}
    <input class="fld" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="교사 아이디 · 영문·숫자 (또는 이메일)" bind:value={email} />
    <input class="fld" type="password" autocomplete="current-password" placeholder="비밀번호 (6자 이상)" bind:value={pw} />
    {#if lerr}<p class="err">{lerr}</p>{/if}
    <button type="button" class="lk" disabled={busy || !email || pw.length < 6} onclick={() => teacherIn(true)}>처음이에요 · 교사 계정 만들기 (처음 만든 계정만 교사)</button>
    {#if admin}<button type="button" class="lk" onclick={async () => { const A = (S as AS).auth; if (!A) return; const fa = await import('firebase/auth'); await fa.signOut(A); location.reload(); }}>교사 로그아웃</button>{/if}
  {:else if page === 'sound'}
    <div class="list">{#each ['보통', '작게', '끔'] as v (v)}<button type="button" class="item" class:on={sound === v} onclick={() => { S.set('school/teacher/sound', v); ver++; }}><span class="ic">{v === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>{v}</b></span></button>{/each}</div>
    <SoundToggles />
  {:else if page === 'theme'}
    <ThemePicker now={theme} feats={null} onpick={(t) => { theme = t; setTheme(t); }} paper />
  {:else if page === 'app'}
    <p class="outq">{pwa.ios ? '사파리 아래 공유 → 목록을 내려 「홈 화면에 추가」 → 오른쪽 위 「추가」' : `브라우저 메뉴(⋮)에서 「앱 설치」 또는 「홈 화면에 추가」 · 이미 설치했으면 홈 화면의 「${APP_NAME}」로 열어요`}</p>
    {#if pwa.ios}<p class="outq" data-k="ios-note">아이폰 = 홈 화면에 추가한 뒤 그 앱으로 열어 ⚙ 🔔 알림을 켜요 (사파리 창에서는 알림이 안 와요)</p>{/if}
    {#if BETA}<p class="outq">「던전 베타」는 정식 「모두의 던전」 앱과 따로 깔려요</p>{/if}
  {:else if page === 'out'}
    <p class="outq">교사 로그인만 끝나요 · 수업 기록 · 이 기기 저장은 그대로예요</p>
    <button type="button" class="btn" data-k="out-go" onclick={() => toTitle0(S)}>🚪 로그아웃 · 처음 화면</button>
  {:else if page === 'war'}
    <p class="lab2">반 = 기사단 · 이름 12자 · 문장 고르기</p>
    {#each knights as k (k.cls)}
      <div class="kn" data-k="kn-{k.cls}"><span class="kc">{k.cls}</span>
        <input class="fld" type="text" maxlength="12" value={k.name} aria-label="{k.cls}반 기사단 이름" onchange={(e) => setKnight(k.cls, { name: (e.currentTarget as HTMLInputElement).value })} />
        <select class="fld cr" value={k.crest} aria-label="{k.cls}반 문장" onchange={(e) => setKnight(k.cls, { crest: (e.currentTarget as HTMLSelectElement).value })}>{#each CRESTS as c (c)}<option value={c}>{c}</option>{/each}</select>
      </div>
    {/each}
    <button type="button" class="item" class:on={pay} data-k="war-pay" onclick={() => { S.set(WAR_CFG, { pay: !pay }); ver++; }}><span class="ic">💎</span><span class="tx"><b>주간 보상 지급 {pay ? '켬' : '끔'}</b><small>월요일 0시 마감 · 1 · 2 · 3위 반 학생 우편 💎 300 · 150 · 100</small></span></button>
    <p class="outq sm">마감 = 월요일 0시 뒤 처음 켠 교사 기기가 해요 · 🧪 테스트 반은 순위 밖</p>
  {:else if page === 'sched'}
    <p class="lab2">수업 길이 · 모든 교시 같음</p>
    <div class="lrow" data-k="len"><button type="button" aria-label="5분 줄이기" onclick={() => { setLessonLen(S, len - 5); ver++; }}>−5</button><b data-k="len-v">{len}분</b><button type="button" aria-label="5분 늘리기" onclick={() => { setLessonLen(S, len + 5); ver++; }}>+5</button></div>
    <p class="outq sm">교시 끝 = 시작종 + {len}분 (⏳ 타임바 · 📅 오늘 시간표)</p>
    <button type="button" class="item off" data-k="sched-off" onclick={() => { saveOne(S, 'schedule', false); ver++; page = 'main'; }}><span class="ic">📅</span><span class="tx"><b>시간표 끄기</b><small>시간표 칸은 지우지 않아요 · 📅 시간표 탭에서 다시 켜요</small></span></button>
  {/if}
</Sheet>

<style>
  .outq { margin: 0; font-size: 16px; color: var(--text-2); } .outq.sm { font-size: 13px; text-align: center; }
  .fld { height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 12px; font: 500 16px var(--font); }
  .lk { border: 0; background: none; color: var(--text-2); text-decoration: underline; font: 500 14px var(--font); min-height: var(--tap); }
  .err { margin: 0; color: var(--bad); font-size: 14px; } .ok { margin: 0; color: var(--ok); font-weight: 700; }
  .item.warn { border-color: var(--accent); } .item.on { border: 2px solid var(--accent); } .item.off { border-color: var(--bad); }
  .list[data-k="tset"] .item::after { content: "›"; flex: none; font-size: 22px; color: var(--text-3); } /* 누르면 각 설정 창 */
  .list[data-k="tset"] .item { min-height: 56px; }
  .lab2 { margin: 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .lrow { display: grid; grid-template-columns: 64px 1fr 64px; gap: 8px; align-items: center; } .lrow b { text-align: center; font-size: 28px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .lrow button { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 17px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .kn { display: grid; grid-template-columns: 36px minmax(0, 1fr) 72px; gap: 8px; align-items: center; } .kc { font-size: 14px; font-weight: 700; color: var(--text-2); } .cr { padding: 0 8px; font-size: 20px; }
</style>
