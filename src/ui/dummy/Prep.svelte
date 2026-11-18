<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { boardPack, stepDone } from '../../board/board';
  import { chainPhotoFill, nextStep, openRoom, roomPath } from '../../raid/actions';
  import { TEST_ADDR } from '../../channel';
  import { answerOf, chainRecord, isChain, isEnd, isLobby, itemsFor, plainRecord } from '../../raid/raid';
  import { bonusBase } from '../../school/castle';
  import { meBound } from '../../store/meSync';
  import { prepKey, prepOpenList, type PrepRec } from '../../school/prepopen';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import Vid from '../q/Vid.svelte';
  import PrepImg from '../q/PrepImg.svelte';
  import { busy } from '../busy.svelte';

  // 📖 배움터 · 예습 (📜 #66 · DECISIONS 「📖🎯 배움터」): 반이 n차시 수업을 하면 n + 1 차시 하나 자동(교사 덮어쓰기) · 시험 · 이 기기 = 모두
  //   흐름 = 📚 개념(🎬 · 📄) → 일반 몬스터 = 숫자 바꾼 판(허수아비 변형 생성기 그대로 · 학습지 숫자 안 나옴) · 👑 형성평가 · 📷 서술형 · 🔑 상자 = 없음
  //   보상 0 (💎 · 📜 · EXP · 업적 · 칭호 · 연속 참여 없음) · 기록 = bonus/{반}/{번호}/review/prep_{차시}/{몬스터} (반 통계 · 첫 시도 · 허수아비 목록 밖)
  const { S, me, uid, num, cls, all = false, onclose }: { S: Store; me: Me; uid: string; num: number; cls: string; /** 시험 · 이 기기 · 체험 = 모든 차시 */ all?: boolean; onclose: () => void } = $props();
  const recs = untrack(() => (cls && num ? S.get<Record<string, unknown>>(`records/${cls}/${num}`) : null) || {});
  const LOCK = 'citadel-v1-prep';
  const bnd = untrack(() => meBound()), RS = bnd?.S ?? S, base = bnd ? `${bonusBase(bnd.cls, bnd.num)}/review` : '';
  const readLocal = (): Record<string, Record<string, PrepRec>> => { try { return JSON.parse(localStorage.getItem(LOCK) || '{}'); } catch { return {}; } };
  let ver = $state(0);
  const recOf = (L: LessonPack): Record<string, PrepRec> => (void ver, (base ? RS.get<Record<string, PrepRec>>(`${base}/${prepKey(L.id)}`) : readLocal()[prepKey(L.id)]) || {});
  const list = $derived.by(() => { void ver; return prepOpenList(S, cls, recs, all || !cls); });
  const mons = (L: LessonPack) => L.steps.filter((s) => s.kind === 'monster');
  const concepts = (L: LessonPack) => { const own = L.steps.filter((s) => s.kind === 'concept'); if (own.length || !L.partOf) return { P: L, cs: own }; const P = PACKS.find((p) => p.id === L.partOf) ?? L; return { P, cs: P.steps.filter((s) => s.kind === 'concept') }; };

  type Run = { L0: LessonPack; L: LessonPack; mid: string; S: Store; code: string };
  let run = $state<Run | null>(null), res = $state<{ L: LessonPack; title: string; clear: boolean } | null>(null), shelf = $state<LessonPack | null>(null), shelfOn = $state('');
  function fight(L0: LessonPack, mid: string) {
    const BL = boardPack(L0), L = { ...BL, steps: BL.steps.filter((s) => s.id === mid), boss: undefined };
    if (!L.steps.length) return;
    const S2: Store = { ...memoryStore(), kind: 'memory' as const }, code = `P${Date.now() % 1e6}`;
    openRoom(S2, L, code, PROFILES.board);
    S2.set(`${roomPath(code)}/meta/fresh`, { [mid]: true }); // 📖 처음부터 숫자 바꾼 판 (학습지 숫자 안 나옴 · 허수아비 수업 문제와 같음)
    S2.set(`${roomPath(code)}/meta/retries`, 3); S2.set(`${roomPath(code)}/meta/think`, 0); S2.set(`${roomPath(code)}/meta/solve`, 0);
    run = { L0, L, mid, S: S2, code }; res = null;
    // 🧪 시험 고리(시험 주소만 · 허수아비 __dummyPerfect 와 같음): 이 판을 첫 시도에 맞힘 / 낸 첫 답(숫자 바꾼 판인지 e2e 가 봄)
    if (TEST_ADDR) { const G = globalThis as { __prepPerfect?: (m: string) => void; __prepItems?: (m: string) => unknown; __prepMid?: string }; G.__prepMid = mid; G.__prepPerfect = (m) => { const RR = S2.get<Room>(roomPath(code)); if (!RR) return; if (isChain(L, RR, m)) { chainPhotoFill(S2, L, code, uid, m); return; } S2.set(`${roomPath(code)}/subs/${m}/${uid}/0`, itemsFor(L, RR, m, uid, 0).map(answerOf)); }; G.__prepItems = (m) => { const RR = S2.get<Room>(roomPath(code)); if (!RR) return null; const S3: Store = { ...memoryStore(), kind: 'memory' as const }; openRoom(S3, L, 'PX0', PROFILES.board); const R3 = S3.get<Room>(roomPath('PX0')); return { now: itemsFor(L, RR, m, uid, 0), sheet: R3 ? itemsFor(L, R3, m, uid, 0) : null }; }; }
  }
  let lr: ReturnType<typeof liveRoom> | null = null, drive: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    const r = run; if (!r) return;
    untrack(() => busy.n++);
    untrack(() => {
      lr = liveRoom(r.S, r.code);
      drive = setInterval(() => {
        const RR = r.S.get<Room>(roomPath(r.code)); if (!RR) return;
        if (isLobby(RR) || (!isEnd(r.L, RR) && stepDone(r.L, RR, uid))) { nextStep(r.S, r.L, r.code); return; }
        if (isEnd(r.L, RR)) finish(r, RR);
      }, 300);
    });
    return () => { untrack(() => busy.n--); if (drive) clearInterval(drive); lr?.stop(); };
  });
  function outcome(r: Run, RR: Room): { clear: boolean; tried: boolean } {
    if (isChain(r.L, RR, r.mid)) { const c = chainRecord(r.L, RR, r.mid, uid); return { clear: !!c.done, tried: !!c.done || !!c.fail || c.nextK > 0 }; }
    const p = plainRecord(r.L, RR, r.mid, uid); return { clear: p.perfect, tried: p.tries.length > 0 };
  }
  /** 기록만 (보상 없음) */
  function credit(r: Run, RR: Room) {
    const o = outcome(r, RR); if (!o.tried) return null;
    const old = recOf(r.L0)[r.mid] || {}, rec: PrepRec = { tries: (Number(old.tries) || 0) + 1, at: S.now(), ...(o.clear || old.clear ? { clear: true } : {}), ...(o.clear || old.kills ? { kills: (Number(old.kills) || (old.clear ? 1 : 0)) + (o.clear ? 1 : 0) } : {}) }; // 🔥 #67 kills = 탐사대 「n번 쓰러뜨렸어요」
    if (base) RS.set(`${base}/${prepKey(r.L0.id)}/${r.mid}`, rec);
    else { const a = readLocal(); a[prepKey(r.L0.id)] = { ...(a[prepKey(r.L0.id)] || {}), [r.mid]: rec }; try { localStorage.setItem(LOCK, JSON.stringify(a)); } catch { /* 무시 */ } }
    ver++;
    return { L: r.L0, title: r.L.steps[0]?.title ?? r.mid, clear: o.clear };
  }
  function finish(r: Run, RR: Room) { if (drive) clearInterval(drive); drive = null; res = credit(r, RR); run = null; }
  function quit() { const r = run; if (!r) return; const RR = r.S.get<Room>(roomPath(r.code)); const c = RR ? credit(r, RR) : null; run = null; if (c?.clear) res = c; }
  onDestroy(() => { if (drive) clearInterval(drive); lr?.stop(); });
  void me;
