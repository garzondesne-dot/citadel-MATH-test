<script lang="ts">
  // 🔔 교사 알림 설정 (📜 2026-11-16 · src/school/notify.svelte.ts) — 위 = 알림 켜기(브라우저 허락) · 아래 = 종류별 스위치 4개 · 시험 알림 한 장
  //   ① 단계 = 교사 앱이 열려 있을 때(막 내린 때 포함) · 앱을 닫아도 오는 알림은 다음 단계(무료 중계)
  import { enableNotes, NOTE_KINDS, notePerm, notePref, notify, setNotePref } from '../../school/notify.svelte';
  let perm = $state(notePerm()), msg = $state('');
  const live = $derived(notePref.on && perm === 'granted');
  async function turnOn() { const ok = await enableNotes(); perm = notePerm(); msg = ok ? '켜졌어요' : perm === 'denied' ? '이 폰에서 알림이 막혀 있어요 · 폰 설정 → 앱(브라우저) → 알림 허용' : perm === 'unsupported' ? '이 브라우저는 알림을 못 띄워요 · 홈 화면 앱으로 열어 주세요' : '허락하지 않았어요'; }
  async function test() { msg = (await notify('test', '🔔 시험 알림', '모두의 던전 선생님 알림이 이렇게 와요')) ? '시험 알림을 보냈어요' : '보내지 못했어요 · 알림을 먼저 켜 주세요'; }
</script>

<div class="ns" data-k="note-set">
  {#if live}
    <button type="button" class="sw on main" role="switch" aria-checked="true" data-k="note-on" onclick={() => { setNotePref({ on: false }); msg = '꺼졌어요'; }}><span class="ic">🔔</span><b>알림 켜짐</b><span class="st">이 폰</span><i class="kn" aria-hidden="true"></i></button>
  {:else}
    <button type="button" class="go" data-k="note-enable" onclick={turnOn}>🔔 알림 켜기</button>
  {/if}
  {#each NOTE_KINDS as n (n.k)}
    <button type="button" class="sw" class:on={notePref[n.k]} role="switch" aria-checked={notePref[n.k]} data-k="note-{n.k}" disabled={!live} onclick={() => setNotePref({ [n.k]: !notePref[n.k] })}>
      <span class="ic">{n.ic}</span><span class="tx"><b>{n.name}</b><small>{n.sub}</small></span><i class="kn" aria-hidden="true"></i>
    </button>
  {/each}
  {#if live}<button type="button" class="ghost" data-k="note-test" onclick={test}>시험 알림 한 장</button>{/if}
  {#if msg}<p class="msg" role="status">{msg}</p>{/if}
  <small class="foot">교사 앱이 열려 있을 때 와요 · 알림 글에 학생 이름은 안 나와요 · 앱을 닫아도 오는 알림은 준비 중</small>
</div>

<style>
  .ns { display: flex; flex-direction: column; gap: var(--s2); }
  .go { min-height: var(--tap); border: 0; border-radius: 12px; background: var(--accent); color: #2a1a00; font: 700 16px var(--font); box-shadow: 0 3px 0 #8a6420; }
  .go:active { transform: translateY(2px); box-shadow: none; }
  .ghost { min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: transparent; color: var(--text); font: 700 15px var(--font); }
  .sw { display: flex; align-items: center; gap: var(--s2); min-height: var(--tap); padding: var(--s1) var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .sw:disabled { opacity: 0.45; }
  .sw .tx { flex: 1; display: flex; flex-direction: column; } .sw .tx small { font-size: 13px; color: var(--text-3); font-weight: 500; }
  .sw.main b { flex: 1; } .sw .st { font-size: 13px; color: var(--text-3); font-weight: 500; }
  .sw .kn { width: 40px; height: 24px; border-radius: 12px; background: var(--surface-2); position: relative; flex: none; transition: background var(--t); }
  .sw .kn::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--text-3); transition: transform var(--t), background var(--t); }
  .sw.on .kn { background: var(--accent); } .sw.on .kn::after { transform: translateX(16px); background: #fff; }
  .sw:not(.on) .ic { opacity: 0.45; }
  .msg { margin: 0; font-size: 14px; color: var(--accent); text-align: center; }
  .foot { font-size: 13px; color: var(--text-3); text-align: center; }
</style>
