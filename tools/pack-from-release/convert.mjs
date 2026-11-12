// 🧩 #132 차시 팩 변환기 — 정식 저장소의 lessons/set-NN.js → v1.0 차시 팩
//   사용: node tools/pack-from-release/convert.mjs <정식 저장소 폴더> [--board <입력판 폴더>] [--only set-02,set-03]
//   만드는 것 (손으로 고치지 않음 · 정식에서 새 차시가 오면 이 도구로 다시 뽑음):
//     src/subjects/<과목>/gens/official/shim.js          = 정식 DS.Rng · DS.SetGen 원문 (차시 파일이 쓰는 도구)
//     src/subjects/<과목>/gens/official/set-NN.js        = 정식 차시 파일 원문 + 앞뒤 몇 줄(모듈로 감쌈) — 숫자 생성기 코드는 여기에만
//     src/subjects/<과목>/gens/official/index.ts         = 생성기 이름 등록 ('set02.m1' · 'set02.boss' …)
//     src/subjects/<과목>/lessons/set-NN.json              = 차시 팩(데이터만 · 코드 없음 · 생성기는 이름으로)
//     public/art/mon-<시트><줄>-v1.webp · dg-<테마>-v1h.webp + src/subjects/<과목>/themes.json = 쓰는 몬스터 줄 · 던전 배경만 잘라 옴
//   입력판(--board · 아티팩트 db packs/{id} 를 내려받은 JSON 폴더): 단계 순서 · 제목 · 말할 거리 · 분(min) · 이름표(title · goal · theme · pct · next · std)
//     문제 · 정답은 늘 정식 코드에서 · 형성평가 메모(memo)는 반영하지 않고 보고만
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

