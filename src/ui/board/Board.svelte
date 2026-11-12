<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { earnDaily } from '../../model/wallet';
  import { GEM, gemsOf, kstDay } from '../../board/board';
  import Sheet from '../battle/Sheet.svelte';
  import BoardRun from './BoardRun.svelte';

  // 📋 게시판 던전 (#143 ⑥ ⑥-1 ⑦ ⑪ ⑫ · 허수아비 자리): 전체 게시판 하나 · 차시 칩 = 내가 거르기(마지막 칩 기억) · 진도 전 = 🔒
  //   1인 먼저(이 판) · 팀 모집 · 합류 = 다음 판(#143 팀) — 「＋ 모집 글」은 흐림 + 이유 한 줄
  const { S, me, save, uid, num, cls, open, onclose }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; open: boolean; onclose: () => void } = $props();
  const KEY = 'citadel-v1-board-chip';
  let chip = $state<number | 'all'>(untrack(() => { try { const v = localStorage.getItem(KEY); return v && v !== 'all' ? Number(v) : 'all'; } catch { return 'all'; } }));
  const setChip = (c: number | 'all') => { chip = c; try { localStorage.setItem(KEY, String(c)); } catch { /* 무시 */ } };
  // 진도: 그 차시 수업 기록이 있거나 · 지금 차시보다 앞 (이 기기 = 모두)
  const recs = $derived(untrack(() => (cls && num ? S.get<Record<string, unknown>>(`records/${cls}/${num}`) : null)) || {});
  const reach = $derived(Math.max(0, ...Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0)));
  const LESSONS = PACKS.filter((p) => !p.partOf && (p.steps.some((s) => s.kind === 'monster') || p.boss));
  const isOpen = (p: LessonPack) => !cls || !!recs[p.id] || p.no <= reach;
  let sheet = $state(false), pick = $state<LessonPack | null>(null), run = $state<LessonPack | null>(null);
  let res = $state<null | { L: LessonPack; right: number; total: number; f: { ok: number; bad: number; none: number; total: number }; grade: string; clear: boolean; sec: number; gem: { base: number; team: number; total: number }; got: number }>(null);
  const shortOf = (p: LessonPack) => (p.title.split(' · ')[0] ?? p.title).replace(/^\d+차시\s*/, '').slice(0, 7);
  function start() { if (!pick) return; sheet = false; run = pick; res = null; }
  function ended(r: { right: number; total: number; f: { ok: number; bad: number; none: number; total: number }; grade: string; clear: boolean; sec: number }) {
    const L = run!; run = null;
    const gem = gemsOf({ right: r.right, clear: r.clear, n: 1 }), got = earnDaily(me.wallet, gem.total, kstDay(S.now()), GEM.dayCap);
    if (got) save();
    res = { L, ...r, gem, got };
  }
  const dayLeft = $derived(GEM.dayCap - (Number(me.wallet.day?.[kstDay(S.now())]) || 0));
</script>

