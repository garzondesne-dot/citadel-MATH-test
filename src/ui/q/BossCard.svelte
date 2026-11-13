<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { bossItem, bossState, bossTries } from '../../raid/raid';
  import { bossSubmit } from '../../raid/actions';
  import QItem from './QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Slots, { type Mark } from '../battle/Slots.svelte';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import GradeTable, { type GRow } from './GradeTable.svelte';
  import { shortQ } from './short';
  import { heroAtk } from '../battle/fx.svelte';

  // 👑 형성평가 = 문항 하나씩 한 장 (#99 ① · 점수 · 재도전 규칙은 정식 그대로)
  //   문항마다 첫 시도 = 학습지 · 틀리면 생각 시간 뒤 숫자 바뀐 문제 · 기회 meta.bossTries · 맞히면 도달 = 보스 1 데미지
  //   보스를 이긴 뒤에도 남은 문항은 계속 풀 수 있음 (정식 bossView 와 같음)
  // #116 보여 주기만 #113 과 같게: 답안 줄 = 문항 칸 · 낸 문항 칸만 뒤집힘(0.25초 · ✔ 초록 + 베기 / ✘ 빨강 + 헛스윙) · ✔ 문항 = 그 답 그대로 잠김
  //   ✘ 문항 = 다시 열면 빈칸 · 「다음 안 푼 문항 ▶」 · 모두 끝나면 세로 채점표(문항 · 내 답 전체 · ✔/✘) 한 번에
  const { S, L, R, code, uid, now, locked }: { S: Store; L: LessonPack; R: Room; code: string; uid: string; now: number; locked: boolean } = $props();
  const st = $derived(bossState(L, R, uid));
  const tries = $derived(bossTries(L, R, uid));
  const open = (x: (typeof st)[number]) => !x.ok && x.left > 0;
  const firstOpen = (s: typeof st) => { const k = s.findIndex(open); return k < 0 ? 0 : k; };
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
  const lastSol = $derived(s && !s.ok && s.left <= 0 ? tries.filter((t) => t.i === cur).pop()?.q?.solution : '');
  const ansText = (i: number, ok?: boolean) => { const t = tries.filter((x) => x.i === i && (ok == null || x.ok === ok)).pop(); if (!t || !t.q) return null; const l = penLine(t.q, t.given, 0); return l ? stripNo(l) : null; };
  const allDone = $derived(st.length > 0 && st.every((x) => !open(x)));
  const nextOpen = $derived(st.findIndex((x, i) => i !== cur && open(x)));
  // 낸 칸 하나만 뒤집기 (0.25초 + 잠깐 보여 줌) — 채점 · 데미지 · 기록은 이미 끝남
  let flip = $state<{ i: number; ok: boolean; text: string | null } | null>(null);
  let flipT: ReturnType<typeof setTimeout> | null = null;
  const cells = $derived.by((): Cell[] => st.map((x, i) => {
    if (flip && flip.i === i) return { text: flip.text, state: flip.ok ? 'ok' : 'bad' };
    if (x.ok) return { text: ansText(i, true) ?? '✔', state: 'ok', lock: true };
    if (x.n > 0 && x.left <= 0) return { text: '📖 해설', state: 'oldbad' };
    if (i === cur && q) { const l = penLine(q, given, 0); return { text: l ? stripNo(l) : null, state: x.n ? 'oldbad' : l ? 'filled' : 'empty' }; }
    return { text: null, state: x.n ? 'oldbad' : 'empty' };
  }));
  // 세로 채점표 (끝났을 때 · 결과 보기): 문항마다 마지막에 낸 답 전체
  const rows = $derived.by((): GRow[] => st.map((x, i) => { const t = tries.filter((y) => y.i === i).pop(); const qq = t?.q ?? bossItem(L, R, uid, i, 0); return { q: qq ? shortQ(qq) : `${i + 1}번`, a: ansText(i, x.ok ? true : undefined), state: x.ok ? 'ok' : x.n ? 'bad' : 'wait' }; }));
  let showTable = $state(false), tableInit = false;
  $effect(() => { if (!tableInit && st.length) { tableInit = true; if (allDone) showTable = true; } });
  function send() {
    if (!q || !s || locked || thinkLeft > 0 || flip) return;
    if (!filled(q, given)) { if (nextOpen >= 0) { cur = nextOpen; toast = ''; } return; }
    const i = cur, text = (() => { const l = penLine(q, given, 0); return l ? stripNo(l) : null; })();
    if (!bossSubmit(S, L, code, uid, i, finalOf(q, given))) return;
    const s2 = bossState(L, S.get<Room>(`rooms/${code}`) as Room, uid);
    const me = s2[i], ok = !!me?.ok;
    flip = { i, ok, text }; heroAtk({ miss: !ok, ult: ok && s2.length > 0 && s2.every((x) => x.first) }); // ⚔ 정식 student.js 981: 형성평가 모두 첫 시도 정답 = ⚡ 필살기(내 속성 Ⅲ↑)
    if (flipT) clearTimeout(flipT);
    flipT = setTimeout(() => {
      flip = null;
      if (ok) { const nx = s2.findIndex((x, k) => k > i && open(x)); cur = nx >= 0 ? nx : firstOpen(s2); }
    }, 650);
    if (ok) toast = `✔ ${i + 1}번 도달! 보스에게 데미지`;
    else { toast = me && me.left > 0 ? `✘ ${i + 1}번은 아직… 🤔 ${R.meta.think}초 생각하고 숫자가 바뀐 빈칸으로 다시! (기회 ${me.left})` : `✘ ${i + 1}번 기회를 모두 썼어요 — 해설을 보며 학습지에 정리해요`; if (R.meta.think > 0) thinkUntil = now + R.meta.think * 1000; }
    if (s2.every((x) => !open(x))) setTimeout(() => (showTable = true), 700);
  }
  const pick = (i: number) => { if (st[i]?.ok) return; cur = i; toast = ''; showTable = false; };
