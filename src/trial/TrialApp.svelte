<script lang="ts">
  // 👩‍🏫 체험판 v1.0 첫 화면 (📜 2026-11-17 #33 · CLAUDE.md 「👩‍🏫 체험판 규칙」)
  //   대표 그림 key-1 위에 제목 · 이름 칸 → 「⚔ 학생으로 체험」(🎒 학생 폰 + 🤖 친구 4 · 📺) · 「👩‍🏫 선생님으로 체험」(🖥 종합실 + 리모컨 · 🤖 약 20)
  //   → 차시 카드 2장(⚔ 12차시 풀 체험 · 🪶 3차시 가벼운 체험) = 시작 단추 · 끝나면 다시 이 카드(「⚔ 다른 차시로」) · 서버 안 닿음 · 이 탭 메모리
  import type { LessonPack, Store } from '../model/types';
  import { memoryStore } from '../store/device';
  import { setFeatCfg } from '../school/features.svelte';
  import { useMe } from '../store/me.svelte';
  import FirstHero from '../ui/camp/FirstHero.svelte';
  import Camp from '../ui/camp/Camp.svelte';
  import { CREDIT_NAME, showCredit } from '../channel';
  import { BUILD, BUILD_ID } from '../build';
  import { CARDS, REST_AFTER, trialPacks, trialRoom } from './trial';
  import { loadAtbTrial } from '../ui/lazy';
  import StuTry from '../ui/teacher/StuTry.svelte';
  import TSim from '../ui/teacher/TSim.svelte';
  import '../ui/teacher/teacher.css';

  const packs = trialPacks(), byId = (id: string) => packs.find((p) => p.id === id) as LessonPack;
  // ⚙ 기능 = 실제 수업(전체 묶음)과 같되 체험판 규칙 목록만: 🏰 디펜스 · 📝 설문 · 🏆 대항전 · 📋 게시판(랭킹) · ✏ 출제 공방 · 📅 시간표 끔
  setFeatCfg({ bundle: 'full', on: { 'rest-defense': false, survey: false, contest: false, board: false, author: false, schedule: false } });
  const S: Store = { ...memoryStore(), kind: 'memory' as const } as Store; // 🏕 캠프 · 🎯 허수아비 · 🏰 성채 = 이 탭 메모리
  const M = useMe(200, 0, false, false); // 🧙 첫 용사 고르기 (캠프와 같은 이 탭 기록 · 시작 💎 200)
  const SK = 'citadel-trial-name';
  let name = $state((() => { try { return sessionStorage.getItem(SK) || ''; } catch { return ''; } })());
  let as = $state<'' | 'stu' | 'tch'>(''), run = $state<LessonPack | null>(null), runKey = $state(0);
  // 🧭 학생 흐름: 이름 → 🧙 용사 고르기 → 차시 카드 → 차시 → 🏕 캠프(아래 「⚔ 다른 차시로」 → 카드) · 선생님 흐름: 이름 → 카드 → 종합실 + 리모컨 → 카드
  let heroPick = $state(false), camp = $state<LessonPack | null>(null), campL = $state<LessonPack | null>(null), campKey = $state(0), done1 = $state(false);
  const nick = $derived(name.trim().slice(0, 8) || '체험 용사');
  function pick(r: 'stu' | 'tch') { as = r; try { sessionStorage.setItem(SK, name.trim().slice(0, 8)); } catch { /* 무시 */ } if (r === 'stu' && !M.me.seen['hero0']) { M.me.nick = nick; M.save(); heroPick = true; } }
  let atbT = $state(false); // 👩‍🏫 #55 체험판 게시판 던전 (학생 · 선생님 판 모두 · 봇 3 · 기록 없음)
  function start(id: string) { camp = null; run = byId(id); runKey++; }
  function close(ended?: boolean) { const L0 = run; run = null; if (as === 'stu' && L0) { if (ended) done1 = true; camp = L0; campL = L0; campKey++; } }
</script>

