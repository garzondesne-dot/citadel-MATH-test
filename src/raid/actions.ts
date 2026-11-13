import type { DungeonProfile, Given, LessonPack, Room, Store } from '../model/types';
import { rulesOf } from '../model/profiles';
import { BOSS_ID, bossState, chainRecord, gameNow, held, isChain, isEnd, isLobby, nextIdx, plainRecord, PRAC_MAX, pracUsed, solveLock, stepIdx, stepOf, stopOf, healsGiven, healsReceived } from './raid';
import { bossRecord, perfStreak, petrify, stone, ultUsed, unlocksOf, V4 } from './raid';
import { periodEnd } from '../school/bells';
import { feat } from '../school/features.svelte';

// 방에서 하는 일 (쓰기) — 화면은 이 함수만 부르고, 그리는 쪽은 상태를 읽기만 한다
export const roomPath = (code: string) => `rooms/${code}`;
const getRoom = (S: Store, code: string) => S.get<Room>(roomPath(code));

/** 방 만들기 (다른 점 표 값을 meta 에 옮겨 적음) · 이미 같은 차시 · 같은 던전이면 그대로 */
export function openRoom(S: Store, L: LessonPack, code: string, P: DungeonProfile): Room {
  const R = getRoom(S, code);
  if (R && R.meta.lesson === L.id && R.meta.profile === P.key) return R;
  const fresh: Room = { meta: { code, lesson: L.id, version: 4, created: S.now(), ...rulesOf(P) }, state: { step: -1, stepAt: S.now() } };
  S.set(roomPath(code), fresh);
  return fresh;
}
/** 같은 던전으로 처음부터 */
export function resetRoom(S: Store, L: LessonPack, code: string, P: DungeonProfile): void {
  S.set(roomPath(code), null);
  openRoom(S, L, code, P);
}

/** 단계 옮기기 (리모컨 ◀ · 「다음 ▶」 · TV 「앞으로 ▶」 · 「« 뒤로」) — 새 단계 = 멈춘 합 0 · 집중 · 쉼터 중이면 지금부터 멈춤 · 문제 창 · 영상은 닫힘
 *  입장 → 첫 단계(수업 시작) 때 마감 시각을 잡음: 방에 limit 가 있으면 그 교시 끝(교시 밖이면 지금 + 50분) — 정식 go() · 📅 시간표 스위치 끔(기본) = 늘 지금 + 50분 */