</script>

{#if run}
  <div class="drun" data-prep>
    <button type="button" class="quit" aria-label="그만하기" onclick={quit}>‹</button>
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me.nick} {cls} board />
  </div>
{:else if res}
  <Sheet onclose={() => (res = null)} mainText="📖 예습으로" onmain={() => (res = null)}>
    {#snippet title()}{res?.clear ? '🎉 처치!' : '💧 이번엔 못 잡았어요'}{/snippet}
    <p class="rt">{res.L.no}차시 · {res.title}</p>
    <p class="muted" data-k="prep-nogain">연습용 · 보상 없어요 · 다시 풀면 숫자가 또 바뀌어요</p>
  </Sheet>
{:else if shelf}
  {@const C = concepts(shelf)}
  <Sheet onclose={() => (shelf = null)} tall mainText="📖 예습으로" onmain={() => (shelf = null)}>
    {#snippet title()}📚 {shelf?.no}차시 개념 미리 보기{/snippet}
    <div class="shelf" data-k="prep-shelf">
      {#each C.cs as c (c.id)}
        <div class="cp"><b>{c.title}</b><span class="cpb">{#if C.P.videos?.[c.id]}<button type="button" class="mini" onclick={() => (shelfOn = shelfOn === `v${c.id}` ? '' : `v${c.id}`)}>🎬 영상</button>{/if}<button type="button" class="mini" onclick={() => (shelfOn = shelfOn === `i${c.id}` ? '' : `i${c.id}`)}>📄 개념</button></span></div>
        {#if shelfOn === `v${c.id}` && C.P.videos?.[c.id]}<Vid {S} url={C.P.videos[c.id]!} autoplay />{/if}
        {#if shelfOn === `i${c.id}`}<PrepImg {S} L={C.P} id={c.id} alt={c.title}><p class="muted">아직 이 개념의 그림이 없어요</p></PrepImg>{/if}
      {:else}<p class="muted">이 차시에는 개념 칸이 없어요</p>{/each}
    </div>
  </Sheet>
{:else}
  <Sheet {onclose} tall mainText="닫기" onmain={onclose}>
    {#snippet title()}📖 예습하기{/snippet}
    <div class="dl" data-k="prep-list">
      <p class="fx">다음 수업 내용을 <b>미리</b> 풀어 봐요. 문제는 <b>숫자를 바꿔서</b> 나와요.</p>
      <p class="nogain" data-k="prep-nogain">🎈 연습용 · 보상 없어요 <small>(💎 · 📜 · EXP 없음 · 수업 기록에도 안 들어가요)</small></p>
      {#each list.open as L (L.id)}
        {@const R0 = recOf(L)}
        <div class="card" data-k="prep-card" data-lid={L.id}>
          <p class="h"><b>📖 {L.no}차시 · {L.title}</b><span class="cnt">{mons(L).filter((m) => R0[m.id]?.tries).length} / {mons(L).length} 풀어 봄</span></p>
          <div class="cpts"><button type="button" class="mini" data-k="prep-concept" onclick={() => { shelf = L; shelfOn = ''; }}>📚 개념 미리 보기 (🎬 · 📄)</button></div>
          <ul class="rows">
            {#each mons(L) as m (m.id)}
              <li class:clear={!!R0[m.id]?.clear}><span class="mi" aria-hidden="true">{R0[m.id]?.clear ? '✔' : R0[m.id]?.tries ? '·' : '👾'}</span><span class="tx">{(m.title ?? m.id).split(' · ').pop()}{#if R0[m.id]?.tries}<small> · {R0[m.id]?.tries}번 해 봄</small>{/if}</span><button type="button" class="go" data-k="prep-go" onclick={() => fight(L, m.id)}>⚔ 풀기</button></li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="empty" data-k="prep-empty"><span aria-hidden="true">📖</span>{#if list.wait}<p><b>{list.wait}차시</b>는 아직 준비 중이에요</p>{:else}<p>아직 열린 예습이 없어요<br /><small>수업을 하면 다음 차시가 열려요</small></p>{/if}</div>
      {/each}
    </div>
  </Sheet>
{/if}

<style>
  .drun { position: fixed; inset: 0; z-index: 25; background: var(--bg); overflow: auto; }
  .quit { position: fixed; z-index: 30; left: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; text-shadow: 0 1px 2px #000; }
  .dl { display: flex; flex-direction: column; gap: var(--s3); }
  .fx { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-2); } .fx b { color: var(--text); }
  .nogain { margin: 0; padding: var(--s2) var(--s3); border-radius: 10px; background: var(--surface-2); font: 700 14px var(--font); } .nogain small { font-weight: 500; color: var(--text-3); }
  .card { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--line, #2f3440); }
  .h { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; } .h > b { font-size: 15px; flex: 1 1 100%; }
  .cnt { font: 700 13px var(--font); color: var(--text-2); }
  .cpts { display: flex; flex-wrap: wrap; gap: 6px; }
  .mini { min-height: 36px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rows li { display: flex; align-items: center; gap: var(--s2); min-height: 52px; padding: 4px var(--s2); border-radius: 10px; background: var(--surface-2); }
  .rows li.clear .tx { color: var(--text-2); }
  .mi { width: 28px; text-align: center; font-size: 18px; flex: none; }
  .tx { flex: 1; min-width: 0; font-size: 14px; line-height: 1.35; } .tx small { color: var(--text-3); font-size: 12px; }
  .go { flex: none; min-height: 44px; min-width: 72px; padding: 0 10px; border-radius: 10px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 14px var(--font); box-shadow: 0 3px 0 var(--accent-sh, #9a6a10); }
  .go:active { transform: translateY(2px); box-shadow: none; }
  .rt { margin: 0; text-align: center; font: 700 16px var(--font); }
  .muted { margin: 0; color: var(--text-3); font-size: 14px; text-align: center; }
  .shelf { display: flex; flex-direction: column; gap: var(--s2); }
  .cp { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); min-height: 48px; padding: 4px var(--s2); border-radius: 10px; background: var(--surface-2); } .cp b { font-size: 14px; } .cpb { display: flex; gap: 6px; flex: none; }
  .empty { display: grid; justify-items: center; gap: 6px; padding: var(--s5) var(--s3); text-align: center; color: var(--text-2); } .empty span { font-size: 40px; } .empty p { margin: 0; } .empty small { color: var(--text-3); }
</style>
