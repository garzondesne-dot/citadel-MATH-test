<script lang="ts">
  import { untrack } from 'svelte';
  import { BETA, CREDIT_NAME, showCredit, verName } from '../../channel';
  import type { Store } from '../../model/types';
  import { BUILD } from '../../build';
  import { heroOf, famOfHero } from '../../model/hero';
  import { useMe } from '../../store/me.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import FeatSettings from './FeatSettings.svelte';
  import PhotoSettings from './PhotoSettings.svelte';
  import { cfgOf } from '../../school/photo';
  import { BUNDLES, featCfg } from '../../school/features.svelte';
  // 🧙 나 탭 (📜 2026-11-17 #21 A): 선생님 용사 카드(누르면 내 용사) · ⛺ 내 캠프 — 계정 · 소리 · 테마 · 앱 · 로그아웃 = 오른쪽 위 ⚙ · 🔔 알림 · 📜 바뀐 것 = ✉ 소식 · 종합실 키 = ⚔ 수업 ③
  const { S }: { S: Store } = $props();
  const M = useMe(9999, 30, true, true); // 👩‍🏫 교사 기록 = 따로 칸 (B안)
  let hero = $state(false), sheet = $state<'' | 'feat' | 'photo'>(''), toast = $state('');
  const info = $derived(heroOf(M.me.hero));
  type AS = Store & { auth?: import('firebase/auth').Auth; isAdmin?: () => boolean };
  const { srv, admin } = untrack(() => ({ srv: !!(S as AS).auth, admin: (S as AS).isAdmin?.() ?? false }));
</script>

<div class="tbar"><div class="t">나</div></div>
<div class="mid scroll">
  <button type="button" class="hc" onclick={() => (hero = true)}>
    <span class="pic"><HeroSprite id={M.me.hero} aura={M.me.enh} play />{#if M.me.enh}<b>+{M.me.enh}</b>{/if}</span>
    <span class="tx"><b>선생님</b><small>{famOfHero(M.me.hero).name.split(' ')[0]} {info.name} · {info.job} · 강화 +{M.me.enh}</small></span><span class="go">›</span>
  </button>
  <div class="list">
    <a class="item" href="?role=camp&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=me'); } catch { /* 무시 */ } }}><span class="ic">⛺</span><span class="tx"><b>내 캠프</b><small>학생 폰 캠프와 같은 화면 · 교사 캠프는 여기에만</small></span></a>
    <!-- ⏸ #21 준비 탭 부분 멈춤(📜 2026-11-17 메타인지 7): 우리 학교 기능 · 사진 채점 · 공격 갤러리는 「📦 차시 팩」 탭 결정까지 여기 그대로 -->
    <button type="button" class="item" data-k="feat" onclick={() => (sheet = 'feat')}><span class="ic">⚙</span><span class="tx"><b>우리 학교 기능</b><small>{BUNDLES.find((b) => b.id === featCfg().bundle)?.ic} {BUNDLES.find((b) => b.id === featCfg().bundle)?.name} 묶음 · 켜고 끄기</small></span></button>
    <button type="button" class="item" data-k="photo-set-go" disabled={!srv || !admin} onclick={() => (sheet = 'photo')}><span class="ic">📷</span><span class="tx"><b>사진 채점 설정</b><small>{!srv || !admin ? '교사 로그인 뒤' : cfgOf(S).url ? `${cfgOf(S).on ? '켜짐' : '꺼짐'} · 웹 앱 주소 있음` : '웹 앱 주소를 넣으면 켜져요'}</small></span></button>
    <a class="item" href="?role=atk&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=me'); } catch { /* 무시 */ } }}><span class="ic">💥</span><span class="tx"><b>공격 갤러리</b><small>{BETA ? '테스트 · ' : ''}몬스터 공격 15개 눌러 보기</small></span></a>
  </div>
  <p class="ver" data-k="ver">모두의 던전 v1.0 · {verName(BUILD)}{showCredit ? ` · 만든 이 ${CREDIT_NAME}` : ''}</p>
</div>

{#if hero}<MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} teacher onreset={M.reset} />{/if}
{#if sheet === 'photo'}
  <Sheet onclose={() => (sheet = '')} tall mainText="닫기">
    {#snippet title()}📷 사진 채점 설정{/snippet}
    <PhotoSettings {S} />
  </Sheet>
{:else if sheet === 'feat'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}⚙ 우리 학교 기능{/snippet}
    <FeatSettings {S} />
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
  .ver { margin: var(--s3) 0; text-align: center; font-size: 12.5px; color: var(--text-3); }
</style>
