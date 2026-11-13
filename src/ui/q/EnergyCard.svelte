<script lang="ts" module>
  const charged = new Set<string>(); // 충전 연출 = 몬스터마다 한 번 (이 기기)
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, chainRecord, healsReceived, isChain, plainRecord } from '../../raid/raid';
  import { spendEnergy, trueUlt } from '../../raid/actions';
  import { perfStreak, petrify, ultUsed } from '../../raid/raid';
  import { canTrue, cutin, ultBlast } from '../fx/attack';
  import { savedLook } from '../../store/me.svelte';
  import { HERO, heroUrl } from '../manifest';
  import Sheet from '../battle/Sheet.svelte';
  // ⚡ 기력 (#152 · DECISIONS 「⚡ v1.0 도전 칸 → 기력」): 다 맞히면 안 쓴 도전 칸이 ⚡ 로 바뀌며 충전(칸당 0.2초 · 누르면 건너뜀)
  //   기력 시트 = ⛓ 묶기 ⚡1 · 💚 친구 힐 ⚡1(받는 친구 = 도전 칸 +1) · 🌟 필살기(조건) — 수치 · 규칙 · 기록 = 정식 heals 칸 그대로
  const { S, L, R, code, mid, uid, now }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number } = $props();
  const rec = $derived(isChain(L, R, mid) ? chainRecord(L, R, mid, uid) : plainRecord(L, R, mid, uid));
  const key = untrack(() => `${code}|${mid}|${uid}`);
  let shown = $state(charged.has(key) ? 99 : 0), pick = $state(false), msg = $state('');
  $effect(() => { if (rec.tokens > 0 && !charged.has(key)) { charged.add(key); const t = setInterval(() => { shown += 1; if (shown >= rec.tokens) clearInterval(t); }, 200); return () => clearInterval(t); } });
  const friends = $derived(activeIds(R, now).filter((u) => u !== uid && !R.players?.[u]?.teacher).map((u) => ({ u, nick: R.players?.[u]?.nick || u, full: healsReceived(R, mid, u, L) >= R.meta.healMax })));
  // 🌟 진필살기 (❓#3 ③B · 정식 student.js 560 · actions.js heal true): 3연속 퍼펙트(첫 시도 + 새 문제 2번) + 내 속성 Ⅳ + 남은 기력 · 이 몬스터가 안 굳었을 때 · 반 전체 한 번
  //   = 금빛 컷인 + 광역 → 🗿 석화 20초(공격 멈춤 · 그동안 맞히면 💎) + 아직 다 못 맞힌 친구 모두 도전 칸 +1
  const look = untrack(() => savedLook());
  const trueOk = $derived(perfStreak(rec as { tries: { correct: number; total: number }[] }) >= 3 && canTrue(look.fx, look.hero) && !ultUsed(R, mid, uid) && !petrify(R, mid) && rec.tokLeft > 0);
  const trueWhy = $derived(!canTrue(look.fx, look.hero) ? '내 속성 Ⅳ 스킬을 끼우면' : perfStreak(rec as { tries: { correct: number; total: number }[] }) < 3 ? '첫 시도 퍼펙트 + 새 문제 2번 연속 퍼펙트' : petrify(R, mid) ? '이미 굳었어요' : ultUsed(R, mid, uid) ? '이 몬스터에선 썼어요' : '');
  async function goTrue() {
    const err = trueUlt(S, L, code, mid, uid, canTrue(look.fx, look.hero)); if (err) { msg = err; return; }
    msg = '🌟 진필살기! 🗿 석화 20초 · 못 맞힌 친구 모두 도전 칸 +1';
    await cutin(look.hero, look.fx, { gold: true, heroArt: (id) => `<i class="art hero" style="position:absolute;inset:0;background:url(${heroUrl(id)}) 0 0/${HERO.cols * 100}% ${HERO.rows * 100}% no-repeat;image-rendering:pixelated"></i>` });
    const sc = document.querySelector('.edge') as HTMLElement | null; if (sc) void ultBlast(sc, sc.querySelector('.mon'), look.fx);
  }
  function go(to: string | 'bind') { if (spendEnergy(S, L, code, mid, uid, to)) { msg = to === 'bind' ? '⛓ 몬스터를 묶었어요! (공격 3초 늦춤)' : `💚 ${friends.find((f) => f.u === to)?.nick ?? ''} 에게 힐! (도전 칸 +1)`; pick = false; setTimeout(() => (msg = ''), 2000); } }
