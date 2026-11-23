<script lang="ts">
  import { oldHall } from '../oldUrl';
  import { boxGet, boxSet } from '../school/secretBox';
  import { onDestroy, untrack } from 'svelte';
  import type { DungeonProfile, LessonPack, Store } from '../model/types';
  import { openRoom } from '../raid/actions';
  import { firstClass, type Live } from '../school/school';
  import { clock, useClock } from './clock.svelte';
  import { liveValue } from './room.svelte';
  import TV from './tv/TV.svelte';
  import { PACKS, packOf } from '../engine/packs';
  import { carryOfRoom, withCarry } from '../school/carry';
  import { dressed } from './rdun';
  import { feat } from '../school/features.svelte'; // 🎲 그림 없는 차시 · 시험 던전 = 학생 폰과 같은 그림

  // 🖥 교실 TV (#119 ⑮) — 교사 폰이 연 수업(school/live)을 따라감 · 수업이 없으면 교사 캠프
  //   주소에 ?room= 이 있으면 그 방(시험 · 두 탭 체험: 없으면 그 던전으로 만들고 1-1반으로 봄)
  const { S, L, code, P, fixed }: { S: Store; L: LessonPack; code: string; P: DungeonProfile; fixed: boolean } = $props();
  const stopClock = useClock();
  const lv = untrack(() => liveValue<Live>(S, 'school/live'));
  onDestroy(() => { stopClock(); lv.stop(); });
  const devLive = untrack(() => { if (!fixed) return null; openRoom(S, L, code, P); const rd = new URLSearchParams(location.search).get('rdun'); if (rd) S.set(`rooms/${code}/meta/rdun`, rd); /* 🎲 시험 TV ?rdun=d01 = 그 던전을 입힌 방 */ return { code, cls: firstClass(), lesson: L.id, key: '0000' } as Live; });
  let pick = $state<Live | null>(null); // ② 코드 + 비밀번호로 고른 방
  const live = $derived(devLive ?? pick ?? lv.v.val);
  const now = $derived(clock.now);
  // 🔐 TV 입구 (📜 2026-11-13 밤 선생님 「TV는 열린 방 여는 건 비밀번호 혹은 코드 입력과 비밀번호 둘 중 하나」 → 「진행」)
  //   서버 · 교사 로그인 안 한 TV = 처음부터 🔐 종합실 입장 화면만(교사 캠프도 숨김) · ① 비밀번호 4자리 = 지금 열린 수업 방 · ② 코드로 들어가기 = 방 코드 6자리 + 비밀번호
  //   열린 수업 없음 = 한 줄 안내 · 맞힌 비밀번호는 이 TV 가 기억 → 다음 수업 저절로 · 교사 로그인한 TV 는 바로
  // 🔐 #163-① TV = 종합실 키를 한 번 쳐서 이 방의 hosts 에 등록 (방 진행 칸은 hosts · 교사만 씀) · 키는 이 TV 에 기억 → 다음 수업은 저절로
  type AS = Store & { auth?: { currentUser: { uid: string } | null }; isAdmin?: () => boolean; fetch?: <T>(p: string) => Promise<T | null> };
  const srv = !!(S as AS).auth && !fixed, admin = (S as AS).isAdmin?.() ?? false;
  const uid = () => (S as AS).auth?.currentUser?.uid ?? '';
  let host = $state<Record<string, boolean>>({}), showKey = $state(false), keyIn = $state(''), kerr = $state(''), trying = $state(false);
  const KK = 'citadel-tv-key'; // (옛 판 = localStorage 평문 · 지금 = secretBox 암호문 이름)
  // 🔐 보안 (📜 2026-11-14 🐞 「종합실 입장할 때 비번 노출됨」): 키는 누구도 못 읽는 hostKeys/{방}/{나} 에만 · 방(학생도 읽음)에는 hosts/{나} = true 만
  //   이 TV 기억 = 암호문(secretBox · 평문 localStorage 없음) · 옛 평문 칸은 읽자마자 옮기고 지움
  async function register(code: string, key: string) {
    if (!uid()) return false;
    trying = true; S.set(`hostKeys/${code}/${uid()}`, key);
    await new Promise((r) => setTimeout(r, 600));
    S.set(`rooms/${code}/hosts/${uid()}`, true);
    await new Promise((r) => setTimeout(r, 600));
    const ok = (await (S as AS).fetch?.<boolean>(`rooms/${code}/hosts/${uid()}`)) === true; // 규칙이 틀린 키를 막으면 서버에는 없음
    trying = false; host = { ...host, [code]: ok };
    if (ok) void boxSet(KK, key); else { S.set(`rooms/${code}/hosts/${uid()}`, null); S.set(`hostKeys/${code}/${uid()}`, null); }
    return ok;
  }
  async function remembered(): Promise<string> {
    let old = ''; try { old = localStorage.getItem(KK) || ''; if (old) localStorage.removeItem(KK); } catch { /* 무시 */ } // 옛 판 평문 → 지움
    if (old) { await boxSet(KK, old); return old; }
    return boxGet(KK);
  }
  $effect(() => {
    const c = live?.code; if (!srv || admin || !c || host[c] != null) return;
    untrack(() => { void remembered().then((k) => { if (k) void register(c, k); else host = { ...host, [c]: false }; }); });
  });
  const gated = $derived(srv && !admin && !(live?.code && host[live.code] === true));
  let byCode = $state(false), codeIn = $state('');
  async function enter() {
    kerr = '';
    if (byCode) {
      const c = codeIn.trim(), meta = await (S as AS).fetch?.<{ cls?: string; lesson?: string }>(`rooms/${c}/meta`);
      if (!meta?.lesson || !(await register(c, keyIn))) { kerr = '코드나 종합실 키가 달라요 · 교사 폰에서 다시 확인해요'; return; }
      pick = { code: c, cls: meta.cls ?? firstClass(), lesson: meta.lesson } as Live; return;
    }
    if (!live?.code) { kerr = '열린 수업이 없어요 · 교사 폰에서 ▶ 수업 열기'; return; }
    if (!(await register(live.code, keyIn))) kerr = '종합실 키가 달라요 · 교사 폰에서 다시 확인해요';
  }
  const ready = $derived(!trying && /^\d{4}$/.test(keyIn) && (!byCode || /^\d{6}$/.test(codeIn.trim())));
  // 🔗 옛 정식 TV 주소(?role=hall&code=…&key=…) = 코드로 들어가기에 채워 한 번 (키는 oldUrl 이 이미 주소에서 지움)
  if (oldHall && srv && !admin) untrack(() => { byCode = true; codeIn = oldHall!.code; keyIn = oldHall!.key; void enter().then(() => { keyIn = ''; }); });
  // ⏰ 자동 열기 = 📜 11/24 교사 폰이 엶 (TeacherApp · autoTick) · 종합실 PC 는 교사 계정을 두지 않으므로 열지 않음