function goTo(S: Store, L: LessonPack, code: string, R: Room, i: number): void {
  const t = S.now(), st = R.state;
  const dl = isLobby(R) && i >= 0 && R.meta.limit && !st.deadline ? ((feat('schedule') ? periodEnd(t) : null) ?? t + 50 * 60e3) : st.deadline ?? null;
  S.set(`${roomPath(code)}/state`, { ...st, step: i, stepAt: t, pauseMs: 0, holdAt: held(R) ? t : null, sheet: null, video: null, deadline: dl });
}
export function nextStep(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code);
  if (!R || isEnd(L, R)) return;
  // ⏯ 이어서 수업: 입장 → 저장된 단계부터 (정식 go() resumeFrom)
  goTo(S, L, code, R, isLobby(R) && R.meta.resumeFrom != null ? Math.max(0, Math.min(L.steps.length - 1, R.meta.resumeFrom)) : nextIdx(L, R));
}
/** ◀ 앞 단계 (「다음 판에서」 자리는 건너뜀 · 입장 화면까지는 안 돌아감) */
export function prevStep(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code);
  if (!R || isLobby(R)) return;
  let i = Math.min(stepIdx(R), L.steps.length) - 1;
  while (i > 0 && L.steps[i]?.later) i--;
  if (i < 0 || i === stepIdx(R)) return;
  goTo(S, L, code, R, i);
}
/** 멈춤(집중 · 쉼터)을 바꿀 때 시계 맞추기: 멈춤이 시작되면 holdAt · 풀리면 멈춘 시간을 pauseMs 에 더함 */
function setHold(S: Store, code: string, R: Room, patch: Partial<Room['state']>): void {
  const t = S.now(), st = R.state, before = held(R), next = { ...st, ...patch } as Room['state'];
  const after = !!next.focus || !!next.rest;
  if (!before && after) next.holdAt = t;
  if (before && !after) { next.pauseMs = Number(st.pauseMs || 0) + Math.max(0, t - Number(st.holdAt ?? t)); next.holdAt = null; }
  S.set(`${roomPath(code)}/state`, next);
}
/** ⏸ 집중 켜기 · 끄기 (#118): 게임 시계가 멈추고 끄면 멈춘 자리에서 이어감 · 수업 시계(남은 시간 · 문 닫기)는 그대로 */
export function setFocus(S: Store, code: string, on: boolean): void {
  const R = getRoom(S, code);
  if (!R || !!R.state.focus === on) return;
  setHold(S, code, R, { focus: on });
}
/** 🏕 쉼터 켜기 · 끄기 (정식 setRest · 기본 5분) — 쉬는 동안 게임 시계 멈춤 */
export function setRest(S: Store, code: string, on: boolean, min = 5): void {
  const R = getRoom(S, code);
  if (!R || !!R.state.rest === on) return;
  setHold(S, code, R, { rest: on ? { at: S.now(), min } : null });
}
/** 🎬 영상 · 📄 문제 창 (TV) — 단계 id 또는 끄기 */
export function setVideo(S: Store, code: string, id: string | null): void { S.set(`${roomPath(code)}/state/video`, id); }
export function setSheet(S: Store, code: string, id: string | null): void { S.set(`${roomPath(code)}/state/sheet`, id); }
/** 🏛 교실 TV 「⚔ 던전 입장」: 교사 캠프 → 던전 대기실 */
export function hallLobby(S: Store, code: string): void { S.set(`${roomPath(code)}/state/hall`, 'lobby'); }
/** 💬 TV 대기실 선생님 말풍선 (20자) */
export function setBubble(S: Store, code: string, text: string): void { S.set(`${roomPath(code)}/state/bubble`, text.slice(0, 20) || null); }
/** 체력 기준 % (리모컨 ±5% · 대기실 설정) · 10 ~ 100 */
export function setPct(S: Store, code: string, pct: number): void { S.set(`${roomPath(code)}/meta/pct`, Math.max(10, Math.min(100, Math.round(pct)))); }
/** 정찰 초 · 생각 초 (대기실 설정 · 다음 몬스터부터) */
export function setSolveSec(S: Store, code: string, sec: number): void { S.set(`${roomPath(code)}/meta/solve`, Math.max(0, Math.min(300, Math.round(sec)))); }
export function setThink(S: Store, code: string, sec: number): void { S.set(`${roomPath(code)}/meta/think`, Math.max(0, Math.min(30, Math.round(sec)))); }
/** 🌫 정찰 ±초 (정식 setSolve add): 늘리면 끝이 뒤로 · 남은 시간보다 많이 줄이면 바로 등장 */
export function scoutAdd(S: Store, L: LessonPack, code: string, sec: number): void {
  const R = getRoom(S, code), lk = R && solveLock(L, R, S.now());
  if (!R || !lk || !lk.on) return;
  if (sec < 0 && lk.left <= -sec * 1000) { appearNow(S, L, code); return; }
  S.set(`${roomPath(code)}/state/solveAdd/${lk.id}`, Number(R.state.solveAdd?.[lk.id] || 0) + sec * 1000);
}
/** ⏰ +5분 (정식 extendTime · 수업 하나에 한 번) — 문 닫기 장면에서 누르면 「선생님이 문을 밀어 열었다」 */
export function extendTime(S: Store, code: string): string | null {
  const R = getRoom(S, code);
  if (!R) return '방이 없어요';
  if (R.state.extend) return '연장은 한 번만 할 수 있어요';
  S.set(`${roomPath(code)}/state`, { ...R.state, extend: 5, ...(R.state.door ? { door: null, doorExt: S.now() } : {}) });
  return null;
}
/** 👑 문 닫기 장면 시작 (마감 순간 · 여러 기기가 불러도 한 번) · ask = +5분을 아직 안 썼으면 30초 묻기 */
export function doorStart(S: Store, code: string): void {
  const R = getRoom(S, code);
  if (!R || R.state.door || R.state.closed) return;
  S.set(`${roomPath(code)}/state/door`, { at: S.now(), ask: !R.state.extend });
}
/** 수업 닫기 (교사 폰 「수업 닫기」 · 문이 닫힘 · 시간 끝) — 그때 단계를 이어서 자리로 저장 (#119 덧붙임 2 · 「수업 끝」 단추 없음) */
export function endClass(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code);
  if (!R || R.state.closed) return;
  const stop = isLobby(R) && R.meta.resumeFrom != null ? { step: R.meta.resumeFrom, fresh: Object.keys(R.meta.fresh || {})[0] ?? null, done: false } : stopOf(L, R, S.now());
  S.set(`${roomPath(code)}/state`, { ...R.state, closed: true, focus: false, rest: null, holdAt: null, door: null, stop });
}
/** 대기실: 안 온 번호를 눌러 결석 (다시 누르면 풂) · 🔄 옛 판 학생에게 새로 고침 보내기 */
export function setAbsent(S: Store, code: string, uid: string, on: boolean): void { S.set(`${roomPath(code)}/absent/${uid}`, on ? true : null); }
export function sendReload(S: Store, code: string, uids: string[]): void { const t = S.now(); uids.forEach((u) => S.set(`${roomPath(code)}/state/reload/${u}`, t)); }
/** 💎 선생님 선물 (정식 Gem.gift · 하루 한도 밖 · 학생 캠프 「🎁 선생님 선물」): gifts/{uid}/{k} = { g, at, code }
 *  TV 연출 = 반 전체에게 줄 때만 「🎁 선생님 선물! 모두 💎 n」 (#119 덧붙임 · 몇 명만 = TV 에 아무것도 없음 · 받은 학생 폰에만) */