</script>

{#if rec.tokens > 0 && rec.chain}
  <button type="button" class="charge" class:done={shown >= rec.tokens} onclick={() => (shown = 99)} aria-label="기력 충전">
    <span class="bolts">{#each Array.from({ length: rec.tokens }) as _, i (i)}<i class:on={i < shown}>⚡</i>{/each}</span>
    <b>남은 도전 {rec.tokens} → ⚡ 기력 {rec.tokens} 충전!</b>
  </button>
{/if}
<div class="en">
  <span class="lab">⚡ 기력 <b>{rec.tokLeft}</b></span>
  <div class="acts">
    <button type="button" class="btn2" disabled={rec.tokLeft <= 0} onclick={() => go('bind')}>⛓ 묶기 <small>⚡1</small></button>
    <button type="button" class="btn2" disabled={rec.tokLeft <= 0 || !friends.some((f) => !f.full)} onclick={() => (pick = true)}>💚 친구 힐 <small>⚡1</small></button>
    <button type="button" class="btn2" class:gold={trueOk} disabled={!trueOk} title={trueWhy} onclick={goTrue}>🌟 진필살기 <small>{trueOk ? '⚡1' : '조건'}</small></button>
  </div>
  <p class="muted">{msg || (rec.tokLeft > 0 ? '묶기 = 몬스터 공격을 3초 늦춰요 · 힐 = 친구 도전 칸 +1' : rec.chain ? '기력을 다 썼어요' : '🔥 연습 공격으로 새 문제를 맞히면 ⚡ +1 (기회는 그대로)')}</p>
</div>
{#if pick}
  <Sheet onclose={() => (pick = false)} mainText="닫기">
    {#snippet title()}💚 누구에게 힐을 줄까요?{/snippet}
    <div class="fr">{#each friends as f (f.u)}<button type="button" class="btn2" disabled={f.full} onclick={() => go(f.u)}>{f.nick}{f.full ? ' · 가득' : ''}</button>{:else}<p class="muted">같이 싸우는 친구가 아직 없어요</p>{/each}</div>
  </Sheet>
{/if}

<style>
  .gold:not(:disabled) { border-color: #ffd25a; color: #ffd25a; box-shadow: 0 0 10px rgba(255, 210, 90, 0.6); }
  .charge { width: 100%; border: 1px solid var(--accent); background: var(--surface); color: var(--text); border-radius: var(--r); padding: var(--s2) var(--s3); display: flex; flex-direction: column; align-items: center; gap: var(--s1); font: inherit; }
  .bolts { display: flex; gap: 6px; } .bolts i { font-style: normal; font-size: 22px; opacity: 0.15; transform: translateY(6px); transition: opacity 0.18s, transform 0.18s; } .bolts i.on { opacity: 1; transform: none; }
  .en { display: flex; flex-direction: column; gap: var(--s2); }
  .lab { font-weight: 700; } .lab b { color: var(--accent); font-size: 20px; }
  .acts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s2); }
  .acts .btn2, .fr .btn2 { min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .btn2 small { display: block; font-size: 12px; color: var(--accent); } .btn2:disabled { opacity: 0.45; box-shadow: none; }
  .fr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s2); }
  .muted { margin: 0; color: var(--text-3); font-size: var(--fs-small); }
</style>
