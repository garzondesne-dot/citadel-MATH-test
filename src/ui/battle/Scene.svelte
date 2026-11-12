<script lang="ts">
  import { dungeonOf, HERO, heroNudge, heroUrl, spriteOf } from '../manifest';
  import { heroOf } from '../../model/hero';
  import { savedLook } from '../../store/me.svelte';
  // 🎬 장면 띠 (②B · 2-1절): 폰 맨 위부터 양끝까지 · 높이 280 · 아래 56px 페이드
  //   위 = ‹ 뒤로 + 💎 (흰 글씨 + 그림자 · 검은 띠 없음) · 남은 시간 칩 = 마지막 5분부터
  //   몬스터 체력 = 오른쪽 위 · 상태 칩 = 왼쪽 위(이 몬스터에서만 켜지는 효과) · 용사 = 왼쪽 바닥 · 몬스터 = 오른쪽
  //   정찰 = 몬스터 그림자 · 소레이드 = 졸개 줄(지금 칠 졸개 테두리) + 대장
  type Chip = { text: string; on?: boolean };
  const { theme, sprite, hp = null, hpLabel: hpL = '', shadow = false, down = false, chips = [], minions = null, gem = 0, timeLeftMs = null, backHref = '?', pose = 'idle', hit = false, hitTag = '', note = '', onconcept }:
    { theme?: string; sprite: string; hp?: { left: number; max: number } | null; hpLabel?: string; shadow?: boolean; down?: boolean; chips?: Chip[];
      minions?: { n: number; stage: number; downs: number[] } | null; gem?: number; timeLeftMs?: number | null; backHref?: string; pose?: 'idle' | 'attack' | 'miss'; hit?: boolean; hitTag?: string; note?: string; onconcept?: () => void } = $props();
  // 💥 hit = 몬스터 공격(#151): 장면 띠 안에서만 — 빨간 번쩍 0.15초 · 「💥 몬스터 공격!」 꼬리표 · 용사 붉게 (문제 카드는 움직이지 않음)
  //   note = 장면 안 알림 꼬리표(쓰러짐 · 승리) — 문제 위 알림 띠 대신
  const ATK_ROW = 2; // 정식 heroesV2 anims.attack = 2줄
  const sp = $derived(spriteOf(sprite));
  const hpLabel = $derived(hpL || sp.sheet.names[sp.row] || '몬스터');
  const MON = 128; // 몬스터 칸 256 → 정확히 ½
  const HS = 2; // 용사 칸 80 × 64 → 정수 2배
  const mm = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const monBg = (size: number, pose: 'idle' | 'down') => `background-image:url(${sp.url});background-size:${sp.sheet.cols * size}px ${sp.sheet.rows * size}px;background-position:-${sp.sheet.poses[pose] * size}px -${sp.row * size}px;width:${size}px;height:${size}px;${sp.hue ? `filter:hue-rotate(${sp.hue}deg)${shadow ? ' brightness(0)' : ''};` : shadow ? 'filter:brightness(0);opacity:.85;' : ''}`;
</script>

