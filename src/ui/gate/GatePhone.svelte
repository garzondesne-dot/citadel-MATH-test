<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { meBound } from '../../store/meSync';
  import { useMe } from '../../store/me.svelte';
  import { isReady, whenReady } from '../../store/atomic';
  import AbcSheet from '../exam/AbcSheet.svelte';
  import MockExam from '../exam/MockExam.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import GateArt from './GateArt.svelte';
  import GateEnergy from './GateEnergy.svelte';
  import GateMine from './GateMine.svelte';
  import { GATE_TXT, addPractice, doorOpenAt, frameOf, gateBase, markEnter, payPass, tallyOf } from '../../school/gate';
  import { abcRecPath, abcStep, type AbcRec } from '../../school/abcSheet';
  import { PACKS } from '../../engine/packs';
  import { doneNo } from '../../school/progress';
  import { sfx } from '../sound.svelte';
  // 🌀 마왕성 차원문 · 학생 폰 (📜 11/28 · 수업 도입 단계 gate) — 「TV 를 봐요」 대신 이 화면
  //   🧱 sheet = 답안지(통과 전) → 통과 화면(작은 문 · 내 돌 · 우리 반 뼈대 n / 기준) · ⚡ 에너지 · 📄 B세트 연습
  //   ⚡ energy = 에너지 화면(성채) · 🌀 door = 차원문이 열렸어요 + 🌀 들어가기(모의 시험지 · 장면은 다음 판)
  const { S, R = null, code = '', kind, cls = '', num = 0, uid }: { S: Store; R?: Room | null; code?: string; kind: 'sheet' | 'energy' | 'door'; cls?: string; num?: number; uid: string } = $props();
  const opened = $derived(!!doorOpenAt(R));
  const b = untrack(() => meBound()), RS = untrack(() => b?.S ?? S), base = untrack(() => (b ? gateBase(b.cls, b.num) : gateBase(cls, num || uid)));
  const M = untrack(() => (b ? useMe(0, 0, false, false) : useMe(0, 0, true, false)));
  let ver = $state(0); { const iv = setInterval(() => ver++, 1500); onDestroy(() => clearInterval(iv)); }
  const rec = $derived.by(() => { void ver; return RS.get<AbcRec>(abcRecPath(base)); });
  const st = $derived(abcStep(rec));
  const passed = $derived(st.kind === 'done');
  const t = $derived.by(() => { void ver; return tallyOf(S, cls); });
  // 반 합은 교사 기기가 적음 → 내가 방금 통과했는데 아직 안 셌으면 +1
  const fr = $derived(frameOf(t.n, passed && (t.at || 0) < (st.kind === 'done' ? st.at : 0) ? t.pass + 1 : t.pass, !!t.s));
  const notch = $derived(fr.target ? Math.floor(Math.min(1, fr.pass / fr.target) * 10) : 0);
  let view = $state<'main' | 'energy' | 'practice' | 'mock'>(untrack(() => (kind === 'energy' ? 'energy' : 'main'))), mine = $state(false), got = $state('');
  $effect(() => { const k = kind; untrack(() => { view = k === 'energy' ? 'energy' : 'main'; }); });
  // 💎 통과 보상 = 처음 한 번 (log gate_pass · 내 지갑 칸을 받은 뒤)
  let paid = false;
  $effect(() => { if (!passed || paid || !cls || !num) return; paid = true; untrack(() => {
    const go = () => { const r = payPass(RS, cls, num, S.now()); if (r.gem || r.xp) { got = `💎 +${r.gem} · EXP +${r.xp}`; sfx('finish', 0.6); } };
    const need = [`gem/${cls}/${num}`, `xp/${cls}/${num}`];
    if (need.every((p) => isReady(RS, p))) go(); else void whenReady(RS, need, 60000).then((ok) => { if (ok) go(); else paid = false; });
  }); });
</script>

