// 정식과 같은 동작 확인 — tests/fixtures/parity-set06.json (정식 코드가 직접 만든 기준값 · tools/make-parity-fixture.cjs)
// 난수 · 문항(문제 1~3 · 보스) · 채점 · 기록(재도전 v3 · 받은 힐) · 보스 상태 · 정찰 · 공격 시계가 정식과 글자 · 숫자까지 같아야 한다
// 방 모양 차이: 정식은 R.active 로 접속을 셈 → 여기서는 「방금 소식이 온 학생」(players[u].seen = 지금)으로 같은 사람을 넣음
import { describe, expect, it } from 'vitest';
import type { Given, LessonPack, Question, Room } from '../src/model/types';
import pack from '../src/subjects/common-math2/lessons/set-06.json';
import fx from './fixtures/parity-set06.json';
import { makeRng } from '../src/engine/rng';
import { bossItem as packBossItem, items, relabel } from '../src/engine/lessons';
// 🔢 다른 점 하나 (🐞 2026-11-14): 같은 소문제 번호가 겹치면 「(3) ①」「(3) ②」 → 정식 기대값도 같은 정리를 거쳐 비교
const RL = (qs: { question: string }[]) => relabel(qs as unknown as Question[]) as unknown as typeof qs;
const norm = (t: string) => t.replace(/^(\(\d+\)) [①-⑨] /, '$1 ');
import { grade } from '../src/engine/grade';
import { atkClock, bossHp, bossState, chainDown, chainRecord, itemsFor, monsterHp, plainRecord, pracUsed, solveLock } from '../src/raid/raid';
import { chainItems as packChainItems } from '../src/engine/lessons';
import { chipToggle, runeNext } from '../src/engine/input';
import { CONCEPTS, pick, ROWS } from '../src/subjects/common-math2/symtalk';
import { AURA_NAMES, ENH, FAMS, HEROES, ladder, level, SKILL_NAMES, SKILL_PRICE, SKILL_SCROLL, TIER_NAMES } from '../src/model/hero';

const L = pack as LessonPack;
type AnyQ = Question & { options?: string[]; choices?: string[]; answer?: unknown; answerIndex?: number };
const pickQ = (q: AnyQ) => JSON.parse(JSON.stringify({ type: q.type, question: q.question, options: q.options, choices: q.choices, answer: q.answer, answerIndex: q.answerIndex, solution: q.solution, groups: (q as { groups?: unknown }).groups, empty: (q as { empty?: unknown }).empty, say: q.say, why: q.why, problem: q.problem }));
const meta = (code: string, solve = 60) => ({ code, lesson: 'set-06', version: 3, created: 0, retries: 3, healMax: 2, bossTries: 4, solve, think: 5, profile: 'class' as const });
const players = (now: number, n: number) => Object.fromEntries(Array.from({ length: n }, (_, k) => [`u${k + 1}`, { num: k + 1, nick: '', seen: now }]));

