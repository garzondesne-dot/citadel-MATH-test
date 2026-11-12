<script lang="ts">
  import type { Store } from '../../model/types';
  import { BUILD } from '../../build';
  import { heroOf, famOfHero } from '../../model/hero';
  import { useMe } from '../../store/me.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import Sheet from '../battle/Sheet.svelte';

  // 🧙 나 탭 (#124 ⑲) — 선생님 용사 카드(누르면 내 용사) · 🧙 내 용사 · ⛺ 내 캠프 · 🎨 테마 · 🖥 종합실 비밀번호 고정 · 📷 사진 채점 연결 · 🔊 소리 · 로그아웃 · 판 번호
  //   옛 ⚙ 설정(비밀번호 · 선생님 모습 · 로그아웃)이 모두 여기 · 내 용사 = 학생 폰과 같은 창
  const { S }: { S: Store } = $props();
  const M = useMe(9999, 30, true);
  let hero = $state(false), sheet = $state<'' | 'key' | 'theme' | 'sound'>(''), key = $state(''), ver = $state(0), toast = $state('');
  const hk = $derived.by(() => { void ver; return S.get<string>('school/teacher/hallKey') || ''; });
  const sound = $derived.by(() => { void ver; return S.get<string>('school/teacher/sound') || '보통'; });
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  const info = $derived(heroOf(M.me.hero));
</script>

<div class="tbar"><div class="t">나</div></div>
<div class="mid scroll">
  <button type="button" class="hc" onclick={() => (hero = true)}>
    <span class="pic"><HeroSprite id={M.me.hero} aura={M.me.enh} />{#if M.me.enh}<b>+{M.me.enh}</b>{/if}</span>
    <span class="tx"><b>선생님</b><small>{famOfHero(M.me.hero).name.split(' ')[0]} {info.name} · {info.job} · 강화 +{M.me.enh}</small></span><span class="go">›</span>
  </button>
  <div class="list">
    <button type="button" class="item" onclick={() => (hero = true)}><span class="ic">🧙</span><span class="tx"><b>내 용사</b><small>용사 바꾸기 · 강화 · 스킬 (학생 폰과 같은 창)</small></span></button>
    <a class="item" href="?role=hall" target="_blank"><span class="ic">⛺</span><span class="tx"><b>내 캠프</b><small>교사 캠프 · 교실 TV 에서 열려요</small></span></a>
    <button type="button" class="item" onclick={() => (sheet = 'theme')}><span class="ic">🎨</span><span class="tx"><b>테마 · 금빛 던전</b><small>교사 폰 · 교실 TV 색</small></span></button>
    <button type="button" class="item" onclick={() => { key = hk; sheet = 'key'; }}><span class="ic">🖥</span><span class="tx"><b>종합실 비밀번호</b><small>{hk ? `고정 ${hk}` : '비우면 수업마다 새로'}</small></span></button>
    <button type="button" class="item" disabled><span class="ic">📷</span><span class="tx"><b>사진 채점 연결</b><small>테스트 판 · 준비 중</small></span></button>
    <button type="button" class="item" onclick={() => (sheet = 'sound')}><span class="ic">🔊</span><span class="tx"><b>소리</b><small>교사 폰 · {sound}</small></span></button>
    <button type="button" class="item" disabled><span class="ic">↪</span><span class="tx"><b>로그아웃</b><small>테스트 판 · 교사 계정 없음</small></span></button>
  </div>
  <p class="ver">모두의 던전 v1.0 · 테스트 {BUILD}</p>
</div>

{#if hero}<MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} />{/if}
{#if sheet === 'key'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🖥 종합실 비밀번호 고정{/snippet}
    {#snippet act()}<button type="button" class="btn" disabled={!!key && !/^\d{4}$/.test(key)} onclick={() => { S.set('school/teacher/hallKey', key || null); ver++; sheet = ''; say(key ? `고정 ${key}` : '수업마다 새로'); }}>{key ? '이 번호로 고정' : '비우기 (수업마다 새로)'}</button>{/snippet}
    <input class="in" inputmode="numeric" maxlength="4" placeholder="숫자 4자리 · 비우면 수업마다 새로" bind:value={key} />
  </Sheet>
{:else if sheet === 'theme'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🎨 테마{/snippet}
    <div class="list"><button type="button" class="item on"><span class="ic">✔</span><span class="tx"><b>금빛 던전</b><small>교사 폰 · 교실 TV (지금 테마)</small></span></button>
      <button type="button" class="item" disabled><span class="ic">🌋</span><span class="tx"><b>다른 테마</b><small>테스트 판 · 준비 중</small></span></button></div>
  </Sheet>
{:else if sheet === 'sound'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}🔊 소리 · 교사 폰{/snippet}
    <div class="list">{#each ['보통', '작게', '끔'] as v (v)}<button type="button" class="item" class:on={sound === v} onclick={() => { S.set('school/teacher/sound', v); ver++; sheet = ''; }}><span class="ic">{v === '끔' ? '🔇' : '🔊'}</span><span class="tx"><b>{v}</b></span></button>{/each}</div>
  </Sheet>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
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
