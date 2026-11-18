<script lang="ts">
  import { CREDIT_NAME } from '../channel';
  import { HEROES, TEACHER_HEROES } from '../model/hero';
  import HeroSprite from './camp/HeroSprite.svelte';
  // 🎬 #74 이스터에그 8 「만든 이 크레딧」: 첫 화면 「만든 이」 5번 → 용사 모두 숨쉬기 + 10강 오라 행진 크레딧 · 누르면 닫힘
  const { onclose }: { onclose: () => void } = $props();
  const ids0 = [...HEROES, ...TEACHER_HEROES].map((h) => h.id), ids = ids0.includes(16) ? ids0 : [...ids0, 16]; // 용사 모두 + 선생님 용사 + 🌟 각성한 로안
  const half = Math.ceil(ids.length / 2);
</script>

<button type="button" class="roll" data-k="credit-roll" onclick={onclose} aria-label="크레딧 닫기">
  <div class="crew" aria-hidden="true">
    {#each ids.slice(0, half) as id, i (id)}<span class="h" style="animation-delay:{(i % 6) * 0.15}s"><HeroSprite {id} scale={1} play /></span>{/each}
  </div>
  <div class="mid">
    <b>🎬 모두의 던전</b>
    <span>만든 이 · {CREDIT_NAME}</span>
    <small>용사 {ids.length}명과 함께 · 고마워요!</small>
  </div>
  <div class="march" aria-hidden="true">
    {#each ids.slice(half) as id, i (id)}<span class="m" style="animation-delay:{i * 0.35}s"><HeroSprite {id} scale={1} aura={10} play /></span>{/each}
  </div>
</button>

<style>
  .roll { position: fixed; inset: 0; z-index: 95; border: 0; padding: 0; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(circle at 50% 45%, #1e1a10, #050608 75%); color: #fff; overflow: hidden; animation: fade 0.5s ease-out both; }
  .crew { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; padding: 24px 8px 0; }
  .h { animation: breathe 1.6s ease-in-out infinite; }
  .mid { display: flex; flex-direction: column; align-items: center; gap: 6px; font: 600 15px var(--font); }
  .mid b { font: 900 26px var(--font); color: #ffd98a; text-shadow: 0 0 16px rgba(255, 200, 90, 0.7); }
  .mid small { color: #c9c1a8; }
  .march { position: relative; height: 120px; }
  .m { position: absolute; bottom: 16px; left: 0; animation: walk 9s linear infinite; }
  @keyframes breathe { 50% { transform: translateY(-3px) scale(1.03); } }
  @keyframes walk { from { transform: translateX(-90px); } to { transform: translateX(110vw); } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .h, .m { animation: none; } .m { position: static; display: inline-block; } .march { display: flex; flex-wrap: wrap; height: auto; } }
</style>
