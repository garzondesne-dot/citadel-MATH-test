<script lang="ts">
  import HeroSprite from '../camp/HeroSprite.svelte';
  // 🔄 🙊 쉼터 TV 놀이 중 용사 무리 + 이름 크게 (❓#2 B · 정식 v0.9.60 64192f1 · 교실 뒤에서도 읽히게)
  //   반대로 = 번호표(22px@720) 아래 이름(17px@720) · 바닥 넓게 8칸 · 줄이 많으면 겹쳐 쌓되 윗줄이 위(이름이 아랫줄 용사에 가리지 않음)
  //   눈치 = 이름 14~19px · 긴 이름 두 줄 · 칸 = 8칸 줄어듦 · 💤 잠든 · ✕ 탈락 · 말한 숫자 말풍선
  //   30명 · 4자 이름 겹침 0 · 화면 밖 0 (시험 funcrowd)
  type P = { u: string; hero: number; num: number; name: string; st?: '' | 'out' | 'zz' | 'win'; say?: number };
  const { kind, people, k = 1 }: { kind: 'rev' | 'nun'; people: P[]; k?: number } = $props();
  const COLS = 8;
  const rows = $derived(Math.max(1, Math.ceil(people.length / COLS)));
  const per = $derived(Math.min(COLS, Math.max(1, people.length)));
</script>

<div class="crowd2 {kind}" style:--rows={rows} style:--k={k} aria-label="{kind === 'rev' ? '반대로' : '눈치게임'} {people.length}명">
  {#each people as p, i (p.u)}
    {@const r = Math.floor(i / COLS)}
    {@const c = i % COLS}
    <div class="fig" class:out={p.st === 'out'} class:zz={p.st === 'zz'} data-u={p.u}
      style:left="{((c + 0.5 + (r % 2 ? 0.25 : 0)) / per) * 100}%"
      style:top={rows > 1 ? `calc((100% - var(--fh)) * ${r / (rows - 1)})` : 'calc((100% - var(--fh)) / 2)'} style:z-index={20 + (rows - r)}>
      {#if p.say != null}<span class="say">{p.say}</span>{/if}
      <HeroSprite id={p.hero} scale={k} />
      {#if kind === 'rev'}<b class="bib">{String(p.num).padStart(2, '0')}</b><b class="fa-nm">{p.name}</b>
      {:else}<b class="nn-name">{p.st === 'zz' ? '💤 ' : p.st === 'out' ? '✕ ' : ''}{p.name}</b>{/if}
    </div>
  {/each}
</div>

<style>
  .crowd2 { position: relative; width: 88cqw; flex: 1 1 auto; min-height: 30cqh; max-height: 46cqh; --fh: calc(64px * var(--k) + 6.2cqh); }
  .crowd2.nun { --fh: calc(64px * var(--k) + 5.6cqh); }
  .fig { position: absolute; transform: translateX(-50%); width: calc(88cqw / 8 - 0.6cqw); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .fig b { display: block; font-style: normal; color: #fff; text-shadow: 2px 2px 0 #000, 0 0 4px #000; line-height: 1.1; }
  .bib { font-size: max(22px, 3.06cqh); font-weight: 700; padding: 0 0.6cqw; border-radius: 0.8cqh; background: rgba(8, 9, 12, 0.78); border: 1px solid rgba(255, 255, 255, 0.35); font-variant-numeric: tabular-nums; margin-top: -0.6cqh; }
  .fa-nm { margin-top: 1px; font-size: max(17px, 2.36cqh); font-weight: 700; white-space: nowrap; }
  .nn-name { font-size: clamp(14px, 2.4cqh, 28px); font-weight: 700; padding: 1px 0.3cqw; text-align: center; white-space: normal; word-break: keep-all; overflow-wrap: anywhere; max-width: 100%; max-height: 2.4em; overflow: hidden; background: rgba(8, 9, 12, 0.55); border-radius: 0.6cqh; }
  .fig.out { opacity: 0.4; filter: grayscale(1); } .fig.zz { opacity: 0.6; }
  .say { position: absolute; top: -1.2cqh; right: 8%; z-index: 2; min-width: 3.4cqh; height: 3.4cqh; padding: 0 0.6cqh; border-radius: 1.7cqh; background: #f5b84a; color: #1a1408; font-size: 2.2cqh; font-weight: 700; display: grid; place-items: center; box-shadow: 0 2px 0 #000; }
</style>
