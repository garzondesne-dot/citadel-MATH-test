<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Room, Step, Store } from '../../model/types';
  import GateArt from './GateArt.svelte';
  import { E_BASE, E_STAGES, GATE_TXT, doorName, doorOpenAt, doorShare, energyOf, enteredOf, frameOf, gateCard, gateOf, publishTally, tallyOf, type Tally } from '../../school/gate';
  import { GATE_ART } from '../manifest';
  import { sfx } from '../sound.svelte';
  import { activeIds } from '../../raid/raid';
  // 🌀 마왕성 차원문 · 교실 TV 장면 (📜 11/28 · 시안 0 = 평소 차시 던전 틀 그대로) — 위 막대 · 조작 막대는 TV.svelte 그대로 · 이 칸 = 전투 장면 자리 + 오른쪽 위 현황 카드(「제출」 자리) + 위 가운데 띠
  //   교사 로그인 PC(admin) = 학생 기록을 직접 셈 + 학생 폰용 반 합을 적음 · 아니면 교사 기기가 적은 반 합을 읽음 · 이름 없음
  //   도입 = 빈 터 + 현자 말 · 🧱 = 조각 날아옴 · ⚡ = 소용돌이 · 룬 · 테두리 빛 (마왕성 안 보임) · 🌀 = 「🌀 문 열기」 누르면 영상(있으면) → 열린 그림(마왕성 처음) + 몫 + 현자 말
  const { S, R, step, now, admin, cls }: { S: Store; R: Room; step: Step; now: number; admin: boolean; cls: string } = $props();
  const kind = $derived(gateOf(step));
  const t = $derived.by<Tally>(() => { void now; return admin ? publishTally(S, cls, kind === 'energy' || kind === 'door') : tallyOf(S, cls); });
  const fr = $derived(frameOf(t.n, t.pass, !!t.s || kind === 'energy' || kind === 'door'));
  const en = $derived(energyOf(t.e));
  const opened = $derived(doorOpenAt(R));
  let tick = $state(0); { const iv = setInterval(() => { if (kind === 'door' && opened) tick = Date.now(); }, 100); onDestroy(() => clearInterval(iv)); }
  let vidEnd = $state(false);
  const open = $derived(kind === 'door' && opened && (!GATE_ART.video || vidEnd) ? Math.max(0, Math.min(1, ((tick || Date.now()) - opened) / 2500)) : 0);
  const ids = $derived(activeIds(R, now));
  const card = $derived(R.state.rest ? null : gateCard(kind, t, enteredOf(R), ids.length));
  // 🧱 · ⚡ 늘어난 만큼 띠 (줄 서기 · 0.6초 간격 · 2초)
  let banner = $state<{ k: string; text: string } | null>(null), light = $state(0);
  const q: { text: string; k: string }[] = []; let qT: ReturnType<typeof setTimeout> | undefined, busy = false;
  const pump = () => { const x = q.shift(); if (!x) { busy = false; return; } busy = true; banner = x; qT = setTimeout(() => { banner = null; qT = setTimeout(pump, 600); }, 2000); };
  const push = (x: { text: string; k: string }) => { q.push(x); if (!busy) pump(); };
  onDestroy(() => clearTimeout(qT));
  $effect(() => { void kind; untrack(() => { q.length = 0; }); }); // 단계가 바뀌면 밀린 띠 버림
  let was: Tally | null = null;
  $effect(() => { const c = t, f = fr; untrack(() => {
    if (was && was.n === c.n) {
      const np = c.pass - was.pass; // 한꺼번에 많이 = 띠 하나로 (밀린 띠가 다음 단계까지 남지 않게)
      if (np > 3) push({ k: `p${c.pass}`, text: `🧱 돌 ${np}조각이 한꺼번에 올라갔다! · ${Math.min(c.pass, f.target)} / ${f.target}` });
      else for (let k = was.pass + 1; k <= c.pass; k++) push({ k: `p${k}`, text: GATE_TXT.pieceBanner(Math.min(k, f.target), f.target) });
      for (let k = 0; k < Math.min(np, 6); k++) setTimeout(() => sfx('dummy-hit', 0.7), k * 600);
      if (c.pass >= f.target && was.pass < f.target && f.target) push({ k: 'sage', text: '🧙 뼈대 완성! 빛이 꺼진 문을 ⚡ 에너지로 깨우자' });
      const ne = c.e - was.e;
      if (ne > 0) { push({ k: `e${c.e}`, text: ne > 1 ? `⚡ 성채 정답 ${ne}개! 빛이 문으로` : GATE_TXT.lightBanner }); for (let k = 0; k < Math.min(ne, 5); k++) setTimeout(() => light++, k * 350); }
      if (c.e > was.e) sfx('star', 0.5);
      if (was.e < E_BASE && c.e >= E_BASE) push({ k: 'base', text: '기준 달성! 문을 열 수 있다' });
    }
    was = { ...c };
  }); });
  const share = $derived(doorShare(t.e));
</script>

