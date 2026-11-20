<script lang="ts" module>
  // 🎴 게시판 던전 ATB 아이콘 16칸 (GPT 시안 atb-7-icons 를 잘라 투명 처리 · public/art/board-atb/icons-v1.webp · 칸 96px)
  //   딜러(5번 칸) = 임시 과녁 · 선생님이 작업대 후보 4개 중 고르시면 그 칸만 바꿔 끼움
  export const ICONS = ['fam-arms', 'fam-flame', 'fam-nature', 'fam-wisdom', 'fam-mystic', 'role-dealer', 'role-tank', 'role-healer', 'role-support', 'zap', 'zap-gold', 'zap-empty', 'shield', 'shield-broken', 'revive', 'weak'] as const;
  export type IconName = (typeof ICONS)[number];
</script>

<script lang="ts">
  const { name, size = 24, label = '' }: { name: IconName; size?: number; label?: string } = $props();
  const i = $derived(Math.max(0, ICONS.indexOf(name)));
  const URL0 = `url(${import.meta.env.BASE_URL}art/board-atb/icons-v1.webp)`; // 베타 · 정식 주소 아래 폴더에서도
</script>

<i class="ai" style:background-image={URL0} style:width="{size}px" style:height="{size}px" style:background-size="{size * 16}px {size}px" style:background-position="{-i * size}px 0" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} data-icon={name}></i>

<style>
  .ai { display: inline-block; flex: none; background-repeat: no-repeat; image-rendering: pixelated; vertical-align: middle; }
</style>
