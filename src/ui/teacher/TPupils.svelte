<script lang="ts">
  import { XCLS } from '../../channel';
  import type { Store } from '../../model/types';
  import { CLASSES, firstClass, isBeta, pasteRoster, liveOfCls } from '../../school/school';
  import { classData, type Stud } from '../../school/dash';
  import { watchGems } from '../../school/gemwatch';
  import { ALL } from '../../school/views';
  import Sheet from '../battle/Sheet.svelte';
  import { onDestroy, untrack } from 'svelte';
  import { liveValue } from '../room.svelte';
  import PupilSheet from './PupilSheet.svelte';
  import Dash from './Dash.svelte';
  import SchedTab from './SchedTab.svelte';
  import { hiddenCls } from './flow'; // 🧪 테스트 전용 반(1-6) = 대시보드 반 목록에서 숨김 · 명단은 그대로 (📜 2026-11-17 #21)
  import { schoolInfo } from '../../school/features.svelte';

  // 👥 학생 탭 (#124 ⑯ · 스크롤 A = 위 막대 · 반 칩 · [명단 · 대시보드] 고정 + 가운데 목록만 넘김)
  //   명단 = 3칸 격자(번호 · 이름 · Lv · 오늘 결석 흐림 · 막힘 많음 금빛 테) · 번호 누름 = 학생 한 명 시트 · 오른쪽 위 「＋ 명단」 = 붙여넣기
  const { S, ondash, now = Date.now() }: { S: Store; ondash?: (on: boolean) => void; now?: number } = $props();
  // 👥 반 · 시간표 (📜 2026-11-16 DECISIONS 「📋 교사 준비 탭 2개」): 위 탭 = 👥 학생 · 📅 시간표(옛 준비 탭 시간표 · 자리만)
  let top = $state<'stu' | 'sched'>((() => { try { return new URLSearchParams(location.search).get('sub') === 'sched' ? 'sched' : 'stu'; } catch { return 'stu'; } })());
  let cls = $state('1-3');
  let seg = $state<'list' | 'dash'>('list');
  let who = $state<Stud | null>(null);
  let paste = $state(false), text = $state(''), ver = $state(0), toast = $state('');
  let iw = $state(400);
  const wide = $derived(seg === 'dash' && iw >= 720); // 📊 펼친 화면 (기준 너비 720 · #131 펼친 Fold7 ≈ 830)
  let xl = $state(false); // ⬇ 엑셀 = [명단 · 대시보드] 줄 오른쪽 끝 (#131 · 시안 v85 자리)
  // 🚀 진짜 기록이 서버에서 오면 다시 계산 (기록 · EXP · 💎)
  const lr = untrack(() => liveValue(S, 'records')), lx = untrack(() => liveValue(S, 'xp')), lg = untrack(() => liveValue(S, 'gem')); onDestroy(() => { lr.stop(); lx.stop(); lg.stop(); });
  const data = $derived.by(() => { void ver; void lr.v.val; void lx.v.val; void lg.v.val; return classData(S, cls === ALL ? firstClass() : cls); });
  // 🚩 💎 급증 (school/gemwatch.ts · 교사만 · 학생에겐 안 보임): 볼 때마다 사진 비교
  const lf = untrack(() => liveValue<Record<string, Record<string, unknown>>>(S, 'school/gemFlag')); onDestroy(lf.stop);
  $effect(() => { void lg.v.val; const c = cls === ALL ? null : cls; if (c) untrack(() => watchGems(S, c)); });
  const flagged = (c: string, n: number) => !!lf.v.val?.[c]?.[n];
  const live = $derived(liveOfCls(S, cls));
  const absentToday = (uid: string) => !!live && !!S.get<boolean>(`rooms/${live.code}/absent/${uid}`);
  $effect(() => ondash?.(wide));
  // 🏫 반 만들기 · 지우기 = 「＋ 명단」 창 맨 위 (📜 2026-11-16 선생님 「학교 정보에서 학년 반 집어넣는 부분을 학생 + 명단에 넣어 주면 오히려 직관적」 · 저장 자리 school/info/classes 그대로)
  const clsNow = $derived.by(() => { void schoolInfo.ver; return [...CLASSES]; });
  let pcls = $state(''), mk = $state(false), nc = $state(''), delAsk = $state('');
  const ncOk = $derived(/^\d{1,2}-\d{1,2}$/.test(nc.trim()) && !clsNow.includes(nc.trim()));
  function openPaste() { text = ''; pcls = cls === ALL ? firstClass() : cls; mk = false; nc = ''; paste = true; }
  function makeCls() { const c = nc.trim(); if (!ncOk) return; S.set('school/info/classes', [...clsNow, c]); pcls = c; mk = false; nc = ''; }
  function delCls(c: string) { const rest = clsNow.filter((x) => x !== c); if (!rest.length) return; S.set('school/info/classes', rest); if (pcls === c) pcls = rest[0]!; if (cls === c) cls = rest[0]!; delAsk = ''; }
  $effect(() => { if (seg === 'list' && cls === ALL) cls = '1-3'; });
  /** 📮 #81 B 학생 폰 보관함에 남은 기록 수 (accounts/{반}/{번호}/pend · 7일 지난 표시는 안 셈) */
  let pv = $state(0); $effect(() => untrack(() => S.watch('accounts', () => { untrack(() => { pv++; }); }))); // 🐞 #127 서버 watch 는 값이 있으면 바로 부름 → 효과 안에서 pv 를 읽고 써서 끝없이 다시 돎(effect_update_depth_exceeded · 「서버 값이 덜 와서」) = untrack (Title.svelte 와 같은 꼴)
  const pendOf = (c: string, n: number): number => { void pv; const x = S.get<{ n?: number; at?: number }>(`accounts/${c}/${n}/pend`); return x && x.n && S.now() - (x.at || 0) < 7 * 86400e3 ? x.n : 0; };
  const pendN = () => data.studs.filter((s) => pendOf(cls, s.n)).length;
