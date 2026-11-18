<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { sfx } from '../sound.svelte';
  // 🥚 #74 이스터에그 연출 (캠프 그림 위 · 4 ~ 6초 · 누르면 끝) — 칸 % 자리는 캠프 그림 1182 × 1330 기준
  //   e1 √2 별 숫자 흐름 · e2 참 잘했어요 도장 · e3 달 π + 웅덩이 물결 · e4 불꽃 1 1 2 3 5 8 · e5 깃발 + 파란 불 · e6 반딧불 ∞ 별자리 · e7 허수아비 털썩
  const { kind, first = false, name = '', title = '', ondone }: { kind: string; /** 처음 찾음 = 칭호 띠 */ first?: boolean; name?: string; title?: string; ondone: () => void } = $props();
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LEN: Record<string, number> = { e1: 6500, e2: 4500, e3: 5500, e4: 4500, e5: 3800, e6: 5500, e7: 4200 };
  const t = untrack(() => { const k = kind; sfx(k === 'e2' ? 'ach2' : k === 'e4' || k === 'e5' ? 'fire' : k === 'e7' ? 'dummy-hit' : 'star', 0.6); return setTimeout(() => ondone(), LEN[k] ?? 4000); }); onDestroy(() => clearTimeout(t));
  const ROOT2 = '1.41421356237309504880168872420969807856967187537694807317667973799';
  const PI = '3.14159265358979323846264338327950288419716939937510';
  const FIB = [1, 1, 2, 3, 5, 8];
  // ∞ (렘니스케이트) 위 점 24개
  const INF = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, d = 1 + Math.sin(a) ** 2; return { x: 50 + (34 * Math.cos(a)) / d, y: 24 + (22 * Math.sin(a) * Math.cos(a)) / d }; });
</script>

