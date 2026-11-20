<script lang="ts">
  import { untrack } from 'svelte';
  // 👥 용사 고르기 (시안 atb-6-pick · 결정 W1-b): 왼쪽 초상 격자(실제 용사 초상 · 역할 · 계열 귀퉁이 · 「약점!」 리본 · 잠긴 칸)
  //   오른쪽 = 이름 · 직업 · 역할 · 계열 · 약점 배지 · 용사 수치(이 창에서만 · 방어 0 = 「0%」) · 스킬 3칸(장착 · 역할 · 각성 필살기) · 「이 용사로」
  import { heroOf, skillName } from '../../../model/hero';
  import { portraitOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import { famOf, roleOf, statRows, statsOf } from '../../../board/atb/heroes';
  import { FAM_NAME, ROLE_NAME, ROLE_SKILL, type BossCfg, type Fam, type Role } from '../../../board/atb/tune';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  const { ids, owned, boss, cur, lv, enh, awk = false, tierOf, fxOf, onpick, onclose }: {
    ids: number[]; owned: (id: number) => boolean; boss: BossCfg; cur: number; lv: number; enh: number; awk?: boolean; tierOf: (id: number) => number; fxOf: (id: number) => string; onpick: (id: number) => void; onclose: () => void;
  } = $props();
  const FI: Record<Fam, IconName> = { arms: 'fam-arms', flame: 'fam-flame', nature: 'fam-nature', wisdom: 'fam-wisdom', mystic: 'fam-mystic' };
  const RI: Record<Role, IconName> = { dealer: 'role-dealer', tank: 'role-tank', healer: 'role-healer', support: 'role-support' };
  let sel = $state(untrack(() => cur)); // 연 때 용사부터
  const st = $derived(statsOf({ hero: sel, lv, enh, tier: tierOf(sel), awk })), info = $derived(heroOf(sel));
  const isWeak = (id: number) => boss.weak.includes(famOf(id));
  const pt = (id: number) => portraitOf(id);
</script>

<div class="pk" role="dialog" aria-label="용사 고르기" data-k="atb-pick">
  <header><h2>용사 고르기</h2><span class="bw">이번 보스 약점 {#each boss.weak as f (f)}<AtbIcon name={FI[f]} size={20} /> {FAM_NAME[f]} {/each}</span><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></header>
  <div class="grid" role="listbox" aria-label="용사">
    {#each ids as id (id)}
      {@const p = pt(id)}
      {@const own = owned(id)}
      <button type="button" class="cell" class:on={sel === id} class:lock={!own} disabled={!own} aria-selected={sel === id} role="option" aria-label="{heroOf(id).name}{own ? '' : ' · 잠김'}" data-id={id} onclick={() => (sel = id)}>
        {#if p}<i class="face" class:dim={!own} style="background-image:url({p.url});background-size:{p.cols * 100}% {p.rows * 100}%;background-position:{(p.c[0] / Math.max(1, p.cols - 1)) * 100}% {(p.c[1] / Math.max(1, p.rows - 1)) * 100}%"></i>{:else}<HeroSprite id={id} scale={1} dim={!own} />{/if}
        <i class="cr l"><AtbIcon name={RI[roleOf(id)]} size={20} /></i><i class="cr r"><AtbIcon name={FI[famOf(id)]} size={20} /></i>
        {#if !own}<i class="lk">🔒</i>{:else if isWeak(id)}<i class="wk">약점!</i>{/if}
      </button>
    {/each}
  </div>
  <section class="info">
    <h3>{info.name} · {info.job}</h3>
    <div class="badges"><span><AtbIcon name={RI[st.role]} size={18} /> {ROLE_NAME[st.role]}</span><span><AtbIcon name={FI[st.fam]} size={18} /> {FAM_NAME[st.fam]}</span>{#if isWeak(sel)}<span class="wk2">약점!</span>{/if}</div>
    <div class="mid">
      <div class="big"><HeroSprite id={sel} scale={2} play /></div>
      <ul class="stats" aria-label="용사 수치">{#each statRows(st) as r (r.k)}<li data-stat={r.k}><span>{r.label}</span><b>{r.v}</b></li>{/each}</ul>
    </div>
    <!-- 💠 이 용사가 쓸 수 있는 스킬 (Y2 · Y3 · 충전 비용) -->
    <div class="sks">
      <span class="sk"><small>장착 · ⚡1</small>{skillName(fxOf(sel))} {['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][tierOf(sel) - 1]}</span>
      <span class="sk"><small>역할 · ⚡1</small>{ROLE_SKILL[st.role]}</span>
      <span class="sk" class:off={st.tier < 4}><small>4레벨 · ⚡2</small>{st.tier >= 4 ? '열림' : 'Ⅳ 장착이면'}</span>
      <span class="sk" class:off={!st.aura}><small>오라 방패 · ⚡2</small>{st.aura ? '열림' : '🔨 +10 이면'}</span>
      <span class="sk" class:off={!st.awk}><small>✨ 각성 · ⚡3</small>{st.awk ? '열림' : '각성하면'}</span>
    </div>
    <button type="button" class="go" data-k="atb-pick-go" onclick={() => onpick(sel)}>⚔ 이 용사로</button>
  </section>
</div>

<style>
  .pk { position: fixed; inset: 2%; z-index: 60; display: grid; grid-template-columns: 1fr 1.05fr; grid-template-rows: auto 1fr; gap: 8px 12px; padding: 10px; border-radius: 16px; border: 3px solid #c9953e; background: #2a1a10f5; color: #fff; font-family: var(--font); box-shadow: 0 0 0 3px #1a100a, 0 0 30px #000; }
  header { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; }
  h2 { margin: 0; padding: 2px 22px; border-radius: 10px; background: linear-gradient(#a8261e, #6a1010); border: 2px solid #e2b04a; font: 900 20px var(--font); }
  .bw { flex: 1; text-align: right; font: 700 13px var(--font-plain); display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
  .x { width: 40px; height: 40px; border-radius: 10px; border: 2px solid #e2b04a; background: #a8261e; color: #fff; font: 900 18px var(--font); }
  .grid { min-height: 0; overflow: auto; overscroll-behavior: contain; display: grid; grid-template-columns: repeat(auto-fill, 74px); grid-auto-rows: 74px; justify-content: center; gap: 6px; align-content: start; padding: 4px; border-radius: 10px; background: #1a100a; }
  .cell { position: relative; width: 74px; height: 74px; padding: 0; border-radius: 10px; border: 2px solid #8a6a3a; background: linear-gradient(#3a4a7a, #22284a); overflow: hidden; }
  .cell.on { border-color: #ffd34d; box-shadow: 0 0 10px #ffd34d; }
  .cell.lock { background: #222; }
  .face { position: absolute; inset: 0; image-rendering: pixelated; } .face.dim { filter: grayscale(1) brightness(0.35); }
  .cr { position: absolute; top: 2px; display: inline-flex; } .cr.l { left: 2px; } .cr.r { right: 2px; }
  .lk { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 22px; font-style: normal; }
  .wk, .wk2 { position: absolute; left: 50%; bottom: 3px; transform: translateX(-50%); padding: 0 6px; border-radius: 6px; background: linear-gradient(#e8332a, #9a1010); border: 1px solid #ffd34d; font: 900 11px var(--font); font-style: normal; white-space: nowrap; }
  .info { min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; border: 3px solid #b88a4a; background: radial-gradient(ellipse at 50% 30%, #fbf0d6, #e9d3a6); color: #3a2614; }
  h3 { margin: 0; text-align: center; font: 900 19px var(--font); }
  .badges { display: flex; justify-content: center; gap: 6px; } .badges span { display: inline-flex; align-items: center; gap: 3px; padding: 2px 10px; border-radius: 10px; border: 2px solid #8a6a3a; background: #4a3020; color: #fff2d6; font: 800 13px var(--font); }
  .badges .wk2 { position: static; transform: none; font-size: 13px; }
  .mid { display: flex; align-items: center; gap: 8px; }
  .big { flex: none; }
  .stats { flex: 1; margin: 0; padding: 4px 8px; list-style: none; border-radius: 10px; background: #f6e7c4; border: 1px solid #c9a36a; }
  .stats li { display: flex; justify-content: space-between; padding: 2px 0; font: 800 14px var(--font-plain); border-bottom: 1px dashed #d8bf8a; } .stats li:last-child { border: none; }
  .sks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .sk { display: flex; flex-direction: column; padding: 4px 6px; border-radius: 8px; background: #3a2618; color: #fff2d6; font: 800 12px var(--font-plain); } .sk small { font-weight: 600; color: #ffd98a; } .sk.off { opacity: 0.6; }
  .go { min-height: 48px; border-radius: 12px; border: 3px solid #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; font: 900 20px var(--font); box-shadow: 0 4px 0 #6a4210; }
</style>
