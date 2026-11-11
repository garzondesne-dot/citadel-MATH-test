<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { itemsFor, plainRecord } from '../../raid/raid';
  import type { Room as RoomT } from '../../model/types';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import { fx, swing } from '../battle/fx.svelte';
  import { onDestroy } from 'svelte';
  import { submit } from '../../raid/actions';
  import QItem from './QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Hearts from '../battle/Hearts.svelte';

  // 📝 일반 몬스터 카드 (②B · ③ 틀렸을 때 · ⑥ 퍼펙트 · 규칙 = 정식 fightForm v3)
  //   카드 맨 위 「문제 n · 소문제 k / m」 · 한 장에 소문제 하나 · 다 채우면 「공격」(하트 = 남은 기회)
  //   틀림 → 같은 문제 · 지난 답 채움 · 카드 위 한 줄 · 생각 시간 / 퍼펙트 → ✔ 카드 + 보조 줄(힐 · 묶기 · 진필살기 = 자리만)
  const { S, L, R, code, mid, uid, now, locked, title }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string } = $props();
  const rec = $derived(plainRecord(L, R, mid, uid));
  const attempt = $derived(rec.nextAttempt);
  const items = $derived(itemsFor(L, R, mid, uid, attempt));
  const key = $derived(`${mid}|${attempt}`);
  const last = $derived(rec.tries[rec.tries.length - 1] ?? null);
  const lastItems = $derived(last ? itemsFor(L, R, mid, uid, last.attempt) : []);
  let given = $state<Given[]>([]);
  let cur = $state(0);
  let formKey = '';
  let practice = $state(false); // 퍼펙트 뒤 「연습 공격」을 눌러 새 숫자 카드를 보는 중
  let thinkUntil = $state(0);
  let seenTry: number | null = null;
  $effect(() => {
    if (key === formKey) return;
    formKey = key;
    const same = !!last && (!rec.perfect || rec.fix) && Array.isArray(last.given) && last.given.length === items.length;
    given = items.map((q, i) => (same && last && last.given[i] != null ? JSON.parse(JSON.stringify(last.given[i])) : emptyOf(q)));
    const firstWrong = same && last ? last.marks.findIndex((m) => !m) : -1;
    cur = firstWrong >= 0 ? firstWrong : 0;
  });
  $effect(() => {
    const t = rec.tries.length - 1;
    if (t === seenTry) return;
    const first = seenTry === null; seenTry = t;
    const l = rec.tries[t];
    if (!first && l && l.correct < l.total && R.meta.think > 0) thinkUntil = Date.now() + R.meta.think * 1000;
    if (!first && l && l.correct === l.total) practice = false;
  });
  const wrongIdx = $derived(last && !(rec.perfect && !rec.fix) ? last.marks.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0) : []);
  const sameQ = $derived(attempt > 0 && (!rec.perfect || rec.fix));
  const allFilled = $derived(items.length > 0 && items.every((q, i) => filled(q, given[i] ?? null)));
  const thinkLeft = $derived(Math.max(0, Math.ceil((thinkUntil - now) / 1000)));
  const q = $derived(items[cur]);
  const showDone = $derived(rec.perfect && !rec.fix && !practice);
  const doneCells = $derived.by((): Cell[] => (last ? lastItems.map((x, i) => { const l = penLine(x, (last.given || [])[i] ?? null, i); return { text: l ? stripNo(l) : null, state: last.marks[i] ? 'ok' : 'bad' }; }) : []));
  const spent = $derived(rec.submitted && !rec.canRetry && !rec.perfect);
  const nextUnfilled = $derived(items.findIndex((x, i) => i !== cur && !filled(x, given[i] ?? null)));
  const no = $derived((/문제 \d+/.exec(title) || [title])[0]);
  function onMain() {
    if (locked || thinkLeft > 0) return;
    if (!allFilled) { if (q && filled(q, given[cur] ?? null) && nextUnfilled >= 0) cur = nextUnfilled; return; }
    const texts = items.map((x, i) => { const l = penLine(x, given[i] ?? null, i); return l ? stripNo(l) : null; }), oldBest = rec.best;
    if (!submit(S, L, code, mid, uid, items.map((x, i) => finalOf(x, given[i] ?? null)))) return;
    const r2 = plainRecord(L, S.get<RoomT>(`rooms/${code}`) as RoomT, mid, uid), l2 = r2.tries[r2.tries.length - 1];
    if (!l2) return;
    startReveal(texts, l2.marks, Math.max(0, r2.best - oldBest));
  }
  // ⚔ 채점 기믹 (#108 ②): 왼쪽부터 칸당 0.25초(최대 1초) · ✔ = 초록 + 베기 + 체력 −1 / ✘ = 빨강 + 헛스윙 · 다 맞히면 줄 금빛 반짝 · 화면을 누르면 바로 결과
  //   채점 · 데미지 · 기록은 이미 끝남(한 번에 냄) — 결과를 순서대로 보여 줄 뿐
  let reveal = $state<{ texts: (string | null)[]; marks: boolean[]; t0: number; step: number; hold: number; shown: number; done: boolean; flash: boolean } | null>(null);
  let rtimer: ReturnType<typeof setInterval> | null = null;
  const skip = () => { if (reveal) reveal.t0 = Date.now() - reveal.step * (reveal.marks.length + 2); };
  function startReveal(texts: (string | null)[], marks: boolean[], hold: number) {
    const step = Math.min(250, 1000 / Math.max(1, marks.length));
    reveal = { texts, marks, t0: Date.now(), step, hold, shown: 0, done: false, flash: false };
    fx.hold = hold;
    if (rtimer) clearInterval(rtimer);
    addEventListener('pointerdown', skip, true);
    rtimer = setInterval(tickReveal, 40);
  }
  function tickReveal() {
    const r = reveal; if (!r) return;
    const n = r.marks.length, want = Math.min(n, Math.floor((Date.now() - r.t0) / r.step) + 1);
    while (r.shown < want) { const ok = !!r.marks[r.shown]; swing(ok); if (ok && fx.hold > 0) fx.hold -= 1; r.shown += 1; }
    if (r.shown >= n && !r.done) { r.done = true; fx.hold = 0; r.flash = r.marks.every(Boolean); setTimeout(endReveal, r.flash ? 650 : 350); }
  }
  function endReveal() { reveal = null; fx.hold = 0; if (rtimer) clearInterval(rtimer); rtimer = null; removeEventListener('pointerdown', skip, true); }
  onDestroy(endReveal);
  const cells = $derived.by((): Cell[] => {
    if (reveal) return reveal.texts.map((t, i) => ({ text: t, state: i < reveal!.shown ? (reveal!.marks[i] ? 'ok' : 'bad') : 'filled' }));
    return items.map((x, i) => {
      const l = penLine(x, given[i] ?? null, i), text = l ? stripNo(l) : null;
      if (sameQ && last) return { text, state: last.marks[i] ? 'ok' : 'oldbad' };
      return { text, state: text ? 'filled' : 'empty' };
    });
  });
  const why = $derived(reveal ? '채점 중… (화면을 누르면 바로 결과)' : locked ? '' : thinkLeft > 0 ? `🤔 ${thinkLeft}초 — 학습지에서 다시 살펴봐요` : !allFilled && q && !filled(q, given[cur] ?? null) ? '답을 고르면 다음으로' : '');
