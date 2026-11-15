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
  import { answerOf, BOSS_ID, bossState, chainRecord, isChain, isEnd, isLobby, itemsFor, plainRecord } from '../../raid/raid';
  import { TEST_ADDR } from '../../channel';
  import { bonusBase } from '../../school/castle';
  import { meBound } from '../../store/meSync';
  import { dummyReward, type Bon } from '../../school/dummy';
  import { lastClass, lastTest } from '../../school/school';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { busy } from '../busy.svelte';

  // 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 선생님 「쪼갤것」 · V1-DESIGN 5-0 · 게시판 던전과 따로)
  //   차시 고르기 → 그 차시 문제(몬스터) → 형성평가 재대결 · 레이드 학생 화면(Student) 그대로 · 이 폰 안(메모리) 방
  //   숫자 = 문제마다 내 수업 기록: 맞힌 기록 있음(o · f) = 🔁 바뀐 숫자 / 없음(안 풂 · 못 맞힘) = 📄 학습지 숫자 · 문제 위 꼬리표
  //   ❤ · ⚡ · 시간 · 등급 · 순위 없음 · 틀린 소문제만 다시(정식 그대로) · 해결하면 그 몬스터 처치 → 다음
  //   보상 · 기록 = 정식 그대로 (📜 2026-11-15 머리 🔨 ⑥ · school/dummy.ts): 처치한 몬스터마다 bonus/{반}/{번호}/{차시}/{몬스터} 기록
  //     💎 복습 3 = 틀림 · 안 푼 문제를 해결했을 때만(하루 6번 · 서버 log) · 첫 복습 4 = 한 번 · 👑 재대결 14 = 그 차시 처음 처치 한 번 · 🏆 업적 12(한도 밖)
  //     📕 그 차시 남은 문제 0 = 7 · EXP = 처음 처치한 몬스터마다 5(+ 업적 10) · 하루 한도 100 안 · 판을 중간에 그만둬도 처치한 몬스터는 기록 · 보상
  //   ✍ 서술형 📸 = 정식 허수아비엔 사진 채점 없음(성채 서술형 방 · 수업 소레이드만) → 「✍ 서술형만」 칩은 자리만 흐림
  const { S, me, save, uid, num, cls, onclose }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; onclose: () => void } = $props();
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
    // 🧪 시험 고리(시험 주소만 · 출시 막는 것 9): 이 판의 몬스터 하나를 첫 시도에 다 맞힘으로 (e2e 가 서버 기록 · 보상을 확인)
    if (TEST_ADDR) (globalThis as { __dummyPerfect?: (mid: string) => void }).__dummyPerfect = (mid) => { const RR = S2.get<Room>(roomPath(code)); if (RR) S2.set(`${roomPath(code)}/subs/${mid}/${uid}/0`, itemsFor(L, RR, mid, uid, 0).map(answerOf)); };
  }
  // ── 진행: 해결하면 다음 몬스터 · 끝나면 보상 ──
  let lr: ReturnType<typeof liveRoom> | null = null, drive: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    const r = run; if (!r) return;
    untrack(() => busy.n++); // 진행 중 = 새 판 저절로 새로 고침 안 함 (#38) · effect 안에서 읽지 않게
    untrack(() => {
      lr = liveRoom(r.S, r.code);
      drive = setInterval(() => {
        const RR = r.S.get<Room>(roomPath(r.code)); if (!RR) return;
        if (isLobby(RR) || (!isEnd(r.L, RR) && stepDone(r.L, RR, uid))) { nextStep(r.S, r.L, r.code); return; }
        if (isEnd(r.L, RR)) finish(r, RR);
      }, 300);
    });
    return () => { untrack(() => busy.n--); if (drive) clearInterval(drive); lr?.stop(); };
  });
  // 서버 칸: 묶인 학생 = 서버(정식 키) · 묶이지 않은 폰(교사 · 시험 · 이 기기) = 이 폰에만(같은 규칙 · 같은 키)
  const LOGK = 'citadel-v1-dummy-log', BONK = 'citadel-v1-dummy-bonus';
  const bnd = untrack(() => meBound()), RS = bnd?.S ?? S, base = bnd ? bonusBase(bnd.cls, bnd.num) : '', gemLogP = bnd ? `gem/${bnd.cls}/${bnd.num}/log` : '';
  const readLocal = <T,>(k: string): T => { try { return JSON.parse(localStorage.getItem(k) || '{}') as T; } catch { return {} as T; } };
  const bonOf = (lid: string): Bon => (base ? RS.get<Bon>(`${base}/${lid}`) : readLocal<Record<string, Bon>>(BONK)[lid]) || {};
  /** 이번 판에 처치한 칸 (몬스터 · 형성평가) */
  function clearedIn(L: LessonPack, RR: Room): string[] {
    const out: string[] = [];
    for (const s of L.steps) {
      if (s.kind === 'boss') { const st = bossState(L, RR, uid); if (st.length && st.every((x) => x.ok)) out.push(BOSS_ID); continue; }
      if (s.kind !== 'monster') continue;
      if (isChain(L, RR, s.id) ? chainRecord(L, RR, s.id, uid).done : plainRecord(L, RR, s.id, uid).perfect) out.push(s.id);
    }
    return out;
  }
  function credit(r: { L: LessonPack; S: Store; code: string }, RR: Room): { got: number; xp: number; why: string[] } {
    const L0 = PACKS.find((p) => p.id === r.L.id) ?? r.L, cleared = clearedIn(r.L, RR), day = kstDay(S.now()), at = S.now();
    if (!cleared.length) return { got: 0, xp: 0, why: [] };
    const bon0 = bonOf(L0.id), log = (gemLogP ? RS.get<Record<string, unknown>>(gemLogP) : readLocal<Record<string, unknown>>(LOGK)) || {};
    const rw = dummyReward(L0, recOf(L0), bon0, cleared, log, day), why: string[] = []; let got = 0;
    // 기록 (정식 bonus.js: 판마다 tries +1 · 처치 = clear)
    if (base) for (const mid of cleared) { const o = bon0[mid] || {}; RS.set(`${base}/${L0.id}/${mid}`, { ...o, tries: (Number(o.tries) || 0) + 1, at, clear: true }); }
    else { const all = readLocal<Record<string, Bon>>(BONK); all[L0.id] = rw.bon; try { localStorage.setItem(BONK, JSON.stringify(all)); } catch { /* 무시 */ } }
    const localLog = gemLogP ? null : log;
    for (const g of rw.gems) {
      const n = g.free ? ((me.wallet.gem += g.n), g.n) : earnDaily(me.wallet, g.n, day, GEM.dayCap);
      if (!n) continue; got += n; why.push(`${g.why} ${n}`);
      if (gemLogP) RS.set(`${gemLogP}/${g.key}`, { g: n, at, why: g.why }); else localLog![g.key] = { g: n, at, why: g.why };
    }
    if (localLog) try { localStorage.setItem(LOGK, JSON.stringify(localLog)); } catch { /* 무시 */ }
    me.xp += rw.xp; save();
    return { got, xp: rw.xp, why };
  }
  function finish(r: { L: LessonPack; S: Store; code: string }, RR: Room) {
    if (drive) clearInterval(drive); drive = null;
    res = { L: r.L, ...credit(r, RR) }; run = null;
  }
  /** ‹ 그만하기 = 처치한 몬스터까지 기록 · 보상 (정식: 몬스터마다 따로 싸움) */
  function quit() {
    const r = run; if (!r) return; const RR = r.S.get<Room>(roomPath(r.code));
    const c = RR ? credit(r, RR) : { got: 0, xp: 0, why: [] }; run = null;
    if (c.got || c.xp) res = { L: r.L, ...c };
  }
  onDestroy(() => { if (drive) clearInterval(drive); lr?.stop(); });
  const shortOf = (p: LessonPack) => (p.title.split(' · ')[0] ?? p.title).replace(/^\d+차시\s*/, '').slice(0, 7);
  const tags = $derived(pick ? pick.steps.filter((s) => s.kind === 'monster' && pick!.monsters[s.id]).map((s) => ({ t: s.title.split(' · ').pop() ?? s.id, fresh: solvedIn(pick!, s.id) })) : []);
