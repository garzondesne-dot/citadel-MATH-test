<script lang="ts">
  import { untrack } from 'svelte';
  // 👥 용사 고르기 (시안 atb-6-pick · 결정 W1-b): 왼쪽 초상 격자(실제 용사 초상 · 역할 · 계열 귀퉁이 · 「약점!」 리본 · 잠긴 칸)
  //   오른쪽 = 이름 · 직업 · 역할 · 계열 · 약점 배지 · 용사 수치(이 창에서만 · 방어 0 = 「0%」) · 스킬 3칸(장착 · 역할 · 각성 필살기) · 「이 용사로」
  import { heroOf, ladder, skillName, SKILL_PRICE, SKILL_SCROLL } from '../../../model/hero';
  import { portraitOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import { famOf, lookOfStats, roleOf, statRows, statsOf } from '../../../board/atb/heroes';
  import { FAM_NAME, FAM_FX_TXT, ROLE_NAME, ROLE_SKILL, T, type BossCfg, type Fam, type Role } from '../../../board/atb/tune';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  import FamShield from './FamShield.svelte';
  const { ids, owned, boss, cur, lv, enh, awk = false, tierOf, fxOf, onpick, onclose, onskill }: {
    ids: number[]; owned: (id: number) => boolean; boss: BossCfg; cur: number; lv: number; enh: number; awk?: boolean; tierOf: (id: number) => number; fxOf: (id: number) => string; onpick: (id: number) => void; onclose: () => void; /** ⚡ 장착 스킬 단계 고르기 (요청 #16) */ onskill?: (id: number, tier: number) => void;
  } = $props();
  const RI: Record<Role, IconName> = { dealer: 'role-dealer', tank: 'role-tank', healer: 'role-healer', support: 'role-support' };
  let sel = $state(untrack(() => cur)); // 연 때 용사부터
  const st = $derived(statsOf({ hero: sel, lv, enh, tier: tierOf(sel), awk })), info = $derived(heroOf(sel));
  const isWeak = (id: number) => boss.weak.includes(famOf(id));
  const pt = (id: number) => portraitOf(id);
</script>

<div class="pk" role="dialog" aria-label="용사 고르기" data-k="atb-pick">
  <header><h2>용사 고르기</h2><span class="bw">이번 보스 약점 {#each boss.weak as f (f)}<FamShield fam={f} size={20} /> {FAM_NAME[f]} {/each}</span><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></header>
  <div class="grid" role="listbox" aria-label="용사">
    {#each ids as id (id)}
      {@const p = pt(id)}
      {@const own = owned(id)}
      <button type="button" class="cell" class:on={sel === id} class:lock={!own} disabled={!own} aria-selected={sel === id} role="option" aria-label="{heroOf(id).name}{own ? '' : ' · 잠김'}" data-id={id} onclick={() => (sel = id)}>
        {#if p}<i class="face" class:dim={!own} style="background-image:url({p.url});background-size:{p.cols * 100}% {p.rows * 100}%;background-position:{(p.c[0] / Math.max(1, p.cols - 1)) * 100}% {(p.c[1] / Math.max(1, p.rows - 1)) * 100}%"></i>{:else}<HeroSprite id={id} scale={1} dim={!own} />{/if}
        <i class="cr l"><AtbIcon name={RI[roleOf(id)]} size={20} /></i><i class="cr r"><FamShield fam={famOf(id)} size={20} /></i>
        {#if !own}<i class="lk">🔒</i>{:else if isWeak(id)}<i class="wk">약점!</i>{/if}
      </button>
    {/each}
  </div>
  <section class="info">
    <h3>{info.name} · {info.job}</h3>
    <div class="badges"><span><AtbIcon name={RI[st.role]} size={18} /> {ROLE_NAME[st.role]}</span><span><FamShield fam={st.fam} size={18} /> {FAM_NAME[st.fam]}</span>{#if isWeak(sel)}<span class="wk2">약점!</span>{/if}</div>
    <p class="famfx" data-k="atb-pick-famfx"><FamShield fam={st.fam} size={16} /> 🌈 {FAM_FX_TXT[st.fam].name} · {FAM_FX_TXT[st.fam].desc} <small>(장착 · 각성 스킬이 맞을 때)</small></p>
    <div class="mid">
      <div class="big"><HeroSprite id={lookOfStats(st)} aura={enh} scale={2} play /></div>
      <ul class="stats" aria-label="용사 수치">{#each statRows(st) as r (r.k)}<li data-stat={r.k}><span>{r.label}</span><b>{r.v}</b></li>{/each}</ul>
    </div>
    <!-- ⚡ 스킬 (📜 요청 #16): 장착 스킬 고르기 = 그 용사 속성 사다리 Ⅰ ~ Ⅳ · 값 = 캠프 「내 용사」와 같은 💎 · 📜 · 연습방 = 미리 보기(저장 안 됨) -->
    <div class="sk16" data-k="atb-pick-skills">
      <b class="sh">⚡ 장착 스킬</b>
      <div class="lad">
        {#each ladder(sel) as k, i (k)}
          {@const on = tierOf(sel) === i + 1}
          <button type="button" class="lg" class:on data-k="atb-pick-sk" data-tier={i + 1} onclick={() => onskill?.(sel, i + 1)}><small>{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i]}</small>{skillName(k)}<em>{on ? '✔ 장착' : SKILL_PRICE[k] != null ? `💎 ${SKILL_PRICE[k]}${SKILL_SCROLL[k] ? ` · 📜 ${SKILL_SCROLL[k]}` : ''}` : '업적'}</em><i class="pv" data-k="atb-pick-pv">💥 약 {Math.round(T.skillBase * T.ratio.equip * statsOf({ hero: sel, lv, enh, tier: i + 1, awk }).skillMul)}</i></button>
        {/each}
      </div>
      <p class="note">🧪 연습방 = 미리 보기 · 저장 안 됨 · 학생 판 = 캠프 「내 용사」와 같은 값으로 업그레이드</p>
      <div class="cond">
        <span class:off={st.tier < 4}>✴ 4레벨 스킬 = Ⅳ 장착하면 · ⚡⚡</span>
        <span class:off={!st.aura}>🛡 홀리 방패 = 🔨 +10 이면 · ⚡⚡</span>
        <span class:off={!st.awk}>✨ 각성 = 각성하면(+10 · Ⅳ · 호칭) · ⚡⚡⚡</span>
      </div>
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
  .sk16 { display: flex; flex-direction: column; gap: 4px; } .sh { font: 900 14px var(--font); }
  .lad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
  .lg { display: flex; flex-direction: column; align-items: center; gap: 1px; min-height: 52px; padding: 3px; border-radius: 8px; border: 2px solid #8a6a3a; background: #3a2618; color: #fff2d6; font: 800 11px var(--font-plain); line-height: 1.1; }
  .lg.on { border-color: #ffd34d; background: #6a4210; box-shadow: 0 0 8px #ffd34d; } .lg small { color: #ffd98a; font-weight: 900; } .lg em { font-style: normal; font-weight: 600; font-size: 10px; color: #ffe6b0; }
  .note { margin: 0; font: 600 10px var(--font-plain); color: #6a4a28; }
  .cond { display: flex; flex-direction: column; gap: 1px; font: 700 11px var(--font-plain); } .cond .off { opacity: 0.55; }
  .go { min-height: 48px; border-radius: 12px; border: 3px solid #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; font: 900 20px var(--font); box-shadow: 0 4px 0 #6a4210; }
  .lg .pv { display: block; font: 800 12px var(--font-plain); font-style: normal; color: #b0400a; } /* 📜 요청 #19 덧3 스킬 칸 어림 피해 */
  .famfx { margin: 2px 0 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font: 800 13px var(--font-plain); } .famfx small { font-weight: 600; opacity: 0.75; }
</style>
