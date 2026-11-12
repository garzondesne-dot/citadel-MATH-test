<script lang="ts">
  import { untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { balList, KIND, norm, oxList, QN, verdict, type Fun, type Kind } from '../../rest/fun';
  import type { Nun } from '../../rest/nunchi';
  import { funOf, nunCheer, nunPress, payFun, pick, type AnyFun } from '../../rest/run';
  import FUNQ from '../../rest/funq.json';

  // 📱 학생 폰 · 쉼터 (#142 · 시안 ② ③ ④): 위 = 놀이 이름 · 🧍 살아 있는 인원 / 가운데 = 남은 초 고리 · 문제 / 아래 = 고르기(두 선택지가 곧 주요 단추)
  //   ② 놀이 전 = 🏕 · 남은 쉼터 시간(흐린 고리) · 주요 단추 흐림 「놀이를 기다리는 중」
  //   ④ 💤 안 고름 = 관전 덮개 + 「🙋 다음 판부터 참여」 · 탈락 = 같은 덮개 「탈락 · 끝까지 구경해요」
  //   🔴 집중 = 놀이 시계가 멈춘 자리(fun.frz)로 초를 그림
  const { S, R, code, uid, now }: { S: Store; R: Room; code: string; uid: string; now: number } = $props();
  const f = $derived(funOf(R));
  const fnow = $derived(f?.frz != null ? Number(f.frz) : now);
  const restLeft = $derived(R.state.rest ? Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - (R.state.holdAt && R.state.focus ? Number(R.state.holdAt) : now)) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const cats = FUNQ.cats as Record<string, string>;

  // ── 고르기 놀이 (⚖ 🔄 ⭕) ──
  const ff = $derived(f && f.kind !== 'nun' ? norm(f as Fun) : null);
  const fv = $derived((R as unknown as { fv?: Record<string, Record<string, string>> }).fv);
  const mine = $derived(ff ? fv?.[ff.rk]?.[uid] ?? '' : '');
  const alive = $derived(!!f && !!(f.alive || {})[uid]);
  const nAlive = $derived(f ? Object.keys(f.alive || {}).length : 0);
  const zz = $derived(!!f && !!(f as { zz?: Record<string, number> }).zz?.[uid]);
  const outN = $derived(ff ? (ff.outAt || {})[uid] : undefined);
  let wake = $state(''); // 🙋 누른 판 (덮개 걷음)
  const cover = $derived.by(() => {
    if (!f || f.phase === 'end') return '';
    if (f.kind === 'quiz') return alive ? '' : 'see';
    if (alive) return '';
    if (zz) return wake === `${f.g}|${(f as Fun).n ?? (f as Nun).round}` ? '' : 'zz';
    return outN != null || f.kind === 'nun' ? 'out' : 'see';
  });
  const secs = $derived(f && f.phase !== 'end' ? Math.max(0, Math.ceil(((f.phase === 'show' ? (ff?.until ?? (f as Nun).to) : f.to) - fnow) / 1000)) : 0);
  const title = $derived(!f ? '🏕 쉼터' : f.kind === 'nun' ? `🙊 눈치게임 · ${(f as Nun).round}판` : f.kind === 'quiz' ? `⭕ OX 타임 · ${ff!.n} / ${Math.min(QN, ff!.queue.length)}` : `${KIND[f.kind as Kind].short} · ${ff!.n}판`);
  const card = $derived.by(() => {
    if (!ff) return '';
    if (ff.s) return ff.s;
    if (ff.rps) return '✊✌️✋ 선생님과 가위바위보!';
    const row = balList()[ff.qi]; return row ? `${cats[row[2]] ?? ''} · 둘 중 하나!` : '';
  });
  const myRes = $derived.by(() => {
    if (!ff || ff.phase !== 'show') return '';
    const r = ff.res!, me = String((ff.marks || {})[uid] || '');
    if (ff.kind === 'quiz') return me.slice(-1) === 'o' ? '⭕ 정답!' : me.slice(-1) === '-' ? '⏱ 시간이 지났어요' : me ? '❌ 아쉬워요 — 해설을 봐요' : '';
    const was = [...r.a, ...r.b, ...(r.c || []), ...r.none].includes(uid);
    if (!was) return '';
    return alive ? '🎉 살아남았다!' : (ff.zz || {})[uid] ? '💤 안 골라서 관전' : `💥 ${r.none.includes(uid) ? '안 골라서' : ff.rps ? '가위바위보에 져서' : KIND[ff.kind].out} 탈락`;
  });

  // ── 🙊 눈치 ──
  const nn = $derived(f && f.kind === 'nun' ? (f as unknown as Nun) : null);
  const myPress = $derived(nn ? (R as unknown as { nun?: Record<string, Record<string, Record<string, number>>> }).nun?.[nn.g]?.[nn.round]?.[uid] : undefined);
  const nunMine = $derived(!nn ? '' : nn.said?.[uid] ? `🗣 ${nn.said[uid]}!` : nn.out?.[uid] === 'clash' ? '💥 동시! 탈락' : nn.out?.[uid] === 'last' ? '⌛ 마지막! 탈락' : nn.out?.[uid] ? '⏳ 시간 끝 · 탈락' : myPress ? '…' : '');

  // ── 끝 = 보상 한 번 ──
  let paid = $state<{ gem: number; xp: number } | null>(null);
  $effect(() => { const x = f && f.phase === 'end' ? (f as AnyFun) : null; paid = x ? untrack(() => payFun(S, x, uid, code)) : null; });
  const won = $derived(!!f && ((f as { win?: string[] }).win || []).includes(uid));
  const wrongs = $derived.by(() => {
    if (!ff || ff.kind !== 'quiz' || ff.phase !== 'end') return [];
    const mk = String((ff.marks || {})[uid] || '');
    return (ff.hist || []).map((h, k) => (mk[k] && mk[k] !== 'o' ? oxList()[h.qi] : null)).filter((x): x is NonNullable<typeof x> => !!x);
  });
  const opts = $derived(ff ? ff.q.map((t, k) => ({ v: 'abc'[k] as string, t })) : []);
  function choose(v: string) { if (ff && ff.phase === 'pick' && !cover) pick(S, code, ff.rk, uid, v); }
  function back() { if (!f) return; if (f.kind === 'nun') nunCheer(S, code, f.g, uid, '🙋'); wake = `${f.g}|${(f as Fun).n ?? (f as Nun).round}`; }
</script>

<div class="fun" role="region" aria-label="쉼터">
  <div class="bar"><div class="tt">{title}</div>{#if f && f.kind !== 'quiz'}<span class="cnt">🧍 {nAlive} / {f.kind === 'nun' ? Object.keys((nn?.alive) || {}).length + Object.keys(nn?.zz || {}).length : ff?.total}</span>{:else if f}<span class="cnt">🧍 {Object.keys(fv?.[ff?.rk ?? ''] || {}).length} / {nAlive}</span>{/if}</div>
  <div class="mid" class:dimd={!!cover}>
    {#if !f}
      <div class="ic">🏕</div><b class="h">잠깐 쉬어 가요</b>
      <div class="ring rdim">{mmss(restLeft)}</div>
      <p class="bub">선생님이 놀이를 고르는 중</p>
    {:else if nn}
      {#if nn.phase === 'end'}
        <div class="ic">{won ? '🏆' : '🙊'}</div><b class="h">{won ? '우승! 끝까지 살아남았어요' : `우승 ${(nn.win || []).length}명`}</b>
      {:else}
        <div class="ring" class:rdim={nn.phase !== 'play'}>{nn.phase === 'ready' ? secs : nn.n}</div>
        <div class="card">{nn.phase === 'ready' ? '준비! 1부터 차례로 외쳐요' : nn.phase === 'show' ? `${nn.round}판 끝` : `「${nn.n}」 누가 외칠까?`}<small>둘이 같이 누르면 💥 · 마지막 1명도 탈락</small></div>
        <ul class="ev">{#each (nn.ev || []).slice(-3) as e, k (k)}<li>{e.k === 'say' ? `🗣 ${e.n}` : e.k === 'clash' ? `💥 동시! ${e.u.length}명` : e.k === 'last' ? '⌛ 마지막!' : '⏳ 시간 끝'}</li>{/each}</ul>
        {#if nunMine}<p class="me">{nunMine}</p>{/if}
      {/if}
    {:else if ff}
      {#if ff.phase === 'end'}
        {#if ff.kind === 'quiz'}
          {@const mk = String((ff.marks || {})[uid] || '')}
          <div class="ic">⭕</div><b class="h">{(mk.match(/o/g) || []).length} / {mk.length} 정답</b>
          {#each wrongs.slice(0, 3) as w (w.t)}<p class="wq">📌 「{w.t}」 → {w.a ? '⭕' : '❌'}<small>{w.why}</small></p>{/each}
        {:else}
          <div class="ic">{won ? '🏆' : '🏁'}</div><b class="h">{won ? '우승! 끝까지 살아남았어요' : `우승 ${(ff.win || []).length}명`}</b>
        {/if}
      {:else}
        <div class="ring" class:rdim={ff.phase === 'show'}>{secs}</div>
        <div class="card">{card}<small>{ff.rps ? '선생님 손에 지면 탈락 · 안 내면 💤' : KIND[ff.kind].rule}</small></div>
        {#if ff.phase === 'show'}<p class="ver">{verdict(ff)}</p>{#if myRes}<p class="me">{myRes}</p>{/if}{/if}
      {/if}
    {/if}
    {#if paid && (paid.gem || paid.xp)}<p class="pay">💎 +{paid.gem}{paid.xp ? ` · EXP +${paid.xp}` : ''} <small>캠프에서 받아요</small></p>{/if}
  </div>
  <div class="act">
    {#if !f}
      <button type="button" class="btn" disabled>놀이를 기다리는 중</button>
    {:else if nn && nn.phase !== 'end'}
      <button type="button" class="btn big" disabled={nn.phase !== 'play' || !alive || !!myPress || !!cover} onclick={() => nunPress(S, code, nn.g, nn.round, uid)}>{nn.phase === 'play' && alive && !myPress ? `🙊 ${nn.n}!` : nn.phase === 'ready' ? '준비…' : nunMine || '기다려요'}</button>
    {:else if ff && ff.phase !== 'end'}
      <div class="vs" class:three={opts.length === 3}>
        {#each opts as o (o.v)}<button type="button" class="opt {o.v}" class:on={mine === o.v} aria-pressed={mine === o.v} disabled={ff.phase !== 'pick' || (!!cover && cover !== 'zz')} onclick={() => choose(o.v)}>{o.t}{#if mine === o.v} ✓{/if}</button>{/each}
      </div>
      <p class="why">{ff.phase === 'pick' ? (ff.kind === 'quiz' ? '탈락 없는 복습 · 시간 안엔 바꿔도 돼요' : '안 고르면 💤 관전') : '다음 판을 기다려요'}</p>
    {:else}
      <p class="why">{f.kind === 'quiz' ? '맞힌 문장 × 2 EXP' : '선생님이 다음 놀이를 골라요'}</p>
    {/if}
  </div>
  {#if cover}
    <div class="cover" role="status">
      <div class="ic">{cover === 'zz' ? '💤' : cover === 'out' ? '👀' : '👀'}</div>
      <b class="h">{cover === 'zz' ? '관전 중' : cover === 'out' ? '탈락 · 끝까지 구경해요' : '관객석'}</b>
      <p class="sub">{cover === 'zz' ? '지난 판에 고르지 않았어요' : cover === 'out' ? '다음 놀이에서 다시 만나요' : '이번 놀이가 끝나면 함께해요'}</p>
      {#if cover === 'zz'}<button type="button" class="btn" onclick={back}>🙋 다음 판부터 참여</button>{/if}
    </div>
  {/if}
</div>

<style>
  .fun { position: fixed; inset: 0; z-index: 28; background: var(--bg); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s4); }
  .tt { flex: 1; min-width: 0; font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cnt { flex: none; background: var(--surface); border-radius: 999px; padding: 4px 10px; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .mid { flex: 1; min-height: 0; overflow: hidden; padding: 0 var(--s4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s3); text-align: center; }
  .mid.dimd { opacity: 0.45; }
  .ic { font-size: 52px; line-height: 1; }
  .h { font-size: 20px; }
  .ring { width: 72px; height: 72px; flex: none; border-radius: 50%; border: 5px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ring.rdim { border-color: var(--line); color: var(--text-3); }
  .bub { margin: 0; background: var(--surface-2); border-radius: var(--r); padding: 10px 12px; font-size: 14px; color: var(--text-2); }
  .card { width: 100%; background: var(--surface); border-radius: var(--r); padding: 14px 16px; font-size: 18px; font-weight: 700; line-height: 1.5; display: flex; flex-direction: column; gap: 4px; }
  .card small { font-size: 13px; font-weight: 500; color: var(--text-2); }
  .ver { margin: 0; font-size: 15px; font-weight: 700; }
  .me { margin: 0; font-size: 18px; font-weight: 700; color: var(--accent); }
  .wq { margin: 0; width: 100%; text-align: left; font-size: 14px; background: var(--surface); border-radius: var(--r); padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; }
  .wq small { color: var(--text-2); font-size: 13px; }
  .ev { list-style: none; margin: 0; padding: 0; display: flex; gap: 6px; font-size: 14px; color: var(--text-2); }
  .ev li { background: var(--surface); border-radius: 999px; padding: 4px 10px; }
  .pay { margin: 0; font-weight: 700; color: var(--gem); } .pay small { color: var(--text-3); font-weight: 500; }
  .act { flex: none; padding: var(--s2) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: var(--s2); position: relative; z-index: 2; }
  .btn { width: 100%; min-height: var(--btn-h); border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .btn.big { min-height: 96px; font-size: 28px; }
  .btn:disabled { background: var(--surface-2); color: var(--text-3); box-shadow: none; }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .vs { display: flex; flex-direction: column; gap: 10px; }
  .vs.three { flex-direction: row; } .vs.three .opt { flex: 1; height: 96px; font-size: 18px; }
  .opt { flex: none; height: 88px; border: 3px solid transparent; border-radius: 16px; color: #fff; font: 700 21px var(--font); box-shadow: 0 4px 0 rgba(0, 0, 0, 0.45); padding: 0 var(--s2); }
  .opt.a { background: #2f5f9e; } .opt.b { background: #9e3f3f; } .opt.c { background: #4a7a3a; }
  .opt.on { border-color: var(--accent); }
  .opt:disabled { opacity: 0.5; box-shadow: none; }
  .opt:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .why { margin: 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .cover { position: absolute; inset: 0; z-index: 3; background: rgba(8, 9, 12, 0.88); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s2); padding: var(--s5); text-align: center; }
  .cover .sub { margin: 0; color: var(--text-2); font-size: 14px; }
  .cover .btn { position: absolute; left: var(--s4); right: var(--s4); bottom: calc(var(--s4) + env(safe-area-inset-bottom, 0px)); width: auto; }
</style>