export function giveGift(S: Store, code: string, uids: string[], g: number, all = false): number {
  const t = S.now(), n = Math.max(0, Math.round(g));
  if (!n || !uids.length) return 0;
  const r = Math.random().toString(36).slice(2, 6);
  uids.forEach((u, i) => S.set(`gifts/${u}/${t}_${r}${i}`, { g: n, at: t, code }));
  if (all) S.set(`${roomPath(code)}/state/gift`, { at: t, n: uids.length, g: n });
  return uids.length;
}
/** 종합실 「⚔ 등장!」: 정찰을 일찍 끝냄 */
export function appearNow(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code), st = R && stepOf(L, R);
  if (!R || !st) return;
  const id = st.kind === 'boss' ? BOSS_ID : st.id;
  S.set(`${roomPath(code)}/state/solveEnd/${id}`, gameNow(R, S.now())); // 정찰 끝 = 게임 시각
}

/** 학생 탭 들어옴 · 살아 있음 알림 (몇 초마다) — 🔥 한 판 더 판 수(pr)는 지킴 */
export function heartbeat(S: Store, code: string, uid: string, num: number, nick: string, more?: { cls?: string; ver?: string; hero?: number; x?: boolean; fx?: string; enh?: number }): void {
  const base = `${roomPath(code)}/players/${uid}`;
  S.set(`${base}/num`, num); S.set(`${base}/nick`, nick); S.set(`${base}/seen`, S.now());
  if (more?.cls) S.set(`${base}/cls`, more.cls);
  if (more?.ver) S.set(`${base}/ver`, more.ver);
  if (more?.hero != null) S.set(`${base}/hero`, more.hero);
  if (more?.fx) S.set(`${base}/fx`, more.fx);
  if (more?.enh != null) S.set(`${base}/enh`, more.enh);
  if (more?.x != null) S.set(`${base}/x`, more.x || null);
}
export function leave(S: Store, code: string, uid: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, null);
}

/** 몬스터 답 내기: 기회가 남아 있을 때만 · 시도 번호 = 지금까지 낸 수 */
export function submit(S: Store, L: LessonPack, code: string, mid: string, uid: string, given: Given[]): boolean {
  const R = getRoom(S, code);
  if (!R) return false;
  if (isChain(L, R, mid)) return false; // 소레이드는 chainSubmit
  const rec = plainRecord(L, R, mid, uid);
  if (rec.submitted && !rec.canRetry) return false;
  S.set(`${roomPath(code)}/subs/${mid}/${uid}/${rec.nextAttempt}`, given);
  return true;
}
/** 👑 v4 형성평가 한 번에 제출 (bossRecord.todo 문항 모두 · 문항마다 새 시도 번호 = 틀린 문항 = 새 숫자) */
export function bossSubmitAll(S: Store, L: LessonPack, code: string, uid: string, given: Record<number, Given>): boolean {
  const R = getRoom(S, code); if (!R || !L.boss || !V4(R)) return false;
  const r = bossRecord(L, R, uid), bonusOnly = !r.canSubmit && r.bonusTodo.length > 0, list = bonusOnly ? r.bonusTodo : r.todo; if ((!r.canSubmit && !bonusOnly) || !list.length) return false;
  const k = r.subs, sub: Record<string, number> = {};
  for (const i of list) { const a = roundOpenNext(r, i); sub[i] = a; S.set(`${roomPath(code)}/bossTry/${uid}/${i}/${a}`, given[i] ?? ''); }
  S.set(`${roomPath(code)}/bossSub/${uid}/${k}`, sub);
  return true;
}
const roundOpenNext = (r: ReturnType<typeof bossRecord>, i: number) => r.next(i);
/** 보스 문항 i 답 내기: 아직 못 맞혔고 기회가 남았을 때만 */
export function bossSubmit(S: Store, L: LessonPack, code: string, uid: string, i: number, given: Given): boolean {
  const R = getRoom(S, code);
  if (!R || !L.boss) return false;
  const s = bossState(L, R, uid)[i];
  if (!s || s.ok || s.left <= 0) return false;
  S.set(`${roomPath(code)}/bossTry/${uid}/${i}/${s.next}`, given);
  return true;
}

