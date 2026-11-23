<script lang="ts" module>
  export type HeroFilter = 'weak' | 'mine' | 'all';
</script>

<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  // 🧙 📜 #135 용사 확인 시트 (시안 ② · 세로 전용 · 아래 시트): 게시판 「⚔ 출정」(혼자 = 늘 거침) · 출정 카드 「🧙 바꾸기」 · 팀 대기실 「🧙 용사 바꾸기」 · 교사 연습방이 같이 씀
  //   위 = 「🧙 용사 확인」 + ✕ · 「n차시 보스 약점 [문양] [문양]」 · 고른 용사 큰 그림 + 이름 · 역할 · 속성 칩 · 약점!
  //   스킬 Ⅰ ~ Ⅳ 가로 한 줄(장착 = 금테 ✔) · 효과 한 줄 · 거름 칩(⭐ 약점 용사 · 내 용사 · 모두) · 격자 4칸 · 아래 = 주요 단추 하나(56)
  //   고르기 값 · 저장 = 부르는 쪽(onpick) 그대로 · 안 가진 용사 = 흐림 🔒
  import { AWK_ENH, awkTitle, heroOf, ladder, skillName, titleOf } from '../../../model/hero';
  import { portraitOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import { famOf, lookOfStats, statRows, statsOf } from '../../../board/atb/heroes';
  import { ATTR_FX_TXT, FAM_NAME, fxOfAttr, ROLE_NAME, type BossCfg, type Role } from '../../../board/atb/tune';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  import FamShield from './FamShield.svelte';
  const { ids, owned, boss, no, cur, lv, enh, awk = false, tierOf, mainText = '⚔ 이 용사로 출발', onpick, onclose, onskill, note = '', extra, detail = false }: {
    ids: number[]; owned: (id: number) => boolean; boss: BossCfg; /** 차시 번호 (「n차시 보스 약점」) */ no: number; cur: number; lv: number; enh: number; awk?: boolean; tierOf: (id: number) => number;
    /** 주요 단추 글 (대기실 = 「✔ 이 용사로」) */ mainText?: string; onpick: (id: number) => void; onclose: () => void;
    /** 장착 스킬 단계 고르기 (교사 연습방 미리 보기만) */ onskill?: (id: number, tier: number) => void; /** 작은 글 한 줄 (연습방) */ note?: string; /** 연습방 = 강화 단계 줄 */ extra?: Snippet; /** 교사 연습방 = 속성 덧효과 · 용사 수치 (📜 #43 · #36′) */ detail?: boolean;
  } = $props();
  const RI: Record<Role, IconName> = { dealer: 'role-dealer', tank: 'role-tank', healer: 'role-healer', support: 'role-support' };
  const isWeak = (id: number) => boss.weak.includes(famOf(id));
  let sel = $state(untrack(() => cur));
  let flt = $state<HeroFilter>(untrack(() => (isWeak(cur) ? 'mine' : 'weak')));
  const list = $derived(ids.filter((id) => (flt === 'weak' ? isWeak(id) : flt === 'mine' ? owned(id) : true)).sort((a, b) => Number(owned(b)) - Number(owned(a))));
  const st = $derived(statsOf({ hero: sel, lv, enh, tier: tierOf(sel), awk })), info = $derived(heroOf(sel));
  const lad = $derived(ladder(sel) as string[]);
  const t4 = $derived(tierOf(sel) >= 4);
  // ⚡ 각성 조건 한 줄 (🐞 11/23 「용사 바꾸기 할 때 로안만 각성 조건 표시」 · 11/20 옛 고르는 창 #15 줄이 이 시트로 바꿀 때 빠졌음 → 되살림 · 각성 있는 용사 모두)
  const awkT = $derived(awkTitle(sel)), awkName = $derived((awkT && titleOf(awkT)?.name) || '');
  const pt = (id: number) => portraitOf(id);
  const FLT: [HeroFilter, string][] = [['weak', '⭐ 약점 용사'], ['mine', '내 용사'], ['all', '모두']];
</script>

<div class="dim" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-label="용사 확인" data-k="hero-sheet">
  <i class="grab" aria-hidden="true"></i>
  <header><b>🧙 용사 확인</b><button type="button" class="x" aria-label="닫기" data-k="hero-sheet-x" onclick={onclose}>✕</button></header>
  <div class="body">
    <p class="bw" data-k="hero-sheet-weak">{no}차시 보스 약점 {#each boss.weak as f (f)}<span class="fam"><FamShield fam={f} size={18} /> {FAM_NAME[f]}</span>{/each}</p>
    <div class="pickd" data-k="hero-sheet-pick" data-id={sel}>
      <span class="big"><HeroSprite id={lookOfStats(st)} aura={enh} scale={1.3} play /></span>
      <span class="n"><b>{info.name} · {info.job}</b><span class="tags"><span><AtbIcon name={RI[st.role]} size={16} /> {ROLE_NAME[st.role]}</span><span><FamShield fam={st.fam} size={16} /> {FAM_NAME[st.fam]}</span><span>Lv {lv}</span>{#if isWeak(sel)}<span class="w" data-k="hero-sheet-wk">약점!</span>{/if}</span></span>
    </div>
    <div class="sk" data-k="hero-sheet-skills">{#each lad as k, i (k)}{@const on = tierOf(sel) === i + 1}<button type="button" class="s" class:on disabled={!onskill} data-tier={i + 1} aria-label="{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i]} {skillName(k)}{on ? ' · 장착' : ''}" onclick={() => onskill?.(sel, i + 1)}><b>{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i]}{on ? ' ✔' : ''}</b><small>{skillName(k)}</small></button>{/each}</div>
    <p class="eff" data-k="hero-sheet-eff">✳ 스킬 2 = Ⅳ {lad[3] ? skillName(lad[3]) : ''}{t4 ? '' : ' 장착하면'} · 구슬 2 · 내 속성 실드 1칸 깸</p>
    {#if awkT}<p class="awk" class:on={awk && sel === cur} data-k="hero-sheet-awk" data-hero={sel}>⚡ 각성 조건 · {info.name} 출전 · 🔨 +{AWK_ENH} · Ⅳ {lad[3] ? skillName(lad[3]) : ''} · 🏅 「{awkName}」{awk && sel === cur ? ' · ✨ 각성 중' : ''}</p>{/if}
    {#if detail}<p class="famfx" data-k="atb-pick-famfx">{ATTR_FX_TXT[fxOfAttr(st.attr)].emo} {ATTR_FX_TXT[fxOfAttr(st.attr)].name} · {ATTR_FX_TXT[fxOfAttr(st.attr)].desc}</p>
      <ul class="stats" aria-label="용사 수치" data-k="hero-sheet-stats">{#each statRows(st) as r (r.k)}<li data-stat={r.k}><span>{r.label}</span><b>{r.v}{#if r.sub}<small>{r.sub}</small>{/if}</b></li>{/each}</ul>{/if}
    {#if note}<p class="note">{note}</p>{/if}
    {#if extra}{@render extra()}{/if}
    <div class="flt" role="group" aria-label="용사 거르기">{#each FLT as [k, t] (k)}<button type="button" class:on={flt === k} aria-pressed={flt === k} data-flt={k} onclick={() => (flt = k)}>{t}</button>{/each}</div>
    <div class="grid" role="listbox" aria-label="용사">
      {#each list as id (id)}
        {@const p = pt(id)}
        {@const own = owned(id)}
        <button type="button" class="cell" class:on={sel === id} class:lock={!own} disabled={!own} role="option" aria-selected={sel === id} aria-label="{heroOf(id).name}{own ? '' : ' · 잠김'}{isWeak(id) ? ' · 약점' : ''}" data-id={id} onclick={() => (sel = id)}>
          {#if p}<i class="face" style="background-image:url({p.url});background-size:{p.cols * 100}% {p.rows * 100}%;background-position:{(p.c[0] / Math.max(1, p.cols - 1)) * 100}% {(p.c[1] / Math.max(1, p.rows - 1)) * 100}%"></i>{:else}<HeroSprite {id} scale={0.9} dim={!own} />{/if}
          <i class="fm"><FamShield fam={famOf(id)} size={18} /></i>
          {#if !own}<i class="lk">🔒</i>{:else if isWeak(id)}<i class="wk">약점</i>{/if}
        </button>
      {:else}<p class="none">이 거름에 맞는 용사가 없어요</p>{/each}
    </div>
  </div>
  <div class="bot"><button type="button" class="main" data-k="hero-sheet-go" disabled={!owned(sel)} onclick={() => onpick(sel)}>{mainText}</button></div>
</div>

<style>
  .awk { margin: 0; font: 600 14px var(--font); color: var(--text-2); line-height: 1.4; }
  .awk.on { color: var(--accent); }
  .dim { position: fixed; inset: 0; z-index: 80; background: rgba(5, 6, 9, 0.62); }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; top: max(48px, 8vh); z-index: 81; margin: 0 auto; max-width: 560px; display: flex; flex-direction: column; border-radius: 20px 20px 0 0; background: var(--surface, #181b22); color: var(--text, #f2f3f5); box-shadow: 0 -8px 24px #0008; animation: up 0.22s ease-out; }
  @keyframes up { from { transform: translateY(40px); opacity: 0; } }
  .grab { display: block; width: 40px; height: 4px; border-radius: 2px; background: var(--line, #2d3240); margin: 8px auto 2px; }
  header { display: flex; align-items: center; gap: 8px; padding: 2px 14px 6px; }
  header b { flex: 1; font: 900 18px var(--font); }
  .x { width: 48px; height: 48px; border-radius: 12px; border: none; background: var(--surface-2, #222632); color: var(--text-2, #b4b8c2); font-size: 18px; }
  .body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 0 14px 8px; display: flex; flex-direction: column; gap: 10px; }
  .bw { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font: 700 14px var(--font); color: var(--text-2, #b4b8c2); }
  .fam { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 8px; border-radius: 14px; background: var(--surface-2, #222632); color: var(--text, #f2f3f5); }
  .pickd { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; background: var(--surface-2, #222632); }
  .big { flex: none; width: 84px; height: 84px; border-radius: 14px; display: grid; place-items: center; overflow: hidden; background: #2a2016; box-shadow: inset 0 0 0 2px var(--accent, #f5b84a); }
  .n { min-width: 0; } .n b { display: block; font: 900 17px var(--font); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tags span { display: inline-flex; align-items: center; gap: 3px; min-height: 26px; padding: 0 8px; border-radius: 13px; background: var(--surface, #181b22); font: 700 14px var(--font); color: var(--text-2, #b4b8c2); }
  .tags .w { background: var(--accent, #f5b84a); color: #2a1c05; }
  .sk { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .sk .s { min-height: 48px; padding: 2px 4px; border-radius: 10px; border: none; background: var(--surface-2, #222632); color: var(--text-2, #b4b8c2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
  .sk .s:disabled { opacity: 1; }
  .sk .s b { font: 800 14px var(--font); color: var(--text, #f2f3f5); }
  .sk .s small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 700 14px var(--font); }
  .sk .s.on { box-shadow: inset 0 0 0 2px var(--accent, #f5b84a); } .sk .s.on b { color: var(--accent, #f5b84a); }
  .eff { margin: 0; font: 600 14px var(--font); color: var(--text-2, #b4b8c2); }
  .famfx { margin: 0; font: 600 14px var(--font); color: var(--text-2, #b4b8c2); }
  .stats { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 8px; }
  .stats li { display: flex; justify-content: space-between; gap: 4px; min-height: 28px; align-items: center; padding: 0 8px; border-radius: 8px; background: var(--surface-2, #222632); font: 600 14px var(--font); } .stats b small { margin-left: 2px; color: var(--text-3, #7c8190); }
  .note { margin: 0; font: 600 14px var(--font); color: var(--text-3, #7c8190); }
  .flt { display: flex; gap: 6px; flex-wrap: wrap; }
  .flt button { min-height: 44px; padding: 0 14px; border-radius: 22px; border: none; background: var(--surface-2, #222632); color: var(--text-2, #b4b8c2); font: 700 14px var(--font); }
  .flt button.on { background: var(--accent, #f5b84a); color: #2a1c05; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .cell { position: relative; aspect-ratio: 1; min-height: 48px; border-radius: 12px; border: none; padding: 0; background: var(--surface-2, #222632); display: grid; place-items: center; overflow: hidden; }
  .cell.on { box-shadow: inset 0 0 0 3px var(--accent, #f5b84a); }
  .cell.lock { opacity: 0.38; }
  .face { position: absolute; inset: 6%; background-repeat: no-repeat; image-rendering: pixelated; }
  .fm { position: absolute; top: 3px; right: 3px; font-style: normal; }
  .wk { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); padding: 0 5px; border-radius: 5px; background: var(--accent, #f5b84a); color: #2a1c05; font: 900 14px/18px var(--font); font-style: normal; white-space: nowrap; }
  .lk { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 16px; }
  .none { grid-column: 1 / -1; margin: 8px 0; text-align: center; color: var(--text-2, #b4b8c2); }
  .bot { flex: none; padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }
  .main { width: 100%; height: 56px; border: none; border-radius: 14px; background: var(--accent, #f5b84a); color: #2a1c05; font: 900 18px var(--font); box-shadow: 0 3px 0 var(--accent-sh, #b9822a); }
  .main:disabled { background: #3a3c44; color: #8a8e99; box-shadow: none; }
  @media (prefers-reduced-motion: reduce) { .sheet { animation: none; } }
</style>
