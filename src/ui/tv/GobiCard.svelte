<script lang="ts">
  import type { GobiCard } from '../../school/gobi';
  // 📊 우리 반 고비 (📜 2026-11-17 #14): TV 양피지 카드 · 칸마다 막대(처음 틀린 비율) + 숫자 넷 · 🔥 제일 힘들었던 칸 · 응원 한 줄
  //   이름 · 학생 단위 숫자 없음 · 살아 있는 몬스터 = 오답 숨김 · 「지금 n명이 여기서 고민 중이에요」 / 쓰러진 뒤 = 많이 쓴 오답(3명 이상)
  const { g }: { g: GobiCard } = $props();
  const cheer = $derived(g.alive ? (g.thinking ? `지금 ${g.thinking}명이 여기서 고민 중이에요. 같이 볼까요?` : '같이 한 번 살펴볼까요?') : g.firstWrong ? `처음엔 ${g.firstWrong}번 막혔지만 ${g.comeback}번 다시 도전해서 해냈어요!` : '모두 처음부터 잘 해냈어요!');
</script>

<div class="ov gobi" data-k="tv-gobi"><div class="parch">
  <div class="gh"><b>📊 {g.kind === 'day' ? '오늘 우리 반 고비 3곳' : '우리 반이 힘들어한 곳'}</b><small>{g.kind === 'day' ? '오늘 모든 칸 중 가장 많이 막힌 곳' : g.title}</small></div>
  {#if !g.cells.length}<p class="none">아직 숫자가 모자라요 · 3명 이상 푼 칸부터 보여요</p>{/if}
  <ol class="gl">
    {#each g.cells as c, k (`${c.mid}|${c.i}`)}
      <li class:hot={k === g.worst && c.firstWrong > 0}>
        <div class="row1"><b class="lab">{g.kind === 'day' ? `${c.mid === 'boss' ? '👑 형성평가' : ''} ${c.label}` : c.label}</b>{#if k === g.worst && c.firstWrong > 0}<span class="fire">🔥 제일 힘들었던 칸</span>{/if}</div>
        <div class="bar" aria-hidden="true"><i style:width="{Math.round(c.rate * 100)}%"></i></div>
        <div class="nums"><span>처음에 틀린 친구 <b>{c.firstWrong}</b>명</span><span>재도전 <b>{c.retries}</b>번</span><span>💡 <b>{c.help}</b></span>{#if c.hands}<span>🙋 <b>{c.hands}</b></span>{/if}<span>다시 해낸 친구 <b>{c.comeback}</b>명</span></div>
        {#if c.top}<p class="top">많이 쓴 답 「{c.top.ans}」 · {c.top.n}명</p>{/if}
      </li>
    {/each}
  </ol>
  <p class="cheer">💪 {cheer}</p>
</div></div>

<style>
  .ov.gobi { position: absolute; inset: 0; z-index: 7; pointer-events: none; /* 조작 막대(z 8) 아래 = 띄운 채로 「📊 고비」 다시 눌러 닫음 */ display: flex; align-items: center; justify-content: center; background: rgba(5, 6, 10, 0.55); }
  .parch { width: min(80cqw, 1200px); max-height: 84cqh; overflow: hidden; padding: 2.4cqh 2.4cqw; border-radius: 1.6cqh; background: #f3e6c4; color: #2a1d05; box-shadow: 0 1cqh 4cqh rgba(0, 0, 0, 0.55), inset 0 0 0 0.4cqh #b48a2c; display: flex; flex-direction: column; gap: 1.4cqh; }
  .gh { display: flex; align-items: baseline; gap: 1.2cqw; } .gh b { font: 900 var(--tv-title) var(--font); } .gh small { font-size: var(--tv-small); color: #6b5426; }
  .none { margin: 0; font-size: var(--tv-body); color: #6b5426; }
  .gl { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(28cqw, 1fr)); gap: 1.2cqh 1.4cqw; }
  .gl li { padding: 1.2cqh 1.2cqw; border-radius: 1.2cqh; background: rgba(255, 255, 255, 0.55); border: 0.3cqh solid transparent; display: flex; flex-direction: column; gap: 0.8cqh; }
  .gl li.hot { border-color: #e5a400; background: #fff3c4; }
  .row1 { display: flex; align-items: center; gap: 1cqw; } .lab { font: 800 var(--tv-body) var(--font); } .fire { font: 800 var(--tv-small) var(--font); color: #c2410c; }
  .bar { height: 1.6cqh; border-radius: 99px; background: rgba(42, 29, 5, 0.15); overflow: hidden; } .bar i { display: block; height: 100%; background: linear-gradient(90deg, #f5b84a, #e5484d); }
  .nums { display: flex; flex-wrap: wrap; gap: 0.4cqh 1.2cqw; font-size: var(--tv-small); } .nums b { font-size: var(--tv-body); }
  .top { margin: 0; font-size: var(--tv-small); color: #7a2e0e; }
  .cheer { margin: 0; font: 800 var(--tv-body) var(--font); color: #1f5d3a; }
</style>
