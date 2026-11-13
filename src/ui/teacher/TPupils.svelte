<script lang="ts">
  import type { Store } from '../../model/types';
  import { CLASSES, firstClass, isBeta, pasteRoster, liveOfCls } from '../../school/school';
  import { fakeClass, type Stud } from '../../school/dash';
  import { ALL } from '../../school/views';
  import Sheet from '../battle/Sheet.svelte';
  import PupilSheet from './PupilSheet.svelte';
  import Dash from './Dash.svelte';

  // 👥 학생 탭 (#124 ⑯ · 스크롤 A = 위 막대 · 반 칩 · [명단 · 대시보드] 고정 + 가운데 목록만 넘김)
  //   명단 = 3칸 격자(번호 · 이름 · Lv · 오늘 결석 흐림 · 막힘 많음 금빛 테) · 번호 누름 = 학생 한 명 시트 · 오른쪽 위 「＋ 명단」 = 붙여넣기
  const { S, ondash }: { S: Store; ondash?: (on: boolean) => void } = $props();
  let cls = $state('1-3');
  let seg = $state<'list' | 'dash'>('list');
  let who = $state<Stud | null>(null);
  let paste = $state(false), text = $state(''), ver = $state(0), toast = $state('');
  let iw = $state(400);
  const wide = $derived(seg === 'dash' && iw >= 720); // 📊 펼친 화면 (기준 너비 720 · #131 펼친 Fold7 ≈ 830)
  let xl = $state(false); // ⬇ 엑셀 = [명단 · 대시보드] 줄 오른쪽 끝 (#131 · 시안 v85 자리)
  const data = $derived.by(() => { void ver; return fakeClass(S, cls === ALL ? firstClass() : cls); });
  const live = $derived(liveOfCls(S, cls));
  const absentToday = (uid: string) => !!live && !!S.get<boolean>(`rooms/${live.code}/absent/${uid}`);
  $effect(() => ondash?.(wide));
  $effect(() => { if (seg === 'list' && cls === ALL) cls = '1-3'; });
</script>

<svelte:window bind:innerWidth={iw} />
<div class="tbar"><div class="t">학생</div><button type="button" class="tlink plus" onclick={() => { text = ''; paste = true; }}>＋ 명단</button></div>
<div class="fixed">
  <div class="chips" role="tablist" aria-label="반">{#each seg === 'dash' ? [ALL, ...CLASSES] : CLASSES as c (c)}<button type="button" role="tab" class:on={cls === c} aria-selected={cls === c} onclick={() => (cls = c)}>{c}{isBeta(S, c) ? ' 🧪' : ''}</button>{/each}</div>
  <div class="segrow"><div class="seg" role="tablist"><button type="button" role="tab" class:on={seg === 'list'} aria-selected={seg === 'list'} onclick={() => (seg = 'list')}>명단 {data.studs.length}</button><button type="button" role="tab" class:on={seg === 'dash'} aria-selected={seg === 'dash'} onclick={() => (seg = 'dash')}>대시보드</button></div>{#if seg === 'dash'}<button type="button" class="xlb" onclick={() => (xl = true)}>⬇ 엑셀</button>{/if}</div>
</div>
{#if seg === 'list'}
  <div class="mid scroll">
    <div class="grid">
      {#each data.studs as s (s.n)}
        {@const ab = absentToday(`s${cls.replace('-', '_')}_${s.n}`)}
        <button type="button" class="pc" class:ab class:stuck={s.extra.stuck >= 3} onclick={() => (who = s)} aria-label="{s.n}번 {s.name} Lv.{s.lv}{ab ? ' 결석' : ''}"><b>{s.n}</b><span>{s.name}</span><small>Lv.{s.lv}{ab ? ' · 결석' : ''}</small></button>
      {/each}
    </div>
    <p class="hint">번호를 누르면 그 학생 · 금빛 테 = 막힘 많음 · 흐림 = 오늘 결석{isBeta(S, cls) ? ' · 🧪 베타 반 = 통계에서 빠짐' : ''}</p>
  </div>
{:else}
  <Dash {S} {cls} {wide} bind:xl onpick={(s) => (who = s)} onclass={(c) => (cls = c)} />
{/if}

{#if who}<PupilSheet {S} s={who} onclose={() => (who = null)} />{/if}
{#if paste}
  <Sheet onclose={() => (paste = false)}>
    {#snippet title()}＋ 명단 붙여넣기 · {cls}반{/snippet}
    {#snippet act()}<button type="button" class="btn" disabled={!text.trim()} onclick={() => { const n = pasteRoster(S, cls, text); ver++; paste = false; toast = n ? `명단 ${n}명을 올렸어요` : '「번호 이름」 줄을 못 찾았어요'; setTimeout(() => (toast = ''), 1800); }}>명단 올리기</button>{/snippet}
    <textarea class="ta" rows="8" bind:value={text} placeholder={'1 김민준\n2 이서연\n3 박지우\n…'}></textarea>
    <p class="hint2">한 줄에 「번호 이름」 · 시트에서 두 칸 복사해 붙여도 돼요 · 같은 번호는 이름만 바뀜</p>
  </Sheet>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .plus { color: var(--accent); }
  .segrow { display: flex; gap: 6px; align-items: stretch; } .segrow .seg { flex: 1; min-width: 0; }
  .xlb { flex: none; padding: 0 12px; border-radius: 12px; border: 1px solid var(--gem); background: var(--bg); color: var(--gem); font: 700 13.5px var(--font); white-space: nowrap; }
  .fixed { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: var(--s2); }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
  .chips button { flex: none; height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 13.5px var(--font); white-space: nowrap; }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; border-radius: 12px; background: var(--surface); }
  .seg button { height: 40px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font: 700 14px var(--font); }
  .seg button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 0 0 2px var(--accent); }
  :global(.tp .mid.scroll) { overflow: auto; padding-bottom: var(--s4); }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .pc { min-height: 60px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font-family: var(--font); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 6px 10px; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .pc b { font-size: 12px; color: var(--text-3); } .pc span { font-size: 15px; font-weight: 700; } .pc small { font-size: 12px; color: var(--text-2); }
  .pc.stuck { border: 2px solid var(--accent); }
  .pc.ab { opacity: 0.45; box-shadow: none; }
  .hint { margin: var(--s2) 0 0; font-size: 12.5px; color: var(--text-3); }
  .ta { width: 100%; box-sizing: border-box; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 500 15px var(--font); padding: var(--s3); }
  .hint2 { margin: 0; font-size: 12.5px; color: var(--text-3); }
</style>
