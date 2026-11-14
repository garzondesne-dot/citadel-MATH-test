<script lang="ts">
  import { untrack } from 'svelte';
  import { teacherIn as teacherIn0, toTitle as toTitle0 } from './teacherAuth';
  import SoundToggles from '../SoundToggles.svelte';
  import { soundPref } from '../sound.svelte';
  import { HALLKEY } from '../../school/school';
  import type { Store } from '../../model/types';
  import { BUILD } from '../../build';
  import { heroOf, famOfHero } from '../../model/hero';
  import { useMe } from '../../store/me.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import ThemePicker from '../ThemePicker.svelte';
  import FeatSettings from './FeatSettings.svelte';
  import { install, pwa } from '../../pwa.svelte';
  import { BUNDLES, feat, featCfg } from '../../school/features.svelte';
  import { savedTheme, setTheme, THEMES, type Theme } from '../../theme/theme';

  // 🧙 나 탭 (#124 ⑲) — 선생님 용사 카드(누르면 내 용사) · 🧙 내 용사 · ⛺ 내 캠프 · 🎨 테마 · 🖥 종합실 비밀번호 고정 · 📷 사진 채점 연결 · 🔊 소리 · 로그아웃 · 판 번호
  //   옛 ⚙ 설정(비밀번호 · 선생님 모습 · 로그아웃)이 모두 여기 · 내 용사 = 학생 폰과 같은 창
  const { S, login0 = false }: { S: Store; /** 수업 열기에서 「🔐 교사 로그인하러」로 옴 = 로그인 창을 바로 엶 */ login0?: boolean } = $props();
  const M = useMe(9999, 30, true, true); // 👩‍🏫 교사 기록 = 따로 칸 (B안)
  let hero = $state(false), sheet = $state<'' | 'key' | 'theme' | 'sound' | 'login' | 'feat' | 'out' | 'app'>(untrack(() => (login0 ? 'login' : ''))), key = $state(''), ver = $state(0), toast = $state('');
  const hk = $derived.by(() => { void ver; return (S.get<string>(HALLKEY) || S.get<string>('school/teacher/hallKey')) || ''; });
  const sound = $derived.by(() => { void ver; return S.get<string>('school/teacher/sound') || '보통'; });
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  const info = $derived(heroOf(M.me.hero));
  // 🎨 테마 (#144): 교사 폰 = 11개 모두 · 이 폰만 (📜 2026-11-14 교실 TV 는 TV 에서 따로)
  let theme = $state<Theme>(savedTheme());
  const themeName = $derived(THEMES.find((x) => x.id === theme)?.name ?? '');
  // 🔐 교사 로그인 (#163-① · 정식 그대로): 이메일 · 비번 · 처음 만든 비번 계정 = 교사(admins/{uid}) · 이 폰은 계속 로그인
  type AS = Store & { auth?: import('firebase/auth').Auth; isAdmin?: () => boolean };
  const srv = !!(S as AS).auth, admin = (S as AS).isAdmin?.() ?? false, who = (S as AS).auth?.currentUser?.email ?? '';
  let email = $state(''), pw = $state(''), lerr = $state(''), busy = $state(false);
  async function teacherIn(make: boolean) { busy = true; lerr = await teacherIn0(S, email, pw, make); busy = false; }
  async function teacherOut() { const A = (S as AS).auth; if (!A) return; const fa = await import('firebase/auth'); await fa.signOut(A); location.reload(); }
  // 🚪 처음 화면 (📜 2026-11-13 밤): 로그인 정보만 지움(이 기기 테스트 · 체험 저장 그대로) → 첫 화면(학생 로그인 · 「교사 · 종합실 ›」)
  const toTitle = () => toTitle0(S);
  function pickTheme(t: Theme) { theme = t; setTheme(t); } // 📜 2026-11-14 TV 테마는 TV 에서 따로 (school/teacher/theme 안 씀)
</script>

