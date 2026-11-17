<script lang="ts">
  import { CREDIT_NAME, showCredit, verName } from '../../channel';
  import type { Store } from '../../model/types';
  import { BUILD } from '../../build';
  import { heroOf, famOfHero } from '../../model/hero';
  import { meLookId, useMe } from '../../store/me.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  // 🧙 나 탭 (📜 2026-11-17 #21 A · #22): 선생님 용사 카드(누르면 내 용사) · ⛺ 내 캠프 뿐 — 계정 · 소리 · 테마 · 앱 · 로그아웃 = 오른쪽 위 ⚙ · 🔔 알림 · 📜 바뀐 것 = ✉ 소식 · 종합실 키 = ⚔ 수업 ③ · 기능 단계 = 📦 차시 카드 · 사진 채점 · 공격 갤러리 = 📦 🧰 도구
  const { S }: { S: Store } = $props();
  const M = useMe(9999, 30, true, true); // 👩‍🏫 교사 기록 = 따로 칸 (B안)
  let hero = $state(false), toast = $state('');
  const info = $derived(heroOf(meLookId(M.me))); // 🌟 #29
</script>

<div class="tbar"><div class="t">나</div></div>
<div class="mid scroll">
  <button type="button" class="hc" onclick={() => (hero = true)}>
    <span class="pic"><HeroSprite id={meLookId(M.me)} aura={M.me.enh} play />{#if M.me.enh}<b>+{M.me.enh}</b>{/if}</span>
    <span class="tx"><b>선생님</b><small>{famOfHero(M.me.hero).name.split(' ')[0]} {info.name} · {info.job} · 강화 +{M.me.enh}</small></span><span class="go">›</span>
  </button>
  <div class="list">
    <a class="item" href="?role=camp&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=me'); } catch { /* 무시 */ } }}><span class="ic">⛺</span><span class="tx"><b>내 캠프</b><small>학생 폰 캠프와 같은 화면 · 교사 캠프는 여기에만</small></span></a>
  </div>
  <p class="ver" data-k="ver">모두의 던전 v1.0 · {verName(BUILD)}{showCredit ? ` · 만든 이 ${CREDIT_NAME}` : ''}</p>
</div>

{#if hero}<MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} teacher onreset={M.reset} />{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .hc { display: flex; align-items: center; gap: var(--s3); min-height: 84px; padding: var(--s3); border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .pic { position: relative; flex: none; width: 88px; height: 72px; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; }
  .pic b { position: absolute; right: -6px; bottom: -6px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent); color: var(--on-accent); font-size: 13px; display: grid; place-items: center; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; } .tx b { font-size: 16px; } .tx small { font-size: 13px; color: var(--text-2); }
  .go { font-size: 24px; color: var(--text-3); }
  a.item { text-decoration: none; }
  .ver { margin: var(--s3) 0; text-align: center; font-size: 12.5px; color: var(--text-3); }
</style>
