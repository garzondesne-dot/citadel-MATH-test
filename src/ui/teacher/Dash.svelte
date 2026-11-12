<script lang="ts">
  import type { Store } from '../../model/types';
  import type { Stud } from '../../school/dash';
  import { ALL, ALL_VIEWS, GROUPS, scope, toSheet, view } from '../../school/views';
  import { CLASSES, isBeta } from '../../school/school';
  import { download, makeXlsx } from '../../school/xlsx';
  import Sheet from '../battle/Sheet.svelte';

  // 📊 대시보드 (#125 · 시안 ⑳) — 학생 탭 [명단 · 대시보드] 의 대시보드 · 같은 데이터 · 모양 둘(기준 너비 840)
  //   폰 = 위 고정(묶음 3 → 보기 칩 · 가로 밀기 · ⬇ 엑셀) + 가운데만 넘김 / 펼친 화면 = 왼쪽 묶음 · 보기 목록 + 오른쪽 내용
  //   넓은 표 = 「번호 · 이름」 첫 열 고정 + 가로 밀기 · 색 + 글자 함께 · 이름 누름 = 학생 한 명 시트
  const { S, cls, wide = false, onpick, onclass }: { S: Store; cls: string; wide?: boolean; onpick: (s: Stud) => void; onclass: (c: string) => void } = $props();
  let vid = $state('grid');
  let lastCls = '';
  $effect(() => { if (cls !== lastCls) { lastCls = cls; vid = cls === ALL ? 'cmp' : vid === 'cmp' ? 'grid' : vid; } });
  const grp = $derived(GROUPS.findIndex((g) => g.views.some((x) => x[0] === vid)));
  const V = $derived(view(S, cls, vid));
  const sc = $derived(scope(S, cls));
  let xl = $state(false), withX = $state(false), xlPick = $state<'all' | 'cls' | 'view'>('cls'), toast = $state('');
  const ymd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function excel() {
    const name = `모두의던전_대시보드_${xlPick === 'all' ? '전체' : cls}_${ymd()}.xlsx`;
    let sheets;
    if (xlPick === 'all') sheets = [toSheet(view(S, ALL, 'cmp', withX), withX), ...CLASSES.filter((c) => withX || !isBeta(S, c)).map((c) => ({ ...toSheet(view(S, c, 'grid', withX), withX), name: `${c}반` }))];
    else if (xlPick === 'cls') sheets = ALL_VIEWS.filter((v) => cls === ALL || v !== 'cmp').map((v) => toSheet(view(S, cls, v, withX), withX));
    else sheets = [toSheet(view(S, cls, vid, withX), withX)];
    download(makeXlsx(sheets), name);
    xl = false; toast = `⬇ ${name}`; setTimeout(() => (toast = ''), 2600);
  }
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); toast = '📋 복사했어요'; } catch { toast = '복사가 막혔어요'; } setTimeout(() => (toast = ''), 1600); }
</script>

