<script lang="ts">
  import type { Given, LessonPack, Question, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { itemsFor, plainRecord, stone } from '../../raid/raid';
  import { petriGem } from '../../raid/actions';
  import type { Room as RoomT } from '../../model/types';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import GradeTable, { type GRow } from './GradeTable.svelte';
  import { shortQ } from './short';
  import { fx, heroAtk, type HeroAtk } from '../battle/fx.svelte';
  import { onDestroy } from 'svelte';
  import { submit } from '../../raid/actions';
  import QItem from './QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Slots, { markOf } from '../battle/Slots.svelte';
  import EnergyCard from './EnergyCard.svelte';
  import { healsTo } from '../../raid/raid';

  // 📝 일반 몬스터 카드 (②B · ③ 틀렸을 때 · ⑥ 퍼펙트 · 규칙 = 정식 fightForm v3)
  //   카드 맨 위 「문제 n · 소문제 k / m」 · 한 장에 소문제 하나 · 다 채우면 「공격」(하트 = 남은 기회)
  //   틀림 → 채점표 → 같은 문제 · ✔ 잠김 · ✘ 빈칸(재도전 v4) · 생각 시간 / 퍼펙트 → ✔ 카드 + 보조 줄(힐 · 묶기 · 진필살기 = 자리만)
  const { S, L, R, code, mid, uid, now, locked, title }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string } = $props();
  const rec = $derived(plainRecord(L, R, mid, uid));
  const healers = $derived([...new Set(healsTo(R, mid, uid, L).map((h) => R.players?.[h.from]?.nick || '친구'))].join(' · '));
  const marks = $derived(rec.tries.map((t) => markOf(t.correct, t.total))); // ▢ 도전 칸 = 낸 차례마다 ✔ · 노랑 · − (#152)
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
  let tableHold = $state(false); // 채점이 끝난 뒤 채점표를 그대로 보여 주는 중(「다음 틀린 문제 ▶」를 누르면 닫힘)
  let seenTry: number | null = null;
  // 🔁 재도전 v4 (#113 · hero-v2 DECISIONS 「🔁 재도전 v4 · 채점표」): 같은 문제 재도전 = ✔ 소문제는 지난 답 그대로 잠김 · ✘ 소문제는 빈칸으로 시작
  const sameQ = $derived(attempt > 0 && (!rec.perfect || rec.fix));
  const keepAt = (i: number) => sameQ && !!last?.marks[i];
  $effect(() => {
    if (key === formKey) return;
    formKey = key;
    const ok = sameQ && !!last && Array.isArray(last.given) && last.given.length === items.length;
    given = items.map((q, i) => (ok && last && last.marks[i] && last.given[i] != null ? JSON.parse(JSON.stringify(last.given[i])) : emptyOf(q)));
    const firstWrong = ok && last ? last.marks.findIndex((m) => !m) : -1;
    cur = firstWrong >= 0 ? firstWrong : 0;
  });
  $effect(() => {
    const t = rec.tries.length - 1;
    if (t === seenTry) return;
    const first = seenTry === null; seenTry = t;
    const l = rec.tries[t];
    if (!first && l && l.correct < l.total && R.meta.think > 0) thinkUntil = now + R.meta.think * 1000;
    if (!first && l && l.correct === l.total) practice = false;
  });
  const wrongIdx = $derived(sameQ && last ? last.marks.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0) : []);
  const fixing = $derived(sameQ && wrongIdx.length > 0);
  const allFilled = $derived(items.length > 0 && items.every((q, i) => filled(q, given[i] ?? null)));
  const thinkLeft = $derived(Math.max(0, Math.ceil((thinkUntil - now) / 1000)));
  const q = $derived(items[cur]);
  const showDone = $derived(rec.perfect && !rec.fix && !practice);
  const spent = $derived(rec.submitted && !rec.canRetry && !rec.perfect);
  const nextUnfilled = $derived(items.findIndex((x, i) => i !== cur && !filled(x, given[i] ?? null)));
  // 다음 틀린 문제: 지금 칸 다음의 ✘ 소문제(빈칸 먼저 · 한 바퀴)
  const nextWrong = $derived.by(() => {
    const ring = wrongIdx.map((_, k) => wrongIdx[(wrongIdx.indexOf(cur) + 1 + k) % wrongIdx.length] as number).filter((i) => i !== cur);
    return ring.find((i) => !filled(items[i] as Question, given[i] ?? null)) ?? ring[0] ?? -1;
  });
  const no = $derived((/문제 \d+/.exec(title) || [title])[0]);
  const textOf = (x: Question, g: Given | undefined, i: number) => { const l = penLine(x, g ?? null, i); return l ? stripNo(l) : null; };
  function onMain() {
    if (locked || thinkLeft > 0 || reveal) return;
    if (tableHold) { tableHold = false; const w = wrongIdx.find((i) => !filled(items[i] as Question, given[i] ?? null)); cur = w ?? wrongIdx[0] ?? 0; return; }
    if (!allFilled) {
      if (fixing) { if (nextWrong >= 0) cur = nextWrong; return; }
      if (q && filled(q, given[cur] ?? null) && nextUnfilled >= 0) cur = nextUnfilled; return;
    }
    const texts = items.map((x, i) => textOf(x, given[i], i)), oldBest = rec.best, keep = items.map((_, i) => keepAt(i)), qs = items.map(shortQ);
    if (!submit(S, L, code, mid, uid, items.map((x, i) => finalOf(x, given[i] ?? null)))) return;
    const r2 = plainRecord(L, S.get<RoomT>(`rooms/${code}`) as RoomT, mid, uid), l2 = r2.tries[r2.tries.length - 1];
    if (!l2) return;
    // ⚔ 정식 student.js: 도장(채점) 뒤 공격 한 번 · hits = 이번에 늘어난 데미지 · ⚡ 필살기 = 첫 시도에 모두 맞힘(장면이 내 속성 Ⅲ↑ 판정) · 🔥 끈기 = 두 번 넘게 틀린 뒤 다 맞힘 · 연습 = 데미지 0
    const gain = Math.max(0, r2.best - oldBest), all = l2.marks.length > 0 && l2.marks.every(Boolean);
    { const R2 = S.get<RoomT>(`rooms/${code}`) as RoomT, pt = stone(R2, mid); if (pt && S.now() < pt.until && gain > 0 && !r2.practice) petriGem(S, code, uid, pt.at, mid, gain); } // 🗿 석화 찬스 (정식 petriGem)
    pendAtk = { miss: !l2.marks.some((m, i) => m && !keep[i]) && !r2.practice, hits: r2.practice ? 1 : gain || l2.marks.filter(Boolean).length, ult: !r2.practice && l2.attempt === 0 && all, finish: !r2.practice && l2.attempt >= 2 && r2.perfectAt === l2.attempt, noDmg: r2.practice };
    startReveal(qs, texts, l2.marks, keep, gain);
  }
  let pendAtk: Omit<HeroAtk, 'id'> | null = null;
  // ⚔ 채점표 (#113 ①): 위에서부터 줄당 0.25초 · ✔ = 초록 + 베기 + 체력 −1 / ✘ = 빨강 + 헛스윙 · 다 맞히면 표 금빛 · 화면을 누르면 바로 결과
  //   재채점 = 고친 줄만 다시 뒤집힘(지난번 ✔ 줄은 처음부터 초록) · 채점 · 데미지 · 기록은 이미 끝남(한 번에 냄) — 결과를 순서대로 보여 줄 뿐
  const STEP = 250;
  let reveal = $state<{ qs: string[]; texts: (string | null)[]; marks: boolean[]; keep: boolean[]; order: number[]; t0: number; shown: number; done: boolean; flash: boolean } | null>(null);
  let rtimer: ReturnType<typeof setInterval> | null = null;
  const skip = () => { if (reveal) reveal.t0 = Date.now() - STEP * (reveal.order.length + 2); };
  function startReveal(qs: string[], texts: (string | null)[], marks: boolean[], keep: boolean[], hold: number) {
    const order = marks.map((_, i) => i).filter((i) => !keep[i]);
    reveal = { qs, texts, marks, keep, order, t0: Date.now(), shown: 0, done: false, flash: false };
    tableHold = false;
    fx.hold = hold;
    if (rtimer) clearInterval(rtimer);
    addEventListener('pointerdown', skip, true);
    rtimer = setInterval(tickReveal, 40);
  }
  function tickReveal() {
    const r = reveal; if (!r) return;
    const n = r.order.length, want = Math.min(n, Math.floor((Date.now() - r.t0) / STEP) + 1);
    while (r.shown < want) { const ok = !!r.marks[r.order[r.shown] as number]; if (ok && fx.hold > 0) fx.hold -= 1; r.shown += 1; }
    if (r.shown >= n && !r.done) { r.done = true; if (pendAtk) { heroAtk(pendAtk); pendAtk = null; } fx.hold = 0; r.flash = r.marks.every(Boolean); setTimeout(endReveal, r.flash ? 650 : 350); }
  }
  function endReveal() { if (reveal && !reveal.flash) tableHold = true; reveal = null; fx.hold = 0; if (rtimer) clearInterval(rtimer); rtimer = null; removeEventListener('pointerdown', skip, true); }
  onDestroy(() => { reveal = null; fx.hold = 0; if (rtimer) clearInterval(rtimer); removeEventListener('pointerdown', skip, true); });
  const revealRows = $derived.by((): GRow[] => {
    const r = reveal; if (!r) return [];
    const flipped = new Set(r.order.slice(0, r.shown));
    return r.qs.map((qq, i) => ({ q: qq, a: r.texts[i] ?? null, state: r.keep[i] ? 'keep' : flipped.has(i) ? (r.marks[i] ? 'ok' : 'bad') : 'wait' }));
  });
  const lastRows = $derived.by((): GRow[] => (last ? lastItems.map((x, i) => ({ q: shortQ(x), a: textOf(x, (last.given || [])[i], i), state: last.marks[i] ? 'ok' : 'bad' })) : []));
  const lastGold = $derived(!!last && last.marks.length > 0 && last.marks.every(Boolean));
  const cells = $derived.by((): Cell[] => items.map((x, i) => {
    const text = textOf(x, given[i], i);
    if (fixing) return keepAt(i) ? { text, state: 'ok', lock: true } : { text, state: 'oldbad' };
    return { text, state: text ? 'filled' : 'empty' };
  }));
  const pickCell = (i: number) => { if (!keepAt(i)) { tableHold = false; cur = i; } };
  const why = $derived(reveal ? '채점 중… (화면을 누르면 바로 결과)' : locked ? '' : thinkLeft > 0 ? `🤔 ${thinkLeft}초 — 학습지에서 다시 살펴봐요`
    : tableHold ? '틀린 소문제만 빈칸으로 다시 풀어요'
    : fixing && !allFilled ? (nextWrong >= 0 ? '틀린 것을 모두 고쳐야 다시 공격' : '답을 고르면 다시 공격')
    : !allFilled && q && !filled(q, given[cur] ?? null) ? '답을 고르면 다음으로' : '');
  const mainOff = $derived(!!reveal || locked || thinkLeft > 0 || (!tableHold && !allFilled && (fixing ? nextWrong < 0 : !(q && filled(q, given[cur] ?? null) && nextUnfilled >= 0))));
