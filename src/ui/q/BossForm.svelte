<script lang="ts">
  import { isDummy } from '../../raid/raid';
  import type { Given, LessonPack, Question, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { BOSS_ID, bossItem, bossRecord, bossTries } from '../../raid/raid';
  import { bossSubmitAll, petriAward } from '../../raid/actions';
  import QItem from './QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Hearts from '../battle/Hearts.svelte';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import SkillCards from './SkillCards.svelte';
  import { heroAtk } from '../battle/fx.svelte';
  // 👑 형성평가 v4 = 일반 몬스터 꼴 (📜 2026-11-13 밤 · 머리 🔨 하트 묶음 D · 베타 v4 방)
  //   4~7문항을 다 채워 한 번에 「공격」 · 하나라도 틀리면 ❤ −1(⭐ 보너스 문항은 틀려도 ❤ 그대로) · ❤ 4 공유
  //   틀린 문항만 숫자 바뀐 새 문제로 다시 · 맞힌 문항 = 초록으로 잠김 · ❤ 0 = 📖 해설 보기 · 💡 힌트 숨김 · 데미지 = 맞힌 문항마다 1
  //   다 끝내면 ⚡ 3 → 기술 💚 · ⛓ 두 장(🌟 흐림) → 형성평가 🔥 재도전 판(모든 문항 새 숫자 · 무료 · 데미지 0)
  const { S, L, R, code, uid, now, locked }: { S: Store; L: LessonPack; R: Room; code: string; uid: string; now: number; locked: boolean } = $props();
  const r = $derived(bossRecord(L, R, uid));
  const tries = $derived(bossTries(L, R, uid));
  let practice = $state(false), bonusMode = $state(false), toast = $state('');
  // ⭐ 보너스만 남으면 = 다 끝낸 뒤 보너스만 다시 (❤ 안 깎임 · 새 숫자 · 문항마다 4번)
  const todo = $derived(bonusMode && r.done && !r.roundOpen ? r.bonusTodo : r.todo);
  const qs = $derived(Object.fromEntries(todo.map((i) => [i, bossItem(L, R, uid, i, r.next(i))])) as Record<number, Question | null>);
  const key = $derived(`${r.subs}|${todo.join(',')}`);
  let given = $state<Record<number, Given>>({}), cur = $state(-1), formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; given = Object.fromEntries(todo.map((i) => [i, qs[i] ? emptyOf(qs[i]!) : null])); cur = todo[0] ?? -1; } });
  const q = $derived(cur >= 0 ? qs[cur] ?? null : null);
  const allFilled = $derived(todo.length > 0 && todo.every((i) => !!qs[i] && filled(qs[i]!, given[i] ?? null)));
  const nextUnfilled = $derived(todo.find((i) => i !== cur && !!qs[i] && !filled(qs[i]!, given[i] ?? null)) ?? -1);
  const okText = (i: number) => { const t = tries.filter((x) => x.i === i && x.ok).pop(); if (!t?.q) return '✔'; const l = penLine(t.q, t.given, 0); return l ? stripNo(l) : '✔'; };
  const cells = $derived.by((): Cell[] => Array.from({ length: r.n }, (_, i) => {
    if (!todo.includes(i)) return { text: okText(i), state: 'ok', lock: true };
    const qq = qs[i], l = qq ? penLine(qq, given[i] ?? null, 0) : null;
    return { text: l ? stripNo(l) : null, state: tries.some((t) => t.i === i) && !practice && !r.roundOpen ? 'oldbad' : l ? 'filled' : 'empty' };
  }));
  const label = (i: number) => `${i + 1}${r.bonus(i) ? '⭐' : ''}`;
  function go() {
    if (locked || (!r.canSubmit && !(bonusMode && r.bonusTodo.length))) return;
    if (!allFilled) { if (nextUnfilled >= 0) cur = nextUnfilled; return; }
    const before = new Set(r.solved), g = Object.fromEntries(todo.map((i) => [i, finalOf(qs[i]!, given[i] ?? null)]));
    if (!bossSubmitAll(S, L, code, uid, g)) return;
    const r2 = bossRecord(L, S.get<Room>(`rooms/${code}`) as Room, uid), gain = r2.solved.filter((i) => !before.has(i)).length;
    const ok = todo.filter((i) => (r.roundOpen ? (bossTries(L, S.get<Room>(`rooms/${code}`) as Room, uid).some((t) => t.i === i && t.a === r.next(i) && t.ok)) : r2.solved.includes(i))).length;
    if (!r.roundOpen) petriAward(S, code, uid, BOSS_ID, gain); else petriAward(S, code, uid, BOSS_ID, ok);
    heroAtk({ miss: ok === 0, hits: Math.max(1, gain), noDmg: r.roundOpen, prac: r.roundOpen ? ok : 0, ult: r.subs === 0 && ok === todo.length });
    const bad = todo.length - ok;
    toast = bad ? '' : r.roundOpen ? '🔥 재도전 판 완성!' : '✔ 모두 도달!'; // 틀렸을 때 = 배너 · 안내 없이 하트 쪼개짐만 (📜 2026-11-13 밤)
    setTimeout(() => (toast = ''), 2000);
    if (bonusMode && !r2.bonusTodo.length) bonusMode = false;
    if (r2.roundOpen === false && r.roundOpen) practice = false;
  }
  const sol = (i: number) => tries.filter((t) => t.i === i).pop()?.q?.solution || '';
  // 🎯 허수아비 방 = ❤ · ⚡ 없음 · 문제 위 꼬리표 「📄 학습지 숫자」/「🔁 바뀐 숫자」(수업 기록 기준)
  const dummy = $derived(isDummy(R));
  const numTag = $derived(dummy ? (R.meta.fresh?.[BOSS_ID] ? '🔁 바뀐 숫자' : '📄 학습지 숫자') : '');
