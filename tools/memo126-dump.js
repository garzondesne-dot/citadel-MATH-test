// 테스트 #1 기준값 뽑기 (정식 #126 memoParts 출력) — 테스트 저장소 tests/fixtures/memo126.json
const load = require('./load');
const fs = require('fs');
const lessons = fs.readdirSync(__dirname + '/../lessons').filter((f) => /^(set|eval)-\d+\.js$/.test(f)).sort().map((f) => `lessons/${f}`);
const DS = load(['assets/manifest.js', 'js/engine/ui.js', 'js/engine/setgen.js', 'js/engine/quiz.js', 'js/engine/lessons.js', ...lessons, 'lessons/rubrics.js', 'lessons/curriculum.js', 'js/raid/note.js', 'js/raid/dash.js']);
const M = DS.Dash._memo;
const misCode = Object.keys(DS.Mis.CODES)[0];
const studs = [
  { went: 6, heldN: 6, conc: { a: { name: '역과 대우', ok: 9, total: 10 } }, std: {}, boss: 88, hg: 3, fixed: 7, mis: { [misCode]: [3, 2] }, photoN: 3, photoRev: 2, hints: 4, tryEval: 12, trySet: 5, noteDone: 4, cards: 9, symt: { 'set-09': { conv: 3 } }, surveyed: true },
  { went: 4, heldN: 6, conc: {}, std: {}, boss: 50, hg: 0, fixed: 0, mis: {}, photoN: 0, photoRev: 0, hints: 0, tryEval: 0, trySet: 0, noteDone: 0, cards: 0, symt: {}, surveyed: false },
  { went: 5, heldN: 6, conc: { b: { name: '충분조건과 필요조건', ok: 4, total: 5 } }, std: {}, boss: null, hg: 1, fixed: 2, mis: {}, photoN: 1, photoRev: 0, hints: 0, tryEval: 3, trySet: 0, noteDone: 0, cards: 0, symt: {}, surveyed: true },
  { went: 3, heldN: 4, conc: { c: { name: '드모르간의 법칙', ok: 3, total: 4 }, d: { name: '교집합', ok: 5, total: 5 } }, std: {}, boss: 67, hg: 0, fixed: 1, mis: { M08: [2, 1], M11: [1, 0] }, photoN: 2, photoRev: 0, hints: 1, tryEval: 0, trySet: 4, noteDone: 0, cards: 2, symt: {}, surveyed: false },
  { went: 0 },
];
const out = studs.map((s) => ({ in: s, out: M(s) }));
fs.writeFileSync(process.argv[2], JSON.stringify({ src: 'Citadel-MATH release dda3360 js/raid/dash.js memoParts (#126)', misCodes: DS.Mis.CODES, cases: out }, null, 1));
console.log('ok', out.length);
