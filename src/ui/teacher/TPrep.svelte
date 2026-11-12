<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { CLASSES, isBeta, setSlot, week } from '../../school/school';
  import { DOW, kst, PERIODS } from '../../school/bells';
  import Sheet from '../battle/Sheet.svelte';

  // 📋 준비 탭 (#124 ⑰ · 스크롤 A) — 위 고정 = 차시 ▾ + [차시 준비 · 시간표 · 도구] · 가운데만 넘김 · 아래 금빛 「🧪 n차시 테스트 해 보기」(68 · 같은 자리)
  //   차시 준비 = 기본값 네 칸(체력 기준 · 재도전 · 생각 시간 · 정찰 · 누르면 바꾸기 → 그 차시 수업을 열 때 방에 옮겨 적음) · 학습지 PDF · 영상 · 단계별 그림 n/m
  //   시간표 = 주간 표(교시 × 요일 · 칸에 반 · 누르면 반 고르기) + 진도 맞추기(반마다 다음 차시 · ±) / 도구 = 테스트 판은 준비 중
  const { S, packs, now, ontest }: { S: Store; packs: LessonPack[]; now: number; ontest: (L: LessonPack) => void } = $props();
  let lid = $state(untrack(() => packs[0]?.id ?? ''));
  const L = $derived(packs.find((p) => p.id === lid) ?? packs[0]);
  let seg = $state<'lesson' | 'week' | 'tools'>('lesson');
  let ver = $state(0);
  type Prep = { pct: number; retries: number; think: number; solve: number };
  const base = $derived<Prep>({ pct: L?.defaultPct ?? 90, retries: PROFILES.class.retries, think: PROFILES.class.thinkSec, solve: PROFILES.class.scoutSec });
  const prep = $derived.by((): Prep => { void ver; return { ...base, ...(S.get<Partial<Prep>>(`school/prep/${lid}`) || {}) }; });
  let edit = $state<keyof Prep | null>(null);
  const STEP: Record<keyof Prep, [number, number, number, string, string]> = { pct: [5, 10, 100, '%', '체력 기준'], retries: [1, 0, 5, '번', '재도전'], think: [1, 0, 30, '초', '생각 시간'], solve: [10, 0, 300, '초', '정찰'] };
  const bump = (k: keyof Prep, d: number) => { const [st, lo, hi] = STEP[k]; S.set(`school/prep/${lid}/${k}`, Math.max(lo, Math.min(hi, prep[k] + d * st))); ver++; };
  // 시간표 · 진도
  const W = $derived.by(() => { void ver; return week(S); });
  let pickCell = $state<[number, number] | null>(null);
  const prog = (c: string) => { void ver; return Number(S.get<number>(`school/prog/${c}`)) || (L?.no ?? 6) + 1; };
  const nextSlot = (c: string) => { const k = kst(now); for (let d = 0; d < 7; d++) { const dow = ((k.dow - 1 + d) % 7) + 1; for (const p of PERIODS[dow] || []) if (W[String(dow)]?.[String(p)] === c) return `${DOW[dow]} ${p}교시`; } return '시간표 없음'; };
</script>

