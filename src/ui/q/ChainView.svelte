<script lang="ts">
  import SkillCards from './SkillCards.svelte';
  import Hearts from '../battle/Hearts.svelte';
  import { V4 } from '../../raid/raid';
  // ▢ 소레이드 도전 칸 (#152): 쓴 칸 = 빨강 − · 졸개 오답 ½ = 노랑 반 칸
  const chainMarks = (t: number, l: number): Mark[] => { const used = Math.max(0, t - l), full = Math.floor(used + 1e-9); return [...Array.from({ length: full }, () => 'bad' as Mark), ...(used - full > 0.01 ? ['part' as Mark] : [])]; };
  import { untrack } from 'svelte';
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { CHAIN_SLOTS, chainItems, chainRecord, PRAC_MAX, pracUsed, stone } from '../../raid/raid';
  import { chainSubmit, petriAward, pracStart } from '../../raid/actions';
  import ChainStage from './ChainStage.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Slots, { type Mark } from '../battle/Slots.svelte';
  import EnergyCard from './EnergyCard.svelte';
  import { heroAtk } from '../battle/fx.svelte';

  // ⚔ 소레이드 학생 카드 (정식 chainView · ⑤): 지금 단계 하나 · 졸개 오답 −½ · 대장 오답 −1 · 1칸 남으면 🙋 선생님 확인
  //   대장 처치 뒤 = 「🔥 한 판 더 (n/3)」 (저절로 넘어가지 않음 · 나타난 뒤 1.5초 잠금) · 연습 판 = 숫자 바뀜 · 📜 원문 · 💡 근거 빈칸
  //   (b4 범위 밖: ✍ 서술형 📸 · ⛓ 묶기 · 💚 힐 · 💡 힌트 주기)
  const { S, L, R, code, mid, uid, now, locked, title, onhint }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string; onhint?: () => void } = $props();
  const rec = $derived(chainRecord(L, R, mid, uid));
  const v4 = $derived(V4(R)); // ❤ ⚡ 베타 v4 (📜 2026-11-13 밤)
  let pracPass = $state<number | null>(null);
  const prac = $derived(rec.done && pracPass != null);
  const pass = $derived(prac ? (pracPass as number) : 0);
  const pItems = $derived(prac ? chainItems(L, R, mid, uid, pass) : rec.items);
  const stage = $derived(prac ? (rec.pass === pass ? rec.pStage : 0) : rec.stage);
  const says = $derived(prac ? (rec.pass === pass ? rec.pSays : []) : rec.says);
  const needWhy = $derived(prac && rec.pass === pass && rec.pWhy >= 0);
  const wq = $derived(needWhy ? pItems[rec.pWhy] : null);
  const pFail = $derived(prac && rec.pass === pass && rec.pFail);
  const pDone = $derived(prac && stage >= pItems.length && !needWhy);
  const q = $derived(pItems[Math.min(stage, pItems.length - 1)]);
  const key = $derived(`${mid}|${pass}|${stage}|${rec.nextK}`);
  let given = $state<Given>(null);
  let formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; given = q ? emptyOf(q) : null; } });
  const ready = $derived(!!q && filled(q, given));
  const lastWrong = $derived(!prac && !!rec.lastWrong && rec.lastWrong.s === stage);
  const used = $derived(pracUsed(R, mid, uid, rec));
  const pLeftN = $derived(Math.max(0, PRAC_MAX - used));
  let armKey = '', armAt = $state(0);
  const pracShown = $derived((!prac && rec.done) || pDone || pFail);
  $effect(() => { const k = `${pass}|${pracShown}`; if (pracShown && k !== armKey) { armKey = k; armAt = untrack(() => now) + 1500; } });
  let toast = $state('');
  const stName = (i: number, n: number) => (i === n - 1 ? '대장' : `졸개 ${'①②③④⑤⑥'[i]}`);
  let flip = $state<{ i: number; ok: boolean; text: string | null } | null>(null), flipT: ReturnType<typeof setTimeout> | null = null;
  function go() {
    if (!q || !ready || locked || flip) return;
    const l0 = penLine(q, given, 0), sent = l0 ? stripNo(l0) : null;
    const before = stage, err = chainSubmit(S, L, code, mid, uid, stage, pass, finalOf(q, given));
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    const okNow = prac ? r2.pass === pass && r2.pStage > before : r2.stage > before;
    heroAtk({ miss: !okNow, noDmg: prac, win: !prac && r2.done, prac: prac && okNow ? 1 : 0 });
    if (okNow) petriAward(S, code, uid, mid, 1); // 🗿 석화 찬스 (진짜 · 🔥 한 판 더 모두 · 석화 한 번에 3까지) // ⚔ 정식 소레이드 = 단계마다 공격 한 번
    flip = { i: before, ok: okNow, text: sent }; if (flipT) clearTimeout(flipT); flipT = setTimeout(() => (flip = null), 650); // #116 그 칸만 뒤집힘
    toast = okNow ? (before === pItems.length - 1 ? (prac ? '✔ 연습 사슬 완성!' : r2.perfect ? '🌟 퍼펙트 사슬!' : '👑 대장 처치!') : `✔ 졸개 ${'①②③④⑤⑥'[before]} 처치!`)
      : prac ? (r2.pFail ? '✘ 이번 연습 판은 기회를 다 썼어요' : `✘ 틀렸어요 · 연습 하트 −${before === pItems.length - 1 ? 1 : 0.5}`)
      : r2.locked ? '🙋 하트 1칸 — 선생님 확인을 기다려요' : r2.fail ? '기회를 다 썼어요' : `✘ 틀렸어요 · 하트 −${before === rec.n - 1 ? 1 : 0.5}`;
    if (v4 && !okNow) toast = ''; // 틀렸을 때 = 배너 · 안내 없이 하트 쪼개짐 · 나의 풀이 빨강 줄만 (📜 2026-11-13 밤)
  }
  function why(i: number) {
    const err = chainSubmit(S, L, code, mid, uid, rec.pWhy, pass, i, 1);
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    toast = r2.pWhy < 0 ? '💡 근거 완성!' : '다시 골라 봐요 — 벌은 없어요';
  }
  function again() { const p = pracStart(S, L, code, mid, uid); if (p) { pracPass = p; toast = ''; } }
  const hearts = $derived(prac && !pDone && !pFail ? { total: CHAIN_SLOTS, left: rec.pass === pass ? rec.pLeft : CHAIN_SLOTS } : { total: rec.slots, left: rec.left });
