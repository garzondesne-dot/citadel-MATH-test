<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, bossRecord, chainRecord, healsReceived, isChain, plainRecord, petrify, ultUsed } from '../../raid/raid';
  import { spendEnergy, trueUlt } from '../../raid/actions';
  import { canTrue, cutin, ultBlast } from '../fx/attack';
  import { savedLook } from '../../store/me.svelte';
  import { HERO, heroUrl } from '../manifest';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Hearts from '../battle/Hearts.svelte';
  // ⚡ 다 맞힌 뒤 기술 카드 (📜 2026-11-13 밤 · 베타 v4 · 시안 ⑥ · 머리 🔨 하트 묶음 B · C)
  //   카드 3장(💚 힐 · ⛓ 묶기 · 🌟 진필살기 · 모두 ⚡1) → 아래 한 줄 = 고른 카드 설명 + 「그만하기」 → 노란 단추 = 「💚 힐 주고 🔥 재도전」
  //   ⚡ 1 쓰면 바로 🔥 재도전 판(숫자 바뀐 같은 문제 · 무료 · 데미지 0 · ❤ 그대로) → 그 판을 다 맞혀야 다음 ⚡ · ⚡ 0 = 끝
  //   🌟 = 첫 공격 퍼펙트 + 재도전 판 2개를 각각 한 번에 → 세 번째 ⚡ 에서만 켜짐 · 💚 파티 힐 없음 · 👑 형성평가 뒤 = 💚 · ⛓ 두 장(🌟 흐림)
  //   「그만하기」 = 재도전 판 닫고 기다리기 · 몬스터가 살아 있는 동안 「🔥 이어서」 · 남은 ⚡ 그대로
  const { S, L, R, code, mid, uid, now, onround, boss = false }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; onround: () => void; boss?: boolean } = $props();
  type RecLike = { tokLeft: number; canHeal: boolean; roundOpen?: boolean; rounds?: number; trueOk?: boolean };
  const rec = $derived((boss ? bossRecord(L, R, uid) : isChain(L, R, mid) ? chainRecord(L, R, mid, uid) : plainRecord(L, R, mid, uid)) as RecLike);
  type Sk = 'heal' | 'bind' | 'true';
  let sel = $state<Sk>('heal'), pick = $state(false), rest = $state(false), msg = $state('');
  const look = untrack(() => savedLook());
  const friends = $derived(activeIds(R, now).filter((u) => u !== uid && !R.players?.[u]?.teacher).map((u) => ({ u, nick: R.players?.[u]?.nick || u, full: healsReceived(R, mid, u, L) >= R.meta.healMax })));
  const trueOn = $derived(!boss && !!rec.trueOk && canTrue(look.fx, look.hero) && !ultUsed(R, mid, uid) && !petrify(R, mid));
  const trueWhy = $derived(boss ? '형성평가 뒤엔 못 써요' : !canTrue(look.fx, look.hero) ? '내 속성 Ⅳ 스킬을 끼우면' : petrify(R, mid) ? '이미 굳었어요' : ultUsed(R, mid, uid) ? '이 몬스터에선 썼어요' : '첫 공격 퍼펙트 + 재도전 판 2개를 한 번에 → 세 번째 ⚡');
  const CARDS: { k: Sk; ic: string; name: string; desc: string; main: string }[] = [
    { k: 'heal', ic: '💚', name: '힐', desc: '친구 한 명 ❤ +1 · 내 ❤ 는 그대로', main: '💚 힐 주고 🔥 재도전' },
    { k: 'bind', ic: '⛓', name: '묶기', desc: '몬스터 공격을 3초 늦춰요 · 반 전체', main: '⛓ 묶고 🔥 재도전' },
    { k: 'true', ic: '🌟', name: '진필살기', desc: '금빛 광역 · 🗿 석화 20초(그동안 맞히면 💎)', main: '🌟 쓰고 🔥 재도전' },
  ];
  const cur = $derived(CARDS.find((c) => c.k === sel)!);
  const can = (k: Sk) => rec.canHeal && (k === 'true' ? trueOn : k === 'heal' ? friends.some((f) => !f.full) : true);
  $effect(() => { if (!can(sel) && can('bind')) untrack(() => (sel = 'bind')); });
  async function useTrue() {
    const err = trueUlt(S, L, code, mid, uid, canTrue(look.fx, look.hero)); if (err) { msg = err; return; }
    await cutin(look.hero, look.fx, { gold: true, heroArt: (id) => `<i class="art hero" style="position:absolute;inset:0;background:url(${heroUrl(id)}) 0 0/${HERO.cols * 100}% ${HERO.rows * 100}% no-repeat;image-rendering:pixelated"></i>` });
    const sc = document.querySelector('.edge') as HTMLElement | null; if (sc) void ultBlast(sc, sc.querySelector('.mon'), look.fx);
    onround();
  }
  function spend(to: string | 'bind') { if (spendEnergy(S, L, code, mid, uid, to)) { pick = false; onround(); } else msg = '지금은 쓸 수 없어요'; }
  function act() { msg = ''; if (rec.roundOpen) { rest = false; onround(); return; } if (rest) { rest = false; return; } if (sel === 'heal') pick = true; else if (sel === 'bind') spend('bind'); else void useTrue(); }
