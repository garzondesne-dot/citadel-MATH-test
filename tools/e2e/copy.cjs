// #163 ② 복사 도구 한 바퀴 (에뮬레이터 두 이름공간: 「정식 흉내」 demo-release-src → 시험 demo-citadel-test-default-rtdb)
//   ① 정식 꼴 가짜 기록을 정식 흉내 칸에 넣음 ② --dry = 몇 명 · 몇 건 · 시험 칸 그대로 ③ 실행 = 같은 경로 · 같은 꼴 · 계정 reset
//   ④ 그 반 · 번호 · 4자리로 처음 로그인 → 칸 이어짐(uid 바뀜 · reset 지움) · 💎 = 정식 total · 정식 gem.log · earned 칸은 그대로 남음
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = '&emu=127.0.0.1', DBU = 'http://127.0.0.1:9000', SRCNS = 'demo-release-src', NS = 'demo-citadel-test-default-rtdb';
const rest = (ns, path, method = 'GET', body) => fetch(`${DBU}/${path}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
const tool = (...a) => execFileSync('node', ['tools/copy-from-release/copy.mjs', '--src', DBU, '--src-ns', SRCNS, '--emu', ...a], { encoding: 'utf8' });
(async () => {
  const errs = [];
  await rest(SRCNS, '', 'DELETE'); await rest(NS, '', 'DELETE');
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  // ① 정식 꼴 (가짜 학생 · 가짜 이름)
  await rest(SRCNS, '', 'PUT', {
    accounts: { '1-3': { 5: { uid: 'OLDUID5', hero: 4, socket: { 4: 'b' }, title: 't3' } } },
    roster: { '1-3': { 5: '시험오' } }, rosterMask: { '1-3': { 5: '시*오' } },
    gem: { '1-3': { 5: { total: 321, earned: 400, scroll: 7, enh: 2, buy: { h4: 1700000000000 }, log: { join_x: { g: 4, at: 1, why: '참여' } }, day: { '2026-11-10': 60 } } } },
    xp: { '1-3': { 5: { total: 880, log: { a: 1 } } } }, cards: { '1-3': { 5: { sub: true, emp: true } } },
    records: { '1-3': { 5: { 'set-06': { code: '111111', no: 6, mons: { m1: 'o', m2: 'f', m3: 'x', u4: 'o', u5: 'o', u6: 'f', u7: 'o' }, boss: 5, bossN: 6, bossM: 'ooooox', won: true } } } },
    bonus: { '1-3': { 5: { 'set-06': { r1: { clear: true, tries: 2, mis: { a: 1 } } } } } },
  });
  // ② 미리 보기
  const dry = tool('--dry'); log(dry.trim()); const before = await rest(NS, 'gem');
  if (!/gem\s+학생\s+1/.test(dry) || before) errs.push('미리 보기');
  // ③ 실행
  log(tool().split('\n')[0]);
  const acc = await rest(NS, 'accounts/1-3/5'), gem = await rest(NS, 'gem/1-3/5'), rec = await rest(NS, 'records/1-3/5/set-06');
  log('   옮긴 계정:', JSON.stringify(acc), '| 💎', gem?.total, '| 기록 mons', JSON.stringify(rec?.mons));
  if (!acc?.reset || acc.hero !== 4 || gem?.total !== 321 || rec?.bossM !== 'ooooox') errs.push('같은 경로 · 같은 꼴');
  // ④ 처음 로그인 = 잇기
  await rest(NS, 'school/sched', 'PUT', null);
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?${E.slice(1)}`); await p.waitForSelector('select', { timeout: 20000 });
  await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '5'); await p.waitForTimeout(300);
  log('   이름 줄:', (await p.textContent('.name')).trim());
  await p.click('button.pw >> nth=0'); for (const d of '4321') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(200); await p.click('.title .pmain'); await p.waitForTimeout(3500);
  const acc2 = await rest(NS, 'accounts/1-3/5'), gem2 = await rest(NS, 'gem/1-3/5');
  const pill = await p.$eval('.pill', (x) => x.textContent.replace(/\D/g, '')).catch(() => '');
  log('④ 처음 로그인 뒤 계정:', JSON.stringify(acc2), '| 캠프 💎', pill, '| 서버 💎', gem2?.total, '| 정식 칸 남음 earned', gem2?.earned, 'log', !!gem2?.log?.join_x, '| buy', JSON.stringify(gem2?.buy));
  if (!acc2 || acc2.uid === 'OLDUID5' || acc2.reset || acc2.hero !== 4) errs.push('잇기');
  if (gem2?.total !== 321 || gem2?.earned !== 400 || !gem2?.log?.join_x) errs.push('💎 칸 지킴');
  await p.screenshot({ path: `${SHOTS}/b40-copy-camp.png` });
  await b.close();
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
})();
