<script lang="ts">
  // 🏁 결과 (시안 atb-4-result · 정리.md 7): 승리 / 실패 띠 · 용사별 해낸 일(실드 · 엄호 · 회복 · 부활 · 격려) · 💎 3줄 + 합계 · 차시 숙련 도장 3 · 7 · 15판 + 막대
  //   단추 = 다시 도전 · 용사 바꿔 다시 · 나가기 · 결과 · 지도 · 랭킹에 전투 HP 막대 없음 (설계안 9절)
  //   교사 연습방 = 💎 · 숙련은 「이 폰」 표시만(서버에 안 남김 · 결정 #9)
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import type { State } from '../../../board/atb/engine';
  import AtbIcon from './AtbIcon.svelte';
  const { S, no, me, guardBonus = 0, mastery, practice = true, onagain, onswap, onexit }: {
    S: State; no: number; me: number; guardBonus?: number; /** 이 차시 클리어 누적 판 */ mastery: number; practice?: boolean; onagain: () => void; onswap: () => void; onexit: () => void;
  } = $props();
  const win = $derived(!!S.end?.win), mine = $derived(me >= 0 ? S.heroes[me] : null);
  const right = $derived(Math.min(12, mine ? mine.log.right : Math.max(0, ...S.heroes.map((h) => h.log.right))));
  const rows = $derived([{ t: `맞힌 소문항 ${right}개`, g: right }, ...(win ? [{ t: '클리어', g: 4 }] : []), ...(win && guardBonus ? [{ t: '수호 보너스', g: guardBonus }] : [])]);
  const total = $derived(rows.reduce((a, r) => a + r.g, 0));
  const STEPS = [3, 7, 15], nextStep = $derived(STEPS.find((s) => mastery < s) ?? 15);
  const did = (h: State['heroes'][number]) => [h.log.shields ? `실드 ${h.log.shields}칸` : '', h.log.covers ? `엄호 ${h.log.covers}` : '', h.log.heals ? `회복 ${h.log.heals}` : '', h.log.revives ? `부활 ${h.log.revives}` : '', h.log.boosts ? `격려 ${h.log.boosts}` : '', h.log.ult ? `필살 ${h.log.ult}` : ''].filter(Boolean).join(' · ') || `피해 ${h.log.dmg}`;
</script>

<div class="rs" data-k="atb-result">
  <div class="left">
    <h2 class:win>{win ? '승리!' : '아쉬워요'}<small>{win ? `${Math.floor(S.t / 60)}분 ${Math.round(S.t % 60)}초` : S.end?.why}</small></h2>
    <div class="party">
      {#each S.heroes as h (h.id)}
        <div class="hp"><HeroSprite id={h.s.hero} scale={S.heroes.length > 2 ? 1.5 : 2} row={win ? 0 : 8} play={win} /><span class="chip"><b>{h.s.name}{h.id === me ? '(나)' : ''}</b><small>{#if h.log.shields}<AtbIcon name="shield-broken" size={16} />{/if} {did(h)}</small></span></div>
      {/each}
    </div>
  </div>
  <div class="paper">
    {#each rows as r (r.t)}<p class="row"><span>{r.t}</span><b>💎 +{r.g}</b></p>{/each}
    <p class="sum"><span>합계</span><b>💎 {total}</b></p>
    {#if practice}<p class="note">🧪 교사 연습방 = 💎 를 주지 않고 기록도 서버에 안 남겨요 (이 폰 최근 5판만)</p>{/if}
    <p class="ms">{no}차시 숙련</p>
    <div class="stamps">{#each STEPS as s (s)}<span class="st" class:on={mastery >= s}>{s}판</span>{/each}</div>
    <i class="mbar"><b style:width="{Math.min(100, (mastery / nextStep) * 100)}%"></b><span>{mastery} / {nextStep}</span></i>
  </div>
  <nav class="btns">
    <button type="button" class="b gold" data-k="atb-again" onclick={onagain}>⚔ 다시 도전</button>
    <button type="button" class="b" data-k="atb-swap" onclick={onswap}>👥 용사 바꿔 다시</button>
    <button type="button" class="b" data-k="atb-exit" onclick={onexit}>🚪 나가기</button>
  </nav>
</div>

<style>
  .rs { position: fixed; inset: 0; z-index: 50; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 36%); grid-template-rows: 1fr auto; gap: 2% 2%; padding: 2.5% 2%; box-sizing: border-box; background: radial-gradient(ellipse at 30% 30%, #4a2a5a, #140c1c); color: #fff; font-family: var(--font); }
  .left { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4%; min-height: 0; }
  h2 { margin: 0; padding: 4px 34px; border-radius: 14px; border: 3px solid #e2b04a; background: linear-gradient(#a8261e, #6a1010); font: 900 clamp(24px, 9vh, 46px) var(--font); text-align: center; text-shadow: 0 3px 0 #3a0a0a; }
  h2.win { color: #ffe27a; } h2 small { display: block; font: 700 13px var(--font-plain); color: #fff; }
  .party { display: flex; gap: 2%; justify-content: center; width: 100%; min-width: 0; overflow: hidden; }
  .hp { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; flex: 1; max-width: 160px; }
  .chip { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; padding: 4px; border-radius: 8px; border: 2px solid #8a6a3a; background: #1d1220e6; text-align: center; }
  .chip b { font: 800 13px var(--font-plain); } .chip small { font: 600 11px var(--font-plain); color: #ffe6b0; display: flex; align-items: center; gap: 2px; flex-wrap: wrap; justify-content: center; }
  .paper { display: flex; flex-direction: column; gap: 5px; padding: 12px 14px; border-radius: 14px; border: 3px solid #b88a4a; background: radial-gradient(ellipse at 50% 40%, #fbf0d6, #e9d3a6); color: #3a2614; overflow: auto; min-height: 0; }
  .row, .sum { display: flex; justify-content: space-between; margin: 0; padding: 5px 10px; border-radius: 8px; background: #f6e7c4; border: 1px solid #c9a36a; font: 800 15px var(--font-plain); }
  .sum { background: linear-gradient(#ffd77a, #e9a93a); border-color: #8a5a1a; font-size: 18px; }
  .note { margin: 0; font: 600 11px var(--font-plain); color: #6a4a28; }
  .ms { margin: 4px 0 0; text-align: center; font: 800 14px var(--font); }
  .stamps { display: flex; justify-content: center; gap: 10px; }
  .st { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; border: 2px dashed #b89a6a; color: #9a7a4a; font: 800 13px var(--font); }
  .st.on { border: 3px solid #e2b04a; background: radial-gradient(#e83a2a, #9a1010); color: #fff; }
  .mbar { position: relative; display: block; height: 16px; border-radius: 8px; background: #5a3a2a; overflow: hidden; }
  .mbar b { display: block; height: 100%; background: linear-gradient(#ffe46a, #e6b81e); } .mbar span { position: absolute; inset: 0; text-align: center; font: 800 11px var(--font-plain); color: #fff; text-shadow: 0 1px 1px #000; }
  .btns { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2%; }
  .b { min-height: 52px; border-radius: 12px; border: 3px solid #8a6a3a; background: linear-gradient(#5a3f2a, #3a2618); color: #fff2d6; font: 800 clamp(14px, 5vh, 22px) var(--font); box-shadow: 0 4px 0 #1a100a; }
  .b.gold { border-color: #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; }
</style>
