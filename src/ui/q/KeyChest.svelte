<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Room } from '../../model/types';
  import { keyUses, KEY_CHEST } from '../../school/keys';
  import { CHEST } from '../manifest';
  import { sfx } from '../sound.svelte';
  // 🎁 열쇠 보물상자 (📜 #59): 열쇠 + 그 소문제 첫 시도 맞힘 = 「🔑 열쇠 사용! → 🎁 보물상자 💎 +3」 (한 차시 최대 3 · 💎 = 수업 결과에서 받음)
  //   재도전에서 맞힘 = 「🔑 열쇠 사용」 · 3개 다 엶 = 「🎁 오늘 상자는 다 열었어요」 · 화면을 연 때 이미 지난 것은 다시 안 띄움
  const { L, R, uid }: { L: LessonPack; R: Room; uid: string } = $props();
  const rows = $derived(keyUses(L, R, uid));
  let seen: Set<string> | null = null, pop = $state<{ chest: boolean; text: string; n: number } | null>(null), t: ReturnType<typeof setTimeout> | null = null, f = $state(0);
  $effect(() => {
    const rs = rows;
    untrack(() => {
      const done = rs.filter((r) => r.have && r.state !== 'none'), keyOf = (r: (typeof rs)[number]) => `${r.at}#${r.n}`;
      if (!seen) { seen = new Set(done.map(keyOf)); return; }
      const fresh = done.filter((r) => !seen!.has(keyOf(r))); if (!fresh.length) return;
      fresh.forEach((r) => seen!.add(keyOf(r)));
      const r = fresh.find((x) => x.chest) ?? fresh[0]!, opened = rs.filter((x) => x.chest).length;
      pop = r.chest ? { chest: true, text: `🔑 열쇠 사용! · ${r.name}`, n: opened } : r.state === 'first' ? { chest: false, text: `🎁 오늘 상자는 다 열었어요 (${KEY_CHEST.max} / ${KEY_CHEST.max})`, n: opened } : { chest: false, text: `🔑 열쇠 사용 · ${r.name}`, n: opened };
      f = 0; if (pop.chest) { sfx('correct', 0.7); setTimeout(() => (f = 1), 350); setTimeout(() => (f = 2), 900); }
      if (t) clearTimeout(t); t = setTimeout(() => (pop = null), pop.chest ? 2600 : 1800);
    });
  });
  $effect(() => () => { if (t) clearTimeout(t); });
</script>

{#if pop}
  <div class="kc" class:chest={pop.chest} role="status" data-k="key-chest" data-chest={pop.chest ? '1' : '0'}>
    {#if pop.chest}<i class="cimg" class:shake={f === 1} style:background-image="url({CHEST.src})" style:background-position="{f * 50}% 0" aria-hidden="true"></i>{/if}
    <b>{pop.text}</b>
    {#if pop.chest}<span>🎁 보물상자 · 💎 +{KEY_CHEST.gem} <small>({pop.n} / {KEY_CHEST.max} · 수업 결과에서 받아요)</small></span>{/if}
  </div>
{/if}

<style>
  .kc { position: fixed; z-index: 40; left: 50%; top: 22%; transform: translateX(-50%); width: min(320px, 86vw); padding: 14px 16px; border-radius: var(--r-lg, 20px); background: var(--surface); border: 2px solid var(--accent); box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55); display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; animation: kin 0.18s ease-out; }
  .kc b { font: 800 17px var(--font); } .kc span { font: 700 15px var(--font); color: var(--gem); } .kc small { color: var(--text-2); font-weight: 500; }
  .cimg { width: 96px; height: 96px; background-size: 300% 100%; background-repeat: no-repeat; image-rendering: pixelated; }
  .cimg.shake { animation: sh 0.12s steps(2) infinite; }
  @keyframes sh { 0% { transform: translateX(-3px) rotate(-3deg); } 100% { transform: translateX(3px) rotate(3deg); } }
  @keyframes kin { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
</style>