<div class="tbar"><div class="t">준비</div></div>
<div class="fixed">
  <label class="lsel"><span class="sr">차시</span><select bind:value={lid}>{#each packs as p (p.id)}<option value={p.id}>{p.no}차시 {p.title}</option>{/each}</select></label>
  <div class="seg3" role="tablist">{#each [['lesson', '차시 준비'], ['week', '시간표'], ['tools', '도구']] as const as [k, t] (k)}<button type="button" role="tab" class:on={seg === k} aria-selected={seg === k} onclick={() => (seg = k)}>{t}</button>{/each}</div>
</div>
<div class="mid scroll">
  {#if seg === 'lesson' && L}
    <p class="lab">기본값 · 이 차시</p>
    <div class="four">{#each Object.keys(STEP) as k (k)}{@const kk = k as keyof Prep}<button type="button" onclick={() => (edit = kk)}><small>{STEP[kk][4]}</small><b>{prep[kk]}{STEP[kk][3]}</b></button>{/each}</div>
    <button type="button" class="item" disabled><span class="ic">📄</span><span class="tx"><b>학습지 PDF · 한 번에 넣기</b><small>테스트 판 · 준비 중</small></span></button>
    <button type="button" class="item" disabled><span class="ic">🎬</span><span class="tx"><b>영상 {Object.keys(L.videos || {}).length}편</b><small>테스트 판 · 준비 중</small></span></button>
    <p class="lab">단계별 그림 0 / {L.steps.filter((s) => !s.later).length}</p>
    <div class="steps">{#each L.steps.filter((s) => !s.later) as s (s.id)}<div class="st"><i>⚠</i><b>{s.title.split(' · ')[0]}</b><small>{s.title.split(' · ').slice(1).join(' · ') || (s.kind === 'boss' ? `${L.boss?.items ?? 0}문항` : '')}</small><em>넣기 ›</em></div>{/each}</div>
  {:else if seg === 'week'}
    <p class="lab">정규 시간표 · 매주 반복</p>
    <div class="sg" role="grid" aria-label="시간표">
      <span></span>{#each [1, 2, 3, 4, 5] as d (d)}<b>{DOW[d]}</b>{/each}
      {#each [1, 2, 3, 4, 5, 6, 7] as p (p)}
        <b>{p}</b>
        {#each [1, 2, 3, 4, 5] as d (d)}{@const c = W[String(d)]?.[String(p)] || ''}<button type="button" class:on={!!c} disabled={!(PERIODS[d] || []).includes(p)} onclick={() => (pickCell = [d, p])}>{c || '—'}</button>{/each}
      {/each}
    </div>
    <p class="hint">칸을 누르면 반 고르기</p>
    <p class="lab">진도 맞추기 · 반마다 다음 차시</p>
    <div class="list">
      {#each CLASSES as c (c)}
        <div class="pg"><b>{c}{isBeta(S, c) ? ' 🧪' : ''}</b><span>다음 {prog(c)}차시 · <small>{nextSlot(c)}</small></span>
          <button type="button" aria-label="{c} 진도 당기기" onclick={() => { S.set(`school/prog/${c}`, Math.max(1, prog(c) - 1)); ver++; }}>−</button><button type="button" aria-label="{c} 진도 밀기" onclick={() => { S.set(`school/prog/${c}`, prog(c) + 1); ver++; }}>＋</button></div>
      {/each}
    </div>
  {:else}
    <div class="list">
      {#each [['📦', '차시 팩 올리기', '새 차시(v1.0) 파일을 올려 차시 목록에 더하기'], ['📊', '엑셀로 차시 만들기', '선생님 본인용 문제 은행 · 미리보기에서 정답 확인 뒤 저장'], ['🗄', '지난 차시 정리', '백업 받고 서버에서 지우기 · 사용량 줄이기']] as [ic, t, d] (t)}
        <button type="button" class="item" disabled><span class="ic">{ic}</span><span class="tx"><b>{t}</b><small>{d} · 준비 중</small></span></button>
      {/each}
    </div>
  {/if}
</div>
<div class="tact"><button type="button" class="btn" disabled={!L} onclick={() => L && ontest(L)}>🧪 {L?.no}차시 테스트 해 보기</button></div>

{#if edit}
  {@const k = edit}
  <Sheet onclose={() => (edit = null)} mainText="다 했어요">
    {#snippet title()}{STEP[k][4]} · {L?.no}차시{/snippet}
    <div class="stp"><button type="button" aria-label="줄이기" onclick={() => bump(k, -1)}>−</button><b>{prep[k]}{STEP[k][3]}</b><button type="button" aria-label="늘리기" onclick={() => bump(k, 1)}>＋</button></div>
    <p class="hint">이 차시 수업을 열 때 방에 옮겨 적어요 · 수업 중 바꾸기는 리모컨</p>
  </Sheet>
{/if}
{#if pickCell}
  {@const [d, p] = pickCell}
  <Sheet onclose={() => (pickCell = null)}>
    {#snippet title()}{DOW[d]} {p}교시{/snippet}
    <div class="g4"><button type="button" onclick={() => { setSlot(S, d, p, null); ver++; pickCell = null; }}>— 비움</button>{#each CLASSES as c (c)}<button type="button" class:on={W[String(d)]?.[String(p)] === c} onclick={() => { setSlot(S, d, p, c); ver++; pickCell = null; }}>{c}{isBeta(S, c) ? ' 🧪' : ''}</button>{/each}</div>
  </Sheet>
{/if}

<style>
  .fixed { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: var(--s2); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  select { width: 100%; height: 44px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); padding: 0 var(--s3); }
  .seg3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 3px; border-radius: 12px; background: var(--surface); }
  .seg3 button { height: 40px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font: 700 14px var(--font); }
  .seg3 button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 0 0 2px var(--accent); }
  .four { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .four button { min-height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font-family: var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 0 var(--press-sh); }
  .four small { font-size: 11.5px; color: var(--text-2); } .four b { font-size: 17px; color: var(--accent); }
  .steps { display: flex; flex-direction: column; gap: 4px; width: 100%; }
  .st { box-sizing: border-box; width: 100%; }
  .st { display: grid; grid-template-columns: 22px 70px minmax(0, 1fr) auto; gap: 6px; align-items: center; min-height: 36px; padding: 0 10px; border-radius: 10px; background: var(--surface); font-size: 13px; }
  .st i { font-style: normal; color: #f0a24a; } .st small { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .st em { font-style: normal; color: var(--text-3); font-size: 12px; }
  .sg { display: grid; grid-template-columns: 24px repeat(5, minmax(0, 1fr)); gap: 4px; align-items: center; text-align: center; font-size: 13px; }
  .sg b { color: var(--text-2); }
  .sg button { height: 38px; border-radius: 8px; border: 1px dashed var(--line); background: none; color: var(--text-3); font: 700 13px var(--font); }
  .sg button.on { border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .sg button:disabled { opacity: 0.25; }
  .pg { display: grid; grid-template-columns: 60px minmax(0, 1fr) 44px 44px; gap: 6px; align-items: center; min-height: 48px; padding: 0 0 0 12px; border-radius: var(--r); background: var(--surface); font-size: 13.5px; }
  .pg small { color: var(--text-2); }
  .pg button { height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); }
  .stp { display: grid; grid-template-columns: 64px 1fr 64px; gap: var(--s2); align-items: center; text-align: center; }
  .stp b { font-size: 28px; color: var(--accent); }
  .stp button { height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 24px var(--font); }
  .g4 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .g4 button { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .g4 button.on { border: 2px solid var(--accent); }
  .lab { margin: var(--s2) 0 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .hint { margin: 0; font-size: 12.5px; color: var(--text-3); }
</style>
