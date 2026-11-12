<script lang="ts">
  import type { Store } from '../model/types';
  import { CLASSES, hasAccount, logIn, pupil, roster, saveLogin, signUp, type Pupil } from '../school/school';
  import Sheet from './battle/Sheet.svelte';

  // ⓪ 학생 첫 화면 = 게임 타이틀 (#119 · DECISIONS 「✅ ⓪ 학생 첫 화면 컨펌」 · 시안 v71 「⓪」 · 선생님 「이 정도는 살리자」)
  //   정식 첫 화면 그림 brand-bg(용사 넷이 문을 엶 · 위치 center 30% · 아래 46% 어둡게) + 정식 로고 menu-logo(폭 80% · 최대 320 · 위 3%) · 반 ▾ · 번호 ▾ → 「n번 · 이름 맞나요?」 → 비밀번호 4칸(숫자 키패드 · 시스템 키보드 안 띄움) → 금빛 「⚔ 모험 시작」
  //   「처음이에요 · 가입」 = 같은 화면(비밀번호 두 번) · 교사 · 종합실 = 맨 아래 작은 글자 링크 · 한 번 로그인한 폰은 다음부터 바로 캠프(App 이 고름)
  const { S, onin }: { S: Store; onin: (p: Pupil) => void } = $props();
  const ART = `${import.meta.env.BASE_URL}art/brand-bg-v1.webp`;
  const LOGO = `${import.meta.env.BASE_URL}art/menu-logo-v1.webp`;
  let cls = $state('');
  let num = $state(0);
  let join = $state(false);
  let pw = $state('');
  let pw2 = $state('');
  let pad = $state<0 | 1 | 2>(0); // 키패드: 0 닫힘 · 1 비밀번호 · 2 한 번 더
  let err = $state('');
  let more = $state(false);
  const who = $derived(cls && num ? pupil(cls, num) : null);
  const ready = $derived(!!who && pw.length === 4 && (!join || pw2.length === 4));
  $effect(() => { if (who && !join && !hasAccount(S, who.cls, who.num)) join = true; });
  function key(k: string) {
    err = '';
    const cur = pad === 2 ? pw2 : pw, next = k === '⌫' ? cur.slice(0, -1) : cur.length < 4 ? cur + k : cur;
    if (pad === 2) pw2 = next; else pw = next;
    if (next.length === 4 && k !== '⌫') pad = join && pad === 1 && pw2.length < 4 ? 2 : 0;
  }
  function go() {
    if (!who) return;
    const e = join ? signUp(S, who.cls, who.num, pw, pw2) : logIn(S, who.cls, who.num, pw);
    if (e) { err = e; pw = ''; pw2 = ''; return; }
    saveLogin(who); onin(who);
  }
  const why = $derived(!cls ? '반을 골라요' : !num ? '번호를 골라요' : pw.length < 4 ? '비밀번호 4자리를 눌러요' : join && pw2.length < 4 ? '비밀번호를 한 번 더' : '');
</script>

