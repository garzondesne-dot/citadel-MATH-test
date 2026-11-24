<script lang="ts">
  import { nameColorOf, nameFrameOf, type CosOn } from '../../model/cosmetics';
  // 🎨 이름표 (📜 2026-11-25 옷장 1차): 글자 색 · 움직이는 테두리 — 입은 것이 없으면 그냥 글자(바깥 꼴 그대로)
  //   캠프 · 모닥불 친구 · 게시판 · 종합실 명단 · 결과 화면이 같은 부품 · 줄어드는 움직임 설정이면 테두리만 멈춤
  const { name, on = null, tv = false }: { name: string; on?: CosOn | null; tv?: boolean } = $props();
  const c = $derived(nameColorOf(on)), f = $derived(nameFrameOf(on));
</script>

{#if f}<span class="nf {f.id}" class:tv style:--a={f.v} style:--b={f.v2 ?? f.v} data-k="cos-frame" data-frame={f.id}><b style:color={c || null} data-k="cos-name">{name}</b></span>{:else}<b class="nt" style:color={c || null} data-k="cos-name" data-color={on?.nameColor ?? ''}>{name}</b>{/if}

<style>
  .nt { font: inherit; }
  .nf { display: inline-block; position: relative; padding: 1px 8px; border-radius: 999px; border: 2px solid var(--a); background: rgba(0, 0, 0, 0.45); box-shadow: 0 0 6px var(--a); line-height: 1.25; }
  .nf b { font: inherit; color: #fff; }
  .nf.tv { border-width: 3px; padding: 2px 12px; }
  .nf_spark { animation: spark 1.4s ease-in-out infinite; }
  .nf_fire { animation: fire 0.9s ease-in-out infinite alternate; }
  .nf_star::after, .nf_spark::after { content: '✦'; position: absolute; right: -6px; top: -8px; font-size: 11px; color: var(--b); text-shadow: 0 0 4px var(--a); animation: tw 1.2s ease-in-out infinite; }
  .nf_star { border-style: dashed; animation: spark 2s linear infinite; }
  .nf_ice { background: linear-gradient(180deg, rgba(143, 232, 255, 0.25), rgba(0, 0, 0, 0.45)); animation: ice 2.4s ease-in-out infinite; }
  @keyframes spark { 0%, 100% { box-shadow: 0 0 4px var(--a); } 50% { box-shadow: 0 0 12px var(--b); } }
  @keyframes fire { from { box-shadow: 0 -2px 6px var(--a), 0 0 2px var(--b); } to { box-shadow: 0 -5px 12px var(--b), 0 0 6px var(--a); } }
  @keyframes ice { 0%, 100% { border-color: var(--a); } 50% { border-color: var(--b); } }
  @keyframes tw { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }
  @media (prefers-reduced-motion: reduce) { .nf, .nf::after { animation: none !important; } }
</style>
