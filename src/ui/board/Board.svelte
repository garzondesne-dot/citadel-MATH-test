<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { heroOf } from '../../model/hero';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay, TEAM_X, type firstTry } from '../../board/board';
  import { bonusOf, canJoin, canStart, createPost, hasGuard, joinPost, leavePost, MAX, membersOf, POSTS, RANK, rankOf, setReady, startTeam, weekOf, type Post, type RankRow, type Role } from '../../board/team';
  import { liveValue } from '../room.svelte';
  import { lastClass, lastTest } from '../../school/school';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import BoardRun from './BoardRun.svelte';

  // 📋 게시판 던전 (#143 ⑥ ⑥-1 ⑦ ⑧ ⑪ ⑫ ⑬ · 허수아비 자리): 전체 게시판 하나 · 차시 칩 = 내가 거르기 · 진도 전 = 🔒 · 모집 글 = 「n차시 · k / 4」 + 반 꼬리표 + 🛡 있음 / 🌱 도전자만(이름 · 번호 없음)
  //   ⚔ 혼자 시작 › · ＋ 모집 글 → 차시 고르기 시트 · 내 반 수업 중 = 모집 · 합류만 막힘 · 다른 반도 합류(그 차시 진도를 나간 학생만) · 서버가 끊기면 팀 단추만 흐림
  const { S, me, save, uid, num, cls, open, onclose }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; open: boolean; onclose: () => void } = $props();
  const KEY = 'citadel-v1-board-chip';
  let chip = $state<number | 'all'>(untrack(() => { try { const v = localStorage.getItem(KEY); return v && v !== 'all' ? Number(v) : 'all'; } catch { return 'all'; } }));
  const setChip = (c: number | 'all') => { chip = c; try { localStorage.setItem(KEY, String(c)); } catch { /* 무시 */ } };
  // 진도: 그 차시 수업 기록이 있거나 · 기록이 있는 가장 뒤 차시까지 (반이 없는 기기 = 모두)
  const recs = untrack(() => (cls && num ? S.get<Record<string, { right?: number; total?: number; boss?: number | { ok?: number; items?: number }; bossN?: number; mons?: Record<string, unknown> }>>(`records/${cls}/${num}`) : null)) || {};
  // 반 진도 = 그 반이 마지막으로 연 차시(school/last · 🧪 테스트 school/lastTest) · 내 수업 기록 중 큰 것
  const reach = Math.max(0, ...Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0), Number(untrack(() => (cls ? lastClass(S, cls)?.no : 0))) || 0, Number(untrack(() => (cls ? lastTest(S, cls)?.no : 0))) || 0);
  const LESSONS = PACKS.filter((p) => (p.steps.some((s) => s.kind === 'monster') || p.boss));
  // 나눈 차시(7차시)는 정식 기록이 원래 차시 칸에 있음(정식 6차시 기록의 u4 ~ u7 = v1.0 7차시 · 출시 전 메모 10)
  const recOf = (p: LessonPack) => recs[p.id] ?? (p.partOf && Object.keys(recs[p.partOf]?.mons || {}).some((k) => p.steps.some((s) => s.id === k)) ? recs[p.partOf] : undefined);
  const isOpen = (p: LessonPack | null | undefined) => !!p && (!cls || !!recOf(p) || p.no <= reach);
  const lessonOf = (id: string) => PACKS.find((p) => p.id === id) ?? null;
  // ⑬ 서버 연결 (시험 서버 = .info/connected · 이 기기 = 늘 됨)
  let online = $state(true);
  const netOff = untrack(() => { const s = S as Store & { onNet?: (fn: (n: { connected: boolean }) => void) => () => void }; return s.onNet ? s.onNet((n) => (online = n.connected)) : () => {}; });
  onDestroy(netOff);
  const pv = untrack(() => liveValue<Record<string, Post>>(S, POSTS));
  onDestroy(pv.stop);
  const posts = $derived(Object.values(pv.v.val || {}).filter((p) => p && p.mem && p.phase !== 'done').sort((a, b) => b.at - a.at));
  const shown = $derived(posts.filter((p) => p.phase === 'wait' && (chip === 'all' || p.no === chip)));
  const mine = $derived(posts.find((p) => !!p.mem?.[uid]) ?? null);
  const meM = $derived({ uid, cls: cls || '이 기기', num, nick: me.nick, hero: me.hero });
  let sheet = $state<'' | 'solo' | 'post'>(''), pick = $state<LessonPack | null>(null), run = $state<LessonPack | null>(null), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2200); };
  const rkv = untrack(() => liveValue<Record<string, Record<string, Record<string, RankRow>>>>(S, RANK));
  onDestroy(rkv.stop);
  type Res = { L: LessonPack; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; n: number; role: Role; mult: number; bonus: number; base: number; total2: number; got: number; rank: { lesson: string; week: string; key: string } | null };
  let res = $state<Res | null>(null);
  const shortOf = (p: LessonPack) => (p.title.split(' · ')[0] ?? p.title).replace(/^\d+차시\s*/, '').slice(0, 7);
  function go() {
    if (!pick) return;
    if (sheet === 'post') { if (!online) { say('서버와 끊겼어요'); return; } if (open) { say('수업 중엔 모집 글을 못 올려요'); return; } createPost(S, pick, meM, recOf(pick) ?? null, pick.partOf && !recs[pick.id] ? pick.steps.map((x) => x.id) : undefined); sheet = ''; return; }
    sheet = ''; run = pick; res = null;
  }
  const tag = (p: Post) => [...new Set(membersOf(p).map((m) => m.cls))];
  function join(p: Post) { const why = canJoin(p, uid, { open: isOpen(lessonOf(p.lesson)), inClass: open, online }); if (why) { say(why); return; } { const L0 = lessonOf(p.lesson); joinPost(S, p, meM, (L0 && recOf(L0)) ?? null, L0?.partOf && !recs[L0.id] ? L0.steps.map((x) => x.id) : undefined); } }
  // ── 결과 (1인 · 팀 같은 꼴) ──
  function ended(r: { drv: boolean; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; hints: number; R: Room; L: LessonPack }, team: Post | null) {
    const L = lessonOf(r.L.id) ?? r.L; run = null;
    const n = team ? membersOf(team).length : 1, role: Role = team?.mem[uid]?.role ?? 'c', guard = team ? hasGuard(team) : false;
    const base = Math.min(GEM.itemMax, r.right * GEM.perItem) + (r.clear ? GEM.clear : 0), mult = TEAM_X[Math.max(1, Math.min(4, n))] ?? 1, bonus = bonusOf(role, n, guard, r.clear);
    const total2 = Math.round(base * mult * (1 + bonus)), got = earnDaily(me.wallet, total2, kstDay(S.now()), GEM.dayCap);
    if (got) save();
    // 📕 「복습 완료」 기록 칸 (오답노트 화면은 ⛺ 텐트 시안 뒤 · bonus/{반}/{번호}/review/{차시}/{문제} = 시각)
    if (cls && num) r.L.steps.forEach((s) => { const m = (r.R.subs?.[s.kind === 'boss' ? 'boss' : s.id]?.[uid]); if (m) S.set(`bonus/${cls}/${num}/review/${L.id}/${s.kind === 'boss' ? 'boss' : s.id}`, S.now()); });
    // 🏆 익명 순위 (학년 전체 · 차시별 · 이번 주): ⚔ 최강 = 첫 시도 정답률 · 📈 성장 = 수업 기록보다 오른 폭 · 🤝 협동 = 주고받은 힌트
    let rank: Res['rank'] = null;
    const key = team ? team.pid : `s${uid.replace(/[.#$/[\]]/g, '_')}${S.now().toString(36)}`, path = `${RANK}/${L.id}/${weekOf(S.now())}`;
    if (S.kind !== 'memory') {
      if (!team || r.drv) { const rr = r.tf.total ? r.tf.ok / r.tf.total : 0, baseR = (() => { const ms = team ? membersOf(team) : [{ cls, num }], xs = ms.map((m) => S.get<{ right?: number; total?: number }>(`records/${m.cls}/${m.num}/${L.id}`)).filter((x) => x && x.total) as { right: number; total: number }[]; return xs.length ? xs.reduce((a, x) => a + x.right / x.total, 0) / xs.length : rr; })();
        S.set(`${path}/${key}`, { s: Math.round(rr * 1000), g: Math.round((rr - baseR) * 1000), c: r.hints, at: S.now() } satisfies RankRow); }
      rank = { lesson: L.id, week: weekOf(S.now()), key };
    }
    if (team && r.drv) S.set(`${POSTS}/${team.pid}/phase`, 'done');
    res = { ...r, L, n, role, mult, bonus, base, total2, got, rank };
  }
  const rk = $derived(res?.rank ? rankOf(rkv.v.val?.[res.rank.lesson]?.[res.rank.week] ?? null, res.rank.key) : null);
  const dayLeft = $derived(GEM.dayCap - (Number(me.wallet.day?.[kstDay(S.now())]) || 0));
  const teamRun = $derived(mine && mine.phase === 'play' && mine.code && !res ? mine : null);
  const names = (p: Post) => Object.fromEntries(membersOf(p).map((m) => [m.uid, `${m.cls}반 ${heroOf(m.hero).name}`]));