// ── ⚔ 소레이드 (정식 actions.chainSubmit · pracStart · chainRelease) ──
/** 단계 답 한 줄 내기: s = 단계 · p = 판 · w = 1 이면 💡 근거 빈칸 답 · 막히면 이유 글을 돌려줌 */
export function chainSubmit(S: Store, L: LessonPack, code: string, mid: string, uid: string, s: number, p: number, g: Given, w?: 1): string | null {
  const R = getRoom(S, code);
  if (!R || !isChain(L, R, mid)) return '소레이드가 아니에요';
  const rec = chainRecord(L, R, mid, uid);
  if (V4(R) ? p > 0 && (!rec.roundOpen || p !== rec.spent) : p > PRAC_MAX) return V4(R) ? '⚡ 를 써야 🔥 재도전 판이 열려요' : `🔥 연습은 ${PRAC_MAX}번까지예요`;
  if (p && !w && rec.pass === p && rec.pFail) return '이번 연습 판은 기회를 다 썼어요';
  if (!p && (rec.locked || rec.fail || rec.done)) return rec.locked ? '🙋 선생님 확인을 기다려요' : '이 문제는 끝났어요';
  S.set(`${roomPath(code)}/chain/${mid}/${uid}/${rec.nextK}`, { s, p: p || 0, g: g == null ? '' : g, ...(w ? { w: 1 } : {}) });
  return null;
}
/** 🔥 한 판 더 시작 = 셈 (도중에 그만둬도) · PRAC_MAX 넘으면 막음 → 새 판 번호 (막히면 0) */
export function pracStart(S: Store, L: LessonPack, code: string, mid: string, uid: string): number {
  const R = getRoom(S, code);
  if (!R) return 0;
  const c = chainRecord(L, R, mid, uid);
  if (V4(R)) return c.roundOpen ? c.spent ?? 0 : 0; // v4: 판 번호 = 쓴 ⚡ 수 (⚡ 를 쓰면 바로 열림 · 그만둬도 「🔥 이어서」)
  const used = pracUsed(R, mid, uid, c);
  if (used >= PRAC_MAX) return 0;
  S.set(`${roomPath(code)}/players/${uid}/pr/${mid}`, used + 1);
  return used + 1;
}
/** 🙋 v4 「✔ 풀어주기」 (일반 몬스터 · 소레이드 · 형성평가 같이): ❤ 0 → ❤ +1 (+ 일반 몬스터 = 틀린 소문제 정답 펼침) · 누를 때마다 하나 */
export function heartRelease(S: Store, code: string, mid: string, uid: string): void {
  const R = getRoom(S, code); if (!R) return;
  S.set(`${roomPath(code)}/unlock/${mid}/${uid}`, unlocksOf(R, mid, uid) + 1);
}
/** 🙋 종합실 「✔ 풀어주기」: 기회 1칸 남은 학생의 잠김을 풂 */
export function chainRelease(S: Store, code: string, mid: string, uid: string): void {
  S.set(`${roomPath(code)}/chainOk/${mid}/${uid}`, true);
}

/** 🌫 정찰 「✋ 준비 완료」 (정식 scoutReady · ready/{id}/{uid}) — 종합실이 준비한 학생 수를 봄 */
export function scoutReady(S: Store, code: string, id: string, uid: string): void {
  S.set(`${roomPath(code)}/ready/${id}/${uid}`, true);
}

