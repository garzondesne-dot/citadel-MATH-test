<script lang="ts" module>
  // 🛡 속성(5계열) = 방패 모양 칸 (📜 요청 #28 선생님 「네모 칸 말고 방패 모양 칸 · 대충 봐도 구별되게 뚜렷한 색 · 형태」)
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
  const { fam, size = 28, state = 'ok', title = '' }: { fam: Fam; size?: number; state?: 'ok' | 'crack' | 'gone' | 'empty'; title?: string } = $props();
  const c = $derived(FAM_SHIELD[fam]);
</script>

<span class="fs {state}" style:width="{size}px" style:height="{Math.round(size * 1.08)}px" data-k="fam-shield" data-fam={fam} title={title || c.name} role="img" aria-label="{state === 'empty' ? '빈 칸' : c.name}{state === 'gone' ? ' (깨짐)' : ''}">
  <svg viewBox="0 0 48 52" aria-hidden="true">
    <path d="M3 4 Q24 -1 45 4 V22 C45 36 35 45 24 50 C13 45 3 36 3 22 Z" fill={state === 'empty' ? '#1d1828cc' : c.fill} stroke={state === 'empty' ? '#c9b8e8' : c.edge} stroke-width="3" stroke-linejoin="round" stroke-dasharray={state === 'empty' ? '5 3' : undefined} />
    <path d="M7 8 Q24 4 41 8 V14 Q24 10 7 14 Z" fill="#fff" opacity="0.22" />
    {#if state === 'crack' || state === 'gone'}<polyline points="22,4 27,16 20,24 28,33 23,48" fill="none" stroke="#111" stroke-width="2.6" stroke-linejoin="round" /><polyline points="27,16 36,19" fill="none" stroke="#111" stroke-width="2" /><polyline points="20,24 11,27" fill="none" stroke="#111" stroke-width="2" />{/if}
  </svg>
  {#if state !== 'empty'}<i style:font-size="{Math.round(size * 0.56)}px">{c.emo}</i>{/if}
</span>

<style>
  .fs { position: relative; display: inline-grid; place-items: center; flex: 0 0 auto; vertical-align: middle; }
  .fs svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 1px 0 #0008); }
  .fs i { position: relative; top: -6%; font-style: normal; line-height: 1; filter: brightness(0) invert(1) drop-shadow(0 1px 0 #0006); }
  .fs.crack svg path:first-child { filter: brightness(0.6); }
  .fs.gone { opacity: 0.85; } .fs.gone svg path:first-child { filter: brightness(0.4) saturate(0.6); } .fs.gone i { opacity: 0.45; }
</style>