</script>

{#if showDone}
  <GradeTable rows={reveal ? revealRows : lastRows} gold={reveal ? reveal.flash : lastGold} still={!reveal} />
  <div class="bcard">
    <div class="okline"><span class="ic" aria-label="맞음">✔</span><span><b>{no} · {items.length}문제 모두 맞혔어요</b><span>데미지 {rec.best} · 남은 기회는 연습</span></span></div>
    <EnergyCard {S} {L} {R} {code} {mid} {uid} {now} />
  </div>
  <BottomAction battle disabled={!rec.canRetry || !!reveal} why={reveal ? '채점 중… (화면을 누르면 바로 결과)' : rec.canRetry ? '숫자가 바뀐 새 문제 · 데미지는 그대로' : '연습 기회를 다 썼어요'} onmain={() => { practice = true; tableHold = false; }} mainLabel="연습 공격 (도전 기회 {rec.left}번)">
    {#snippet main()}<span>🔥 연습 공격</span><Slots total={rec.slots} marks={marks} heal={rec.healed} now={rec.left > 0} />{/snippet}
  </BottomAction>
{:else if spent}
  <GradeTable rows={reveal ? revealRows : lastRows} still={!reveal} />
  <div class="bcard">
    <span class="lab acc">{no} · 기회를 다 썼어요</span>
    <p class="muted">벌은 없어요 — 학습지에 풀이를 정리해요. 데미지 {rec.best}</p>
  </div>
  <BottomAction battle text="📝 학습지에 정리" why="기회를 다 썼어요 · 다음 몬스터를 기다려요" />
{:else if reveal || tableHold}
  <GradeTable rows={reveal ? revealRows : lastRows} gold={!!reveal?.flash} still={!reveal} onpick={reveal ? undefined : pickCell} />
  <div class="bcard">
    {#if reveal}
      <span class="lab acc">{no} · 채점 중…</span>
    {:else}
      <span class="lab acc">{no} · 데미지 {rec.best} · 소문제 {wrongIdx.map((i) => i + 1).join(', ')} 이 틀렸어요</span>
      <p class="muted">맞힌 것은 그대로 잠기고, 틀린 것만 빈칸으로 다시 풀어요 · 공격 단추의 하트가 하나 줄었어요</p>
    {/if}
  </div>
  <BottomAction battle disabled={mainOff} {why} onmain={onMain} mainLabel="다음 틀린 문제">
    {#snippet main()}<span>{reveal ? '채점 중…' : '다음 틀린 문제 ▶'}</span>{/snippet}
  </BottomAction>
{:else if q}
  {#if fixing}
    <div class="bad" role="status"><b>소문제 {wrongIdx.map((i) => i + 1).join(', ')} 을 고쳐요</b><span>맞힌 것은 초록으로 잠김 · 틀린 것을 모두 고쳐야 다시 공격</span></div>
  {:else if attempt > 0 && rec.perfect}
    <div class="bad" role="status" style="background:var(--surface-2)"><b>🆕 숫자가 바뀐 새 문제 (연습)</b><span>맞혀도 데미지는 그대로 · 틀리면 하트 −1</span></div>
  {/if}
  <AnswerRow {cells} {cur} onpick={pickCell} />
  <div class="bcard" class:badline={fixing}>
    <div class="head"><span class="lab acc">{no} · 소문제 {cur + 1} / {items.length}{fixing ? ' · 다시' : ''}</span>{#if rec.healed}<span class="healed">💚 {healers}의 힐 · 도전 칸 +{rec.healed}</span>{/if}</div>
    {#if L.monsters[mid]?.noteText}<p class="muted">💡 {L.monsters[mid]?.noteText}</p>{/if}
    {#key `${key}|${cur}`}
      <QItem {q} i={cur} value={given[cur] ?? null} disabled={locked || keepAt(cur)} showNo={false} onchange={(v) => (given[cur] = v)} />
    {/key}
  </div>
  <BottomAction battle disabled={mainOff} {why} onmain={onMain} mainLabel={allFilled ? `${fixing ? '다시 공격' : '공격'} (도전 기회 ${rec.submitted ? rec.left : rec.slots}번)` : fixing ? '다음 틀린 문제' : '다음 소문제'}>
    {#snippet main()}
      {#if allFilled}<span>{fixing ? '다시 공격' : rec.perfect ? '연습 공격' : '공격'}</span><Slots total={rec.slots} marks={marks} heal={rec.healed} />
      {:else}<span>{fixing ? '다음 틀린 문제 ▶' : '다음 소문제 ▶'}</span>{/if}
    {/snippet}
  </BottomAction>
{/if}

<style>
  .healed { display: block; font-size: var(--fs-small); color: var(--ok); font-weight: 700; }
</style>