</script>

<svelte:window bind:innerWidth={iw} />
<div class="tbar"><div class="t">반 · 시간표</div>{#if top === 'stu'}<button type="button" class="tlink plus" data-k="roster-open" onclick={openPaste}>＋ 명단</button>{/if}</div>
<div class="toptab" role="tablist" aria-label="반 · 시간표"><button type="button" role="tab" data-k="top-stu" class:on={top === 'stu'} aria-selected={top === 'stu'} onclick={() => (top = 'stu')}>👥 학생</button><button type="button" role="tab" data-k="top-sched" class:on={top === 'sched'} aria-selected={top === 'sched'} onclick={() => { top = 'sched'; seg = 'list'; }}>📅 시간표</button></div>
{#if top === 'sched'}
  <div class="mid scroll"><SchedTab {S} {now} /></div>
{:else}
<div class="fixed">
  <div class="chips" role="tablist" aria-label="반">{#each seg === 'dash' ? [ALL, ...clsNow.filter((c) => !hiddenCls(S, c))] : clsNow.filter((c) => !hiddenCls(S, c)) as c (c)}<!-- 🐞 #60-6 🧪 1-6 = 반 칩에서도 숨김 (명단 붙이기 반 고르기 · 학생 로그인 반 목록 = 그대로) --><button type="button" role="tab" class:on={cls === c} aria-selected={cls === c} onclick={() => (cls = c)}>{c}{isBeta(S, c) ? ' 🧪' : ''}</button>{/each}</div>
  <div class="segrow"><div class="seg" role="tablist"><button type="button" role="tab" class:on={seg === 'list'} aria-selected={seg === 'list'} onclick={() => (seg = 'list')}>명단 {data.studs.length}</button><button type="button" role="tab" class:on={seg === 'dash'} aria-selected={seg === 'dash'} onclick={() => (seg = 'dash')}>대시보드</button></div>{#if seg === 'dash'}<button type="button" class="xlb" onclick={() => (xl = true)}>⬇ 엑셀</button>{/if}</div>
</div>
{#if seg === 'list'}
  <div class="mid scroll">
    {#if pendN()}<p class="pendl" data-k="pend-line">⏳ 안 올라온 기록이 있는 학생 {pendN()}명 · 그 학생에게 「인터넷 켜고 앱을 한 번 열어 주세요」</p>{/if}
    <div class="grid">
      {#each data.studs as s (s.n)}
        {@const ab = absentToday(`s${cls.replace('-', '_')}_${s.n}`)}
        {@const pd = pendOf(cls, s.n)}
        <button type="button" class="pc" class:ab class:stuck={s.extra.stuck >= 3} onclick={() => (who = s)} aria-label="{s.n}번 {s.name} Lv.{s.lv}{ab ? ' 결석' : ''}{flagged(s.cls, s.n) ? ' 💎 급증' : ''}"><b>{s.n}</b><span>{s.name}{#if flagged(s.cls, s.n)} 🚩{/if}</span><small>Lv.{s.lv}{ab ? ' · 결석' : ''}{#if pd}<em class="pend" data-k="pend-n"> · ⏳ {pd}</em>{/if}</small></button>
      {/each}
    </div>
    <p class="hint">번호를 누르면 그 학생 · 금빛 테 = 막힘 많음 · 흐림 = 오늘 결석{isBeta(S, cls) ? ` · 🧪 ${XCLS} = 통계에서 빠짐` : ''}</p>
  </div>
{:else}
  <Dash {S} {cls} {wide} bind:xl onpick={(s) => (who = s)} onclass={(c) => (cls = c)} />
{/if}

{/if}
{#if who}<PupilSheet {S} s={who} onclose={() => (who = null)} />{/if}
{#if paste}
  <Sheet onclose={() => (paste = false)}>
    {#snippet title()}＋ 명단 · {pcls}반{/snippet}
    {#snippet act()}<button type="button" class="btn" disabled={!text.trim() || !pcls} onclick={() => { const n = pasteRoster(S, pcls, text); cls = pcls; ver++; paste = false; toast = n ? `${pcls}반 명단 ${n}명을 올렸어요` : '「번호 이름」 줄을 못 찾았어요'; setTimeout(() => (toast = ''), 1800); }}>{pcls}반 명단 올리기</button>{/snippet}
    <div class="pcl" role="group" aria-label="반 고르기" data-k="roster-cls">{#each clsNow as c (c)}<button type="button" class:on={pcls === c} aria-pressed={pcls === c} onclick={() => (pcls = c)}>{c}</button>{/each}<button type="button" class="mk" data-k="cls-make" aria-expanded={mk} onclick={() => (mk = !mk)}>＋ 반 만들기</button></div>
    {#if mk}<div class="mkrow"><input class="in" bind:value={nc} placeholder="예: 1-9 (학년-반)" inputmode="numeric" data-k="cls-new" /><button type="button" class="btn sm" disabled={!ncOk} data-k="cls-make-ok" onclick={makeCls}>만들기</button></div>{#if nc.trim() && !ncOk}<p class="hint2 bad">{clsNow.includes(nc.trim()) ? '이미 있는 반이에요' : '「학년-반」 꼴로 (예: 1-9)'}</p>{/if}{/if}
    {#if clsNow.length > 1}<button type="button" class="dl" data-k="cls-del" onclick={() => (delAsk = pcls)}>🗑 {pcls}반을 반 목록에서 빼기</button>{/if}
    <textarea class="ta" rows="8" bind:value={text} placeholder={'1 김민준\n2 이서연\n3 박지우\n…'}></textarea>
    <p class="hint2">한 줄에 「번호 이름」 · 시트에서 두 칸 복사해 붙여도 돼요 · 같은 번호는 이름만 바뀜</p>
  </Sheet>
{/if}
{#if delAsk}
  <div class="askbg" role="presentation" onclick={() => (delAsk = '')}></div>
  <div class="ask" role="alertdialog" aria-modal="true" aria-label="정말?" data-k="cls-del-ask"><b>정말 {delAsk}반을 뺄까요?</b><p>반 목록에서만 빠져요 · 명단 · 기록은 그대로 남고 다시 만들면 돌아와요</p>
    <div class="row"><button type="button" class="btn2" onclick={() => (delAsk = '')}>아니요</button><button type="button" class="btn" data-k="cls-del-yes" onclick={() => delCls(delAsk)}>빼기</button></div></div>
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .pendl { margin: 0 0 8px; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface-2); color: var(--text); font: 600 14px var(--font); }
  .pc small em.pend { font-style: normal; color: var(--accent); font-weight: 700; }
  .toptab { display: flex; gap: 6px; margin: 0 0 8px; padding: 4px; border-radius: var(--r); background: var(--surface); } .toptab button { flex: 1; min-height: 44px; border-radius: var(--r-sm); border: 2px solid transparent; background: none; color: var(--text-2); font: 700 15px var(--font); } .toptab button.on { border-color: var(--accent); color: var(--text); }
  .pcl { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; } .pcl button { min-height: 44px; min-width: 56px; padding: 0 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); } .pcl button.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); } .pcl .mk { color: var(--accent); border-style: dashed; }
  .mkrow { display: flex; gap: 8px; margin-bottom: 8px; } .mkrow .in { flex: 1; min-width: 0; min-height: 44px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 600 15px var(--font); padding: 0 10px; } .btn.sm { min-height: 44px; padding: 0 16px; }
  .hint2.bad { color: var(--bad); } .dl { display: block; margin: 8px 0 0; background: none; border: 0; color: var(--text-3); font: 600 13px var(--font); text-decoration: underline; min-height: 44px; }
  .askbg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 60; } .ask { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(340px, calc(100vw - 32px)); background: var(--surface); border-radius: var(--r-lg); padding: 20px; z-index: 61; } .ask p { color: var(--text-2); font-size: 14px; } .ask .row { display: flex; gap: 8px; } .ask .row button { flex: 1; min-height: 48px; }
  .plus { color: var(--accent); }
  .segrow { display: flex; gap: 6px; align-items: stretch; } .segrow .seg { flex: 1; min-width: 0; }
  .xlb { flex: none; padding: 0 12px; border-radius: 12px; border: 1px solid var(--gem); background: var(--bg); color: var(--gem); font: 700 13.5px var(--font); white-space: nowrap; }
  .fixed { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: var(--s2); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; } /* 🐞 #62-1 360 폭 = 두 줄로 감김 (1-7 · 1-8 이 잘려 안 보이던 것) */
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
