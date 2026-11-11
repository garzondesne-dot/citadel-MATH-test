// 정식(Citadel-MATH)과 같은 동작인지 확인할 기준값 만들기
// 사용: node tools/make-parity-fixture.cjs <정식 저장소 경로>  → tests/fixtures/parity-set06.json
// 정식 코드를 그대로 불러(vm) 문항 · 채점 · 기록(재도전 v3 · 힐) · 보스 · 정찰 · 공격 시계를 적어 둔다
// 정식이 바뀌면 다시 만들고 차이를 본다. 방 모양은 시험 쪽(tests/parity.test.ts)과 같은 규칙으로 만든다
const fs = require('fs'), path = require('path');
const root = process.argv[2];
if (!root) { console.error('정식 저장소 경로를 주세요'); process.exit(1); }
const load = require(path.join(path.resolve(root), 'tests/load.js'));
const DS = load(['assets/manifest.js', 'js/engine/ui.js', 'js/engine/setgen.js', 'js/engine/quiz.js', 'js/engine/lessons.js', 'lessons/set-06.js', 'js/raid/model.js', 'js/raid/combo.js']);
const L = DS.Lessons.get('set-06'), RA = DS.Raid;
const head = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
const pickQ = (q) => ({ type: q.type, question: q.question, options: q.options, choices: q.choices, answer: q.answer, answerIndex: q.answerIndex, solution: q.solution });
const MIDS = ['m1', 'm2', 'm3'];

// ① 난수
const rng = ['ABCD|u1|m1|0', 's1', 'x'].map((seed) => { const r = DS.Rng(seed); return { seed, seq: [r(), r(), r(), r(), r()] }; });
// ② 몬스터 문항: 몬스터 3 × 시드 30 × 판 0~3
const itemsOut = [];
for (const mid of MIDS) for (let s = 0; s < 30; s++) for (let v = 0; v <= 3; v++) {
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
const meta = (code) => ({ code, lesson: 'set-06', version: 3, retries: 3, healMax: 2, bossTries: 4, solve: 60, profile: 'class' });
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
const out = { from: `Citadel-MATH ${head}`, rng, items: itemsOut, boss: bossOut, grade: gradeOut, record: recOut, bossRec, clock: clockOut };
const dest = path.join(__dirname, '..', 'tests', 'fixtures', 'parity-set06.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));
console.log('기준값', path.relative(process.cwd(), dest), '· 정식', head, '· 문항', itemsOut.length, '· 보스', bossOut.length, '· 채점', gradeOut.length, '· 기록', recOut.length, '· 보스 기록', bossRec.length, '· 시계', clockOut.length);