</script>

{#if needWhy && wq?.why}
  <div class="bcard">
    <span class="lab acc">💡 근거 한 줄 · 틀려도 괜찮아요</span>
    <p class="wq">{wq.why.pre} <b class="bl">____</b>{wq.why.post}</p>
    <div class="opts">{#each wq.why.choices as c, i (i)}<button type="button" class="opt" onclick={() => why(i)}>{c}</button>{/each}</div>
  </div>
{:else if rec.fail}
  <div class="bcard"><span class="lab acc">기회를 다 썼어요 · 벌은 없어요</span><p class="muted">아래 풀이를 학습지에 옮겨 적고 복습에서 다시 도전해요.</p>
    <div class="story"><b>📜 나의 풀이</b><ol>{#each rec.items as x, k (k)}<li>{x.say}</li>{/each}</ol></div></div>
{:else if (!prac && rec.done) || pDone || pFail}
  <div class="bcard">
    <div class="okline"><span class="ic" aria-label="맞음">{pFail ? '✘' : '✔'}</span><span><b>{pFail ? '이번 연습 판은 기회를 다 썼어요' : pDone ? '연습 사슬 완성!' : rec.perfect ? '퍼펙트 사슬!' : '대장 처치!'}</b><span>{prac ? '데미지 없음 · 수업 기록 그대로' : `데미지 ${rec.best}`}</span></span></div>
    <div class="story"><b>📜 나의 풀이</b><ol>{#each pFail ? pItems.map((x) => x.say || '') : says as t, k (k)}<li>{t}</li>{/each}</ol></div>
    {#if !v4}<p class="muted">숫자만 바뀐 새 문제 · 판마다 도전 칸 4개 · 데미지 0</p>{/if}
  </div>
  {#if v4}<SkillCards {S} {L} {R} {code} {mid} {uid} {now} onround={again} />{:else if !prac && rec.done}<div class="bcard"><EnergyCard {S} {L} {R} {code} {mid} {uid} {now} /></div>{/if}
{:else if rec.locked && !prac}
  <ChainStage items={pItems} stage={pItems.length} {says} {title} value={null} onchange={() => {}} />
{:else}
  {#if v4 && prac}<p class="tagl"><span class="tag">🔁 숫자 바뀜</span><button type="button" class="stop" onclick={() => (pracPass = null)}>그만하기</button></p>{/if}
  <ChainStage items={pItems} {stage} {says} {title} value={given} {lastWrong} {prac} {flip} disabled={locked} onchange={(v) => (given = v)} {v4} wrongText={lastWrong && rec.lastWrong && q ? (() => { const l = penLine(q, rec.lastWrong.given, 0); return l ? stripNo(l) : null; })() : null} />
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}
{#if needWhy}
  <span></span>
{:else if pracShown && v4}
  <span></span>
{:else if pracShown}
  <BottomAction battle disabled={pLeftN <= 0 || armAt > now} why={pLeftN > 0 ? '' : `🔥 연습 ${PRAC_MAX}번 끝!`} onmain={again} mainLabel="한 판 더">
    {#snippet main()}<span>🔥 한 판 더 {pLeftN}/{PRAC_MAX}</span>{/snippet}
  </BottomAction>
{:else if rec.fail}
  <span></span>
{:else if rec.locked && !prac}
  <BottomAction battle disabled why={v4 ? '🙋 ❤ 0 — 학습지에 풀이를 정리하면 선생님이 「풀어주기」로 ❤ 하나를 줘요' : '🙋 하트 1칸 — 학습지에 풀이를 정리해 두면 선생님이 와서 확인해 줘요'}>
    {#snippet main()}<span>🙋 선생님 확인 기다림</span>{#if v4}<Hearts total={rec.slots} left={rec.left} memo={`${code}|${mid}|${uid}`} />{/if}{/snippet}
  </BottomAction>
{:else}
  <BottomAction battle disabled={!ready || locked || !!flip} why={!ready && !locked ? '답을 고르면 공격할 수 있어요' : ''} onmain={go} mainLabel="{stName(stage, pItems.length)} 공격 (도전 기회 {hearts.left}번)">
    {#snippet left()}{#if v4 && onhint}<button type="button" class="side hint" aria-label="힌트" onclick={onhint}><i>💡</i>힌트</button>{/if}{/snippet}
    {#snippet right()}{#if v4 && true}<button type="button" class="side wr" disabled aria-label="서술형 (사진 채점은 베타에 아직 없어요)">✍ 서술형<small>📄 학습지 숫자</small></button>{/if}{/snippet}
    {#snippet main()}<span>{stName(stage, pItems.length)} {prac ? (v4 ? '재도전 ' : '연습 ') : ''}공격</span>{#if v4 && prac}<Hearts mode="energy" left={rec.tokLeft} lock />{:else if v4}<Hearts total={rec.slots} left={rec.left} memo={`${code}|${mid}|${uid}`} />{:else}<Slots total={hearts.total} marks={chainMarks(hearts.total, hearts.left)} />{/if}{/snippet}
  </BottomAction>
{/if}

<style>
  .tagl { margin: 0; display: flex; align-items: center; gap: var(--s2); }
  .tag { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 13px; background: var(--surface-2); border: 1px solid var(--line, #2f3440); color: var(--text-2); font: 700 13px var(--font); }
  .stop { margin-left: 6px; padding: 0; border: 0; background: none; color: var(--text-2); font: 700 14px var(--font); text-decoration: underline; min-height: 32px; }
  .wq { margin: 0; font-size: 17px; font-weight: 700; overflow-wrap: anywhere; }
  .bl { color: var(--accent); }
  .opts { display: flex; flex-direction: column; gap: var(--s2); }
  .opt { min-height: var(--tap); text-align: left; padding: var(--s2) var(--s3); border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); overflow-wrap: anywhere; }
  .opt:active { transform: translateY(2px); box-shadow: none; }
</style>
