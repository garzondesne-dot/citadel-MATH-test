<script lang="ts">
  // 🏁 게시판 던전 결과 (📜 요청 #29 = 선생님 시안 teacher-result-1120 · 조각 18장 public/art/board-atb/result · 글자 · 숫자는 게임이 씀)
  //   왼쪽 위 = 배너(「승리!」 + 별 3칸) · 왼쪽 가운데 = 우리 팀 승리 자세 · 그 아래 용사마다 칸(초상 + 대표 활약 한 줄)
  //   오른쪽 = 양피지(💎 줄 · 합계 금띠 · 「n차시 숙련」 메달 3 + 막대 · 🏅 내 활약 자세히 = 넘치면 판 안 스크롤) · 아래 = 단추 3
  //   ⭐ 별 = 차시 정복 지도와 같은 규칙(board gradeOf · goals STAR · 첫 시도 틀림 + 안 푼 것 비율 · 이겨야)
  //   💎 = 맞힌 소문항(최대 12) · 클리어 +4 · 🛡 수호 보너스 = 친구를 지킨 행동(엄호 · 힐 · 부활 · 실드 칸) 1번에 +1 · 최대 +3 · 연습방 = 예상 보상
  //   🏅 숙련 = 그 차시 게시판 던전 이긴 판 1 · 3 · 5 → 빨강 · 은 · 금 (보여 주기만 · 연습방 판은 안 셈)
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import AtbIcon from './AtbIcon.svelte';
  import { missionOf, type State } from '../../../board/atb/engine';
  import type { AtbEnd } from '../../../board/atb/net';
  import { onMount } from 'svelte';
  import { sfx } from '../../sound.svelte';
  import { lookOfStats } from '../../../board/atb/heroes';
  import { gradeOf } from '../../../board/board';
  import { STAR } from '../../../board/goals';
  import { portraitOf } from '../../manifest';
  const { S, no, me, mastery, practiceWins = 0, practice = true, onagain, onswap, onexit, labels, end = null, trial = false }: {
    /** 👩‍🏫 #55 체험판 = 공적 줄 숨김 · 💎 = 「체험판 · 받지 않음」 */ trial?: boolean;
    /** 👥 자리 이름 (게시판 파티 = 실명 · 📜 #48 덧) */ labels?: Record<number, string>; /** 📡 게시판 판 결과 (공적 · 💎 · ⭐ · 📜 #51) · 있으면 단추 = 「게시판으로」 하나 */ end?: AtbEnd | null;
    S: State; no: number; me: number; /** 이 차시 게시판 던전 이긴 판 (연습방 판 뺌) */ mastery: number; /** 🧪 연습방 이긴 판 (숙련엔 안 셈 · 알림만) */ practiceWins?: number; practice?: boolean; onagain: () => void; onswap: () => void; onexit: () => void;
  } = $props();
  const R = (f: string) => `${import.meta.env.BASE_URL}art/board-atb/result/${f}-v1.webp`;
  const win = $derived(!!S.end?.win), mine = $derived(me >= 0 ? S.heroes[me] : null);
  const right = $derived(Math.min(12, mine ? mine.log.right : Math.max(0, ...S.heroes.map((h) => h.log.right))));
  const guard = $derived(mine ? Math.min(3, mine.log.covers + mine.log.heals + mine.log.revives + mine.log.shields + (mine.log.blocks ?? 0) + (mine.log.rescues ?? 0)) : 0); // 💚 구조 = 수호 보너스 1번 (요청 #46)
  const stars = $derived(win && mine ? (STAR[gradeOf(mine.log.first ?? { bad: 0, none: 1, total: 1 })] ?? 0) : 0);
  const rows = $derived([{ t: `맞힌 소문항 ${right}개`, g: right }, ...(win ? [{ t: '클리어', g: 4 }] : []), ...(guard ? [{ t: '팀 도움', g: guard }] : [])]);
  const total = $derived(rows.reduce((a, r) => a + r.g, 0));
  const STEPS = [1, 3, 5] as const, MEDAL = ['red', 'silver', 'gold'] as const;
  const nextStep = $derived(STEPS.find((s) => mastery < s) ?? 5);
  // 🏅 내 활약 자세히 (요청 #24 ⑦ 내용 그대로 · 줄이지 않음)
  const deeds = $derived.by(() => { const g = mine?.log; if (!g) return []; const M = missionOf(S, me); return [`🎯 임무 ${M.txt} ${M.done ? `${M.got}/${M.need} ✔ 완수` : M.chance ? `${M.got}/${M.need}` : '— (기회 없음)'}`, g.shields && `🛡 실드 ${g.shields}칸 파괴`, g.perfect && `✨ 퍼펙트 ${g.perfect}번`, g.blocks && `🛡 막기 ${g.blocks}번`, g.rescues && `💚 구조 ${g.rescues}번`, g.heals && `💚 힐 ${g.heals}번`, g.covers && `🛡 엄호 ${g.covers}번`, g.boosts && `✨ 격려 ${g.boosts}번`, g.revives && `💖 부활 ${g.revives}번`, g.ult && `🌟 각성 ${g.ult}번`, g.dmg && `💥 피해 ${g.dmg}`, `📜 맞힌 소문항 ${right}개`, g.sheets?.length && `📄 ${no}차시 학습지 문제 ${g.sheets.join(' · ')}`].filter(Boolean) as string[]; });
  /** 용사 칸 = 대표 활약 한 줄 (실드 → 퍼펙트 → 힐 → 엄호 → 부활 → 격려 → 각성 → 피해) */
  const top = (h: State['heroes'][number]): { ic: 'shield' | 'sparkle' | ''; t: string } => {
    const g = h.log;
    if (g.shields) return { ic: 'shield', t: `실드 ${g.shields}칸` };
    if (g.blocks) return { ic: 'shield', t: `막기 ${g.blocks}번` };
    if (g.perfect) return { ic: 'sparkle', t: `퍼펙트 ${g.perfect}` };
    if (g.rescues) return { ic: '', t: `💚 구조 ${g.rescues}번` };
    if (g.heals) return { ic: '', t: `💚 힐 ${g.heals}번` };
    if (g.covers) return { ic: '', t: `🛡 엄호 ${g.covers}번` };
    if (g.revives) return { ic: '', t: `💖 부활 ${g.revives}번` };
    if (g.boosts) return { ic: '', t: `✨ 격려 ${g.boosts}번` };
    if (g.ult) return { ic: 'sparkle', t: `각성 ${g.ult}번` };
    return { ic: '', t: `💥 피해 ${g.dmg}` };
  };
  /** 📜 #102 ⑨ 공적 칩 = 역할 아이콘 + 한 일(회복 · 격려 · 엄호 · 막기 · 끊기 · 실드 · 부활) · 👑 MVP = 도운 횟수 합이 가장 큰 사람(동점 = 맞힌 소문항) */
  const helpOf = (h: State['heroes'][number]) => { const g = h.log; return g.heals + (g.rescues ?? 0) + g.covers + (g.blocks ?? 0) + g.revives + g.boosts + g.shields + (g.aids ?? 0); };
  const chipOf = (h: State['heroes'][number]): string => { const g = h.log, a: string[] = []; if (g.aids) a.push(`도움 ${g.aids}`); /* 칸이 좁아 「구조 성공」 = 「도움」 (「구조」 = 큰 힐) */ if (g.heals) a.push(`회복 ${g.heals}`); if (g.rescues) a.push(`구조 ${g.rescues}`); if (g.boosts) a.push(`격려 ${g.boosts}`); if (g.covers) a.push(`엄호 ${g.covers}`); const blk = Math.max(0, (g.blocks ?? 0) - (g.cuts ?? 0)); if (blk) a.push(`막기 ${blk}`); if (g.cuts) a.push(`끊기 ${g.cuts}`); if (g.shields) a.push(`실드 ${g.shields}`); if (g.revives) a.push(`부활 ${g.revives}`); return a[0] || `맞힘 ${g.right}`; };
  const mvp = $derived.by(() => { let best = -1, id = -1, r = -1; for (const h of S.heroes) { const v = helpOf(h), rr = h.log.right; if (v > best || (v === best && rr > r)) { best = v; id = h.id; r = rr; } } return best > 0 || r > 0 ? id : -1; /* 아무도 한 게 없으면 👑 없음 */ });
  const ROLE_IC = { tank: 'role-tank', dealer: 'role-dealer', healer: 'role-healer', support: 'role-support' } as const;
  // 🔊 💎 줄 = 한 줄씩 star · 별 = 하나씩 (요청 #23)
  onMount(() => { const ts = [...rows.filter((r) => r.g > 0).map((_, i) => setTimeout(() => sfx('star', 0.5), 700 + i * 350)), ...Array.from({ length: stars }, (_, i) => setTimeout(() => sfx('star-bonus', 0.45), 250 + i * 220))]; return () => ts.forEach(clearTimeout); });
  const n = $derived(S.heroes.length);
  // 📱 안 돌린 세로 화면일 때만 세로 배치 (Land 가 돌리면 = 가로 그대로 · 📜 #74 ①)
  const portNow = () => typeof innerHeight === 'number' && innerHeight > innerWidth && !document.querySelector('[data-rot90]');
  let port = $state(false);
  $effect(() => { port = portNow(); const f = () => (port = portNow()); addEventListener('resize', f); return () => removeEventListener('resize', f); });
  /** 💀 📜 요청 #88 패배 이유 = 큰 줄 (엔진 why → 학생 말) */
  /** 💨 #108 10분 상한 = 몬스터 도망 (엔진 이름 '후퇴' 그대로 · 화면 = 도망) */
  const fled = $derived(S.end?.why === '후퇴');
  const iga = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '이' : '가'; };
  const WHY: Record<string, string> = { 후퇴: `💨 ${S.boss.name}${iga(S.boss.name)} 도망쳤어요 · 벌 없음 · 맞힌 문제는 기록돼요`, 전멸: '💀 모두 쓰러졌어요 · 다음엔 힐 · 엄호로 버텨 봐요', 쓰러짐: '💀 내 용사가 쓰러졌어요 · 다음엔 힐 · 응급붕대로 버텨 봐요' };
