// 🤖 가상 학생 (📜 2026-11-14 선생님 「진행」 · DECISIONS 「🤖 베타 n차시 테스트 해 보기 = 가상 학생 넣기」)
//   정식 체험판 「👩‍🏫 선생님으로 체험」 가상 친구(js/raid/bots.js · release fff1568)를 그대로 옮김 — 같은 비율 · 같은 순서:
//   입장(대기실 · 늦게 오면 바로 함께) → 정찰 ✋ 준비 → 몬스터 답(첫 시도 80% + 재도전마다 +12% · 재도전 85% · 다 맞히면 ⚡ 절반쯤 힐)
//   → 소레이드 단계마다 70% → ❤ 0 = 🙋 잠김(선생님 「✔ 풀어주기」 기다림) → 형성평가(첫 시도 80% · 틀린 문항은 숫자 바뀐 재도전에서 맞힘) → 쉼터 놀이(⚖ 🔄 ⭕ · 🙊)
//   실제 학생과 똑같은 경로(rooms/{code}/…)에 씀 → 교사 폰 · TV 는 진짜 수업과 똑같이 움직임 · 집중 모드면 손을 멈춤
//   기록: 수업 끝 기록(records/{반}/{번호})은 학생 폰만 씀 → 가상 학생은 랭킹 · 대시보드 · 서버 학생 기록에 남지 않음 · players/{uid}/bot = true · 이름 앞 🤖
import type { Given, LessonPack, Question, Room, Store } from '../model/types';
import { bossItem, bossRecord, BOSS_ID, chainRecord, focusOn, isChain, isEnd, isLobby, plainRecord, restOn, solveLock, stepOf, V4, activeIds, healsReceived, itemsFor } from './raid';
import { bossSubmit, bossSubmitAll, chainSubmit, heartbeat, roomPath, scoutReady, spendEnergy, submit } from './actions';

export const BOT_MAX = 28, BOT_DEF = 20;
export const NICK = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '서아', '하준', '지안', '은우', '수아', '건우', '윤서', '선우', '채원', '유준', '다은', '이안', '소율', '태윤', '예린', '로운', '하린', '지호', '아린', '준서', '서윤', '현우'];
export const botId = (i: number) => `bot${String(i + 1).padStart(2, '0')}`;
export const isBot = (uid: string, R?: Room | null) => uid.startsWith('bot') && (!R || !!(R.players?.[uid] as { bot?: boolean } | undefined)?.bot);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 문제 → 정답(또는 일부러 틀린 답) — 정식 DS.Bots.given 그대로 */
export function given(q: Question, right: boolean): Given {
  switch (q.type) {
    case 'blanks': { const g = q.items.map((i) => i.answer); if (!right) g[0] = q.options.find((o) => o !== g[0]) ?? '?'; return g; }
    case 'ox': return right ? q.answer : !q.answer;
    case 'number': return right ? q.answer : q.answer + 1;
    case 'text': return right ? q.answers[0] ?? '' : '모름';
    case 'multi': return right ? q.answer.slice() : q.answer.slice(1).concat(q.options.findIndex((_, i) => !q.answer.includes(i)));
    case 'subsets': { const n = q.base.length, all: number[][] = []; for (let m = 0; m < 1 << n; m++) all.push(q.base.filter((_, k) => m & (1 << k))); return (right ? all : all.slice(1)) as unknown as Given; }
    default: return right ? q.answerIndex : (q.answerIndex + 1) % q.choices.length;
  }
}

