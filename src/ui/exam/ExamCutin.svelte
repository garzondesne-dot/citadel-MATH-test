<script lang="ts">
  import { onMount } from 'svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { EXAM_TXT, daysLeft } from '../../school/examEvent';
  import { EXAM_ART } from '../manifest';
  import { sfx } from '../sound.svelte';
  // ⚔ 출정 컷인 = 정체 공개 이야기 (📜 2026-11-25 · 머리 🔨): ① 현자 「모두 그림자였다」 → ② 어둠 · 지지직 → 시험지가 떠오르고 눈을 뜸 → ③ 「진짜 마왕은 ○월 ○일」 + D-n → ④ 「오직 너의 실력뿐」
  //   약 6초 · 화면 아무 데나 톡 = 건너뛰기 · 경보음(class-start) · 각성 컷인 손맛(비스듬한 띠 · 붉은 빛) · 글 = EXAM_TXT 한 곳
  const { date, now = Date.now(), ondone }: { date: string; now?: number; ondone: () => void } = $props();
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d = $derived(daysLeft(date, now) ?? 0);
  const T = [0, 1700, 2900, 4500, 6200]; // ① · ② · ③ · ④ · 끝 (ms)
  let step = $state(0), done = false;
  const say = (i: number) => { const c = EXAM_TXT.cut[i]; const v = c?.say; return typeof v === 'function' ? v(date) : v ?? ''; };
  function end() { if (done) return; done = true; ondone(); }
  onMount(() => {
    sfx('class-start', 0.7);
    const ts = T.slice(1).map((t, i) => setTimeout(() => { if (i + 1 >= T.length - 1) end(); else { step = i + 1; if (i + 1 === 1) sfx('mon-appear-boss', 0.7); } }, RM ? t * 0.6 : t));
    return () => ts.forEach(clearTimeout);
  });
</script>

<div class="xc" class:rm={RM} role="dialog" aria-modal="true" aria-label={EXAM_TXT.cutTitle} data-k="exam-cutin" data-step={step} onclick={end} onkeydown={(e) => e.key === 'Escape' && end()} tabindex="-1" style:--bg="url({EXAM_ART.bg})">
  <i class="bgi" aria-hidden="true"></i>
  <i class="red" aria-hidden="true"></i>
  <div class="band" aria-hidden="true"><b>{EXAM_TXT.cutTitle}</b></div>
  {#if step === 1 || step === 2 || step === 3}<i class="boss" class:eye={step >= 2} style="background-image:url({EXAM_ART.boss})" aria-hidden="true" data-k="exam-boss"></i>{/if}
  {#if step === 1}<i class="glitch" aria-hidden="true"></i>{/if}
  {#if step !== 1}<div class="sage" data-k="exam-sage"><span class="pic"><HeroSprite id={7} scale={1.6} play /></span><p class="line"><small>{EXAM_TXT.cut[step]?.who}</small>{say(step)}</p></div>{/if}
  {#if step >= 2}<p class="dd" data-k="exam-dd">{d === 0 ? 'D-DAY' : `D-${d}`}</p>{/if}
  <small class="skip">톡 = 건너뛰기</small>
</div>

<style>
  .xc { position: fixed; inset: 0; z-index: 80; overflow: hidden; background: #07040c; color: #fff; display: grid; place-items: center; cursor: pointer; animation: xin 0.25s ease-out both; }
  .bgi { position: absolute; inset: 0; background: var(--bg) center / cover no-repeat; image-rendering: pixelated; opacity: 0.55; filter: saturate(0.8) brightness(0.7); }
  .red { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(255, 40, 40, 0.35), transparent 65%), linear-gradient(180deg, rgba(120, 0, 0, 0.35), transparent 40%, rgba(80, 0, 0, 0.5)); animation: pulse 1.2s ease-in-out infinite; }
  .band { position: absolute; left: -10%; right: -10%; top: 12%; transform: rotate(-6deg); background: linear-gradient(90deg, transparent, #8a0f14 12%, #d4252b 50%, #8a0f14 88%, transparent); box-shadow: 0 0 24px rgba(255, 50, 50, 0.7); padding: 10px 0; text-align: center; animation: slide 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both; }
  .band b { font: 900 clamp(22px, 7vw, 42px) var(--font); letter-spacing: 0.04em; text-shadow: 0 2px 0 #3a0003, 0 0 12px #ff8a8a; }
  .boss { position: absolute; left: 50%; top: 50%; width: min(70vw, 420px); aspect-ratio: 543 / 724; transform: translate(-50%, -50%); background-size: 400% 100%; background-position: 0 0; image-rendering: pixelated; animation: rise 0.9s cubic-bezier(0.2, 1.2, 0.4, 1) both, float 2s 0.9s ease-in-out infinite; filter: drop-shadow(0 0 22px rgba(160, 40, 255, 0.8)); }
  .boss.eye { background-position: 66.667% 0; filter: drop-shadow(0 0 30px rgba(255, 40, 40, 0.95)); }
  .glitch { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 5px); mix-blend-mode: screen; animation: gl 0.12s steps(2) infinite; }
  .sage { position: absolute; left: 0; right: 0; bottom: 10%; display: flex; align-items: flex-end; gap: 10px; padding: 0 16px; animation: up 0.35s ease-out both; }
  .sage .pic { flex: none; }
  .line { margin: 0 0 10px; padding: 12px 14px; border-radius: 14px; background: rgba(10, 6, 16, 0.85); border: 2px solid #d4252b; font: 800 clamp(16px, 4.6vw, 24px)/1.4 var(--font); box-shadow: 0 0 16px rgba(255, 40, 40, 0.45); }
  .line small { display: block; font: 700 13px var(--font); color: #ffb3b3; }
  .dd { position: absolute; right: 6%; top: 24%; margin: 0; font: 900 clamp(34px, 12vw, 72px) var(--font); color: #ff4a4a; text-shadow: 0 0 18px rgba(255, 60, 60, 0.9), 0 3px 0 #3a0003; transform: rotate(-6deg); animation: stamp 0.35s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
  .skip { position: absolute; right: 12px; bottom: 12px; font: 600 13px var(--font); color: rgba(255, 255, 255, 0.6); }
  @keyframes xin { from { opacity: 0; } }
  @keyframes slide { from { transform: translateX(-110%) rotate(-6deg); } }
  @keyframes rise { from { opacity: 0; transform: translate(-50%, -30%) scale(0.6); } }
  @keyframes float { 0%, 100% { margin-top: 0; } 50% { margin-top: -10px; } }
  @keyframes gl { 0% { transform: translateX(-3px); } 100% { transform: translateX(3px); } }
  @keyframes up { from { opacity: 0; transform: translateY(20px); } }
  @keyframes stamp { from { opacity: 0; transform: scale(2) rotate(-6deg); } }
  @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
  .rm *, .rm { animation: none !important; }
</style>
