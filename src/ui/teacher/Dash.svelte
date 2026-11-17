<script lang="ts">
  import { XCLS } from '../../channel';
  import { PACKS } from '../../engine/packs';
  import PhotoBoard from './PhotoBoard.svelte';
  import type { Store } from '../../model/types';
  import type { Stud } from '../../school/dash';
  import { ALL, ALL_VIEWS, bookAll, GROUPS, scope, toSheet, view } from '../../school/views';
  import { CLASSES, isBeta } from '../../school/school';
  import { download, makeXlsx } from '../../school/xlsx';
  import Sheet from '../battle/Sheet.svelte';
  import { onDestroy, untrack } from 'svelte';
  import { liveValue } from '../room.svelte';
  import { modeLogs, modeSummary } from '../../school/study';
  import { loadCache, sheets as svSheets, surveyCache } from '../../school/survey';
  import StatsPick from './StatsPick.svelte';

  // 📊 대시보드 (#125 · 시안 ⑳) — 학생 탭 [명단 · 대시보드] 의 대시보드 · 같은 데이터 · 모양 둘(기준 너비 720 · #131)
  //   폰 = 위 고정(묶음 3칸 → 보기 칩 · 가로 밀기) + 가운데만 넘김 · ⬇ 엑셀 = 학생 탭 [명단 · 대시보드] 줄 오른쪽 끝(#131)
