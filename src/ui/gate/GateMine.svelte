<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import type { Store } from '../../model/types';
  import { abcRecPath, abcStep, type AbcRec } from '../../school/abcSheet';
  import { kstDay, myGate, tallyOf } from '../../school/gate';
  // 📊 내가 지은 차원문 (📜 11/28) — 내 기록만 · 순위 · 다른 학생 없음
  //   내 돌(어느 세트로 · 날) · 연습 판 수 · 내 에너지 k · 우리 반 에너지 중 내 몫 % · 오늘 +
  const { S, RS, base, cls, plus = 0, onclose }: { S: Store; /** 내 칸 저장소 (서버 = 그 학생으로 묶인 거울) */ RS: Store; base: string; cls: string; plus?: number; onclose: () => void } = $props();
  const st = $derived(abcStep(RS.get<AbcRec>(abcRecPath(base))));
  const g = $derived(myGate(RS, base));
  const k = $derived(Number(g.e) || 0);
  const cls0 = $derived(Math.max(tallyOf(S, cls).e + plus, k));
  const share = $derived(cls0 ? Math.round((k / cls0) * 100) : 0);
  const today = $derived(Number(g.d?.[kstDay(Date.now())]) || 0);
  const md = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
</script>

<div class="lay">
  <Sheet {onclose}>
    {#snippet title()}📊 내가 지은 차원문{/snippet}
    <div class="mine" data-k="gate-mine">
      <div class="row"><span>🧱 내 돌</span><b data-k="gm-stone">{st.kind === 'done' ? `${st.by === 'R' ? 'C세트 다시' : `${st.by}세트`} 통과 · ${md(st.at)}` : '아직 · 답안지 7 / 7 이면 한 조각'}</b></div>
      <div class="row"><span>📄 연습</span><b data-k="gm-prac">{Number(g.p) || 0}번</b></div>
      <div class="row"><span>⚡ 내 에너지</span><b data-k="gm-e">{k}</b></div>
      <div class="row"><span>우리 반 에너지 중 내 몫</span><b data-k="gm-share">{share}%</b></div>
      <div class="row"><span>오늘</span><b data-k="gm-today">+{today}</b></div>
      <p class="note">내 기록만 보여요 · 순위는 없어요</p>
    </div>
  </Sheet>
</div>

<style>
  .lay { position: relative; z-index: 45; }
  .mine { display: grid; gap: 8px; }
  .row { display: flex; justify-content: space-between; gap: 10px; align-items: center; min-height: 44px; padding: 8px 12px; border-radius: 10px; background: var(--surface-2); font-size: 15px; }
  .row b { font-weight: 800; color: var(--accent); text-align: right; }
  .note { margin: 0; font-size: 13px; color: var(--text-2); text-align: center; }
</style>
