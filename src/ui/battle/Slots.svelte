<script lang="ts" module>
  export type Mark = 'ok' | 'part' | 'bad';
  /** 한 번 낸 것의 칸 색 (맞힌 수 / 전체) */
  export const markOf = (correct: number, total: number): Mark => (total > 0 && correct >= total ? 'ok' : correct > 0 ? 'part' : 'bad');
</script>

<script lang="ts">
  // ▢ 도전 칸 = 공격 단추 안 (#152 · DECISIONS 「⚡ v1.0 도전 칸 → 기력」 · 하트 그림 대신)
  //   아직 = 빈 네모 · 지금 = 살짝 채움 · 그 도전에서 소문제 모두 맞힘 = 초록 ✔ · 일부만 = 노랑 · 하나도 못 맞힘 = 빨강 −
  //   💚 받은 힐 칸 = 초록 테두리(+1) · 반 칸(소레이드 졸개 오답 ½) = 노랑
  const { total, marks = [], now = true, heal = 0 }: { total: number; marks?: Mark[]; now?: boolean; heal?: number } = $props();
  const n = $derived(Math.max(marks.length, Math.ceil(total)));
  const cells = $derived(Array.from({ length: n }, (_, i) => (i < marks.length ? marks[i] : i === marks.length && now ? 'now' : 'empty') as Mark | 'now' | 'empty'));
</script>

<span class="sl" role="img" aria-label="도전 칸 {n}칸 · 남은 {Math.max(0, n - marks.length)}칸">
  {#each cells as c, i (i)}<i class={c} class:heal={c !== 'ok' && c !== 'part' && c !== 'bad' && i >= n - heal}>{c === 'ok' ? '✔' : c === 'bad' ? '−' : ''}</i>{/each}
</span>

<style>
  .sl { display: inline-flex; gap: 3px; padding: 4px 5px; border-radius: 9px; background: rgba(0, 0, 0, 0.18); }
  i { width: 16px; height: 16px; border-radius: 4px; border: 2px solid rgba(40, 30, 0, 0.55); display: grid; place-items: center; font: 900 12px/1 var(--font); font-style: normal; color: #fff; box-sizing: border-box; }
  i.now { background: rgba(255, 255, 255, 0.45); }
  i.ok { background: var(--ok); border-color: #1d6b45; }
  i.part { background: #f5c542; border-color: #8a6a10; }
  i.bad { background: var(--bad); border-color: #7a1a14; }
  i.heal { border-color: var(--ok); box-shadow: 0 0 0 1px var(--ok); }
</style>