//   스크롤 A(#131 덧붙임): 세로 스크롤 = 가운데 내용 하나 · 표 · 목록은 내용만큼(세로 제한 없음) · 표는 가로 밀기만 · 머리 줄 고정 없음(첫 열만 고정) / 펼친 화면 = 왼쪽 묶음 · 보기 목록 + 오른쪽 내용
  //   넓은 표 = 「번호 · 이름」 첫 열 고정 + 가로 밀기 · 색 + 글자 함께 · 이름 누름 = 학생 한 명 시트
  let { S, cls, wide = false, xl = $bindable(false), onpick, onclass }: { S: Store; cls: string; wide?: boolean; xl?: boolean; onpick: (s: Stud) => void; onclass: (c: string) => void } = $props();
  let vid = $state('grid');
  let lastCls = '';
  $effect(() => { if (cls !== lastCls) { lastCls = cls; vid = cls === ALL ? 'cmp' : vid === 'cmp' ? 'grid' : vid; } });
  const grp = $derived(GROUPS.findIndex((g) => g.views.some((x) => x[0] === vid)));
  // 📝 설문 보기 = 응답(surveyA · 실시간 거울 밖)을 그 보기를 열 때 반마다 한 번 받음 · ↻ 다시 받기
  let svVer = $state(0), svBusy = $state(false);
  const svCls = () => (cls === ALL ? CLASSES.filter((c) => !isBeta(S, c)) : [cls]);
  async function svLoad() { svBusy = true; await loadCache(S, svCls()); svBusy = false; svVer++; }
  $effect(() => { if (vid === 'survey') { void cls; untrack(svLoad); } });
  // 💬 마지막 한마디 모아 보기 (정식 dash.js #sv-words 그대로: 수업 방 rooms/*/words · 반 거르기 · 거른 말 빼기 · 차시 · 반 순 · 이름 없음)
  let words = $state<{ cls: string; no: number; t: string }[] | null>(null), wBusy = $state(false);
  $effect(() => { void cls; words = null; });
  async function wordsLoad() {
    wBusy = true;
    const rooms = ((S.fetch ? await S.fetch<Record<string, { meta?: { cls?: string; lesson?: string }; words?: Record<string, { t?: string; bad?: boolean } | null> }>>('rooms').catch(() => null) : S.get<Record<string, never>>('rooms')) || {}) as Record<string, { meta?: { cls?: string; lesson?: string }; words?: Record<string, { t?: string; bad?: boolean } | null> }>;
    const want = new Set(cls === ALL ? CLASSES : [cls]);
    words = Object.values(rooms).filter((r) => r && r.meta && r.words && want.has(String(r.meta.cls))).flatMap((r) => { const no = PACKS.find((x) => x.id === r.meta!.lesson)?.no ?? 0; return Object.values(r.words || {}).filter((x) => x && x.t && !x.bad).map((x) => ({ cls: String(r.meta!.cls), no, t: String(x!.t) })); }).sort((a, b) => a.no - b.no || a.cls.localeCompare(b.cls));
    wBusy = false;
  }
  function svExcel() { const C = surveyCache(), by = Object.fromEntries(svCls().map((c) => [c, C[c] ?? []])), name = `설문응답_${cls === ALL ? '전체' : cls}_${ymd()}.xlsx`; download(makeXlsx(svSheets(by)), name); toast = `⬇ ${name}`; setTimeout(() => (toast = ''), 2600); }
  // 🌡 정식 dash.js heat: % 칸 = 바탕 5단(90↑ · 75↑ · 60↑ · 40↑ · 그 아래) · 대시보드 겉모습 = 옛 정식 (📜 2026-11-15 머리 🔨)
  const heat = (v: unknown) => { if (!v || typeof v !== 'object' || !('pct' in (v as object))) return ''; const p = (v as { pct: number }).pct * 100; return p >= 90 ? 'h5' : p >= 75 ? 'h4' : p >= 60 ? 'h3' : p >= 40 ? 'h2' : 'h1'; };
  let vopt = $state('');
  // 📊 칸 제목 눌러 정렬 (정식 dash.js sortKey · sortDir) · 처음 누르면 큰 값부터(번호 · 이름은 작은 값부터) · 같은 칸 다시 = 반대로 · 합계 줄은 맨 위 그대로
  let sortCol = $state(-1), sortDir = $state(1);
  const sortBy = (i: number) => { if (sortCol === i) sortDir = -sortDir; else { sortCol = i; sortDir = i === 0 ? 1 : -1; } };
  const keyOf = (v: unknown): number | string | null => (v == null || v === '' ? null : typeof v === 'object' ? (v as { pct: number }).pct : (v as number | string));
  const sortedRows = $derived.by(() => {
    const T = V.table; if (!T) return [];
    if (!T.sort || sortCol < 0) return T.rows;
    const sum = T.rows.filter((r) => r.sum), rest = T.rows.filter((r) => !r.sum);
    return [...sum, ...rest.slice().sort((a, b) => { const x = keyOf(a.cells[sortCol]?.v), y = keyOf(b.cells[sortCol]?.v); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * sortDir; })];
  });
  $effect(() => { void vid; void cls; sortCol = -1; });
  const V = $derived.by(() => { void svVer; void pv; void lr.v.val; return view(S, cls, vid, false, vopt); });
  // 📝 모드 바꾼 기록 (2026-11-14 제출 모드 v2 덧붙임 D · 이 기기 저장 · 서버는 출시 때 같은 꼴): 반별 한 줄 + 펼치면 학생별
  const ms = $derived(modeSummary(modeLogs(), cls === ALL ? null : cls, S.now()));
  // 🚀 진짜 기록이 서버에서 오면 다시 계산 (기록 · EXP · 💎)
  const lr = untrack(() => liveValue(S, 'records')), lx = untrack(() => liveValue(S, 'xp')), lg = untrack(() => liveValue(S, 'gem')); onDestroy(() => { lr.stop(); lx.stop(); lg.stop(); });
  // 📊 통계 칸 (넣기 · 빼기 · 연 칸)이 바뀌면 다시 계산
  let pickOpen = $state(false), pv = $state(0);
  const pStop = untrack(() => [S.watch('school/statsPick', () => pv++), S.watch('school/opened', () => pv++),
    // 📊 정식 대시보드 칸이 읽는 것 (성채 · 허수아비 · 카드 · 활용 추이 · 설문 응답 · 기호 톡) = 서버에서 받아 둠 (📜 2026-11-15)
    ...(S.kind === 'server' ? [S.watch('bonus', () => pv++), S.watch('cards', () => pv++), S.watch('act', () => pv++), ...CLASSES.map((c) => S.watch(`surveyDone/${c}`, () => pv++))] : [])]); onDestroy(() => pStop.forEach((f) => f()));
  const sc = $derived.by(() => { void lr.v.val; void lx.v.val; void lg.v.val; void pv; return scope(S, cls); });
  let withX = $state(false), xlPick = $state<'all' | 'cls' | 'view'>('cls'), toast = $state('');
  const ymd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  async function excel() {
    await svLoad().catch(() => {}); // 🐞 #55 설문 답은 「설문」 보기를 열 때만 받아 와서 엑셀에 0명 · — 로 나갔음 → 엑셀 만들기 전에 늘 받기
    const name = `모두의던전_${xlPick === 'all' ? '전체' : cls}_${ymd()}.xlsx`;
    let sheets;
    if (xlPick === 'all') sheets = bookAll(S, withX, ymd()); // 📜 #58 읽어보기 → 반 비교 → 보기 11개(반 열) · 요약 줄
    else if (xlPick === 'cls') sheets = ALL_VIEWS.filter((v) => cls === ALL || v !== 'cmp').map((v) => toSheet(view(S, cls, v, withX), withX));
    else sheets = [toSheet(view(S, cls, vid, withX), withX)];
    download(makeXlsx(sheets), name);
    xl = false; toast = `⬇ ${name}`; setTimeout(() => (toast = ''), 2600);
  }
  $effect(() => { if (xl) xlPick = untrack(() => (cls === ALL ? 'all' : 'cls')); });
  // 📜 #58 받기 단추 = 서버 기록을 다 받은 뒤 (기록 · 경험치 · 💎 · 성채 · 허수아비 · 카드 · 활용 · 명단 · 사진 · 설문 덩어리 · 다 받기 전엔 빈 칸으로 나갈 수 있어서)
  let xlReady = $state(false);
  $effect(() => { if (!xl) return; xlReady = false; untrack(() => { const c0 = CLASSES[0] ?? '1-1', f = S.fetch; const roots = ['records', 'xp', 'gem', 'bonus', 'cards', 'act', 'roster', 'accounts', 'photo', 'surveyDone', 'school'];
    void Promise.all([...(f && S.kind === 'server' ? roots.map((k) => f.call(S, `${k}/${c0}`).catch(() => null)) : []), svLoad().catch(() => {})]).then(() => { xlReady = true; pv++; }); }); });
  function csvGo() { const c = V.csv; if (!c) return; const q = (x: string | number) => { const t = String(x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + c.rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = c.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast = `📥 ${c.name}`; setTimeout(() => (toast = ''), 2600); }
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); toast = '📋 복사했어요'; } catch { toast = '복사가 막혔어요'; } setTimeout(() => (toast = ''), 1600); }
</script>