{#if view === 'energy'}
  <GateEnergy {S} me={M.me} save={M.save} {uid} {num} {cls} noBack={kind === 'energy'} onclose={() => (view = 'main')} />
{:else if view === 'mock'}
  <MockExam S={RS} packs={PACKS} reach={cls ? doneNo(S, cls) : 99} base={b ? base : null} me={M.me} save={M.save} onclose={() => (view = 'main')} onreview={() => (view = 'main')} />
{:else if kind === 'door'}
  <div class="gp door" data-k="gate-door">
    {#key opened}<div class="big"><GateArt v={{ n: fr.total, placed: fr.placed, full: fr.full, e: t.e, open: opened ? 1 : 0 }} anim={false} crop={[380, 0, 616, 768]} /></div>{/key}
    <b class="h">{opened ? '🌀 차원문이 열렸어요' : '🌀 곧 문이 열려요'}</b>
    <p class="sub">{opened ? '무지의 그림자와 먼저 겨뤄 봐요 · 📄 모의전 · 성적 아님 · 내 기록만' : 'TV 를 봐요 · 🧙 현자가 문을 열어요'}</p>
  </div>
  {#if opened}<BottomAction text="🌀 차원문으로 들어가기" mainLabel="차원문으로 들어가기" onmain={() => { if (code) markEnter(S, code, uid); view = 'mock'; }} />{:else}<BottomAction text="⏳ 문이 열리기를 기다려요" why="선생님이 「🌀 문 열기」를 누르면 열려요" />{/if}
{:else if view === 'practice'}
  <AbcSheet S={RS} {base} {cls} inline live practice onclose={() => (view = 'main')} onsubmit={() => addPractice(RS, base)} />
{:else if !passed}
  <AbcSheet S={RS} {base} {cls} inline live onclose={() => {}} onsubmit={() => ver++} />
{:else}
  <div class="gp" data-k="gate-pass">
    <p class="score">7 / 7 · 통과!</p>
    <div class="art"><GateArt v={{ n: fr.total, placed: fr.placed, full: fr.full, e: t.e }} anim={false} crop={[380, 0, 616, 768]} /></div>
    <p class="stone">{GATE_TXT.stone}</p>
    {#if got}<p class="got" data-k="gate-got">{got}</p>{/if}
    <button type="button" class="frame" data-k="gate-frame" onclick={() => (mine = true)}>
      <span class="notch" aria-hidden="true">{#each Array(10) as _, i (i)}<i class:on={i < notch}></i>{/each}</span>
      <span>우리 반 뼈대 <b data-k="gate-frame-n">{Math.min(fr.pass, fr.target)}</b> / {fr.target}명{fr.full ? ' · 완성' : ''}</span>
    </button>
    <button type="button" class="sub2" data-k="gate-practice" onclick={() => (view = 'practice')}>{GATE_TXT.practice}</button>
  </div>
  <BottomAction text={GATE_TXT.toEnergy} mainLabel="에너지 모으러 가기" onmain={() => (view = 'energy')} />
{/if}
{#if mine}<GateMine {S} {RS} {base} {cls} onclose={() => (mine = false)} />{/if}

<style>
  .gp { display: grid; gap: 12px; justify-items: center; padding: 12px 4px 120px; text-align: center; }
  .score { margin: 0; font: 900 30px var(--font); color: #ffd25a; }
  .art { width: 150px; height: 187px; border-radius: 12px; overflow: hidden; background: #07060c; box-shadow: 0 0 0 2px #6a5aa8; }
  .big { width: 200px; height: 249px; border-radius: 12px; overflow: hidden; background: #07060c; box-shadow: 0 0 22px rgba(70, 190, 255, 0.5); }
  .stone { margin: 0; font: 800 17px var(--font); }
  .got { margin: 0; font: 800 15px var(--font); color: var(--gem, #6cc6ff); }
  .frame { width: 100%; display: grid; gap: 6px; padding: 10px 12px; border-radius: 12px; border: 0; background: var(--surface); color: var(--text); font: 700 15px var(--font); }
  .frame b { color: var(--accent); font-size: 18px; }
  .notch { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 4px; } .notch i { height: 10px; border-radius: 3px; background: var(--surface-2); } .notch i.on { background: #c98a5a; }
  .sub2 { min-height: 48px; width: 100%; border-radius: 12px; border: 0; background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .h { font: 900 24px var(--font); color: #9fe6ff; } .sub { margin: 0; color: var(--text-2); }
</style>
