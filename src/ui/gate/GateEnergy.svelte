<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { meBound } from '../../store/meSync';
  import Castle from '../castle/Castle.svelte';
  import GateArt from './GateArt.svelte';
  import GateMine from './GateMine.svelte';
  import { E_BASE, GATE_TXT, addEnergy, frameOf, gateBase, myGate, tallyOf } from '../../school/gate';
  import { sfx } from '../sound.svelte';
  // ⚡ 에너지 · 성채 (📜 11/28) — 수업 ⚡ 단계 · 캠프 🌀 (그 반이 차원문 수업을 연 뒤 언제나)
  //   맨 위 = 우리 반 차원문 카드(작은 그림 · ⚡ n / 108 · 나 k · 📊) → 🎲 무작위 한 문제 → 아래 성채 방 목록(직접 고르기)
  //   맞힘 = 원래 성채 처치 그대로(기록 · 💎 · EXP · 보스 방) + ⚡ +1 (이미 처치한 방도) · 반 합 = 교사 기기가 적은 값 + 내가 방금 더한 것
  const { S, me, save, uid, num = 0, cls = '', noBack = false, onclose }: { S: Store; me: Me | null; save: () => void; uid: string; num?: number; cls?: string; noBack?: boolean; onclose: () => void } = $props();
  const b = untrack(() => meBound()), RS = untrack(() => b?.S ?? S), base = untrack(() => (b ? gateBase(b.cls, b.num) : gateBase(cls, num || uid)));
  let ver = $state(0); { const iv = setInterval(() => ver++, 2000); onDestroy(() => clearInterval(iv)); }
  const t = $derived.by(() => { void ver; return tallyOf(S, cls); });
  // 내가 방금 더한 것 (교사 기기가 반 합을 다시 적으면 0 으로)
  let plus = $state(0), lastE = untrack(() => t.e);
  $effect(() => { const e = t.e; untrack(() => { if (e !== lastE) { lastE = e; plus = 0; } }); });
  const classE = $derived(t.e + plus);
  const k = $derived.by(() => { void ver; return Number(myGate(RS, base).e) || 0; });
  const fr = $derived(frameOf(t.n, t.pass, !!t.s));
  let toast = $state(''), tT: ReturnType<typeof setTimeout> | undefined, mine = $state(false);
  onDestroy(() => clearTimeout(tT));
  function onwin() {
    addEnergy(RS, base, S.now()); plus++; ver++;
    toast = GATE_TXT.gain(t.e + plus); sfx('star', 0.7); clearTimeout(tT); tT = setTimeout(() => (toast = ''), 3200);
  }
</script>

<Castle {S} {me} {save} {uid} {num} {cls} {noBack} {onclose} gate={{ onwin }}>
  {#snippet top()}
    <button type="button" class="gcard" data-k="gate-card" onclick={() => (mine = true)}>
      <span class="gimg"><GateArt v={{ n: fr.total, placed: fr.placed, full: fr.full, e: classE }} anim={false} crop={[380, 0, 616, 768]} /></span>
      <span class="gtx">
        <b>우리 반 차원문 · ⚡ <em data-k="gate-class-e">{classE}</em> / {E_BASE} 기준</b>
        <span class="bar" aria-hidden="true"><i style:width="{Math.min(100, (classE / E_BASE) * 100)}%" class:gold={classE >= E_BASE}></i></span>
        <small>나 <b data-k="gate-my-e">{k}</b> · 📊 눌러서 내 기여</small>
      </span>
    </button>
  {/snippet}
</Castle>
{#if toast}<p class="gtoast" role="status" data-k="gate-toast">{toast}</p>{/if}
{#if mine}<GateMine {S} {RS} {base} {cls} {plus} onclose={() => (mine = false)} />{/if}

<style>
  .gcard { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; align-items: center; padding: 10px; border-radius: var(--r); border: 2px solid #6a5aa8; background: linear-gradient(160deg, #1f1838, var(--surface)); color: var(--text); text-align: left; font: inherit; }
  .gimg { width: 72px; height: 90px; border-radius: 8px; overflow: hidden; background: #07060c; }
  .gtx { display: grid; gap: 6px; min-width: 0; } .gtx > b { font-size: 16px; } .gtx em { font-style: normal; color: var(--accent); font-size: 20px; }
  .gtx small { font-size: 13px; color: var(--text-2); } .gtx small b { color: var(--accent); }
  .bar { height: 10px; border-radius: 99px; background: var(--surface-2); overflow: hidden; } .bar i { display: block; height: 100%; background: linear-gradient(90deg, #5a7dff, #b78cff); transition: width 0.5s; } .bar i.gold { background: linear-gradient(90deg, #5a7dff, #b78cff 60%, #ffd25a); }
  .gtoast { position: fixed; left: 50%; top: 64px; transform: translateX(-50%); z-index: 44; margin: 0; padding: 10px 14px; border-radius: 12px; background: #2a1d45; border: 2px solid #b78cff; color: #fff; font: 900 15px var(--font); white-space: nowrap; box-shadow: 0 0 24px rgba(183, 140, 255, 0.5); }
</style>