<div class="dash" class:wide>
  <div class="nav">
    <div class="grp" role="tablist" aria-label="묶음">{#each GROUPS as g, k (g.name)}<button type="button" role="tab" class:on={grp === k} aria-selected={grp === k} onclick={() => (vid = g.views.find((x) => cls === ALL || x[0] !== 'cmp')?.[0] ?? g.views[0]![0])}>{g.name}</button>{/each}</div>
    <div class="vws" role="tablist" aria-label="보기">{#each wide ? GROUPS.flatMap((g) => g.views) : GROUPS[grp]?.views ?? [] as [k, t] (k)}<button type="button" role="tab" class:on={vid === k} aria-selected={vid === k} disabled={k === 'cmp' && cls !== ALL} onclick={() => (vid = k)}>{t}</button>{/each}</div>
  </div>
  <div class="body">
    <details class="msum" data-k="modesum"><summary>📷 사진 모드 {ms.submitN}명 · 오늘 바꾼 횟수 {ms.todayN}</summary>
      {#if ms.rows.length}<ul>{#each ms.rows as r (r.who)}<li><b>{r.num != null ? `${r.num}번` : r.who}</b><span>바꾼 횟수 {r.n} · 오늘 {r.today}</span><em class:sub={r.last === 'submit'}>{r.last === 'submit' ? '📷 사진 모드' : '게임'}</em></li>{/each}</ul>{:else}<p>아직 바꾼 학생이 없어요</p>{/if}
    </details>
    {#if sc.xN || sc.betas.length}<p class="excl">🧪 시험 계정 {sc.xN}{sc.betas.length ? ` · ${XCLS} ${sc.betas.join(' · ')}` : ''} 은 {cls === ALL ? '빠졌어요' : isBeta(S, cls) ? '이 반 = 통계에서 빠짐' : '전체 통계에서 빠져요'}</p>{/if}
    <div class="vh"><b>{V.title}</b><span class="ib" title={V.info}>ⓘ</span><small>{V.info}</small></div>
    {#if ['grid', 'cmp', 'weak', 'std'].includes(vid)}<div class="row"><button type="button" class="b2" data-k="stats-pick-go" onclick={() => (pickOpen = true)}>📊 통계에 넣는 칸</button><small>수업에서 연 칸만 · 안 연 칸 = 「— 수업 안 함」</small></div>{/if}
    {#if vid === 'photo' && S.kind === 'server'}<PhotoBoard {S} cls={cls === ALL ? '' : cls} />{/if}
    {#if vid === 'survey'}<div class="row svr" data-k="sv-dash"><button type="button" class="b2" disabled={svBusy} onclick={svLoad}>{svBusy ? '받는 중…' : '↻ 다시 받기'}</button><button type="button" class="b2" onclick={svExcel}>⬇ 설문 엑셀 (요약 · 응답 · 문항)</button></div>{/if}
    {#if vid === 'survey'}<div class="words" data-k="sv-words">{#if words}<h4 class="ttl">💬 마지막 한마디 <small>({words.length}개 · 수업 화면에 이미 보인 말풍선)</small></h4>{#if words.length}<ul>{#each words as w, i (i)}<li><small>{w.cls} · {w.no ? `${w.no}차시` : ''}</small> {w.t}</li>{/each}</ul>{:else}<p class="emp">없음</p>{/if}{:else}<button type="button" class="b2" disabled={wBusy} onclick={wordsLoad}>{wBusy ? '모으는 중…' : '💬 마지막 한마디 모아 보기'}</button>{/if}</div>{/if}
    {#snippet barsBlock()}{#if V.bars}<div class="charts">{#each V.bars as b (b.title)}{@const mx = Math.max(1, ...b.vals)}<div class="chart"><small>{b.title}</small><div class="bars">{#each b.vals as v, i (i)}<span class="bc" class:est={b.est?.[i]}><i style:height="{(v / mx) * 100}%"></i><b class:now={i === b.vals.length - 1}>{v}</b><em>{b.est?.[i] ? '≈' : ''}{b.labels[i]}</em></span>{/each}</div><p>{b.foot}</p></div>{/each}</div>{/if}{/snippet}
    {#if V.pick}<label class="row vpick">{V.pick.label} <select data-k="vpick" value={V.pick.cur} onchange={(e) => (vopt = (e.currentTarget as HTMLSelectElement).value)}>{#each V.pick.opts as [v, t] (v)}<option value={v}>{t}</option>{/each}</select></label>{/if}
    {#if V.note}<p class="vnote" data-k="use-note">{V.note}</p>{/if}
    {#if V.csv}<div class="row"><button type="button" class="b2" data-k="csv" onclick={csvGo}>📥 CSV 내려받기</button></div>{/if}
    {#if V.kpis}<div class="kpis">{#each V.kpis as k (k.lab)}<div class="kp"><small>{k.lab}</small><b>{k.big.replace(/(명|회|%)$/, '')}{#if /(명|회|%)$/.test(k.big)}<small>{k.big.slice(-1)}</small>{/if}</b><em class:up={/▲/.test(k.sub)} class:dn={/▼/.test(k.sub)}>{k.sub}</em></div>{/each}</div>{/if}
    {#if V.barsFirst}{@render barsBlock()}{/if}
    {#if V.table}
      {#if V.tableTitle}<h4 class="ttl">{V.tableTitle}</h4>{/if}
      <div class="tw"><table>
        <thead><tr>{#each V.table.head as h, i (i)}<th class:sk={i === 0}>{#if V.table.sort}<button type="button" class="srt" data-k="sort" onclick={() => sortBy(i)}>{h}{sortCol === i ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</button>{:else}{h}{/if}</th>{/each}</tr></thead>
        <tbody>{#each sortedRows as r, ri (ri)}<tr class:sum={r.sum} class:click={!!r.pick || !!r.cls} onclick={() => (r.pick ? onpick(r.pick) : r.cls ? onclass(r.cls) : null)}>{#each r.cells as c, i (i)}<td class={heat(c.v) || c.tone || ''} class:sk={i === 0}>{c.t}</td>{/each}</tr>{/each}</tbody>
      </table></div>
      <p class="leg">{#each V.table.legend as [t, s] (s)}<span class={t}>{s}</span>{/each}{cls === ALL && vid === 'cmp' ? ' · 반을 누르면 그 반' : ''}</p>
    {/if}
    {#if !V.barsFirst}{@render barsBlock()}{/if}
    {#if V.boards}<div class="boards">{#each V.boards as bd (bd.title)}<section class="board" data-k="board"><h4>{bd.title} <small>{bd.note}</small></h4>{#if bd.rows.length}<ol>{#each bd.rows as r, i (i)}<li class="top{r.rk <= 3 ? r.rk : 0}"><button type="button" class="br" disabled={!r.pick} onclick={() => r.pick && onpick(r.pick)}><b>{r.rk}</b><span>{r.nm}</span><em>{r.val}</em></button></li>{/each}</ol>{:else}<p class="emp">아직 기록이 없어요</p>{/if}</section>{/each}</div>{/if}
    {#if V.list}<div class="list" class:wrap={V.listWrap}>{#each V.list as x, i (i)}<button type="button" class="dl" disabled={!x.pick} onclick={() => x.pick && onpick(x.pick)}><span class="rk">{x.rk}</span><span class="nm"><b>{x.nm}</b><small>{x.sub}</small></span>{#if x.pc}<span class="pc">{x.pc}</span>{/if}{#if x.bar != null}<i class="bar" style:width="{x.bar * 100}%"></i>{/if}</button>{/each}</div>{/if}
    {#if V.memos}
      <div class="row"><button type="button" class="b2" onclick={() => copy(V.memos!.map((m) => `${m.s.n}번 ${m.s.name} ${m.text}`).join('\n\n'))}>📋 전체 복사</button><small>기록의 사실만으로 만든 초안 · 관찰을 더해 다듬기</small></div>
      {#each V.memos as m (m.s.cls + m.s.n)}<div class="memo"><b>{m.s.n}번 {m.s.name}</b><p>{m.text}</p>{#if m.more.length}<details class="more"><summary>더 보기 {m.more.length} · 골라 붙이기</summary>{#each m.more as t (t)}<button type="button" class="mline" onclick={() => copy(t)}>＋ {t}</button>{/each}</details>{/if}<button type="button" class="b2" onclick={() => copy(m.text)}>복사</button></div>{/each}
    {/if}
  </div>
</div>

{#if pickOpen}<StatsPick {S} {cls} onclose={() => (pickOpen = false)} onchange={() => pv++} />{/if}
{#if xl}
  <Sheet onclose={() => (xl = false)}>
    {#snippet title()}⬇ 엑셀로 받기{/snippet}
    {#snippet act()}<button type="button" class="btn" data-k="xl-go" disabled={!xlReady} onclick={excel}>{xlReady ? '받기' : '기록 받는 중…'}</button>{/snippet}
    <button type="button" class="xo" class:on={xlPick === 'all'} onclick={() => (xlPick = 'all')}><span>🏫</span><span><b>전체 · 한 파일</b><small>📖 읽어보기 + 반 비교 + 보기 11개(「반」 열 · 아래 요약 줄){withX ? '' : ` (🧪 ${XCLS} 빠짐)`}</small></span></button>
    <button type="button" class="xo" class:on={xlPick === 'cls'} disabled={cls === ALL} onclick={() => (xlPick = 'cls')}><span>{cls === ALL ? '—' : cls}</span><span><b>지금 반만</b><small>{cls === ALL ? '반 칩을 고르면' : `${cls}반 보기 11개를 시트로`}</small></span></button>
    <button type="button" class="xo" class:on={xlPick === 'view'} onclick={() => (xlPick = 'view')}><span>📄</span><span><b>지금 보는 표만</b><small>{V.title} · 시트 1개</small></span></button>
    <label class="ck"><input type="checkbox" bind:checked={withX} /> 🧪 {XCLS} · 시험 계정도 넣기 (「구분」 열)</label>
    <small class="fn">파일 · 모두의던전_{xlPick === 'all' ? '전체' : cls}_{ymd()}.xlsx · 기기 안에서 바로 만들어요(서버로 안 보냄)</small>
  </Sheet>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .msum { margin: 0 0 8px; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface); font-size: 14px; }
  .msum summary { min-height: 32px; display: flex; align-items: center; font-weight: 700; cursor: pointer; }
  .msum ul { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .msum li { display: grid; grid-template-columns: 64px 1fr auto; gap: 8px; align-items: center; } .msum li span { color: var(--text-2); }
  .msum em { font-style: normal; font-weight: 700; padding: 0 8px; border-radius: 4px; border: 1px solid var(--line); } .msum em.sub { border-color: var(--text); }
  .msum p { margin: 6px 0 0; color: var(--text-3); }
  .dash { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .nav { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: 6px; position: relative; }
  .grp { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .vws { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
  .grp button { min-width: 0; min-height: 36px; padding: 2px 6px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 12.5px/1.2 var(--font); word-break: keep-all; } /* 3칸 · 좁으면 두 줄 (#131) */
  .grp button.on { color: var(--text); border-color: var(--accent); background: var(--surface-2); }
  .vws button { flex: none; height: 32px; padding: 0 11px; border-radius: 16px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 12.5px var(--font); white-space: nowrap; }
  .vws button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .vws button:disabled { opacity: 0.35; }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s2); }
  .body > * { flex-shrink: 0; }
  .excl { margin: 0; align-self: flex-start; font-size: 12px; color: var(--text-2); padding: 2px 10px; border-radius: 12px; border: 1px dashed var(--line); }
  .vh { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .vh b { font-size: 16px; flex: none; } .vh .ib { flex: none; color: var(--text-3); }
  .vh small { min-width: 0; font-size: 12px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s2); margin: var(--s2) 0 var(--s3); }
  .kp { border-radius: var(--r); background: var(--surface); border: 1px solid var(--line); padding: 10px 12px; gap: 2px; display: flex; flex-direction: column; min-width: 0; }
  .kp small { font-size: 12px; color: var(--text-2); font-weight: 700; } .kp b { font-size: clamp(22px, 6vw, 28px); font-weight: 900; line-height: 1.15; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; color: var(--text); white-space: nowrap; } .kp b small { font-size: 14px; font-weight: 700; color: var(--text-2); margin-left: 2px; } .kp em { font-style: normal; font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp em.up { color: var(--ok); } .kp em.dn { color: var(--bad); }
  .tw { overflow: auto; max-height: min(70vh, 640px); overscroll-behavior: contain; border-radius: var(--r); border: 1px solid var(--line); }
  table { border-collapse: separate; border-spacing: 0; font-size: 13px; min-width: 100%; }
  th, td { padding: 7px 8px; white-space: nowrap; text-align: center; border-bottom: 1px solid var(--line); background: var(--surface); }
  th { font-size: 12px; color: var(--text-2); position: sticky; top: 0; z-index: 2; background: var(--surface-2); } th.sk { z-index: 3; }
  .sk { position: sticky; left: 0; z-index: 1; text-align: left; background: var(--surface-2); font-weight: 700; }
  tr.click { cursor: pointer; } tr.sum td { background: var(--surface-2); font-weight: 700; }
  td.h1 { background: #4a1616; color: #ffd9d6; } td.h2 { background: #5a3a12; color: #ffe2bf; } td.h3 { background: #4d4d16; color: #f4f0c2; } td.h4 { background: #1f4d2a; color: #d4f5dc; } td.h5 { background: #13603a; color: #fff; font-weight: 700; }
  td.ok { color: var(--ok); } td.md { color: #f0a24a; } td.ng { color: var(--bad); } td.na { color: var(--text-3); } td.bo { color: var(--gem); }
  .leg { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: var(--text-2); }
  .leg .ok { color: var(--ok); } .leg .md { color: #f0a24a; } .leg .ng { color: var(--bad); } .leg .na { color: var(--text-3); } .leg .bo { color: var(--gem); }
  .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--s3); margin: var(--s2) 0 var(--s3); }
  .chart { border-radius: var(--r); background: var(--surface); border: 1px solid var(--line); padding: 10px 12px 12px; } .chart small { font-size: 12.5px; color: var(--text-2); font-weight: 700; } .chart p { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
  .bars { height: 140px; display: flex; gap: 4px; align-items: flex-end; padding-top: 18px; border-bottom: 1px solid var(--line); }
  .bc { position: relative; flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
  .bc i { width: 100%; border-radius: 4px 4px 0 0; background: var(--accent); display: block; min-height: 2px; }
  .bc.est i { background: repeating-linear-gradient(45deg, var(--accent) 0 4px, color-mix(in srgb, var(--accent) 40%, transparent) 4px 8px); opacity: 0.75; }
  .vpick { gap: var(--s2); font-size: 14px; color: var(--text-2); } .vpick select { min-height: 40px; padding: 0 10px; border-radius: var(--r-sm); background: var(--surface); color: var(--text); border: 1px solid var(--surface-2); font: inherit; }
  .srt { all: unset; cursor: pointer; display: block; white-space: nowrap; min-height: 32px; line-height: 32px; } .srt:focus-visible { outline: 2px solid var(--accent); }
  .ttl, .board h4 { margin: var(--s3) 0 var(--s2); font-size: 15px; } .board h4 small { font-weight: 500; color: var(--text-3); font-size: 12px; }
  .boards { display: grid; grid-template-columns: 1fr; gap: var(--s3); } .board { background: var(--surface); border-radius: var(--r); padding: 4px var(--s3) var(--s3); }
  .board ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; } .board .emp { color: var(--text-3); font-size: 13px; margin: 0; }
  .br { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: var(--s2); min-height: 40px; padding: 0 6px; border-radius: var(--r-sm); cursor: pointer; }
  .br b { min-width: 24px; text-align: center; color: var(--text-3); font-variant-numeric: tabular-nums; } .br span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; } .br em { font-style: normal; font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .top1 .br b { color: var(--accent); } .top1 .br { background: color-mix(in srgb, var(--accent) 12%, transparent); } .top2 .br b, .top3 .br b { color: var(--text); }
  @media (min-width: 700px) { .boards { grid-template-columns: repeat(3, 1fr); } }
  .words ul { list-style: none; margin: 0 0 var(--s3); padding: 0; display: flex; flex-direction: column; gap: 4px; } .words li { padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface); font-size: 14px; } .words li small { color: var(--text-3); margin-right: 6px; } .words .emp { color: var(--text-3); font-size: 13px; }
  .vnote { margin: 0 0 var(--s2); padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface); color: var(--text-2); font-size: 13px; }
  .bc b { position: absolute; top: -16px; font-size: 11px; font-weight: 600; color: var(--text-2); font-variant-numeric: tabular-nums; } .bc b.now { color: var(--accent); font-size: 12.5px; font-weight: 800; } .bc em { font-style: normal; font-size: 10.5px; color: var(--text-3); margin-top: 2px; }
  .list { display: flex; flex-direction: column; gap: 5px; }
  .dl { position: relative; overflow: hidden; display: flex; align-items: center; gap: var(--s2); min-height: 48px; padding: 4px 10px; border-radius: var(--r); border: 0; background: var(--surface); color: var(--text); font: inherit; text-align: left; }
  .dl:disabled { opacity: 1; }
  .list.wrap .nm small { white-space: normal; line-height: 1.45; } .list.wrap .dl { padding-top: 8px; padding-bottom: 8px; }
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
  /* 펼친 화면 (≥ 720): 왼쪽 묶음 · 보기 목록 + 오른쪽 내용 · 목록 = 한 줄 */
  .dash.wide { flex-direction: row; }
  .wide .nav { width: 230px; padding: 0 var(--s3); border-right: 1px solid var(--line); overflow: auto; }
  .wide .grp { display: none; }
  .wide .vws { flex-direction: column; overflow: visible; }
  .wide .vws button { height: 40px; border-radius: 10px; text-align: left; }
  .wide .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .wide .charts { grid-template-columns: 1fr 1fr; }
  .wide .nm { flex-direction: row; gap: var(--s3); align-items: baseline; }
</style>
