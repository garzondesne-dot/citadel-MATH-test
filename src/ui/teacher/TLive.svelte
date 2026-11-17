<script lang="ts">
  import { handsOf, lowerHand, openGobi, reviewStep, stepReview } from '../../school/help';
  import { idleOn, stuckCells, STUCK_N } from '../../school/idle';
  import { leftSteps, sendToReview, sentKey } from '../../school/sendReview';
  import { ccOpen, ccRan, ccStats, closeCC, openCC } from '../../school/cc';
  import { setReview } from '../../raid/actions';
  import { siteUrl } from '../../channel';
  import { holdWake, wakeTip } from '../wake.svelte';
  import { V4 } from '../../raid/raid';
  import { hallKeyOf } from '../../school/school';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, BOSS_ID, bossHp, bossNote, bossLive, bossState, chainRecord, isChain, isEnd, isLobby, monsterHp, nextIdx, plainRecord, solveLock, stepIdx, stepOf, timeLeft } from '../../raid/raid';
  import { appearNow, hideWords, chainRelease, heartRelease, endClass, extendTime, giveGift, giveStamp, stamped, nextStep, prevStep, roomPath, scoutAdd, sendReload, setAbsent, setBubble, setFocus, setPct, setRest, setSheet, setSolveSec, setThink, setVideo } from '../../raid/actions';
  import { bot, botsOff, setBots } from '../../raid/botRun.svelte';
  import { sfx } from '../sound.svelte';
  import { BOT_MAX, isBot } from '../../raid/bots';
  import { isOld, roster, resetPw, hasAccount, type Live } from '../../school/school';
  import { BUILD } from '../../build';
  import { unlocksOf } from '../../raid/raid';
  import { hhmm } from '../../school/bells';
  import { keepNo, pickNo, setOpen, stateOf } from '../../school/survey';
  import { feat } from '../../school/features.svelte';
  import { liveValue } from '../room.svelte';
  import { COLOR, groups, kindOf, minOf, short, total } from './flow';
  import { liveRoom } from '../room.svelte';
  import QR from '../QR.svelte';
  import SymText from '../q/SymText.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { talkOf } from '../tv/cards';
  import { drgNext, driveFun, endRest, funOf, GAMES, gamesOn, restMinDef, restOn, startFun, stopFun, tdCheer, tdShield, type Game } from '../../rest/run';
  import { status as funStatus, norm, type Fun } from '../../rest/fun';
  import { boardCols, boardScroll, cellOf, givenName, swordDots, todayCols, todayRow, type Cell } from '../../school/stuBoard';
  import { kstToday0 } from '../../school/noteDiff';

  // ⑬ 대기실 · ⑭ 리모컨 (#119 · DECISIONS 「대기실 확정」 「리모컨 칸 고정」 「도구 두 줄 맞춤」) — 같은 틀: 위 막대 · 가운데(스크롤 없음) · 주요 단추 68 · 수업 중 막대 62
  //   리모컨 칸 고정: 지금 단계 카드 = 배지 한 줄 · 제출 n / m · 미제출 · 높이 48 칸(정찰 중 −30초 · 등장까지 · +30초 → 등장 뒤 −5% · 체력 · +5%) · 🔒 · 🔄 칩 자리 늘 2줄 · 도구 여섯 칸 52 · 「다음 ▶」
  const { S, L, live, now, onhome, onclose }: { S: Store; L: LessonPack; live: Live; now: number; onhome: () => void; onclose: () => void } = $props();
  const unwake = holdWake(true); onDestroy(unwake); // 📱 리모컨 = 화면 꺼짐 방지 (📜 2026-11-14 · 정식 DS.UI.wake) · 지원 안 되면 띠 한 번
  const lr = untrack(() => liveRoom(S, live.code));
  onDestroy(lr.stop);
  const R = $derived(lr.v.room as Room | null);
  $effect(() => { if (R?.state.closed) untrack(onclose); }); // 교실 TV 에서 문이 닫혀 끝나도 교사 폰이 따라감
  const code = $derived(live.code);
  // 🤖 가상 학생 (📜 2026-11-14 · 🧪 테스트 수업만): 번호 칸 뒤에 🤖 칸 · 이름 앞 🤖
  const botPupils = $derived(R ? Object.entries(R.players || {}).filter(([u, p]) => isBot(u) && (p as { bot?: boolean }).bot).map(([u, p]) => ({ cls: live.cls, num: Number((p as { num?: number }).num) || 101, name: `·${(p as { nick?: string }).nick ?? '🤖'}`, uid: u })).sort((a, b) => a.num - b.num) : []);
  const pupils = $derived([...roster(live.cls, S), ...botPupils]);
  const nl = (n: number) => (n > 100 ? `🤖${n - 100}` : String(n));
  $effect(() => { if (R?.state.closed && bot.code === code) untrack(botsOff); });
  const ids = $derived(R ? activeIds(R, now) : []);
  const absent = $derived(R?.absent || {});
  const expected = $derived(pupils.filter((p) => !absent[p.uid]));
  const inSet = $derived(new Set(ids));
  const oldIds = $derived(R ? ids.filter((u) => isOld(R.players?.[u]?.ver)) : []);
  const nameOf = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? `${p.num} ${p.name}` : R?.players?.[u]?.nick ?? u; };
  const numOf = (u: string) => pupils.find((x) => x.uid === u)?.num ?? R?.players?.[u]?.num ?? 0;
  let talkOpen = $state(false); // 💬 말할 거리 전체
  let toast = $state(''), toastT: ReturnType<typeof setTimeout> | null = null;
  const say = (t: string) => { toast = t; if (toastT) clearTimeout(toastT); toastT = setTimeout(() => (toast = ''), 1800); };
  // 📝 설문 (마무리) — 그 반 열림 표시를 실시간으로 · 차시 번호 기본 = 이 기기 기억(없으면 이 차시)
  const svLive = untrack(() => liveValue<unknown>(S, `survey/${live.cls.replace(/[.#$/[\]]/g, '_')}`)); onDestroy(svLive.stop);
  const svSt = $derived.by(() => { void svLive.v.val; return stateOf(S, live.cls); });
  let svNo = $state(pickNo(untrack(() => L.no) || 10));

  // ── 흐름 · 시간 ──
  const G = $derived(groups(L, R));
  const mins = $derived(total(L, R));
  const left = $derived(R ? timeLeft(R, now) : null);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const i = $derived(R ? stepIdx(R) : -1);
  const step = $derived(R ? stepOf(L, R) : null);
  const steps = $derived(L.steps.map((s, k) => ({ s, k })).filter((x) => !x.s.later));
  const restMin = $derived(steps.filter((x) => x.k > i).reduce((a, x) => a + minOf(L, R, x.s), 0) + (step ? Math.ceil(minOf(L, R, step) / 2) : 0));
  const endAt = $derived(isLobby(R as Room) ? now + mins * 60e3 : now + restMin * 60e3);
  const bell = $derived(R?.state.deadline ? R.state.deadline + (Number(R.state.extend) || 0) * 60e3 : null);
  const late = $derived(bell ? Math.round((endAt - bell) / 60e3) : 0);
  const nextStepObj = $derived(R && !isEnd(L, R) ? L.steps[nextIdx(L, R)] ?? null : null);

  // ── 지금 단계 ──
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  // 🧱 같은 칸 막힘 (📜 2026-11-16 · 🌊 ②): 그 칸에서 2번 이상 틀렸고 못 맞힘 · 또는 멈춤 학생 ≥ 3 → 위 띠 · 누르면 닫힘 · 칸마다 한 번 · 이름 없이
  let stuckSeen = $state<Record<string, boolean>>({});
  const stuckNow = $derived.by(() => { if (!R || !mid || R.state.rest) return null; const c = stuckCells(L, R, mid, ids); const i = c.findIndex((n, k) => n >= STUCK_N && !stuckSeen[`${mid}|${k}`]); return i < 0 ? null : { i, n: c[i]! }; });
  const circ = (i: number) => '①②③④⑤⑥⑦⑧⑨⑩'[i] ?? `${i + 1}`;
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : R && step?.kind === 'boss' && L.boss ? bossHp(L, R, now) : null);
  const subd = $derived.by(() => {
    if (!R || !step) return [] as string[];
    if (step.kind === 'boss') return ids.filter((u) => bossState(L, R, u).some((x) => x.n > 0));
    if (!mid) return [];
    return ids.filter((u) => (chain ? chainRecord(L, R, mid, u).submitted : plainRecord(L, R, mid, u).submitted));
  });
  const unsub = $derived(ids.filter((u) => !subd.includes(u)));
  const stuck = $derived.by(() => {
    if (!R || !mid) return [] as { u: string; lock: boolean }[];
    if (chain) return ids.map((u) => ({ u, r: chainRecord(L, R, mid, u) })).filter((x) => x.r.locked || x.r.fail).map((x) => ({ u: x.u, lock: x.r.locked }));
    return ids.map((u) => ({ u, r: plainRecord(L, R, mid, u) })).filter((x) => x.r.submitted && !x.r.canRetry && x.r.best < x.r.total).map((x) => ({ u: x.u, lock: !!x.r.locked })); // v4 ❤ 0 = 🙋 잠김 → 풀어주기
  });
  // 📲 번호 칸 (📜 2026-11-14 선생님 시안 v12 「오케이 이거야 · 이대로 컨펌」 · 머리 e1880f6 B): 대기실 · 수업 중 · 마무리 = 같은 자리 · 같은 크기
  //   열 = 24명 이하 8 × 3(번호 + 이름) · 25~27 9 × 3 · 28~30 10 × 3(번호만) · 칸 = 들어옴 · 안 옴(점선) · 결석(결) · ⚠ 옛 판(노란 바탕 + 두근두근 2.4초) · 🙋 도움(빨간 테두리 + 손 흔들기) · 둘 다
  // 📜 2026-11-14 선생님 「리모컨 21명 하면 7X3으로해줘」 = 21명 이하 7열(번호 + 이름) · 22~24 8열
  // 👥 학생판 (📜 2026-11-17 #24 · 시안 WvA9oZWgb2oo45P8AfRmGG): 늘 4줄 · 한 줄 max(5, ceil(n/4)) 최대 7 · 29명부터 판 안 세로 밀기 · 칸 = 번호 + 이름(성 뺌) + ⚔ 칼 4칸 + 진행 막대
  const bCols = $derived(boardCols(pupils.length));
  const bScroll = $derived(boardScroll(pupils.length));
  let view = $state<'now' | 'today' | 'stuck'>('now');
  const curMid = $derived(mid ?? (step?.kind === 'boss' && L.boss ? BOSS_ID : null));
  const scouting = $derived(!!scout?.on);
  const readyIds = $derived(scout?.on && R ? R.ready?.[scout.id] || {} : {});
  const cells = $derived.by(() => { const m: Record<string, Cell> = {}; if (!R || !curMid || isLobby(R) || R.state.rest || scouting) return m; for (const p of pupils) if (R.players?.[p.uid]) m[p.uid] = cellOf(L, R, curMid, p.uid); return m; });
  // 🔑 로그인 실패 (오늘 · 아직 안 들어온 학생만 · loginFail/{반}/{번호}/{시각} · 교사만 읽음)
  const lfLive = untrack(() => liveValue<Record<string, Record<string, number>>>(S, `loginFail/${live.cls.replace(/[.#$/[\]]/g, '_')}`)); onDestroy(lfLive.stop);
  const lfOf = (p: { uid: string; num: number }) => { if (!R || R.players?.[p.uid] || absent[p.uid]) return 0; const t0 = kstToday0(now); return Object.values(lfLive.v.val?.[p.num] || {}).filter((t) => Number(t) >= t0).length; };
  // 오늘 표 (오늘 · 막힌 순)
  const tCols = $derived(todayCols(L));
  const tRows = $derived.by(() => { if (!R || view === 'now') return []; const rows = pupils.filter((p) => !absent[p.uid]).map((p) => ({ p, ...todayRow(L, R, p.uid, tCols) })); return view === 'stuck' ? rows.sort((a, b) => b.retry - a.retry || a.okN - b.okN || a.p.num - b.p.num) : rows; });
  // 숫자 줄 누름 = 그 학생들 반짝 1.6초
  let flash = $state<Record<string, boolean>>({}), flashT: ReturnType<typeof setTimeout> | null = null;
  function blink(us: string[]) { if (!us.length) return; view = 'now'; flash = Object.fromEntries(us.map((u) => [u, true])); if (flashT) clearTimeout(flashT); flashT = setTimeout(() => (flash = {}), 1600); }
  // ✋ 💡 도움 3단 뒤 손든 학생도 🙋 줄에 (📜 2026-11-15) · 칩 누름 = 칼이 다 떨어진 학생이면 ⚔ 보급 · 손만 든 학생이면 손 내림
  const hands = $derived(R && mid ? handsOf(R, mid) : []);
  // ✔ 개념 체크 (📜 2026-11-15 · school/cc.ts): 개념 단계에 check 가 있을 때만 단추 · 누름 = 30초 열기 · 다시 = 일찍 닫기 · 아래 한 줄 = 맞힘 n / 인원 · 많이 고른 오답
  const ccIsOpen = $derived(!!R && ccOpen(R, step, now));
  const ccSt = $derived(R && step?.check && ccRan(R, step) ? ccStats(R, step) : null);
  // 🔎 익명 풀이 (📜 2026-11-15 · 팩 문항 칸 review): 누를 때마다 띄우기 1 → 2 → … → 내리기 · 이 단계에 풀이가 없으면 단추 안 보임
  const rv = $derived(reviewStep(L, R, mid, now)); // 종합실 막대와 같은 함수 (🪞 11/17 #13 · #14 📊 고비)
  function nextReview() { if (R) stepReview(S, code, L, R, now); }
  const help = $derived([...new Set([...stuck.filter((x) => x.lock).map((x) => x.u), ...hands])]);
  // 🙋 줄 = 온 순서 (이 폰이 본 순서 · 먼저 온 학생 = 맨 왼쪽) · 풀리면 빠짐 · 새 요청 = 오른쪽에서 밀려 들어옴
  let order = $state<string[]>([]), fresh = $state<Record<string, boolean>>({}), since = $state<Record<string, number>>({}); // since = 🙋 줄에 들어온 시각(기다린 시간)
  let helpN = 0; $effect(() => { const n = help.length; untrack(() => { if (n > helpN) sfx('raise-hand', 0.8); helpN = n; }); }); // 🔊 🙋 도움 요청 (교사 폰 · 새로 손들 때)
  $effect(() => { const h = help; untrack(() => { const keep = order.filter((u) => h.includes(u)), add = h.filter((u) => !keep.includes(u)); if (add.length || keep.length !== order.length) { order = [...keep, ...add]; const t = Date.now(); since = Object.fromEntries([...keep, ...add].map((u) => [u, since[u] ?? t])); if (add.length) { const f = { ...fresh }; add.forEach((u) => (f[u] = true)); fresh = f; setTimeout(() => { const g = { ...fresh }; add.forEach((u) => delete g[u]); fresh = g; }, 400); } } }); });
  // ✔ 문제 결과 색 (📜 2026-11-14 선생님 「진행 · 베타 먼저」 · 머리 덧붙임 3): 지금 몬스터(보스)를 다 맞힘 = 초록 + ✔ (교사 폰만 · TV 아님) · 🙋 가 초록보다 앞 · 다음 단계 = 새로 · 쉼터 · 개념 · 영상 = 출석 · ⚠ · 🙋 만
  const okSet = $derived.by(() => { if (!R || !step || R.state.rest) return new Set<string>(); if (mid) return new Set(ids.filter((u) => (chain ? chainRecord(L, R, mid, u).done : plainRecord(L, R, mid, u).perfect))); if (step.kind === 'boss') return new Set(ids.filter((u) => { const b = bossState(L, R, u); return b.length > 0 && b.every((x) => x.ok); })); return new Set<string>(); });
  /** 칸 바탕 = 결석 · 안 옴 · 🙋 · ✔ · 들어옴 (⚠ 옛 판은 따로 덧붙임 = isOldU) */
  const stOf = (uid: string) => absent[uid] ? 'ab' : !inSet.has(uid) ? 'no' : help.includes(uid) ? 'help' : okSet.has(uid) ? 'ok' : idleOn(R, uid, mid) ? 'idle' : 'in'; // 🤝 idle = 90초 입력 없음(노랑 「멈춤」 · 📜 2026-11-16 · 🌊 ①)
  const isOldU = (uid: string) => inSet.has(uid) && !absent[uid] && isOld(R?.players?.[uid]?.ver);
  const waitOf = (u: string) => { const ms = Math.max(0, now - (since[u] ?? now)), s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const ordNo = (u: string) => { const k = order.indexOf(u); return k < 0 ? '' : '①②③④⑤⑥⑦⑧⑨⑩'[k] ?? `${k + 1}`; };
  /** 맨 위 숫자 줄 (누르면 그 학생들 반짝) */
  const sums = $derived.by(() => {
    if (!R) return [];
    const of = (f: (p: (typeof pupils)[number]) => boolean) => pupils.filter(f).map((p) => p.uid);
    const ab = of((p) => !!absent[p.uid]);
    if (isLobby(R)) return [{ k: 'g', t: '들어옴', us: of((p) => inSet.has(p.uid) && !absent[p.uid]) }, { k: 'o', t: '🔑 로그인 실패', us: of((p) => lfOf(p) > 0) }, { k: '', t: '안 들어옴', us: of((p) => !absent[p.uid] && !R.players?.[p.uid] && !lfOf(p)) }, { k: '', t: '결', us: ab }];
    if (scouting) return [{ k: 'y', t: '📝 준비 완료', us: of((p) => !absent[p.uid] && !!readyIds[p.uid]) }, { k: '', t: '아직', us: of((p) => inSet.has(p.uid) && !absent[p.uid] && !readyIds[p.uid]) }, { k: '', t: '결', us: ab }];
    return [{ k: 'g', t: '✔', us: of((p) => stOf(p.uid) === 'ok') }, { k: '', t: '🔥 푸는 중', us: of((p) => stOf(p.uid) === 'in') }, { k: 'r', t: '🙋', us: of((p) => stOf(p.uid) === 'help') }, { k: 'y', t: '🤝', us: of((p) => stOf(p.uid) === 'idle') }, { k: 'r', t: '⚔0', us: of((p) => !!cells[p.uid]?.zero) }, { k: '', t: '결', us: ab }];
  });
  const pname = (uid: string) => pupils.find((x) => x.uid === uid)?.name ?? '';
  // 🙋 풀어주기 (칩 한 번) · 3초 「되돌리기」
  let undoU = $state<{ u: string; mid: string; v4: boolean; n: number; at: number } | null>(null), undoT: ReturnType<typeof setTimeout> | null = null;
  function release(u: string) {
    if (!R || !mid) return; const v4 = V4(R), n = unlocksOf(R, mid, u);
    if (hands.includes(u)) { lowerHand(S, code, u); if (!stuck.some((x) => x.u === u && x.lock)) return; }
    if (v4) heartRelease(S, code, mid, u); else chainRelease(S, code, mid, u);
    undoU = { u, mid, v4, n, at: order.indexOf(u) }; if (undoT) clearTimeout(undoT); undoT = setTimeout(() => (undoU = null), 3000);
  }
  function undo() { const x = undoU; if (!x) return; if (x.v4) S.set(`${roomPath(code)}/unlock/${x.mid}/${x.u}`, x.n || null); else S.set(`${roomPath(code)}/chainOk/${x.mid}/${x.u}`, null); const o = order.filter((u) => u !== x.u); o.splice(Math.max(0, x.at), 0, x.u); order = o; undoU = null; } // 되돌리면 원래 자리로
  // 번호 칸 누름 = 상태 창 (대기실의 안 온 번호 = 바로 결석 표시)
  let who = $state(''), pwAsk = $state(false), pwDone = $state(false);
  function tapNum(uid: string) { who = uid; pwAsk = false; pwDone = false; } // 🚨 2026-11-16 핫픽스: 대기실에서 안 들어온 학생도 창이 열림(결석 표시 · 🔑 0000 같은 창) — 예전엔 누르면 결석 표시만 돼서 접속 안 한 학생의 비밀번호를 못 바꿨음
  const whoP = $derived(pupils.find((x) => x.uid === who) ?? null);
  const reload = () => { if (!oldIds.length) { say('옛 판 학생이 없어요'); return; } sendReload(S, code, oldIds); say(`🔄 옛 판 ${oldIds.length}명에게 새로 고침을 보냈어요`); };
  const boss5 = $derived(left != null && left > 0 && left <= 5 * 60e3 && !R?.state.extend);
  const doorAsk = $derived(!!R?.state.door);

  // ── 시트 ──
  let sheet = $state<'' | 'bubble' | 'set' | 'gift' | 'ask' | 'qr' | 'rest' | 'send' | 'words' | 'survey' | 'bossask'>(''), bossAsked = $state(false);
  // 🎯 복습으로 보내기 (📜 2026-11-16 · A): 남은 몬스터 · 👑 형성평가 → 허수아비 · 형성평가 복습 완료 n / 인원
  const leftS = $derived(R && !isLobby(R) && !isEnd(L, R) ? leftSteps(L, R, now) : []);
  const bossRevN = $derived.by(() => { void now; const all = S.get<Record<string, Record<string, { bossReview?: number; bossSent?: boolean } | null>>>(`records/${live.cls}`) || {}; const rows = Object.values(all).map((x) => x?.[L.id]).filter(Boolean); return { done: rows.filter((r) => r!.bossReview).length, sent: rows.filter((r) => r!.bossSent).length }; });
  function sendSome(keys: string[]) { if (!keys.length) return; sendToReview(S, code, keys); say(`🎯 ${keys.length}개 → 허수아비 복습`); if (keys.length >= leftS.length) sheet = ''; }
  // 🏕 쉼터 (#142 ①): 🏕 = 쉼터 켜고(지난 분) 놀이 고르기 시트 · 놀이 5칸 · ⭕ = 지난 · 오늘 · 분 −/＋ = 다음 쉼터 기본으로 기억 · 이 폰도 놀이 시계를 맡음(TV 가 없을 때)
  const stopDrive = untrack(() => driveFun(S, live.code, 'tp'));
  onDestroy(stopDrive);
  let game = $state<Game>('bal'), oxWhich = $state<'prev' | 'now'>('now'), rmin = $state(untrack(() => restMinDef(S)));
  const fun = $derived(funOf(R));
  const funOn = $derived(!!fun && fun.phase !== 'end');
  const tdf = $derived(fun && (fun.kind as string) === 'td' ? (fun as unknown as { g: number; phase: string; sh?: number; ch?: Record<string, number>; res?: { win: boolean } }) : null);
  const tdWave = $derived(tdf ? Number((R as unknown as { tdl?: Record<string, { wave?: number; life?: number }> }).tdl?.[tdf.g]?.wave) || 1 : 1);
  const funLine = $derived(tdf ? `🏰 디펜스 · ${tdf.phase === 'pick' ? '자리 고르는 중' : tdf.phase === 'play' ? `웨이브 ${tdWave}/5` : tdf.res?.win ? '🏆 승리' : '끝'}` : !fun ? '' : (fun.kind as string) === 'drg' ? `🐉 용이 잠든 사이 · ${fun.phase === 'intro' ? '안내' : fun.phase === 'end' ? '시상' : `${(fun as unknown as { round: number }).round}판`}` : fun.kind === 'nun' ? `🙊 눈치게임 · ${fun.phase === 'end' ? '끝' : `${(fun as unknown as { round: number }).round}판 · 생존 ${Object.keys(fun.alive || {}).length}명`}` : funStatus(norm(fun as Fun)));
  const gameOf = (k: Game) => GAMES.find((g) => g.k === k)!;
  function openRest() { if (!R) return; if (!R.state.rest) restOn(S, code, R, rmin); sheet = 'rest'; }
  function setMin(d: number) { if (!R) return; rmin = Math.max(1, Math.min(20, rmin + d)); restOn(S, code, R, rmin); }
  function goGame() {
    if (!R) return;
    if (funOn) { stopFun(S, code); return; }
    const err = startFun(S, code, R, game, { which: oxWhich, no: L.no, me: 'tp' });
    if (err) say(err); else sheet = '';
  }
  // 🚪 입장 (#138 ③): 코드 크게 + QR(주소 ?join=코드 · 로그인한 폰은 바로 · 아니면 로그인 뒤 그 수업) · 교실 TV 주소
  const site = siteUrl(); // 🔗 지금 열린 사이트 (🐞 QR 이 「…github.io./」 로 가던 것)
  const joinUrl = $derived(`${site}?join=${encodeURIComponent(code)}`);
  const spaced = (c: string) => c.replace(/^(\d{3})(\d{3})$/, '$1 $2');
  let bub = $state('');
  const QUICK = $derived([`${L.no}차시 던전에 온 걸 환영하네!`, '오늘 목표 = 보스 쓰러뜨리기!', '늦게 온 친구는 코드 보고 들어와']);
  // 💎 선물
  let amt = $state(10);
  let picked = $state<Record<string, boolean>>({});
  const pickN = $derived(Object.values(picked).filter(Boolean).length);
  const perfectIds = $derived(R && mid ? ids.filter((u) => (chain ? chainRecord(L, R, mid, u).perfect : plainRecord(L, R, mid, u).perfect)) : []);
  const quick = (xs: string[]) => { picked = Object.fromEntries(xs.map((u) => [u, true])); };
  function sendGift() { const us = Object.keys(picked).filter((u) => picked[u]); const all = ids.length > 0 && ids.every((u) => picked[u]); const n = giveGift(S, code, us, amt, all); sheet = ''; picked = {}; say(`🎁 ${n}명에게 💎 ${amt} 보냈어요`); }

  function main() {
    if (!R) return;
    if (scout?.on) { appearNow(S, L, code); return; }
    if (isEnd(L, R)) { sheet = 'ask'; return; }
    if (R.state.rest) endRest(S, code); // 🏕 쉼터 중 「다음 ▶」 = 쉼터 끝 + 수업으로
    if (nextStepObj?.kind === 'boss' && L.boss?.links?.length && bossLive(L, R).items <= 1 && !bossAsked) { sheet = 'bossask'; return; } // 👑 #27 ④ 남은 문항 ≤ 1 = 형성평가도 복습으로?
    nextStep(S, L, code);
  }
  const mainText = $derived(!R ? '' : isLobby(R) ? '▶ 수업 시작' : scout?.on ? '⚔ 지금 등장' : isEnd(L, R) ? '■ 수업 닫기' : nextStepObj ? `다음 ▶ ${short(nextStepObj)}` : '다음 ▶ 마무리');
  function plus5() { sfx('plus5', 0.8); const e = extendTime(S, code); say(e ? `⏰ ${e}` : '⏰ 5분 늘렸어요'); }
  const flex = (s: { s: { id: string } }) => Math.max(1, minOf(L, R, s.s as never));
</script>

{#if R}
  <div class="tbar">
    <button type="button" class="back" aria-label="수업 열기로" onclick={onhome}>‹</button>
    <div class="t">{live.cls === 'test' ? '🧪 테스트' : `${live.cls}반`} · {L.no}차시{live.test && live.cls !== 'test' ? ' · 🧪' : ''}<small>{isLobby(R) ? '대기실' : left != null ? `⏳ 남은 시간 ${mmss(left)}` : '시간 제한 없음'}</small></div>
    <span class="codek" aria-label="수업 코드 {code} · 종합실 키 {hallKeyOf(S, code)}"><b>코드 {code}</b><small>종합실 키 {hallKeyOf(S, code)}</small></span>
  </div>

  {#snippet queue()}
    <div class="q rq" data-k="rq">
          <button type="button" class="qm" data-k="qm" aria-label="도움 요청 {order.length}명 · 누르면 옛 판 {oldIds.length}명 새로 고침" onclick={reload}><b>🙋{order.length}</b></button>
          <div class="qs" data-k="qs">
            {#each order.slice(0, 3) as u, k (u)}<button type="button" class="qc" class:first={k === 0} class:slide={fresh[u]} data-u={u} aria-label="{k + 1}번째 · {nl(numOf(u))}번 {pname(u)} · 기다린 {waitOf(u)} · ⚔ 보급" onclick={() => release(u)}><b>{ordNo(u)} {nl(numOf(u))}<span>{givenName(pname(u))}</span></b><small data-k="qwait">{waitOf(u)}</small></button>{/each}
            {#each Array.from({ length: Math.max(0, 3 - order.length) }) as _, k (k)}<span class="qslot">{'①②③'[order.length + k]}</span>{/each}
            {#if order.length > 3}<span class="qmore" data-k="qmore">+{order.length - 3}</span>{/if}
          </div>
    </div>
  {/snippet}
  {#snippet att()}
    <div class="card att" aria-label="학생판" data-k="board" data-mid={curMid ?? ""}>
      <div class="hd"><span class="lab">👥 학생판{isLobby(R) ? ' · 대기실' : scouting ? ' · 정찰 중' : ''}</span>
        {#if isLobby(R)}<b class="cnt">{ids.length} <small>/ {expected.length}</small></b>
        {:else}<div class="vtg" role="group" aria-label="보기">{#each [['now', '지금'], ['today', '오늘'], ['stuck', '막힌 순']] as const as [k, t] (k)}<button type="button" class:on={view === k} aria-pressed={view === k} data-view={k} onclick={() => (view = k)}>{t}</button>{/each}</div>{/if}
      </div>
      {#if live.test}<div class="bots" data-k="bots" role="group" aria-label="가상 학생">
        <button type="button" class="bsw" class:on={bot.on && bot.code === code} aria-pressed={bot.on && bot.code === code} data-k="bot-sw" onclick={() => setBots(S, L, code, !(bot.on && bot.code === code), bot.n)}>🤖 가상 학생 <b>{bot.on && bot.code === code ? '켬' : '끔'}</b></button>
        <button type="button" class="bst" aria-label="한 명 줄이기" disabled={bot.n <= 1} onclick={() => (bot.on && bot.code === code ? setBots(S, L, code, true, bot.n - 1) : (bot.n = bot.n - 1))}>−</button>
        <b class="bn" data-k="bot-n">{bot.n}명</b>
        <button type="button" class="bst" aria-label="한 명 늘리기" disabled={bot.n >= BOT_MAX} onclick={() => (bot.on && bot.code === code ? setBots(S, L, code, true, bot.n + 1) : (bot.n = bot.n + 1))}>＋</button>
      </div>{/if}
      <div class="sums" data-k="sums" role="group" aria-label="반 숫자 · 누르면 그 학생 반짝">{#each sums as x (x.t)}<button type="button" class="sm {x.k}" data-sum={x.t} disabled={!x.us.length} onclick={() => blink(x.us)}>{x.t} <b>{x.us.length}</b></button>{/each}</div>
      {#if isLobby(R)}<div class="q">          <button type="button" class="qm lob" data-k="qm" aria-label="옛 판 {oldIds.length}명 · 누르면 새로 고침" onclick={reload}><b>⚠{oldIds.length}</b></button><span class="hint">⚠ 옛 판 학생 수 · 누르면 새로 고침<br />번호를 누르면 🔑 0000 · 결석</span>
      </div>{/if}
      {#if view === 'now' || isLobby(R)}
        <div class="nums c{bCols}" class:scr={bScroll} role="group" aria-label="학생 칸">
          {#each pupils as p (p.uid)}
            {@const st = stOf(p.uid)}{@const c = cells[p.uid]}{@const lf = lfOf(p)}{@const rdy = scouting && !!readyIds[p.uid]}{@const dots = c && !c.noSword ? swordDots(c) : null}
            <button type="button" class="n {st}" class:lost={st === 'no' && !!R.players?.[p.uid]} class:old={isOldU(p.uid)} class:sel={who === p.uid} class:zero={!!c?.zero} class:lf={lf > 0} class:rdy class:fl={!!flash[p.uid]} data-n={p.num} aria-label="{nl(p.num)}번 {p.name} · {st === 'in' ? '들어옴' : st === 'ok' ? '다 맞힘' : st === 'help' ? `도움 요청 ${order.indexOf(p.uid) + 1}번째` : st === 'idle' ? '멈춤' : st === 'ab' ? '결석' : lf ? `안 들어옴 · 로그인 실패 ${lf}번` : '안 옴'}{c && !c.noSword ? ` · 칼 ${c.left}` : ''}{c ? ` · 맞힘 ${c.got}/${c.of}` : ''}{rdy ? ' · 준비 완료' : ''}{isOldU(p.uid) ? ' · 옛 판' : ''}" onclick={() => tapNum(p.uid)}>
              <span class="nm"><b>{nl(p.num)}</b><s>{givenName(p.name)}</s></span>
              {#if dots}<span class="sw" aria-hidden="true">{#if feat('sword')}{#each Array.from({ length: dots.on }) as _, k (k)}<i></i>{/each}{#each Array.from({ length: dots.off }) as _, k (k)}<i class="u"></i>{/each}{#if dots.more}<small>+{dots.more}</small>{/if}{:else}<small>{c!.left}번</small>{/if}</span>{/if}
              {#if c}<span class="pg" aria-hidden="true"><i style:width="{Math.round(c.prog * 100)}%"></i></span>{/if}
              {#if st === 'help'}<em class="bd r">🙋{ordNo(p.uid)}</em>{:else if c?.zero}<em class="bd r">⚔0</em>{:else if lf}<em class="bd o">🔑{lf}</em>{:else if rdy}<em class="bd y">📝</em>{/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="tday" data-k="today" data-view={view}>
          <table><thead><tr><th>번</th>{#each tCols as x (x.id)}<th>{x.label}</th>{/each}<th>재도전</th></tr></thead>
            <tbody>{#each tRows as r (r.p.uid)}<tr><td class="tn"><button type="button" onclick={() => tapNum(r.p.uid)}>{nl(r.p.num)}</button></td>{#each r.marks as m, k (k)}<td class={m.t}>{m.text}</td>{/each}<td class="rt">{r.retry}</td></tr>{/each}</tbody></table>
        </div>
      {/if}
    </div>
  {/snippet}
  {#if isLobby(R)}
    <!-- ⑬ 대기실 -->
    <div class="mid lob">
      <button type="button" class="join row2" onclick={() => (sheet = 'qr')} aria-label="수업 코드 {code} · QR 보기"><span>🚪 코드</span><b>{spaced(code)}</b><em>📱 QR ›</em></button>
      {@render att()}
      <div class="card fl1">
        <div class="hd"><span class="lab">오늘 흐름 · 약 {mins}분 · <button type="button" class="setl" onclick={() => (sheet = 'set')}>설정 ›</button></span><span class="endt"><b>끝 {hhmm(endAt)}</b>{#if bell} <small>종 {hhmm(bell)}</small>{/if}</span></div>
        <div class="fbar">{#each G as g (g.from)}<i style:flex={g.min} style:background={COLOR[g.kind]}></i>{/each}</div>
      </div>
    </div>
    {#if ccSt}<p class="ccline" data-k="cc-stats">✔ 개념 체크 · 맞힘 <b>{ccSt.ok}</b> / {ids.length}{ccSt.n < ids.length ? ` (낸 ${ccSt.n})` : ''}{#if ccSt.wrong.length} · 많이 고른 오답 「{ccSt.wrong[0]!.label}」 {ccSt.wrong[0]!.n}명{/if}</p>{/if}
    <div class="tact"><button type="button" class="btn" disabled={!ids.length} onclick={main}>▶ 수업 시작<small>들어온 학생 {ids.length} / {expected.length}</small></button></div>
    <div class="lbar"><i class="live"></i><span>{live.test ? '🧪 테스트' : `${live.cls}반`} · {L.no}차시 · <b>대기실</b></span><button type="button" onclick={() => (sheet = 'ask')}>수업 닫기</button></div>
  {:else}
    <!-- ⑭ 리모컨 -->
    <div class="mid rem">
      <div class="rflow row2" aria-label="단계 {steps.findIndex((x) => x.k === i) + 1} / {steps.length}">
        <div class="rfbar">{#each steps as x (x.s.id)}<i class:ok={x.k < i} class:now={x.k === i} style:flex={flex(x)} style:--c={COLOR[kindOf(L, R, x.s)]} title={short(x.s)}></i>{/each}</div>
        <div class="rfcap"><span>{Math.max(0, steps.findIndex((x) => x.k === i)) + 1} / {steps.length}</span><b>{isEnd(L, R) ? '마무리' : `지금 · ${short(step)}`}</b><span>{nextStepObj ? `다음 · ${short(nextStepObj)} ›` : '다음 · 마무리'}</span></div>
      </div>
      {@render queue()}
      {@render att()}
      <div class="card rstat" data-k="now-cell">
        <div class="rs1"><span class="lab acc" data-k="now-lab">{isEnd(L, R) ? '마무리' : step?.kind === 'boss' && bossNote(L, R) ? `지금 · ${bossNote(L, R)}` : `지금 · ${short(step)}`}</span>
          {#if doorAsk}<span class="badge boss">👑 문 닫는 중</span>{:else if boss5 && left != null}<span class="badge boss">👑 <b>{mmss(left)}</b></span>{:else if scout?.on}<span class="badge sc">🌫 정찰</span>{:else if R.state.focus}<span class="badge fo">⏸ 집중</span>{:else if R.state.rest}<span class="badge fo">🏕 {funLine || '쉼터'}</span>{/if}
          <span class="unsub">{#if scout?.on}{''}{:else if mid || step?.kind === 'boss'}{unsub.length ? `미제출 ${unsub.length}명` : '미제출 없음'}{:else}{step?.kind === 'concept' ? '개념 설명 중' : ''}{/if}</span>
          {#if scout?.on}<span class="sub rdy" data-k="ready-n">📝 준비 완료 <b>{ids.filter((u) => readyIds[u]).length}</b> / {ids.length}</span>{:else}<span class="sub" data-k="sub-n"><b>{mid || step?.kind === 'boss' ? subd.length : ids.length}</b> / {ids.length} {mid || step?.kind === 'boss' ? '제출' : '접속'}</span>{/if}
        </div>
        <!-- 📌 「지금」 칸 = 높이 고정 · 이 자리에서만 내용 교체 (🧱 막힘 띠가 먼저 · 닫으면 원래 내용) -->
        {#if stuckNow && mid}
          <div class="adj stk"><button type="button" class="stuck" data-k="stuck" onclick={() => (stuckSeen = { ...stuckSeen, [`${mid}|${stuckNow.i}`]: true })}><b><SymText text={`🧱 ${(/문제 \d+/.exec(step?.title ?? '') || [short(step)])[0]} · ${circ(stuckNow.i)}칸 ${stuckNow.n}명 막힘`} /></b><span>전체 설명 권장 · 누르면 닫힘</span></button>{#if feat('review')}<button type="button" class="stuckg" data-k="stuck-gobi" onclick={() => mid && openGobi(S, code, mid)}>📊 고비</button>{/if}</div>
        {:else if isEnd(L, R)}
          {@const wn = Object.values(R.words || {}).filter((w) => w && w.t).length}
          <div class="adj endc"><button type="button" data-k="words-open" onclick={() => (sheet = 'words')}>💬 마지막 한마디 {wn}</button>{#if feat('survey')}<button type="button" data-k="sv-open" onclick={() => (sheet = 'survey')}>📝 설문{svSt ? ` · 열림 ${svSt.no}차시` : ''}</button>{/if}</div>
        {:else if scout?.on}
          <div class="adj" aria-label="정찰 시간 조정"><button type="button" aria-label="정찰 30초 줄이기" onclick={() => scoutAdd(S, L, code, -30)}>−30초</button>
            <div class="hpl"><div class="b sc"><i style:width="{Math.min(100, (scout.left / ((scout.end - scout.t0) || 1)) * 100)}%"></i></div><small>등장까지 <b>{Math.ceil(scout.left / 1000)}초</b></small></div>
            <button type="button" aria-label="정찰 30초 늘리기" onclick={() => scoutAdd(S, L, code, 30)}>+30초</button></div>
        {:else if step?.kind === 'concept' && talkOf(step.say ?? '')}
          <!-- 💬 말할 거리 (선생님 「A 말할 거리로 보이게」 2026-11-14): 개념 단계엔 체력 칸 대신 · 같은 높이 44px · 2줄 · 길면 「더 보기」 -->
          <div class="adj talk" aria-label="말할 거리"><p><b>💬</b> {talkOf(step.say ?? '')}</p><button type="button" onclick={() => (talkOpen = true)}>더 보기</button></div>
        {:else}
          <div class="adj" aria-label="체력 기준 조정"><button type="button" aria-label="체력 기준 5% 내리기" disabled={!hp} onclick={() => setPct(S, code, (R.meta.pct ?? L.defaultPct) - 5)}>−5%</button>
            <div class="hpl"><div class="b"><i style:width="{hp && hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div><small>{#if hp}체력 <b>{hp.left} / {hp.max}</b> · 기준 <b>{hp.pct}%</b>{:else}몬스터 없음 · 기준 <b>{R.meta.pct ?? L.defaultPct}%</b>{/if}</small></div>
            <button type="button" aria-label="체력 기준 5% 올리기" disabled={!hp} onclick={() => setPct(S, code, (R.meta.pct ?? L.defaultPct) + 5)}>+5%</button></div>
        {/if}
      </div>
    </div>
    <!-- 🧭 아래 막대 = 2줄 × 5칸 고정 자리표 (📜 2026-11-17 #24 ⑦): 못 쓸 때 흐림 · ⚙ 에서 끈 기능 = 점선 「꺼짐」 · 조건부로 사라지거나 끼어들지 않음 -->
    <div class="rdock" role="group" aria-label="도구" data-k="rdock">
      <button type="button" data-slot="focus" class:on={!!R.state.focus} aria-pressed={!!R.state.focus} onclick={() => setFocus(S, code, !R.state.focus)}><i>🔴</i>집중</button>
      <button type="button" data-slot="rest" class:on={!!R.state.rest} aria-pressed={!!R.state.rest} onclick={openRest}><i>🏕</i>쉼터</button>
      <button type="button" data-slot="video" class:on={!!R.state.video} disabled={!step || !L.videos?.[step.id]} aria-pressed={!!R.state.video} onclick={() => setVideo(S, code, R.state.video ? null : step?.id ?? null)}><i>🎬</i>영상</button>
      <button type="button" data-slot="sheet" class:on={!!R.state.sheet} disabled={!mid && step?.kind !== 'concept'} aria-pressed={!!R.state.sheet} onclick={() => setSheet(S, code, R.state.sheet ? null : step?.id ?? null)}><i>📄</i>문제</button>
      <button type="button" data-slot="t5" class="t5" class:glow={boss5 || doorAsk} disabled={!!R.state.extend || !R.state.deadline} onclick={plus5}><i>⏰</i>+5분</button>
      {#if feat('cc')}<button type="button" data-slot="cc" data-k="cc" class:on={ccIsOpen} aria-pressed={ccIsOpen} disabled={!(step?.kind === 'concept' && step.check)} onclick={() => (ccIsOpen ? closeCC(S, code, R) : openCC(S, code, step!.id))}><i>✔</i>{ccIsOpen ? `닫기 ${Math.ceil(((R.state.cc?.end ?? 0) - now) / 1000)}` : '체크'}</button>
      {:else}<button type="button" data-slot="cc" class="off" aria-disabled="true" onclick={() => say('⚙ 기능에서 켜요 (✔ 개념 체크)')}><i>✔</i>꺼짐</button>{/if}
      {#if feat('review')}<button type="button" data-slot="review" data-k="review" class:on={!!rv.cur} aria-pressed={!!rv.cur} disabled={!rv.show} onclick={nextReview}><i>{rv.gobi ? '📊' : '🔎'}</i>{rv.show ? rv.label : '풀이'}</button>
      {:else}<button type="button" data-slot="review" class="off" aria-disabled="true" onclick={() => say('⚙ 기능에서 켜요 (🔎 익명 풀이)')}><i>🔎</i>꺼짐</button>{/if}
      <button type="button" data-slot="send" data-k="send-open" disabled={!leftS.length} onclick={() => (sheet = 'send')}><i>🎯</i>복습으로</button>
      <button type="button" data-slot="gift" onclick={() => { picked = {}; sheet = 'gift'; }}><i>💎</i>선물</button>
      <button type="button" data-slot="heal" data-k="heal-first" class:hot={!!order.length} disabled={!order.length} aria-label={order.length ? `⚔ 보급 · 🙋① ${nl(numOf(order[0]!))}번 ${pname(order[0]!)}` : '⚔ 보급 · 도움 요청 없음'} onclick={() => order[0] && release(order[0])}><i>⚔</i>보급</button>
    </div>
    <div class="tact"><button type="button" class="btn2" aria-label="앞 단계" disabled={i <= 0} onclick={() => prevStep(S, L, code)}>◀</button><button type="button" class="btn" onclick={main}>{mainText}</button></div>
    <div class="lbar"><i class="live"></i><span>{live.test ? '🧪 테스트' : `${live.cls}반`} · {L.no}차시 · <b>수업 중</b>{left != null ? ` · ${mmss(left)}` : ''}</span><button type="button" onclick={() => (sheet = 'ask')}>수업 닫기</button></div>
  {/if}

  {#if undoU}<p class="toast utoast" role="status">✔ {numOf(undoU.u)} {pname(undoU.u)} ⚔ 보급했어요 (칼 +1)<button type="button" onclick={undo}>되돌리기</button></p>{/if}
  {#if talkOpen && step?.kind === 'concept'}
    <Sheet onclose={() => (talkOpen = false)} mainText="닫기">
      {#snippet title()}💬 말할 거리 · {short(step)}{/snippet}
      <p class="talkfull">{talkOf(step.say ?? '')}</p>
    </Sheet>
  {/if}
  {#if whoP}
    {@const st = stOf(whoP.uid)}{@const away = !R.players?.[whoP.uid] && st !== 'ab'}{@const lf = lfOf(whoP)}{@const c = curMid && !isLobby(R) ? cellOf(L, R, curMid, whoP.uid) : null}{@const day = todayRow(L, R, whoP.uid, tCols)}
    <Sheet onclose={() => (who = '')} mainText="닫기">
      {#snippet title()}{whoP.num} {whoP.name} {#if st === 'help'}<span class="chip r">🙋 도움 요청 {ordNo(whoP.uid)}</span>{:else if st === 'ok'}<span class="chip g">✔ 다 맞힘</span>{:else if away}<span class="chip o">{lf ? `🔑 로그인 실패 ${lf}번 · ` : ''}아직 안 들어옴</span>{/if}{#if isOldU(whoP.uid)}<span class="chip y">⚠ 옛 판</span>{/if}{/snippet}
      {#if away}
        <!-- 🔑 안 들어온 학생 = 맨 위 큰 단추 · 확인 한 번 (📜 #24 ⑥ · 11/16 핫픽스 그대로 = 접속 안 해도 됨) -->
        {#if pwDone}<p class="pwok" data-k="pw-done">✅ 0000 으로 바꿨어요 — 학생에게 0000 으로 들어오라고 말해 주세요</p>
        {:else if pwAsk}<button type="button" class="pwbig y" data-k="pwgo" onclick={() => { resetPw(S, live.cls, whoP.num); pwAsk = false; pwDone = true; }}>🔑 한 번 더 누르면 0000 으로 바꿔요</button>
        {:else}<button type="button" class="pwbig" data-k="pw0" disabled={!hasAccount(S, live.cls, whoP.num)} onclick={() => (pwAsk = true)}>{hasAccount(S, live.cls, whoP.num) ? '🔑 비밀번호 0000 으로' : '🔑 아직 가입 전 (바꿀 비밀번호 없음)'}</button>{/if}
      {/if}
      <div class="wst" data-k="who">
        <div>⚔ 칼<b>{c && !c.noSword ? `${c.left} / ${c.slots} 남음${c.zero ? ' · ⚔0' : ''}` : '—'}</b></div>
        <div>{curMid && !isLobby(R) ? short(step) : '지금'}<b>{c ? `틀림 ${c.wrong} · 맞힘 ${c.got}/${c.of}` : isLobby(R) ? '대기실' : '—'}</b></div>
        <div>오늘 재도전<b data-k="who-retry">{day.retry}번</b></div>
        <div>오늘 몬스터<b>✔ {day.okN} · 진행 {day.partN}</b></div>
      </div>
      <div class="wacts">
        <button type="button" class="p" disabled={st !== 'help'} onclick={() => { release(whoP.uid); who = ''; }}>⚔ 보급 (칼 +1)</button>
        {#if feat('stamp')}<button type="button" class="st" data-k="stamp" disabled={stamped(R, whoP.uid)} onclick={() => { if (giveStamp(S, code, whoP.uid)) say(`✅ ${whoP.num} ${whoP.name} 도장 · 📜 +1`); }}>{stamped(R, whoP.uid) ? '✅ 이미 도장' : '✅ 도장 (📜 +1)'}</button>{/if}
        <button type="button" disabled={!inSet.has(whoP.uid)} onclick={() => { sendReload(S, code, [whoP.uid]); say(`🔄 ${whoP.num} ${whoP.name} 새로 고침`); who = ''; }}>🔄 새로 고침</button>
        <button type="button" onclick={() => { setAbsent(S, code, whoP.uid, st !== 'ab'); who = ''; }}>{st === 'ab' ? '결석 풀기' : '결석 표시'}</button>
        {#if !away}<button type="button" class="k" data-k="pw0" disabled={!hasAccount(S, live.cls, whoP.num) || pwDone} onclick={() => (pwAsk = true)}>{pwDone ? '✅ 0000 으로 바꿨어요' : '🔑 비밀번호 0000'}</button>{/if}
      </div>
      {#if pwAsk && !away}<div class="conf" data-k="pwask"><span><b>{whoP.num} {whoP.name}</b> 비밀번호를 0000 으로 바꿀까요? 다음 로그인 때 0000 으로 들어와요.</span><div><button type="button" onclick={() => (pwAsk = false)}>취소</button><button type="button" class="y" data-k="pwgo" onclick={() => { resetPw(S, live.cls, whoP.num); pwAsk = false; pwDone = true; }}>0000 으로 바꾸기</button></div></div>{/if}
      {#if pwDone && !away}<p class="pwok">학생에게 0000 으로 들어오라고 말해 주세요</p>{/if}
    </Sheet>
  {/if}
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  {#if wakeTip.text}<p class="wtip" role="status" data-k="wake-tip">{wakeTip.text}<button type="button" aria-label="닫기" onclick={() => (wakeTip.text = '')}>✕</button></p>{/if}

  {#if sheet === 'bubble'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}💬 TV 대기실 선생님 말{/snippet}
      {#snippet act()}<button type="button" class="btn" disabled={!bub.trim()} onclick={() => { setBubble(S, code, bub.trim()); sheet = ''; }}>이 말로 바꾸기</button>{/snippet}
      <div class="qk">{#each QUICK as q (q)}<button type="button" class:on={bub === q} onclick={() => { setBubble(S, code, q); sheet = ''; }}>{q}</button>{/each}</div>
      <label class="own">직접 쓰기 <small>{bub.length} / 20</small><input maxlength="20" bind:value={bub} /></label>
    </Sheet>
  {:else if sheet === 'set'}
    <Sheet onclose={() => (sheet = '')} mainText="다 했어요">
      {#snippet title()}설정{/snippet}
      {#each [['체력 기준', `${R.meta.pct ?? L.defaultPct}%`, () => setPct(S, code, (R.meta.pct ?? L.defaultPct) - 5), () => setPct(S, code, (R.meta.pct ?? L.defaultPct) + 5)], ['정찰', `${R.meta.solve}초`, () => setSolveSec(S, code, R.meta.solve - 10), () => setSolveSec(S, code, R.meta.solve + 10)], ['생각', `${R.meta.think}초`, () => setThink(S, code, R.meta.think - 1), () => setThink(S, code, R.meta.think + 1)]] as const as [k, v, dn, up] (k)}
        <div class="stp"><span>{k}</span><button type="button" aria-label="{k} 줄이기" onclick={dn}>−</button><b>{v}</b><button type="button" aria-label="{k} 늘리기" onclick={up}>+</button></div>
      {/each}
    </Sheet>
  {:else if sheet === 'gift'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}💎 마정석 선물{/snippet}
      {#snippet act()}<button type="button" class="btn big" disabled={!pickN} onclick={sendGift}>{pickN ? `고른 ${pickN}명에게 💎 ${amt} 보내기` : '받을 학생을 골라요'}</button>{/snippet}
      <div class="gamt">{#each [5, 10, 20, 50] as a (a)}<button type="button" class:on={amt === a} onclick={() => (amt = a)}>{a}</button>{/each}<span class="gpm"><button type="button" aria-label="5 줄이기" onclick={() => (amt = Math.max(5, amt - 5))}>−5</button><b>💎 {amt}</b><button type="button" aria-label="5 늘리기" onclick={() => (amt = Math.min(100, amt + 5))}>+5</button></span></div>
      <div class="gquick"><button type="button" onclick={() => quick(ids)}>모두 {ids.length}</button><button type="button" disabled={!stuck.length} onclick={() => quick(stuck.map((x) => x.u))}>🔒 막힌 학생 {stuck.length}</button><button type="button" disabled={!perfectIds.length} onclick={() => quick(perfectIds)}>✨ 퍼펙트 {perfectIds.length}</button><button type="button" onclick={() => quick(subd.length ? subd : ids)}>미제출 빼고</button></div>
      <div class="ggrid">{#each ids as u (u)}<button type="button" class="gn" class:on={!!picked[u]} aria-pressed={!!picked[u]} onclick={() => (picked = { ...picked, [u]: !picked[u] })}><b>{numOf(u)}</b>{nameOf(u).split(' ')[1] ?? ''}</button>{/each}</div>
      <p class="gnote">하루 한도와 상관없이 바로 들어가요 · {pickN && pickN === ids.length ? 'TV 에 「🎁 선생님 선물! 모두」' : '받은 학생 폰에만 알림 (TV 없음)'}</p>
    </Sheet>
  {:else if sheet === 'send'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}🎯 복습으로 보내기{/snippet}
      {#snippet act()}<button type="button" class="btn big" data-k="send-all" disabled={!leftS.length} onclick={() => sendSome(leftS.map(sentKey))}>남은 {leftS.length}개 모두 보내기</button>{/snippet}
      <p class="gnote">못 다 푼 몬스터는 수업에서 건너뛰고, 학생마다 🎯 허수아비 「📚 수업에서 넘어온 문제」로 가요 · 수업을 닫으면 남은 것은 저절로 보내져요</p>
      <ul class="sendl" data-k="send-list">{#each leftS as s (s.id)}<li><span>{s.kind === 'boss' ? '👑 형성평가' : `🗡 ${short(s)}`}</span><button type="button" data-k="send-one" onclick={() => sendSome([sentKey(s)])}>보내기</button></li>{/each}</ul>
      {#if bossRevN.sent}<p class="gnote" data-k="boss-rev">👑 형성평가 복습 완료 {bossRevN.done} / {expected.length}</p>{/if}
    </Sheet>
  {:else if sheet === 'rest'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}🏕 놀이 고르기{/snippet}
      {#snippet act()}<div class="rsact"><div class="row"><button type="button" class="btn2" onclick={() => { endRest(S, code); sheet = ''; }}>쉼터 끝</button><button type="button" class="btn rbig" onclick={goGame}>{funOn ? `■ 놀이 그만 · ${funLine}` : `▶ ${gameOf(game).ic} ${gameOf(game).name}${game === 'quiz' ? (oxWhich === 'prev' ? ' · 지난' : ' · 오늘') : ''} 시작`}</button></div></div>{/snippet}
      {#if !(tdf && tdf.phase === 'play')}<div class="games" role="group" aria-label="놀이">
        {#each gamesOn() as g (g.k)}<button type="button" class="game" class:on={game === g.k} aria-pressed={game === g.k} disabled={funOn} onclick={() => (game = g.k)}><i>{g.ic}</i>{g.name}</button>{/each}
        {#if game === 'quiz'}<div class="oxw" role="group" aria-label="OX 문장"><button type="button" class:on={oxWhich === 'prev'} onclick={() => (oxWhich = 'prev')}>지난 차시</button><button type="button" class:on={oxWhich === 'now'} onclick={() => (oxWhich = 'now')}>오늘</button></div>{/if}
      </div>{/if}
      {#if fun && (fun.kind as string) === 'drg' && fun.phase !== 'end'}<div class="tdc"><button type="button" data-k="drg-next" onclick={() => drgNext(S, code)}>⏭ 다음 판<small>지금 단계를 바로 끝내요</small></button></div>{/if}
      {#if tdf && tdf.phase === 'play'}<div class="tdc"><button type="button" disabled={!!tdf.sh} onclick={() => { tdShield(S, code); say('🛡 수호 방패! 성에 닿는 몬스터 3마리를 막아요'); }}>🛡 수호 방패<small>{tdf.sh ? '썼어요' : '한 판 한 번'}</small></button><button type="button" disabled={!!tdf.ch?.[tdWave]} onclick={() => { tdCheer(S, code, tdWave); say('✨ 응원! 5초 동안 공격 속도 +20%'); }}>✨ 응원 마법<small>{tdf.ch?.[tdWave] ? '이번 웨이브 씀' : `웨이브 ${tdWave} · 한 번`}</small></button></div>{/if}
      <div class="rstep"><button type="button" aria-label="1분 줄이기" onclick={() => setMin(-1)}>−</button><b>{rmin}분<small>{R.state.rest ? `남은 ${mmss(Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - now))}` : ''}</small></b><button type="button" aria-label="1분 늘리기" onclick={() => setMin(1)}>＋</button></div>
    </Sheet>
  {:else if sheet === 'words'}
    <Sheet onclose={() => (sheet = '')} mainText="닫기">
      {#snippet title()}💬 마지막 한마디{/snippet}
          {@const ws = Object.entries(R.words || {}).filter(([, w]) => w && w.t).sort((a, b) => Number(!!b[1]!.bad) - Number(!!a[1]!.bad))}
          <div class="wlist" data-k="tl-words"><span class="wlh">💬 마지막 한마디 {ws.length}</span>{#each ws as [u, w] (u)}<div class="wl" class:bad={w!.bad} class:off={R.wordHide?.[u]}><b>{nameOf(u)}</b><span>{w!.t}</span><button type="button" onclick={() => hideWords(S, code, u, !R.wordHide?.[u])}>{R.wordHide?.[u] ? '보이기' : '숨김'}</button></div>{/each}</div>
    </Sheet>
  {:else if sheet === 'survey'}
    <Sheet onclose={() => (sheet = '')} mainText="닫기">
      {#snippet title()}📝 수업 설문{/snippet}
          <div class="adj svc" data-k="sv-ctl"><span>📝 설문 <small>({live.cls}반)</small></span>{#if svSt}<b>열림 · {svSt.no}차시</b><button type="button" onclick={() => { setOpen(S, live.cls, false, 0); say('📝 설문을 닫았어요'); }}>✕ 닫기</button>{:else}<label>차시 <input type="number" min="1" max="30" bind:value={svNo} /></label><button type="button" data-k="sv-open-cls" onclick={() => { const no = keepNo(svNo); svNo = no; if (confirm(`${live.cls}반 설문을 ${no}차시로 열까요? (학생 폰 캠프에 📝 단추)`)) { setOpen(S, live.cls, true, no); say(`📝 ${no}차시 설문을 열었어요`); } }}>열기</button>{/if}</div>
    </Sheet>
  {:else if sheet === 'bossask'}
    {@const lv = bossLive(L, R)}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}👑 형성평가도 복습으로 보낼까요?{/snippet}
      {#snippet act()}<div class="row"><button type="button" class="btn2" data-k="bossask-keep" onclick={() => { bossAsked = true; sheet = ''; nextStep(S, L, code); }}>그대로</button><button type="button" class="btn" data-k="bossask-send" onclick={() => { bossAsked = true; sendSome(['boss']); sheet = ''; }}>🎯 보내기</button></div>{/snippet}
      <p class="gnote" data-k="bossask">짝 몬스터를 복습으로 보내서 수업 형성평가가 {lv.items}문항만 남았어요 ({lv.drop.length}문항은 허수아비로) · 보내면 형성평가도 학생마다 🎯 허수아비 「⭐ 꼭 풀기」로 가요</p>
    </Sheet>
  {:else if sheet === 'qr'}
    <Sheet onclose={() => (sheet = '')} mainText="닫기">
      {#snippet title()}🚪 수업 입장{/snippet}
      <div class="qrbox"><QR text={joinUrl} size={220} /><b class="qcode">{spaced(code)}</b>
        <p>휴대폰 카메라로 QR → 로그인한 폰은 바로 대기실 · 처음이면 반 · 번호로 로그인 뒤 들어와요<br />QR 이 안 되면 캠프 「🚪 코드」에 위 6자리</p>
        <p class="tvu">🖥 교실 TV 주소 · <b>{site}?role=hall</b></p></div>
    </Sheet>
  {:else if sheet === 'ask'}
    <div class="askbg" role="presentation" onclick={() => (sheet = '')}></div>
    <div class="ask" role="alertdialog" aria-modal="true" aria-label="정말?">
      <b>정말 수업을 닫을까요?</b><p>{isLobby(R) ? '학생들은 캠프로 돌아가요' : isEnd(L, R) ? '오늘 차시를 다 했어요 · 학생들은 캠프로' : leftS.length ? `남은 ${leftS.length}개는 🎯 허수아비 복습으로 가요` : '지금 자리를 기억해요 · 다음 수업 「이어서」'}</p>
      <div class="row"><button type="button" class="btn2" onclick={() => (sheet = '')}>아니요</button><button type="button" class="btn" onclick={() => { endClass(S, L, code); sheet = ''; onclose(); }}>수업 닫기</button></div>
    </div>
  {/if}
{:else}
  <div class="empty"><b>🚪</b><span>수업 방을 찾지 못했어요</span>{#if (S as Store & { auth?: unknown; isAdmin?: () => boolean }).auth && !(S as Store & { isAdmin?: () => boolean }).isAdmin?.()}<small>교사 로그인이 안 되어 있어 서버가 방을 만들지 못했어요 · 「나」 탭 → 🔐 교사 로그인</small>{/if}<button type="button" class="chipbtn" onclick={onclose}>수업 열기로</button></div>
{/if}

<style>
  /* 📲 시안 v12 (2026-11-14 컨펌): 두 번째 칸 높이 36 · 번호 칸 = 대기실 · 수업 중 같은 자리 · 같은 크기 */
  .svc { display: flex; align-items: center; gap: var(--s2); font: 700 14px var(--font); }
  .svc > span { flex: 1; } .svc small { color: var(--text-3); font-weight: 500; } .svc b { color: var(--accent); }
  .svc label { display: flex; align-items: center; gap: 4px; color: var(--text-2); } .svc input { width: 52px; height: 36px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); text-align: center; }
  .row2 { flex: none; height: 36px; }
  .join { display: flex; align-items: center; gap: var(--s3); padding: 0 var(--s3); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface); color: var(--text); font: inherit; box-shadow: 0 3px 0 var(--press-sh); }
  .join span { font-size: 13px; font-weight: 700; color: var(--text-2); } .join b { flex: 1; text-align: left; font-size: 21px; letter-spacing: 2px; color: var(--accent); font-variant-numeric: tabular-nums; } .join em { font-style: normal; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .rflow { display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .rfbar { display: flex; gap: 2px; height: 12px; }
  .rfbar i { display: block; border-radius: 3px; background: var(--surface-2); border: 1px solid var(--line); }
  .rfbar i.ok { background: #2d5c45; border-color: #2d5c45; }
  .rfbar i.now { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 2px rgba(245, 184, 74, 0.3); }
  .rfcap { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s2); font-size: 12px; line-height: 1.2; color: var(--text-2); white-space: nowrap; }
  .rfcap b { color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
  .att { flex: none; padding: 10px 12px; gap: 6px; }
  .att .hd { min-height: 28px; }
  .bots { display: flex; align-items: center; gap: 6px; margin: 2px 0 8px; } .bsw { flex: 1; min-height: 44px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); text-align: left; padding: 0 12px; box-shadow: 0 3px 0 var(--surface); } .bsw b { float: right; color: var(--text-3); } .bsw.on { border-color: var(--accent); } .bsw.on b { color: var(--accent); } .bst { width: 44px; height: 44px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 18px var(--font); } .bst:disabled { opacity: 0.4; } .bn { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; }
  .cnt { font-size: 18px; font-variant-numeric: tabular-nums; } .cnt small { font-size: 12px; color: var(--text-2); }
  /* 👥 학생판 (📜 #24): 늘 4줄 · 칸 높이 46 · 한 줄 5~7칸 · 29명부터 판 안 세로 밀기 · 이름 = 글자 줄이기 먼저 → 그래도 좁으면 숨김(번호만) */
  .att { container-type: inline-size; }
  /* 📌 리모컨: 학생판 = 남는 높이 안에서 4줄(칸 38~46px) · 다른 칸은 높이 고정 → 단계가 바뀌어도 자리 그대로 · 아주 짧은 폰만 가운데 밀기 */
  .mid.rem { overflow-y: auto; overscroll-behavior: contain; }
  .mid.rem .att { flex: 1 0 auto; display: flex; flex-direction: column; }
  .mid.rem .nums:not(.scr) { flex: 1 1 0; min-height: calc(4 * 38px + 3 * 5px); max-height: calc(4 * 46px + 3 * 5px); height: auto; grid-template-rows: repeat(4, minmax(38px, 1fr)); }
  .mid.rem .nums:not(.scr) .n { height: auto; }
  .mid.rem .nums.scr { flex: 1 1 0; min-height: calc(4 * 38px); height: auto; }
  .mid.rem .tday { flex: 1 1 0; min-height: calc(4 * 38px); height: auto; }
  .nums { --ch: 46px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(4, var(--ch)); grid-auto-rows: var(--ch); gap: 5px; height: calc(4 * var(--ch) + 3 * 5px); padding-top: 6px; margin-top: -6px; }
  .nums.c6 { grid-template-columns: repeat(6, minmax(0, 1fr)); } .nums.c7 { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .nums.scr { overflow-y: auto; overscroll-behavior: contain; height: calc(4 * var(--ch) + 3 * 4px + 6px); }
  .n { position: relative; min-width: 0; height: var(--ch); border-radius: 8px; border: 1.5px dashed var(--line); background: none; color: var(--text-3); font: 700 14px var(--font); padding: 3px 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; line-height: 1.1; }
  .nm { display: flex; align-items: baseline; justify-content: center; gap: 2px; max-width: 100%; min-width: 0; white-space: nowrap; }
  .nm b { font-variant-numeric: tabular-nums; }
  .n s { text-decoration: none; font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: clip; min-width: 0; opacity: 0.9; }
  .nums.c6 .n s { font-size: 10px; } .nums.c7 .n s { font-size: 9.5px; letter-spacing: -0.4px; }
  @container (max-width: 330px) { .nums.c6 .n s { display: none; } }
  @container (max-width: 400px) { .nums.c7 .n s { display: none; } }
  @container (max-width: 270px) { .nums.c5 .n s { display: none; } }
  .sw { display: flex; gap: 2px; height: 7px; align-items: center; } .sw i { width: 7px; height: 7px; border-radius: 2px; background: #cfd6e6; } .sw i.u { background: #3a4157; } .sw small { font-size: 9px; line-height: 7px; color: var(--text-2); }
  .pg { width: 84%; height: 4px; border-radius: 2px; background: #3a4157; overflow: hidden; flex: none; } .pg i { display: block; height: 100%; background: var(--accent); }
  .n.ok .pg i { background: #7ee2a8; }
  .n.zero { outline: 2px dashed var(--bad); outline-offset: 1px; }
  .n.lf { border: 1.5px dashed #ffb24b; background: #2a2214; color: var(--text); }
  .n.rdy { border: 2px solid var(--accent); }
  .bd { position: absolute; left: -5px; top: -9px; z-index: 1; font: 900 10px/1.25 var(--font); font-style: normal; border-radius: 6px; padding: 0 3px; white-space: nowrap; }
  .bd.r { background: var(--bad); color: #fff; } .bd.o { background: #ffb24b; color: #2a1d00; } .bd.y { background: var(--accent); color: var(--on-accent); }
  .n.fl { box-shadow: 0 0 0 3px #fff; }
  @media (prefers-reduced-motion: no-preference) { .n.fl { animation: flb 0.4s ease-in-out 4; } }
  @keyframes flb { 50% { box-shadow: 0 0 0 3px rgba(255, 255, 255, 0); } }
  .vtg { margin-left: auto; display: flex; gap: 3px; } .vtg button { min-height: 28px; padding: 0 9px; border-radius: 99px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 12px var(--font); } .vtg button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .sums { display: flex; flex-wrap: nowrap; gap: 4px; overflow-x: auto; scrollbar-width: none; } .sums::-webkit-scrollbar { display: none; }
  .sm { flex: none; min-height: 28px; padding: 0 7px; border-radius: 8px; border: 0; background: var(--surface-2); color: var(--text); font: 700 12px var(--font); white-space: nowrap; } .sm b { font-variant-numeric: tabular-nums; }
  .sm.g { background: #1f4b31; color: #9ff0c6; } .sm.r { background: #3a1416; color: #ffb4b6; } .sm.y { background: #3a3210; color: #ffe28a; } .sm.o { background: #3a2a14; color: #ffd38a; } .sm:disabled { opacity: 0.45; }
  .tday { height: calc(4 * 46px + 3 * 5px); overflow: auto; overscroll-behavior: contain; }
  .tday table { width: 100%; border-collapse: separate; border-spacing: 2px; font: 700 12px var(--font); }
  .tday th { position: sticky; top: 0; background: var(--surface); color: var(--text-2); font-weight: 700; white-space: nowrap; padding: 2px; }
  .tday td { text-align: center; background: var(--surface-2); border-radius: 5px; padding: 3px 1px; } .tday td.ok { background: #1f4b31; color: #9ff0c6; } .tday td.part { background: #3a3210; color: #ffe28a; } .tday td.none { color: var(--text-3); } .tday td.rt { color: var(--text); }
  .tday .tn { background: none; padding: 0; } .tday .tn button { width: 100%; min-height: 26px; border: 0; border-radius: 5px; background: none; color: var(--text); font: 800 12.5px var(--font); }
  .n.in { border: 1.5px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .n.in.old { background: #3a2e10; }
  .n.idle { border: 2px solid #f2c94c; background: #3a3210; color: #fff; } .n.idle::after { content: '멈춤'; position: absolute; left: -6px; top: -10px; font-size: 10px; font-weight: 900; color: #1b1300; background: #f2c94c; border-radius: 6px; padding: 0 3px; }
  .n.ok { border: 1.5px solid #3fae6a; background: #1f4b31; color: #fff; }
  .n.ok::after { content: '✔'; position: absolute; left: -4px; top: -9px; font-size: 11px; color: #7ee2a8; font-weight: 900; }
  .n.old::before { content: '⚠'; position: absolute; right: -4px; top: -9px; font-size: 11px; color: var(--accent); }
  .n.lost { border: 1.5px solid var(--line); color: var(--text); } .n.lost::after { content: '📶✕'; position: absolute; right: -6px; top: -10px; font-size: 10px; line-height: 1; } /* 📶 들어왔다 끊긴 학생 = 흐리게 하지 않고 귀퉁이 표시만 (📜 2026-11-17) */
  .n.ab { border: 0; background: var(--surface-2); color: var(--text-3); } .n.ab b { text-decoration: line-through; }
  .n.ab::after { content: '결'; position: absolute; right: 3px; top: 2px; font-size: 9px; line-height: 1; color: var(--text-2); }
  .n.help { border: 2px solid var(--bad); background: #3a1416; color: #fff; transform-origin: 50% 100%; } .n.help.old { background: #3a2e10; }
  .n.sel { outline: 3px solid #fff; outline-offset: 1px; }
  @media (prefers-reduced-motion: no-preference) {
    .n.old { animation: beat 2.4s ease-in-out infinite; }
    .n.help { animation: wave 1.4s ease-in-out infinite; }
    .n.help.old { animation: wave 1.4s ease-in-out infinite, glowy 2.4s ease-in-out infinite; }
    .qc.slide { animation: slin 0.35s ease-out; }
  }
  @keyframes wave { 0%, 60%, 100% { transform: rotate(0); } 10% { transform: rotate(-6deg); } 20% { transform: rotate(5deg); } 30% { transform: rotate(-5deg); } 40% { transform: rotate(4deg); } 50% { transform: rotate(-2deg); } }
  @keyframes beat { 0%, 30%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(242, 182, 50, 0); } 8% { transform: scale(1.1); box-shadow: 0 0 10px 3px rgba(242, 182, 50, 0.75); } 16% { transform: scale(1); } 22% { transform: scale(1.06); box-shadow: 0 0 8px 2px rgba(242, 182, 50, 0.55); } }
  @keyframes glowy { 0%, 30%, 100% { box-shadow: 0 0 0 0 rgba(242, 182, 50, 0); } 8% { box-shadow: 0 0 10px 3px rgba(242, 182, 50, 0.75); } 22% { box-shadow: 0 0 8px 2px rgba(242, 182, 50, 0.55); } }
  @keyframes slin { from { transform: translateX(72px); opacity: 0.2; } to { transform: none; opacity: 1; } }
  .q { display: flex; gap: 6px; align-items: center; height: 40px; }
  .qm { flex: none; width: 58px; height: 40px; border-radius: 10px; border: 1px solid var(--bad); background: #3a1416; color: #fff; position: relative; padding: 0; font: 800 17px/1 var(--font); display: grid; place-items: center; overflow: hidden; }
  .qm::before { content: '↻'; position: absolute; inset: 0; display: grid; place-items: center; font: 700 40px/1 system-ui, sans-serif; color: #fff; opacity: 0.22; }
  .qm b { position: relative; } .qm.lob { border-color: var(--accent); background: #3a2e10; color: var(--accent); } .qm:active { transform: scale(0.95); }
  .hint { flex: 1; min-width: 0; font-size: 12px; color: var(--text-2); line-height: 1.3; }
  .qs { flex: 1; min-width: 0; display: flex; gap: 4px; overflow: hidden; }
  .qc { flex: 1 1 0; min-width: 0; height: 40px; border: 1px solid var(--bad); border-radius: 10px; background: #3a1416; color: #fff; font: 700 13px/1.1 var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; white-space: nowrap; padding: 0 2px; overflow: hidden; }
  .qc b { display: flex; gap: 3px; max-width: 100%; overflow: hidden; } .qc b span { font-weight: 600; overflow: hidden; text-overflow: ellipsis; } .qc small { font: 600 11px var(--font); color: #ffb4b6; font-variant-numeric: tabular-nums; }
  .qc.first { border: 3px solid var(--bad); background: #4a1619; }
  .qslot { flex: 1 1 0; min-width: 0; height: 40px; border-radius: 10px; border: 1px dashed var(--line); display: grid; place-items: center; color: var(--text-3); font-size: 12px; }
  .qmore { flex: none; align-self: center; min-width: 30px; text-align: center; font: 800 13px var(--font); color: #ffb4b6; }
  .fl1 { flex: none; padding: 10px 12px; gap: 6px; }
  .setl { border: 0; background: none; padding: 0; font: 700 13px var(--font); color: var(--text); }
  .rstat { flex: none; height: 74px; padding: 6px 10px; gap: 4px; display: grid; grid-template-rows: 20px 40px; overflow: hidden; } /* 📌 「지금」 칸 = 높이 고정 · 내용만 바뀜 (#24) */
  .rstat .adj { height: 40px; } .rstat .adj button { height: 40px; }
  .adj.stk, .adj.endc { display: flex; gap: 6px; }
  .adj.stk .stuck { flex: 1; min-width: 0; margin: 0; width: auto; height: 40px; padding: 2px 10px; justify-content: center; overflow: hidden; } .adj.stk .stuck b { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } .adj.stk .stuck span { font-size: 11px; }
  .adj.stk .stuckg { flex: none; margin: 0; min-height: 0; padding: 0 10px; font-size: 13px; }
  .adj.endc button { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rq { flex: none; }
  .rstat .sub b { font-size: 17px; } .rstat .sub.rdy { font-size: 14px; } .rstat .sub.rdy b { font-size: 18px; }
  .rs1 { display: flex; align-items: baseline; gap: 6px; height: 20px; line-height: 20px; overflow: hidden; white-space: nowrap; }
  .rs1 .lab { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; font-weight: 700; }
  .unsub { font-size: 13px; color: var(--text-2); }
  .sub { margin-left: auto; font-size: 13px; color: var(--text-2); } .sub b { font-size: 22px; font-weight: 800; color: var(--text); }
  .adj { display: grid; grid-template-columns: 56px minmax(0, 1fr) 56px; gap: 8px; align-items: center; height: 44px; }
  .adj.talk { grid-template-columns: minmax(0, 1fr) 64px; }
  .adj.talk p { margin: 0; font-size: 13px; line-height: 1.35; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .adj.talk p b { font-weight: 400; }
  .talkfull { margin: 0; font-size: 16px; line-height: 1.6; }
  .adj button { height: 44px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .adj button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .adj button:disabled { opacity: 0.35; box-shadow: none; }
  .sendl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; } .sendl li { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 52px; padding: 0 12px; border-radius: var(--r); background: var(--surface-2); font-weight: 700; } .sendl button { min-height: 44px; padding: 0 14px; border-radius: var(--r-sm); border: 1px solid var(--accent); background: transparent; color: var(--text); font: 700 14px var(--font); }
  .stuckg { min-height: 44px; margin: var(--s1) var(--s4) 0; padding: 0 14px; border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 800 15px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .stuck { margin: var(--s2) var(--s4) 0; width: calc(100% - 2 * var(--s4)); display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; border-radius: var(--r); border: 2px solid #f2994a; background: #3a2410; color: #fff; text-align: left; font: inherit; }
  .stuck b { font-size: 16px; } .stuck span { font-size: 13px; color: #ffd9b8; }
  .ccline { margin: var(--s2) var(--s4) 0; padding: 8px 12px; border-radius: var(--r); background: var(--surface-2); font-size: 15px; }
  .rdock { flex: none; padding: var(--s2) var(--s4) 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(2, 50px); gap: 5px; }
  .rdock button.off { border-style: dashed; background: none; color: var(--text-3); box-shadow: none; }
  .rdock button.hot { border: 2px solid var(--bad); }
  .rdock button { height: 50px; min-width: 0; white-space: nowrap; overflow: hidden; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); display: grid; place-items: center; align-content: center; gap: 1px; padding: 0; box-shadow: 0 3px 0 var(--press-sh); }
  .rdock button i { font-style: normal; font-size: 17px; line-height: 1; }
  .rdock button.on { border: 2px solid var(--accent); background: var(--surface-2); }
  .rdock button:disabled { opacity: 0.4; box-shadow: none; }
  .rdock button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .rdock .glow { border: 2px solid var(--accent); background: var(--surface-2); box-shadow: 0 0 0 3px rgba(245, 184, 74, 0.25); }
  @media (prefers-reduced-motion: no-preference) { .rdock .glow { animation: glow 1.6s ease-in-out infinite; } }
  .wtip { position: fixed; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 60px); z-index: 30; width: min(400px, calc(100% - 32px)); display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); color: var(--text); font: 500 14px var(--font); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); } .wtip button { margin-left: auto; min-width: 40px; min-height: 40px; border: 0; background: none; color: var(--text-2); font-size: 16px; }
  .utoast { display: flex; align-items: center; gap: 8px; } .utoast button { margin-left: auto; border: 0; background: none; color: #fff; text-decoration: underline; font: 600 13px var(--font); }
  .chip { font-size: 11.5px; border-radius: 99px; padding: 1px 7px; font-weight: 700; vertical-align: middle; } .chip.r { background: var(--bad); color: #fff; } .chip.y { background: var(--accent); color: var(--on-accent); } .chip.o { background: #ffb24b; color: #2a1d00; } .chip.g { background: #3fae6a; color: #06210f; }
  .wst { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .wst div { background: var(--surface-2); border-radius: 10px; padding: 8px; font-size: 12px; color: var(--text-2); } .wst b { display: block; color: var(--text); font-size: 15px; }
  .wacts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .wacts button { border: 1px solid var(--line); background: var(--surface-2); color: var(--text); border-radius: 14px; min-height: 52px; font: 700 14px var(--font); }
  .wacts button:disabled { opacity: 0.4; }
  .wacts .st { border-color: var(--ok); }
  .wacts .p { grid-column: 1 / -1; background: var(--accent); color: var(--on-accent); border: 0; min-height: 60px; font-size: 17px; box-shadow: 0 3px 0 var(--accent-sh); }
  .wacts .k { color: var(--accent); }
  .pwbig { width: 100%; min-height: 60px; margin-bottom: 8px; border: 2px solid var(--accent); border-radius: 14px; background: var(--surface-2); color: var(--accent); font: 800 17px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .pwbig.y { background: var(--accent); color: var(--on-accent); } .pwbig:disabled { opacity: 0.45; box-shadow: none; }
  .pwok { margin: 0 0 8px; padding: 10px 12px; border-radius: 12px; background: #1f4b31; color: #fff; font: 700 14.5px/1.4 var(--font); }
  .sub.rdy { color: var(--accent); font-weight: 700; } .sub.rdy b { color: var(--accent); }
  .conf { background: #3a2e10; border: 1px solid #6a5420; border-radius: 12px; padding: 10px; font-size: 13px; display: grid; gap: 8px; }
  .conf div { display: flex; gap: 8px; } .conf button { flex: 1; border: 0; border-radius: 10px; padding: 10px; font: 700 13.5px var(--font); background: var(--surface-2); color: var(--text); } .conf .y { background: var(--accent); color: var(--on-accent); }

  .qrbox { display: flex; flex-direction: column; align-items: center; gap: var(--s2); text-align: center; }
  .qcode { font-size: 34px; letter-spacing: 4px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .qrbox p { margin: 0; font-size: 14px; color: var(--text-2); line-height: 1.5; } .qrbox .tvu { font-size: 13px; word-break: break-all; } .qrbox .tvu b { color: var(--text); }
  .endt { font-size: 13px; } .endt b { color: var(--accent); } .endt small { color: var(--text-2); }
  .fbar { display: flex; gap: 2px; height: 10px; border-radius: 5px; overflow: hidden; }
  .fbar i { display: block; }
  .acc { color: var(--accent); }
  .badge { flex: none; white-space: nowrap; font-size: 12.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
  .badge.sc { background: #1d2a3d; color: #9fc8ff; }
  .badge.boss { background: #3a1717; color: #ffb4ae; }
  .badge.fo { background: var(--surface-2); color: var(--text); }
  .hpl { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .hpl .b { height: 10px; border-radius: 5px; background: var(--surface-2); overflow: hidden; }
  .hpl .b i { display: block; height: 10px; border-radius: 5px; background: var(--hp); transition: width 0.3s ease-out; }
  .hpl .b.sc i { background: #6aa3ff; }
  .hpl small { font-size: 12px; color: var(--text-2); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hpl b { color: var(--text); }
  @keyframes glow { 50% { box-shadow: 0 0 0 6px rgba(245, 184, 74, 0.35); } }
  .games { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .game { height: 84px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .game i { font-style: normal; font-size: 26px; line-height: 1.1; } .game small { font-size: 11px; color: var(--text-3); }
  .game.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh); } .game.on small { color: var(--on-accent); }
  .game:disabled:not(.on) { opacity: 0.4; box-shadow: none; }
  .oxw { height: 84px; display: flex; flex-direction: column; gap: 6px; }
  .oxw button { flex: 1; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); }
  .oxw button.on { border: 2px solid var(--accent); background: var(--surface-2); color: var(--accent); }
  .rstep { display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; gap: var(--s2); }
  .rstep button { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 24px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rstep b { text-align: center; font-size: 24px; display: flex; flex-direction: column; } .rstep b small { font-size: 12px; color: var(--text-2); font-weight: 500; }
  .tdc { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tdc button { height: 84px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 0 var(--press-sh); }
  .tdc button small { font-size: 11.5px; color: var(--text-2); font-weight: 500; } .tdc button:disabled { opacity: 0.45; box-shadow: none; }
  .rsact { padding-bottom: 59px; } /* 주요 단추 68 · 바닥 75 (리모컨 주요 단추와 같은 자리) */
  :global(.sheet .act .btn.rbig) { min-height: 68px; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qk { display: flex; flex-direction: column; gap: var(--s2); }
  .qk button { min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); text-align: left; padding: 0 var(--s3); }
  .qk button.on { border: 2px solid var(--accent); }
  .own { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-2); }
  .own small { float: right; }
  .own input { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 16px var(--font); padding: 0 var(--s3); }
  .stp { display: grid; grid-template-columns: 1fr 52px 80px 52px; align-items: center; gap: var(--s2); }
  .stp span { font-weight: 700; } .stp b { text-align: center; font-size: 18px; }
  .stp button { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 20px var(--font); }
  .gamt { display: flex; gap: 6px; align-items: center; }
  .gamt > button { height: 40px; min-width: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .gamt > button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .gpm { margin-left: auto; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  .gpm button { height: 40px; min-width: 40px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 13px var(--font); }
  .gquick { display: flex; flex-wrap: wrap; gap: 6px; }
  .gquick button { height: 36px; padding: 0 10px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 12.5px var(--font); }
  .gquick button:disabled { opacity: 0.4; }
  .ggrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; max-height: 172px; overflow: auto; }
  .gn { height: 38px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .gn.on { background: var(--gem); color: #05121f; border-color: var(--gem); }
  .gn b { font-size: 13px; opacity: 0.7; }
  .gnote { margin: 0; font-size: 12px; color: var(--text-3); }
  :global(.sheet .act .btn.big) { min-height: 68px; font-size: 19px; }
  .askbg { position: absolute; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.6); }
  .ask { position: absolute; left: var(--s4); right: var(--s4); top: 30%; z-index: 41; background: var(--surface); border-radius: var(--r-lg); padding: var(--s4); display: flex; flex-direction: column; gap: var(--s2); }
  .ask b { font-size: 18px; } .ask p { margin: 0; color: var(--text-2); font-size: 14px; }
  .ask .row { display: flex; gap: var(--s2); }
  .ask .btn { flex: 1; height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .ask .btn2 { width: 92px; height: 52px; border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .wlist { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; } .wlh { font-size: 13px; font-weight: 700; color: var(--text-2); } .wl { display: flex; align-items: center; gap: 8px; font-size: 14px; } .wl b { flex: none; } .wl span { flex: 1; min-width: 0; overflow-wrap: anywhere; } .wl.bad span { color: var(--bad); } .wl.off { opacity: 0.45; } .wl button { flex: none; min-height: 36px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 600 13px var(--font); }
</style>
