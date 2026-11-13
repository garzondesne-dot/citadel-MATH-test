<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay, boardPack, stepDone } from '../../board/board';
  import { nextStep, openRoom, roomPath } from '../../raid/actions';
  import { BOSS_ID, bossState, isEnd, isLobby } from '../../raid/raid';
  import { lastClass, lastTest } from '../../school/school';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';

  // 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 선생님 「쪼갤것」 · V1-DESIGN 5-0 · 게시판 던전과 따로)
  //   차시 고르기 → 그 차시 문제(몬스터) → 형성평가 재대결 · 레이드 학생 화면(Student) 그대로 · 이 폰 안(메모리) 방
  //   숫자 = 문제마다 내 수업 기록: 맞힌 기록 있음(o · f) = 🔁 바뀐 숫자 / 없음(안 풂 · 못 맞힘) = 📄 학습지 숫자 · 문제 위 꼬리표
  //   ❤ · ⚡ · 시간 · 등급 · 순위 없음 · 틀린 소문제만 다시(정식 그대로) · 해결하면 그 몬스터 처치 → 다음
  //   보상 = 정식 허수아비 값: 💎 복습 3(하루 6번) · 첫 복습 +4 · 형성평가 재대결 다 맞힘 14 · EXP 5 · 하루 한도 100 안
  //   ✍ 서술형 📸 = 베타에 사진 채점이 아직 없음 → 「✍ 서술형만」 칩은 자리만 흐림
  const { S, me, save, uid, num, cls, onclose }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; onclose: () => void } = $props();
  const DUMMY_GEM = { review: 3, perDay: 6, first: 4, rematch: 14, xp: 5 };
  type Rec = { mons?: Record<string, string>; bossM?: string };
  const recs = untrack(() => (cls && num ? S.get<Record<string, Rec>>(`records/${cls}/${num}`) : null) || {});
  const reach = Math.max(0, ...Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0), Number(untrack(() => (cls ? lastClass(S, cls)?.no : 0))) || 0, Number(untrack(() => (cls ? lastTest(S, cls)?.no : 0))) || 0);
  const LESSONS = PACKS.filter((p) => p.steps.some((s) => s.kind === 'monster') || p.boss);
  const recOf = (p: LessonPack): Rec | undefined => recs[p.id] ?? (p.partOf ? recs[p.partOf] : undefined);
  const isOpen = (p: LessonPack) => !cls || !!recOf(p) || p.no <= reach;
  let pick = $state<LessonPack | null>(untrack(() => LESSONS.filter(isOpen).at(-1) ?? null)), run = $state<{ L: LessonPack; S: Store; code: string } | null>(null), res = $state<{ L: LessonPack; got: number; xp: number; why: string[] } | null>(null);
  // 숫자 = 문제마다 수업 기록 (맞힌 기록 = 바뀐 숫자)
  const solvedIn = (p: LessonPack, mid: string) => { const st = recOf(p)?.mons?.[mid]; return st === 'o' || st === 'f'; };
  function start() {
    const L0 = pick; if (!L0) return;
    const L = boardPack(L0), S2: Store = { ...memoryStore(), kind: 'memory' as const }, code = `D${Date.now() % 1e6}`;
    openRoom(S2, L, code, PROFILES.board);
    const fresh: Record<string, boolean> = {};
    L.steps.forEach((s) => { if (s.kind === 'monster') fresh[s.id] = solvedIn(L0, s.id); });
    fresh[BOSS_ID] = /o/.test(recOf(L0)?.bossM || '');
    S2.set(`${roomPath(code)}/meta/fresh`, fresh);
    S2.set(`${roomPath(code)}/meta/dummy`, true);
    S2.set(`${roomPath(code)}/meta/retries`, 99); S2.set(`${roomPath(code)}/meta/bossTries`, 99); S2.set(`${roomPath(code)}/meta/think`, 0); S2.set(`${roomPath(code)}/meta/solve`, 0);
    run = { L, S: S2, code }; res = null;
  }
  // ── 진행: 해결하면 다음 몬스터 · 끝나면 보상 ──
  let lr: ReturnType<typeof liveRoom> | null = null, drive: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    const r = run; if (!r) return;
    untrack(() => {
      lr = liveRoom(r.S, r.code);
      drive = setInterval(() => {
        const RR = r.S.get<Room>(roomPath(r.code)); if (!RR) return;
        if (isLobby(RR) || (!isEnd(r.L, RR) && stepDone(r.L, RR, uid))) { nextStep(r.S, r.L, r.code); return; }
        if (isEnd(r.L, RR)) finish(r, RR);
      }, 300);
    });
    return () => { if (drive) clearInterval(drive); lr?.stop(); };
  });
  const DAYK = 'citadel-v1-dummy-day', FIRSTK = 'citadel-v1-dummy-first';
  function finish(r: { L: LessonPack; S: Store; code: string }, RR: Room) {
    if (drive) clearInterval(drive); drive = null;
    const day = kstDay(S.now()), why: string[] = []; let want = 0;
    let used: Record<string, number> = {}, first: Record<string, boolean> = {};
    try { used = JSON.parse(localStorage.getItem(DAYK) || '{}'); first = JSON.parse(localStorage.getItem(FIRSTK) || '{}'); } catch { /* 무시 */ }
    if ((used[day] || 0) < DUMMY_GEM.perDay) { want += DUMMY_GEM.review; why.push(`복습 ${DUMMY_GEM.review}`); used = { [day]: (used[day] || 0) + 1 }; }
    if (!first[r.L.id]) { want += DUMMY_GEM.first; why.push(`첫 복습 ${DUMMY_GEM.first}`); first[r.L.id] = true; }
    if (r.L.boss && bossState(r.L, RR, uid).every((x) => x.ok)) { want += DUMMY_GEM.rematch; why.push(`형성평가 재대결 ${DUMMY_GEM.rematch}`); }
    try { localStorage.setItem(DAYK, JSON.stringify(used)); localStorage.setItem(FIRSTK, JSON.stringify(first)); } catch { /* 무시 */ }
    const got = earnDaily(me.wallet, want, day, GEM.dayCap); me.xp += DUMMY_GEM.xp; save();
    res = { L: r.L, got, xp: DUMMY_GEM.xp, why }; run = null;
  }
  onDestroy(() => { if (drive) clearInterval(drive); lr?.stop(); });
  const shortOf = (p: LessonPack) => (p.title.split(' · ')[0] ?? p.title).replace(/^\d+차시\s*/, '').slice(0, 7);
  const tags = $derived(pick ? pick.steps.filter((s) => s.kind === 'monster' && pick!.monsters[s.id]).map((s) => ({ t: s.title.split(' · ').pop() ?? s.id, fresh: solvedIn(pick!, s.id) })) : []);
