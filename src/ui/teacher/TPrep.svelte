<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { CLASSES, isBeta, week } from '../../school/school';
  import { DOW, kst, PERIODS } from '../../school/bells';
  import Sheet from '../battle/Sheet.svelte';
  import SchedEdit from './SchedEdit.svelte';
  import { feat } from '../../school/features.svelte';
  import { LESSON_LIST } from '../../school/dash';
  import PackUpload from './PackUpload.svelte';
  import PdfFill from './PdfFill.svelte';
  import VidList from './VidList.svelte';
  import { prepImg } from '../../school/prep';

  // 📋 준비 탭 (#124 ⑰ · 스크롤 A) — 위 고정 = 차시 ▾ + [차시 준비 · 시간표 · 도구] · 가운데만 넘김 · 아래 금빛 「🧪 n차시 테스트 해 보기」(68 · 같은 자리)
  //   차시 준비 = 기본값 네 칸(체력 기준 · 재도전 · 생각 시간 · 정찰 · 누르면 바꾸기 → 그 차시 수업을 열 때 방에 옮겨 적음) · 학습지 PDF · 영상 · 단계별 그림 n/m
  //   시간표 = 주간 표(교시 × 요일 · 칸에 반 · 누르면 반 고르기) + 진도 맞추기(반마다 다음 차시 · ±) / 도구 = 테스트 판은 준비 중
  //   ＋ 준비 안 된 차시(목록에만 있음 · #130 ③) = 차시 ▾ 에 「(준비 안 됨)」 · 차시 준비 = 빈 상태 + 「📦 차시 팩 올리기」 · 테스트 단추 흐림
  const { S, packs, now, ontest, want = '' }: { S: Store; packs: LessonPack[]; now: number; ontest: (L: LessonPack) => void; want?: string } = $props();
  const todo = LESSON_LIST.filter((l) => !untrack(() => packs).some((p) => p.id === l.id || p.no === l.no));
  const opts = [...untrack(() => packs).map((p) => ({ id: p.id, no: p.no, title: p.title, ready: true })), ...todo.map((l) => ({ id: l.id, no: l.no, title: l.title, ready: false }))].sort((a, b) => a.no - b.no);
  let upOpen = $state(false); // 📦 차시 팩 올리기 (L1)
  let fillOpen = $state(false), vidOpen = $state(false), imgVer = $state(0); // 📄 학습지 PDF 넣기 · 🎬 영상 목록 (📜 2026-11-14 「전부 진행해」)
  let lid = $state(untrack(() => want || packs[0]?.id || ''));
  const L = $derived(packs.find((p) => p.id === lid) ?? null);
  // 🖼 단계별 그림 = 서버 칸 그림(prep/{차시}/img/{칸 = 단계 img · id})을 실제로 읽어 셈 (🐞 2026-11-14 늘 「0 / n」 · 고정 글자였음)
  let hasImg = $state<Record<string, string | null>>({});
  $effect(() => { const Lc = L; void imgVer; hasImg = {}; if (!Lc) return; for (const st of Lc.steps.filter((x) => !x.later)) { const c = st.img ?? st.id; void prepImg(S, Lc, c).then((u) => { if (L === Lc) hasImg = { ...hasImg, [st.id]: u }; }); } });
  const nv = $derived(L ? new Set(Object.values(L.videos || {})).size : 0);
  const T = $derived(L ? null : todo.find((l) => l.id === lid) ?? null);
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
  const prog = (c: string) => { void ver; return Number(S.get<number>(`school/prog/${c}`)) || (L?.no ?? 6) + 1; };
  const nextSlot = (c: string) => { const k = kst(now); for (let d = 0; d < 7; d++) { const dow = ((k.dow - 1 + d) % 7) + 1; for (const p of PERIODS[dow] || []) if (W[String(dow)]?.[String(p)] === c) return `${DOW[dow]} ${p}교시`; } return '시간표 없음'; };
</script>