<div class="title" style:background-image="url({ART})">
  <h1 class="logo"><img src={LOGO} alt="모두의 던전 · 공통수학2" /></h1>
  <form class="form" onsubmit={(e) => { e.preventDefault(); if (ready) go(); }}>
    <div class="row">
      <label class="sel"><span class="sr">반</span>
        <select bind:value={cls} onchange={() => { num = 0; pw = ''; pw2 = ''; err = ''; join = false; }}>
          <option value="" disabled>반 ▾</option>
          {#each CLASSES as c (c)}<option value={c}>{c}반</option>{/each}
        </select>
      </label>
      <label class="sel"><span class="sr">번호</span>
        <select bind:value={num} disabled={!cls} onchange={() => { pw = ''; pw2 = ''; err = ''; join = false; }}>
          <option value={0} disabled>번호 ▾</option>
          {#each cls ? roster(cls) : [] as p (p.num)}<option value={p.num}>{p.num}번</option>{/each}
        </select>
      </label>
    </div>
    <p class="name" aria-live="polite">{#if who}<b>{who.num}번 · {who.name}</b> 맞나요?{:else}반과 번호를 고르면 이름이 나와요{/if}</p>
    <button type="button" class="pw" class:on={pad === 1} disabled={!who} aria-label="비밀번호 4자리 {pw.length}자리 눌렀음" onclick={() => (pad = 1)}>
      {#each [0, 1, 2, 3] as i (i)}<i class:fill={pw.length > i}>{pw.length > i ? '●' : ''}</i>{/each}
    </button>
    {#if join && who}
      <button type="button" class="pw" class:on={pad === 2} aria-label="비밀번호 한 번 더 {pw2.length}자리" onclick={() => (pad = 2)}>
        {#each [0, 1, 2, 3] as i (i)}<i class:fill={pw2.length > i}>{pw2.length > i ? '●' : ''}</i>{/each}<small>한 번 더</small>
      </button>
    {/if}
    {#if err}<p class="err" role="alert">{err}</p>{/if}
    <button type="submit" class="go" disabled={!ready}>{join ? '⚔ 가입하고 모험 시작' : '⚔ 모험 시작'}</button>
    <p class="why">{why}</p>
    <div class="links">
      <button type="button" class="lk" onclick={() => { join = !join; pw = ''; pw2 = ''; err = ''; }}>{join ? '가입했어요 · 로그인' : '처음이에요 · 가입'}</button>
      <button type="button" class="lk" onclick={() => (more = true)}>교사 · 종합실 ›</button>
    </div>
  </form>
</div>

{#if pad}
  <div class="padbg" role="presentation" onclick={() => (pad = 0)}></div>
  <div class="pad" role="group" aria-label="숫자 키패드">
    <p class="padt">{pad === 2 ? '비밀번호 한 번 더' : '비밀번호 4자리'} <span>{'●'.repeat((pad === 2 ? pw2 : pw).length)}{'○'.repeat(4 - (pad === 2 ? pw2 : pw).length)}</span></p>
    <div class="keys">
      {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '닫기', '0', '⌫'] as k (k)}
        <button type="button" class:aux={k === '닫기' || k === '⌫'} onclick={() => (k === '닫기' ? (pad = 0) : key(k))}>{k}</button>
      {/each}
    </div>
  </div>
{/if}

{#if more}
  <Sheet onclose={() => (more = false)}>
    {#snippet title()}교사 · 종합실{/snippet}
    <a class="big" href="?role=teacher">📱 교사 폰 <small>수업 열기 · 리모컨</small></a>
    <a class="big" href="?role=hall">🖥 교실 TV <small>종합실 · 교사 캠프</small></a>
  </Sheet>
{/if}

<style>
  .title { position: relative; height: 100dvh; max-width: 430px; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; background-color: var(--bg); background-position: center 30%; background-size: cover; background-repeat: no-repeat; image-rendering: pixelated; }
  .title::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 46%; background: linear-gradient(rgba(15, 17, 21, 0), rgba(15, 17, 21, 0.9) 34%, var(--bg)); pointer-events: none; }
  .logo { position: absolute; top: 3%; left: 0; right: 0; margin: 0; text-align: center; z-index: 1; }
  .logo img { width: 80%; max-width: 320px; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.7)); }
  .form { position: relative; z-index: 1; padding: 0 var(--s4) calc(var(--s3) + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: var(--s2); }
  .row { display: flex; gap: var(--s2); }
  .sel { flex: 1; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  select { width: 100%; height: var(--tap); border-radius: var(--r); border: 1px solid var(--line); background: rgba(24, 27, 34, 0.92); color: var(--text); font: 700 var(--fs-body) var(--font); padding: 0 var(--s3); text-align: center; text-align-last: center; }
  select:disabled { opacity: 0.5; }
  .name { margin: 0; text-align: center; font-size: var(--fs-small); color: var(--text-2); min-height: 22px; }
  .name b { color: var(--text); }
  .pw { position: relative; display: flex; justify-content: center; gap: var(--s3); border: 0; background: none; padding: 0; min-height: 52px; align-items: center; }
  .pw i { width: 44px; height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: rgba(24, 27, 34, 0.92); display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 18px; color: var(--accent); }
  .pw i.fill { background: var(--surface-2); border-color: var(--accent); }
  .pw.on i { border-color: var(--accent); }
  .pw:disabled { opacity: 0.45; }
  .pw small { position: absolute; right: 0; font-size: var(--fs-small); color: var(--text-3); }
  .err { margin: 0; text-align: center; color: var(--bad); font-size: var(--fs-small); font-weight: 700; }
  .go { height: var(--btn-h); border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .go:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .go:disabled { opacity: 0.45; box-shadow: none; }
  .why { margin: 0; min-height: 20px; text-align: center; font-size: var(--fs-small); color: var(--text-3); }
  .links { display: flex; justify-content: space-between; }
  .lk { height: var(--tap); padding: 0 var(--s1); border: 0; background: none; color: var(--text-3); font: 700 var(--fs-small) var(--font); }
  .padbg { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, 0.45); }
  .pad { position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-width: 430px; margin: 0 auto; background: var(--surface); border-radius: var(--r-lg) var(--r-lg) 0 0; padding: var(--s3) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); }
  .padt { margin: 0 0 var(--s2); text-align: center; font-weight: 700; color: var(--text-2); font-size: var(--fs-small); }
  .padt span { margin-left: var(--s2); color: var(--accent); letter-spacing: 4px; }
  .keys { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s2); }
  .keys button { height: 52px; border-radius: var(--r); border: 0; background: var(--surface-2); color: var(--text); font: 700 22px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .keys button.aux { font-size: var(--fs-small); color: var(--text-2); }
  .keys button:active { transform: translateY(2px); box-shadow: none; }
  .big { display: flex; flex-direction: column; padding: var(--s3) var(--s4); min-height: 64px; justify-content: center; border-radius: var(--r); background: var(--surface-2); color: var(--text); text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 3px 0 var(--press-sh); }
  .big small { font-size: var(--fs-small); color: var(--text-2); font-weight: 500; }
</style>