<div class="edge" class:hit style:background-image="url({dungeonOf(theme)})">
  <div class="top">
    <a class="back" href={backHref} aria-label="뒤로">‹</a>
    {#if onconcept}<button type="button" class="pill cpt" onclick={onconcept}>📘 이 문제의 개념</button>{/if}
    <span class="sp"></span>
    {#if timeLeftMs != null && timeLeftMs <= 5 * 60000}<span class="pill time" aria-label="남은 시간">⏱ {mm(Math.max(0, timeLeftMs))}</span>{/if}
    <span class="pill" aria-label="마정석 {gem}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{gem}</span>
  </div>
  {#if chips.length}<div class="buffs">{#each chips as c, k (k)}<span class="buff" class:on={c.on}>{c.text}</span>{/each}</div>{/if}
  {#if hp && !shadow}
    <div class="mhp"><span>{hpLabel} · 체력 {hp.left} / {hp.max}</span><div class="b"><i style:width="{hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div></div>
  {/if}
  {#if minions}
    <div class="minions">
      {#each Array.from({ length: minions.n }) as _, k (k)}
        <i class="mini" class:dead={k < minions.stage || minions.downs.includes(k)} class:now={k === minions.stage} style={monBg(40, k < minions.stage ? 'down' : 'idle')} aria-label="졸개 {k + 1}"></i>
      {/each}
    </div>
  {/if}
  <i class="mon" class:minboss={!!minions} style={monBg(minions ? 104 : MON, down ? 'down' : 'idle')} aria-label={sp.sheet.names[sp.row]}></i>
  {#if hit}<span class="tag hitTag" role="status">{hitTag || '💥 몬스터 공격!'}</span>{:else if note}<span class="tag" role="status">{note}</span>{/if}
  {#if pose === 'miss'}<span class="miss">헛스윙</span>{/if}
  <i class="hero" class:lunge={pose === 'attack'} class:whiff={pose === 'miss'} style:translate="{heroNudge(savedLook().hero, 0).dx * HS}px {heroNudge(savedLook().hero, 0).dy * HS}px" style:background-image="url({heroUrl()})" style:background-size="{HERO.cols * HERO.w * HS}px {HERO.rows * HERO.h * HS}px"
    style:background-position="-{(pose === 'idle' ? 0 : 2) * HERO.w * HS}px -{(pose === 'idle' ? HERO.idleRow : ATK_ROW) * HERO.h * HS}px" style:width="{HERO.w * HS}px" style:height="{HERO.h * HS}px" aria-label="내 용사 {heroOf(savedLook().hero).job}"></i>
</div>

<style>
  .edge { position: relative; height: 280px; background-size: cover; background-position: center 62%; image-rendering: pixelated; overflow: hidden; }
  .edge::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 56px; background: linear-gradient(transparent, var(--bg)); z-index: 1; }
  .top { position: absolute; top: 0; left: 0; right: 0; z-index: 3; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s1); }
  .back { width: 44px; height: var(--tap); display: grid; place-items: center; color: #fff; font-size: 30px; text-decoration: none; text-shadow: 0 1px 2px #000, 0 0 6px rgba(0, 0, 0, 0.8); }
  .sp { flex: 1; }
  .pill { display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .pill.time { color: var(--accent); }
  .pill.cpt { border: 0; height: 36px; font: 700 var(--fs-small) var(--font); cursor: pointer; }
  .buffs { position: absolute; z-index: 2; left: var(--s3); top: 64px; display: flex; flex-direction: column; gap: 6px; }
  .buff { height: 28px; padding: 0 10px; border-radius: 14px; background: rgba(8, 9, 12, 0.72); border: 1px solid rgba(255, 255, 255, 0.18); color: #fff; font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; }
  .buff.on { border-color: var(--accent); color: var(--accent); }
  .mhp { position: absolute; z-index: 2; top: 62px; right: var(--s3); width: 170px; display: flex; flex-direction: column; gap: var(--s1); color: #fff; font-size: var(--fs-small); font-weight: 700; text-shadow: 0 1px 0 #000; text-align: right; }
  .mhp .b { height: 10px; border-radius: 5px; background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(255, 255, 255, 0.25); }
  .mhp .b i { display: block; height: 8px; border-radius: 4px; background: var(--hp); transition: width 0.4s; }
  .mon { position: absolute; z-index: 1; right: 24px; top: 108px; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  /* ⚔ 소레이드 (#160 · 정식 소레이드 1단계 배치): 대장 = 오른쪽 뒤(조금 위) · 졸개 셋 = 대장 앞 한 줄(오른쪽 정렬 · 간격 8) · 용사 = 왼쪽 · 용사 칸(160)과 겹침 0 */
  .mon.minboss { right: 8px; top: 90px; }
  .minions { position: absolute; z-index: 2; right: 16px; top: 194px; display: flex; gap: var(--s2); }
  .mini { display: block; image-rendering: pixelated; background-repeat: no-repeat; border-radius: var(--r-sm); }
  .mini { transition: transform 0.2s ease-out, opacity 0.2s; }
  .mini.dead { opacity: 0.3; transform: translateY(6px); }
  .mini.now { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hero.lunge { transform: translateX(28px); }
  .hero.whiff { transform: translateX(14px); opacity: 0.75; }
  .miss { position: absolute; z-index: 2; left: 150px; top: 150px; color: #fff; font-weight: 700; font-size: var(--fs-small); text-shadow: 0 1px 2px #000; }
  .edge.hit::before { content: ''; position: absolute; inset: 0; z-index: 2; background: var(--bad); opacity: 0; animation: hitf 0.15s ease-out; pointer-events: none; }
  @keyframes hitf { from { opacity: 0.55; } to { opacity: 0; } }
  .edge.hit .hero { filter: sepia(1) saturate(6) hue-rotate(-40deg) brightness(0.9); }
  .tag { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: 216px; height: 32px; padding: 0 12px; border-radius: 16px; background: rgba(8, 9, 12, 0.72); border: 1px solid var(--accent); color: #fff; font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; white-space: nowrap; }
  .tag.hitTag { border-color: var(--bad); background: rgba(120, 20, 20, 0.85); }
  .hero { transition: transform 0.12s ease-out; position: absolute; z-index: 1; left: 0; top: 140px; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
</style>
