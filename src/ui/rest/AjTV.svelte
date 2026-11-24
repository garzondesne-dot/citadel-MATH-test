<script lang="ts">
  import type { Room } from '../../model/types';
  import { isRight, qOf, standingsAj, syl, type Aj, type Ans } from '../../rest/ajae';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import SageHost from './SageHost.svelte';
  // 😆 아재 퀴즈 · 종합실 (📜 2026-11-24): 문제 · 빈칸 수 · 남은 시간 · 맞힌 순서 (정답 글자는 공개 때만)
  //   📜 11/24 시안(에셋 방 2 ajae-tv-*) = 진행자 현자(올드윈 · 지금 용사 그림 · 진행자 시트가 오면 바꿈) 왼쪽 · 문제 = 말풍선 · 아래 = 참가 용사 줄(맞힌 사람만 밝게)
  const { R, f, now, nameOf }: { R: Room; f: Aj; now: number; nameOf: (u: string) => string } = $props();
  const q = $derived(qOf(f.qs[f.n - 1] ?? 0));
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const ok = $derived.by(() => { if (!q) return []; const a = ((R as unknown as { fv?: Record<string, Record<string, Ans>> }).fv?.[f.rk]) || {}; return Object.entries(a).filter(([, v]) => v && typeof v === 'object' && isRight(q.no, v.a)).sort((x, y) => x[1].at - y[1].at).map(([u]) => u); });
  const st = $derived(standingsAj(f));
  const party = $derived(Object.keys(f.alive || {}).sort());
  // 📜 11/24 🔨 #18 ① 현자 = 왼쪽 아래 전용 자리(용사 키 2배 안) · 문제 · 빈칸 · 맞힌 순서 · 용사 줄은 현자 오른쪽 칸에만(28명 = 용사 작게) · 문제 중 현자 = 말하기(지팡이 빛 줄은 하얗게 번쩍여 보여 뺌)
  const hostH = 128;
  const heroK = $derived(party.length > 20 ? 0.6 : party.length > 12 ? 0.72 : 0.9);
</script>

<div class="atv" data-k="aj-tv" data-phase={f.phase}>
  <div class="top"><b>😆 아재 퀴즈 {f.round ?? 1}회{f.phase === 'q' || f.phase === 'show' ? ` · ${f.n} / ${f.qs.length}` : ''}</b>{#if f.phase === 'q' || f.phase === 'intro'}<span class="sec" data-k="aj-sec">{sec}초</span>{/if}</div>
  {#if f.phase === 'intro'}
    <span class="host"><SageHost act="talk" h={hostH} /></span>
    <p class="rule">폰에서 <b>글자를 골라</b> 정답을 완성해요 · 먼저 맞히면 <b>3 · 2 · 1점</b> · 틀려도 다시!</p>
  {:else if f.phase === 'end'}
    <span class="host"><SageHost act="laugh" h={hostH} /></span>
    <div class="podium">{#each st.slice(0, 5) as x (x.u)}<span class="pd r{x.rank}"><b>{x.rank}등</b>{nameOf(x.u)} · {x.pts}점</span>{/each}</div>
    {#if !st.length}<p class="rule">이번엔 맞힌 사람이 없어요</p>{/if}
  {:else if q}
    <span class="host"><SageHost act={f.phase === 'show' ? 'laugh' : 'talk'} h={hostH} /></span>
    <p class="q" data-k="aj-tv-q">{q.q}</p>
    {#if f.phase === 'show'}
      <p class="ans">{q.a}</p><p class="why">{q.why}</p>
      <p class="rule">{(f.last || []).map(([u, p], i) => `${i + 1}. ${nameOf(u)} +${p}`).join(' · ') || '맞힌 사람 없음'}</p>
    {:else}
      <div class="ajs">{#each syl(q.a) as _, k (k)}<span></span>{/each}</div>
      <ol class="ok" data-k="aj-tv-ok">{#each ok.slice(0, 8) as u, i (u)}<li class:pt={i < 3}>{i + 1}. {nameOf(u)}</li>{/each}</ol>
    {/if}
    {#if party.length}<div class="party" data-k="aj-party">{#each party as u (u)}<i class:lit={f.phase === 'show' || ok.includes(u)} title={nameOf(u)}><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={heroK} tv /></i>{/each}</div>{/if}
  {/if}
</div>

<style>
  /* 🔨 #18 ①: 왼쪽 21% = 현자 전용 칸(아래) · 나머지 = 위 → 아래로 문제 · 빈칸 · 맞힌 순서 · 용사 줄 (서로 안 겹침 · 아래 놀이 막대 자리 비움) */
  .atv { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; color: #fff; padding: 2cqh 3cqw 11cqh 21cqw; gap: 2cqh; text-align: center; container-type: size; }
  .top { display: flex; justify-content: center; align-items: baseline; gap: 2cqw; font: 900 5cqh var(--font); }
  .sec { color: var(--accent); font-variant-numeric: tabular-nums; }
  .rule { margin: auto 0; max-width: 90%; font: 800 4.4cqh/1.5 var(--font); }
  .q { position: relative; margin: 0; padding: 2cqh 3cqw; border-radius: 2.4cqh; background: #fff7e0; color: #2a1f14; box-shadow: 0 0.8cqh 0 rgba(0, 0, 0, 0.35); font: 900 9.5cqh/1.25 var(--font); max-width: 92%; }
  .q::before { content: ''; position: absolute; left: -2.4cqh; bottom: 2cqh; border: 1.4cqh solid transparent; border-right: 2.4cqh solid #fff7e0; border-left: 0; } /* 말풍선 꼬리 = 현자 쪽 */
  .host { position: absolute; left: 0; bottom: 11cqh; width: 21cqw; display: flex; justify-content: center; pointer-events: none; }
  .party { margin-top: auto; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-end; gap: 0 0.3cqw; max-height: 27cqh; overflow: hidden; }
  .party i { opacity: 0.35; filter: grayscale(0.7); transition: opacity 0.2s; } .party i.lit { opacity: 1; filter: none; }
  .ans { margin: 0; font: 900 11cqh var(--font); color: var(--accent); } .why { margin: 0; max-width: 92%; font: 700 4.4cqh var(--font); opacity: 0.9; }
  .ajs { display: flex; flex-direction: row; gap: 1.2cqw; } .ajs span { width: 11cqh; height: 12cqh; display: grid; place-items: center; border-radius: 1.2cqh; background: rgba(255, 255, 255, 0.14); font: 900 6cqh var(--font); }
  .ok { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6cqh 2cqw; max-width: 100%; max-height: 11cqh; overflow: hidden; font: 800 4.6cqh var(--font); } .ok .pt { color: var(--accent); }
  .podium { margin: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 2cqw; } .pd { display: grid; gap: 1cqh; padding: 2cqh 3cqw; border-radius: 2cqh; background: rgba(0, 0, 0, 0.5); font: 800 4cqh var(--font); } .pd b { font-size: 5.5cqh; color: var(--accent); }
</style>
