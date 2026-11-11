<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf } from '../../engine/input';
  import { bossItem, bossState, bossTries } from '../../raid/raid';
  import { bossSubmit } from '../../raid/actions';
  import QItem from './QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Hearts from '../battle/Hearts.svelte';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import { penLine, stripNo } from '../../engine/input';
  import { swing } from '../battle/fx.svelte';

  // 👑 형성평가 = 문항 하나씩 한 장 (#99 ① · 옛 문제 창 없앰 · 점수 · 재도전 규칙은 정식 그대로)
  //   문항마다 첫 시도 = 학습지 · 틀리면 생각 시간 뒤 숫자 바뀐 문제 · 기회 meta.bossTries · 맞히면 도달 = 보스 1 데미지
  //   보스를 이긴 뒤에도 남은 문항은 계속 풀 수 있음 (정식 bossView 와 같음)
  const { S, L, R, code, uid, now, locked }: { S: Store; L: LessonPack; R: Room; code: string; uid: string; now: number; locked: boolean } = $props();
  const st = $derived(bossState(L, R, uid));
  const firstOpen = (s: typeof st) => { const k = s.findIndex((x) => !x.ok && x.left > 0); return k < 0 ? 0 : k; };
  let cur = $state(-1);
  $effect(() => { if (cur < 0 && st.length) cur = firstOpen(st); });
  const s = $derived(st[cur]);
  const a = $derived(s?.next ?? 0);
  const q = $derived(cur >= 0 ? bossItem(L, R, uid, cur, a) : null);
  const key = $derived(`${cur}|${a}`);
  let given = $state<Given>(null);
  let formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; given = q ? emptyOf(q) : null; } });
  let thinkUntil = $state(0);
  let toast = $state('');
  const thinkLeft = $derived(Math.max(0, Math.ceil((thinkUntil - now) / 1000)));
  const lastSol = $derived(s && !s.ok && s.left <= 0 ? bossTries(L, R, uid).filter((t) => t.i === cur).pop()?.q?.solution : '');
  // 🧾 답안 줄 = 문항 하나 = 칸 하나 (일반 몬스터 · 소레이드와 같은 모양)
  const cells = $derived.by((): Cell[] => st.map((x, i) => {
    if (x.ok) return { text: '도달', state: 'ok' };
    if (x.n > 0 && x.left <= 0) return { text: '📖 해설', state: 'oldbad' };
    if (i === cur && q) { const l = penLine(q, given, 0); return { text: l ? stripNo(l) : x.n ? '다시' : null, state: x.n ? 'oldbad' : l ? 'filled' : 'empty' }; }
    return { text: x.n ? '다시' : null, state: x.n ? 'oldbad' : 'empty' };
  }));
  function send() {
    if (!q || !s || locked || thinkLeft > 0 || !filled(q, given)) return;
    const i = cur;
    if (!bossSubmit(S, L, code, uid, i, finalOf(q, given))) return;
    const s2 = bossState(L, S.get<Room>(`rooms/${code}`) as Room, uid);
    const me = s2[i];
    swing(!!me?.ok);
    if (me?.ok) { toast = `✔ ${i + 1}번 도달! 보스에게 데미지`; const nx = s2.findIndex((x, k) => k > i && !x.ok && x.left > 0); cur = nx >= 0 ? nx : firstOpen(s2); }
    else { toast = me && me.left > 0 ? `✘ ${i + 1}번은 아직… 🤔 ${R.meta.think}초 생각하고 숫자가 바뀐 문제로 다시! (기회 ${me.left})` : `✘ ${i + 1}번 기회를 모두 썼어요 — 해설을 보며 학습지에 정리해요`; if (R.meta.think > 0) thinkUntil = Date.now() + R.meta.think * 1000; }
  }
</script>

{#if toast}<p class="toast" role="status">{toast}</p>{/if}
{#if s && q}
  <AnswerRow {cells} {cur} label={(i) => `${i + 1}번`} onpick={(i) => { cur = i; toast = ''; }} />
  {#if !s.ok && s.n > 0 && s.left > 0}<div class="bad" role="status"><b>{cur + 1}번이 아직이에요</b><span>숫자가 바뀐 문제로 다시 · 공격 단추의 하트가 하나 줄었어요</span></div>{/if}
  <div class="bcard" class:badline={!s.ok && s.n > 0 && s.left > 0}>
    <div class="head"><span class="lab acc">형성평가 {cur + 1}번 · {a === 0 ? '첫 시도' : `재도전 ${a} / ${R.meta.bossTries - 1}`}</span></div>
    {#if s.ok}
      <div class="okline"><span class="ic" aria-label="맞음">✔</span><span><b>{cur + 1}번 도달 {s.first ? '(첫 시도)' : ''}</b><span>보스에게 1 데미지</span></span></div>
    {:else if s.left <= 0}
      <p class="muted">📖 기회를 모두 썼어요 — {lastSol || '해설을 보며 학습지에 정리해요'}</p>
    {:else}
      {#key key}<QItem {q} i={cur} value={given} disabled={locked} runeLen={4} showNo={false} onchange={(v) => (given = v)} />{/key}
    {/if}
  </div>
  {#if !s.ok && s.left > 0}
    <BottomAction disabled={locked || thinkLeft > 0 || !filled(q, given)} why={thinkLeft > 0 ? `🤔 ${thinkLeft}초 — 학습지에서 다시 살펴봐요` : !filled(q, given) && !locked ? '답을 고르면 낼 수 있어요' : ''} onmain={send} mainLabel="{cur + 1}번 내기 (도전 기회 {s.left}번)">
      {#snippet main()}<span>{cur + 1}번 공격</span><Hearts total={R.meta.bossTries} left={s.left} />{/snippet}
    </BottomAction>
  {/if}
{/if}
