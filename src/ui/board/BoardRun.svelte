<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { nextStep, openRoom, roomPath } from '../../raid/actions';
  import { isEnd, isLobby, resultOf } from '../../raid/raid';
  import { boardPack, firstTry, freshAll, gradeOf, itemCount, SEC_PER_ITEM, stepDone } from '../../board/board';
  import Student from '../Student.svelte';
  import { clock } from '../clock.svelte';

  // 📋 게시판 던전 1인 (#143 ⑨ · 「게시판 던전 1인」 = 허수아비 이어받기): 이 폰 안(메모리)에 방 하나 → 레이드 전투 화면(Student) 그대로
  //   개념 없이 문제 → 형성평가 · 숫자 바뀐 판 · 하트 2 · 다 하면 저절로 다음 · 시간 = 소문제 × 90초(위 막대 밑 선 하나) · 서버가 끊겨도 계속(이 폰 안)
  const { L0, uid, num, nick, cls, onend, onquit }: { L0: LessonPack; uid: string; num: number; nick: string; cls: string; onend: (r: { right: number; total: number; f: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number }) => void; onquit: () => void } = $props();
  const L = untrack(() => boardPack(L0));
  const M = memoryStore(), code = `B${Date.now() % 1e6}`;
  const S = { ...M, kind: 'memory' as const };
  untrack(() => {
    openRoom(S, L, code, PROFILES.board);
    S.set(`${roomPath(code)}/meta/fresh`, freshAll(L));
  });
  const R0 = () => S.get<Room>(roomPath(code)) as Room;
  let limit = $state(0), t0 = $state(0), done = false;
  const drive = setInterval(() => {
    const R = R0(); if (!R || done) return;
    if (isLobby(R)) { if (R.players?.[uid]) { nextStep(S, L, code); limit = itemCount(L, R0()) * (Number((globalThis as { __BOARD_SEC?: number }).__BOARD_SEC) || SEC_PER_ITEM) * 1000; t0 = Date.now(); /* __BOARD_SEC = 화면 시험만 */ } return; }
    const over = limit && Date.now() - t0 > limit;
    if (!isEnd(L, R) && stepDone(L, R, uid) && !over) { nextStep(S, L, code); return; }
    if (isEnd(L, R) || over) {
      done = true; const RR = R0(), f = firstTry(L, RR, uid), res = resultOf(L, RR, uid);
      onend({ right: res.right, total: res.total, f, grade: gradeOf(f), clear: !over, sec: Math.round((Date.now() - t0) / 1000) });
    }
  }, 300);
  onDestroy(() => clearInterval(drive));
  const leftMs = $derived(limit ? Math.max(0, limit - (clock.now - t0)) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
</script>

<div class="run">
  <div class="tline" aria-label="남은 시간 {mmss(leftMs)}"><i style:width="{limit ? (leftMs / limit) * 100 : 100}%"></i></div>
  <button type="button" class="quit" aria-label="그만하기" onclick={onquit}>‹</button>
  <span class="tleft">⏱ {mmss(leftMs)}</span>
  <Student {S} {L} {code} {uid} {num} {nick} {cls} board />
</div>

<style>
  .run { position: fixed; inset: 0; z-index: 26; background: var(--bg); overflow: auto; }
  .tline { position: fixed; left: 0; right: 0; top: 0; height: 3px; z-index: 30; background: rgba(255, 255, 255, 0.12); max-width: 430px; margin: 0 auto; }
  .tline i { display: block; height: 3px; background: var(--accent); transition: width 0.3s linear; }
  .quit { position: fixed; top: 6px; left: max(4px, calc(50% - 211px)); z-index: 30; width: 44px; height: 44px; border: 0; border-radius: 22px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: 22px; }
  .tleft { position: fixed; top: 14px; right: max(12px, calc(50% - 203px)); z-index: 30; height: 28px; padding: 0 10px; border-radius: 14px; background: rgba(8, 9, 12, 0.6); color: #fff; font: 700 13px var(--font); display: flex; align-items: center; font-variant-numeric: tabular-nums; }
</style>