</script>

<div class="rs" class:lose={!win} class:fled class:port data-k="atb-result">
  <div class="left">
    <div class="banner" data-k="atb-res-banner" style:background-image="url({R('res-banner')})">
      <h2 class:win>{win ? '승리!' : fled ? '도망쳤다!' : '아쉬워요'}</h2>
      <div class="stars" data-k="atb-stars" data-n={stars} aria-label="별 {stars}개">{#each [0, 1, 2] as i (i)}<img class="star" class:on={i < stars} style:animation-delay="{0.25 + i * 0.22}s" src={R(i < stars ? 'res-star-gold' : 'res-star-gray')} alt="" />{/each}</div>
    </div>
    {#if win || !S.end}<p class="time">{`${Math.floor(S.t / 60)}분 ${Math.round(S.t % 60)}초`}</p>
    {:else}<p class="whyb" data-k="atb-lose-why">{WHY[S.end.why] ?? `💀 ${S.end.why}`}</p>{#if fled}<p class="tip" data-k="atb-flee-tip">💡 다음엔 조금 더 빨리!</p>{/if}{/if}<!-- 📜 #91 ⑬ 패배 이유 = 별 띠 아래 제자리 줄 (위에 겹치지 않음 · 낱말 안 끊김) -->
    <div class="party" style:--n={n}>
      {#each S.heroes as h (h.id)}
        {@const pt = portraitOf(h.s.hero)}
        {@const d = top(h)}
        <div class="hp" class:mvp={h.id === mvp}>{#if h.id === mvp}<b class="crown" data-k="atb-res-mvp">👑 MVP</b>{/if}
          <span class="hw">{#if h.s.enh}<span class="aul" aria-hidden="true"><HeroSprite id={lookOfStats(h.s)} auraHero={h.s.hero} aura={h.s.enh} scale={n > 2 ? 1.4 : 1.8} /></span>{/if}<span class="bod"><HeroSprite id={lookOfStats(h.s)} scale={n > 2 ? 1.4 : 1.8} row={win || fled ? 0 : 8} play={win} /></span></span>
          <div class="slot" data-k="atb-res-slot" style:background-image="url({R('res-slot')})">{#if missionOf(S, h.id).done}<i class="mdone" data-k="atb-res-mission" title="임무 완수">✔</i>{/if}
            <i class="face">{#if pt}<i style="background-image:url({pt.url});background-size:{pt.cols * 100}% {pt.rows * 100}%;background-position:{(pt.c[0] / Math.max(1, pt.cols - 1)) * 100}% {(pt.c[1] / Math.max(1, pt.rows - 1)) * 100}%"></i>{/if}</i>
            <span class="st"><b>{labels?.[h.id] ?? `${h.s.name}${h.id === me ? '(나)' : ''}`}{#if labels?.[h.id]}<small class="hn2">{h.s.name}</small>{/if}</b><small class="chip" data-k="atb-res-chip"><AtbIcon name={ROLE_IC[h.s.role]} size={16} />{chipOf(h)}</small></span>{void d}
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="paper" data-k="atb-res-panel" style:background-image="url({R('res-scroll')})">
    <div class="pin">
      {#if end}
        <!-- 📡 📜 요청 #51 게시판 판 = 🚩 우리 기사단 공적 · 💎 예상(베타 = 지급 안 함) · ⭐ 새 별 · ⭐3 차시 = 절반 -->
        {#if trial}<p class="note" data-k="atb-nomerit">연습 판이에요 · 공적은 쌓이지 않아요</p>{/if}
        {#if !trial}<details class="merit" data-k="atb-merit"><summary>🚩 우리 기사단 +{end.meritSum} 공적</summary><p>클리어 +{end.merit.clear} · 새 별 +{end.merit.star} · 한 번에 맞힘 +{end.merit.first} · 막기 · 구조 · 브레이크 +{end.merit.act} · 임무 +{end.merit.role}</p></details>{/if}
        {#if end.newStars}<p class="row" data-k="atb-newstar"><span>⭐ 새 별 +{end.newStars}{#if !trial} · 공적 +{end.merit.star}{/if}</span><b>💎 +{end.gem.star}</b></p>{/if}
        {#if end.full}<p class="note" data-k="atb-full">이 균열은 다 닫았어요 · 보상이 절반이에요</p>{/if}
        <p class="rw" data-k="atb-reward">{trial ? '💎 체험판 · 받지 않음' : '💎 예상 보상 (베타 · 아직 받지 않음)'}</p>
        <p class="row"><span>맞힌 소문항 ×3 (최대 30)</span><b>💎 +{end.gem.items}</b></p>{#if end.gem.clear}<p class="row"><span>클리어</span><b>💎 +{end.gem.clear}</b></p>{/if}{#if end.gem.guard}<p class="row"><span>팀 도움</span><b>💎 +{end.gem.guard}</b></p>{/if}
        <p class="sum" style:background-image="url({R('res-total-bar')})"><span>합계</span><b>💎 {end.gemSum}</b></p>
      {:else}
      <p class="rw" data-k="atb-reward">{practice ? '💎 예상 보상 (연습방 = 받지 않음)' : '💎 보상'}</p>
      {#each rows as r (r.t)}<p class="row"><span>{r.t}</span><b>💎 +{r.g}</b></p>{/each}
      <p class="sum" style:background-image="url({R('res-total-bar')})"><span>합계</span><b>💎 {total}</b></p>
      {/if}
      <p class="ms" style:background-image="url({R('res-title-plate')})">{no}차시 숙련</p>
      <div class="medals" data-k="atb-medals">{#each STEPS as s, i (s)}<span class="md" class:on={mastery >= s}><img src={R(mastery >= s ? `res-medal-${MEDAL[i]}` : 'res-medal-empty')} alt="" /><b>{s}판</b></span>{/each}</div>
      <i class="mbar"><b style:width="{Math.min(100, (mastery / nextStep) * 100)}%"></b><span>{mastery} / {nextStep}</span></i>
      {#if practice}<p class="note" data-k="atb-nomerit">연습 판이에요 · 공적은 쌓이지 않아요 <small>(💎 · 숙련 · 서버 기록 없음 · 이 폰 연습 승리 {practiceWins}판)</small></p>{/if}
      {#if deeds.length}<section class="deeds" data-k="atb-deeds"><b>🏅 내 활약</b><ul>{#each deeds as dd (dd)}<li>{dd}</li>{/each}</ul></section>{/if}
    </div>
  </div>
  <nav class="btns" data-k="atb-res-buttons">
    {#if end}<button type="button" class="b gold" data-k="atb-to-board" style:background-image="url({R('res-btn-gold')})" onclick={onexit}><img src={R('res-ic-exit')} alt="" />게시판으로</button>
    {:else}<button type="button" class="b gold" data-k="atb-again" style:background-image="url({R('res-btn-gold')})" onclick={onagain}><img src={R('res-ic-again')} alt="" />다시 도전</button>
    <button type="button" class="b" data-k="atb-swap" style:background-image="url({R('res-btn-brown')})" onclick={onswap}><img src={R('res-ic-party')} alt="" />용사 바꿔 다시</button>
    <button type="button" class="b" data-k="atb-exit" style:background-image="url({R('res-btn-brown')})" onclick={onexit}><img src={R('res-ic-exit')} alt="" />나가기</button>{/if}
  </nav>
</div>

<style>
  .rs { position: fixed; inset: 0; z-index: 50; container-type: size; /* 돌린 세로 폰 = vh 가 화면 세로라 안 맞음 → 결과 판 높이(cqh) 기준 */ display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 37%); grid-template-rows: minmax(0, 1fr) auto; gap: 1.5% 2%; padding: 1.5% 2% 2%; box-sizing: border-box; background: radial-gradient(ellipse at 30% 25%, #4a3a7a, #1d1430 70%); color: #fff; overflow: hidden; }
  .rs.lose { background: radial-gradient(ellipse at 30% 25%, #3a3448, #15121c 70%); }
  .left { display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 0; }
  .banner { position: relative; width: min(100%, calc(38cqh * 1394 / 657)); aspect-ratio: 1394 / 657; background: center / contain no-repeat; flex: 0 0 auto; }
  h2 { position: absolute; left: 25%; right: 25%; top: 13%; margin: 0; text-align: center; font: 900 clamp(22px, 9cqh, 48px) var(--font); color: #fff; text-shadow: 0 3px 0 #6a1010, 0 0 8px #000; }
  h2.win { color: #ffe27a; text-shadow: 0 3px 0 #8a3a00, 0 0 10px #ffb84a; }
  .stars { position: absolute; left: 0; right: 0; top: 55.5%; height: 31%; }
  .star { position: absolute; top: 0; height: 100%; aspect-ratio: 1; transform: translateX(-50%); image-rendering: auto; }
  .star:nth-child(1) { left: 34%; } .star:nth-child(2) { left: 50.5%; } .star:nth-child(3) { left: 67%; }
  .star.on { animation: starin 0.35s cubic-bezier(.2,1.6,.4,1) backwards; } @keyframes starin { from { transform: translateX(-50%) scale(2.4); opacity: 0; } }
  .left { position: relative; }
  .time { position: absolute; left: 0; top: 0; margin: 0; padding: 2px 8px; border-radius: 8px; background: #0006; font: 700 12px var(--font-plain); color: #e8dcff; }
  .party { display: flex; gap: 1.5%; justify-content: center; width: 100%; min-height: 0; overflow-x: clip; }
  .hp { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; flex: 0 1 calc(100% / var(--n)); max-width: 170px; }
  .hw { position: relative; display: inline-block; } .aul { position: absolute; left: 0; top: 0; z-index: 0; } .aul :global(.hs > i) { visibility: hidden; } .bod { position: relative; z-index: 1; display: inline-block; }
  .slot { position: relative; width: 100%; aspect-ratio: 1081 / 418; background: center / 100% 100% no-repeat; display: flex; align-items: center; }
  .slot .face { position: absolute; left: 7.4%; top: 13%; width: 26.5%; height: 74%; overflow: hidden; border-radius: 4px; }
  .slot .face i { position: absolute; inset: 0; image-rendering: pixelated; }
  .slot .st { position: absolute; left: 37%; right: 5%; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; }
  .slot b { font: 800 clamp(9px, 2.8cqh, 13px) var(--font-plain); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #ffe9b0; }
  .slot small { display: flex; align-items: center; gap: 2px; font: 800 clamp(9px, 2.7cqh, 13px) var(--font-plain); color: #fff; white-space: nowrap; overflow: hidden; }

  .paper { position: relative; background: center / 100% 100% no-repeat; min-height: 0; padding: 9% 10% 9% 11%; box-sizing: border-box; color: #3a2614; display: flex; }
  .pin { -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), #0000); mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), #0000); padding-bottom: 12px; } /* 🐞 #74 ③ 넘친 줄 = 아래 흐리게(스크롤 있음 표시) */
  .pin { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 4px; overscroll-behavior: contain; }
  .rw { margin: 0; font: 900 12px var(--font); color: #7a5a2a; }
  .row { display: flex; justify-content: space-between; margin: 0; padding: 3px 10px; border-radius: 6px; background: #fbf0d6cc; border: 1px solid #c9a36a; font: 800 clamp(12px, 3.8cqh, 15px) var(--font-plain); }
  .sum { display: flex; justify-content: center; gap: 14px; margin: 2px 0; padding: 0 18%; aspect-ratio: 845 / 199; max-height: 52px; align-items: center; background: center / 100% 100% no-repeat; font: 900 clamp(15px, 5cqh, 22px) var(--font); color: #3a1d00; text-shadow: 0 1px 0 #fff8; }
  .ms { margin: 2px auto 0; padding: 0 22px; min-width: 60%; aspect-ratio: 583 / 121; max-height: 26px; display: grid; place-items: center; background: center / 100% 100% no-repeat; font: 800 clamp(11px, 3.4cqh, 14px) var(--font); color: #ffe9b0; }
  .medals { display: flex; justify-content: center; gap: 6%; }
  .md { position: relative; width: 26%; max-width: 64px; display: grid; place-items: center; }
  .md img { width: 100%; } .md b { position: absolute; top: 38%; font: 900 clamp(10px, 3.2cqh, 14px) var(--font); color: #8a7a5a; } .md.on b { color: #fff; text-shadow: 0 1px 0 #000; }
  .mbar { position: relative; display: block; height: 14px; border-radius: 7px; background: #5a3a2a; overflow: hidden; flex: 0 0 auto; }
  .mbar b { display: block; height: 100%; background: linear-gradient(#ffe46a, #e6b81e); } .mbar span { position: absolute; inset: 0; text-align: center; font: 800 10px var(--font-plain); color: #fff; text-shadow: 0 1px 1px #000; line-height: 14px; }
  .note { margin: 0; font: 600 10px var(--font-plain); color: #6a4a28; }
  .deeds { display: flex; flex-direction: column; gap: 2px; padding: 5px 8px; border-radius: 8px; background: #fff7dccc; border: 1px solid #d9b26a; } .deeds b { font: 900 13px var(--font); color: #7a4a10; } .deeds ul { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 1px 8px; font: 800 12px var(--font-plain); }
  .btns { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2%; }
  .b { display: flex; align-items: center; justify-content: center; gap: 8px; height: clamp(46px, 14cqh, 64px); border: none; background: center / 100% 100% no-repeat; color: #fff2d6; font: 900 clamp(15px, 5cqh, 24px) var(--font); text-shadow: 0 2px 0 #000a; }
  .b img { height: 62%; } .b.gold { color: #2a1600; text-shadow: 0 1px 0 #fff8; }
  @media (prefers-reduced-motion: reduce) { .star.on { animation: none; } }
  .slot { position: relative; } .mdone { position: absolute; right: 2px; top: 2px; z-index: 3; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: #2faa5a; color: #fff; font: 900 12px var(--font); font-style: normal; box-shadow: 0 0 6px #7dff9a; } /* 🎯 임무 완수 (요청 #50) */
  .merit { margin: 0 0 4px; font: 800 14px var(--font); } .merit summary { cursor: pointer; color: #8a2a10; } .merit p { margin: 2px 0 0; font: 600 11px var(--font-plain); }
  .hn2, .slot b small.hn2 { display: inline; margin-left: 3px; font: 600 9px var(--font-plain); opacity: 0.75; color: #ffe9b0; }
  /* 📱 세로 폰(결과 화면은 안 돌림 · 손발 #1 🐞 390 × 844) = 위 승리 띠 · 용사 / 아래 결과 패널 넓게 · 단추 하나면 한 줄 꽉 */
  .b { white-space: nowrap; }
  .btns:has(> .b:only-child) { grid-template-columns: minmax(0, 1fr); justify-items: center; } .btns > .b:only-child { width: min(100%, 440px); }
  /* 🐞 #74 ① 세로 폰이라도 가로 상자(Land · 90° 돌림) 안이면 가로 배치 그대로 → 안 돌린 세로일 때만 (.port) */
  .rs.port { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; }
  .rs.port .left { justify-content: flex-start; gap: 10px; }
  .rs.port .banner { width: min(100%, 420px); }
  .rs.port .paper { padding: 8% 9% 8% 10%; }
  .rs.port .row, .rs.port .merit summary { font-size: 15px; }
  .rs.port .sum { font-size: 20px; }
  .whyb { position: relative; z-index: 3; margin: 2px auto 0; word-break: keep-all; overflow-wrap: break-word; text-wrap: balance; max-width: 92%; padding: 4px 14px; border-radius: 10px; background: #2a0a0ae6; border: 2px solid #ff6a5a; color: #ffe2dc; font: 800 clamp(13px, 4vh, 17px) var(--font-plain); text-align: center; } /* 💀 #88 */
  /* ── 📜 #102 ⑨ 공적 칩 · 👑 MVP ── */
  .hp { position: relative; }
  .hp .crown { position: absolute; left: 50%; top: -6px; translate: -50% 0; z-index: 3; font: 900 14px var(--font-plain); color: #2a1a04; background: #f5b84a; border-radius: 6px; padding: 0 6px; white-space: nowrap; box-shadow: 0 2px 0 #000; }
  .hp.mvp .bod { filter: drop-shadow(0 0 8px rgba(255, 210, 100, 0.8)); }
  .chip { display: inline-flex !important; align-items: center; gap: 3px; font-size: 14px !important; white-space: nowrap; }
  /* ── 💨 #108 도망 = 보라 배너 · 패배 = 회색 배너 (UI-FINAL 6절) ── */
  .rs.lose:not(.fled) .banner { filter: grayscale(0.85) brightness(0.9); }
  .rs.fled .banner { filter: hue-rotate(-75deg) saturate(0.85); }
  .tip { margin: 0; font: 800 14px var(--font-plain); color: #ffe7a8; text-align: center; text-shadow: 0 1px 2px #000; }
</style>