<button type="button" class="egg {kind}" class:rm={RM} data-k="egg-fx" data-egg={kind} aria-label="이스터에그" onclick={ondone}>
  {#if kind === 'e1'}
    <span class="sky" aria-hidden="true">{#each [0, 1, 2, 3, 4] as r (r)}<span class="row" style="top:{6 + r * 9}%;animation-delay:{r * -1.7}s">{ROOT2.slice(r * 3)}{ROOT2}</span>{/each}</span>
    <b class="big">√2 = 1.41421356…</b><em class="cap">끝이 없다 = 무리수!</em>
  {:else if kind === 'e2'}
    <span class="circle" aria-hidden="true"></span>
    <img class="stamp" aria-hidden="true" alt="" src="{import.meta.env.BASE_URL}art/board/egg-stamp-v1.webp" /><!-- 🥚 #79 선생님 그림 egg-stamp (참 잘했어요 꽃 도장 + 100) -->
    {#each Array(14) as _, n (n)}<i class="petal" style="--n:{n};left:{8 + ((n * 37) % 84)}%"></i>{/each}
  {:else if kind === 'e3'}
    <span class="pi" aria-hidden="true">π</span>
    <span class="pond" aria-hidden="true">{#each [0, 1, 2] as k (k)}<i class="rip" style="animation-delay:{k * 0.6}s"></i>{/each}<span class="wav">{PI}</span></span>
  {:else if kind === 'e4'}
    {#each FIB as f, i (i)}<span class="fib" style="animation-delay:{i * 0.55}s" aria-hidden="true"><b>{f}</b>{#each Array(f) as _, k (k)}<i style="--k:{k};--m:{f}">🔥</i>{/each}</span>{/each}
  {:else if kind === 'e5'}
    {#each [[39.4, 61.7], [60.6, 61.7], [64.8, 68], [35.5, 68]] as p, i (i)}<span class="flag" style="left:{p[0]}%;top:{p[1]}%;animation-delay:{i * 0.12}s" aria-hidden="true">🚩</span>{/each}
    <span class="bluefire" aria-hidden="true"></span>
  {:else if kind === 'e6'}
    {#each INF as p, i (i)}<i class="fly" style="--x:{p.x}%;--y:{p.y}%;--sx:{8 + ((i * 41) % 84)}%;animation-delay:{i * 0.07}s" aria-hidden="true"></i>{/each}
    <em class="cap low">∞ 무한</em>
  {:else if kind === 'e7'}
    <span class="flop" aria-hidden="true">💫</span><span class="sbub">좀 쉬자…</span>
  {/if}
  {#if first && name}<span class="found" data-k="egg-found">🥚 비밀 발견! 「{name}」{#if title}<small>칭호 「{title}」</small>{/if}</span>{/if}
</button>

<style>
  .egg { position: absolute; inset: 0; z-index: 30; border: 0; padding: 0; background: none; overflow: hidden; color: #fff; font: 700 14px var(--font); cursor: pointer; }
  .found { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 16px; border-radius: 14px; border: 2px solid #f5c95a; background: rgba(30, 20, 4, 0.88); color: #ffe39a; font: 800 15px var(--font); white-space: nowrap; animation: pop 0.5s 0.8s cubic-bezier(0.2, 1.5, 0.4, 1) both; }
  .found small { font: 600 12px var(--font); color: #e9d9a8; }
  .cap { position: absolute; left: 50%; top: 52%; transform: translateX(-50%); font: 900 22px var(--font); font-style: normal; color: #fff; text-shadow: 0 2px 0 #000, 0 0 14px rgba(140, 200, 255, 0.9); white-space: nowrap; animation: pop 0.5s 1.4s both; }
  .cap.low { top: 44%; }
  .big { position: absolute; left: 50%; top: 42%; transform: translateX(-50%); font: 900 26px var(--font); color: #cfe8ff; text-shadow: 0 0 12px #5aa8ff, 0 2px 0 #000; white-space: nowrap; animation: pop 0.5s 0.6s both; }
  /* e1 하늘에 별 숫자가 끝없이 흐름 */
  .sky { position: absolute; left: 0; right: 0; top: 0; height: 52%; background: linear-gradient(rgba(5, 10, 30, 0.55), transparent); }
  .row { position: absolute; left: 0; white-space: nowrap; font: 700 16px/1 var(--font-mono, monospace); letter-spacing: 0.25em; color: #e8f4ff; text-shadow: 0 0 8px #9fd0ff; animation: flow 7s linear infinite; }
  @keyframes flow { from { transform: translateX(100%); } to { transform: translateX(-160%); } }
  /* e2 빨간 색연필 동그라미 + 도장 쾅 + 꽃잎 */
  .circle { position: absolute; left: 50%; top: 66%; width: 46%; aspect-ratio: 1.6; transform: translate(-50%, -50%) rotate(-8deg); border: 5px solid #e33; border-radius: 50%; clip-path: inset(0 0 0 0); animation: draw 0.8s ease-out both; box-shadow: 0 0 0 1px rgba(255, 80, 80, 0.4); }
  @keyframes draw { from { clip-path: polygon(50% 50%, 50% 0, 50% 0, 50% 0); opacity: 0.6; } to { clip-path: polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0); opacity: 1; } }
  .stamp { position: absolute; left: 50%; top: 66%; transform: translate(-50%, -50%) rotate(-12deg); width: 62%; max-width: 360px; height: auto; animation: slam 0.45s 0.8s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
  .stamp b { font-size: 30px; line-height: 1; }
  .petal { position: absolute; top: -6%; width: 12px; height: 9px; border-radius: 60% 0 60% 0; background: #ffb3c8; animation: fall 3.4s ease-in calc(1s + var(--n) * 0.12s) both; }
  @keyframes fall { from { transform: translateY(0) rotate(0); opacity: 1; } to { transform: translateY(105cqh) rotate(540deg); opacity: 0.2; } }
  @keyframes slam { 0% { transform: translate(-50%, -50%) rotate(-12deg) scale(2.6); opacity: 0; } 60% { transform: translate(-50%, -50%) rotate(-12deg) scale(0.92); opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(-12deg) scale(1); } }
  /* e3 달에 π · 웅덩이 달 물결 3.14159… */
  .pi { position: absolute; left: 57%; top: 9.5%; transform: translate(-50%, -50%); font: 900 30px var(--font); color: #2a3550; text-shadow: 0 0 6px #fff; animation: pop 0.6s 0.2s both; }
  .pond { position: absolute; left: 42%; top: 57%; width: 30%; aspect-ratio: 3; transform: translate(-50%, -50%); }
  .rip { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(190, 230, 255, 0.9); transform: scale(0.2); opacity: 0; animation: rip 2s ease-out infinite; }
  @keyframes rip { 0% { transform: scale(0.2); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
  .wav { position: absolute; left: 50%; top: 50%; width: 220%; transform: translate(-50%, -50%); overflow: hidden; white-space: nowrap; font: 700 14px var(--font-mono, monospace); letter-spacing: 0.18em; color: #d8f0ff; text-shadow: 0 0 6px #6bb8ff; animation: wave 5s linear both; }
  @keyframes wave { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  /* e4 피보나치 불꽃: 모닥불 위로 1 · 1 · 2 · 3 · 5 · 8 개 */
  .fib { position: absolute; left: 50.3%; top: 55%; transform: translate(-50%, -50%); width: 60%; height: 18%; opacity: 0; animation: fibIn 0.55s ease-out both; }
  .fib b { position: absolute; left: 50%; top: -60%; transform: translateX(-50%); font: 900 22px var(--font); color: #ffd36a; text-shadow: 0 2px 0 #000; }
  .fib i { position: absolute; left: calc(50% + (var(--k) - (var(--m) - 1) / 2) * 11%); top: 20%; font-size: 22px; font-style: normal; transform: translateX(-50%); }
  @keyframes fibIn { 0% { opacity: 0; transform: translate(-50%, -30%); } 25% { opacity: 1; transform: translate(-50%, -50%); } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -90%); } }
  /* e5 깃발 펄럭 + 모닥불 파랗게 한 번 */
  .flag { position: absolute; transform: translate(-50%, -100%); font-size: 26px; transform-origin: 30% 100%; animation: wave2 0.35s ease-in-out 6 alternate both; }
  @keyframes wave2 { from { transform: translate(-50%, -100%) skewX(-12deg); } to { transform: translate(-50%, -100%) skewX(12deg) scaleX(0.9); } }
  .bluefire { position: absolute; left: 50.3%; top: 58%; width: 16%; aspect-ratio: 0.8; transform: translate(-50%, -50%); border-radius: 50% 50% 40% 40%; background: radial-gradient(ellipse at 50% 70%, rgba(150, 220, 255, 0.95), rgba(60, 120, 255, 0.6) 45%, transparent 70%); mix-blend-mode: screen; animation: blue 2.6s 0.7s ease-in-out both; }
  @keyframes blue { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } 30% { opacity: 1; transform: translate(-50%, -60%) scale(1.25); } 80% { opacity: 1; } 100% { opacity: 0; } }
  /* e6 반딧불이 하늘로 → ∞ 별자리 */
  .fly { position: absolute; left: var(--x); top: var(--y); width: 7px; height: 7px; margin: -3px; border-radius: 50%; background: #fffbd0; box-shadow: 0 0 8px 3px rgba(255, 240, 140, 0.95); animation: rise 1.8s cubic-bezier(0.3, 0.8, 0.4, 1) both; }
  @keyframes rise { from { left: var(--sx); top: 92%; opacity: 0.2; } to { left: var(--x); top: var(--y); opacity: 1; } }
  /* e7 허수아비 털썩 + 「좀 쉬자…」 */
  .flop { position: absolute; left: 70%; top: 40%; font-size: 26px; animation: pop 0.5s 0.3s both; }
  .sbub { position: absolute; left: 70%; top: 34%; transform: translateX(-50%); padding: 6px 12px; border-radius: 12px; background: #fff3cf; color: #2a1d05; border: 2px solid #e3a92d; font: 800 14px var(--font); white-space: nowrap; animation: pop 0.5s 0.6s both; }
  @keyframes pop { from { opacity: 0; transform: translateX(-50%) scale(0.6); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
  .rm *, .rm { animation-duration: 0.01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
</style>