<div class="dash" class:wide>
  <div class="nav">
    <div class="grp" role="tablist" aria-label="묶음">{#each GROUPS as g, k (g.name)}<button type="button" role="tab" class:on={grp === k} aria-selected={grp === k} onclick={() => (vid = g.views.find((x) => cls === ALL || x[0] !== 'cmp')?.[0] ?? g.views[0]![0])}>{g.name}</button>{/each}</div>
    <div class="vws" role="tablist" aria-label="보기">{#each wide ? GROUPS.flatMap((g) => g.views) : GROUPS[grp]?.views ?? [] as [k, t] (k)}<button type="button" role="tab" class:on={vid === k} aria-selected={vid === k} disabled={k === 'cmp' && cls !== ALL} onclick={() => (vid = k)}>{t}</button>{/each}</div>
    <button type="button" class="xlb" onclick={() => { xlPick = cls === ALL ? 'all' : 'cls'; xl = true; }}>⬇ 엑셀</button>
  </div>
  <div class="body">
    {#if sc.xN || sc.betas.length}<p class="excl">🧪 시험 계정 {sc.xN}{sc.betas.length ? ` · 베타 반 ${sc.betas.join(' · ')}` : ''} 은 {cls === ALL ? '빠졌어요' : isBeta(S, cls) ? '이 반 = 통계에서 빠짐' : '전체 통계에서 빠져요'}</p>{/if}
    <div class="vh"><b>{V.title}</b><span class="ib" title={V.info}>ⓘ</span><small>{V.info}</small></div>
    {#if V.kpis}<div class="kpis">{#each V.kpis as k (k.lab)}<div class="kp"><small>{k.lab}</small><b>{k.big}</b><em>{k.sub}</em></div>{/each}</div>{/if}
    {#if V.table}
      <div class="tw"><table>
        <thead><tr>{#each V.table.head as h, i (i)}<th class:sk={i === 0}>{h}</th>{/each}</tr></thead>
        <tbody>{#each V.table.rows as r, ri (ri)}<tr class:sum={r.sum} class:click={!!r.pick || !!r.cls} onclick={() => (r.pick ? onpick(r.pick) : r.cls ? onclass(r.cls) : null)}>{#each r.cells as c, i (i)}<td class="{c.tone ?? ''}" class:sk={i === 0}>{c.t}</td>{/each}</tr>{/each}</tbody>
      </table></div>
      <p class="leg">{#each V.table.legend as [t, s] (s)}<span class={t}>{s}</span>{/each}{cls === ALL && vid === 'cmp' ? ' · 반을 누르면 그 반' : ''}</p>
    {/if}
    {#if V.bars}<div class="charts">{#each V.bars as b (b.title)}{@const mx = Math.max(1, ...b.vals)}<div class="chart"><small>{b.title}</small><div class="bars">{#each b.vals as v, i (i)}<span class="bc"><i style:height="{(v / mx) * 100}%"></i>{#if i === b.vals.length - 1}<b>{v}</b>{/if}<em>{b.labels[i]}</em></span>{/each}</div><p>{b.foot}</p></div>{/each}</div>{/if}
    {#if V.list}<div class="list">{#each V.list as x, i (i)}<button type="button" class="dl" disabled={!x.pick} onclick={() => x.pick && onpick(x.pick)}><span class="rk">{x.rk}</span><span class="nm"><b>{x.nm}</b><small>{x.sub}</small></span>{#if x.pc}<span class="pc">{x.pc}</span>{/if}{#if x.bar != null}<i class="bar" style:width="{x.bar * 100}%"></i>{/if}</button>{/each}</div>{/if}
    {#if V.memos}
      <div class="row"><button type="button" class="b2" onclick={() => copy(V.memos!.map((m) => `${m.s.n}번 ${m.s.name} ${m.text}`).join('\n\n'))}>📋 전체 복사</button><small>기록의 사실만으로 만든 초안 · 관찰을 더해 다듬기</small></div>
      {#each V.memos as m (m.s.cls + m.s.n)}<div class="memo"><b>{m.s.n}번 {m.s.name}</b><p>{m.text}</p>{#if m.more.length}<details class="more"><summary>더 보기 {m.more.length} · 골라 붙이기</summary>{#each m.more as t (t)}<button type="button" class="mline" onclick={() => copy(t)}>＋ {t}</button>{/each}</details>{/if}<button type="button" class="b2" onclick={() => copy(m.text)}>복사</button></div>{/each}
    {/if}
  </div>
</div>

{#if xl}
  <Sheet onclose={() => (xl = false)}>
    {#snippet title()}⬇ 엑셀로 받기{/snippet}
    {#snippet act()}<button type="button" class="btn" onclick={excel}>받기</button>{/snippet}
    <button type="button" class="xo" class:on={xlPick === 'all'} onclick={() => (xlPick = 'all')}><span>🏫</span><span><b>전체 · 한 파일</b><small>「반 비교」 시트 + 반마다 시트{withX ? '' : ' (🧪 베타 반 빠짐)'}</small></span></button>
    <button type="button" class="xo" class:on={xlPick === 'cls'} disabled={cls === ALL} onclick={() => (xlPick = 'cls')}><span>{cls === ALL ? '—' : cls}</span><span><b>지금 반만</b><small>{cls === ALL ? '반 칩을 고르면' : `${cls}반 보기 11개를 시트로`}</small></span></button>
    <button type="button" class="xo" class:on={xlPick === 'view'} onclick={() => (xlPick = 'view')}><span>📄</span><span><b>지금 보는 표만</b><small>{V.title} · 시트 1개</small></span></button>
    <label class="ck"><input type="checkbox" bind:checked={withX} /> 🧪 베타 반 · 시험 계정도 넣기 (「구분」 열)</label>
    <small class="fn">파일 · 모두의던전_대시보드_{xlPick === 'all' ? '전체' : cls}_{ymd()}.xlsx · 기기 안에서 바로 만들어요(서버로 안 보냄)</small>
  </Sheet>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .dash { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .nav { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: 6px; position: relative; }
  .grp, .vws { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
  .grp { padding-right: 72px; }
  .grp button { flex: none; height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 13px var(--font); white-space: nowrap; }
  .grp button.on { color: var(--text); border-color: var(--accent); background: var(--surface-2); }
  .vws button { flex: none; height: 32px; padding: 0 11px; border-radius: 16px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 12.5px var(--font); white-space: nowrap; }
  .vws button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .vws button:disabled { opacity: 0.35; }
  .xlb { position: absolute; right: var(--s4); top: 0; height: 34px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--gem); background: var(--bg); color: var(--gem); font: 700 13px var(--font); }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s2); }
  .excl { margin: 0; align-self: flex-start; font-size: 12px; color: var(--text-2); padding: 2px 10px; border-radius: 12px; border: 1px dashed var(--line); }
  .vh { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .vh b { font-size: 16px; flex: none; } .vh .ib { flex: none; color: var(--text-3); }
  .vh small { min-width: 0; font-size: 12px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .kp { border-radius: var(--r); background: var(--surface); padding: 8px 10px; display: flex; flex-direction: column; min-width: 0; }
  .kp small { font-size: 12px; color: var(--text-2); font-weight: 700; } .kp b { font-size: 20px; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .kp em { font-style: normal; font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tw { overflow-x: auto; border-radius: var(--r); border: 1px solid var(--line); }
  table { border-collapse: separate; border-spacing: 0; font-size: 13px; min-width: 100%; }
  th, td { padding: 7px 8px; white-space: nowrap; text-align: center; border-bottom: 1px solid var(--line); background: var(--surface); }
  th { font-size: 12px; color: var(--text-2); position: sticky; top: 0; }
  .sk { position: sticky; left: 0; z-index: 1; text-align: left; background: var(--surface-2); font-weight: 700; }
  tr.click { cursor: pointer; } tr.sum td { background: var(--surface-2); font-weight: 700; }
  td.ok { color: var(--ok); } td.md { color: #f0a24a; } td.ng { color: var(--bad); } td.na { color: var(--text-3); } td.bo { color: var(--gem); }
  .leg { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: var(--text-2); }
  .leg .ok { color: var(--ok); } .leg .md { color: #f0a24a; } .leg .ng { color: var(--bad); } .leg .na { color: var(--text-3); } .leg .bo { color: var(--gem); }
  .charts { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .chart { border-radius: var(--r); background: var(--surface); padding: 10px; } .chart small { font-size: 12.5px; color: var(--text-2); font-weight: 700; } .chart p { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
  .bars { height: 110px; display: flex; gap: 6px; align-items: flex-end; padding-top: 18px; }
  .bc { position: relative; flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
  .bc i { width: 100%; border-radius: 4px 4px 0 0; background: var(--accent); display: block; min-height: 2px; }
  .bc b { position: absolute; top: -16px; font-size: 12px; color: var(--text); } .bc em { font-style: normal; font-size: 10.5px; color: var(--text-3); margin-top: 2px; }
  .list { display: flex; flex-direction: column; gap: 5px; }
  .dl { position: relative; overflow: hidden; display: flex; align-items: center; gap: var(--s2); min-height: 48px; padding: 4px 10px; border-radius: var(--r); border: 0; background: var(--surface); color: var(--text); font: inherit; text-align: left; }
  .dl:disabled { opacity: 1; }
  .rk { flex: none; min-width: 34px; font-weight: 700; color: var(--text-2); font-size: 13px; } .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; z-index: 1; }
  .nm b { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .nm small { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pc { flex: none; font-size: 13px; font-weight: 700; color: var(--accent); z-index: 1; }
  .bar { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--accent); opacity: 0.7; }
  .row { display: flex; align-items: center; gap: var(--s2); } .row small { font-size: 12px; color: var(--text-3); }
  .memo { border-radius: var(--r); background: var(--surface); padding: 10px; display: flex; flex-direction: column; gap: 4px; } .memo p { margin: 0; font-size: 13.5px; line-height: 1.55; } .memo .b2 { align-self: flex-end; }
  .more { font-size: 13px; color: var(--text-2); } .more summary { cursor: pointer; min-height: 32px; }
  .mline { display: block; width: 100%; text-align: left; border: 0; background: none; color: var(--text-2); font: 500 13px var(--font); padding: 4px 0; }
  .b2 { height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 13px var(--font); }
  .xo { display: flex; align-items: center; gap: var(--s3); min-height: 56px; padding: 0 var(--s3); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: inherit; text-align: left; }
  .xo > span:first-child { flex: none; min-width: 36px; font-weight: 700; } .xo span:last-child { display: flex; flex-direction: column; } .xo small { font-size: 12.5px; color: var(--text-2); }
  .xo.on { border: 2px solid var(--accent); } .xo:disabled { opacity: 0.4; }
  .ck { display: flex; align-items: center; gap: var(--s2); font-size: 14px; min-height: 44px; } .ck input { width: 22px; height: 22px; }
  .fn { font-size: 12px; color: var(--text-3); }
  /* 펼친 화면 (≥ 840): 왼쪽 묶음 · 보기 목록 + 오른쪽 내용 · 목록 = 한 줄 */
  .dash.wide { flex-direction: row; }
  .wide .nav { width: 230px; padding: 0 var(--s3); border-right: 1px solid var(--line); overflow: auto; }
  .wide .grp { display: none; }
  .wide .vws { flex-direction: column; overflow: visible; }
  .wide .vws button { height: 40px; border-radius: 10px; text-align: left; }
  .wide .xlb { position: static; height: 40px; }
  .wide .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .wide .charts { grid-template-columns: 1fr 1fr; }
  .wide .nm { flex-direction: row; gap: var(--s3); align-items: baseline; }
</style>