{#if atbT}
  {#await loadAtbTrial() then K}<K.default {packs} hero={M.me.hero} xp={M.me.xp} enh={M.me.enh} fx0={M.me.socket?.[M.me.hero] ?? ''} {nick} onclose={() => (atbT = false)} />{/await}
{:else if run && as === 'stu'}
  {#key runKey}<StuTry L={run} bots={4} trial nick={nick} restAfter={REST_AFTER[run.id] ?? ''} prep={(S, code) => trialRoom(S, run!, code, M.me.wallet.gem)} onclose={close} />{/key}
{:else if camp && as === 'stu'}
  {#key campKey}<Camp {S} L={camp} code="" trial={{ nick, grant: done1, ongate: () => (camp = null), packs }} />{/key}
{:else if heroPick}
  <FirstHero me={M.me} persist={M.save} ondone={() => (heroPick = false)} />
{:else if run && as === 'tch'}
  {#key runKey}<TSim L={run} bots={20} trial prep={(S, code) => trialRoom(S, run!, code)} onclose={() => (run = null)} />{/key}
{:else}
  <main class="tr" data-k="trial">
    <div class="key" aria-hidden="true" style:background-image="url({import.meta.env.BASE_URL}art/trial-key-v1.webp)"></div>
    <section class="card">
      <h1>모두의 던전 <small>체험판</small></h1>
      {#if !as}
        <p class="lead">학생이 되어, 또는 선생님이 되어 한 차시를 직접 해 봐요 · 로그인 없음 · 기록은 이 탭에만</p>
        <label class="nm"><span>이름</span><input data-k="trial-name" maxlength="8" placeholder="체험 용사" bind:value={name} autocomplete="off" /></label>
        <div class="roles">
          <button type="button" class="rb main" data-k="trial-stu" onclick={() => pick('stu')}>⚔ 학생으로 체험<small>🎒 학생 폰 · 🤖 가상 친구 4명</small></button>
          <button type="button" class="rb" data-k="trial-tch" onclick={() => pick('tch')}>👩‍🏫 선생님으로 체험<small>🖥 종합실 + 리모컨 · 🤖 가상 학생 약 20명</small></button>
        </div>
      {:else}
        <p class="lead">{as === 'stu' ? `⚔ ${nick} · 학생으로` : '👩‍🏫 선생님으로'} · 차시를 골라 시작해요</p>
        <div class="cards" data-k="trial-cards">
          {#each CARDS as c (c.id)}<button type="button" class="lc" data-k="trial-card" data-id={c.id} onclick={() => start(c.id)}><b>{c.ic} {c.name}</b><em>{c.tag}</em><small>{c.sub}</small></button>{/each}
        </div>
        <button type="button" class="lc atb" data-k="trial-atb" onclick={() => (atbT = true)}><b>📋 게시판 던전</b><em>🤖 봇 3명</em><small>수업 밖 팀 전투 · 기록은 남지 않아요</small></button>
        {#if as === 'stu' && campL}<button type="button" class="back" data-k="trial-camp" onclick={() => { camp = campL; campKey++; }}>🏕 캠프로</button>{:else}<button type="button" class="back" data-k="trial-back" onclick={() => (as = '')}>‹ 처음으로</button>{/if}
      {/if}
      <p class="foot">👩‍🏫 체험판 · {BUILD_ID}{showCredit ? ` · 만든 이 ${CREDIT_NAME}` : ''}</p>
    </section>
  </main>
{/if}

<style>
  .tr { position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; background: #0b0c10; color: var(--text); overflow: auto; }
  .key { position: absolute; inset: 0; background-position: center; background-size: cover; background-repeat: no-repeat; }
  @media (max-aspect-ratio: 1/1) { .key { background-size: auto 100%; background-position: 50% 50%; } } /* 📱 폰 = 가운데 세로로 잘라 용 얼굴 · 금빛 칼 */
  .card { position: relative; box-sizing: border-box; margin: 0 auto; width: min(100%, 430px); padding: var(--s4) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); background: linear-gradient(180deg, rgba(11, 12, 16, 0), rgba(11, 12, 16, 0.92) 18%); display: grid; gap: var(--s3); }
  h1 { margin: 0; font: 900 30px var(--font); text-shadow: 0 3px 0 #000; } h1 small { font-size: 18px; color: var(--accent); }
  .lead { margin: 0; font-size: 15px; color: var(--text-2); }
  .nm { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: var(--s2); } .nm span { font-weight: 700; }
  .nm input { min-height: 48px; padding: 0 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 600 17px var(--font); }
  .roles, .cards { display: grid; gap: var(--s2); }
  .rb { display: grid; justify-items: center; gap: 2px; min-height: 64px; padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 800 18px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rb.main { background: var(--accent); color: var(--on-accent); border: 0; box-shadow: 0 3px 0 var(--accent-sh); } .rb small { font-size: 13px; font-weight: 600; opacity: 0.85; }
  .nm input { min-width: 0; }
  .lc { display: grid; gap: 4px; text-align: left; min-height: 72px; padding: 12px 14px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); box-shadow: 0 3px 0 var(--press-sh); }
  .lc b { font-size: 18px; } .lc em { justify-self: start; font-style: normal; font-size: 13px; font-weight: 800; color: var(--on-accent); background: var(--accent); border-radius: 99px; padding: 1px 8px; } .lc small { font-size: 13px; color: var(--text-2); }
  .lc:first-child { border: 2px solid var(--accent); }
  .back { justify-self: start; min-height: 44px; padding: 0 12px; border: 0; background: none; color: var(--text-2); font: 700 15px var(--font); }
  .foot { margin: 0; font-size: 13px; color: var(--text-3); text-align: center; }
</style>
