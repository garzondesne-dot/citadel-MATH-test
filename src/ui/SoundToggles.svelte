<script lang="ts">
  import { setSound, soundPref } from './sound.svelte';
  // 🔊 소리 탭 (B5 · 정식 018fa0f): 🔊 효과음 · 🎵 배경음 켜기 · 끄기 따로 · 이 기기 기억 · 둘 다 꺼지면 🔇
  const rows = [{ k: 'sfx', on: '🔊', off: '🔈', name: '효과음' }, { k: 'bgm', on: '🎵', off: '🎵', name: '배경음' }] as const;
</script>

<div class="snd" role="group" aria-label="소리">
  {#each rows as r (r.k)}
    <button type="button" class="sw" class:on={soundPref[r.k]} role="switch" aria-checked={soundPref[r.k]} data-k={r.k} onclick={() => setSound({ [r.k]: !soundPref[r.k] })}>
      <span class="ic">{soundPref[r.k] ? r.on : r.off}</span><b>{r.name}</b><span class="st">{soundPref[r.k] ? '켜짐' : '꺼짐'}</span><i class="kn" aria-hidden="true"></i>
    </button>
  {/each}
  <small>이 기기만 · 다음에 열어도 그대로</small>
</div>

<style>
  .snd { display: flex; flex-direction: column; gap: var(--s2); }
  .sw { display: flex; align-items: center; gap: var(--s2); min-height: var(--tap); padding: 0 var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .sw b { flex: 1; } .sw .st { font-size: 13px; color: var(--text-3); font-weight: 500; }
  .sw .kn { width: 40px; height: 24px; border-radius: 12px; background: var(--surface-2); position: relative; flex: none; transition: background var(--t); }
  .sw .kn::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--text-3); transition: transform var(--t), background var(--t); }
  .sw.on .kn { background: var(--accent); } .sw.on .kn::after { transform: translateX(16px); background: #fff; }
  .sw:not(.on) .ic { opacity: 0.45; }
  small { font-size: 13px; color: var(--text-3); text-align: center; }
</style>