</script>

{#if rec.roundOpen || rest}
  <div class="bcard sk">
    <span class="lab acc">{rec.roundOpen ? '🔥 재도전 판이 열려 있어요' : '⏸ 쉬는 중'}</span>
    <p class="muted">{rec.roundOpen ? '다 맞히면 다음 ⚡ 를 쓸 수 있어요 · 틀려도 ❤ 는 그대로' : `남은 ⚡ ${rec.tokLeft} 그대로 · 몬스터가 살아 있는 동안 언제든 이어서`}</p>
  </div>
  <BottomAction battle onmain={act} mainLabel="이어서">
    {#snippet main()}<span>🔥 이어서</span><Hearts mode="energy" left={rec.tokLeft} lock={!!rec.roundOpen} />{/snippet}
  </BottomAction>
{:else if rec.tokLeft > 0}
  <div class="bcard sk">
    <span class="lab acc">⚡ 기술 고르기 · 하나 쓰면 🔥 재도전 판</span>
    <div class="cards" role="radiogroup" aria-label="기술">
      {#each CARDS as c (c.k)}
        <button type="button" role="radio" class="card" class:on={sel === c.k} class:gold={c.k === 'true' && trueOn} aria-checked={sel === c.k} disabled={!can(c.k)} data-sk={c.k} onclick={() => (sel = c.k)}>
          <i>{c.ic}</i><b>{c.name}</b><small>⚡1</small>
        </button>
      {/each}
    </div>
    <div class="line"><span>{msg || (can(sel) ? cur.desc : sel === 'true' ? `🔒 ${trueWhy}` : sel === 'heal' ? '힐 받을 친구가 없어요' : '')}</span><button type="button" class="stop" onclick={() => (rest = true)}>그만하기</button></div>
  </div>
  <BottomAction battle disabled={!can(sel)} onmain={act} mainLabel={cur.main}>
    {#snippet main()}<span>{cur.main}</span><Hearts mode="energy" left={rec.tokLeft} />{/snippet}
  </BottomAction>
{:else}
  <div class="bcard sk"><span class="lab acc">⚡ 다 썼어요</span><p class="muted">🔥 재도전 판 {rec.rounds ?? 0}개 완성 · 다음 몬스터를 기다려요</p></div>
  <BottomAction battle text="✔ 다 했어요" why="데미지 · 기록은 그대로" />
{/if}
{#if pick}
  <Sheet onclose={() => (pick = false)} mainText="닫기">
    {#snippet title()}💚 누구에게 힐을 줄까요?{/snippet}
    <div class="fr">{#each friends as f (f.u)}<button type="button" class="btn2" disabled={f.full} onclick={() => spend(f.u)}>{f.nick}{f.full ? ' · 가득' : ''}</button>{:else}<p class="muted">같이 싸우는 친구가 아직 없어요</p>{/each}</div>
  </Sheet>
{/if}

<style>
  .sk { display: flex; flex-direction: column; gap: var(--s2); }
  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s2); }
  .card { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 84px; border-radius: 12px; border: 2px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: inherit; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); }
  .card:active { translate: 0 2px; box-shadow: none; }
  .card i { font-style: normal; font-size: 26px; } .card b { font-size: 16px; } .card small { font-size: 13px; color: var(--accent); font-weight: 700; }
  .card.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--surface-2)); }
  .card.gold:not(:disabled) { box-shadow: 0 0 12px rgba(255, 210, 90, 0.6); }
  .card:disabled { opacity: 0.4; box-shadow: none; }
  .line { display: flex; align-items: center; gap: var(--s2); min-height: 44px; font-size: 14px; color: var(--text-2); }
  .line span { flex: 1; min-width: 0; }
  .stop { flex: none; min-height: 44px; padding: 0 var(--s3); border: 0; background: none; color: var(--text-2); font: 700 14px var(--font); text-decoration: underline; }
  .muted { margin: 0; color: var(--text-3); font-size: 14px; }
  .fr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s2); }
  .fr .btn2 { min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); }
</style>