<div class="tbar"><div class="t">준비</div></div>
<div class="fixed">
  {#if packs.length}<label class="lsel"><span class="sr">차시</span><select bind:value={lid}>{#each opts as p (p.id)}<option value={p.id}>{p.no}차시 {p.title}{p.ready ? '' : ' (준비 안 됨)'}</option>{/each}</select></label>{/if}
  <div class="seg3" role="tablist">{#each (feat('schedule') ? [['lesson', '차시 준비'], ['week', '시간표'], ['tools', '도구']] as const : [['lesson', '차시 준비'], ['tools', '도구']] as const) as [k, t] (k)}<button type="button" role="tab" class:on={seg === k} aria-selected={seg === k} onclick={() => (seg = k)}>{t}</button>{/each}</div>
</div>
<div class="mid scroll">
  {#if seg === 'lesson' && !packs.length}
    <!-- 🐞 B9 (정식 0169e5f · 차시 0개 학교): 깨지지 않게 · 「아직 차시가 없어요」 + 📊 엑셀로 차시 만들기 -->
    <div class="empty none"><b class="plus">📭</b><span><b>아직 차시가 없어요</b></span><small>엑셀로 첫 차시를 만들면 여기에 생겨요</small></div>
    <button type="button" class="item" disabled><span class="ic">📊</span><span class="tx"><b>엑셀로 차시 만들기</b><small>선생님 본인용 문제 은행 · 테스트 판 · 준비 중</small></span></button>
  {:else if seg === 'lesson' && T}
    <div class="empty"><b class="plus">＋</b><span><b>{T.no}차시 {T.title}</b> · 준비 안 됨</span><small>차시 팩을 올리면 수업 열기에 생겨요</small></div>
    <button type="button" class="item" data-k="packup-go" onclick={() => (upOpen = true)}><span class="ic">📦</span><span class="tx"><b>차시 팩 올리기</b><small>입력판 양식 파일 · 검사 · 미리 보기 뒤 저장</small></span></button>
  {:else if seg === 'lesson' && L}
    <p class="lab">기본값 · 이 차시</p>
    <div class="four">{#each Object.keys(STEP) as k (k)}{@const kk = k as keyof Prep}<button type="button" onclick={() => (edit = kk)}><small>{STEP[kk][4]}</small><b>{prep[kk]}{STEP[kk][3]}</b></button>{/each}</div>
    <button type="button" class="item" data-k="pdffill-go" onclick={() => (fillOpen = true)}><span class="ic">📄</span><span class="tx"><b>학습지 PDF · 한 번에 넣기</b><small>PDF 1개 → 칸마다 잘라 단계별 그림으로</small></span></button>
    <button type="button" class="item" data-k="vid-go" disabled={!nv} onclick={() => (vidOpen = true)}><span class="ic">🎬</span><span class="tx"><b>영상 {nv}편</b><small>{nv ? `칸 ${Object.keys(L.videos || {}).length}곳 · 누르면 칸별 목록 · 재생` : '연결된 영상 없음'}</small></span></button>
    <p class="lab" data-k="stepimgs">단계별 그림 {L.steps.filter((s) => !s.later && hasImg[s.id]).length} / {L.steps.filter((s) => !s.later).length}</p>
    <div class="steps">{#each L.steps.filter((s) => !s.later) as s (s.id)}<div class="st" class:has={!!hasImg[s.id]}>{#if hasImg[s.id]}<img class="th" src={hasImg[s.id]} alt="" />{:else}<i>⚠</i>{/if}<b>{s.title.split(' · ')[0]}</b><small>{s.title.split(' · ').slice(1).join(' · ') || (s.kind === 'boss' ? `${L.boss?.items ?? 0}문항` : '')}</small><em>{hasImg[s.id] ? '✔ 있음' : '넣기 ›'}</em></div>{/each}</div>
  {:else if seg === 'week' && feat('schedule')}
    <SchedEdit {S} />
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
        {#if ic === '📦'}<button type="button" class="item" data-k="packup-go" onclick={() => (upOpen = true)}><span class="ic">{ic}</span><span class="tx"><b>{t}</b><small>{d}</small></span></button>
        {:else}<button type="button" class="item" disabled><span class="ic">{ic}</span><span class="tx"><b>{t}</b><small>{d} · 준비 중</small></span></button>{/if}
      {/each}
    </div>
  {/if}
</div>
{#if upOpen}<PackUpload {S} onclose={() => (upOpen = false)} />{/if}
{#if fillOpen && L}<PdfFill {S} {L} onclose={() => (fillOpen = false)} ondone={() => imgVer++} />{/if}
{#if vidOpen && L}<VidList {S} {L} onclose={() => (vidOpen = false)} />{/if}
<div class="tact"><button type="button" class="btn" disabled={!L} onclick={() => L && ontest(L)}>{#if L}🧪 {L.no}차시 테스트 해 보기{:else}🧪 테스트 해 보기<small>{T ? `${T.no}차시는 아직 준비 안 됨` : packs.length ? '차시를 골라요' : '차시를 먼저 만들어요'}</small>{/if}</button></div>

{#if edit}
  {@const k = edit}
  <Sheet onclose={() => (edit = null)} mainText="다 했어요">
    {#snippet title()}{STEP[k][4]} · {L?.no}차시{/snippet}
    <div class="stp"><button type="button" aria-label="줄이기" onclick={() => bump(k, -1)}>−</button><b>{prep[k]}{STEP[k][3]}</b><button type="button" aria-label="늘리기" onclick={() => bump(k, 1)}>＋</button></div>
    <p class="hint">이 차시 수업을 열 때 방에 옮겨 적어요 · 수업 중 바꾸기는 리모컨</p>
  </Sheet>
{/if}

<style>
  .st .th { width: 40px; height: 28px; object-fit: cover; object-position: top; border-radius: 4px; background: #fff; flex: none; }
  .fixed { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: var(--s2); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  select { width: 100%; height: 44px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); padding: 0 var(--s3); }
  .seg3 { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; padding: 3px; border-radius: 12px; background: var(--surface); }
  .seg3 button { height: 40px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font: 700 14px var(--font); }
  .seg3 button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 0 0 2px var(--accent); }
  .four { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .four button { min-height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font-family: var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 0 var(--press-sh); }
  .four small { font-size: 11.5px; color: var(--text-2); } .four b { font-size: 17px; color: var(--accent); }
  .steps { display: flex; flex-direction: column; gap: 4px; width: 100%; }
  .st { box-sizing: border-box; width: 100%; }
  .st { display: grid; grid-template-columns: 22px 70px minmax(0, 1fr) auto; gap: 6px; align-items: center; min-height: 36px; padding: 0 10px; border-radius: 10px; background: var(--surface); font-size: 13px; }
  .st i { font-style: normal; color: #f0a24a; } .st small { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .st em { font-style: normal; color: var(--text-3); font-size: 12px; }
  .pg { display: grid; grid-template-columns: 60px minmax(0, 1fr) 44px 44px; gap: 6px; align-items: center; min-height: 48px; padding: 0 0 0 12px; border-radius: var(--r); background: var(--surface); font-size: 13.5px; }
  .pg small { color: var(--text-2); }
  .pg button { height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); }
  .stp { display: grid; grid-template-columns: 64px 1fr 64px; gap: var(--s2); align-items: center; text-align: center; }
  .stp b { font-size: 28px; color: var(--accent); }
  .stp button { height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 24px var(--font); }
  .plus { width: 56px; height: 56px; border-radius: 14px; border: 2px dashed var(--line); color: var(--accent); display: grid; place-items: center; font-size: 28px !important; }
  .empty small { font-size: 13px; color: var(--text-3); }
  .lab { margin: var(--s2) 0 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .hint { margin: 0; font-size: 12.5px; color: var(--text-3); }
</style>