// ⚡ 기력 쓰기 (#152 · 정식 heals 칸 그대로): 💚 친구 힐 = heals/{몬스터}/{나}/{k} = 받는 친구 uid (그 친구 도전 칸 +1 · 상한 healMax)
//   ⛓ 묶기 = heals/{몬스터}/{나}/{k} = '!bind@시각' (몬스터 공격 3초 늦춤) · 둘 다 기력 하나 (healsGiven 으로 셈)
/** 🌟 진필살기 (정식 actions.js heal opt.true · 기력 카드 🌟 = ⚡1): 3연속 퍼펙트 + 내 속성 Ⅳ + 남은 기력 · 이 몬스터가 아직 안 굳었을 때 → '!true@시각' (파티 힐 + 🗿 석화 20초 · 반 전체 한 번) · 실패 = 이유 */
export function trueUlt(S: Store, L: LessonPack, code: string, mid: string, me: string, canTrue: boolean): string {
  const R = getRoom(S, code); if (!R) return '방이 없어요';
  const rec = isChain(L, R, mid) ? chainRecord(L, R, mid, me) : plainRecord(L, R, mid, me);
  if (V4(R) ? !(rec as { trueOk?: boolean }).trueOk || ultUsed(R, mid, me) : perfStreak(rec as { tries: { correct: number; total: number }[] }) < 3 || ultUsed(R, mid, me)) return V4(R) ? '첫 공격 퍼펙트 + 재도전 판 2개를 각각 한 번에 맞혔을 때 · 세 번째 ⚡ 에서만 쓸 수 있어요' : '3연속 퍼펙트일 때만 쓸 수 있어요';
  if (!canTrue) return '진필살기는 내 속성 Ⅳ 전설 스킬을 끼웠을 때만 쓸 수 있어요';
  if (petrify(R, mid)) return '이 몬스터는 이미 진필살기로 굳었어요 — 지금 맞히면 💎 가 나와요!';
  if (rec.tokLeft <= 0 || (V4(R) && !rec.canHeal)) return '⚡ 기력이 없어요';
  S.set(`${roomPath(code)}/heals/${mid}/${me}/${healsGiven(R, mid, me)}`, `!true@${S.now()}`);
  return '';
}
/** 🛡 홀리 방패 켜기 · 끄기 (정식 holyArm) · 막은 순간 = 내 칸에 막은 시각 + 켬 지움 (holyUse) */
export const holyArm = (S: Store, code: string, me: string, mid: string, on: boolean) => S.set(`${roomPath(code)}/players/${me}/hg`, on ? { mid: String(mid), at: S.now() } : null);
export function holyUse(S: Store, code: string, me: string, mid: string) { S.set(`${roomPath(code)}/players/${me}/holy/${mid}`, S.now()); S.set(`${roomPath(code)}/players/${me}/hg`, null); }
/** 🗿 석화 찬스 💎 (정식 petriGem · 석화 중 맞힌 데미지 · 한 번 석화에 3까지) = gifts/{uid}/petri… (캠프에서 지갑으로) */
export function petriGem(S: Store, code: string, me: string, at: number, mid: string, gain: number) {
  const k = `gifts/${me}/petri_${code}_${mid}_${at}`, had = Number(S.get<{ g?: number }>(k)?.g) || 0, tot = Math.min(3, had + gain);
  if (tot > had) S.set(k, { g: tot, at: S.now(), code, fun: '🗿 석화 찬스' });
  return tot - had;
}
/** 🗿 석화 중 맞힘 → 💎 (📜 2026-11-13 밤 선생님 확정 · 베타): 진짜 공격 · 🔥 한 판 더 · 연습 공격 모두 · 맞힌 소문제(단계) 하나 = 💎 1 · 석화 한 번에 학생당 합쳐 3까지 · 석화 밖 0 · 받은 수 돌려줌 */
export function petriAward(S: Store, code: string, me: string, mid: string, n: number): number {
  const R = getRoom(S, code); if (!R || n <= 0) return 0;
  const pt = stone(R, mid); if (!pt || S.now() >= pt.until) return 0;
  return petriGem(S, code, me, pt.at, mid, n);
}
export function spendEnergy(S: Store, L: LessonPack, code: string, mid: string, me: string, to: string | 'bind'): boolean {
  const R = getRoom(S, code); if (!R) return false;
  const rec = mid === BOSS_ID && V4(R) ? bossRecord(L, R, me) : isChain(L, R, mid) ? chainRecord(L, R, mid, me) : plainRecord(L, R, mid, me);
  if (rec.tokLeft <= 0 || (V4(R) && !rec.canHeal)) return false; // v4: 🔥 재도전 판을 다 맞혀야 다음 ⚡
  if (to !== 'bind' && (to === me || healsReceived(R, mid, to, L) >= R.meta.healMax)) return false;
  S.set(`${roomPath(code)}/heals/${mid}/${me}/${healsGiven(R, mid, me)}`, to === 'bind' ? `!bind@${S.now()}` : to);
  return true;
}