<div class="tbar"><div class="t">나</div></div>
<div class="mid scroll">
  <button type="button" class="hc" onclick={() => (hero = true)}>
    <span class="pic"><HeroSprite id={M.me.hero} aura={M.me.enh} />{#if M.me.enh}<b>+{M.me.enh}</b>{/if}</span>
    <span class="tx"><b>선생님</b><small>{famOfHero(M.me.hero).name.split(' ')[0]} {info.name} · {info.job} · 강화 +{M.me.enh}</small></span><span class="go">›</span>
  </button>
  <div class="list">
    {#if srv}<button type="button" class="item" class:warn={!admin} onclick={() => (sheet = 'login')}><span class="ic">🔐</span><span class="tx"><b>{admin ? '교사로 로그인됨' : '교사 로그인'}</b><small>{admin ? who : '명단 · 기록 · 수업 열기에 필요 · 처음 한 번'}</small></span></button>{/if}
    <button type="button" class="item" onclick={() => (hero = true)}><span class="ic">🧙</span><span class="tx"><b>내 용사</b><small>용사 바꾸기 · 강화 · 스킬 (학생 폰과 같은 창)</small></span></button>
    <a class="item" href="?role=camp&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=me'); } catch { /* 무시 */ } }}><span class="ic">⛺</span><span class="tx"><b>내 캠프</b><small>학생 폰 캠프와 같은 화면 · 교실 TV 교사 캠프는 TV 에서</small></span></a>
    <button type="button" class="item" data-k="feat" onclick={() => (sheet = 'feat')}><span class="ic">⚙</span><span class="tx"><b>우리 학교 기능</b><small>{BUNDLES.find((b) => b.id === featCfg().bundle)?.ic} {BUNDLES.find((b) => b.id === featCfg().bundle)?.name} 묶음 · 켜고 끄기</small></span></button>
    {#if feat('theme')}<button type="button" class="item" onclick={() => (sheet = 'theme')}><span class="ic">🎨</span><span class="tx"><b>테마 · {themeName}</b><small>이 교사 폰만 · 교실 TV 는 TV 「🎨 테마」</small></span></button>{/if}
    <button type="button" class="item" onclick={() => { key = hk; sheet = 'key'; }}><span class="ic">🖥</span><span class="tx"><b>종합실 비밀번호</b><small>{hk ? `고정 ${hk}` : '비우면 수업마다 새로'}</small></span></button>
    <a class="item" href="?role=atk&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=me'); } catch { /* 무시 */ } }}><span class="ic">💥</span><span class="tx"><b>공격 갤러리</b><small>테스트 · 몬스터 공격 15개 눌러 보기</small></span></a>
    <button type="button" class="item" disabled><span class="ic">📷</span><span class="tx"><b>사진 채점 연결</b><small>테스트 판 · 준비 중</small></span></button>
    <button type="button" class="item" onclick={() => (sheet = 'sound')}><span class="ic">{(!soundPref.sfx && !soundPref.bgm) || sound === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>소리</b><small>교사 폰 · {sound} · 효과음 {soundPref.sfx ? '켜짐' : '꺼짐'} · 배경음 {soundPref.bgm ? '켜짐' : '꺼짐'}</small></span></button>
    <button type="button" class="item" data-k="install" disabled={pwa.installed} onclick={async () => { if (!(await install())) sheet = 'app'; }}><span class="ic">📲</span><span class="tx"><b>{pwa.installed ? '홈 화면 앱으로 열림' : '홈 화면에 추가'}</b><small>{pwa.installed ? '「던전 베타」 앱 · 정식 앱과 따로' : pwa.prompt ? '누르면 바로 설치 · 「던전 베타」' : pwa.ios ? '아이폰 = 공유 → 홈 화면에 추가' : '앱처럼 바로 열기 · 정식 앱과 따로'}</small></span></button>
    <button type="button" class="item" data-k="out" onclick={() => (sheet = 'out')}><span class="ic">🚪</span><span class="tx"><b>로그아웃 · 처음 화면</b><small>{admin ? who : '학생 · 교사 고르는 첫 화면으로'}</small></span></button>
  </div>
  <p class="ver">모두의 던전 v1.0 · 테스트 {BUILD}</p>
</div>

{#if hero}<MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} teacher onreset={M.reset} />{/if}
{#if sheet === 'login'}
  <Sheet onclose={() => (sheet = '')} mainText={busy ? '…' : '로그인'} mainDisabled={busy || !email || pw.length < 6} onmain={() => teacherIn(false)}>
    {#snippet title()}🔐 교사 로그인{/snippet}
    {#if admin}<p class="ok">✅ {who} · 교사</p>{/if}
    <input class="fld tid" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="교사 아이디 · 영문·숫자 (또는 이메일)" bind:value={email} />
    <input class="fld" type="password" autocomplete="current-password" placeholder="비밀번호 (6자 이상)" bind:value={pw} />
    {#if lerr}<p class="err">{lerr}</p>{/if}
    <button type="button" class="lk" disabled={busy || !email || pw.length < 6} onclick={() => teacherIn(true)}>처음이에요 · 교사 계정 만들기 (처음 만든 계정만 교사)</button>
  </Sheet>
{/if}
{#if sheet === 'key'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🖥 종합실 비밀번호 고정{/snippet}
    {#snippet act()}<button type="button" class="btn" disabled={!!key && !/^\d{4}$/.test(key)} onclick={() => { S.set(HALLKEY, key || null); ver++; sheet = ''; say(key ? `고정 ${key}` : '수업마다 새로'); }}>{key ? '이 번호로 고정' : '비우기 (수업마다 새로)'}</button>{/snippet}
    <input class="in" inputmode="numeric" maxlength="4" placeholder="숫자 4자리 · 비우면 수업마다 새로" bind:value={key} />
  </Sheet>
{:else if sheet === 'out'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🚪 처음 화면으로 갈까요?{/snippet}
    {#snippet act()}<button type="button" class="btn" data-k="out-go" onclick={toTitle}>🚪 로그아웃 · 처음 화면</button>{/snippet}
    <p class="outq">교사 로그인만 끝나요 · 수업 기록 · 이 기기 저장은 그대로예요</p>
  </Sheet>
{:else if sheet === 'app'}
  <Sheet onclose={() => (sheet = '')} mainText="알겠어요">
    {#snippet title()}📲 홈 화면에 추가{/snippet}
    {#if pwa.ios}
      <svg class="howto" viewBox="0 0 320 200" role="img" aria-label="사파리 아래 공유 단추 → 홈 화면에 추가">
        <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="#f5b84a" /></marker></defs>
        <rect x="8" y="8" width="140" height="184" rx="16" fill="#181b22" stroke="#2f3440" />
        <rect x="20" y="24" width="116" height="104" rx="8" fill="#222632" />
        <text x="78" y="80" text-anchor="middle" font-size="13" fill="#7c8190">던전 베타</text>
        <rect x="9" y="150" width="138" height="41" fill="#222632" />
        <circle cx="78" cy="171" r="17" fill="none" stroke="#f5b84a" stroke-width="3" />
        <path d="M78 160v14M72 166l6-6 6 6M70 170v8h16v-8" fill="none" stroke="#6cc6ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <text x="78" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#f5b84a">① 공유</text>
        <path d="M156 100h24" stroke="#f5b84a" stroke-width="3" marker-end="url(#ar)" />
        <rect x="188" y="40" width="124" height="120" rx="14" fill="#181b22" stroke="#2f3440" />
        <rect x="196" y="56" width="108" height="36" rx="8" fill="#222632" />
        <rect x="196" y="100" width="108" height="36" rx="8" fill="#222632" stroke="#f5b84a" stroke-width="2.5" />
        <text x="206" y="78" font-size="12" fill="#7c8190">복사</text>
        <text x="204" y="123" font-size="12" font-weight="700" fill="#f2f3f5">홈 화면에 추가</text>
        <rect x="285" y="111" width="13" height="13" rx="3" fill="none" stroke="#f2f3f5" stroke-width="1.6" /><path d="M291.5 113.5v8M287.5 117.5h8" stroke="#f2f3f5" stroke-width="1.6" />
        <text x="250" y="152" text-anchor="middle" font-size="13" font-weight="700" fill="#f5b84a">② 홈 화면에 추가</text>
      </svg>
      <p class="outq">사파리 아래 <b>공유</b> → 목록을 내려 <b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b></p>
    {:else}
      <p class="outq">브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러요 · 이미 설치했으면 홈 화면의 「던전 베타」로 열어요</p>
    {/if}
    <p class="outq">「던전 베타」는 정식 「모두의 던전」 앱과 따로 깔려요</p>
  </Sheet>
{:else if sheet === 'feat'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}⚙ 우리 학교 기능{/snippet}
    <FeatSettings {S} />
  </Sheet>
{:else if sheet === 'theme'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🎨 테마{/snippet}
    <ThemePicker now={theme} feats={null} onpick={pickTheme} paper />
  </Sheet>
{:else if sheet === 'sound'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🔊 소리 · 교사 폰{/snippet}
    <div class="list">{#each ['보통', '작게', '끔'] as v (v)}<button type="button" class="item" class:on={sound === v} onclick={() => { S.set('school/teacher/sound', v); ver++; sheet = ''; }}><span class="ic">{v === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>{v}</b></span></button>{/each}</div>
    <SoundToggles />
  </Sheet>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .outq { margin: 0; font-size: 16px; color: var(--text-2); }
  .fld { height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 12px; font: 500 16px var(--font); }
  .lk { border: 0; background: none; color: var(--text-2); text-decoration: underline; font: 500 14px var(--font); min-height: var(--tap); }
  .err { margin: 0; color: var(--bad); font-size: 14px; } .ok { margin: 0; color: var(--ok); font-weight: 700; }
  .item.warn { border-color: var(--accent); }
  .hc { display: flex; align-items: center; gap: var(--s3); min-height: 84px; padding: var(--s3); border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .pic { position: relative; flex: none; width: 88px; height: 72px; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; }
  .pic b { position: absolute; right: -6px; bottom: -6px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent); color: var(--on-accent); font-size: 13px; display: grid; place-items: center; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; } .tx b { font-size: 16px; } .tx small { font-size: 13px; color: var(--text-2); }
  .go { font-size: 24px; color: var(--text-3); }
  a.item { text-decoration: none; }
  .item.on { border: 2px solid var(--accent); }
  .ver { margin: var(--s3) 0; text-align: center; font-size: 12.5px; color: var(--text-3); }
  .in { width: 100%; box-sizing: border-box; height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 20px var(--font); padding: 0 var(--s3); letter-spacing: 4px; }
  .howto { width: 100%; height: auto; max-width: 360px; margin: 0 auto; display: block; }
</style>
