<script lang="ts">
  import { untrack } from 'svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { artUrl, FUN_ART } from '../manifest';
  import { sfx } from '../sound.svelte';
  import { activeIds } from '../../raid/raid';
  import { HAND_EMO, HAND_KO, type Fun } from '../../rest/fun';
  import type { Room } from '../../model/types';

  // ⚖ 🔄 ⭕ 쉼터 무대 (정식 js/raid/fun.js stage · board · animate 그대로 · 📜 2026-11-15 선생님 「미니게임 기믹이 너무 없어 · 고르면 이동하고 떨어지거나 날아갔는데」)
  //   교실 TV(big) · 학생 폰 같은 무대: 광장 → 공개 0.3초 = 자기 쪽 발판으로 우르르 → 2.0초 금빛 번쩍 + 쾅(금 간 발판) → 2.6초 진 쪽 발판이 6조각 · 먼지 · 용사 빙글 추락 · 흔들림 · 내 쪽이면 폰 진동
  //   🔄 반대로 = 1.9초 버저 → 전광판 빨갛게 · 숫자 줄어듦 → 스프링 띠용(용사가 위로 튕겨 나감) / ⭕ 수학 OX = 무너지는 발판 그림이 통째로 떨어짐 / ✊✌✋ = 선생님 손 돌다 멈춤 → 진 사람 회색
  //   연출은 이 기기에서만(판정 · 시간은 서버 그대로) · 공개(show) 6.5초 안에 끝남(마지막 연출 2.6 + 1.4초)
  type P = { R: Room; f: Fun; now: number; big?: boolean; me?: string; nm?: (u: string) => string; num?: (u: string) => number; k?: number; quiet?: boolean };
  const { R, f, now, big = false, me = '', nm, num, k = 1, quiet = false }: P = $props();

  const kind = $derived(f.kind || 'bal');
  const rev = $derived(kind === 'rev');
  const ox = $derived(kind === 'ox' || kind === 'quiz'); // ⭕ OX 그림(낭떠러지 / 바닥 다 있음)
  const show = $derived(f.phase === 'show' && !!f.res);
  const res = $derived(f.res);
  const alive = $derived(Object.keys(f.alive || {}));
  const inPlay = $derived(show && res ? [...res.a, ...res.b, ...(res.c || []), ...res.none] : alive);
  const spect = $derived(activeIds(R, now).filter((u) => !inPlay.includes(u)));
  const wide = $derived(big && rev); // 🔄 TV 이름 크게 = 숙소 바닥을 넓게(8칸 · 줄 간격 넓게)
  const bg = $derived(rev ? FUN_ART.bgRev : kind === 'quiz' ? FUN_ART.bgQuiz : kind === 'ox' ? FUN_ART.bgOx : FUN_ART.bg);
  const nameOf = (u: string) => (nm ? nm(u) : R.players?.[u]?.nick ?? '');
  const bib = (u: string) => String(num ? num(u) : Number((R.players?.[u] as { num?: number } | undefined)?.num) || 0).padStart(2, '0');
  const sideOf = (u: string): 'a' | 'b' | 'c' | 'n' => (!res ? 'n' : res.a.includes(u) ? 'a' : res.b.includes(u) ? 'b' : (res.c || []).includes(u) ? 'c' : 'n');
  // 자리: 무리 안에서 i 번째 (가로 cols 칸 · 정식 spot)
  const spot = (i: number, n: number, x0: number, x1: number, y0: number, cols: number, dy = 9) => { const c = Math.max(1, Math.min(cols, n)), r = Math.floor(i / c), kk = i % c, w = (x1 - x0) / c; return { x: x0 + w * (kk + 0.5) + (r % 2 ? w * 0.25 : 0), y: y0 + r * dy }; };

  // ── 공개 연출 단계 (정식 animate 의 setTimeout 그대로) ── st: 0 광장 · 1 발판으로(0.3초) · 2 금 감(2.0초) · 3 무너짐(2.6초)
  let st = $state(0), hot = $state(false), after = $state(false), quake = $state(false);
  const key = $derived(`${f.g}|${f.rk}|${f.phase}`);
  const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = (id: string, v: number) => { if (!quiet) sfx(id, v); };
  $effect(() => {
    void key;
    return untrack(() => {
      st = 0; hot = false; after = false; quake = false;
      if (f.phase !== 'show' || !f.res) return;
      const r = f.res, T: ReturnType<typeof setTimeout>[] = [], at = (ms: number, fn: () => void) => { T.push(setTimeout(fn, ms)); };
      if (f.rps) { at(900, () => { st = 1; snd(r.out.length ? 'glitch' : 'click', 0.6); }); return () => T.forEach(clearTimeout); } // ✊✌✋ 진 사람 회색
      at(300, () => { st = 1; snd('wind', 0.45); }); // 우르르
      if (r.lose && rev) { at(1900, () => { hot = true; snd('glitch', 0.6); }); at(2400, () => (after = true)); } // 🔄 버저 → 전광판
      if (r.lose && f.kind !== 'quiz') {
        at(2000, () => { st = 2; snd('block', 0.75); }); // 금빛 번쩍 · 쾅
        at(2600, () => { // 💥 바닥 꺼짐
          st = 3;
          if (!calm()) { quake = true; at(700, () => (quake = false)); }
          if (me && sideOf(me) === r.lose && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') { try { navigator.vibrate([120, 60, 200]); } catch { /* 무시 */ } }
          snd('smash', 0.8); snd('hurt', 0.55); if (rev) at(350, () => snd('dizzy', 0.7));
        });
      }
      return () => T.forEach(clearTimeout);
    });
  });

  const loseSide = $derived(show && res ? res.lose : '');
  const loseList = $derived(loseSide === 'a' ? res!.a : loseSide === 'b' ? res!.b : []);
  function posOf(u: string, i: number) {
    const s = sideOf(u);
    if (show && st >= 1 && !f.rps && (s === 'a' || s === 'b')) {
      const L = s === 'a' ? res!.a : res!.b, j = L.indexOf(u);
      return ox ? spot(j, L.length, s === 'a' ? 7 : 75, s === 'a' ? 25 : 93, 47, 3) : spot(j, L.length, s === 'a' ? 2 : 81, s === 'a' ? 19 : 98, rev ? 50 : 46, 3); // 발판 위
    }
    return wide ? spot(i, inPlay.length, 4, 96, inPlay.length > 16 ? 50 : 58, 8, 12) : spot(i, inPlay.length, 34, 66, rev ? 68 : 50, big ? 5 : 4);
  }
  const figs = $derived(inPlay.map((u, i) => {
    const s = sideOf(u), p = posOf(u, i), down = st >= 3 && !f.rps && kind !== 'quiz' && !!loseSide && s === loseSide, li = loseList.indexOf(u);
    return { u, s, x: p.x, y: p.y, z: wide && !(show && st >= 1) ? 3 + Math.max(0, 9 - Math.floor(p.y / 10)) : null,
      lost: show && st >= 1 && (f.rps ? res!.out.includes(u) : s === 'n'), down, delay: down ? `${(0.12 + (li % 5) * 0.06).toFixed(2)}s` : null,
      run: show && st >= 1 && !f.rps ? (s === 'a' ? 'l' : s === 'b' ? 'r' : '') : '', hand: show && f.rps ? (s === 'n' ? '안 냄' : HAND_KO[s] ?? '') : '' };
  }));
  // 발판 그림 (2칸 = 멀쩡 · 금 감) · ⭕ 수학 OX = ⭕ ❌ 발판 그림 → 무너지는 그림
  const F = FUN_ART.platFrames, platUrl = `url('${artUrl(FUN_ART.plat)}')`;
  const platBg = (s: 'a' | 'b') => (kind === 'ox' ? `url('${artUrl(st >= 2 && loseSide === s ? FUN_ART.ox[`${s}Break`] : FUN_ART.ox[s])}')` : kind === 'quiz' ? null : platUrl);
  const SIDES = ['a', 'b'] as const, PIECES = 6;
  const piece = (i: number) => `left:${(i * 100) / PIECES}%;width:${100 / PIECES + 0.6}%;background-image:${platUrl};background-size:${PIECES * F * 100}% auto;background-position:${(((F - 1) * PIECES + i) / (F * PIECES - 1)) * 100}% 0;--r:${(i % 2 ? 1 : -1) * (12 + ((i * 37) % 30))}deg;--dx:${(i - PIECES / 2) * (big ? 1.2 : 1.6)}cqw;animation-delay:${(Math.abs(i - (PIECES - 1) / 2) * 0.09).toFixed(2)}s`;
  // 🔄 생존자 전광판
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowN = $derived(alive.length);
  const before = $derived(show && res ? res.a.length + res.b.length + (res.c || []).length + res.none.length : nowN);
</script>

<div class="fa-arena k-{kind}" class:big class:oxart={ox} class:fa-quake={quake} data-st={st} aria-label="쉼터 무대">
  <i class="fa-bg" style:background-image="url('{artUrl(bg)}')"></i>
  <div class="fa-gal">
    {#each spect.slice(0, big ? 24 : 10) as u, i (u)}<div class="fa-g" class:me={u === me} style:left="{4 + i * (92 / Math.max(1, Math.min(spect.length, big ? 24 : 10)))}%"><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={k} /></div>{/each}
    {#if spect.length}<span class="fa-gn">👀 관객 {spect.length}</span>{/if}
  </div>
  {#if f.rps}
    <div class="fa-rps" class:stop={show}>{#if show && res}<p>선생님</p><b>{HAND_EMO[res.hand ?? ''] ?? '❔'}</b><em>{HAND_KO[res.hand ?? ''] ?? ''}</em>{:else}<p>선생님 손은…</p><b class="spin">✊✌️✋</b><em>바위 · 가위 · 보</em>{/if}</div>
  {:else}
    {#each SIDES as s, j (s)}
      {@const lose = loseSide === s}
      {@const pb = platBg(s)}
      <div class="fa-plat {s}" class:doom={lose} class:flash={lose && st === 2} class:broken={lose && st >= 3 && !ox && !rev} class:fall={lose && st >= 3 && rev} class:ox-drop={lose && st >= 3 && kind === 'ox'}
        style:background-image={rev ? null : pb} style:background-position={!ox && !rev ? (lose && st >= 2 ? '100% 0' : '0 0') : null} style:background-size={!ox && !rev ? `${F * 100}% auto` : null}>
        <i class="fa-flag">{ox ? (s === 'a' ? '⭕' : '❌') : f.q[j]}</i>
        {#if show && res}<em class="fa-cnt">{res[s].length}</em>{/if}
        {#if rev}<i class="fa-spring"></i>{/if}
        {#if lose && st >= 3 && !ox && !rev}{#each Array(PIECES) as _, i (i)}<i class="fa-piece" style={piece(i)}></i>{/each}{/if}
        {#if lose && st >= 3 && (kind === 'ox' || !ox)}<i class="fa-dust"></i>{/if}
      </div>
    {/each}
  {/if}
  {#each figs as h (h.u)}
    <div class="fa-h" class:me={h.u === me} class:run-l={h.run === 'l'} class:run-r={h.run === 'r'} class:fa-lost={h.lost} class:fall={h.down} class:tumble={h.down} data-u={h.u} data-go={show ? h.s : undefined}
      style:left="{h.x}%" style:top="{h.y}%" style:z-index={h.z} style:transition-delay={h.delay}>
      {#if h.hand}<i class="fa-hand" class:lose={h.lost || h.s === 'n'}>{h.hand}</i>{/if}
      <HeroSprite id={R.players?.[h.u]?.hero ?? 0} scale={k} />
      {#if rev}<b class="bib">{bib(h.u)}</b>{#if big}<b class="fa-nm">{nameOf(h.u)}</b>{/if}
      {:else if big || h.u === me}<b class="nm">{h.u === me ? '나' : nameOf(h.u)}</b>{/if}
    </div>
  {/each}
  {#if rev}
    <div class="fa-board" class:hot><b>{pad(after ? nowN : before)}</b><span>/{pad(f.total || before)}</span></div><i class="fa-board-l">생존자</i>
    {#if f.phase === 'pick'}<div class="fa-ann" role="status"><i>📢</i><span>{f.n === 1 ? '참가자 여러분, ' : ''}이번 판은… 많은 쪽이 탈락합니다</span></div>{/if}
  {/if}
</div>

<style>
  /* 정식 css/style.css fa-* 그대로 (글자 = 무대 너비 cqw · TV 3m 에서 읽히게 big 은 최소 px) */
  .fa-arena { position: relative; width: var(--fa-w, 100%); aspect-ratio: 16 / 9; flex: none; overflow: hidden; border-radius: 10px; background: #07050c; container-type: inline-size; margin: 0 auto; font-family: var(--font); color: #fff; text-align: center; }
  .fa-bg { position: absolute; inset: 0; background-size: 100% 100%; background-repeat: no-repeat; pointer-events: none; }
  .fa-gal { position: absolute; left: 0; right: 0; top: 0; height: 22%; }
  .k-rev .fa-gal { display: none; }
  .fa-g { position: absolute; bottom: 2%; transform: translateX(-50%) scale(0.55); transform-origin: bottom center; opacity: 0.85; }
  .fa-g.me { opacity: 1; filter: drop-shadow(0 0 4px #ffe27a); }
  .fa-gn { position: absolute; right: 1.2cqw; top: 1cqw; font-size: max(11px, 1.9cqw); font-weight: 700; color: #e9ddff; background: #0009; padding: 0.2cqw 1cqw; border-radius: 6px; }
  .big .fa-gn { font-size: max(16px, 2.2cqw); }

  /* 발판 (그림 = 투명 발판 2칸 · 세로로 쌓아 층층) */
  .fa-plat { position: absolute; top: 42%; bottom: 6%; width: 19%; background-repeat: repeat-y; image-rendering: pixelated; transition: transform 1.4s cubic-bezier(0.5, 0, 0.9, 0.4), opacity 1.4s; }
  .fa-plat.a { left: 0.5%; } .fa-plat.b { right: 0.5%; }
  .fa-flag { position: absolute; top: -20%; left: 50%; transform: translateX(-50%); font-style: normal; font-weight: 800; color: #fff; padding: 0.5cqw 1.4cqw; border-radius: 6px; width: max-content; max-width: 92%; white-space: normal; line-height: 1.15; text-align: center; font-size: max(12px, 2.2cqw); box-shadow: 0 3px 0 #0006; z-index: 2; }
  .big .fa-flag { font-size: max(18px, 2.9cqw); }
  .fa-plat.a .fa-flag { background: #2f5f9e; } .fa-plat.b .fa-flag { background: #9e3f3f; }
  .fa-cnt { position: absolute; bottom: 6%; left: 50%; transform: translateX(-50%); font-style: normal; font-weight: 800; font-size: max(20px, 5cqw); color: #fff; text-shadow: 2px 2px 0 #000; z-index: 2; }
  .fa-plat.doom { animation: faShake 0.3s 2 1.9s; }
  @keyframes faShake { 0%, 100% { margin-left: 0; } 25% { margin-left: -6px; } 75% { margin-left: 6px; } }
  .fa-plat.flash { filter: drop-shadow(0 0 1.4cqw #ffd25a) brightness(1.35); animation: faFlash 0.45s ease-out; }
  @keyframes faFlash { 0% { filter: drop-shadow(0 0 0 #ffd25a) brightness(2.2); } 40% { filter: drop-shadow(0 0 2.4cqw #ffd25a) brightness(1.6); } 100% { filter: drop-shadow(0 0 1.4cqw #ffd25a) brightness(1.35); } }

  /* 💥 바닥 꺼짐 */
  .fa-plat.broken { background: none !important; filter: none; }
  .fa-plat.broken .fa-flag, .fa-plat.broken .fa-cnt { opacity: 0; transition: opacity 0.3s; }
  .fa-piece { position: absolute; top: 0; bottom: 0; z-index: 1; background-repeat: no-repeat; image-rendering: pixelated; animation: faPiece 1.3s cubic-bezier(0.5, 0, 0.9, 0.45) both; }
  @keyframes faPiece { 0% { transform: none; } 15% { transform: translateY(6px) rotate(calc(var(--r) / 6)); } 100% { transform: translate(var(--dx), 140%) rotate(var(--r)); opacity: 0; } }
  .fa-dust { position: absolute; left: -10%; right: -10%; top: -3cqw; height: 9cqw; z-index: 3; pointer-events: none; background: radial-gradient(ellipse at 20% 60%, #cbbca4aa 0 18%, transparent 40%), radial-gradient(ellipse at 55% 50%, #d8cab2aa 0 20%, transparent 42%), radial-gradient(ellipse at 85% 65%, #cbbca4aa 0 16%, transparent 38%); animation: faDust 1.1s ease-out both; }
  @keyframes faDust { from { opacity: 0.9; transform: scale(0.6); } to { opacity: 0; transform: scale(1.6) translateY(-20px); } }
  .fa-arena.fa-quake { animation: faQuake 0.1s linear 6; }
  @keyframes faQuake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

  /* ⭕ OX 그림: ⭕ · ❌ 발판(4:3) · 수학 OX 틀린 쪽 = 무너지는 그림 → 통째로 아래로 / OX 타임 = 바닥 그림 위 깃발만 */
  .oxart .fa-plat { top: 34%; bottom: auto; width: 32%; aspect-ratio: 4 / 3; background-repeat: no-repeat; background-position: center; background-size: 100% 100%; image-rendering: auto; }
  .oxart .fa-plat.a { left: -1%; } .oxart .fa-plat.b { right: -1%; }
  .oxart .fa-flag { top: 2%; font-size: max(16px, 3cqw); }
  .big.oxart .fa-flag { font-size: max(22px, 3.6cqw); }
  .oxart .fa-plat.ox-drop { transform: translateY(70%) rotate(var(--oxr, 4deg)); opacity: 0; transition: transform 1.3s cubic-bezier(0.5, 0, 0.9, 0.45), opacity 1.3s ease-in 0.2s; }
  .oxart .fa-plat.b.ox-drop { --oxr: -4deg; }
  .k-quiz .fa-plat.doom { animation: none; }

  /* 🔄 반대로: 숙소 · 철제 판 + 긴 스프링 → 많은 쪽은 띠용~ 튕겨 나감 */
  .k-rev .fa-plat { top: 54%; bottom: 30%; background: repeating-linear-gradient(90deg, #d7dce8 0 10px, #aeb6c8 10px 12px); border: 3px solid #3b3229; border-top-width: 6px; border-radius: 6px; box-shadow: 0 6px 0 #0007; }
  .k-rev .fa-plat.a { border-top-color: #2f5f9e; } .k-rev .fa-plat.b { border-top-color: #9e3f3f; }
  .k-rev .fa-plat.doom { animation: none; }
  .k-rev .fa-spring { position: absolute; left: 36%; right: 36%; top: 100%; height: 133%; background: repeating-linear-gradient(180deg, #f1f3f8 0 6px, #796654 6px 8px, #0000 8px 16px); border-radius: 40%; box-shadow: 0 4px 0 #0006; transform-origin: bottom center; }
  .k-rev .fa-plat.fall { animation: faBoing 0.9s ease-out; }
  .k-rev .fa-plat.fall .fa-spring { animation: faSpring 0.9s ease-out; }
  @keyframes faBoing { 0% { transform: translateY(0); } 30% { transform: translateY(18%); } 48% { transform: translateY(-22%); } 70% { transform: translateY(6%); } 100% { transform: translateY(0); } }
  @keyframes faSpring { 0% { transform: scaleY(1); } 30% { transform: scaleY(0.45); } 48% { transform: scaleY(1.35); } 70% { transform: scaleY(0.9); } 100% { transform: scaleY(1); } }
  .k-rev .fa-cnt { bottom: auto; top: 50%; transform: translate(-50%, -50%); color: #26201a; text-shadow: 0 2px 0 #fff; }
  .k-rev .fa-flag { top: auto; bottom: 104%; }
  .fa-board { position: absolute; left: 46.6%; width: 6.8%; top: 29.3%; height: 2.9%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.7cqw; color: #7dffb0; text-shadow: 0 0 6px #2fff8a; white-space: nowrap; z-index: 2; font-variant-numeric: tabular-nums; }
  .fa-board span { font-size: 0.75em; color: #b8ffd6; }
  .fa-board.hot { color: #ff6b6b; text-shadow: 0 0 8px #ff2f2f; animation: faHot 0.25s 3; }
  .fa-board.hot span { color: #ffb3b3; }
  @keyframes faHot { 50% { opacity: 0.3; } }
  .fa-board-l { position: absolute; left: 46.6%; width: 6.8%; top: 26.6%; text-align: center; font-style: normal; font-size: 1cqw; font-weight: 800; color: #b8ffd6; z-index: 2; }
  .fa-ann { position: absolute; left: 50%; top: 40%; transform: translateX(-50%); z-index: 20; display: flex; gap: 6px; align-items: center; background: #15120fcc; border: 2px solid #7dffb0; border-radius: 8px; padding: 0.6cqw 1.8cqw; color: #fff; font-weight: 800; font-size: max(11px, 2cqw); white-space: nowrap; animation: faAnnOut 0.6s 3.4s forwards; }
  .big .fa-ann { font-size: max(18px, 2.8cqw); }
  .fa-ann i { font-style: normal; }
  .fa-ann span { display: inline-block; overflow: hidden; max-width: 0; animation: faType 1.8s steps(24, end) 0.2s forwards; }
  @keyframes faType { to { max-width: 40em; } }
  @keyframes faAnnOut { to { opacity: 0; visibility: hidden; } }

  /* 용사 */
  .fa-h { position: absolute; transform: translate(-50%, -50%) scale(0.7); transition: left 1.3s cubic-bezier(0.3, 0.7, 0.3, 1), top 1.3s cubic-bezier(0.3, 0.7, 0.3, 1), opacity 0.8s; z-index: 3; text-align: center; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .big .fa-h { transform: translate(-50%, -50%); }
  .fa-h b { display: block; font-size: 11px; font-weight: 700; color: #fff; text-shadow: 1px 1px 0 #000; white-space: nowrap; line-height: 1.1; }
  .big .fa-h b.nm { font-size: max(15px, 2.2cqw); text-shadow: 2px 2px 0 #000, 0 0 4px #000; }
  .fa-h.me { z-index: 5; filter: drop-shadow(0 0 5px #ffe27a); }
  .fa-h.me b { color: #ffe27a; }
  .fa-h.run-r :global(.art) { transform: scaleX(-1); }
  .fa-h.fall { transition: top 1.4s cubic-bezier(0.5, 0, 0.9, 0.4), opacity 1.4s; top: 130% !important; opacity: 0; }
  .fa-h.tumble :global(.art) { animation: faTumble 1.4s ease-in both; }
  @keyframes faTumble { to { transform: rotate(540deg) scale(0.7); } }
  .k-rev .fa-h.fall { top: -45% !important; opacity: 0; transform: translate(-50%, -50%) scale(0.7) rotate(600deg); transition: top 1.2s cubic-bezier(0.2, 0.9, 0.3, 1) 0.28s, opacity 1s 0.7s, transform 1.3s 0.28s; }
  .big.k-rev .fa-h.fall { transform: translate(-50%, -50%) rotate(600deg); }
  .k-rev .fa-h.tumble :global(.art) { animation: none; }
  .fa-h.fa-lost { opacity: 0.25; filter: grayscale(1); }
  .fa-h b.bib { width: max-content; margin: 1px auto 0; padding: 0 5px; background: #fff; color: #26201a; border: 2px solid #26201a; border-radius: 3px; font-size: 12px; font-weight: 800; text-shadow: none; font-variant-numeric: tabular-nums; }
  .big .fa-h b.bib { font-size: max(22px, 2.9cqw); padding: 0 0.7cqw; }
  .fa-h.me b.bib { background: #ffe27a; }
  .big .fa-h b.fa-nm { margin-top: 1px; font-size: max(17px, 2.3cqw); color: #fff; text-shadow: 2px 2px 0 #000, 0 0 4px #000; }

  /* ✊✌✋ 가위바위보: 선생님 손 돌다 멈춤 · 용사 머리 위 낸 손 */
  .fa-rps { position: absolute; left: 50%; top: 14%; transform: translateX(-50%); z-index: 4; text-align: center; padding: 0.6cqw 2.4cqw 1cqw; border-radius: 16px; background: #201b16cc; border: 2px solid #ffd25a; box-shadow: 0 0 18px #ffd25a66; }
  .fa-rps p { margin: 0; font-size: max(11px, 1.9cqw); font-weight: 700; color: #ffd25a; }
  .fa-rps b { display: block; font-size: max(30px, 7cqw); line-height: 1.1; }
  .fa-rps b.spin { font-size: max(20px, 4cqw); animation: rpsSpin 0.5s steps(3) infinite; }
  .fa-rps.stop b { animation: rpsStop 0.45s cubic-bezier(0.2, 1.6, 0.4, 1); }
  .fa-rps em { display: block; font-style: normal; font-size: max(12px, 2.4cqw); font-weight: 700; color: #fff; }
  @keyframes rpsSpin { 50% { transform: scale(1.12) rotate(-8deg); } }
  @keyframes rpsStop { from { transform: scale(1.6) rotate(-20deg); opacity: 0.4; } to { transform: none; opacity: 1; } }
  .fa-hand { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); font-style: normal; font-size: 13px; font-weight: 700; line-height: 1.2; padding: 0 5px; border-radius: 6px; background: #ffd25a; color: #2a1d06; white-space: nowrap; }
  .big .fa-hand { font-size: max(15px, 2cqw); }
  .fa-hand.lose { background: #88735e; color: #e8e8e8; }

  @media (prefers-reduced-motion: reduce) {
    .fa-arena.fa-quake, .fa-rps b.spin, .fa-h.tumble :global(.art), .fa-plat.doom { animation: none; }
    .fa-ann span { animation-duration: 0.01s; }
  }
</style>
