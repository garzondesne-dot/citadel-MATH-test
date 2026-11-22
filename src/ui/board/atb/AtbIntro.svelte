<script lang="ts">
  // 🗺 게시판 던전 조우 · 정찰 (📜 요청 #69 · 선생님 2026-11-21 「느닷없이 시작 → 정찰 시간 · 조우 짧게」)
  //   meet = 어둡게 + 보스 이름 띠 + 등장 대사 · scout = 보스 카드(약점 · 공격 3종 → 막는 역할 · 내 임무 · 분노) + 남은 초 + 「⚔ 준비 완료」 · count = 3 · 2 · 1 · 전투 시작!
  import type { State } from '../../../board/atb/engine';
  import { missionOf } from '../../../board/atb/engine';
  import { ATK, ATK_SPECIAL, FAM_NAME, atkClass, atkName, bossOf, rage as RAGE, shieldOf, type AtkClass, type AtkKind } from '../../../board/atb/tune';
  import { bossLine } from '../../../board/atb/story';
  import FamShield from './FamShield.svelte';
  import AtbIcon from './AtbIcon.svelte';
  const { S, me, phase, left, short = false, ready = [], labels, onready }: {
    S: State; me: number; phase: 'meet' | 'scout' | 'count'; /** 남은 초 (정찰 · 셈) */ left: number; short?: boolean;
    /** 준비한 자리 (여럿이 · 봇 = 바로) */ ready?: number[]; labels?: Record<number, string>; onready: () => void;
  } = $props();
  const no = $derived(S.boss.no), name = $derived(bossOf(no).name), line = $derived(bossLine(no, 'enter'));
  const CLS: { c: AtkClass; ic: string; who: string; how: string }[] = [
    { c: 'single', ic: '🎯', who: '🛡 탱커', how: '막기' }, { c: 'aoe', ic: '💥', who: '🎵 서포터', how: '결계' }, { c: 'special', ic: '🌀', who: '⚔ 딜러', how: '끊기' },
  ];
  const clsOf = (k: AtkKind): AtkClass[] => (ATK[k].special === 'scale' ? ['single', 'aoe'] : ATK[k].aoe && ATK_SPECIAL.has(k) ? ['special'] : [atkClass(k, !!ATK[k].aoe)]);
  const atks = $derived(CLS.map((x) => ({ ...x, names: [...new Set(S.boss.cycle.filter((k) => clsOf(k).includes(x.c)).map((k) => atkName(S.boss, k)))] })));
  /** 📜 #102 ⑧ 공격마다 = 이름 · 누구에게(한 명 · 모두 · 모으기) · 막는 역할 아이콘 + 그 역할 스킬 (엔진 반응 규칙 그대로) */
  const TGT: Record<AtkClass, string> = { single: '한 명', aoe: '모두', special: '모으기' };
  const BLK: Record<AtkClass, { role: 'tank' | 'support' | 'dealer'; nm: string; sk: string }> = { single: { role: 'tank', nm: '탱커', sk: '엄호' }, aoe: { role: 'support', nm: '서포터', sk: '결계' }, special: { role: 'dealer', nm: '딜러', sk: '끊기' } };
  const rows = $derived.by(() => { const seen = new Set<string>(), out: { nm: string; c: AtkClass; ic: string }[] = []; for (const k of S.boss.cycle) { const nm = atkName(S.boss, k); if (seen.has(nm)) continue; seen.add(nm); const c = clsOf(k)[0]!; out.push({ nm, c, ic: CLS.find((x) => x.c === c)!.ic }); } return out; });
  const SLOT = `${import.meta.env.BASE_URL}art/board-atb/atb-shield-slots-v1.webp`, FX: Record<string, number> = { arms: 0, flame: 25, nature: 50, wisdom: 75, mystic: 100 };
  const mis = $derived(me >= 0 && S.heroes[me] ? missionOf(S, me) : null), role = $derived(me >= 0 ? S.heroes[me]?.s.role : undefined);
  const iReady = $derived(me >= 0 && ready.includes(me)), many = $derived(S.heroes.length > 1);
  const ROLE_NM = { tank: '탱커', dealer: '딜러', support: '서포터', healer: '힐러' } as const;
  /** 🛡 📜 #95 실드 4칸 = 내 속성 금테 · 팀에 없는 속성 = 📜 도움표로 */
  const meHero = $derived(me >= 0 ? S.heroes[me] : undefined);
  const meWeak = $derived(!!meHero && S.boss.weak.includes(meHero.s.fam));
  const nm = (i: number) => labels?.[i] ?? S.heroes[i]?.s.name ?? '';
</script>

