<script lang="ts">
  import { bump as usageBump } from '../../school/usage';
  import { onDestroy, untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { nextStep, openRoom, roomPath } from '../../raid/actions';
  import { chainRecord, isChain, itemsFor, plainRecord } from '../../raid/raid';
  import PhotoSheet, { type PhotoOut } from '../q/PhotoSheet.svelte';
  import { chainItems as phItems, type PhItem, codeRubrics, pendState, ready as phReady, rewriteCastle, rubric as phRubric } from '../../school/photo';
  import RewriteSheet from '../q/RewriteSheet.svelte';
  import type { Question } from '../../model/types';
  import { stepDone } from '../../board/board';
  import { meBound } from '../../store/meSync';
  import { withLegacy, CASTLE_GEM, CASTLE_PHOTO_GEM, CASTLE_XP, photoScrolls, manualOf, baseVer, bonusBase, castleReward, castleState, progressOf, roomPack, spanOf, type CastlePack, type CastleRec, type CastleRoom } from '../../school/castle';
  import { castles, visibleCastles } from '../../school/castles.svelte';
  import { dungeonOf, spriteOf } from '../manifest';
  import Sprite from '../Sprite.svelte';
  import { busy } from '../busy.svelte';
  import { sfx } from '../sound.svelte';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay } from '../../board/board';
  import Student from '../Student.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import type { Snippet } from 'svelte';
  import { GATE_TXT, pickRoom } from '../../school/gate';

  // 🏰 성채 던전 (📜 2026-11-14 · DECISIONS 「🏰 성채던전 팩 · ➕ 추가 팩 관리」 · 정식 js/raid/bonus.js)
  //   층 목록 → 방 목록 → 방 하나 = 몬스터 한 마리(1:1 · 혼자) · 전투 = 학생 레이드 화면(Student · MonsterForm · ChainView · 룬 키패드) 그대로 🪞
  //   열림 = 반 진도 ≥ 방 no · 👑 = 열린 방 60%(올림) 처치 · 기회 4 · 틀린 소문제만 다음 판 숫자 · 실패 = 💧 벌 없음
  //   preview = 👁 선생님 미리 보기: 모든 방 열림 · 기록 · 데미지 없음 · 처치 기록 = bonus/{반}/{번호}/{팩}/{방}
  //   🌀 차원문 ⚡ 에너지 (📜 11/28): gate = 이 화면에서 연 방을 맞히면 onwin(⚡ +1 · 성채 기록 · 💎 · EXP 는 그대로) · top = 맨 위 반 카드 · 🎲 무작위 한 문제 · noBack = 수업 안(닫기 없음)
  const { S, me = null, save: persist = () => {}, uid, num = 0, cls = '', preview = false, all = false, floor = '', onclose, gate = null, top, noBack = false }: { S: Store; /** 👩‍🏫 교사 캠프 = 모든 방 열림(기록은 남음) */ all?: boolean; me?: Me | null; /** 💎 · EXP 저장 (캠프 M.save) */ save?: () => void; uid: string; num?: number; cls?: string; preview?: boolean; floor?: string; onclose: () => void; gate?: { onwin: () => void } | null; top?: Snippet; noBack?: boolean } = $props();
  const floors = $derived(preview ? castles.list : visibleCastles());
  // 🧑 기록 자리 = 그 학생으로 로그인한 폰이면 서버 정식 경로 · 아니면 이 기기(테스트 · 체험)
  const RS = untrack(() => meBound()?.S ?? S);
  // 💰 #65 받은 💎 를 gem log 에 남김 (누적 받은 💎 · 한도 안 = croom_ · cph_ / 업적 = seal_c_)
  const glog = (k: string, g: number, why: string) => { const b = meBound(); if (b && g > 0) b.S.set(`gem/${b.cls}/${b.num}/log/${k.replace(/[.#$/[\]]/g, '_')}`, { g, at: S.now(), why }); };
  /** 🧑‍🎓 수식 책사가 이미 열렸나 (gem log s_ph_ · 정식 photoPassed) */
  const photoHero = $derived.by(() => { void ver; const b = meBound(); return !!b && Object.keys(b.S.get<Record<string, unknown>>(`gem/${b.cls}/${b.num}/log`) || {}).some((k) => k.startsWith('s_ph_')); });
  const base = untrack(() => { const b = meBound(); return b ? bonusBase(b.cls, b.num) : bonusBase(cls, num || uid); });
  let ver = $state(0);
  // 🔓 교사 수동 해금 (school/castleOpen · castleAuto = 실시간) — 바뀌면 바로 다시 그림
  const mStop = untrack(() => [S.watch('school/castleOpen', () => ver++), S.watch('school/castleAuto', () => ver++)]); onDestroy(() => mStop.forEach((f) => f()));
  const manOf = (Px: CastlePack) => { void ver; return manualOf(S, Px.id, cls); };
  const recsOf = (P: CastlePack): Record<string, CastleRec> => { void ver; return preview ? {} : withLegacy(P.id, RS.get<Record<string, CastleRec>>(`${base}/${P.id}`) || {}); }; // 옛 1층 7마리 기록 = 그 방들 처치 (정식 roomRec)
  const upto = untrack(() => (preview ? 99 : progressOf(S, cls, (cls && num ? S.get<Record<string, unknown>>(`records/${cls}/${num}`) : null) || {}, all)));
  let fid = $state(untrack(() => floor || (floors.length === 1 ? floors[0]!.id : '')));
  let pickF = $state(untrack(() => floor || floors[floors.length - 1]?.id || ''));
  const P = $derived(floors.find((f) => f.id === fid) ?? null);
  const recs = $derived(P ? recsOf(P) : {});
  const st = $derived(P ? castleState(P, upto, recs, preview, manOf(P)) : null);
  let pickR = $state('');
  $effect(() => { const p = P, s = st; if (!p || !s) return; untrack(() => { if (!p.rooms.some((r) => r.id === pickR && s.isOpen(r))) pickR = (s.open.find((r) => !recs[r.id]?.clear) ?? s.open[0])?.id ?? ''; }); });
  const room = $derived(P?.rooms.find((r) => r.id === pickR) ?? null);
  const safe = (ref: string) => { try { spriteOf(ref); return ref; } catch { return 'base0:0'; } };
  const nn = (r: CastleRoom) => (/^\D*(\d+)/.exec(r.id)?.[1] ?? '').padStart(2, '0');
  function lineOf(r: CastleRoom): string {
    if (!st) return '';
    if (!st.auto && !st.isOpen(r)) return '🔒 선생님이 열어 주면 열려요'; // 🔓 자동 해금 끔 = 교사가 연 방만
    if (r.boss && !st.bossOpen) return r.no > upto && !preview ? `🔒 ${r.no}차시를 배우면 · 열린 방 ${st.need}개 처치` : `🔒 열린 방 ${st.cleared} / ${st.need} 처치하면 열려요`;
    if (!st.isOpen(r)) return `🔒 ${r.no}차시를 배우면 열려요`;
    const rr = recs[r.id], ph = P ? phOn(P, r) : false;
    const phT = !r.photo ? '' : !ph ? '📷 답 확인만' : rr?.pend ? '⏳ 선생님 확인 중' : rr?.ans && !rr.clear ? '📷 풀이 사진 올리기' : rr?.clear && !rr.ph ? '✔ 처치 · 📷 서술형 남음 · 📜 1' : rr?.ph && !rr.ph2 && P && canRw(P, r) ? '✔ 서술형 · 실력 쓰기 가능' : rr?.ph2 ? '✔ 실력 쓰기 통과' : rr?.ph ? '📷 서술형 통과' : '📷 서술형';
    return [r.card ? r.card.replace(/\s*·\s*📷 서술형\s*$/, '') : r.chain ? '⚔ 소레이드' : `소문제 ${r.vers[0]?.length ?? 0}`, phT, r.photo && !photoHero ? '🎁 🧑‍🎓' : '', `${r.no}차시`].filter(Boolean).join(' · ');
  }
  // 📷 서술형 방 (정식 bonus.js · 📜 2026-11-15): 기준표를 켠 방만 · 답을 맞히면 그 숫자 그대로 사진 단계 · 통과 = 처치 (+ 💎 6 · 📜 · EXP 6)
  //   ⚔ 소레이드 방 = 답으로 먼저 처치 · 사진은 처치 뒤 보너스 · 꺼져 있으면 지금처럼 「답 확인만」 · 미리 보기 · 서버 없는 체험 = 「✔ 테스트: 사진 통과로 보기」
  const phTrial = untrack(() => preview || (RS as { kind?: string }).kind !== 'server');
  function phOn(Px: CastlePack, r: CastleRoom): boolean { void ver; if (!r.photo) return false; return phTrial ? !!(phRubric(S, Px.id, r.id) ?? codeRubrics()[Px.id]?.[r.id]) : phReady(S, Px.id, r.id); }
  const phItemsOf = (qs: PhItem[]): PhItem[] => qs.map((q) => ({ question: q.question, answer: (q as { answer?: unknown }).answer ?? (q as { answers?: string[] }).answers?.[0], solution: q.solution, check: q.check }));
  let shot = $state<{ P: CastlePack; r: CastleRoom; items: PhItem[]; chain: boolean; again?: boolean } | null>(null);
  /** 📷 통과 → 기록 + 보상 (처치 보상은 아직 처치 전 방만) */
  function photoWin(Px: CastlePack, r: CastleRoom, out: { id?: string; score?: number; total?: number; up?: boolean } | null, why = '📷 서술형 통과'): string[] {
    const path = `${base}/${Px.id}/${r.id}`, old = RS.get<CastleRec>(path) || {}, got: string[] = [];
    if (preview) return ['👁 미리 보기 · 기록 없음'];
    const firstClear = !old.clear, before = castleState(Px, upto, recsOf(Px), false, manOf(Px)).bossOpen, anyBefore = floors.some((f) => Object.values(recsOf(f)).some((v) => v?.clear));
    const { pend: _p, ans: _a, ...keep } = old; void _p; void _a;
    RS.set(path, { ...keep, clear: true, ph: String(out?.id || 'ok'), tries: Number(old.tries) || 1, at: S.now() }); ver++;
    if (me && !old.ph) {
      const day = kstDay(S.now());
      if (firstClear) { const rw = castleReward({ first: true, boss: !!r.boss, firstCastle: !anyBefore, flawless: false, sealed: !!r.boss }); for (const [i, g] of rw.gems.entries()) { const n = g.free ? (me.wallet.gem += g.n, g.n) : earnDaily(me.wallet, g.n, day, GEM.dayCap); if (n) { got.push(`💎 +${n} ${g.why}`); glog(`${g.free ? 'seal_c' : 'croom'}_${Px.id}_${r.id}_${i}`, n, g.why); } } me.xp += rw.xp; if (rw.xp) got.unshift(`+${rw.xp} EXP`); }
      const g = earnDaily(me.wallet, CASTLE_PHOTO_GEM, day, GEM.dayCap); if (g) { got.push(`💎 +${g} ${why}`); glog(`cph_${Px.id}_${r.id}`, g, why); }
      const sc = 1; void photoScrolls; me.wallet.scroll += sc; got.push(`📜 +${sc} 서술 조각`); // 📜 #41 통과 = 📜 1 (문제당 한 번 · 수업 · 허수아비와 같게)
      { const b = meBound(); if (b) { const lp = `gem/${b.cls}/${b.num}/log`, had = Object.keys(b.S.get<Record<string, unknown>>(lp) || {}).some((k) => k.startsWith('s_ph_')); b.S.set(`${lp}/s_ph_${Px.id}_${r.id}`, { s: 1, at: S.now(), why: '📷 성채 서술형' }); if (!had) { got.push('🧑‍🎓 수식 책사 남 · 여가 열렸어요!'); setTimeout(() => { toast = '🧑‍🎓 수식 책사 남 · 여가 열렸어요! (내 용사 → 용사 바꾸기)'; setTimeout(() => (toast = ''), 4000); }, 600); } } } // 🧑‍🎓 정식 photoPassed · s_ph_ (성채 서술형 첫 사진 통과)
      me.xp += CASTLE_XP.photo; got.push(`+${CASTLE_XP.photo} EXP 서술형`);
      persist();
    }
    if (!before && castleState(Px, upto, recsOf(Px), false, manOf(Px)).bossOpen) { toast = '👑 보스 방이 열렸어요!'; setTimeout(() => (toast = ''), 3000); }
    return got;
  }
  function photoDone(v: PhotoOut | null) {
    const x = shot; shot = null; if (!x || !v) return;
    const path = `${base}/${x.P.id}/${x.r.id}`, old = RS.get<CastleRec>(path) || {};
    if (v.status === 'pass') {
      const sc = v.scores || [], prev = Math.max(Number(old.phs) || 0, ...sc.slice(0, -1), 0), up = (Number(old.phs) > 0 || sc.length > 1) && (Number(v.score) || 0) > prev;
      const got = photoWin(x.P, x.r, { id: v.id, score: v.score, total: v.total, up });
      sfx('game-ok', 0.8); res = { clear: true, r: x.r, first: !old.clear, bossNew: false, got, photo: 'pass' }; return;
    }
    if (preview) return;
    const best = Math.max(Number(old.phs) || 0, ...(v.scores || []));
    if (v.status === 'check' || v.status === 'appeal') { RS.set(path, { ...old, pend: String(v.id || ''), phs: best }); ver++; res = { clear: !!old.clear, r: x.r, first: false, bossNew: false, got: [], photo: 'pend' }; return; }
    RS.set(path, { ...old, phs: best }); ver++;
  }
  function openShot(Px: CastlePack, r: CastleRoom) {
    const rr = recs[r.id];
    if (r.chain) { const qs = Px.rooms.find((y) => y.id === r.id)?.vers[0] ?? []; shot = { P: Px, r, items: phItems(phRubric(S, Px.id, r.id), r.title, qs, qs.map((q) => q.solution || '')), chain: true }; return; }
    if (rr?.ans?.items?.length) { const v0 = (Px.rooms.find((y) => y.id === r.id)?.vers[0] ?? []) as unknown as PhItem[], again = rr.ans.items.map((q) => q.question).join('|') !== v0.map((q) => q.question).join('|'); shot = { P: Px, r, items: rr.ans.items, chain: false, again }; return; } // 🐞 11/23 학생이 푼 판 ≠ 판 0 = 숫자 바꾼 판 → 중계소가 학생 문제 글로 채점
    { const qs = Px.rooms.find((y) => y.id === r.id)?.vers[0] ?? []; shot = { P: Px, r, items: phItemsOf(qs as unknown as PhItem[]), chain: false }; } // 📜 #41 답 맞히기 전에도 = 성채 학습지 숫자(판 0)
  }
  // 📜 #57 ✍ 실력 쓰기 · 📜 +1 = 학습지 숫자 📷 를 통과한 방만 · 숫자 바꾼 판(1~6 중 학생마다 하나 · 숫자 없는 증명 = 판 0) · 방마다 한 번 · 📜 1 만 (💎 · EXP · 수식 책사 = 첫 통과 그대로)
  const canRw = (Px: CastlePack, r: CastleRoom) => !preview && !!r.photo && phOn(Px, r) && !!recs[r.id]?.ph && !recs[r.id]?.ph2 && !recs[r.id]?.pend2 && Px.id === P?.id;
  let rw = $state<{ P: CastlePack; r: CastleRoom; items: Question[] } | null>(null);
  function openRw(Px: CastlePack, r: CastleRoom) { const v = (Px.rooms.find((y) => y.id === r.id)?.vers ?? []) as unknown as Question[][]; const items = rewriteCastle(v, uid, r.id); if (!items.length) return; res = null; rw = { P: Px, r, items }; }
  function rwWin(Px: CastlePack, r: CastleRoom, id: string): string[] {
    const path = `${base}/${Px.id}/${r.id}`, old = RS.get<CastleRec>(path) || {}; if (old.ph2) return [];
    const { pend2: _p, ...keep } = old; void _p;
    RS.set(path, { ...keep, ph2: id || 'ok', at: S.now() }); ver++;
    if (!me) return []; me.wallet.scroll += 1; persist(); return ['📜 +1 서술 조각 (✍ 실력 쓰기)'];
  }
  function rwPass(v: PhotoOut) { const x = rw; rw = null; if (!x) return; const got = rwWin(x.P, x.r, String(v.id || 'ok')); sfx('game-ok', 0.8); res = { clear: true, r: x.r, first: false, bossNew: false, got, photo: 'pass' }; }
  function rwPend(v: PhotoOut) { const x = rw; if (!x || !v.id) return; const path = `${base}/${x.P.id}/${x.r.id}`; RS.set(path, { ...(RS.get<CastleRec>(path) || {}), pend2: String(v.id) }); ver++; }
  /** 📜 #41 전투 화면 「✍ 서술형 · 📷」 = 수업과 같게 (앞 단계 다 풀기 전에도 · 통과 = 처치) */
  const canShot = (Px: CastlePack, r: CastleRoom) => !!r.photo && phOn(Px, r) && !recs[r.id]?.ph && !recs[r.id]?.pend;
  function shotNow() { const x = run; if (!x || !canShot(x.P, x.r)) return; if (drive) clearInterval(drive); drive = null; run = null; openShot(x.P, x.r); }
  // ⏳ 기다리던 선생님 확인 → ✔ 인정 = 처치 + 보상 · ✖ = 기다림 지우고 다시 사진 (정식 photoSync)
  $effect(() => {
    if (preview || phTrial || !cls) return; void ver;
    untrack(() => { for (const f of floors) for (const r of f.rooms.filter((y) => y.photo)) {
      const rr = recsOf(f)[r.id];
      if (rr?.pend2) { const s2 = pendState(RS, cls, num, f.id, r.id, rr.pend2); if (s2 === 'ok') { const got = rwWin(f, r, rr.pend2); if (got.length) { toast = `✔ 선생님이 「${r.title}」 실력 쓰기를 인정했어요 — ${got.join(' · ')}`; setTimeout(() => (toast = ''), 4000); } } else if (s2 === 'no') { const { pend2: _q, ...k2 } = rr; void _q; RS.set(`${base}/${f.id}/${r.id}`, k2); ver++; } }
      if (!rr?.pend) continue;
      const s = pendState(RS, cls, num, f.id, r.id, rr.pend); if (s === 'wait') continue;
      const path = `${base}/${f.id}/${r.id}`;
      if (s === 'no') { const { pend: _p, ...keep } = rr; void _p; RS.set(path, keep); ver++; toast = `✏ ${r.title} — 선생님이 풀이를 다시 보고 싶대요. 고쳐서 다시 찍어요!`; setTimeout(() => (toast = ''), 3600); continue; }
      const got = photoWin(f, r, { id: rr.pend }, '📷 서술형 통과 (선생님 확인)'); sfx('game-ok', 0.8); toast = `✔ 선생님이 「${r.title}」 풀이를 인정했어요 — ${got.join(' · ')}`; setTimeout(() => (toast = ''), 4000);
    } });
  });
  const badge = (r: CastleRoom) => (!st?.isOpen(r) ? '🔒' : recs[r.id]?.clear ? '✔' : (recs[r.id]?.runs || recs[r.id]?.tries) ? '💧' : 'NEW'); // 정식에서 옮긴 방 = runs 없이 tries 만 있음

  // ── 방 하나 = 메모리 방 하나 (허수아비 · 게시판과 같은 길) ──
  let run = $state<{ L: ReturnType<typeof roomPack>; S: Store; code: string; r: CastleRoom; P: CastlePack } | null>(null);
  let res = $state<{ clear: boolean; r: CastleRoom; first: boolean; bossNew: boolean; firstCastle?: boolean; got?: string[]; /** 📷 사진 단계: ask = 답 맞힘 → 사진 올리기 · bonus = 소레이드 처치 뒤 보너스 · pend = 선생님 확인 · pass = 통과 · rw = 📜 #57 다시 쓰기 고르기 */ photo?: 'ask' | 'bonus' | 'pend' | 'pass' | 'rw' } | null>(null);
  let toast = $state('');
  function start(fight = false) {
    const p = P, r = room; if (!p || !r || !st?.isOpen(r)) return;
    if (!fight && canRw(p, r)) { res = { clear: true, r, first: false, bossNew: false, got: [], photo: 'rw' }; return; } // 📜 #57 서술형까지 통과한 방 = 「✍ 실력 쓰기」 먼저 (⚔ 다시 싸우기도 됨)
    if (r.photo && !r.chain && phOn(p, r) && recs[r.id]?.ans && !recs[r.id]?.clear && !recs[r.id]?.pend) { openShot(p, r); return; } // 📷 답은 이미 맞힘 → 같은 숫자로 사진 단계
    if (r.photo && phOn(p, r) && recs[r.id]?.clear && !recs[r.id]?.ph && !recs[r.id]?.pend) { openShot(p, r); return; } // 처치 뒤 = 📷 서술형만 (⚔ 소레이드 방 · 🐞 #52 답으로 처치된 방도 · 문제당 📜 1)
    const L = roomPack(p, r, safe(r.sprite)), S2: Store = { ...memoryStore(), kind: 'memory' as const }, code = `C${Date.now() % 1e6}`;
    openRoom(S2, L, code, PROFILES.board);
    const M = `${roomPath(code)}/meta`;
    S2.set(`${M}/castle`, true); S2.set(`${M}/fresh`, { [r.id]: preview ? 0 : baseVer(recs[r.id]) });
    S2.set(`${M}/retries`, 3); S2.set(`${M}/healMax`, 0); S2.set(`${M}/solve`, 0); S2.set(`${M}/pct`, 100);
    nextStep(S2, L, code);
    sfx(r.boss ? 'mon-appear-boss' : 'mon-appear', 0.8);
    run = { L, S: S2, code, r, P: p }; res = null;
  }
  let drive: ReturnType<typeof setInterval> | null = null, doneAt = 0;
  $effect(() => {
    const x = run; if (!x) return;
    untrack(() => busy.n++); // 진행 중 = 새 판 저절로 새로 고침 안 함
    doneAt = 0;
    untrack(() => { drive = setInterval(() => { const RR = x.S.get<Room>(roomPath(x.code)); if (!RR) return; if (!doneAt && stepDone(x.L, RR, uid)) doneAt = Date.now(); if (doneAt && Date.now() - doneAt > 2200) finish(x, RR); }, 250); }); // 채점표 · 처치 연출을 본 뒤 결과
    return () => { untrack(() => busy.n--); if (drive) clearInterval(drive); drive = null; };
  });
  onDestroy(() => { if (drive) clearInterval(drive); });
  /** 처치 · 💧 판정 + 기록 (미리 보기 = 기록 없음) */
  function outcome(x: NonNullable<typeof run>, RR: Room) {
    const mid = x.r.id;
    if (isChain(x.L, RR, mid)) { const c = chainRecord(x.L, RR, mid, uid); return { clear: c.done, n: c.nextK, flawless: !!c.done && !!(c as { perfect?: boolean }).perfect }; }
    const p = plainRecord(x.L, RR, mid, uid); return { clear: p.perfect, n: p.tries.length, flawless: p.perfect && p.tries.length === 1 };
  }
  function save(x: NonNullable<typeof run>, clear: boolean, n: number, ans?: CastleRec['ans']) {
    if (preview || !n) return { first: false, bossNew: false, firstCastle: false };
    if (meBound()) usageBump(S, cls, num, 'c'); // 📈 활용 추이 🏰 성채 풀이 (판마다 · 정식 bonus.js bump c)
    const path = `${base}/${x.P.id}/${x.r.id}`, old0 = RS.get<CastleRec>(path) || {}, old = ans ? { ...old0, ans } : old0;
    const before = castleState(x.P, upto, recsOf(x.P), false, manOf(x.P)).bossOpen, anyBefore = floors.some((f) => Object.values(recsOf(f)).some((v) => v?.clear));
    RS.set(path, { ...old, tries: (Number(old.tries) || 0) + n, runs: (Number(old.runs) || 0) + 1, at: S.now(), ...(clear || old.clear ? { clear: true } : {}) });
    ver++;
    return { first: clear && !old.clear, bossNew: !before && castleState(x.P, upto, recsOf(x.P), false, manOf(x.P)).bossOpen, firstCastle: clear && !old.clear && !anyBefore };
  }
  function finish(x: NonNullable<typeof run>, RR: Room) {
    if (drive) clearInterval(drive); drive = null;
    const runs0 = Number(recs[x.r.id]?.runs) || (Number(recs[x.r.id]?.tries) ? 1 : 0), o0 = outcome(x, RR);
    if (gate && !preview && o0.clear) gate.onwin(); // 🌀 ⚡ 에너지 화면에서 연 방 + 맞힘 = +1 (다시 맞혀도)
    const phAsk = o0.clear && !!x.r.photo && !x.r.chain && phOn(x.P, x.r) && !recs[x.r.id]?.clear; // 📷 답을 맞힘 → 처치는 사진 통과 뒤
    let ans: CastleRec['ans'];
    if (phAsk) { const pr = plainRecord(x.L, RR, x.r.id, uid), at = pr.tries.find((t) => t.total > 0 && t.correct === t.total)?.attempt ?? 0; ans = { items: phItemsOf(itemsFor(x.L, RR, x.r.id, uid, at)) }; }
    const o = phAsk ? { ...o0, clear: false } : o0, s = save(x, o.clear, o.n, ans);
    if (phAsk) { sfx('game-ok', 0.8); res = { clear: false, r: x.r, first: false, bossNew: false, got: [], photo: 'ask' }; run = null; if (preview) shot = { P: x.P, r: x.r, items: ans!.items, chain: false }; return; } // 정식 기록(tries 만) = 이미 해 본 방 → 첫 판 무결 보너스 아님
    sfx(o.clear ? 'game-ok' : 'game-no', 0.8);
    // 💎 · EXP = 정식 그대로 (처음 처치만 · 하루 한도 100 안 · 🏆 업적은 밖 · 미리 보기 = 없음)
    const rw = castleReward({ first: s.first, boss: !!x.r.boss, firstCastle: s.firstCastle, flawless: o.flawless && runs0 === 0, sealed: s.first && !!x.r.boss }), got: string[] = [];
    if (me && !preview && (rw.gems.length || rw.xp)) {
      const day = kstDay(S.now());
      let capped = false;
      for (const [i, g] of rw.gems.entries()) { const n = g.free ? (me.wallet.gem += g.n, g.n) : earnDaily(me.wallet, g.n, day, GEM.dayCap); if (n < g.n) capped = true; if (n) { got.push(`💎 +${n} ${g.why}`); glog(`${g.free ? 'seal_c' : 'croom'}_${x.P.id}_${x.r.id}_${i}`, n, g.why); } }
      if (capped && Number.isFinite(GEM.dayCap)) got.push(`💎 오늘 한도 ${GEM.dayCap} 다 받음 · 내일 다시`); // 🐞 11/19 한도로 0 · 일부 = 알림
      if (rw.xp) { me.xp += rw.xp; got.unshift(`+${rw.xp} EXP`); }
      persist();
    }
    res = { clear: o.clear, r: x.r, ...s, got, ...(o.clear && x.r.photo && phOn(x.P, x.r) && !recs[x.r.id]?.ph ? { photo: 'bonus' as const } : {}) }; run = null;
    if (s.bossNew) { toast = '👑 보스 방이 열렸어요!'; sfx('castle-open', 0.8); setTimeout(() => (toast = ''), 3000); }
  }
  /** ‹ 그만하기 = 낸 답이 있으면 💧 한 번으로 셈 (정식: 판마다 기록) */
  function quit() { const x = run; if (!x) return; const RR = x.S.get<Room>(roomPath(x.code)); if (RR) { const o = outcome(x, RR); save(x, o.clear, o.n); } run = null; }
  function back() { if (res) { res = null; return; } onclose(); }
  // 🏰 옛 정식 배치 (11/17 #16): 층은 위 포털에서 고름(처음 = 마지막 층) · 방 칸을 누르면 바로 도전 · 잠긴 방 = 까닭 한 줄
  $effect(() => { if (!fid && floors.length) untrack(() => (fid = pickF || floors[floors.length - 1]!.id)); });
  const sealedOf = (f: CastlePack) => f.rooms.some((r) => r.boss && recsOf(f)[r.id]?.clear);
  const seals = $derived(floors.filter((f) => sealedOf(f)).length);
  const anyClear = $derived(floors.some((f) => Object.values(recsOf(f)).some((v) => v?.clear)));
  /** 🎲 무작위 한 문제 = 모든 층의 열린 방 중 아직 처치 안 한 방 먼저 */
  function randomGo() {
    const all2 = floors.flatMap((f) => { const rc = recsOf(f), s2 = castleState(f, upto, rc, preview, manOf(f)); return f.rooms.map((r) => ({ f, r, open: s2.isOpen(r), clear: !!rc[r.id]?.clear })); });
    const p = pickRoom(all2); if (!p) { toast = '열린 방이 없어요'; setTimeout(() => (toast = ''), 2400); return; }
    fid = p.f.id; pickR = p.r.id; sfx('click', 0.4); start();
  }
  function tile(r: CastleRoom) { if (!st?.isOpen(r)) { toast = lineOf(r); sfx('click', 0.3); setTimeout(() => (toast = ''), 2600); return; } pickR = r.id; start(); }
  const title = $derived(gate ? '⚡ 에너지 · 성채' : '🏰 성채던전');
  (globalThis as { __castle?: unknown }).__castle = { upto, base }; // 화면 시험 고리 (학생 화면엔 안 보임)
