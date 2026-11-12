// #137 시험 서버(Firebase 에뮬레이터) 한 판 — 브라우저 5개가 저장을 나누지 않음(창마다 따로) = 서버로만 맞물림
//   리모컨(교사 폰) · 교실 TV · 학생 폰 3 (폰 1 = 첫 화면에서 가입 = Firebase 로그인)
//   대기실 3명 → 시작 → 문제 1 정찰 → 폰 3대 제출(2 맞힘 · 1 틀림) → 리모컨 · TV · 폰 체력 같음 → 폰 3 끊었다 다시 → 집중(폰 덮개) → 💎 선물(폰 알림)
//   → 형성평가 1번 → 마무리 → 수업 닫기 → ⏯ 이어서 기억(서버) → 리모컨 새로 고침해도 그대로
// 사용: (1) 에뮬레이터: cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
//       (2) npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/server.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = `http://127.0.0.1:9000`;
const rest = (path, method = 'GET', body) => fetch(`${DBU}/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const A1 = [{ chips: ['5', '6'] }, { chips: ['5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }];
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE'); // 에뮬레이터 비움
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; }
  await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [];
  const open = async (url, w = 360, h = 640) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); p.on('console', (m) => { if (m.type() === 'error') errs.push(`${url}: ${m.text()}`); }); await p.goto(B + url); return p; };
  // 리모컨: 1-3반 · 6차시 · 🧪 테스트로 열기
  const t = await open(`?role=teacher${E}`); await t.waitForSelector('.tabs', { timeout: 20000 });
  log('리모컨 표시:', (await t.textContent('.srv')).trim());
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(800);
  const live = await rest('school/live'); log('서버 school/live:', JSON.stringify(live));
  const tv = await open(`?role=hall${E}`, 1280, 720); await tv.waitForTimeout(1500);
  // 폰 1 = 가입(Firebase 로그인) → 그 다음 방으로 · 폰 2 · 3 = 반 · 번호로 바로
  const p1 = await open(`${E.replace('&', '?')}`); await p1.waitForSelector('select', { timeout: 15000 });
  await p1.selectOption('select >> nth=0', '1-3'); await p1.waitForTimeout(200); await p1.selectOption('select >> nth=1', '1'); await p1.waitForTimeout(300);
  await p1.click('.links button:has-text("가입")'); await p1.waitForTimeout(200);
  await p1.click('button.pw >> nth=0'); for (const d of '1234') await p1.click(`.pad .keys button:has-text("${d}")`);
  await p1.waitForTimeout(200); if (await p1.$('.pad')) for (const d of '1234') await p1.click(`.pad .keys button:has-text("${d}")`);
  await p1.waitForTimeout(200); await p1.click('.title .pmain'); await p1.waitForTimeout(2500);
  log('폰 1 가입 뒤 화면:', (await p1.textContent('body')).replace(/\s+/g, ' ').slice(0, 60));
  const acc = await rest('accounts/1-3/1'); log('가입 → 서버 accounts/1-3/1:', JSON.stringify(acc), '| 비밀번호 칸 없음', acc && !('pw' in acc));
  if (!acc || !acc.uid || 'pw' in acc) errs.push('가입이 서버 계정(uid · 비밀번호 없음)으로 안 됨');
  const phones = [p1, await open(`?role=student&room=${live.code}&as=1-3:2${E}`), await open(`?role=student&room=${live.code}&as=1-3:3${E}`)];
  await p1.goto(`${B}?role=student&room=${live.code}&as=1-3:1${E}`);
  await t.waitForTimeout(2500);
  const lobbyT = (await t.textContent('.mid')).replace(/\s+/g, ' '); log('리모컨 대기실:', (/(\d+)\s*\/\s*\d+\s*(명|들어옴)?/.exec(lobbyT) || [''])[0], '|', lobbyT.slice(0, 80));
  await t.screenshot({ path: `${SHOTS}/b20-remote-lobby.png` }); await tv.screenshot({ path: `${SHOTS}/b20-tv-lobby.png` });
  // 시작 → 개념 1 → 문제 1 (정찰 → 등장)
  const main = async () => { await t.waitForSelector('.tact .btn:not([disabled])'); await t.click('.tact .btn'); await t.waitForTimeout(500); };
  await main(); await main(); await main(); // 시작 · 개념 1 → 문제 1 · 지금 등장
  await t.waitForTimeout(800);
  const answer = async (p, ans, wrong) => {
    for (let i = 0; i < ans.length; i++) {
      await p.click(`.row .cell:nth-child(${i + 1})`).catch(() => {});
      const item = await p.$('.bcard .item');
      if (wrong) { const c = await item.$('.chip'); await c.click(); } else for (const c of await item.$$('.chip')) if (ans[i].chips.includes((await c.textContent()).trim())) await c.click();
    }
    await p.waitForFunction(() => { const g = document.querySelector('.act .btn'); return g && !g.disabled; }, null, { timeout: 10000 }); await p.click('.act .btn'); await p.waitForTimeout(400);
  };
  for (const p of phones) await p.waitForSelector('.bcard .item', { timeout: 15000 });
  await Promise.all([answer(phones[0], A1, false), answer(phones[1], A1, false), answer(phones[2], A1, true)]); // 동시에 제출
  await t.waitForTimeout(1500);
  const hpT = (await t.textContent('.hpl small')).trim(), subs = await rest(`rooms/${live.code}/subs/m1`);
  const hpP = await Promise.all(phones.map((p) => p.textContent('.edge').then((x) => (/체력\s*([\d]+\s*\/\s*\d+)/.exec(x) || ['', '?'])[1]).catch(() => '?')));
  const hpTV = await tv.evaluate(() => window.__arena?.hp || '?');
  log('문제 1 제출 → 서버 subs:', Object.keys(subs || {}).length, '명 | 리모컨', hpT, '| TV', hpTV, '| 폰', hpP.join(' · '));
  await t.screenshot({ path: `${SHOTS}/b20-remote-m1.png` }); await tv.screenshot({ path: `${SHOTS}/b20-tv-m1.png` }); await phones[2].screenshot({ path: `${SHOTS}/b20-phone3-m1.png` });
  // 폰 3 끊었다 다시 들어오기 (창 닫기 → 새 창 · 같은 학생)
  const c3 = phones[2].context(); await c3.close();
  await t.waitForTimeout(500);
  const p3 = await open(`?role=student&room=${live.code}&as=1-3:3${E}`); phones[2] = p3; await p3.waitForTimeout(2500);
  const back = await p3.$$eval('.row .cell', (cs) => cs.map((c) => (c.className.match(/\b(ok|bad|oldbad|keep)\b/) || ['-'])[0]).join(''));
  log('폰 3 다시 들어옴 → 지난 답 칸 상태:', back || '(없음)');
  // 집중 · 💎 선물(모두)
  await t.click('.rdock button:has-text("집중")'); await t.waitForTimeout(1200);
  const cover = await Promise.all(phones.map((p) => p.$('.focus, .cover, [class*="focus"]').then((x) => !!x)));
  log('🔴 집중 → 폰 덮개:', cover.join(' · '));
  await phones[0].screenshot({ path: `${SHOTS}/b20-phone1-focus.png` });
  await t.click('.rdock button:has-text("집중")'); await t.waitForTimeout(600);
  await t.click('.rdock button:has-text("선물")'); await t.click('.gquick button:has-text("모두")'); await t.click('.sheet .act .btn'); await t.waitForTimeout(1200);
  const gift = await Promise.all(phones.map((p) => p.$eval('.gift', (x) => x.textContent.trim()).catch(() => '(없음)')));
  log('💎 선물(모두) → 폰 알림:', gift.join(' | '), '| TV', await tv.$eval('.gift', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '(없음)'));
  // 수업 중간(문제 1)에 닫기 → 서버에 그 자리 → 리모컨 새로 고침해도 ⏯ → 이어서 열기 → 형성평가 → 마무리
  await t.click('.lbar button:has-text("수업 닫기")'); await t.click('.ask .btn'); await t.waitForTimeout(800);
  const stop = await rest(`rooms/${live.code}/state/stop`), lastT = await rest('school/lastTest/1-3');
  log('중간에 닫기 → 서버 stop:', JSON.stringify(stop), '| lastTest:', JSON.stringify(lastT && { lesson: lastT.lesson, done: lastT.done }));
  await t.reload(); await t.waitForSelector('.tabs', { timeout: 15000 }); await t.click('.tt:not([disabled])'); await t.waitForTimeout(400);
  const it = (await t.textContent('.mid .item')).replace(/\s+/g, ' ').trim(); log('리모컨 새로 고침 뒤 ⑫:', it);
  if (!it.includes('이어서')) errs.push('서버에서 ⏯ 이어서 안 뜸');
  await t.screenshot({ path: `${SHOTS}/b20-remote-resume.png` });
  await t.click('.mid .item'); await t.waitForTimeout(800);
  const live2 = await rest('school/live');
  for (const [k, p] of phones.entries()) await p.goto(`${B}?role=student&room=${live2.code}&as=1-3:${k + 1}${E}`);
  await t.waitForTimeout(2000); await main();
  log('이어서 연 수업:', ((await t.textContent('.mid')).match(/지금 · ([^🌫]+?)(?:🌫|\d+\s*\/|$)/) || ['', '?'])[1].trim(), '| 새 방', live2.code !== live.code);
  for (let k = 0; k < 25; k++) { const m = (await t.textContent('.tact .btn')).trim(); if (/수업 닫기/.test(m)) break; await main(); }
  log('마무리: 리모컨', (await t.textContent('.tact .btn')).trim(), '| TV 끝 화면', !!(await tv.$('.endv')), '| 폰 1', (await phones[0].textContent('body')).replace(/\s+/g, ' ').slice(0, 40));
  await tv.screenshot({ path: `${SHOTS}/b20-tv-end.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${[...new Set(errs)].slice(0, 15).join('\n')}` : '✅ 오류 0');
  await b.close();
})();