<div class="intro {phase}" data-k="atb-intro" data-phase={phase}>
  {#if phase !== 'count'}
    <div class="band" data-k="atb-intro-name"><small>{no}차시 던전 수호자</small><b>{name}</b></div>
    {#if line}<p class="say" data-k="atb-intro-line">「{line}」</p>{:else}<p class="say ph" data-k="atb-intro-line">…</p>{/if}
  {/if}
  {#if phase === 'scout'}
    <section class="card c102" data-k="atb-scout" aria-label="정찰">
      <div class="k">{no}차시 · {S.diff === 'hard' ? '도전' : S.diff === 'easy' ? '연습' : '일반'} · 정찰</div>
      <h2 class="bn" data-k="atb-scout-boss">{S.boss.name}</h2>{#if bossLine(S.boss.no, 'enter')}<p class="bl" data-k="atb-scout-line">「{bossLine(S.boss.no, 'enter')}」</p>{/if}
      <div class="in">
        <div class="col">
          <h3>약점과 실드</h3>
          <div class="row weak"><span class="lb">약점</span>{#each S.boss.weak as f (f)}<span class="fam"><FamShield fam={f} size={18} /> {FAM_NAME[f]}</span>{/each}</div>
          <div class="row shl" data-k="atb-scout-shield">{#each shieldOf(S.boss) as f, i (i)}{@const own = !!meHero && meHero.s.fam === f}{@const none = !S.heroes.some((h) => h.s.fam === f)}<span class="fam slot" class:own class:none data-fam={f}><i class="sc" style:background-image="url({SLOT})" style:background-position="{FX[f]}% 0%"></i>{#if none}<small>📜 도움표로</small>{/if}</span>{/each}<small class="shn">실드 {shieldOf(S.boss).length}칸 · 체력 70%<br />스킬 2 로 1칸씩</small></div>
          <div class="row rage">😡 분노 · 체력 {Math.round(RAGE.at * 100)}% 아래</div>
        </div>
        <div class="col">
          <h3>공격 예고와 대응</h3>
          <table class="atks" data-k="atb-scout-atks"><tbody>{#each rows as r (r.nm)}<tr data-cls={r.c}><td>{r.ic} {r.nm} <span class="t">{TGT[r.c]}</span></td><td class="r"><AtbIcon name={`role-${BLK[r.c].role}` as 'role-tank'} size={18} /> {BLK[r.c].nm} · {BLK[r.c].sk}</td></tr>{/each}</tbody></table>
        </div>
      </div>
      <div class="foot">
        <div class="ms">{#if mis && role}<b data-k="atb-scout-mission"><AtbIcon name={`role-${role}` as 'role-tank'} size={18} /> 내 임무 · {mis.txt} {mis.need}{#if meWeak} <span class="wk">약점!</span>{/if}</b>{/if}<span><span data-k="atb-scout-left">⏳ {left}초</span>{#if many} · <span data-k="atb-scout-ready">준비 {ready.length} / {S.heroes.length}</span>{/if}</span></div>
        <button type="button" class="go" disabled={iReady} data-k="atb-scout-go" onclick={onready}>{iReady ? '✔ 준비됨 · 기다리는 중' : short ? '⏭ 건너뛰기' : '✔ 준비 완료'}</button>
      </div>
    </section>
  {:else if phase === 'count'}
    {#key left}<b class="cnt" data-k="atb-intro-count">{left > 0 ? left : '전투 시작!'}</b>{/key}
  {/if}
</div>

<style>
  .intro { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; pointer-events: auto; background: #08040ccc; animation: dim 0.4s ease-out; padding: 0 16px; }
  .intro.count { background: #08040c55; pointer-events: none; }
  @keyframes dim { from { background: #08040c00; } }
  .band { display: flex; flex-direction: column; align-items: center; padding: 4px 28px; background: linear-gradient(90deg, #0000, #5a1a1aee 15%, #5a1a1aee 85%, #0000); border-top: 2px solid #ffcf6a; border-bottom: 2px solid #ffcf6a; animation: band 0.5s ease-out 0.35s both; }
  .band small { font: 700 12px var(--font-plain); color: #ffd9a0; } .band b { font: 900 22px var(--font); color: #fff3d0; text-shadow: 0 2px 0 #000; }
  @keyframes band { from { transform: scaleX(0); opacity: 0; } }
  .say { margin: 0; max-width: 70%; padding: 4px 12px; border-radius: 10px; background: #fff8e6; color: #3a2614; font: 700 14px var(--font-plain); text-align: center; animation: band 0.4s ease-out 0.7s both; }
  .say.ph { opacity: 0.4; }
  .card { width: min(440px, 100%); padding: 8px 12px; border-radius: 12px; background: #f6e7c4; border: 2px solid #b88a4a; color: #3a2614; display: grid; gap: 4px; font: 700 13px var(--font-plain); animation: band 0.3s ease-out; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .fam.own { box-shadow: 0 0 0 2px #e0a020, 0 0 8px #f0c040; } .fam.none { opacity: 0.85; background: #efe4ff; } .fam small { margin-left: 3px; font-size: 0.8em; color: #6a4ab8; font-weight: 800; }
  .lb { font-weight: 900; } .fam { display: inline-flex; align-items: center; gap: 3px; padding: 0 6px; border-radius: 8px; background: #fff3d6; }
  .atks { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; } .atks span { color: #6a4a20; white-space: nowrap; }
  .mine { color: #1d5ac8; font-weight: 900; } .rage { color: #b3261e; }
  .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px; }
  .left { font: 900 15px var(--font); } .rd { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; } .rd i { font-style: normal; opacity: 0.55; }
  .go { min-height: 40px; padding: 0 16px; border-radius: 10px; border: 2px solid #7a4e10; background: linear-gradient(#ffd35a, #e09a1e); color: #3a1e00; font: 900 15px var(--font); }
  .go:disabled { background: #d8c8a0; color: #6a5a3a; }
  .cnt { font: 900 72px/1 var(--font); color: #fff; text-shadow: 0 0 12px #ff1a1a, 0 0 3px #000, 0 4px 0 #000; animation: pop 0.9s ease-out both; }
  @keyframes pop { 0% { transform: scale(2.2); opacity: 0; } 25% { transform: scale(1); opacity: 1; } 100% { opacity: 0.85; } }
  @media (max-height: 430px) { .card { gap: 2px; padding: 6px 10px; font-size: 12px; } .band b { font-size: 18px; } .go { min-height: 34px; } }
  @media (prefers-reduced-motion: reduce) { .band, .say, .card, .cnt, .intro { animation: none; } }
  /* ── 📜 #102 ⑧ 정찰 카드 새 판 (시안 장면 0) ── */
  .card.c102 { width: min(660px, calc(100% - 40px)); background: #241f2c; border: 2px solid #6a5a3a; border-radius: 10px; box-shadow: 0 0 0 2px #000, 0 10px 30px #0009; padding: 10px 14px; gap: 8px; color: #f2f3f5; font: 700 14px var(--font-plain); }
  .c102 .k { font-size: 14px; font-weight: 900; color: #f5b84a; }
  .c102 .in { display: grid; grid-template-columns: 1fr 1.25fr; gap: 12px; background: #efdfb8; color: #2a2216; border-radius: 8px; border: 2px solid #c9a96a; padding: 8px 12px; }
  .c102 h3 { margin: 0 0 4px; font: 900 16px var(--font-plain); }
  .c102 .col + .col { border-left: 2px solid #c9b385; padding-left: 12px; }
  .c102 .fam { background: transparent; padding: 0; font-size: 14px; }
  .c102 .slot { position: relative; display: inline-flex; flex-direction: column; align-items: center; }
  .c102 .sc { display: block; width: 36px; height: 36px; background-repeat: no-repeat; background-size: 500% 300%; image-rendering: pixelated; filter: drop-shadow(0 2px 0 #000); }
  .c102 .shn { font-size: 14px; font-weight: 700; color: #6b5a3a; line-height: 1.2; }
  .c102 .rage { font-size: 14px; color: #7a4a2a; }
  .c102 table { width: 100%; border-collapse: collapse; font-size: 14px; color: #2a2216; }
  .c102 td { padding: 3px 0; } .c102 td.r { font-weight: 900; white-space: nowrap; display: flex; gap: 4px; align-items: center; } .c102 td .t { font-size: 14px; font-weight: 700; color: #7a6a4a; margin-left: 4px; }
  .c102 .foot { display: flex; align-items: center; gap: 12px; margin: 0; }
  .c102 .ms { flex: 1; display: grid; gap: 2px; font-size: 14px; color: #b4b8c2; } .c102 .ms b { font-size: 16px; color: #f2f3f5; display: flex; align-items: center; gap: 6px; }
  .c102 .wk { font-size: 14px; font-weight: 900; color: #2a1a04; background: #f5b84a; border-radius: 4px; padding: 0 4px; }
  .c102 .go { height: 56px; min-width: 200px; border-radius: 12px; border: 2px solid #5a3a08; background: linear-gradient(#ffd47a, #f0a93a); color: #2a1a04; font: 900 16px var(--font-plain); box-shadow: 0 3px 0 #000; }
  .c102 .go:disabled { filter: grayscale(0.5); opacity: 0.75; }
  .c102 .bn { margin: 0; font: 900 26px var(--font-plain); color: #fff2d0; text-shadow: 0 2px 0 #000; line-height: 1.1; } .c102 .bl { margin: 0; font: 700 14px var(--font-plain); color: #d9cfb8; }
</style>
