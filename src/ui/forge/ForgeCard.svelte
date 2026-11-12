<script lang="ts">
  import type { ForgeCard } from '../../model/forge';
  import { SUBJ } from '../../engine/subject';
  import { artUrl } from '../manifest';
  // 🃏 수학 카드 (#148 · 정식 js/raid/cards.js html2 그대로): 금테 틀(card-frame-v3) · 위 등급 · 쪽 · 그림(card-arts-v2) · 뜻 · 가운데 수식 · 아래 이름판 · 보석 = 등급 색
  //   unknown = 아직 못 만든 카드(흐린 그림 · ??? · 💡 힌트) · wish = ⭐ 찜(금빛 테두리 · 이름 · 기호만)
  const { card, w = 104, unknown = false, wish = false }: { card: ForgeCard; w?: number; unknown?: boolean; wish?: boolean } = $props();
  const K = SUBJ.forge!.kit, B = K.box, A = K.arts;
  const GEM: Record<number, string> = { 1: 'grayscale(1) brightness(1.7)', 2: 'none', 3: 'hue-rotate(62deg) saturate(1.3)' };
  const GN: Record<number, string> = { 1: '일반', 2: '매직', 3: '레어' };
  const s = $derived(w / K.w);
  const i = $derived(A.map[card.id] ?? card.art ?? 0);
  const box = (b: [number, number, number, number]) => `left:${b[0]}px;top:${b[1]}px;width:${b[2]}px;height:${b[3]}px`;
  const fmLen = $derived(String(card.fm).length), nm = $derived(card.short || card.name);
  const showName = $derived(!unknown || wish);
</script>

<div class="mc g{card.grade}" class:unknown class:wish style:width="{K.w * s}px" style:height="{K.h * s}px" data-card={card.id}>
  <div class="in" style:width="{K.w}px" style:height="{K.h}px" style:transform="scale({s})">
    <img class="fr" src={artUrl(K.frame)} alt="" width={K.w} height={K.h} />
    <img class="fr" src={artUrl(K.frame)} alt="" width={K.w} height={K.h} style:clip-path="inset({B.gem[1]}px {K.w - B.gem[0] - B.gem[2]}px {K.h - B.gem[1] - B.gem[3]}px {B.gem[0]}px)" style:filter={GEM[card.grade] || 'none'} />
    <div class="top" style={box(B.top)}>{#if !unknown}<span class="tag">{GN[card.grade]}</span><span class="pg">{card.page}</span>{/if}</div>
    <div class="art" style={box(B.art)} style:background-image="url({artUrl(A.src)})" style:background-size="{A.cols * 100}% {A.rows * 100}%" style:background-position="{((i % A.cols) / (A.cols - 1)) * 100}% {A.rows > 1 ? (Math.floor(i / A.cols) / (A.rows - 1)) * 100 : 0}%"></div>
    <div class="desc" style={box(B.desc)}>{#if unknown}<span class="hint">💡 {card.hint}</span>{:else}<span>{card.desc}</span>{/if}</div>
    <div class="fm" style={box(B.fm)}>{#if unknown && !wish}<b class="q">? ? ?</b>{:else}<b class="f" class:mid={fmLen > 9} class:long={fmLen > 16}>{card.fm}</b>{/if}</div>
    <div class="plate" style={box(B.plate)}><b class:long={nm.length > 7}>{showName ? nm : '? ? ?'}</b></div>
  </div>
</div>

<style>
  .mc { position: relative; flex: none; --gc: #f0f4ff; }
  .mc.g2 { --gc: #6ab6ff; } .mc.g3 { --gc: #c38cff; }
  .mc.g2 .in, .mc.g3 .in { filter: drop-shadow(0 0 10px var(--gc)); }
  .mc.wish { outline: 3px solid #f5b84a; outline-offset: 2px; border-radius: 8px; }
  .in { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  .in > * { position: absolute; }
  .fr { left: 0; top: 0; image-rendering: pixelated; }
  .art { background-repeat: no-repeat; image-rendering: pixelated; }
  .unknown .art { filter: grayscale(1) brightness(0.3); }
  .unknown .fr { filter: brightness(0.75); }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .tag { font-size: 15px; font-weight: 700; padding: 0 6px; border: 2px solid var(--gc); color: var(--gc); background: #000a; }
  .pg { font-size: 14px; color: #8fa3c8; }
  .desc { display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; color: #d6e2fb; font-size: 17px; line-height: 1.25; }
  .hint { font-size: 15px; color: #cfe; }
  .fm { display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; color: #fff; }
  .f { font-size: 34px; line-height: 1.1; text-shadow: 0 0 12px var(--gc), 0 2px 0 #000; } .f.mid { font-size: 26px; } .f.long { font-size: 18px; }
  .q { font-size: 40px; color: #6b7a99; }
  .plate { display: flex; align-items: center; justify-content: center; }
  .plate b { color: #4a2c0a; text-shadow: 0 1px 0 #fff5d6; font-size: 26px; white-space: nowrap; } .plate b.long { font-size: 19px; }
</style>