</script>

{#if !gated}
  {#key live?.code ?? ''}<TV {S} L={live ? dressed(withCarry(packOf(live.lesson) ?? L, carryOfRoom(S, live.code), PACKS), S.get<string>(`rooms/${live.code}/meta/rdun`)) : L} {live} {now} />{/key} <!-- 🧩 #132 TV 차시 = 연 수업의 차시 · 🔐 비밀번호로 hosts 가 된 뒤에 (그 전엔 방에 쓰지 않음) -->
{:else}
  <div class="kov" role="dialog" aria-label="종합실 입장">
    <b>🔐 종합실 입장</b>
    {#if trying && !keyIn}<p>확인 중…</p>
    {:else}
      <p>{byCode ? '교사 폰 수업 화면의 방 코드 6자리와 종합실 키를 넣어요' : live?.code ? '교사 폰 수업 화면의 종합실 키 4자리를 넣어요 · 이 TV 는 기억해요' : '열린 수업이 없어요 · 교사 폰에서 ▶ 수업 열기'}</p>
      <div class="kins">
        {#if byCode}<input class="kin code" data-k="tv-code" inputmode="numeric" maxlength="6" bind:value={codeIn} placeholder="방 코드" />{/if}
        <input class="kin" data-k="tv-key" type="text" class:mask={!showKey} name="dungeon-room-key" inputmode="numeric" autocomplete="off" data-lpignore="true" data-1p-ignore spellcheck="false" maxlength="4" bind:value={keyIn} placeholder="○○○○" aria-label="종합실 키" onkeydown={(e) => { if (e.key === 'Enter' && ready) void enter(); }} />
        <button type="button" class="keye" data-k="tv-key-eye" aria-label={showKey ? '키 가리기' : '키 보기'} aria-pressed={showKey} onpointerdown={() => (showKey = true)} onpointerup={() => (showKey = false)} onpointerleave={() => (showKey = false)}>👁</button>
      </div>
      {#if kerr}<p class="kerr">{kerr}</p>{/if}
      <button type="button" class="kgo" disabled={!ready} onclick={enter}>{trying ? '확인 중…' : '✔ 입장'}</button>
      <button type="button" class="kalt" data-k="tv-bycode" onclick={() => { byCode = !byCode; kerr = ''; }}>{byCode ? '‹ 종합실 키만으로 (지금 열린 수업)' : '코드로 들어가기 ›'}</button>
    {/if}
  </div>
{/if}

<style>
  .kov { position: fixed; inset: 0; z-index: 50; background: rgba(5, 6, 10, 0.86); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh; color: #fff; text-align: center; font-family: var(--font); }
  .kov b { font-size: 6vh; } .kov p { margin: 0; font-size: 2.6vh; color: #d6d9e0; }
  .kin { width: 30vh; height: 10vh; text-align: center; font: 700 6vh var(--font); letter-spacing: 1vh; border-radius: 2vh; border: 2px solid var(--accent); background: #111; color: #fff; }
  .kerr { color: #ffb4ae !important; }
  .kgo { height: 9vh; padding: 0 4vh; border: 0; border-radius: 2vh; background: var(--accent); color: var(--on-accent); font: 700 3.4vh var(--font); }
  .kgo:disabled { opacity: 0.45; }
  .kin.mask { -webkit-text-security: disc; } /* 비밀번호 칸 아님(브라우저 「비밀번호 저장?」 안 뜨게) · 글자만 가림 */
  .kins { display: flex; gap: 2vh; } .kin.code { width: 40vh; }
  .kalt { border: 0; background: none; color: #c9ccd6; text-decoration: underline; font: 600 2.4vh var(--font); min-height: 6vh; }
  .keye { min-width: 7vh; min-height: 7vh; border: 0; border-radius: 1.2vh; background: rgba(255, 255, 255, 0.12); color: #fff; font-size: 3.4vh; cursor: pointer; touch-action: none; user-select: none; }
</style>
