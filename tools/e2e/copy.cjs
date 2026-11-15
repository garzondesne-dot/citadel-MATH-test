// 🚀 출시 리허설 (에뮬레이터 · 실제 서버 안 닿음): 「정식 흉내」 demo-release-src → 베타 demo-citadel-test-default-rtdb
//   ① 베타에 옛 베타 학생 기록 · 게시판 · 교사 설정 ② 정식 꼴 가짜 학생 3명(+ 선물 · 답장 · 설문 · 알림 · 수업 중 칸) ③ 정식 로그인 목록 들여오기(uid · 4자리 그대로 = auth:import 흉내)
//   ④ --dry = 베타 그대로 ⑤ 실행 = 백업 파일 · 대조 0 차이 ⑥ 한 칸 고치면 --check 가 멈춤(종료 3) ⑦ 같은 4자리로 로그인 = 같은 uid · 💎 그대로 · 안 받은 친구 선물 들어옴
//   ⑧ 정식에서 「선생님 초기화」 표시째 옮긴 학생 = 0000 → 다음 판 로그인으로 이음
const { chromium } = require('playwright');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, readdirSync, rmSync } = require('node:fs');
const os = require('node:os'), path = require('node:path');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', DBU = 'http://127.0.0.1:9000', AU = 'http://127.0.0.1:9099', SRCNS = 'demo-release-src', NS = 'demo-citadel-test-default-rtdb';
const rest = (ns, p, method = 'GET', body) => fetch(`${DBU}/${p}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
const OUT = mkdtempSync(path.join(os.tmpdir(), 'copyrh-'));
const tool = (...a) => spawnSync('node', ['tools/copy-from-release/copy.mjs', '--src', DBU, '--src-ns', SRCNS, '--emu', '--out', OUT, ...a], { encoding: 'utf8' });
const email = (c, n, g) => `s_${encodeURIComponent(c).replace(/%/g, '').toLowerCase()}_${n}_${g}@citadel.class`;
async function login(p, c, n, pin) {
  await p.goto(`${B}?emu=127.0.0.1`); await p.waitForSelector('select', { timeout: 20000 });
  await p.selectOption('select >> nth=0', c); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(n)); await p.waitForTimeout(300);
  await p.click('button.pw >> nth=0'); for (const d of pin) await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(200); await p.click('.title .pmain'); await p.waitForTimeout(3500);
  const err = await p.$eval('.err, .msg.bad', (x) => x.textContent).catch(() => '');
  const pill = await p.$eval('.pill .pv', (x) => x.textContent.replace(/\D/g, '')).catch(() => '');
  return { err, pill };
}
(async () => {
  const errs = [];
  await rest(SRCNS, '', 'DELETE'); await rest(NS, '', 'DELETE');
  await fetch(`${AU}/emulator/v1/projects/demo-citadel-test/accounts`, { method: 'DELETE' }).catch(() => {});
  // ① 베타 (옛 베타 기록 = 지워져야 함 · 교사 설정 = 남아야 함)
  await rest(NS, '', 'PUT', {
    accounts: { '1-3': { 1: { uid: 'BETA1' } } }, gem: { '1-3': { 1: { total: 999 } } }, pids: { s1_3_1: { u: 'BETA1', c: '1-3', n: '1' } },
    school: { board: { posts: { x: { t: '베타 글' } } }, sched: { 1: { 1: '1-3' } } }, prep: { packs: { p1: { name: '팩' } } }, admins: { TBETA: true },
  });
  // ② 정식 꼴 (가짜 학생 · 가짜 이름)
  const OFF = {
    accounts: { '1-3': { 5: { uid: 'OFF5', gen: 0, hero: 4, socket: { 4: 'b' }, title: 't3' }, 6: { uid: 'OFF6', gen: 1, hero: 2 }, 7: { uid: 'OFF7', gen: 0, hero: 1, reset: true } } },
    roster: { '1-3': { 5: '시험오', 6: '시험육', 7: '시험칠' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육', 7: '시*칠' } },
    gem: { '1-3': { 5: { total: 321, earned: 400, scroll: 7, enh: 2, buy: { h4: 1700000000000 }, log: { join_x: { g: 4, at: 1, why: '참여' } }, day: { '2026-11-10': 60 } }, 6: { total: 50, scroll: 1 }, 7: { total: 12 } } },
    xp: { '1-3': { 5: { total: 880 } } }, cards: { '1-3': { 5: { sub: true, emp: true } } },
    records: { '1-3': { 5: { 'set-06': { code: '111111', no: 6, mons: { m1: 'o', m2: 'f', u7: 'o' }, boss: 5, bossN: 6, bossM: 'ooooox', won: true } } } },
    bonus: { '1-3': { 5: { 'set-06': { r1: { clear: true, tries: 2, mis: { a: 1 } } } } } },
    survey: { '1-3': { open: true, no: 6 } }, surveyA: { '1-3': { k1: { no: 6, r: 3, pick: 'a', cmp: 1 } } }, surveyDone: { '1-3': { 5: true } },
    fgift: { '1-3': { 5: { f1: { from: '1-3/6', fromName: '시험육', fromUid: 'OFF6', g: 3, msg: '힘내', at: 10 }, f2: { from: '1-3/6', g: 2, at: 11, got: true } } } },
    fbr: { '1-3': { 6: { fb9: { t: '고마워요', at: 20, q: '질문' } } } }, notice: { '1-3': { n1: { t: '알림', at: 1 } } },
    act: { '1-3': { 5: { a: 1 } } }, qsolve: { x: 1 }, gcfg: { giftOn: { '1-3': true } }, admins: { TOFF: true }, prep: { 'set-06': { img: { c1: 'data:image/png;base64,AA' } } },
    rooms: { 111111: { state: { phase: 'end' } } }, live: { now: 1 }, secrets: { fixed: { hallKey: '9999' } }, hallTry: { h: 1 },
  };
  await rest(SRCNS, '', 'PUT', OFF);
  // ③ 정식 로그인 목록 들여오기 (uid · 이메일 · 4자리 그대로 · 선생님 auth:import 와 같은 결과)
  const users = [['OFF5', '1-3', 5, 0, '4321'], ['OFF6', '1-3', 6, 1, '1111'], ['OFF7', '1-3', 7, 0, '2222']].map(([localId, c, n, g, pin]) => ({ localId, email: email(c, n, g), rawPassword: `${pin}#cm` }));
  const imp = await fetch(`${AU}/identitytoolkit.googleapis.com/v1/projects/demo-citadel-test/accounts:batchCreate`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ users }) }).then((r) => r.json());
  if (imp.error?.length) errs.push('로그인 목록 들여오기');
  // ④ 미리 보기
  const dry = tool('--dry'); log(dry.stdout.trim());
  if ((await rest(NS, 'gem/1-3/1/total')) !== 999) errs.push('미리 보기가 베타를 바꿈');
  // ⑤ 실행
  const run = tool(); log(run.stdout.trim()); if (run.status !== 0) { errs.push(`실행 종료 ${run.status}`); log(run.stderr); }
  const files = readdirSync(OUT), bk = files.find((f) => f.startsWith('beta-backup-'));
  const bkv = bk ? JSON.parse(readFileSync(path.join(OUT, bk), 'utf8')) : null;
  log('   파일:', files.join(' · '), '| 백업 안 옛 베타 💎', bkv?.gem?.['1-3']?.[1]?.total);
  if (bkv?.gem?.['1-3']?.[1]?.total !== 999) errs.push('베타 백업');
  const after = await rest(NS, '');
  const chk = { old: after.gem?.['1-3']?.[1], board: after.school?.board, sched: !!after.school?.sched, packs: !!after.prep?.packs, admins: Object.keys(after.admins || {}).sort().join(','), rooms: after.rooms, secrets: after.secrets, gifts: after.gifts?.s1_3_5, mail: after.mail?.s1_3_6, pid: after.pids?.s1_3_5 };
  log('   복사 뒤:', JSON.stringify(chk));
  if (chk.old || chk.board || !chk.sched || !chk.packs || chk.admins !== 'TBETA,TOFF' || chk.rooms || chk.secrets || !chk.gifts?.fg_f1 || chk.gifts?.fg_f2 || !chk.mail?.fbr_fb9 || chk.pid?.u !== 'OFF5') errs.push('복사 뒤 모습');
  // ⑥ 한 칸 고치면 멈춤
  await rest(NS, 'bonus/1-3/5/set-06/r1/mis', 'DELETE');
  const bad = tool('--check'); log('   (한 칸 지운 뒤 대조)', bad.status, (bad.stderr.split('\n')[0] || '').trim());
  if (bad.status !== 3) errs.push('대조가 다름을 못 잡음');
  await rest(NS, 'bonus/1-3/5/set-06/r1/mis', 'PUT', { a: 1 });
  if (tool('--check').status !== 0) errs.push('되돌린 뒤 대조');
  // ⑦ 같은 4자리로 로그인
  const b = await chromium.launch();
  const ctx = async () => (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const p5 = await ctx(); p5.on('pageerror', (e) => errs.push(String(e)));
  const r5 = await login(p5, '1-3', 5, '4321'); const a5 = await rest(NS, 'accounts/1-3/5'), g5 = await rest(NS, 'gem/1-3/5');
  log('⑦ 1-3 5번(4321):', JSON.stringify(r5), '| uid', a5?.uid, '| 💎 서버', g5?.total, '| 선물 받음', (await rest(NS, 'gifts/s1_3_5/fg_f1/got')));
  if (r5.err || a5?.uid !== 'OFF5' || g5?.total !== 324 || g5?.earned !== 400 || !g5?.log?.join_x) errs.push('5번 로그인 · 💎 321 + 선물 3');
  await p5.screenshot({ path: `${SHOTS}/rh-copy-camp.png` });
  const p6 = await ctx(); const r6 = await login(p6, '1-3', 6, '1111'); const a6 = await rest(NS, 'accounts/1-3/6');
  log('   1-3 6번(판 1 · 1111):', JSON.stringify(r6), '| uid', a6?.uid, '| 💎', (await rest(NS, 'gem/1-3/6/total')));
  if (r6.err || a6?.uid !== 'OFF6') errs.push('6번(판 1) 로그인');
  const p6b = await ctx(); const r6b = await login(p6b, '1-3', 6, '9999');
  log('   1-3 6번 틀린 4자리:', JSON.stringify(r6b)); if (!r6b.err && r6b.pill) errs.push('틀린 4자리로 들어감');
  // ⑧ 초기화 표시째 옮긴 학생 = 0000
  const p7 = await ctx(); const r7 = await login(p7, '1-3', 7, '0000'); const a7 = await rest(NS, 'accounts/1-3/7');
  log('⑧ 1-3 7번(초기화 · 0000):', JSON.stringify(r7), '| 계정', JSON.stringify(a7), '| 💎', (await rest(NS, 'gem/1-3/7/total')));
  if (r7.err || !a7 || a7.reset || a7.g !== 1 || a7.uid === 'OFF7' || a7.hero !== 1) errs.push('7번 초기화 잇기');
  await b.close();
  rmSync(OUT, { recursive: true, force: true }); // 학생 기록 든 파일 = 리허설 뒤 지움
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
})();
