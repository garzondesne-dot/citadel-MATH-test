<script lang="ts">
  // 🪨 몬스터 몸 금 (📜 게시판 던전 #38 ⑤ → #54 레이드도) — lv 0 ~ 3 (crackLevel) · mask = 같은 부모 안 몬스터 그림(.sprite · background-image)과 같은 칸을 마스크로(몸 밖엔 안 보임)
  //   부모 = 몬스터 그림 칸(position 있음) · 없으면 네모 위에 그대로
  const { lv, mask = true }: { lv: number; mask?: boolean } = $props();
  function follow(node: HTMLElement) {
    if (!mask) return {};
    let raf = 0; const f = () => { const sp = node.parentElement?.querySelector('.sprite, i[style*="background-image"]') as HTMLElement | null; if (sp) { const cs = sp.style; node.style.maskImage = node.style.webkitMaskImage = cs.backgroundImage; node.style.maskSize = node.style.webkitMaskSize = cs.backgroundSize; node.style.maskPosition = node.style.webkitMaskPosition = cs.backgroundPosition; node.style.width = cs.width || '100%'; node.style.height = cs.height || '100%'; } raf = requestAnimationFrame(f); };
    f(); return { destroy: () => cancelAnimationFrame(raf) };
  }
</script>

{#if lv > 0}<i class="crack" data-k="mon-crack" data-lv={lv} use:follow aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none">{#if lv >= 1}<polyline points="40,22 46,34 41,44 49,55" />{/if}{#if lv >= 2}<polyline points="60,40 54,52 61,62 55,74" /><polyline points="46,34 56,36" />{/if}{#if lv >= 3}<polyline points="30,52 38,60 33,70 42,82" /><polyline points="61,62 70,66" /><polyline points="38,60 47,62" />{/if}</svg></i>{/if}

<style>
  .crack { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; }
  .crack svg { width: 100%; height: 100%; } .crack polyline { fill: none; stroke: #1a0a0a; stroke-width: 2.4; stroke-linejoin: round; filter: drop-shadow(0 0 1px #fff8); vector-effect: non-scaling-stroke; }
</style>
