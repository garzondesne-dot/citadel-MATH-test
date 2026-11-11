// 정식(Citadel-MATH)과 같은 동작인지 확인할 기준값 만들기
// 사용: node tools/make-parity-fixture.cjs <정식 저장소 경로>  → tests/fixtures/parity-set06.json
// 정식 코드를 그대로 불러(vm) 문항 · 채점 · 기록(재도전 v3 · 힐) · 보스 · 정찰 · 공격 시계를 적어 둔다
// 정식이 바뀌면 다시 만들고 차이를 본다. 방 모양은 시험 쪽(tests/parity.test.ts)과 같은 규칙으로 만든다
const fs = require('fs'), path = require('path');
const root = process.argv[2];
if (!root) { console.error('정식 저장소 경로를 주세요'); process.exit(1); }
const load = require(path.join(path.resolve(root), 'tests/load.js'));
const DS = load(['assets/manifest.js', 'js/engine/ui.js', 'js/engine/setgen.js', 'js/engine/quiz.js', 'js/engine/lessons.js', 'lessons/set-06.js', 'lessons/set-03.js', 'js/raid/model.js', 'js/raid/combo.js']);
const L = DS.Lessons.get('set-06'), RA = DS.Raid;
const head = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
const pickQ = (q) => JSON.parse(JSON.stringify({ type: q.type, question: q.question, options: q.options, choices: q.choices, answer: q.answer, answerIndex: q.answerIndex, solution: q.solution, groups: q.groups, empty: q.empty, say: q.say, why: q.why, problem: q.problem }));
const MIDS = ['m1', 'm2', 'm3'], UNITS = ['u4', 'u5', 'u6', 'u7'];

// ① 난수
const rng = ['ABCD|u1|m1|0', 's1', 'x'].map((seed) => { const r = DS.Rng(seed); return { seed, seq: [r(), r(), r(), r(), r()] }; });
// ② 몬스터 문항: 몬스터 3 × 시드 30 × 판 0~3
const itemsOut = [];
for (const mid of [...MIDS, ...UNITS]) for (let s = 0; s < 30; s++) for (let v = 0; v <= 3; v++) {
  const seed = `R${s}|u${s % 7}`;
  itemsOut.push({ mid, seed, v, items: L.items(mid, seed, v).map(pickQ) });
}
// ③ 보스 문항: 방 코드 30 × 문항 6 × 시도 0~3 (정식 Raid.bossItem)
const bossOut = [];
for (let s = 0; s < 30; s++) {
  const R = { meta: { code: `B${s}`, version: 3 } };
  for (let i = 0; i < 6; i++) for (let a = 0; a <= 3; a++) bossOut.push({ code: `B${s}`, uid: 'u1', i, a, q: pickQ(RA.bossItem(L, R, 'u1', i, a)) });
}
// ④ 채점: 여러 형식에 여러 답
const gradeOut = [];
const tryAns = (q) => q.type === 'multi' ? (() => { const a = q.answer, extra = q.options.map((_, i) => i).find((i) => !a.includes(i)); return [[], a.slice(), a.slice(1), extra == null ? a.slice() : [...a, extra], a.slice().reverse()]; })()
  : q.type === 'number' ? [q.answer, q.answer + 1, q.answer - 1, String(q.answer), null, 0] : [q.answerIndex, (q.answerIndex + 1) % q.choices.length, null];
