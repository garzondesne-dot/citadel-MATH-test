<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { DungeonProfile, LessonPack, Store } from '../model/types';
  import { openRoom } from '../raid/actions';
  import { firstClass, type Live } from '../school/school';
  import { clock, useClock } from './clock.svelte';
  import { liveValue } from './room.svelte';
  import TV from './tv/TV.svelte';
  import { packOf } from '../engine/packs';

  // 🖥 교실 TV (#119 ⑮) — 교사 폰이 연 수업(school/live)을 따라감 · 수업이 없으면 교사 캠프
  //   주소에 ?room= 이 있으면 그 방(시험 · 두 탭 체험: 없으면 그 던전으로 만들고 1-1반으로 봄)
  const { S, L, code, P, fixed }: { S: Store; L: LessonPack; code: string; P: DungeonProfile; fixed: boolean } = $props();
  const stopClock = useClock();
  const lv = untrack(() => liveValue<Live>(S, 'school/live'));
  onDestroy(() => { stopClock(); lv.stop(); });
  const devLive = untrack(() => { if (!fixed) return null; openRoom(S, L, code, P); return { code, cls: firstClass(), lesson: L.id, key: '0000' } as Live; });
  const live = $derived(devLive ?? lv.v.val);
  const now = $derived(clock.now);
  // 🔐 #163-① TV = 종합실 키를 한 번 쳐서 이 방의 hosts 에 등록 (방 진행 칸은 hosts · 교사만 씀) · 키는 이 TV 에 기억 → 다음 수업은 저절로
  type AS = Store & { auth?: { currentUser: { uid: string } | null }; isAdmin?: () => boolean; fetch?: <T>(p: string) => Promise<T | null> };
  const srv = !!(S as AS).auth && !fixed, admin = (S as AS).isAdmin?.() ?? false;
  const uid = () => (S as AS).auth?.currentUser?.uid ?? '';
  let host = $state<Record<string, boolean>>({}), keyIn = $state(''), kerr = $state(''), trying = $state(false);
  const KK = 'citadel-tv-key';
  async function register(code: string, key: string) {
    if (!uid()) return false;
    trying = true; S.set(`rooms/${code}/hosts/${uid()}`, key);
    await new Promise((r) => setTimeout(r, 900));
    const ok = (await (S as AS).fetch?.<string>(`rooms/${code}/hosts/${uid()}`)) === key; // 규칙이 틀린 키를 막으면 서버에는 없음
    trying = false; host = { ...host, [code]: ok };
    if (ok) { try { localStorage.setItem(KK, key); } catch { /* 무시 */ } } else S.set(`rooms/${code}/hosts/${uid()}`, null);
    return ok;
  }
  $effect(() => {
    const c = live?.code; if (!srv || admin || !c || host[c] != null) return;
    untrack(() => { let k = ''; try { k = localStorage.getItem(KK) || ''; } catch { /* 무시 */ } if (k) void register(c, k); else host = { ...host, [c]: false }; });
  });
  const needKey = $derived(srv && !admin && !!live?.code && host[live.code] === false);
</script>

{#if !srv || admin || !live?.code || host[live.code] === true}
  {#key live?.code ?? ''}<TV {S} L={packOf(live?.lesson) ?? L} {live} {now} />{/key} <!-- 🧩 #132 TV 차시 = 연 수업의 차시 · 🔐 키로 hosts 가 된 뒤에 (그 전엔 방에 쓰지 않음) -->
{/if}
{#if needKey && live}
  <div class="kov" role="dialog" aria-label="종합실 키">
    <b>🖥 종합실 키</b><p>교사 폰 수업 화면의 「종합실 키」 4자리를 넣어요 · 이 TV 는 기억해요</p>
    <input class="kin" inputmode="numeric" maxlength="4" bind:value={keyIn} placeholder="○○○○" />
    {#if kerr}<p class="kerr">{kerr}</p>{/if}
    <button type="button" class="kgo" disabled={trying || !/^\d{4}$/.test(keyIn)} onclick={async () => { kerr = ''; if (!(await register(live.code, keyIn))) kerr = '키가 달라요 · 교사 폰에서 다시 확인해요'; }}>{trying ? '확인 중…' : '✔ 이 TV 로 진행'}</button>
  </div>
{/if}

<style>
  .kov { position: fixed; inset: 0; z-index: 50; background: rgba(5, 6, 10, 0.86); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh; color: #fff; text-align: center; font-family: var(--font); }
  .kov b { font-size: 6vh; } .kov p { margin: 0; font-size: 2.6vh; color: #d6d9e0; }
  .kin { width: 30vh; height: 10vh; text-align: center; font: 700 6vh var(--font); letter-spacing: 1vh; border-radius: 2vh; border: 2px solid var(--accent); background: #111; color: #fff; }
  .kerr { color: #ffb4ae !important; }
  .kgo { height: 9vh; padding: 0 4vh; border: 0; border-radius: 2vh; background: var(--accent); color: var(--on-accent); font: 700 3.4vh var(--font); }
  .kgo:disabled { opacity: 0.45; }
</style>