</script>

{#if toast && !showTable}<p class="toast" role="status">{toast}</p>{/if}
{#if showTable}
  <GradeTable {rows} gold={st.every((x) => x.ok)} still label={(i) => `${i + 1}`} onpick={pick} />
  <div class="bcard">
    <span class="lab acc">형성평가 채점표 · 도달 {st.filter((x) => x.ok).length} / {st.length}</span>
    <p class="muted">{st.every((x) => x.ok) ? '모든 문항 도달!' : '못 맞힌 문항은 해설을 보며 학습지에 정리해요 · 벌은 없어요'}</p>
  </div>
  {#if !st.every((x) => x.ok)}
    <BottomAction battle onmain={() => { showTable = false; if (st[cur]?.ok) { const k = st.findIndex((x) => !x.ok); if (k >= 0) cur = k; } }} mainLabel="문항 보기" why={allDone ? '✘ 줄을 누르면 그 문항 해설' : ''}>{#snippet main()}<span>{allDone ? '못 맞힌 문항 보기' : '문항으로 돌아가기'}</span>{/snippet}</BottomAction>
  {/if}
{:else if s && q}
  <AnswerRow {cells} {cur} label={(i) => `${i + 1}번`} onpick={flip ? undefined : pick} />
  {#if !s.ok && s.n > 0 && s.left > 0}<div class="bad" role="status"><b>{cur + 1}번이 아직이에요</b><span>숫자가 바뀐 빈칸으로 다시 · 공격 단추의 하트가 하나 줄었어요</span></div>{/if}
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
    {@const ready = filled(q, given)}
    <BottomAction battle disabled={locked || thinkLeft > 0 || !!flip || (!ready && nextOpen < 0)} why={thinkLeft > 0 ? `🤔 ${thinkLeft}초 — 학습지에서 다시 살펴봐요` : !ready && !locked ? (nextOpen >= 0 ? '답을 고르면 공격 · 다른 문항부터 풀어도 돼요' : '답을 고르면 낼 수 있어요') : ''} onmain={send} mainLabel={ready ? `${cur + 1}번 내기 (도전 기회 ${s.left}번)` : '다음 안 푼 문항'}>
      {#snippet main()}{#if ready}<span>{cur + 1}번 공격</span><Slots total={R.meta.bossTries} marks={Array.from({ length: Math.max(0, R.meta.bossTries - s.left) }, (_, k) => (s.ok && k === R.meta.bossTries - s.left - 1 ? 'ok' : 'bad') as Mark)} />{:else}<span>다음 안 푼 문항 ▶</span>{/if}{/snippet}
    </BottomAction>
  {:else if nextOpen >= 0}
    <BottomAction battle onmain={() => pick(nextOpen)} mainLabel="다음 안 푼 문항">{#snippet main()}<span>다음 안 푼 문항 ▶</span>{/snippet}</BottomAction>
  {:else if allDone}
    <BottomAction battle onmain={() => (showTable = true)} mainLabel="채점표 보기">{#snippet main()}<span>📋 채점표 보기</span>{/snippet}</BottomAction>
  {/if}
{/if}
