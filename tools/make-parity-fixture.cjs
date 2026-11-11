// 정식(Citadel-MATH)과 같은 동작인지 확인할 기준값 만들기
// 사용: node tools/make-parity-fixture.cjs <정식 저장소 경로>  → tests/fixtures/parity-set06-m1.json
// 정식 코드를 그대로 불러(vm) 문항 · 채점 · 기록(재도전 v3)을 적어 둔다. 정식이 바뀌면 다시 만들고 차이를 본다
const fs = require('fs'), path = require('path');
const root = process.argv[2];
if (!root) { console.error('정식 저장소 경로를 주세요'); process.exit(1); }
const load = require(path.join(path.resolve(root), 'tests/load.js'));
const DS = load(['assets/manifest.js', 'js/engine/ui.js', 'js/engine/setgen.js', 'js/engine/quiz.js', 'js/engine/lessons.js', 'lessons/set-06.js', 'js/raid/model.js']);
const L = DS.Lessons.get('set-06');
const head = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();

// ① 난수: 시드별 처음 5개
const rng = ['ABCD|u1|m1|0', 's1', 'x'].map((seed) => { const r = DS.Rng(seed); return { seed, seq: [r(), r(), r(), r(), r()] }; });
// ② 문항: 시드 40 × 판 0~3 (질문 · 보기 · 정답)
const itemsOut = [];
for (let s = 0; s < 40; s++) for (let v = 0; v <= 3; v++) {
  const seed = `R${s}|u${s % 7}`;
  itemsOut.push({ seed, v, items: L.items('m1', seed, v).map((q) => ({ question: q.question, options: q.options, answer: q.answer, solution: q.solution })) });
}
// ③ 채점: 판 1 문항에 여러 가지 답 (빈 답 · 정답 · 하나 빠짐 · 하나 더 · 순서 바꿈)
const gradeOut = [];
for (let s = 0; s < 20; s++) {
  for (const q of L.items('m1', `g${s}`, 1)) {
    const a = q.answer, extra = q.options.map((_, i) => i).find((i) => !a.includes(i));
    const tries = [[], a.slice(), a.slice(1), extra == null ? a.slice() : [...a, extra], a.slice().reverse()];
    for (const given of tries) gradeOut.push({ seed: `g${s}`, question: q.question, given, ok: DS.Quiz.grade(q, given) });
  }
}
// ④ 기록(재도전 v3): 시도 줄 → best · left · perfect · fix · 다음 문항 첫 질문
const R0 = (subs) => ({ meta: { code: 'PAR', lesson: 'set-06', version: 3 }, state: { step: 0 }, players: { u1: { num: 1 } }, active: { u1: true }, subs: { m1: { u1: subs } } });
const right = (v) => L.items('m1', 'PAR|u1', v).map((q) => q.answer.slice());
const wrong = (v) => right(v).map(() => []);
const half = (v) => right(v).map((a, i) => (i % 2 ? [] : a));
const scen = {
  '틀림 → 틀림': (s) => { s[0] = wrong(0); s[1] = wrong(0); },
  '반 맞음 → 다 맞음': (s) => { s[0] = half(0); s[1] = right(0); },
  '다 맞음 → 새 문제 다 맞음': (s) => { s[0] = right(0); s[1] = right(1); },
  '다 맞음 → 새 문제 틀림 → 고쳐 맞음': (s) => { s[0] = right(0); s[1] = wrong(1); s[2] = right(1); },
  '4번 다 틀림': (s) => { for (let k = 0; k < 4; k++) s[k] = wrong(0); },
};
const recOut = Object.entries(scen).map(([name, fill]) => {
  const subs = {}; fill(subs); const R = R0(subs), rec = DS.Raid.record(L, R, 'm1', 'u1');
  return { name, subs, best: rec.best, total: rec.total, left: rec.left, perfect: rec.perfect, practice: rec.practice, fix: !!rec.fix, canRetry: rec.canRetry,
    nextFirstQ: DS.Raid.itemsFor(L, R, 'm1', 'u1', rec.nextAttempt)[0].question,
    hp: DS.Raid.monsterHp(L, R, 'm1') };
});
const out = { from: `Citadel-MATH ${head}`, rng, items: itemsOut, grade: gradeOut, record: recOut };
const dest = path.join(__dirname, '..', 'tests', 'fixtures', 'parity-set06-m1.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log('기준값', dest, '· 문항', itemsOut.length, '· 채점', gradeOut.length, '· 기록', recOut.length, '· 정식', head);