<div class="bd" role="dialog" aria-label="게시판 던전">
  <div class="bar"><button type="button" class="back" aria-label="캠프로" onclick={onclose}>‹</button><b class="t">📋 게시판 던전</b><span class="wal">💎 {me.wallet.gem.toLocaleString()}</span></div>
  {#if res}
    <!-- ⑪ ⑫ 결과 -->
    <div class="mid">
      <div class="card grade" class:x={!res.clear}><b class="g">{res.clear ? res.grade : '✕'}</b><span><b>{res.clear ? `${res.L.no}차시 클리어 · 등급 ${res.grade}` : '⌛ 시간이 끝났어요 · 클리어 ✕'}</b><small>첫 시도 기준 · {res.f.total}문항 중 틀림 + 미제출 {res.f.bad + res.f.none}개</small></span></div>
      <div class="stat"><span><b>{res.f.ok}</b>⭕ 맞힘</span><span><b>{res.f.bad}</b>❌ 틀림</span><span><b>{res.f.none}</b>⏭ 미제출</span></div>
      <div class="card rw">
        <div><span>💎 맞힌 소문제 {res.right} (최대 {GEM.itemMax})</span><span>{Math.min(GEM.itemMax, res.right)}</span></div>
        {#if res.clear}<div><span>⏰ 시간 안 클리어</span><span>+{GEM.clear}</span></div>{/if}
        <div class="tot"><span>받은 💎</span><span>{res.got}{res.got < res.gem.total ? ` (오늘 한도 · ${res.gem.total - res.got} 못 받음)` : ''}</span></div>
      </div>
      <p class="why">벌은 없어요 · 한 번 더 = 숫자가 새로 바뀌어요</p>
    </div>
    <div class="act"><button type="button" class="btn" onclick={() => { pick = res!.L; start(); }}>🔥 한 번 더</button><button type="button" class="btn2" onclick={() => (res = null)}>📋 게시판으로</button></div>
  {:else}
    <!-- ⑥ 전체 게시판 -->
    <div class="chips" role="group" aria-label="차시 거르기">
      <button type="button" class:on={chip === 'all'} aria-pressed={chip === 'all'} onclick={() => setChip('all')}>전체</button>
      {#each LESSONS as p (p.id)}<button type="button" class:on={chip === p.no} class:lock={!isOpen(p)} aria-pressed={chip === p.no} onclick={() => setChip(p.no)}>{isOpen(p) ? '' : '🔒 '}{p.no}</button>{/each}
    </div>
    <div class="mid">
      {#if open}<div class="card note"><b>📢 지금 {cls}반 수업 중</b><small>팀 모집은 수업 뒤에 · 혼자는 지금도 돼요</small></div>{/if}
      <div class="empty"><span>📭</span><b>{chip === 'all' ? '모집 글이 아직 없어요' : `${chip}차시 모집 글이 아직 없어요`}</b><small>혼자 시작하거나 · 팀 모집은 다음 판에서 열려요</small></div>
      <p class="why">오늘 받을 수 있는 💎 {Math.max(0, dayLeft)} / {GEM.dayCap}</p>
    </div>
    <div class="act">
      <button type="button" class="btn" onclick={() => { pick = LESSONS.find((p) => p.no === chip && isOpen(p)) ?? LESSONS.filter(isOpen).at(-1) ?? null; sheet = true; }}>⚔ 혼자 시작 ›</button>
      <button type="button" class="btn2 off" disabled>＋ 모집 글 올리기</button>
      <p class="why">{open ? '수업 중엔 모집 글을 못 올려요' : '팀 모집은 다음 판에서 열려요'}</p>
    </div>
  {/if}
</div>

{#if sheet}
  <Sheet onclose={() => (sheet = false)}>
    {#snippet title()}⚔ 어느 차시로 갈까요?{/snippet}
    {#snippet act()}<button type="button" class="btn" disabled={!pick} onclick={start}>{pick ? `⚔ ${pick.no}차시 혼자 시작` : '차시를 골라요'}</button>{/snippet}
    <div class="lgrid">{#each LESSONS as p (p.id)}<button type="button" class="lg" class:on={pick?.id === p.id} class:lock={!isOpen(p)} disabled={!isOpen(p)} aria-pressed={pick?.id === p.id} onclick={() => (pick = p)}><b>{isOpen(p) ? p.no : '🔒'}</b><small>{isOpen(p) ? shortOf(p) : `${p.no} · 진도 전`}</small></button>{/each}</div>
  </Sheet>
{/if}
{#if run}<BoardRun L0={run} {uid} {num} nick={me.nick} {cls} onend={ended} onquit={() => (run = null)} />{/if}

<style>
  .bd { position: fixed; inset: 0; z-index: 19; background: var(--bg); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); }
  .back { width: 44px; height: 48px; border: 0; background: none; color: var(--text); font-size: 26px; }
  .t { flex: 1; font-size: 18px; } .wal { height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); display: flex; align-items: center; font: 700 14px var(--font); color: var(--gem); }
  .chips { flex: none; display: flex; gap: 8px; overflow-x: auto; padding: 0 var(--s4) var(--s2); scrollbar-width: none; }
  .chips button { flex: none; height: 40px; min-width: 48px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); position: relative; }
  .chips button::before { content: ''; position: absolute; inset: -4px 0; }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .chips button.lock { border-style: dashed; color: var(--text-3); }
  .mid { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .card { background: var(--surface); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card small { font-size: 13px; color: var(--text-2); }
  .note { flex-direction: column; }
  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-3); text-align: center; }
  .empty span { font-size: 48px; } .empty b { font-size: 15px; color: var(--text-2); } .empty small { font-size: 13px; }
  .why { margin: 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .act { flex: none; padding: var(--s2) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: var(--s2); }
  .btn { min-height: var(--btn-h); border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .btn2 { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .btn2.off, .btn2:disabled { color: var(--text-3); box-shadow: none; border-style: dashed; }
  .lgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .lg { height: 72px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .lg b { font-size: 22px; } .lg small { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .lg.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .lg.on small { color: var(--on-accent); }
  .lg.lock { opacity: 0.5; border-style: dashed; box-shadow: none; }
  .grade { flex-direction: row; align-items: center; gap: 14px; } .grade .g { width: 64px; height: 64px; flex: none; border-radius: 18px; background: var(--surface-2); display: grid; place-items: center; font-size: 38px; color: var(--accent); }
  .grade.x .g { color: var(--text-3); } .grade span { display: flex; flex-direction: column; gap: 2px; }
  .stat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .stat span { background: var(--surface); border-radius: 10px; padding: 8px 0; text-align: center; display: flex; flex-direction: column; font-size: 12.5px; color: var(--text-2); } .stat b { font-size: 20px; color: var(--text); }
  .rw div { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-2); padding: 2px 0; } .rw .tot { color: var(--text); font-weight: 700; font-size: 16px; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 6px; }
</style>