// #149 v1.0 만: 형성평가를 앞수업 · 뒷수업으로 나눔 (차시 id → 뒷수업 첫 문항 번호 · 정식은 뒷수업 끝에 전부 그대로)
const V1_BOSS_SPLIT = { 'set-06': 3 };
// 💥 #152 몬스터 ↔ 공격 짝 표 (선생님 「이대로」 · 다시 변환해도 남게)
const ATTACKS = JSON.parse(fs.readFileSync(new URL('./attacks.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const REL = path.resolve(args[0] || '.');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BOARD = opt('--board');
const ONLY = (opt('--only') || 'set-02,set-03,set-04,set-05').split(',');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SUBJECT = opt('--subject') || 'common-math2', SUB = path.join(ROOT, 'src/subjects', SUBJECT); // #136 과목 팩 폴더
const OUT_GEN = path.join(SUB, 'gens/official'), OUT_PACK = path.join(SUB, 'lessons'), OUT_ART = path.join(ROOT, 'public/art');
const commit = (() => { try { return execFileSync('git', ['-C', REL, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { return '?'; } })();
fs.mkdirSync(OUT_GEN, { recursive: true });

// ── ① 정식 도구 원문 (DS.Rng = js/engine/ui.js 의 그 부분 · DS.SetGen = js/engine/setgen.js) ──
const ui = fs.readFileSync(path.join(REL, 'js/engine/ui.js'), 'utf8');
const a = ui.indexOf('DS.Rng = function'), b = ui.indexOf('\n', ui.indexOf('DS.MathGen = DS.MathGen'));
if (a < 0 || b < 0) throw new Error('정식 ui.js 에서 DS.Rng 를 못 찾음');
const RNG_SRC = ui.slice(a, b + 1);
const SETGEN_SRC = fs.readFileSync(path.join(REL, 'js/engine/setgen.js'), 'utf8');
const HEAD = (what) => `// @ts-nocheck\n// ⚠ 자동 생성 — tools/pack-from-release/convert.mjs · 정식 ${what} @ ${commit} 원문 그대로 · 손으로 고치지 않음\n`;
fs.writeFileSync(path.join(OUT_GEN, 'shim.js'), `${HEAD('js/engine/ui.js (DS.Rng) · js/engine/setgen.js')}const window = { DS: {} };\nconst DS = window.DS;\n${RNG_SRC}\n${SETGEN_SRC}\nexport default DS;\n`);

// ── ② 정식 차시를 node 에서 읽기 (같은 원문 · 팩 데이터 뽑기 + 시험 기준값) ──
function loadOfficial(file) {
  let reg = null;
  const ctx = { console, Math, Object, Array, String, Number, JSON, Set, Map };
  ctx.window = ctx; ctx.DS = {};
  vm.createContext(ctx);
  vm.runInContext(`${RNG_SRC}\n${SETGEN_SRC}`, ctx);
  ctx.DS.Lessons = { register: (x) => { reg = x; } };
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return reg;
}

// ── ③ 몬스터 그림 · 던전 배경 (정식 manifest 표 → 쓰는 줄만 잘라 옴) ──
const SHEET_FILE = { base: 'monsters-v2', extra: 'monsters-extra-v2', new: 'monsters-new-v1', crown: 'monsters-crown-v1', rift: 'monsters-rift-v2', riftboss: 'monsters-riftboss-v2', mirror: 'monsters-mirror-v2', mirrorboss: 'monsters-mirrorboss-v2', mirrorboss8: 'monsters-mirrorboss-v3', keyvault: 'monsters-keyvault-v2', keyvaultboss: 'monsters-keyvaultboss-v1', garden: 'monsters-skygarden-v2', gardenboss: 'monsters-skygardenboss-v1' };
const man = fs.readFileSync(path.join(REL, 'assets/manifest.js'), 'utf8');
const namesOf = (file) => { const m = new RegExp(`src: '${file}\\.webp'[^\\n]*?names: \\[([^\\]]*)\\]`, 's').exec(man) || new RegExp(`src: '${file}\\.webp'[\\s\\S]*?names: \\[([^\\]]*)\\]`).exec(man); return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : []; };
const findAsset = (name) => { for (const d of ['assets', 'assets/art', 'assets/img']) { const p = path.join(REL, d, name); if (fs.existsSync(p)) return p; } throw new Error(`정식 그림 없음: ${name}`); };
const sheetsGen = fs.existsSync(path.join(SUB, 'themes.json')) ? JSON.parse(fs.readFileSync(path.join(SUB, 'themes.json'), 'utf8')) : { sheets: {}, dungeons: {} };
const cuts = [];
function spriteRef(ref) { // 'new:2@h120' → 'new2:0@h120' (그 줄만 자른 시트)
  const [base, h] = String(ref).split('@h');
  const [k, row] = base.includes(':') ? base.split(':') : ['base', base]; // 숫자 = 기본 시트 monsters-v2 (정식 art.js)
  const file = SHEET_FILE[k];
  if (!file) throw new Error(`모르는 그림 시트: ${ref}`);
  const key = `${k}${row}`, src = `art/mon-${k}${row}-v1.webp`;
  if (!sheetsGen.sheets[key]) sheetsGen.sheets[key] = { src, from: `${file}.webp`, row: Number(row), names: [namesOf(file)[Number(row)] || key] };
  if (!fs.existsSync(path.join(ROOT, 'public', src)) && !cuts.some((c) => c[3] === path.join(ROOT, 'public', src))) { cuts.push([k === 'base' && Number(row) === 1 ? 'rowflip' : 'row', findAsset(`${file}.webp`), Number(row), path.join(ROOT, 'public', src)]); }
  if (!sheetsGen.sheets[key].cell) { const out = execFileSync('python3', ['-c', `from PIL import Image;print(Image.open('${findAsset(`${file}.webp`)}').width//3)`]).toString().trim(); sheetsGen.sheets[key].cell = Number(out); } // 기본 시트 1줄 = 오른쪽을 봄 → 뒤집음 (정식 flip: [1])
  return `${key}:0${h ? `@h${h}` : ''}`;
}
function theme(id) {
  if (!id) return undefined;
  const m = /bg: \(id\) => \((\{[^}]*\})\)\[id\]/.exec(man), special = m ? Function(`return ${m[1]}`)() : {};
  const file = special[id] || `dg-${id}-v1.webp`, src = `art/dg-${id}-v1h.webp`;
  sheetsGen.dungeons[id] = src;
  if (!fs.existsSync(path.join(ROOT, 'public', src)) && !cuts.some((c) => c[3] === path.join(ROOT, 'public', src))) { cuts.push(['half', findAsset(file), 0, path.join(ROOT, 'public', src)]); }
  return id;
}

// ── ④ 팩 만들기 ──
const chains = [], reg = [], report = { memos: [], added: [], dropped: [], boardAt: {} };
const OFFICIAL_SITE = 'https://garzondesne-dot.github.io/Citadel-MATH/';
for (const id of ONLY) {
  const file = path.join(REL, 'lessons', `${id}.js`);
  const L = loadOfficial(file);
  if (!L) throw new Error(`${id}: DS.Lessons.register 없음`);
  const p = id.replace('-', ''); // set-02 → set02
  // 원문 모듈 (등록만 잡아 냄 · 나머지 정식 DS 는 쓰지 않음)
  fs.writeFileSync(path.join(OUT_GEN, `${id}.js`), `${HEAD(`lessons/${id}.js`)}import BASE from './shim.js';\nlet L = null;\nconst DS = Object.assign(Object.create(BASE), { Lessons: { register: (x) => { L = x; } }, Test: {} });\n${fs.readFileSync(file, 'utf8')}\nexport default L;\n`);
  // 입력판
  const bf = BOARD && path.join(BOARD, `${id}.json`);
  const B = bf && fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, 'utf8')) : null;
  const D = B && B.data ? B.data : B;
  if (D) report.boardAt[id] = D.updatedAt;
  const offSteps = L.steps.map((s) => ({ ...s }));
  let steps = offSteps;
  if (D && Array.isArray(D.steps) && D.steps.length) {
    steps = D.steps.map((bs) => {
      const o = offSteps.find((s) => s.id === bs.id);
      if (!o) { report.added.push(`${id} · ${bs.kind} ${bs.id} 「${bs.title}」`); return null; }
      return { ...o, title: bs.title || o.title, say: bs.say != null && bs.say !== '' ? bs.say : o.say, min: Number(bs.min) || undefined };
    }).filter(Boolean);
    offSteps.filter((o) => !D.steps.some((bs) => bs.id === o.id)).forEach((o) => report.dropped.push(`${id} · ${o.kind} ${o.id} 「${o.title}」`));
    for (const bs of D.steps) if (bs.memo) report.memos.push(`${id} · ${bs.id} 「${bs.title}」: ${bs.memo}`);
    for (const [k, v] of Object.entries(D.memo || {})) if (v) report.memos.push(`${id} · ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    if (D.boss && D.boss.memo) report.memos.push(`${id} · 형성평가: ${D.boss.memo}`);
  }
  const monsters = {};
  for (const [mid, m] of Object.entries(L.monsters)) {
    const ch = (L.chain || []).includes(mid);
    monsters[mid] = { title: m.title, sprite: spriteRef(m.sprite), ...(m.note ? { noteText: m.note } : {}), ...(m.special ? { special: true } : {}), ...(m.review ? { review: true } : {}), retry: { gen: `${p}.${mid}` }, ...(ch ? { chain: { gen: `${p}.${mid}` } } : {}), attack: (ATTACKS[id] || {})[mid] || 'pause' };
    reg.push([`${p}.${mid}`, id, mid]);
    if (ch) chains.push([`${p}.${mid}`, id, mid]);
  }
  const bo = L.boss;
  const pack = {
    v: 1, id, no: L.no, title: (D && D.title) || L.title, unit: L.unit, sheet: L.sheet, goal: (D && D.goal) || L.goal,
    theme: theme((D && D.theme) || L.theme), defaultPct: Number(D && D.pct) || L.defaultPct || 90,
    ...(L.parts ? { parts: L.parts.map((pt) => (V1_BOSS_SPLIT[id] != null && bo ? { ...pt, boss: [V1_BOSS_SPLIT[id], bo.items || bo.sets[1].length] } : pt)) } : {}), ...(L.next || (D && D.next) ? { next: (D && D.next && D.next.title ? D.next : L.next) } : {}),
    ...(D && D.std ? { std: D.std } : {}),
    source: { file: `lessons/${id}.js`, commit, board: D ? D.updatedAt : null },
    steps: steps.map((s) => ({ kind: s.kind, id: s.id, title: s.title, ...(s.say ? { say: s.say } : {}), ...(s.img ? { img: s.img } : {}), ...(s.min ? { min: s.min } : {}), ...(s.special ? { special: true } : {}), ...(s.review ? { review: true } : {}) })),
    monsters,
    ...(bo ? { boss: { title: bo.title, sprite: spriteRef(bo.sprite), items: bo.items || bo.sets[1].length, hpItems: bo.hpItems || bo.items, tags: bo.tags || [], gen: `${p}.boss`, sets: bo.sets, ...((ATTACKS[id] || {}).boss ? { attack: ATTACKS[id].boss } : {}) } } : {}),
    ...(L.crops ? { crops: L.crops } : {}),
    ...(L.videos ? { videos: Object.fromEntries(Object.entries(L.videos).map(([k, v]) => [k, /^https?:/.test(v) ? v : OFFICIAL_SITE + v])) } : {}),
  };
  if (bo) reg.push([`${p}.boss`, id, null]);
  fs.writeFileSync(path.join(OUT_PACK, `${id}.json`), JSON.stringify(pack, null, 1) + '\n');
}

// ── ④′ 시험 재료: 정식 출력 기준값(첫 판 · 다시 도전 판 · 형성평가) + 정식 독립 검산 시험 원문 ──
const FIX = path.join(ROOT, 'tests/fixtures/packs'); fs.mkdirSync(FIX, { recursive: true });
const EXTRA_FILES = { 'set-09': ['lessons/rubrics.js'], 'set-10': ['lessons/rubrics.js'] };
const TEST_OF = { 'set-02': 'lesson2.test.js', 'set-03': 'lesson.test.js', 'set-04': 'lesson4.test.js', 'set-05': 'lesson5.test.js', 'set-06': 'lesson6.test.js', 'set-08': 'lesson8.test.js', 'set-09': 'lesson9.test.js', 'set-10': 'lesson10.test.js' };
const OFF = path.join(ROOT, 'tests/official'), copied = new Set();
const cp = (rel) => { if (copied.has(rel)) return; copied.add(rel); const to = path.join(OFF, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(REL, rel), to); };
for (const id of ONLY) {
  const L = loadOfficial(path.join(REL, 'lessons', `${id}.js`)), seeds = ['A1|s1_3_1', 'B2|s1_3_7', 'C3|s1_5_12'], out = { commit, monsters: {}, boss: {} };
  for (const mid of Object.keys(L.monsters)) out.monsters[mid] = seeds.map((sd) => [0, 1, 2, 3, 5, 9].map((a) => JSON.parse(JSON.stringify(L.items(mid, sd, a)))));
  if (L.chainItems) { out.chain = {}; for (const mid of L.chain || []) out.chain[mid] = seeds.map((sd) => [0, 1, 2, 3].map((ps) => JSON.parse(JSON.stringify(L.chainItems(mid, sd, ps))))); }
  if (L.boss) { const n = L.boss.items || L.boss.sets[1].length; out.boss = { first: JSON.parse(JSON.stringify(L.boss.sets[1].slice(0, n))), retry: seeds.map((sd) => Array.from({ length: n }, (_, i) => [1, 2, 3].map((a) => JSON.parse(JSON.stringify(L.boss.make ? L.boss.make(i, a, vm.runInNewContext(`${RNG_SRC}; DS.Rng`, { DS: {}, window: {}, Math })(`${sd}|boss|${i}|${a}`)) : (L.boss.sets[2] || L.boss.sets[1])[i]))))) }; }
  fs.writeFileSync(path.join(FIX, `${id}.json`), JSON.stringify(out) + '\n');
  const t = TEST_OF[id]; if (!t) continue;
  cp(`tests/${t}`); cp('tests/load.js'); cp(`lessons/${id}.js`);
  const src = fs.readFileSync(path.join(REL, 'tests', t), 'utf8'), files = (/load\(\[([^\]]*)\]\)/.exec(src)?.[1] || '').match(/'[^']+'/g) || [];
  files.map((f) => f.slice(1, -1)).forEach(cp);
  // 정식 시험이 「영상 파일이 정식 저장소에 있음」도 보므로 같은 이름의 빈 자리 파일 (영상은 정식 사이트 주소로 재생 · 여기엔 안 옮김)
  for (const v of Object.values(L.videos || {})) if (/^assets\//.test(v)) { const to = path.join(OFF, v); fs.mkdirSync(path.dirname(to), { recursive: true }); if (!fs.existsSync(to)) fs.writeFileSync(to, ''); }
}
fs.writeFileSync(path.join(OFF, 'package.json'), '{ "type": "commonjs" }\n'); // 정식 시험 = require 꼴 그대로
fs.writeFileSync(path.join(OFF, 'README.md'), `# 정식 독립 검산 시험 (자동 복사 · 손으로 고치지 않음)\n\ntools/pack-from-release/convert.mjs 가 정식 @ ${commit} 에서 복사함. tests/packs.test.ts 가 차시마다 \`node tests/official/tests/<시험>\` 을 돌려 통과(종료 0)를 확인함.\n차시 파일(lessons/)은 src/subjects/<과목>/gens/official/ 과 같은 원문. assets/video/*.mp4 = 빈 자리 파일(정식 시험의 「파일 있음」 확인용 · 실제 영상은 정식 사이트).\n`);

// ── ④″ 입력판 그림 · 영상 (media/{id} · #132 덧붙임): 정식 값이 기본 · 선생님이 바꾼 칸은 덮지 않고 보고만 ──
//   url 은 아티팩트 자산(/_blob/…)이라 내용 비교 대신 ① 칸 목록(더함 · 뺌) ② 영상 묶음(정식에서 같은 파일을 쓰는 칸끼리 같은 자산인가) ③ 문서를 고친 때로 가림
const MEDIA = BOARD && path.join(path.dirname(BOARD), 'media');
report.media = [];
if (MEDIA && fs.existsSync(MEDIA)) for (const id of ONLY) {
  const f = path.join(MEDIA, `${id}.json`); if (!fs.existsSync(f)) continue;
  const M = JSON.parse(fs.readFileSync(f, 'utf8')), L = loadOfficial(path.join(REL, 'lessons', `${id}.js`));
  const offImg = Object.keys(L.crops || {}).filter((k) => k !== 'review'), offVid = L.videos || {}, mi = M.img || {}, mv = M.vid || {};
  const add = (a, b) => Object.keys(a).filter((k) => !b.includes(k)), miss = (a, b) => a.filter((k) => !(k in b));
  const lines = [];
  add(mi, [...offImg, 'review']).forEach((k) => lines.push(`그림 ＋${k}`)); miss(offImg, mi).forEach((k) => lines.push(`그림 −${k}`));
  add(mv, Object.keys(offVid)).forEach((k) => lines.push(`영상 ＋${k}`)); miss(Object.keys(offVid), mv).forEach((k) => lines.push(`영상 −${k}`));
  const ks = Object.keys(offVid).filter((k) => k in mv);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = ks[i], b = ks[j]; if ((offVid[a] === offVid[b]) !== (mv[a] === mv[b])) lines.push(`영상 ${a} · ${b} 묶음 다름(정식 ${offVid[a] === offVid[b] ? '같은 파일' : '다른 파일'})`); }
  report.media.push(`${id} (고친 때 ${M.updatedAt || '?'}): ${lines.length ? lines.join(' · ') : '정식과 같음(칸 · 묶음)'}`);
}

// ── ⑤ 생성기 이름 등록 (index.ts) — 판 0 · 1~ 모두 정식 make(판, 난수) 그대로 ──
const ids = [...new Set(reg.map((r) => r[1]))];
fs.writeFileSync(path.join(OUT_GEN, 'index.ts'), `// ⚠ 자동 생성 — tools/pack-from-release/convert.mjs · 정식 @ ${commit} · 손으로 고치지 않음
import type { Question } from '../../../../model/types';
import type { Rng } from '../../../../engine/rng';
${ids.map((id) => `// @ts-ignore 원문 모듈(js)\nimport ${id.replace('-', '')} from './${id}.js';`).join('\n')}
type Off = { monsters: Record<string, { make: (a: number, r: Rng) => Question[] }>; boss?: { sets: Record<number, Question[]>; make?: (i: number, a: number, r: Rng) => Question } };
const O: Record<string, Off> = { ${ids.map((id) => `'${id}': ${id.replace('-', '')}`).join(', ')} };
/** 몬스터: (판, 난수) → 문항 · 정식 MONSTERS[id].make(판, 난수) */
export const OFFICIAL_GENS: Record<string, (v: number, r: Rng) => Question[]> = {
${reg.filter((r) => r[2]).map(([n, id, mid]) => `  '${n}': (v, r) => O['${id}']!.monsters['${mid}']!.make(v, r),`).join('\n')}
};
/** 보스: 시도 0 = 세트 1(학습지) · 1~ = 정식 boss.make (없으면 세트 2 · 정식 model.js bossItem 과 같음) */
const bossOf = (id: string) => (i: number, a: number, r: Rng): Question => { const b = O[id]!.boss!; return (!a ? b.sets[1]![i] : b.make ? b.make(i, a, r) : (b.sets[2] || b.sets[1])![i]) as Question; };
export const OFFICIAL_BOSS: Record<string, (i: number, a: number, r: Rng) => Question> = {
${reg.filter((r) => !r[2]).map(([n, id]) => `  '${n}': bossOf('${id}'),`).join('\n')}
};
/** ⚔ 소레이드: 정식 chainItems(몬스터, 시드, 판) 그대로 (같은 난수 규칙: 시드|몬스터|chain|판) */
export const OFFICIAL_CHAIN: Record<string, (pass: number, r: Rng, seed?: string) => Question[]> = {
${chains.map(([n, id, mid]) => `  '${n}': (pass, _r, seed = '') => (O['${id}'] as unknown as { chainItems: (m: string, s: string, p: number) => Question[] }).chainItems('${mid}', seed, pass),`).join('\n')}
};
export const OFFICIAL_COMMIT = '${commit}';
`);

// ── ⑥ 그림 자르기 (python PIL) ──
fs.writeFileSync(path.join(SUB, 'themes.json'), JSON.stringify(sheetsGen, null, 1) + '\n');
if (cuts.length) execFileSync('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'cut.py'), JSON.stringify(cuts)], { stdio: 'inherit' });

console.log(`✅ 정식 @ ${commit} → ${ONLY.join(' · ')} · 생성기 ${reg.length} · 그림 ${cuts.length}장`);
console.log(`입력판 읽은 때: ${JSON.stringify(report.boardAt)}`);
console.log(`📝 입력판 메모 ${report.memos.length}개${report.memos.length ? '\n  ' + report.memos.join('\n  ') : ''}`);
console.log(`🖼 입력판 그림 · 영상 (반영 안 함 · 보고만): ${report.media.length ? '\n  ' + report.media.join('\n  ') : '없음'}`);
if (report.added.length) console.log(`➕ 입력판에만 있는 단계(반영 안 함 · 정식에 없음): ${report.added.join(' | ')}`);
if (report.dropped.length) console.log(`➖ 입력판에서 뺀 단계: ${report.dropped.join(' | ')}`);