</script>

{#if toast}<p class="toast" role="status">{toast}</p>{/if}
{#if r.explain}
  <AnswerRow {cells} {label} />
  <div class="bcard">
    <span class="lab acc">📖 ❤ 를 다 썼어요 · 해설 보기 · 벌은 없어요</span>
    {#each todo as i (i)}<p class="sol"><b>{i + 1}번</b> {sol(i) || '해설을 보며 학습지에 정리해요'}</p>{/each}
  </div>
  <BottomAction battle disabled why="학습지에 정리하고 다음을 기다려요">{#snippet main()}<span>📖 해설 보는 중</span>{#if !dummy}<Hearts total={r.slots} left={0} memo={`${code}|boss|${uid}`} />{/if}{/snippet}</BottomAction>
{:else if r.done && !practice && !bonusMode}
  <AnswerRow {cells} {label} />
  <div class="bcard"><div class="okline"><span class="ic" aria-label="맞음">✔</span><span><b>형성평가 {r.n}문항 모두 끝!</b><span>⚡ {r.tokLeft} · 기술 하나 = 🔥 재도전 판</span></span></div>
    {#if r.bonusTodo.length}<button type="button" class="bon" onclick={() => (bonusMode = true)}>⭐ 보너스 {r.bonusTodo.length}문항 다시</button>{/if}</div>
  <SkillCards {S} {L} {R} {code} mid={BOSS_ID} {uid} {now} boss onround={() => (practice = true)} />
{:else if q}
  <AnswerRow {cells} cur={cur} {label} onpick={(i) => { if (todo.includes(i)) cur = i; }} />
  {#if r.roundOpen || bonusMode}<p class="tagl"><span class="tag">🔁 숫자 바뀜</span><button type="button" class="stop" onclick={() => { practice = false; bonusMode = false; }}>그만하기</button></p>{/if}
  <div class="bcard">
    <div class="head">{#if numTag}<span class="tag">{numTag}</span> {/if}<span class="lab acc">형성평가 {cur + 1}번{r.bonus(cur) ? ' · ⭐ 보너스(틀려도 ❤ 그대로)' : ''} · {todo.indexOf(cur) + 1} / {todo.length}</span></div>
    {#key `${key}|${cur}`}<QItem {q} i={cur} value={given[cur] ?? null} disabled={locked} runeLen={4} showNo={false} onchange={(v) => (given[cur] = v)} />{/key}
  </div>
  <BottomAction battle disabled={locked || (!allFilled && !(q && filled(q, given[cur] ?? null) && nextUnfilled >= 0))} why={!allFilled ? '모든 문항을 채우면 한 번에 공격' : ''} onmain={go} mainLabel={allFilled || nextUnfilled < 0 ? '공격' : '다음 문항'}>
    {#snippet main()}{#if allFilled || nextUnfilled < 0}<span>{bonusMode ? '⭐ 보너스 공격' : r.roundOpen ? '🔥 재도전 공격' : '공격'}</span>{#if r.roundOpen}{#if !dummy}<Hearts mode="energy" left={r.tokLeft} lock />{/if}{:else}{#if !dummy}<Hearts total={r.slots} left={r.left} memo={`${code}|boss|${uid}`} />{/if}{/if}{:else}<span>다음 문항 ▶</span>{/if}{/snippet}
  </BottomAction>
{/if}

<style>
  .bon { margin-top: var(--s2); width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid var(--accent); background: none; color: var(--accent); font: 700 15px var(--font); }
  .tagl { margin: 0; display: flex; align-items: center; gap: var(--s2); }
  .tag { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 13px; background: var(--surface-2); border: 1px solid var(--line, #2f3440); color: var(--text-2); font: 700 13px var(--font); }
  .sol { margin: 0; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; } .sol b { color: var(--accent); margin-right: 6px; }
  .stop { margin-left: 6px; padding: 0; border: 0; background: none; color: var(--text-2); font: 700 14px var(--font); text-decoration: underline; min-height: 32px; }
</style>