</script>

{#if showDone}
  <AnswerRow cells={reveal ? cells : doneCells} flash={!!reveal?.flash} />
  <div class="bcard">
    <div class="okline"><span class="ic" aria-label="맞음">✔</span><span><b>{no} · {items.length}문제 모두 맞혔어요</b><span>데미지 {rec.best} · 남은 기회는 연습</span></span></div>
    <span class="lab">남은 시간에 할 수 있는 것</span>
    <div class="aux3"><button class="btn2" disabled>친구 힐</button><button class="btn2" disabled>묶기</button><button class="btn2" disabled>진필살기</button></div>
    <p class="muted">힐 · 묶기 · 진필살기는 다음 판에서 열려요</p>
  </div>
  <BottomAction disabled={!rec.canRetry || !!reveal} why={reveal ? '채점 중… (화면을 누르면 바로 결과)' : rec.canRetry ? '숫자가 바뀐 새 문제 · 데미지는 그대로' : '연습 기회를 다 썼어요'} onmain={() => (practice = true)} mainLabel="연습 공격 (도전 기회 {rec.left}번)">
    {#snippet main()}<span>🔥 연습 공격</span><Hearts total={rec.slots} left={rec.left} />{/snippet}
  </BottomAction>
{:else if spent}
  <AnswerRow cells={reveal ? cells : doneCells} />
  <div class="bcard">
    <span class="lab acc">{no} · 기회를 다 썼어요</span>
    <p class="muted">벌은 없어요 — 학습지에 풀이를 정리해요. 데미지 {rec.best}</p>
    <div class="story"><b>📜 나의 답안</b><ol>{#each lastItems as x, i (i)}{@const l = penLine(x, (last?.given || [])[i] ?? null, i)}<li>{last?.marks[i] ? '✔' : '✘'} {l ? stripNo(l) : '(빈 칸)'}</li>{/each}</ol></div>
  </div>
{:else if q}
  {#if !reveal && sameQ && wrongIdx.length}
    <div class="bad" role="status"><b>소문제 {wrongIdx.map((i) => i + 1).join(', ')} 이 틀렸어요</b><span>같은 문제로 다시 도전 · 공격 단추의 하트가 하나 줄었어요</span></div>
  {:else if attempt > 0 && rec.perfect}
    <div class="bad" role="status" style="background:var(--surface-2)"><b>🆕 숫자가 바뀐 새 문제 (연습)</b><span>맞혀도 데미지는 그대로 · 틀리면 하트 −1</span></div>
  {/if}
  <AnswerRow {cells} cur={reveal ? -1 : cur} flash={!!reveal?.flash} onpick={reveal ? undefined : (i) => (cur = i)} />
  <div class="bcard" class:badline={!reveal && sameQ && wrongIdx.includes(cur)}>
    <div class="head"><span class="lab acc">{no} · 소문제 {cur + 1} / {items.length}{sameQ && wrongIdx.includes(cur) ? ' · 다시' : ''}</span></div>
    {#if L.monsters[mid]?.noteText}<p class="muted">💡 {L.monsters[mid]?.noteText}</p>{/if}
    {#key `${key}|${cur}`}
      <QItem {q} i={cur} value={given[cur] ?? null} disabled={locked} showNo={false} ansLabel={sameQ && wrongIdx.includes(cur) ? '지난 답' : '내 답'} onchange={(v) => (given[cur] = v)} />
    {/key}
  </div>
  <BottomAction disabled={!!reveal || locked || thinkLeft > 0 || (!allFilled && !(q && filled(q, given[cur] ?? null) && nextUnfilled >= 0))} {why} onmain={onMain} mainLabel={allFilled ? `공격 (도전 기회 ${rec.submitted ? rec.left : rec.slots}번)` : '다음 소문제'}>
    {#snippet main()}
      {#if allFilled}<span>{sameQ ? '다시 공격' : rec.perfect ? '연습 공격' : '공격'}</span><Hearts total={rec.slots} left={rec.submitted ? rec.left : rec.slots} />
      {:else}<span>다음 소문제 ▶</span>{/if}
    {/snippet}
  </BottomAction>
{/if}

<style>
  .aux3 { display: flex; gap: var(--s2); }
  .aux3 .btn2 { flex: 1; min-height: var(--tap); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .aux3 .btn2:disabled { opacity: 0.4; }
</style>
