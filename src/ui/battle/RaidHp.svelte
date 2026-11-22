<script lang="ts">
  // ❤ 몬스터 체력바 = 레이드 장면(Scene.svelte .mhp)과 같은 모양 · 같은 색(--hp) · 「이름 · 체력 a / b」 글 + 아래 공격 게이지(.ag · hot = 붉게 깜빡)
  //   📜 2026-11-20 요청 #7 「몬스터 체력바 레이드 체력바처럼」 · 게시판 던전이 씀 · 줄어드는 연출 = 깎인 만큼 흰 조각이 0.6초 뒤 따라 줄어듦
  const { name, left, max, gauge = null, align = 'right', inside = false, marks = [] }: {
    name: string; left: number; max: number; /** 📜 #101 ⑤ 눈금 (0 ~ 1 · 게시판 = 70% 실드 · 30% 분노) */ marks?: { at: number; k: string; /** 눈금 글자 (막대 아래) */ t?: string }[];
    /** ⏱ 공격 게이지 (p 0 ~ 1 · txt · hot = 곧 공격 · blue = 멈춤 · 석화 · 약점) */ gauge?: { p: number; txt: string; hot?: boolean; blue?: boolean } | null; align?: 'left' | 'right' | 'center'; /** 📜 게시판 던전 UI v2 = 이름만 위 · 「a / b」 는 굵은 붉은 막대 안 */ inside?: boolean;
  } = $props();
  const pct = $derived(max ? Math.max(0, Math.min(100, (left / max) * 100)) : 0);
</script>

<div class="mhp" style:text-align={align} data-k="raid-hp">
  {#if inside}<span>{name}</span>
  <div class="b in" class:lab={marks.some((m) => !!m.t)}><i class="lag" style:width="{pct}%"></i><i class="cur" style:width="{pct}%"></i>{#each marks as m (m.k)}<i class="mk {m.k}" style:left="{m.at * 100}%" data-k="hp-mark-{m.k}" aria-hidden="true"></i>{#if m.t}<small class="ml {m.k}" style:left="{m.at * 100}%">{m.t}</small>{/if}{/each}<em><b data-k="atb-boss-hp">{left}</b> / {max}</em></div>
  {:else}<span>{name} · 체력 <b data-k="atb-boss-hp">{left}</b> / {max}</span>
  <div class="b"><i class="lag" style:width="{pct}%"></i><i class="cur" style:width="{pct}%"></i></div>{/if}
  {#if gauge}<div class="ag" class:hot={gauge.hot} class:blue={gauge.blue} data-k="atk-gauge"><i style:width="{Math.round(Math.max(0, Math.min(1, gauge.p)) * 100)}%"></i><span>{gauge.txt}</span></div>{/if}
</div>

<style>
  .mhp { width: 100%; display: flex; flex-direction: column; gap: var(--s1, 4px); color: #fff; font-size: var(--fs-small, 13px); font-weight: 700; text-shadow: 0 1px 0 #000; }
  .mhp b { font-weight: 800; }
  .b { position: relative; height: 10px; border-radius: 5px; background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(255, 255, 255, 0.25); }
  .b i { position: absolute; left: 0; top: 0; display: block; height: 8px; border-radius: 4px; }
  .b .cur { background: var(--hp, #e5484d); transition: width 0.4s; }
  .b .lag { background: #fff6; transition: width 0.5s ease-in 0.6s; }
  .b .mk { top: -2px; height: calc(100% + 4px); width: 2px; margin-left: -1px; border-radius: 1px; background: #fff; box-shadow: 0 0 2px #000; z-index: 2; } .b .mk.shield { background: #8fd8ff; } .b .mk.rage { background: #ff8a5a; }
  .b.in { height: 18px; border-radius: 9px; } .b.in .lag { transition: width 0.3s ease-in 0.4s; } /* 📜 게시판 던전 요청 #38 = 흰 조각 0.4초 머묾 → 0.3초에 따라 줄어듦 */ .b.in i { height: 16px; border-radius: 8px; } .b.in em { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.25em; white-space: nowrap; font: 800 12px var(--font-plain, sans-serif); font-style: normal; line-height: 1; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
  .ag { position: relative; height: 16px; border-radius: 4px; background: rgba(21, 18, 15, 0.85); border: 1px solid #6a4a1c; overflow: hidden; }
  .ag i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #ffd34a, #ff8a2a); }
  .ag span { position: relative; display: block; text-align: center; font-size: 12px; line-height: 14px; font-variant-numeric: tabular-nums; }
  .ag.hot { border-color: #ff5a4a; box-shadow: 0 0 8px #ff3a2a; }
  .ag.hot i { background: linear-gradient(90deg, #ff8a2a, #ff2a3a); animation: agHot 0.3s steps(2) infinite; }
  .ag.blue { border-color: #5ab0ff; box-shadow: 0 0 6px #5ab0ff88; } .ag.blue i { background: linear-gradient(90deg, #5ab0ff, #8fd0ff); animation: none; }
  @keyframes agHot { 50% { filter: brightness(1.5); } }
  @media (prefers-reduced-motion: reduce) { .ag.hot i { animation: none; } }
  .b.in.lab { margin-bottom: 16px; overflow: visible; }
  .b .ml { z-index: 3; position: absolute; top: calc(100% + 1px); translate: -50% 0; font: 800 14px var(--font-plain); line-height: 1; color: #cfe8ff; text-shadow: 0 1px 1px #000, 0 0 2px #000; white-space: nowrap; pointer-events: none; } .b .ml.rage { color: #ffb08a; }
</style>