describe(`정식과 같음 (${fx.from})`, () => {
  it('난수', () => {
    for (const r of fx.rng) { const g = makeRng(r.seed); expect([g(), g(), g(), g(), g()]).toEqual(r.seq); }
  });

  it(`몬스터 문항 ${fx.items.length}판 (문제 1~7 × 시드 30 × 판 0~3)`, () => {
    for (const c of fx.items) expect(items(L, c.mid, c.seed, c.v).map((q) => pickQ(q as AnyQ)), `${c.mid} ${c.seed} 판 ${c.v}`).toEqual(RL(c.items));
  });

  it(`보스 문항 ${fx.boss.length}개 (방 30 × 문항 6 × 시도 0~3)`, () => {
    for (const c of fx.boss) expect(pickQ(packBossItem(L, `${c.code}|${c.uid}`, c.i, c.a) as AnyQ), `${c.code} ${c.i + 1}번 시도 ${c.a}`).toEqual(c.q);
  });

  it(`채점 ${fx.grade.length}건 (고르기 · 숫자 · 여러 개)`, () => {
    for (const c of fx.grade) {
      const pool = c.kind === 'boss' ? [packBossItem(L, `${c.seed}|u1`, (c as { i: number }).i, 1) as Question] : items(L, c.kind, c.seed, 1);
      const q = pool.find((x) => norm(x.question) === c.question);
      expect(q, c.question).toBeTruthy();
      expect(grade(q as Question, c.given as Given), `${c.question} ${JSON.stringify(c.given)}`).toBe(c.ok);
    }
  });

  it(`기록 ${fx.record.length}장면 (재도전 v3 · 받은 힐 · 다음 문제 · 체력)`, () => {
    for (const c of fx.record) {
      const R: Room = { meta: meta('PAR'), state: { step: 1, stepAt: 0 }, players: players(1000, 2), subs: { [c.mid]: { u1: c.subs as Record<string, Given[]> } },
        ...(c.heals ? { heals: { [c.mid]: c.heals as Record<string, Record<string, string>> } } : {}) };
      const rec = plainRecord(L, R, c.mid, 'u1');
      const got = { best: rec.best, total: rec.total, left: rec.left, slots: rec.slots, healed: rec.healed, perfect: rec.perfect, practice: rec.practice, fix: rec.fix, tokens: rec.tokens, tokLeft: rec.tokLeft, canRetry: rec.canRetry, canHeal: rec.canHeal };
      expect(got, `${c.mid} ${c.name}`).toEqual(c.rec);
      expect(itemsFor(L, R, c.mid, 'u1', rec.nextAttempt).map((q) => norm(q.question)), `${c.mid} ${c.name}: 다음 문제`).toEqual(c.nextQ);
      expect(monsterHp(L, R, c.mid, 1000), `${c.mid} ${c.name}: 체력`).toEqual(c.hp);
    }
  });

  it(`보스 기록 ${fx.bossRec.length}장면 (문항별 상태 · 체력)`, () => {
    for (const c of fx.bossRec) {
      const R: Room = { meta: meta('PB'), state: { step: 11, stepAt: 0 }, players: players(1000, 2), bossTry: { u1: c.bossTry as unknown as Record<string, Record<string, Given>> } };
      expect(bossState(L, R, 'u1'), c.name).toEqual(c.state);
      expect(bossHp(L, R, 1000), c.name).toEqual(c.hp);
    }
  });

  it(`정찰 · 공격 시계 ${fx.clock.length}장면`, () => {
    for (const c of fx.clock) {
      const step = L.steps[c.step];
      if (step?.later) continue; // 「다음 판에서」 자리(소레이드)는 v1 이 건너뜀 — 정식과 다른 점(보고에 적음)
      const raw = c as unknown as { step: number; now: number; sec?: number; solveEnd?: number; bossOk?: number };
      const R: Room = { meta: meta('PC', raw.sec ?? 60), state: { step: c.step, stepAt: 0 }, players: players(c.now, 1) };
      if (raw.solveEnd != null) R.state.solveEnd = { [step?.kind === 'boss' ? 'boss' : (step?.id as string)]: raw.solveEnd };
      if (raw.bossOk) {
        const t: Record<string, Record<string, Given>> = {};
        for (let i = 0; i < raw.bossOk; i++) { const q = packBossItem(L, 'PC|u1', i, 0) as AnyQ; t[i] = { 0: (q.type === 'multi' ? (q.answer as number[]).slice() : q.type === 'choice' ? q.answerIndex : q.answer) as Given }; }
        R.bossTry = { u1: t };
      }
      const sl = solveLock(L, R, c.now), ac = atkClock(L, R, c.now);
      const want = c as unknown as { solve: { id: string; sec: number; end: number; left: number; on: boolean } | null; atk: Record<string, unknown> | null };
      expect(sl ? { id: sl.id, sec: sl.sec, end: sl.end, left: sl.left, on: sl.on } : null, `정찰 ${JSON.stringify(c)}`).toEqual(want.solve);
      expect(ac ? { kind: ac.kind, mid: ac.mid, per: ac.per, lock: ac.lock, phase: ac.phase, paused: ac.paused, t: ac.t, k: ac.k, p: ac.p } : null, `시계 ${c.step} ${c.now}`).toEqual(want.atk);
    }
  });

  it(`소레이드 단계 문항 ${fx.chain.length}판 (문제 4~7 × 시드 20 × 판 0~2 · 나의 풀이 · 근거 줄 · 📜 원문 포함)`, () => {
    for (const c of fx.chain) expect(packChainItems(L, c.mid, c.seed, c.p).map((q) => pickQ(q as AnyQ)), `${c.mid} ${c.seed} 판 ${c.p}`).toEqual(c.items);
  });

  it(`소레이드 기록 ${fx.chainRec.length}장면 (잠김 · 풀어주기 · 못 맞힘 · 한 판 더 · 근거 빈칸 · 받은 힐 · 체력 · 졸개 쓰러짐)`, () => {
    for (const c of fx.chainRec) {
      const ex = (c.extra || {}) as { players?: Record<string, { num: number; pr?: Record<string, number> }>; chainOk?: Record<string, boolean>; heals?: Record<string, Record<string, string>> };
      const base = players(1000, 3);
      for (const [u, p] of Object.entries(ex.players || {})) base[u] = { ...base[u], ...p, nick: '', seen: 1000 };
      const R: Room = { meta: meta('CH'), state: { step: 7, stepAt: 0 }, players: base, chain: { [c.mid]: c.chain as unknown as NonNullable<Room['chain']>[string] },
        ...(ex.chainOk ? { chainOk: { [c.mid]: ex.chainOk } } : {}), ...(ex.heals ? { heals: { [c.mid]: ex.heals } } : {}) };
      const { items: _i, pItems: _p, ...rec } = chainRecord(L, R, c.mid, 'u1');
      expect(JSON.parse(JSON.stringify(rec)), `${c.mid} ${c.name}`).toEqual(c.rec);
      expect(monsterHp(L, R, c.mid, 1000), `${c.mid} ${c.name}: 체력`).toEqual(c.hp);
      expect(chainDown(L, R, c.mid, 1000), `${c.mid} ${c.name}: 졸개 쓰러짐`).toEqual(c.down);
      expect(pracUsed(R, c.mid, 'u1', rec), `${c.mid} ${c.name}: 한 판 더 수`).toBe(c.pracUsed);
    }
  });

  it('부분집합 모두 쓰기 채점 (정식 3차시 형성평가 4번)', () => {
    const sq = fx.subsets as { q: { question: string }; base: number[]; tries: { g: number[][]; ok: boolean }[] };
    const q: Question = { type: 'subsets', question: sq.q.question, base: sq.base };
    for (const t of sq.tries) expect(grade(q, t.g), JSON.stringify(t.g)).toBe(t.ok);
  });

  it(`룬 키패드 ${fx.rune.length}건 · 원소 칩 ∅ 단추 ${fx.chip.length}건`, () => {
    // (JSON 기준값은 −0 을 0 으로 적음 → === 로 비교)
    for (const c of fx.rune) { const v = runeNext(c.cur as number | string | null, c.key, { len: c.len }); expect(v === c.v, `len ${c.len} · ${c.cur} + ${c.key}: ${v} ≠ ${c.v}`).toBe(true); }
    for (const c of fx.chip) expect(chipToggle(fx.chipQ as unknown as Extract<Question, { type: 'multi' }>, c.g, c.n), `${c.g} + ${c.n}`).toEqual(c.v);
  });

  it(`기호 톡: 문구 ${fx.sym.rows.length}줄 · 6차시 문제 글 ${fx.sym.picks.length}개에서 기호 고르기`, () => {
    expect(ROWS).toEqual(fx.sym.rows);
    expect(CONCEPTS.map(({ id, sym, easy, def, memo }) => ({ id, sym, easy, def, memo }))).toEqual(fx.sym.concepts);
    // #108 ④ = 정식 #109 (형광펜 = 연산 기호만) — 정식 기준값 그대로
    for (const c of fx.sym.picks) expect([...c.t].map((_, i) => i).map((i) => [i, pick(c.t, i)]).filter(([, id]) => id), c.t).toEqual(c.hits);
  });

  it('캠프 정보판 값: 속성 갈래 · 검사 사다리 · 값 · 📜 · 강화 · 오라 · 레벨', () => {
    const h = fx.hero;
    expect(FAMS).toEqual(h.fams);
    expect(TIER_NAMES).toEqual(h.tierNames);
    expect(ladder(0)).toEqual(h.ladder0);
    expect(ladder(16)).toEqual(h.ladder16);
    for (const k of h.ladder0) { expect(SKILL_NAMES[k], k).toBe((h.names as Record<string, string>)[k]); expect(SKILL_PRICE[k] ?? null, k).toBe((h.price as Record<string, number | null>)[k]); expect(SKILL_SCROLL[k] ?? 0, k).toBe((h.scroll as Record<string, number>)[k]); }
    expect(ENH).toEqual(h.enh);
    expect(AURA_NAMES).toEqual(h.aura);
    for (const l of h.levels) expect(level(l.total)).toEqual(l);
  });

  it('내 용사 값 (b7): 모든 용사 사다리 · 모든 스킬 이름 · 💎 · 📜 · 용사 💎', () => {
    const h = fx.hero as unknown as { ladders: Record<string, string[]>; allFx: Record<string, [string, number | null, number]>; heroPrice: Record<string, number | null> };
    for (const id of HEROES.map((x) => x.id)) expect(ladder(id), `용사 ${id}`).toEqual(h.ladders[id]);
    for (const [k, [nm, g, s]] of Object.entries(h.allFx)) { expect(SKILL_NAMES[k], k).toBe(nm); expect(SKILL_PRICE[k] ?? null, k).toBe(g); expect(SKILL_SCROLL[k] ?? 0, k).toBe(s); }
    for (const x of HEROES) expect(x.price, `용사 ${x.id} 💎`).toBe(h.heroPrice[x.id] ?? null);
  });
});
