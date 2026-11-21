<script lang="ts" module>
  /** 🎨 게시판 던전 전투 그림 조각 (📜 hero-v2 9d1b6fa assets-1121/fx · 6칸 × 256 줄 시트 · 투명 webp) — 빛(charge · st · rage) = screen 섞기 · hst · ui = 보통 */
  export const fxUrl = (name: string) => `${import.meta.env.BASE_URL}art/board-atb/fx/${name}.webp`;
  /** CSS 변수용 url() = 문서 기준 절대 주소 (상대 주소면 스타일 파일(assets/) 기준으로 풀려 그림이 안 나옴) */
  export const fxCss = (name: string) => `url("${typeof document === 'undefined' ? fxUrl(name) : new URL(fxUrl(name), document.baseURI).href}")`;
  export const FX_LIGHT = (name: string) => /^(charge|st|rage)-/.test(name);
</script>

<script lang="ts">
  // 6칸 한 줄 그림을 돌림 · loop = 계속(상태 · 오라) / 한 번(터짐 · 관통) · x · y = 부모 기준 가운데 자리(없으면 부모 CSS 가 자리)
  const { name, w, h, x, y, loop = true, ms = 700, z = 20, delay = 0 }: { name: string; w: number; h?: number; x?: number | string; y?: number | string; loop?: boolean; ms?: number; z?: number; delay?: number } = $props();
  const px = (v: number | string | undefined) => (v == null ? undefined : typeof v === 'number' ? `${v}px` : v);
</script>

<i class="afx" class:light={FX_LIGHT(name)} class:once={!loop} data-k="atb-fx" data-fx={name} aria-hidden="true"
  style:left={px(x)} style:top={px(y)} style:width="{w}px" style:height="{h ?? w}px" style:z-index={z}
  style:background-image="url({fxUrl(name)})" style:--ms="{ms}ms" style:--dl="{delay}ms"></i>

<style>
  .afx { position: absolute; transform: translate(-50%, -50%); pointer-events: none; background-repeat: no-repeat; background-size: 600% 100%; background-position: 0 0; image-rendering: pixelated; animation: afx-run var(--ms) steps(6, jump-none) var(--dl) infinite; }
  .afx.once { animation: afx-run var(--ms) steps(6, jump-none) var(--dl) 1 forwards, afx-out 0.15s linear calc(var(--ms) + var(--dl)) forwards; }
  .afx.light { mix-blend-mode: screen; -webkit-mask-image: radial-gradient(ellipse closest-side, #000 62%, #0000 100%); mask-image: radial-gradient(ellipse closest-side, #000 62%, #0000 100%); } /* 빛 그림 칸 가장자리 = 부드럽게 (검은 바탕 → 투명 변환에 남은 옅은 빛이 네모로 보이지 않게) */
  @keyframes afx-run { from { background-position-x: 0%; } to { background-position-x: 100%; } }
  @keyframes afx-out { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .afx { animation-duration: calc(var(--ms) * 2); } }
</style>