</script>

{#if run}
  <div class="drun" data-dummy>
    <button type="button" class="quit" aria-label="그만하기" onclick={() => (run = null)}>‹</button>
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me.nick} {cls} board />
  </div>
{:else if res}
  <Sheet onclose={onclose} mainText="🏕 캠프로">
    {#snippet title()}🎯 {res?.L.no}차시 복습 끝!{/snippet}
    <p class="big">💎 +{res.got} · EXP +{res.xp}</p>
    <p class="muted">{res.why.join(' · ') || '오늘 복습 보상은 다 받았어요'}</p>
    <button type="button" class="again" onclick={start}>🎯 한 번 더</button>
  </Sheet>
{:else}
  <Sheet onclose={onclose} mainText={pick ? `🎯 ${pick.no}차시 복습 시작` : '차시를 골라요'} mainDisabled={!pick} onmain={start}>
    {#snippet title()}🎯 허수아비 · 혼자 복습{/snippet}
    <div class="chips" role="radiogroup" aria-label="차시">
      {#each LESSONS as p (p.id)}<button type="button" role="radio" class="chip" class:on={pick?.id === p.id} aria-checked={pick?.id === p.id} disabled={!isOpen(p)} onclick={() => (pick = p)}><b>{p.no}차시</b><small>{isOpen(p) ? shortOf(p) : '🔒'}</small></button>{/each}
    </div>
    <button type="button" class="wonly" disabled title="📸 사진 채점은 베타에 아직 없어요">✍ 서술형만</button>
    {#if pick}<ul class="tl">{#each tags as t (t.t)}<li><span>{t.t}</span><span class="tag">{t.fresh ? '🔁 바뀐 숫자' : '📄 학습지 숫자'}</span></li>{/each}{#if pick.boss}<li><span>👑 형성평가 재대결</span><span class="tag">{(recOf(pick)?.bossM || '').includes('o') ? '🔁 바뀐 숫자' : '📄 학습지 숫자'}</span></li>{/if}</ul>{/if}
  </Sheet>
{/if}

<style>
  .drun { position: fixed; inset: 0; z-index: 20; background: var(--bg); overflow: auto; }
  .quit { position: fixed; z-index: 30; left: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; text-shadow: 0 1px 2px #000; }
  .chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--s2); }
  .chip { min-height: 52px; border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .chip b { font-size: 15px; } .chip small { font-size: 12px; color: var(--text-3); }
  .chip.on { border: 2px solid var(--accent); } .chip:disabled { opacity: 0.4; }
  .wonly { align-self: flex-start; min-height: 40px; padding: 0 14px; border-radius: 20px; border: 2px solid var(--scroll); background: rgba(199, 155, 255, 0.14); color: var(--text); font: 700 14px var(--font); }
  .wonly:disabled { opacity: 0.4; }
  .tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .tl li { display: flex; justify-content: space-between; align-items: center; gap: var(--s2); min-height: 40px; padding: 0 var(--s3); border-radius: 10px; background: var(--surface-2); font-size: 15px; }
  .tag { flex: none; height: 26px; padding: 0 10px; border-radius: 13px; border: 1px solid var(--line, #2f3440); color: var(--text-2); font: 700 13px var(--font); display: inline-flex; align-items: center; }
  .big { margin: 0; font-size: 22px; font-weight: 900; color: var(--accent); text-align: center; }
  .muted { margin: 0; color: var(--text-3); font-size: 14px; text-align: center; }
  .again { min-height: 48px; border-radius: 12px; border: 1px solid var(--accent); background: none; color: var(--accent); font: 700 15px var(--font); }
</style>