</script>

{#if run}
  <div class="drun" data-castle-run data-room={run.r.id}>
    <button type="button" class="quit" aria-label="그만하기" onclick={quit}>‹</button>
    {#if preview}<p class="pv" role="status">👁 미리 보기 · 기록 없음</p>{/if}
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me?.nick ?? ''} {cls} board extWr={run.r.chain && canShot(run.P, run.r) ? { label: '✍ 서술형', sub: `📷 · 📜 1${photoHero ? '' : ' · 🎁'}`, on: shotNow } : null} />
    {#if !run.r.chain && canShot(run.P, run.r)}<button type="button" class="wrc" data-k="castle-wr" onclick={shotNow}>✍ 서술형 · 📷 <small>{run.r.chain ? '통과 = 남은 단계 처치' : '통과 = 처치'} · 📜 1{photoHero ? '' : ' · 🎁 🧑‍🎓'}</small></button>{/if}
  </div>
{:else}
<div class="cs" role="dialog" aria-modal="true" aria-label="성채 던전" data-k="castle">
  <header class="bar">
    <button type="button" class="back" class:hide={noBack && !res} aria-label="뒤로" onclick={back}><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4 7 11l7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
    <b class="t" class:long={!res && title.length > 9}>{res ? (res.clear ? '⚔ 처치!' : '💧 이번엔 여기까지') : title}</b>{#if !res}<span class="pill seal" data-k="castle-seal">🏆 업적 {seals}개</span>{/if}
    {#if me && !preview}<span class="pill" aria-label="마정석 {me.wallet.gem}개"><i class="wic" aria-hidden="true">💎</i>{me.wallet.gem.toLocaleString()}</span>
    {#if res}<span class="pill" aria-label="서술 조각 {me.wallet.scroll}개"><i class="wic" aria-hidden="true">📜</i>{me.wallet.scroll}</span>{/if}{:else if preview}<span class="pill pv2">👁 미리 보기</span>{/if}
  </header>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  <div class="body">
    {#if res}
      <div class="card res" data-k="castle-res" data-clear={res.clear ? '1' : '0'}>
        <span class="big" aria-hidden="true">{res.clear ? '⚔' : '💧'}</span>
        <b>{res.r.title}</b>
        <p>{res.photo === 'rw' ? '✔ 처치 · 📷 서술형 통과 — 숫자 바꾼 판으로 혼자 한 번 더 쓰면 📜 +1' : res.photo === 'ask' ? '✔ 답을 맞혔어요! 이제 풀이를 손으로 써서 📷 찍으면 처치돼요' : res.photo === 'pend' ? '⏳ 선생님이 풀이를 확인하면 처치로 바뀌어요' : res.clear ? (preview ? '미리 보기 · 기록하지 않았어요' : res.photo === 'pass' ? '📷 서술형 통과!' : res.first ? '처음 처치했어요!' : '다시 처치했어요') : '벌은 없어요 · 다음엔 새 숫자로 다시 도전해요'}</p>
        {#if res.photo === 'bonus'}<p class="sub">✍ 서술형도 📷 찍으면 보너스 (💎 · 📜 · EXP)</p>{/if}
        {#if res.got?.length}<ul class="got" data-k="castle-got">{#each res.got as g (g)}<li>{g}</li>{/each}</ul>{:else if res.clear && !preview && !res.first && res.photo !== 'rw'}<p class="sub">다시 처치 · 보상은 처음 처치 때만</p>{/if}
        {#if P && st && !preview}<p class="sub">처치 {st.cleared} / 열린 방 {st.plain.length}{st.boss ? ` · 👑 ${st.bossOpen ? '보스 방 열림' : `${st.need}방 처치하면 보스`}` : ''}</p>{/if}
      </div>
    {:else}
      {#if top}{@render top()}{/if}
      {#if gate && floors.length}<button type="button" class="rnd" data-k="gate-random" onclick={randomGo}><b>{GATE_TXT.random}</b><small>{GATE_TXT.randomSub}</small></button><p class="fxl">아래에서 직접 골라도 돼요</p>{/if}
      <!-- 🏰 옛 정식 「게임처럼」 배치 (📜 2026-11-17 #16 · js/raid/bonus.js render): 큰 띠(보스 방 배경 + 소개) → 💎 보상 줄 → 🌀 층 포털 → 그 층 방 지도(몬스터 · 번호 · 이름 · 상태 · 💎) · 값 · 열림 규칙은 그대로 -->
      {#if !gate}<div class="cshero" style:background-image="url({dungeonOf('citadel-boss')})" data-k="castle-hero"><p>교과서 평가 문제를 숫자만 바꾼 문제 · <b>방 하나에 몬스터 한 마리</b><br /><small>순서 없이 아무 방이나 · 그 차시 진도를 나가면 방이 열려요 · 👑 보스 방은 열린 방의 60%를 처치하면!</small></p></div>{/if}
      {#if !gate}<p class="fxl">✨ 🏆 업적 {seals}개 · 층마다 👑 보스 방을 처음 처치하면 업적 +1 (🎯 허수아비 형성평가 재대결도)</p>{/if}
      {#if !preview}<p class="gml" data-k="castle-gem">💎 방을 처음 처치하면 <b>+{CASTLE_GEM.room}</b> · 👑 보스 방 <b>+{CASTLE_GEM.roomBoss}</b> + 🏆 업적 <b>+{CASTLE_GEM.seal}</b>{anyClear ? '' : ` · 🎁 첫 방은 +${CASTLE_GEM.first} 더!`}</p>{/if}
      {#if !floors.length}
        <div class="empty"><span class="ic" aria-hidden="true">🏰</span><p>아직 열린 층이 없어요</p><small>선생님이 성채 팩을 올리면 열려요</small></div>
      {:else}
        <div class="portals" role="radiogroup" aria-label="층">
          {#each floors as f (f.id)}{@const s2 = castleState(f, upto, recsOf(f), preview, manOf(f))}{@const nNew = f.rooms.filter((r) => s2.isOpen(r) && !recsOf(f)[r.id]?.clear && !recsOf(f)[r.id]?.tries && !recsOf(f)[r.id]?.runs).length}
            <button type="button" role="radio" class="portal" class:on={fid === f.id} class:sealed={sealedOf(f)} aria-checked={fid === f.id} data-floor={f.id} onclick={() => { fid = f.id; sfx('click', 0.4); }}>
              <i aria-hidden="true">🌀</i><b>{f.floor}층</b><span>{f.title}</span><em>처치 {s2.cleared} / {s2.plain.length}{s2.boss && recsOf(f)[s2.boss.id]?.clear ? ' · 👑' : ''}{sealedOf(f) ? ' · 🏆' : ''}</em>{#if nNew && !preview}<span class="rnew">NEW {nNew}</span>{/if}{#if f.hide}<span class="rnew hid">숨김</span>{/if}
            </button>
          {/each}
        </div>
        {#if P && st}
          <div class="floor" class:sealed={sealedOf(P)}>
            <p class="fh" data-k="castle-sum"><b>{P.floor}층 · {P.title}</b><small>처치 <b>{st.cleared}</b> / 열린 방 {st.plain.length} · {st.boss ? (st.bossOpen ? '👑 보스 방 열림' : `👑 ${st.need}방 처치하면 보스`) : ''}{preview ? '' : ` · 진도 ${upto}차시`}</small>{#if !preview && st.cleared < st.plain.length && st.cleared > 0}{@const left = st.plain.filter((r) => !recs[r.id]?.clear)}<small class="left" data-k="castle-left">🗝 남은 방 {left.map((r) => `${nn(r)}번`).join(' · ')}{st.boss && recs[st.boss.id]?.clear ? ' (보스는 처치함)' : ''}</small>{/if}</p>
            <div class="rooms" role="radiogroup" aria-label="방">
              {#each P.rooms as r (r.id)}{@const on = st.isOpen(r)}{@const rr = recs[r.id]}
                <button type="button" role="radio" class="room" class:on={pickR === r.id} class:boss={!!r.boss} class:lock={!on} class:clear={!!rr?.clear} aria-checked={pickR === r.id} data-room={r.id} data-open={on ? '1' : '0'} onclick={() => tile(r)}>
                  {#if badge(r) === 'NEW'}<span class="rnew">NEW</span>{/if}
                  <span class="rno">{r.boss ? '👑' : nn(r)}</span>
                  <span class="mon">{#if on}<Sprite ref={safe(r.sprite)} pose={rr?.clear ? 'down' : 'idle'} size={64} />{:else}<i class="lk" aria-hidden="true">🔒</i>{/if}</span>
                  <b class="rt">{r.title.replace(/^👑\s*/, '').replace(/^\d+\s+/, '')}</b><small class="rs">{rr?.clear ? (r.photo && phOn(P, r) && !rr.ph && !rr.pend ? '✔ 처치 · 📷 서술형 남음' : canRw(P, r) ? '✔ 서술형 · 실력 쓰기 가능' : rr.ph2 ? '✔ 실력 쓰기 통과' : '✔ 처치') : lineOf(r)}</small>
                  {#if on && !rr?.clear && !preview}<span class="gm">💎+{r.boss ? CASTLE_GEM.roomBoss + (sealedOf(P) ? 0 : CASTLE_GEM.seal) : CASTLE_GEM.room}</span>{/if}
                </button>
              {/each}
            </div>
          </div>
          {#if room?.note}<p class="note">💡 {room.note}</p>{/if}
        {/if}
      {/if}
    {/if}
  </div>
  {#if res}
    {#if (res.photo === 'ask' || res.photo === 'bonus') && P}
      <BottomAction dock={false} text={res.photo === 'ask' ? '📷 풀이 사진 올리기' : '✍ 서술형 📷 찍고 📜 받기'} mainLabel="풀이 사진 올리기" onmain={() => { const r = res!.r; if (res!.photo === 'ask' && !recs[r.id]?.ans && !preview) return; openShot(P!, r); }}>
        {#snippet aux()}<button type="button" class="later" onclick={() => (res = null)}>나중에</button>{/snippet}
      </BottomAction>
    {:else if res.clear && P && canRw(P, res.r)}
      <BottomAction dock={false} text="✍ 실력 쓰기 · 📜 +1" mainLabel="실력 쓰기" onmain={() => openRw(P!, res!.r)}>
        {#snippet aux()}{#if res?.photo === 'rw'}<button type="button" class="later" data-k="castle-refight" onclick={() => { res = null; start(true); }}>⚔ 다시 싸우기</button>{:else}<button type="button" class="later" onclick={() => (res = null)}>나중에</button>{/if}{/snippet}
      </BottomAction>
    {:else}
      <BottomAction dock={false} text="🏰 방 목록으로" mainLabel="방 목록으로" onmain={() => (res = null)} />
    {/if}
  {:else}
    <BottomAction dock={false} disabled={!room} why={room ? (room.photo && P && !phOn(P, room) ? '📷 사진 채점은 아직 · 답만 확인해요' : room.photo && recs[room.id]?.pend ? '⏳ 선생님이 풀이를 확인하고 있어요' : '') : '열린 방이 없어요'} text={room ? (room.photo && !room.chain && P && phOn(P, room) && recs[room.id]?.ans && !recs[room.id]?.clear && !recs[room.id]?.pend ? '📷 풀이 사진 올리기' : room.photo && P && phOn(P, room) && recs[room.id]?.clear && !recs[room.id]?.ph && !recs[room.id]?.pend ? '✍ 서술형 📷 찍고 📜 받기' : `⚔ ${room.boss ? '👑 보스 방' : `${nn(room)}번 방`} 도전`) : '방을 골라요'} mainLabel="방 도전" onmain={() => start()} />
{/if}
{#if rw}
  <RewriteSheet S={RS} {cls} {num} lesson={rw.P.id} room={rw.r.id} title={rw.r.title} items={rw.items} trial={phTrial} onpass={rwPass} onpend={rwPend} onclose={() => (rw = null)} />
{/if}
{#if shot}
  <PhotoSheet S={RS} {cls} {num} lesson={shot.P.id} room={shot.r.id} title={shot.r.title} items={shot.items} fresh={!!shot.again} trial={phTrial} onclose={photoDone} />
  {/if}
</div>
{/if}

<style>
  .cs { position: fixed; inset: 0; z-index: 20; max-width: 430px; margin: 0 auto; background: var(--bg); display: flex; flex-direction: column; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s2); }
  .back.hide { visibility: hidden; }
  .rnd { display: grid; justify-items: center; gap: 2px; min-height: 64px; padding: 10px 14px; border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 900 20px var(--font); box-shadow: 0 4px 0 var(--press-sh, #a3741f); }
  .rnd small { font: 700 13px var(--font); opacity: 0.85; } .rnd:active { transform: translateY(2px); box-shadow: none; }
  .back { flex: none; width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text); display: grid; place-items: center; }
  /* 📜 2026-11-17 #17 「성채 층 제목 잘림」: 한 줄 … → 두 줄까지 (긴 층 이름 = 17px) */
  .t { flex: 1; min-width: 0; font-size: var(--fs-title); line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; word-break: keep-all; }
  .t.long { font-size: 17px; }
  .pill { flex: none; display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .pv2 { color: var(--accent); }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .note { margin: 0; font-size: 14px; color: var(--text-2); }
  /* 🏰 옛 정식 배치 (11/17 #16) */
  .cshero { flex: none; min-height: 132px; border-radius: var(--r); background-size: cover; background-position: center 60%; display: flex; align-items: flex-end; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
  .cshero p { margin: 0; width: 100%; padding: 10px 12px; background: linear-gradient(transparent, rgba(5, 6, 10, 0.88) 35%); color: #fff; font-size: 14px; line-height: 1.45; text-shadow: 0 1px 0 #000; }
  .cshero small { font-size: 13px; color: #d6d9e0; }
  .fxl, .gml { margin: 0; font-size: 14px; color: var(--text-2); line-height: 1.45; } .gml b { color: var(--gem); }
  .portals { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: var(--s2); }
  .portal { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 76px; padding: 8px 10px; border-radius: var(--r); border: 2px solid var(--line); background: linear-gradient(160deg, #1d2a44, var(--surface)); color: var(--text); text-align: left; font: inherit; box-shadow: 0 3px 0 var(--press, #0a0c10); }
  .portal i { font-style: normal; font-size: 20px; } .portal b { font-size: 16px; } .portal span { font-size: 13px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; } .portal em { font-style: normal; font-size: 12px; color: var(--text-3); }
  .portal.on { border-color: var(--accent); background: linear-gradient(160deg, #3a2c10, var(--surface)); } .portal.sealed em { color: var(--accent); }
  .portal:active { transform: translateY(2px); box-shadow: none; }
  .rnew { position: absolute; right: 6px; top: 6px; padding: 1px 6px; border-radius: 99px; background: #e5484d; color: #fff; font: 800 11px/1.4 var(--font); } .rnew.hid { background: var(--surface-2); color: var(--text-3); }
  .floor { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); }
  .floor.sealed { border-color: var(--accent); }
  .fh { margin: 0; display: flex; flex-direction: column; gap: 2px; } .fh b { font-size: 17px; } .fh small { font-size: 13px; color: var(--text-2); } .fh small b { font-size: 14px; color: var(--accent); }
  .fh small.left { font-size: 14px; font-weight: 700; color: var(--accent); }
  .rooms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s2); }
  .room { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 132px; padding: 6px 4px 8px; border-radius: var(--r); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: inherit; box-shadow: 0 3px 0 var(--press, #0a0c10); }
  .room:active:not(.lock) { transform: translateY(2px); box-shadow: none; }
  .room.on { border-color: var(--accent); } .room.clear { opacity: 0.8; } .room.clear .rs { color: var(--ok); }
  .room.boss { border-color: #b48a2c; background: linear-gradient(#2a2010, var(--surface-2)); }
  .room.lock { opacity: 0.55; box-shadow: none; }
  .rno { position: absolute; left: 6px; top: 4px; font: 800 12px var(--font); color: var(--text-3); }
  .mon { width: 64px; height: 64px; display: grid; place-items: center; } .lk { font-style: normal; font-size: 26px; }
  .rt { font-size: 13px; line-height: 1.25; text-align: center; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
  .rs { font-size: 11px; color: var(--text-3); text-align: center; line-height: 1.3; }
  .gm { font: 800 11px var(--font); color: var(--gem); }
  .pill.seal { color: var(--accent); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s6) 0; color: var(--text-2); text-align: center; }
  .empty .ic { font-size: 44px; } .empty p { margin: 0; font-weight: 700; color: var(--text); } .empty small { font-size: var(--fs-small); }
  .card.res { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s5) var(--s4); border-radius: var(--r); background: var(--surface); text-align: center; }
  .res .big { font-size: 48px; } .res b { font-size: 18px; } .res p { margin: 0; color: var(--text-2); } .res .sub { font-size: var(--fs-small); }
  .toast { position: fixed; left: 50%; top: 64px; transform: translateX(-50%); z-index: 25; margin: 0; padding: var(--s2) var(--s4); border-radius: 20px; background: var(--surface-2); color: var(--accent); font-weight: 700; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); white-space: nowrap; }
  .drun { position: fixed; inset: 0; z-index: 20; background: var(--bg); overflow: auto; }
  .quit { position: fixed; z-index: 30; left: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; text-shadow: 0 1px 2px #000; }
  .pv { position: fixed; z-index: 30; top: 10px; left: 50%; transform: translateX(-50%); margin: 0; padding: 2px 10px; border-radius: 12px; background: rgba(8, 9, 12, 0.6); color: var(--accent); font-size: var(--fs-small); font-weight: 700; }
  .got { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; align-items: center; } .got li { font: 700 15px var(--font); color: var(--gem); } .got li:first-child { color: var(--accent); }
  .wrc { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(96px + env(safe-area-inset-bottom, 0px)); z-index: 30; display: grid; justify-items: center; min-height: 48px; padding: 6px 16px; border-radius: 12px; border: 2px solid var(--scroll); background: var(--surface); color: var(--text); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .wrc small { font: 600 12px var(--font); color: var(--text-2); }
  .wic { font-style: normal; font-size: 15px; line-height: 1; font-family: var(--font); } /* 💎 · 📜 = 우리 아이콘 글꼴 (📜 2026-11-20) */
</style>
