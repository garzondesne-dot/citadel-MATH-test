<script lang="ts">
  import { loginEmails, makeEmail } from '../../school/teacherId';
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
  import { BUNDLES, feat, featCfg } from '../../school/features.svelte';
  import { savedTheme, setTheme, THEMES, type Theme } from '../../theme/theme';

  // 🧙 나 탭 (#124 ⑲) — 선생님 용사 카드(누르면 내 용사) · 🧙 내 용사 · ⛺ 내 캠프 · 🎨 테마 · 🖥 종합실 비밀번호 고정 · 📷 사진 채점 연결 · 🔊 소리 · 로그아웃 · 판 번호
  //   옛 ⚙ 설정(비밀번호 · 선생님 모습 · 로그아웃)이 모두 여기 · 내 용사 = 학생 폰과 같은 창
  const { S }: { S: Store } = $props();
  const M = useMe(9999, 30, true);
  let hero = $state(false), sheet = $state<'' | 'key' | 'theme' | 'sound' | 'login' | 'feat'>(''), key = $state(''), ver = $state(0), toast = $state('');
  const hk = $derived.by(() => { void ver; return (S.get<string>(HALLKEY) || S.get<string>('school/teacher/hallKey')) || ''; });
  const sound = $derived.by(() => { void ver; return S.get<string>('school/teacher/sound') || '보통'; });
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  const info = $derived(heroOf(M.me.hero));
  // 🎨 테마 (#144): 교사 폰 = 11개 모두 · 고르면 교실 TV 도 같은 색(school/teacher/theme · TV = 색만)
  let theme = $state<Theme>(savedTheme());
  const themeName = $derived(THEMES.find((x) => x.id === theme)?.name ?? '');
  // 🔐 교사 로그인 (#163-① · 정식 그대로): 이메일 · 비번 · 처음 만든 비번 계정 = 교사(admins/{uid}) · 이 폰은 계속 로그인
  type AS = Store & { auth?: import('firebase/auth').Auth; isAdmin?: () => boolean };
  const srv = !!(S as AS).auth, admin = (S as AS).isAdmin?.() ?? false, who = (S as AS).auth?.currentUser?.email ?? '';
  let email = $state(''), pw = $state(''), lerr = $state(''), busy = $state(false);
  async function teacherIn(make: boolean) {
    const A = (S as AS).auth; if (!A) return; busy = true; lerr = '';
    try {
      const fa = await import('firebase/auth');
      // ✉ B8 아이디 또는 이메일: 로그인 = 이메일 그대로 → 안 되면 예전 꼴 t_…@citadel.class
      let c: Awaited<ReturnType<typeof fa.signInWithEmailAndPassword>> | null = null, last: unknown = null;
      if (make) c = await fa.createUserWithEmailAndPassword(A, makeEmail(email), pw);
      else for (const e of loginEmails(email)) { try { c = await fa.signInWithEmailAndPassword(A, e, pw); break; } catch (x) { last = x; } }
      if (!c) throw last;
      if (!S.get('admins')) S.set(`admins/${c.user.uid}`, true); // 첫 비번 계정 = 교사 (규칙이 「교사가 아직 없을 때만」 허락)
      setTimeout(() => location.reload(), 600);
    } catch (e) { lerr = /email-already/.test(String((e as { code?: string }).code)) ? '이미 있는 계정 · 「로그인」을 눌러요' : /weak-password/.test(String((e as { code?: string }).code)) ? '비밀번호는 6자 이상' : '아이디(이메일) · 비밀번호를 다시 확인해요'; }
    busy = false;
  }
  async function teacherOut() { const A = (S as AS).auth; if (!A) return; const fa = await import('firebase/auth'); await fa.signOut(A); location.reload(); }
  function pickTheme(t: Theme) { theme = t; setTheme(t); S.set('school/teacher/theme', t); }
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
    <a class="item" href="?role=hall" target="_blank"><span class="ic">⛺</span><span class="tx"><b>내 캠프</b><small>교사 캠프 · 교실 TV 에서 열려요</small></span></a>
    <button type="button" class="item" data-k="feat" onclick={() => (sheet = 'feat')}><span class="ic">⚙</span><span class="tx"><b>우리 학교 기능</b><small>{BUNDLES.find((b) => b.id === featCfg().bundle)?.ic} {BUNDLES.find((b) => b.id === featCfg().bundle)?.name} 묶음 · 켜고 끄기</small></span></button>
    {#if feat('theme')}<button type="button" class="item" onclick={() => (sheet = 'theme')}><span class="ic">🎨</span><span class="tx"><b>테마 · {themeName}</b><small>교사 폰 · 교실 TV 색</small></span></button>{/if}
    <button type="button" class="item" onclick={() => { key = hk; sheet = 'key'; }}><span class="ic">🖥</span><span class="tx"><b>종합실 비밀번호</b><small>{hk ? `고정 ${hk}` : '비우면 수업마다 새로'}</small></span></button>
    <a class="item" href="?role=atk" target="_blank"><span class="ic">💥</span><span class="tx"><b>공격 갤러리</b><small>테스트 · 몬스터 공격 15개 눌러 보기</small></span></a>
    <button type="button" class="item" disabled><span class="ic">📷</span><span class="tx"><b>사진 채점 연결</b><small>테스트 판 · 준비 중</small></span></button>
    <button type="button" class="item" onclick={() => (sheet = 'sound')}><span class="ic">{(!soundPref.sfx && !soundPref.bgm) || sound === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>소리</b><small>교사 폰 · {sound} · 효과음 {soundPref.sfx ? '켜짐' : '꺼짐'} · 배경음 {soundPref.bgm ? '켜짐' : '꺼짐'}</small></span></button>
    <button type="button" class="item" disabled={!admin} onclick={teacherOut}><span class="ic">↪</span><span class="tx"><b>로그아웃</b><small>{admin ? who : '교사 로그인 뒤'}</small></span></button>
  </div>
  <p class="ver">모두의 던전 v1.0 · 테스트 {BUILD}</p>
</div>

{#if hero}<MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} />{/if}
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
{:else if sheet === 'feat'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}⚙ 우리 학교 기능{/snippet}
    <FeatSettings {S} />
  </Sheet>
{:else if sheet === 'theme'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🎨 테마{/snippet}
    <ThemePicker now={theme} feats={null} onpick={pickTheme} />
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
</style>
