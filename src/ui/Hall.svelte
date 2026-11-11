<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { activeIds, monsterHp, record } from '../raid/raid';
  import { ensureRoom, resetRoom } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import Sprite from './Sprite.svelte';

  // 🖥 종합실 (탭 A) — 읽기만 · 정답 글자는 띄우지 않음(수업 규칙)
  const { S, L, code, mid }: { S: Store; L: LessonPack; code: string; mid: string } = $props();
  // 방 · 구독은 처음 받은 값으로 한 번만 (탭 하나 = 방 하나)
  const live = untrack(() => { ensureRoom(S, L, code); return liveRoom(S, code); });
  onDestroy(live.stop);

  const R = $derived(live.v.room);
  const hp = $derived(R ? monsterHp(L, R, mid, live.v.now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  const ids = $derived(R ? activeIds(R, live.v.now) : []);
  const mon = $derived(L.monsters[mid]);
  const studentUrl = $derived(`?role=student&room=${encodeURIComponent(code)}`);
</script>

<section class="hall">
  <h1>🖥 종합실 · {L.no}차시 {mon?.title}</h1>
  {#if R && hp && mon}
    <div class="stage" class:down>
      <Sprite ref={mon.sprite} pose={down ? 'down' : 'idle'} size={200} />
      {#if down}<p class="ko">💥 쓰러졌다!</p>{/if}
    </div>
    <div class="bar" aria-label="공동 체력">
      <div class="fill" style:width="{hp.max ? (hp.left / hp.max) * 100 : 0}%"></div>
      <span>{hp.left} / {hp.max}</span>
    </div>
    <p class="formula">체력 = ⌊인원 {ids.length || 1} × 소문제 {hp.items} × {hp.pct}%⌋ = {hp.max} · 데미지 {hp.dmg}</p>
    <ul class="who">
      {#each ids as u (u)}
        {@const rec = record(L, R, mid, u)}
        <li>{R.players?.[u]?.nick} · 데미지 {rec.best}/{rec.total} {rec.perfect ? '⭐' : ''}</li>
      {:else}
        <li class="empty">아직 학생 탭이 없어요 → <a href={studentUrl} target="_blank">학생 탭 열기</a></li>
      {/each}
    </ul>
    <p class="tools">
      <a href={studentUrl} target="_blank">➕ 학생 탭 하나 더</a>
      <button onclick={() => resetRoom(S, L, code)}>↻ 처음부터</button>
    </p>
  {/if}
</section>

<style>
  .hall { max-width: 640px; margin: 0 auto; text-align: center; }
  .stage { min-height: 220px; display: grid; place-items: center; }
  .stage.down :global(.sprite) { filter: grayscale(0.6); }
  .ko { font-size: 1.4rem; font-weight: 700; color: var(--accent); margin: 0; }
  .bar { position: relative; height: 28px; border-radius: 14px; background: var(--muted); overflow: hidden; }
  .fill { height: 100%; background: var(--hp); transition: width 0.4s; }
  .bar span { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 700; }
  .formula { color: var(--sub); font-size: 0.9rem; }
  .who { list-style: none; padding: 0; }
  .who li { padding: 4px 0; }
  .empty { color: var(--sub); }
  .tools { display: flex; gap: 12px; justify-content: center; align-items: center; }
</style>
