// 📊 한눈에 표 · 🏆 랭킹 (에뮬레이터 · 📜 2026-11-15 머리 🔨): 정식 칸 · 칸 제목 누르면 정렬(▼ → ▲) · 📥 CSV · 랭킹 판 6개 · 같은 값 = 같은 등수
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  await rest('', 'PATCH', {
    roster: { '1-3': { 5: '시험오', 6: '시험육', 7: '시험칠' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육', 7: '시*칠' } },
    records: { '1-3': { 5: { 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 2, bossN: 6, bossM: 'ooxxxx', mons: { m1: 'x', m2: 'x', m3: 'o', u4: 'o', u5: 'o', u6: 'o', u7: 'o' }, ox: [1, 4] } },
      6: { 'set-06': { no: 6, conc: { c1: [4, 4] }, boss: 6, bossN: 6, bossM: 'oooooo', mons: { m1: 'o', m2: 'o', m3: 'o', u4: 'o', u5: 'o', u6: 'o', u7: 'o' }, ox: [4, 4], lad: { u4: 4 } } },
      7: { 'set-06': { no: 6, conc: { c1: [3, 4] }, boss: 5, bossN: 6, bossM: 'ooooox', mons: { m1: 'o', m2: 'x', m3: 'o', u4: 'o', u5: 'o', u6: 'o', u7: 'o' } } } } },
    cards: { '1-3': { 6: { sub: true } } },
  });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800);
  await p.click('.grp button:has-text("누가 도움이")'); await p.waitForTimeout(300); await p.click('.vws button:has-text("한눈에 표")'); await p.waitForTimeout(800);
  const head = await p.$$eval('thead th', (x) => x.map((e) => e.textContent.trim()));
  ok('정식 칸 (번호 · 이름 한 칸 + 차시 1 + 13)', head.length === 15 && head[2] === '❗ 남은 문제' && head[14] === 'Lv', head.join(' | '));
  const names = () => p.$$eval('tbody tr td:first-child', (x) => x.map((e) => e.textContent.trim()));
  await p.click('thead th:nth-child(4) [data-k="sort"]'); await p.waitForTimeout(300); // 참여? → 형성평가 칸으로
  const hi = head.indexOf('형성평가') + 1;
  await p.click(`thead th:nth-child(${hi}) [data-k="sort"]`); await p.waitForTimeout(300);
  const d1 = await names(); ok('형성평가 ▼ = 육(100) · 칠(83) · 오(33)', /육/.test(d1[0]) && /칠/.test(d1[1]) && /오/.test(d1[2]), d1.join(' | '));
  await p.click(`thead th:nth-child(${hi}) [data-k="sort"]`); await p.waitForTimeout(300);
  const d2 = await names(); ok('다시 누르면 ▲ = 오 · 칠 · 육', /오/.test(d2[0]) && /육/.test(d2[2]), `${d2.join(' | ')} · ${await p.textContent(`thead th:nth-child(${hi})`)}`);
  await p.screenshot({ path: `${SHOTS}/grid.png`, fullPage: true });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-k="csv"]')]);
  const txt = require('fs').readFileSync(await dl.path(), 'utf8');
  ok('📥 CSV = 머리줄 + 3명', /남은 문제\(오답노트\)/.test(txt) && /전환 뒤 💎/.test(txt) && txt.trim().split('\n').length === 4);
  await p.click('.vws button:has-text("랭킹")'); await p.waitForTimeout(800);
  const bd = await p.$$eval('[data-k="board"] h4', (x) => x.map((e) => e.firstChild.textContent.trim()));
  const first = await p.$$eval('[data-k="board"]:first-child li', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('🏆 랭킹 판 6개 · 형성평가 1등 = 육 100%', bd.length === 6 && /^16번 시험육100%/.test(first[0]), `${bd.join(',')} · ${first.join(' | ')}`);
  await p.screenshot({ path: `${SHOTS}/rank.png`, fullPage: true });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
