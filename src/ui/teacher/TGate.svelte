<script lang="ts">
  import type { Store } from '../../model/types';
  import { teacherIn, toTitle, whoAmI } from './teacherAuth';

  // 🔐 교사 화면 입구 (📜 2026-11-13 밤 선생님 「왜 교사로 들어갈 때 로그인 안 돼 있어도 들어가지는 거야?」 → 「진행」)
  //   서버(시험 서버 · 에뮬레이터)에서 교사로 로그인(admins)하지 않은 폰 = 교사 화면 대신 이 로그인 화면만 · 한 번 로그인한 폰은 바로 들어감
  //   로그인은 됐지만 교사 계정이 아니면 그 줄 + 다른 계정으로 · 이 기기 모드(서버 없음)는 입구 없음
  const { S }: { S: Store } = $props();
  const who = $derived(whoAmI(S));
  let id = $state(''), pw = $state(''), err = $state(''), busy = $state(false);
  const ok = $derived(!!id.trim() && pw.length >= 6 && !busy);
  async function go(make: boolean) { if (!ok) return; busy = true; err = await teacherIn(S, id, pw, make); busy = false; }
</script>

<div class="tbar"><button type="button" class="bk" data-k="gate-title" aria-label="처음 화면으로" onclick={() => toTitle(S)}>‹</button><div class="t">교사 로그인</div></div>
<div class="mid tgate">
  <div class="lock" aria-hidden="true">🔐</div>
  <p class="lead">교사 화면은 로그인한 폰만 열려요<small>한 번 로그인하면 이 폰은 다음부터 바로 들어가요</small></p>
  {#if who}<p class="not" data-k="gate-not">{who} · 교사 계정이 아니에요</p>{/if}
  <form class="f" onsubmit={(e) => { e.preventDefault(); go(false); }}>
    <input class="fld tid" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="교사 아이디 · 영문·숫자 (또는 이메일)" bind:value={id} />
    <input class="fld" type="password" autocomplete="current-password" placeholder="비밀번호 (6자 이상)" bind:value={pw} />
    {#if err}<p class="err">{err}</p>{/if}
    <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
  </form>
  <button type="button" class="lk" disabled={!ok} onclick={() => go(true)}>처음이에요 · 교사 계정 만들기 (처음 만든 계정만 교사)</button>
</div>
<div class="tact"><button type="button" class="btn" data-k="gate-go" disabled={!ok} onclick={() => go(false)}>{busy ? '…' : '🔐 로그인'}</button></div>

<style>
  .bk { width: var(--tap); height: var(--tap); margin-left: calc(-1 * var(--s2)); border: 0; background: none; color: var(--text); font: 400 30px var(--font); }
  .tgate { display: flex; flex-direction: column; gap: var(--s3); padding: var(--s5) var(--s4); }
  .lock { font-size: 48px; text-align: center; }
  .lead { margin: 0 0 var(--s2); text-align: center; font-size: 17px; font-weight: 700; color: var(--text); line-height: 1.45; }
  .lead small { display: block; font-size: 14px; font-weight: 500; color: var(--text-2); }
  .not { margin: 0; padding: var(--s2) var(--s3); border-radius: 10px; background: var(--surface-2); color: var(--bad); font-size: 14px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
  .f { display: flex; flex-direction: column; gap: var(--s2); }
  .fld { height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 12px; font: 500 16px var(--font); }
  .err { margin: 0; color: var(--bad); font-size: 14px; }
  .lk { border: 0; background: none; color: var(--text-2); text-decoration: underline; font: 500 14px var(--font); min-height: var(--tap); }
  .lk:disabled { opacity: 0.45; }
</style>