</script>

{#if run}
  <div class="drun" data-dummy>
    <button type="button" class="quit" aria-label="그만하기" onclick={quit}>‹</button>
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me.nick} {cls} board />
  </div>
{:else if res}
  <Sheet onclose={onclose} mainText="🏕 캠프로">
    {#snippet title()}🎯 {res?.L.no}차시 복습 끝!{/snippet}
    <p class="big">💎 +{res.got} · EXP +{res.xp}</p>
    <p class="muted">{res.why.join(' · ') || '이미 받은 보상이에요 · 💎 은 틀림 · 안 푼 문제를 해결하면 받아요'}</p>
    <button type="button" class="again" onclick={start}>🎯 한 번 더</button>
  </Sheet>
{:else}
  <Sheet onclose={onclose} mainText={pick ? `🎯 ${pick.no}차시 복습 시작` : '차시를 골라요'} mainDisabled={!pick} onmain={start}>
    {#snippet title()}🎯 허수아비 · 혼자 복습{/snippet}
    <div class="chips" role="radiogroup" aria-label="차시">
      {#each LESSONS as p (p.id)}<button type="button" role="radio" class="chip" class:on={pick?.id === p.id} aria-checked={pick?.id === p.id} disabled={!isOpen(p)} onclick={() => (pick = p)}><b>{p.no}차시</b><small>{isOpen(p) ? shortOf(p) : '🔒'}</small></button>{/each}
    </div>
    <button type="button" class="wonly" disabled title="📸 사진 채점 = 수업 소레이드 · 🏰 성채 서술형 방에서">✍ 서술형만</button>
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