<div class="gtv" data-k="tv-gate" data-kind={kind ?? 'intro'} data-pass={t.pass} data-n={t.n} data-e={t.e}>
  <div class="art"><GateArt v={{ n: fr.total, placed: fr.placed, full: fr.full, e: t.e, open }} {light} label="{GATE_TXT.name} · 뼈대 {fr.pass} / {fr.target} · 에너지 {t.e}" /></div>
  {#if kind === 'door' && opened && GATE_ART.video && !vidEnd}<video class="vid" src={GATE_ART.video} autoplay muted playsinline onended={() => (vidEnd = true)}></video>{/if}
  {#if card}
    <div class="card" data-k="tv-gate-card"><small>{card.k}</small><b>{card.n}<span> / {card.m}</span></b><i class="bar" class:e={kind === 'energy'}><i style:width="{card.bar * 100}%"></i></i><em>{card.line}</em>
      {#if kind === 'energy'}<span class="marks" data-k="tv-gate-energy">{#each E_STAGES as x, k (x)}<u class:on={t.e >= x}>{['Ⅰ', 'Ⅱ', 'Ⅲ'][k]} {x}</u>{/each}</span>{/if}
    </div>
  {/if}
  {#if !kind && step.say}<p class="say" data-k="tv-gate-say">{step.say}</p>{/if}
  {#if kind === 'door' && open >= 1}
    <div class="split" data-k="tv-gate-share"><b>{doorName(cls, t.e)}</b><span>우리 반 {share.a}%{share.b ? ` + 🧙 현자 ${share.b}%` : ''}</span><i class="bar2"><i style:width="{share.a}%" class="us"></i><i style:width="{share.b}%" class="sg"></i></i></div>
    <p class="say" data-k="tv-gate-door">🧙 「{GATE_TXT.sage}」{#if en.stage >= 2}<br /><b>✨ {en.name}</b>{/if}</p>
  {/if}
  {#if banner && !R.state.rest}{#key banner.k}<p class="ban" class:e={banner.k.startsWith('e')} role="status" data-k="tv-gate-banner">{banner.text}</p>{/key}{/if}
</div>

<style>
  .gtv { position: absolute; inset: 0; overflow: hidden; background: #07060c; color: #fff; }
  .art { position: absolute; inset: 0; }
  .art :global(canvas) { width: 100%; height: 100%; object-fit: cover; }
  .vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  /* 오른쪽 위 = 평소 「제출」 카드 자리 (TV .nbox 와 같은 자리 · 같은 글자 크기) */
  .card { position: absolute; right: 1.5cqw; top: 11cqh; z-index: 3; width: 17cqw; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.78); border: 1px solid rgba(255, 255, 255, 0.18); padding: 1.2cqh 1.2cqw; display: flex; flex-direction: column; gap: 0.6cqh; }
  .card small { font-size: var(--tv-small); font-weight: 700; color: #d6d9e0; }
  .card b { font-size: var(--tv-big); line-height: 1; color: var(--accent); } .card b span { font-size: var(--tv-title); color: #fff; }
  .card em { font-style: normal; font-size: var(--tv-small); color: #ffd7a0; }
  .bar { display: block; height: 1.2cqh; border-radius: 99px; background: rgba(255, 255, 255, 0.15); overflow: hidden; } .bar > i { display: block; height: 100%; background: #c98a5a; transition: width 0.6s ease-out; } .bar.e > i { background: linear-gradient(90deg, #5a7dff, #b78cff); }
  .marks { display: flex; gap: 0.4cqw; } .marks u { flex: 1; text-decoration: none; text-align: center; font-size: var(--tv-small); border-radius: 99px; padding: 0.2cqh 0; background: rgba(255, 255, 255, 0.08); color: #9a95a8; } .marks u.on { background: rgba(255, 210, 90, 0.25); color: #ffd25a; }
  /* 위 가운데 = 남은 시간 아래 띠 */
  .ban { position: absolute; top: 8cqh; left: 50%; transform: translateX(-50%); z-index: 4; margin: 0; padding: 0.8cqh 1.6cqw; border-radius: 999px; background: rgba(42, 29, 12, 0.92); border: 2px solid #f5b84a; font: 900 var(--tv-title) var(--font); white-space: nowrap; color: #ffd25a; box-shadow: 0 0 2cqw rgba(245, 184, 74, 0.5); animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
  .ban.e { background: rgba(20, 30, 50, 0.9); border-color: #6cc6ff; color: #e6f6ff; box-shadow: 0 0 2cqw rgba(108, 198, 255, 0.6); }
  .say { position: absolute; left: 4cqw; right: 24cqw; bottom: 14cqh; z-index: 3; margin: 0; padding: 1.4cqh 1.4cqw; border-radius: 1.2cqh; background: rgba(8, 6, 14, 0.86); border: 2px solid #ffd25a; font: 700 var(--tv-body) / 1.55 var(--font); }
  .say b { color: #ffd25a; }
  .split { position: absolute; left: 50%; top: 14cqh; transform: translateX(-50%); z-index: 3; width: 40cqw; display: grid; gap: 0.6cqh; justify-items: center; text-align: center; font: 900 var(--tv-title) var(--font); text-shadow: 0 1px 2px #000; animation: pop 0.6s ease-out both; }
  .split b { color: #ffd25a; }
  .bar2 { display: flex; width: 100%; height: 2cqh; border-radius: 99px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.3); } .bar2 i { display: block; } .bar2 .us { background: linear-gradient(90deg, #ff8a3a, #ff3a6a); } .bar2 .sg { background: #ffd25a; }
  @keyframes pop { from { opacity: 0; transform: translate(-50%, -10px) scale(0.85); } }
  @media (prefers-reduced-motion: reduce) { .ban, .split { animation: none; } }
</style>
