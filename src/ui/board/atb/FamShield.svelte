<script lang="ts" module>
  // 🎨 📜 #117 속성 표시 = icons-v1 0 ~ 4 한 벌(무기 · 화염 · 자연 · 지혜 · 신비 · 이모지 · 방패 그림 안 씀) · 이름은 그대로 FamShield
  // (옛) 🛡 속성(5계열) = 방패 모양 칸 (📜 요청 #28 선생님 「네모 칸 말고 방패 모양 칸 · 대충 봐도 구별되게 뚜렷한 색 · 형태」)
  //   위가 넓고 아래가 뾰족한 방패 · 계열 색 꽉 채움 + 진한 테두리 2px · 안 = 흰 실루엣(이모지를 하얗게) 약 60%
  //   색만으로 5개가 갈리게: 무기 은회 · 화염 빨강 · 자연 초록 · 지혜 진한 파랑 · 신비 밝은 붉은 보라(지혜와 밝기 차이 크게)
  //   state = ok · crack(어둡게 + 금) · gone(깨져 없어진 칸 = 어둡고 금 간 채 흐리게) · 실드 깨짐 연출은 부모(.cell2)가 그대로
  import type { Fam } from '../../../board/atb/tune';
  export const FAM_SHIELD: Record<Fam, { fill: string; edge: string; emo: string; name: string }> = {
    arms: { fill: '#8a93a8', edge: '#3c4252', emo: '🗡', name: '무기' },
    flame: { fill: '#e8452c', edge: '#7a1608', emo: '🔥', name: '화염' },
    nature: { fill: '#3fae3a', edge: '#14551a', emo: '🍃', name: '자연' },
    wisdom: { fill: '#1f5fd0', edge: '#0a2766', emo: '📖', name: '지혜' },
    mystic: { fill: '#c04ad8', edge: '#5a1470', emo: '🔮', name: '신비' },
  };
</script>

<script lang="ts">
  import AtbIcon from './AtbIcon.svelte';
  const { fam, size = 28, state = 'ok', title = '' }: { fam: Fam; size?: number; state?: 'ok' | 'crack' | 'gone' | 'empty'; title?: string } = $props();
  const c = $derived(FAM_SHIELD[fam]);
</script>

<span class="fs {state}" style:width="{size}px" style:height="{size}px" data-k="fam-shield" data-fam={fam} title={title || c.name} role="img" aria-label="{state === 'empty' ? '빈 칸' : c.name}{state === 'gone' ? ' (깨짐)' : ''}">
  {#if state === 'empty'}<i class="emp"></i>{:else}<AtbIcon name={`fam-${fam}`} {size} />{/if}
</span>

<style>
  .fs { position: relative; display: inline-grid; place-items: center; flex: 0 0 auto; vertical-align: middle; filter: drop-shadow(0 1px 0 #0008); }
  .fs.crack { filter: brightness(0.7) drop-shadow(0 1px 0 #0008); }
  .fs.gone { filter: grayscale(0.8) brightness(0.55); opacity: 0.6; }
  .fs .emp { width: 80%; height: 80%; border-radius: 50%; border: 2px dashed #c9b8e8; background: #1d1828cc; }
</style>