</script>

<div class="bd" role="dialog" aria-label="게시판 던전">
  <div class="bar"><button type="button" class="back" aria-label="캠프로" onclick={onclose}>‹</button><b class="t">{mine && mine.phase === 'wait' ? `📋 ${mine.no}차시 팀` : '📋 게시판 던전'}</b><span class="wal">💎 {me.wallet.gem.toLocaleString()}</span></div>
  {#if res}
    <!-- ⑪ ⑫ 결과 -->
    <div class="mid">
      <div class="card grade" class:x={!res.clear}><b class="g">{res.clear ? res.grade : '✕'}</b><span><b>{res.clear ? `${res.L.no}차시 클리어 · ${res.n > 1 ? '팀 ' : ''}등급 ${res.grade}` : '⌛ 시간이 끝났어요 · 클리어 ✕'}</b><small>첫 시도 기준 · {res.tf.total}문항 중 틀림 + 미제출 {res.tf.bad + res.tf.none}개</small></span></div>
      <div class="stat"><span><b>{res.tf.ok}</b>⭕ 맞힘</span><span><b>{res.tf.bad}</b>❌ 틀림</span><span><b>{res.tf.none}</b>⏭ 미제출</span></div>
      {#if rk && rk.s}<div class="card rk"><small>익명 순위 · {res.L.no}차시 · 이번 주 · 학년 ({rk.n}팀)</small><div><span>⚔ 최강</span><em>{rk.s}위</em></div><div><span>📈 성장</span><em>{rk.g}위</em></div><div><span>🤝 협동</span><em>{rk.c}위</em></div></div>{/if}
      <div class="card rw">
        <div><span>💎 맞힌 소문제 {res.right} (최대 {GEM.itemMax}){res.clear ? ` + ⏰ 클리어 ${GEM.clear}` : ''}</span><span>{res.base}</span></div>
        {#if res.n > 1}<div><span>👥 {res.n}인 팀 × {res.mult}</span><span>× {res.mult}</span></div>{/if}
        {#if res.bonus}<div><span>{res.role === 'g' ? `🛡 수호 보너스 +${Math.round(res.bonus * 100)}%` : '🌱 도전자만 클리어 +50%'}</span><span>+{Math.round(res.bonus * 100)}%</span></div>{/if}
        <div class="tot"><span>받은 💎</span><span>{res.got}{res.got < res.total2 ? ` (오늘 한도 · ${res.total2 - res.got} 못 받음)` : ''}</span></div>
      </div>
      <p class="why">벌은 없어요 · 한 번 더 = 숫자가 새로 바뀌어요</p>
    </div>
    <BottomAction dock={false} text="🔥 한 번 더" onmain={() => { pick = res!.L; sheet = 'solo'; go(); }}>{#snippet aux()}<button type="button" class="btn2 wide" onclick={() => (res = null)}>📋 게시판으로</button>{/snippet}</BottomAction>
  {:else if mine && mine.phase === 'wait'}
    <!-- ⑧ 팀 대기실 -->
    {@const ms = membersOf(mine)}
    {@const host = mine.host === uid}
    <div class="mid">
      <div class="slots">{#each Array.from({ length: MAX }) as _, i (i)}{@const m = ms[i]}{#if m}<div class="slot" class:me={m.uid === uid}><HeroSprite id={m.hero} scale={1} /><b>{m.uid === uid ? `나 · ${m.cls}반` : `${m.cls}반 · ${heroOf(m.hero).name}`}</b><small>{m.role === 'g' ? '🛡 수호자' : '🌱 도전자'} · {m.uid === mine.host ? '모집' : m.ready ? '✔ 준비' : '기다림'}</small></div>{:else}<div class="slot empty">＋ 빈자리</div>{/if}{/each}</div>
      <p class="bub">{mine.mem[uid]?.why}</p>
      <div class="card row"><span>{mine.no}차시 · 개념 없이 문제 → 형성평가</span><span>{hasGuard(mine) ? '🛡 있음' : '🌱 도전자만 · 길잡이'}</span></div>
    </div>
    {#if host}
      <BottomAction dock={false} text="⚔ 출발 ({ms.length}명)" disabled={!canStart(mine) || !online} onmain={() => { const L = lessonOf(mine.lesson); if (L) startTeam(S, L, mine, 0); }}
        why={!online ? '서버와 끊겼어요' : canStart(mine) ? '함께할 친구를 기다리거나 바로 출발해요' : '친구가 「준비 완료」를 누르면 출발할 수 있어요'}>{#snippet aux()}<button type="button" class="btn2 wide" onclick={() => leavePost(S, mine, uid)}>모집 글 내리기</button>{/snippet}</BottomAction>
    {:else}
      <BottomAction dock={false} text={mine.mem[uid]?.ready ? '✔ 준비 완료 (누르면 취소)' : '준비 완료'} onmain={() => setReady(S, mine, uid, !mine.mem[uid]?.ready)}>{#snippet aux()}<button type="button" class="btn2 wide" onclick={() => leavePost(S, mine, uid)}>나가기</button>{/snippet}</BottomAction>
    {/if}
  {:else}
    <!-- ⑥ 전체 게시판 -->
    <div class="chips" role="group" aria-label="차시 거르기">
      <button type="button" class:on={chip === 'all'} aria-pressed={chip === 'all'} onclick={() => setChip('all')}>전체</button>
      {#each LESSONS as p (p.id)}<button type="button" class:on={chip === p.no} class:lock={!isOpen(p)} aria-pressed={chip === p.no} onclick={() => setChip(p.no)}>{isOpen(p) ? '' : '🔒 '}{p.no}</button>{/each}
    </div>
    {#if !online}<p class="off">⚠ 서버와 끊겼어요 · 다시 잇는 중 · 혼자는 계속 돼요</p>{/if}
    <div class="mid">
      {#if open}<div class="card"><b>📢 지금 {cls}반 수업 중</b><small>팀 모집은 수업 뒤에 · 혼자는 지금도 돼요</small></div>{/if}
      {#if shown.length}
        <small class="lbl">{chip === 'all' ? '전체' : `${chip}차시`} · 모집 중 {shown.length} · 새 글 위로</small>
        {#each shown as p (p.pid)}
          {@const L = lessonOf(p.lesson)}
          {@const why = canJoin(p, uid, { open: isOpen(L), inClass: open, online })}
          <div class="post"><span class="ic">{isOpen(L) ? (hasGuard(p) ? '🛡' : '🌱') : '🔒'}</span><span class="tx"><b>{p.no}차시 · {membersOf(p).length} / {MAX}</b><small>{#each tag(p) as c (c)}<i>{c}반</i>{/each}{isOpen(L) ? (hasGuard(p) ? '🛡 있음' : '🌱 도전자만') : '아직 진도 전이에요'}</small></span><button type="button" class="go" disabled={!!why} title={why} onclick={() => join(p)}>합류</button></div>
        {/each}
      {:else}
        <div class="empty"><span>📭</span><b>{chip === 'all' ? '모집 글이 아직 없어요' : `${chip}차시 모집 글이 아직 없어요`}</b><small>혼자 시작하거나 · 모집 글을 올려요</small></div>
      {/if}
      <p class="why">오늘 받을 수 있는 💎 {Math.max(0, dayLeft)} / {GEM.dayCap}</p>
    </div>
    <BottomAction dock={false} text="⚔ 혼자 시작 ›" onmain={() => { pick = LESSONS.find((p) => p.no === chip && isOpen(p)) ?? LESSONS.filter(isOpen).at(-1) ?? null; sheet = 'solo'; }}
      why={open || !online ? (open ? '수업 중엔 모집 글을 못 올려요' : '서버와 끊겨서 팀은 잠깐 쉬어요') : ''}>{#snippet aux()}<button type="button" class="btn2 wide" disabled={open || !online} onclick={() => { pick = LESSONS.find((p) => p.no === chip && isOpen(p)) ?? LESSONS.filter(isOpen).at(-1) ?? null; sheet = 'post'; }}>＋ 모집 글 올리기</button>{/snippet}</BottomAction>
  {/if}
  {#if toast}<p class="toast3" role="status">{toast}</p>{/if}
</div>

{#if sheet}
  <Sheet onclose={() => (sheet = '')} mainText={pick ? (sheet === 'post' ? `＋ ${pick.no}차시 모집 글 올리기` : `⚔ ${pick.no}차시 혼자 시작`) : '차시를 골라요'} mainDisabled={!pick} onmain={go}>
    {#snippet title()}{sheet === 'post' ? '＋ 어느 차시로 모집할까요?' : '⚔ 어느 차시로 갈까요?'}{/snippet}
    <div class="lgrid">{#each LESSONS as p (p.id)}<button type="button" class="lg" class:on={pick?.id === p.id} class:lock={!isOpen(p)} disabled={!isOpen(p)} aria-pressed={pick?.id === p.id} onclick={() => (pick = p)}><b>{isOpen(p) ? p.no : '🔒'}</b><small>{isOpen(p) ? shortOf(p) : `${p.no} · 진도 전`}</small></button>{/each}</div>
  </Sheet>
{/if}
{#if run}<BoardRun L0={run} {uid} {num} nick={me.nick} {cls} onend={(r) => ended(r, null)} onquit={() => (run = null)} />{/if}
{#if teamRun}
  {@const L = lessonOf(teamRun.lesson)}
  {#if L}<BoardRun L0={L} {uid} {num} nick={me.nick} {cls} team={{ S, code: teamRun.code!, host: teamRun.host === uid, roles: Object.fromEntries(membersOf(teamRun).map((m) => [m.uid, m.role])), names: names(teamRun) }} onend={(r) => ended(r, teamRun)} onquit={() => leavePost(S, teamRun, uid)} />{/if}
{/if}

<style>
  .bd { position: fixed; inset: 0; z-index: 15; background: var(--bg); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); }
  .back { width: 44px; height: 48px; border: 0; background: none; color: var(--text); font-size: 26px; }
  .t { flex: 1; font-size: 18px; } .wal { height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); display: flex; align-items: center; font: 700 14px var(--font); color: var(--gem); }
  .chips { flex: none; display: flex; gap: 8px; overflow-x: auto; padding: 0 var(--s4) var(--s2); scrollbar-width: none; }
  .chips button { flex: none; height: 40px; min-width: 48px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); position: relative; }
  .chips button::before { content: ''; position: absolute; inset: -4px 0; }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .chips button.lock { border-style: dashed; color: var(--text-3); }
  .off { margin: 0 var(--s4) var(--s2); padding: 8px 12px; border-radius: var(--r); background: var(--bad-bg); font-size: 13.5px; font-weight: 700; }
  .mid { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .card { background: var(--surface); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card small { font-size: 13px; color: var(--text-2); }
  .card.row { flex-direction: row; justify-content: space-between; font-size: 14px; }
  .lbl { font-size: 13px; color: var(--text-3); font-weight: 700; }
  .post { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: var(--r); padding: 10px 12px; }
  .post .ic { width: 44px; height: 44px; flex: none; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; font-size: 22px; }
  .post .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; } .post .tx b { font-size: 16px; }
  .post .tx small { font-size: 12.5px; color: var(--text-2); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; } .post i { font-style: normal; padding: 1px 8px; border-radius: 99px; background: var(--surface-2); font-weight: 700; }
  .post .go { flex: none; height: 44px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .post .go:disabled { color: var(--text-3); box-shadow: none; }
  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-3); text-align: center; }
  .empty span { font-size: 48px; } .empty b { font-size: 15px; color: var(--text-2); } .empty small { font-size: 13px; }
  .why { margin: 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .btn2 { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .btn2.wide { flex: 1; }
  .btn2:disabled { color: var(--text-3); box-shadow: none; border-style: dashed; }
  .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .slot { background: var(--surface); border-radius: var(--r); padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 120px; justify-content: center; text-align: center; }
  .slot b { font-size: 14px; } .slot small { font-size: 12.5px; color: var(--text-2); }
  .slot.me { box-shadow: 0 0 0 2px var(--accent); }
  .slot.empty { border: 2px dashed var(--line); background: transparent; color: var(--text-3); font-weight: 700; }
  .bub { margin: 0; background: var(--surface-2); border-radius: var(--r); padding: 10px 12px; font-size: 14px; color: var(--text-2); }
  .lgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .lg { height: 72px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .lg b { font-size: 22px; } .lg small { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .lg.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .lg.on small { color: var(--on-accent); }
  .lg.lock { opacity: 0.5; border-style: dashed; box-shadow: none; }
  .grade { flex-direction: row; align-items: center; gap: 14px; } .grade .g { width: 64px; height: 64px; flex: none; border-radius: 18px; background: var(--surface-2); display: grid; place-items: center; font-size: 38px; color: var(--accent); }
  .grade.x .g { color: var(--text-3); } .grade span { display: flex; flex-direction: column; gap: 2px; }
  .stat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .stat span { background: var(--surface); border-radius: 10px; padding: 8px 0; text-align: center; display: flex; flex-direction: column; font-size: 12.5px; color: var(--text-2); } .stat b { font-size: 20px; color: var(--text); }
  .rk div { display: flex; justify-content: space-between; font-size: 14.5px; } .rk em { font-style: normal; font-weight: 700; color: var(--accent); }
  .rw div { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-2); padding: 2px 0; } .rw .tot { color: var(--text); font-weight: 700; font-size: 16px; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 6px; }
  .toast3 { position: fixed; left: 50%; bottom: 140px; transform: translateX(-50%); margin: 0; padding: 8px 14px; border-radius: 12px; background: var(--surface-2); font-weight: 700; white-space: nowrap; z-index: 25; }
</style>