export interface Bots { stop(): void; ids: string[] }
/** 가상 학생 n명 시작 (교사 폰 = 이 탭이 살아 있는 동안) · 끄면 stop() = 손을 멈추고 방에서 나감 */
export function startBots(S: Store, L: LessonPack, code: string, n: number, opt: { speed?: number; acc?: number; accBoss?: number } = {}): Bots {
  const N = Math.max(1, Math.min(BOT_MAX, Math.round(n))), speed = opt.speed || 1, acc = opt.acc ?? 0.8, accBoss = opt.accBoss ?? 0.8;
  const P = (s: string) => `${roomPath(code)}/${s}`, ids = Array.from({ length: N }, (_, i) => botId(i));
  const done = new Set<string>(), timers = new Set<ReturnType<typeof setTimeout>>();
  let R: Room | null = null, live = true, held: (() => void)[] = [];
  const getR = () => S.get<Room>(roomPath(code));
  const frozen = () => !!(R && focusOn(R) && !isLobby(R) && !restOn(R));
  const later = (key: string, ms: number, fn: () => void) => {
    if (done.has(key)) return; done.add(key);
    const go = () => { if (!live) return; R = getR() ?? R; if (frozen()) { held.push(go); return; } fn(); };
    const t = setTimeout(() => { timers.delete(t); go(); }, ms / speed); timers.add(t);
  };
  const thaw = () => { if (frozen() || !held.length) return; const h = held; held = []; h.forEach((go, i) => { const t = setTimeout(() => { timers.delete(t); go(); }, (600 + i * rand(250, 700)) / speed); timers.add(t); }); };
  const joined = new Set<string>();
  const beat = () => { // 살아 있음 신호 (PRESENCE_MS 8초 안) · 들어온 친구만
    if (!live) return; const cls = String(R?.meta.cls ?? '1-1');
    joined.forEach((u) => { const i = ids.indexOf(u); heartbeat(S, code, u, 100 + i + 1, `🤖${NICK[i % NICK.length]}`, { cls, hero: (i * 5) % 31, enh: (i * 3) % 11 }); });
  };
  const join = (u: string) => { const i = ids.indexOf(u); joined.add(u); S.set(P(`players/${u}/bot`), true); beat(); void i; };

  function fun(R0: Room) {
    const f = (R0 as { fun?: Record<string, unknown> }).fun as { kind?: string; phase?: string; to?: number; rk?: string; alive?: Record<string, true>; ans?: string | null; rps?: boolean; g?: number; round?: number } | undefined;
    if (!f) return; const now = S.now();
    if (f.kind === 'td') return; // 🏰 디펜스 = 베타 가상 학생은 안 함(자리 고르기 · 능력치 규칙이 따로)
    if (f.kind === 'nun') { if (f.phase !== 'play') return; ids.forEach((u) => { if (!f.alive?.[u]) return; later(`nun|${f.g}|${f.round}|${u}`, rand(900, 9000), () => S.set(P(`nun/${f.g}/${f.round}/${u}`), S.now())); }); return; }
    const left = (f.to || 0) - now; if (f.phase !== 'pick' || left < 800) return;
    ids.forEach((u) => {
      if (!f.alive?.[u]) return;
      later(`fv|${f.g}|${f.rk}|${u}`, rand(0.15, 0.75) * left * speed, () => {
        const v = f.rps ? 'abc'[Math.floor(Math.random() * 3)]! : f.ans ? (Math.random() < 0.7 ? f.ans : f.ans === 'a' ? 'b' : 'a') : Math.random() < 0.5 ? 'a' : 'b';
        S.set(P(`fv/${f.rk}/${u}`), v);
      });
    });
  }

  function step() {
    const R0 = getR(); if (!R0 || !live) return; R = R0;
    if (R0.state.closed) return;
    if (frozen()) return; thaw();
    if (restOn(R0) && !isLobby(R0)) { fun(R0); return; } // 쉼터: 공격은 쉬고 놀이만
    const st = stepOf(L, R0), now = S.now();
    ids.forEach((u, i) => {
      if (!joined.has(u)) later(`join|${u}`, isLobby(R0) ? (300 + i * rand(150, 450)) : rand(500, 3000), () => join(u)); // 💤 늦게 켜면 바로 함께
      if (!joined.has(u) || !R) return;
      const Rn = R;
      if (isEnd(L, Rn) || !st) return;
      // 🌫 정찰 = ✋ 준비 완료
      const lock = solveLock(L, Rn, now);
      if (lock?.on) { const sid = st.kind === 'boss' ? BOSS_ID : st.id; later(`ready|${sid}|${u}`, rand(2000, 12000), () => scoutReady(S, code, sid, u)); return; }
      if (st.kind === 'monster' && L.monsters[st.id] && isChain(L, Rn, st.id)) { // ⚔ 소레이드: 단계 하나씩 (70% 맞힘) · ❤ 0 = 잠김
        const rec = chainRecord(L, Rn, st.id, u);
        if (!rec.done && !rec.fail && !rec.locked) later(`ch|${st.id}|${u}|${rec.nextK}`, rand(3000, 9000), () => { const R1 = getR(); if (!R1) return; const r1 = chainRecord(L, R1, st.id, u); if (r1.nextK !== rec.nextK) return; const q = r1.items[r1.stage]; if (q) chainSubmit(S, L, code, st.id, u, r1.stage, 0, given(q, Math.random() < 0.7)); });
        return;
      }
      if (st.kind === 'monster' && L.monsters[st.id]) {
        const rec = plainRecord(L, Rn, st.id, u), a = rec.nextAttempt;
        // 💚 다 맞힌 가상 친구는 절반쯤 ⚡ 힐 (받을 친구 = 아직 못 다 맞힌 · 힐 상한 안)
        if (rec.canHeal && rec.perfect) {
          later(`heal?|${st.id}|${u}|${rec.spent ?? 0}`, rand(3000, 8000), () => {
            if (Math.random() >= 0.5) return; const R1 = getR(); if (!R1) return;
            const to = activeIds(R1, S.now()).find((x) => x !== u && !plainRecord(L, R1, st.id, x).perfect && healsReceived(R1, st.id, x, L) < R1.meta.healMax);
            spendEnergy(S, L, code, st.id, u, to ?? 'bind');
          });
        }
        const go = !rec.submitted || (rec.canRetry && (rec.perfect || Math.random() < 0.85));
        if (go && !rec.locked) later(`sub|${st.id}|${u}|${a}`, rand(a ? 4000 : 6000, a ? 9000 : 18000), () => {
          const R1 = getR(); if (!R1) return; const r1 = plainRecord(L, R1, st.id, u); if (r1.nextAttempt !== a) return;
          const items = r1.tries.length ? itemsOf(R1, st.id, u, a) : itemsOf(R1, st.id, u, 0);
          submit(S, L, code, st.id, u, items.map((q) => given(q, Math.random() < acc + a * 0.12)));
        });
        return;
      }
      if (st.kind === 'boss' && L.boss) {
        if (V4(Rn)) { // 👑 v4 한 번에 제출: 첫 판 = 문항마다 80% · 다음 판(틀린 문항 = 숫자 바뀜) = 맞힘
          const r = bossRecord(L, Rn, u); if (!r.canSubmit || !r.todo.length) return;
          later(`bossAll|${u}|${r.subs}`, rand(r.subs ? 8000 : 12000, r.subs ? 20000 : 30000), () => {
            const R1 = getR(); if (!R1) return; const r1 = bossRecord(L, R1, u); if (r1.subs !== r.subs || !r1.canSubmit) return;
            const g: Record<number, Given> = {}; for (const i of r1.todo) { const q = bossItem(L, R1, u, i, r1.next(i)); if (q) g[i] = given(q, r1.subs > 0 || Math.random() < accBoss); }
            bossSubmitAll(S, L, code, u, g);
          });
          return;
        }
        Array.from({ length: L.boss.items }, (_, k) => k).forEach((k) => { // v3 문항마다
          const ok0 = Math.random() < accBoss;
          later(`boss0|${u}|${k}`, rand(6000, 20000), () => { const R1 = getR(); if (!R1) return; const q = bossItem(L, R1, u, k, 0); if (q) bossSubmit(S, L, code, u, k, given(q, ok0)); });
          if (!ok0) later(`boss1|${u}|${k}`, rand(24000, 40000), () => { const R1 = getR(); if (!R1) return; const q = bossItem(L, R1, u, k, 1); if (q) bossSubmit(S, L, code, u, k, given(q, true)); });
        });
      }
    });
  }
  const itemsOf = (R1: Room, mid: string, u: string, a: number) => { try { return itemsFor(L, R1, mid, u, a); } catch { return [] as Question[]; } };
  const stopW = S.watch(roomPath(code), () => step());
  const hb = setInterval(() => { beat(); step(); }, 2500);
  step();
  return {
    ids,
    stop() {
      live = false; stopW(); clearInterval(hb); timers.forEach((t) => clearTimeout(t)); timers.clear(); held = [];
      joined.forEach((u) => S.set(P(`players/${u}`), null)); joined.clear(); // 끄면 지금처럼 실제 학생만
    },
  };
}
