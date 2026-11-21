<script lang="ts">
  // 👩‍🏫 #55 체험판 게시판 던전 (📜 2026-11-21 선생님 고름 · CLAUDE.md 체험판 규칙 「📋 게시판 던전 = 봇 3명 · 기록 없음 (원래 수업은 친구 · 서버 기록 · 반 공적)」)
  //   체험판 차시 중 게시판 문제가 있는 차시 · 내 용사 + 봇 3 · 서버 안 닿음 · 공적 · 💎 · ⭐ 저장 없음 · 결과 💎 = 「체험판 · 받지 않음」
  import { untrack } from 'svelte';
  import type { LessonPack } from '../../../model/types';
  import { HEROES, heroOf, ladder } from '../../../model/hero';
  import { atbLessons } from '../../../board/atb/lessons';
  import { newBattle, type State } from '../../../board/atb/engine';
  import { newBot } from '../../../board/atb/bots';
  import { statsOf, tierOf } from '../../../board/atb/heroes';
  import { bossOf } from '../../../board/atb/tune';
  import { atbResultFor, type AtbEnd } from '../../../board/atb/net';
  import { levelOf } from '../../../school/reward';
  import AtbBattle from './AtbBattle.svelte';
  import Land from './Land.svelte';
  import AtbResult from './AtbResult.svelte';
  import { bossArt } from './rdunBoss';

  const { packs, hero, xp = 0, enh = 0, fx0 = '', nick = '체험 용사', start = null, onclose }: {
    /** 체험판 차시 팩 (trialPacks) */ packs: LessonPack[]; hero: number; xp?: number; enh?: number; /** 장착 스킬 (없으면 사다리 첫 칸) */ fx0?: string; nick?: string; /** #66-8 게시판에서 고른 차시 = 바로 전투 · 나가면 onclose(게시판으로) */ start?: LessonPack | null; onclose: () => void;
  } = $props();
  const lessons = $derived(atbLessons(packs, new Set()));
  let L = $state<LessonPack | null>(null);
  let S = $state<State | null>(null), bots = $state<ReturnType<typeof newBot>[]>([]), bg = $state(''), end = $state<AtbEnd | null>(null), runKey = $state(0);
  const MATES = ['발도르', '루멘', '누아', '로안'];
  const fxOf = (id: number) => (id === hero && fx0 ? fx0 : (ladder(id)[0] as string));
  const labels = $derived<Record<number, string>>({ 0: '나', 1: '🤖 모험가 A', 2: '🤖 모험가 B', 3: '🤖 모험가 C' });
  function begin(p: LessonPack) {
    L = p; end = null;
    const mates = MATES.map((n) => HEROES.find((h) => h.name === n)?.id ?? 0).filter((id) => id !== hero).slice(0, 3);
    const lv = levelOf(xp), ids = [hero, ...mates];
    const party = ids.map((id, i) => statsOf({ hero: id, lv: i ? 1 : lv, enh: i ? 0 : enh, tier: i ? 1 : tierOf(id, fxOf(id)), name: String(heroOf(id).name) }));
    const art = bossArt(bossOf(p.no), 'normal', p.theme); bg = art.bg;
    const seed = 1 + Math.floor(Math.random() * 9999);
    S = newBattle({ boss: art, diff: 'normal', party, seed });
    bots = S.heroes.map((h) => newBot(p, h.id, 'normal', seed)).filter((b) => b.who !== 0);
    runKey++;
  }
  function ended(B: State) { end = atbResultFor(B, 0, { prevStars: 0 }); }
  $effect(() => { if (start && !S && !end) untrack(() => begin(start)); });
  const out = () => { S = null; end = null; if (start) onclose(); };
</script>

{#if S && L}<Land>{#if !end}
  {#key runKey}<AtbBattle {L} {S} me={0} {bots} seed={`trial${runKey}`} fx={Object.fromEntries(S.heroes.map((h) => [h.id, fxOf(h.s.hero)]))} {bg} {labels} whoNames={{ 0: nick }} onend={ended} />{/key}
{:else}
  <AtbResult {S} no={L.no} me={0} mastery={0} practice={false} trial {labels} {end} onagain={() => begin(L!)} onswap={out} onexit={out} />
{/if}</Land>
{:else}
  <div class="tb" role="dialog" aria-label="게시판 던전 체험" data-k="atb-trial">
    <div class="bar"><button type="button" class="back" aria-label="캠프로" onclick={onclose}>‹</button><b>📋 게시판 던전 · 체험</b><span></span></div>
    <div class="mid">
      <p class="lead">{nick} + 🤖 봇 3명 · 기록 · 💎 · 공적은 남지 않아요</p>
      {#each lessons as p (p.id)}
        <button type="button" class="card" data-trial-no={p.no} onclick={() => begin(p)}><b>⚔ {p.no}차시</b><small>{p.title.split(' · ')[0]}</small></button>
      {:else}
        <p class="lead">게시판 문제가 있는 체험 차시가 없어요</p>
      {/each}
      <p class="note">원래 수업은 친구들과 함께 · 서버 기록 · 반 공적이 쌓여요</p>
    </div>
  </div>
{/if}

<style>
  .tb { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; background: var(--bg, #0f1115); color: var(--text, #f2f3f5); }
  .bar { display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; height: 56px; padding: 0 8px; }
  .bar b { text-align: center; font-size: 18px; }
  .back { width: 48px; height: 48px; border: 0; background: none; color: inherit; font-size: 28px; }
  .mid { flex: 1; overflow-y: auto; display: grid; align-content: start; gap: 12px; padding: 16px; max-width: 430px; width: 100%; margin: 0 auto; }
  .lead { margin: 0; font-size: 14px; color: var(--text-2, #b4b8c2); text-align: center; }
  .card { display: flex; flex-direction: column; gap: 4px; min-height: 72px; padding: 16px; border-radius: 12px; border: 0; background: var(--surface, #181b22); color: inherit; font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh, #000); }
  .card:active { transform: translateY(2px); box-shadow: none; }
  .card b { font-size: 18px; color: var(--accent, #f5b84a); } .card small { font-size: 14px; color: var(--text-2, #b4b8c2); }
  .note { margin: 8px 0 0; font-size: 13px; color: var(--text-3, #7c8190); text-align: center; }
</style>