for (let s = 0; s < 10; s++) {
  for (const mid of MIDS) for (const q of L.items(mid, `g${s}`, 1)) for (const given of tryAns(q)) gradeOut.push({ kind: mid, seed: `g${s}`, question: q.question, given, ok: DS.Quiz.grade(q, given) });
  const R = { meta: { code: `G${s}`, version: 3 } };
  for (let i = 0; i < 6; i++) { const q = RA.bossItem(L, R, 'u1', i, 1); for (const given of tryAns(q)) gradeOut.push({ kind: 'boss', seed: `G${s}`, i, question: q.question, given, ok: DS.Quiz.grade(q, given) }); }
}
// ⑤ 기록(재도전 v3 · 💚 받은 힐): 시도 줄 → 기록 · 다음 문제 · 체력 (학생 u1 · u2 · 둘 다 접속)
const meta = (code) => ({ code, lesson: 'set-06', version: 3, retries: 3, healMax: 2, bossTries: 4, solve: 60, think: 5, profile: 'class' });
const R0 = (mid, subs, heals) => ({ meta: meta('PAR'), state: { step: 1, stepAt: 0 }, players: { u1: { num: 1 }, u2: { num: 2 } }, active: { u1: true, u2: true }, subs: { [mid]: { u1: subs } }, ...(heals ? { heals: { [mid]: heals } } : {}) });
const recOut = [];
for (const mid of MIDS) {
  const right = (v) => L.items(mid, 'PAR|u1', v).map((q) => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.answer));
  const wrong = (v) => L.items(mid, 'PAR|u1', v).map((q) => (q.type === 'multi' ? [] : -999));
  const half = (v) => right(v).map((a, i) => (i % 2 ? wrong(v)[i] : a));
  const scen = {
    '틀림 → 틀림': [(s) => { s[0] = wrong(0); s[1] = wrong(0); }],
    '반 맞음 → 다 맞음': [(s) => { s[0] = half(0); s[1] = right(0); }],
    '다 맞음 → 새 문제 다 맞음': [(s) => { s[0] = right(0); s[1] = right(1); }],
    '다 맞음 → 새 문제 틀림': [(s) => { s[0] = right(0); s[1] = wrong(1); }],
    '다 맞음 → 새 문제 틀림 → 고쳐 맞음': [(s) => { s[0] = right(0); s[1] = wrong(1); s[2] = right(1); }],
    '4번 다 틀림': [(s) => { for (let k = 0; k < 4; k++) s[k] = wrong(0); }],
    '힐 1 받고 5번 틀림': [(s) => { for (let k = 0; k < 5; k++) s[k] = wrong(0); }, { u2: { 0: 'u1' } }],
    '힐 3 받음(상한 2)': [(s) => { for (let k = 0; k < 6; k++) s[k] = wrong(0); }, { u2: { 0: 'u1', 1: 'u1', 2: 'u1' } }],
  };
  for (const [name, [fill, heals]] of Object.entries(scen)) {
    const subs = {}; fill(subs); const R = R0(mid, subs, heals), rec = RA.record(L, R, mid, 'u1');
    recOut.push({ mid, name, subs, heals: heals || null,
      rec: { best: rec.best, total: rec.total, left: rec.left, slots: rec.slots, healed: rec.healed, perfect: rec.perfect, practice: rec.practice, fix: !!rec.fix, tokens: rec.tokens, tokLeft: rec.tokLeft, canRetry: rec.canRetry, canHeal: rec.canHeal },
      nextQ: RA.itemsFor(L, R, mid, 'u1', rec.nextAttempt).map((q) => q.question), hp: RA.monsterHp(L, R, mid) });
  }
}
// ⑥ 보스 기록: 문항별 시도 → bossState · bossHp
const bossRight = (code, uid, i, a) => { const q = RA.bossItem(L, { meta: { code, version: 3 } }, uid, i, a); return q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.answer; };
const bossWrong = (code, uid, i, a) => { const q = RA.bossItem(L, { meta: { code, version: 3 } }, uid, i, a); return q.type === 'multi' ? [] : q.type === 'choice' ? (q.answerIndex + 1) % q.choices.length : -999; };
const bscen = {
  '다 첫 시도에 맞음': (t) => { for (let i = 0; i < 6; i++) t[i] = { 0: bossRight('PB', 'u1', i, 0) }; },
  '1번 틀림 → 재도전 맞음 · 2번 4번 틀림': (t) => { t[0] = { 0: bossWrong('PB', 'u1', 0, 0), 1: bossRight('PB', 'u1', 0, 1) }; t[1] = { 0: bossWrong('PB', 'u1', 1, 0), 1: bossWrong('PB', 'u1', 1, 1), 2: bossWrong('PB', 'u1', 1, 2), 3: bossWrong('PB', 'u1', 1, 3) }; },
  '3번만 맞음': (t) => { t[2] = { 0: bossRight('PB', 'u1', 2, 0) }; },
};
const bossRec = Object.entries(bscen).map(([name, fill]) => {
  const t = {}; fill(t);
  const R = { meta: meta('PB'), state: { step: 11, stepAt: 0 }, players: { u1: { num: 1 }, u2: { num: 2 } }, active: { u1: true, u2: true }, bossTry: { u1: t } };
  return { name, bossTry: t, state: RA.bossState(L, R, 'u1'), hp: RA.bossHp(L, R) };
});
// ⑦ 정찰 · 공격 시계: (단계 · 시각 · 등장 · 보스 도달) → solveLock · atkClock (묶기 · 콤보 없음)
const clockOut = [];
const cases = [
  { step: 1, now: 30000 }, { step: 1, now: 60000 }, { step: 1, now: 95500 }, { step: 1, now: 200000 },
  { step: 1, now: 40000, solveEnd: 20000 }, { step: 0, now: 5000 },
  { step: 11, now: 61000 }, { step: 11, now: 130000 }, { step: 11, now: 130000, bossOk: 3 }, { step: 11, now: 130000, bossOk: 5 },
  { step: 3, now: 100000, sec: 5 }, { step: 7, now: 100000 },
];
for (const c of cases) {
  const t = {}; for (let i = 0; i < (c.bossOk || 0); i++) t[i] = { 0: bossRight('PC', 'u1', i, 0) };
  const R = { meta: { ...meta('PC'), solve: c.sec != null ? c.sec : 60 }, state: { step: c.step, stepAt: 0, ...(c.solveEnd != null ? { solveEnd: { [c.step === 11 ? 'boss' : L.steps[c.step].id]: c.solveEnd } } : {}) }, players: { u1: { num: 1 } }, active: { u1: true }, bossTry: { u1: t } };
  const sl = RA.solveLock(L, R, c.now), ac = RA.atkClock(L, R, c.now);
  clockOut.push({ ...c, solve: sl ? { id: sl.id, sec: sl.sec, end: sl.end, left: sl.left, on: sl.on } : null, atk: ac ? { kind: ac.kind, mid: ac.mid, per: ac.per, lock: ac.lock, phase: ac.phase, paused: ac.paused, t: ac.t, k: ac.k, p: ac.p } : null });
}
// ⑧ 소레이드 단계 문항: 문제 4~7 × 학생 시드 20 × 판 0~2 (정식 L.chainItems)
const chainOut = [];
for (const mid of UNITS) for (let s = 0; s < 20; s++) for (let p = 0; p <= 2; p++) { const seed = `C${s}|u${s % 5}`; chainOut.push({ mid, seed, p, items: L.chainItems(mid, seed, p).map(pickQ) }); }
// ⑨ 소레이드 기록: 단계 답 줄 → chainRecord · 체력 · 졸개 쓰러짐 (학생 u1 · u2 · u3)
const CR = (mid, chain, extra) => ({ meta: meta('CH'), state: { step: 7, stepAt: 0 }, players: { u1: { num: 1 }, u2: { num: 2 }, u3: { num: 3 }, ...(extra && extra.players) }, active: { u1: true, u2: true, u3: true }, chain: { [mid]: chain }, ...(extra && extra.chainOk ? { chainOk: { [mid]: extra.chainOk } } : {}), ...(extra && extra.heals ? { heals: { [mid]: extra.heals } } : {}) });
const rightG = (q) => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.answer);
const wrongG = (q) => (q.type === 'multi' ? [] : q.type === 'choice' ? (q.answerIndex + 1) % q.choices.length : q.answer + 1);
const chainRecOut = [];
for (const mid of UNITS) {
  const its = (u, p) => RA.chainItems(L, { meta: meta('CH') }, mid, u, p);
  const run = (u, plan) => { const out = {}; let k = 0; for (const [s, p, good, w] of plan) { const q = its(u, p)[s]; out[k++] = w ? { s, p, g: good ? q.why.answer : (q.why.answer + 1) % 3, w: 1 } : { s, p, g: good ? rightG(q) : wrongG(q) }; } return out; };
  const n = its('u1', 0).length, all = (p) => Array.from({ length: n }, (_, s) => [s, p, true]);
  const whyAt = (p) => its('u1', p).map((q, i) => (q.why ? i : -1)).filter((i) => i >= 0);
  const pracPlan = (p, wrongWhy) => { const out = []; for (let s = 0; s < n; s++) { out.push([s, p, true]); if (whyAt(p).includes(s)) { if (wrongWhy) out.push([s, p, false, 1]); out.push([s, p, true, 1]); } } return out; };
  const scen = {
    '퍼펙트': [{ u1: run('u1', all(0)) }],
    '졸개1 틀림 → 끝까지': [{ u1: run('u1', [[0, 0, false], ...all(0)]) }],
    '대장 틀림 1번': [{ u1: run('u1', [...all(0).slice(0, n - 1), [n - 1, 0, false], [n - 1, 0, true]]) }],
    '잠김(1칸 남음)': [{ u1: run('u1', [[0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false]]) }],
    '잠김 → 풀어주기 → 끝까지': [{ u1: run('u1', [[0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], ...all(0)]) }, { chainOk: { u1: true } }],
    '풀어주기 뒤 못 맞힘(fail)': [{ u1: run('u1', [...Array.from({ length: 6 }, () => [0, 0, false]), [0, 0, false], [0, 0, false]]) }, { chainOk: { u1: true } }],
    '퍼펙트 → 한 판 더(근거 틀렸다 맞힘)': [{ u1: run('u1', [...all(0), ...pracPlan(1, true)]) }, { players: { u1: { num: 1, pr: { [mid]: 1 } } } }],
    '한 판 더 기회 다 씀': [{ u1: run('u1', [...all(0), ...Array.from({ length: 8 }, () => [0, 1, false])]) }],
    '셋 진행(졸개 쓰러짐)': [{ u1: run('u1', all(0)), u2: run('u2', all(0).slice(0, 2)), u3: run('u3', [[0, 0, false]]) }],
    '받은 힐 1': [{ u1: run('u1', [[0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false], [0, 0, false]]) }, { heals: { u2: { 0: 'u1' } } }],
  };
  for (const [name, [chain, extra]] of Object.entries(scen)) {
    const R = CR(mid, chain, extra), rec = RA.record(L, R, mid, 'u1');
    const pick = (({ items, pItems, ...rest }) => rest)(rec);
    chainRecOut.push({ mid, name, chain, extra: extra || null, rec: JSON.parse(JSON.stringify(pick)), hp: RA.monsterHp(L, R, mid), down: RA.chainDown(L, R, mid), pracUsed: RA.pracUsed(R, mid, 'u1', rec) });
  }
}
// ⑩ 부분집합 모두 쓰기 (정식 3차시 형성평가 4번 · set-03) 채점
const L3 = DS.Lessons.get('set-03'), sq = (L3.boss.sets[1] || []).find((q) => q.type === 'subsets');
const subsOut = sq ? { q: pickQ(Object.assign({}, sq, { base: sq.base })), base: sq.base, tries: [[[], [5], [7], [5, 7]], [[5], [7], [5, 7]], [[], [5], [7], [5, 7], [5]], [[7, 5], [5], [], [7]], [[], [5], [7], [5, 7], [9]]].map((g) => ({ g, ok: DS.Quiz.grade(sq, g) })) } : null;
// ⑪ 룬 키패드 계산 (정식 DS.UI.runeNext) · 원소 칩 ∅ 단추 (정식 DS.Quiz.chipToggle)
const runeOut = [];
for (const len of [2, 4]) for (const cur of [null, '', 0, 7, 42, 99, 1234, '-', -5, -12]) for (const key of ['0', '3', '9', 'x', 'm']) runeOut.push({ len, cur, key, v: DS.UI.runeNext(cur, key, { len }) });
const cq = { type: 'multi', options: ['1', '2', '3', '∅ (공집합)', '4', '5', '∅'], answer: [], groups: [{ label: 'A', n: 4 }, { label: 'B', n: 3 }], empty: [3, 6] };
const chipOut = []; for (const g of [[], [0], [0, 1], [3], [0, 3], [4, 6], [6], [0, 4]]) for (let n = 0; n < 7; n++) chipOut.push({ g, n, v: DS.Quiz.chipToggle(cq, g, n) });
const out = { from: `Citadel-MATH ${head}`, rune: runeOut, chipQ: cq, chip: chipOut, rng, items: itemsOut, boss: bossOut, grade: gradeOut, record: recOut, bossRec, clock: clockOut, chain: chainOut, chainRec: chainRecOut, subsets: subsOut };
const dest = path.join(__dirname, '..', 'tests', 'fixtures', 'parity-set06.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));
console.log('기준값', path.relative(process.cwd(), dest), '· 정식', head, '· 문항', itemsOut.length, '· 보스', bossOut.length, '· 채점', gradeOut.length, '· 기록', recOut.length, '· 보스 기록', bossRec.length, '· 시계', clockOut.length, '· 소레이드 문항', chainOut.length, '· 소레이드 기록', chainRecOut.length, '· 부분집합', subsOut ? subsOut.tries.length : 0);
