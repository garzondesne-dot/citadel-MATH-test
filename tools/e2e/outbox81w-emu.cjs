// 🐞 11/21 버그 사냥 · #81 보관함 × 11/20 지갑 더하기(add = increment · tx) — 에뮬레이터
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); await p.waitForTimeout(2500); return p; };
  let p = await open();
  await p.waitForSelector('select'); await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '1'); await p.waitForTimeout(200);
  await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  await p.waitForFunction(() => !!window.__ds, null, { timeout: 15000 });
  const ds = (fn, a) => p.evaluate(fn, a);
  const W = async () => ({ total: await rest('gem/1-3/1/total'), xp: await rest('xp/1-3/1/total'), log: Object.keys((await rest('gem/1-3/1/log')) || {}) });
  await rest('gem/1-3/1', 'PATCH', { total: 100 }); await rest('xp/1-3/1', 'PATCH', { total: 300 }); await wait(1500);
  // W1 끊김 → 보상(수업 보상 · 허수아비와 같은 꼴: log = set · total = add) → 끊긴 채 앱 닫기 → 다시 열기
  await ds(() => { const d = window.__ds; d.off(); d.S.set('gem/1-3/1/log/raid_W1', { g: 16, at: Date.now(), why: '레이드' }); d.S.add('gem/1-3/1/total', 16); d.S.set('xp/1-3/1/log/raid_W1', { xp: 40, at: Date.now(), why: '레이드' }); d.S.add('xp/1-3/1/total', 40); });
  await wait(1500); const n1 = await ds(() => window.__ds.S.outbox.count());
  await p.close(); p = await open(); await wait(8000);
  const w1 = await W();
  log('   W1 보관함 줄', n1, '→ 다시 연 뒤 서버', JSON.stringify(w1));
  ok('W1 끊긴 채 닫았다 열기 = 💎 log 와 total 이 같이 (log 있는데 total 100 그대로 = 보상 사라짐)', w1.log.includes('raid_W1') ? w1.total === 116 && w1.xp === 340 : true, JSON.stringify(w1));
  // W2 끊김 → 보상 → 같은 세션에서 다시 이음 = 한 번만
  await rest('gem/1-3/1/total', 'PUT', 100); await rest('xp/1-3/1/total', 'PUT', 300); await wait(1500);
  await ds(() => { const d = window.__ds; d.off(); d.S.set('gem/1-3/1/log/raid_W2', { g: 16, at: Date.now(), why: '레이드' }); d.S.add('gem/1-3/1/total', 16); });
  await wait(1500); await ds(() => window.__ds.on()); await wait(6000);
  const w2 = await W(); ok('W2 끊김 → 같은 세션 다시 이음 = total 한 번만 더함 (116)', w2.total === 116, JSON.stringify(w2));
  // W3 두 폰: A 끊김 +16 · 그동안 B(서버) +10 → A 다시 이음
  await rest('gem/1-3/1/total', 'PUT', 100); await wait(1500);
  await ds(() => { const d = window.__ds; d.off(); d.S.add('gem/1-3/1/total', 16); });
  await rest('gem/1-3/1/total', 'PUT', 110); // 다른 폰이 +10
  await ds(() => window.__ds.on()); await wait(6000);
  const w3 = await W(); ok('W3 두 폰: 끊긴 A +16 · 온라인 B +10 → 126', w3.total === 126, JSON.stringify(w3));
  // W4 끊김 → 수업 기록 줄(통째로 set) → 닫고 열기 = 서버 그대로 + 합침
  await rest('records/1-3/1/set-06', 'PUT', { at: 1, boss: 2, bossN: 5, mons: { m1: 'x' }, code: 'OLD' }); await wait(1500);
  await ds(() => { const d = window.__ds; d.off(); d.S.set('records/1-3/1/set-06', { at: 2, boss: 4, bossN: 5, mons: { m1: 'o', m2: 'o' }, code: 'NEW' }); });
  await wait(1000); await p.close(); p = await open(); await wait(8000);
  const r4 = await rest('records/1-3/1/set-06'); ok('W4 끊긴 채 닫은 수업 기록 = 다시 열면 올라감 (boss 4)', r4 && r4.boss === 4, JSON.stringify(r4));
  // W5 지갑 화면(캠프) 열린 채 끊김 → 캠프가 저장(me.save) → 다시 이음 = 서버 total 줄지 않음
  await rest('gem/1-3/1/total', 'PUT', 200); await p.reload(); await wait(6000);
  const before = await rest('gem/1-3/1/total');
  await ds(() => { const d = window.__ds; d.off(); d.S.add('gem/1-3/1/total', 5); });
  await rest('gem/1-3/1/total', 'PUT', before + 50); // 그동안 교사 선물이 서버에 직접 (+50)
  await ds(() => window.__ds.on()); await wait(6000);
  const w5 = await rest('gem/1-3/1/total'); ok('W5 캠프 열린 채 끊김 +5 · 그동안 서버 +50 → 255 (줄지 않음)', w5 === before + 55, `${before} → ${w5}`);
  // W6 우편 선물 「받기」를 끊긴 채 누름 (claimOnce = transaction) → 10초 → 다시 이음
  await rest('gifts/s1_3_1/w6', 'PUT', { g: 30, at: Date.now(), fun: 'W6 선물', got: false, hold: true }); await rest('gem/1-3/1/total', 'PUT', 300);
  await p.reload(); await wait(6000);
  await p.click('[data-prop="mail"]').catch(() => {}); await p.waitForSelector('[data-claim="w6"]', { timeout: 15000 }).catch(() => {});
  await ds(() => window.__ds.off()); await p.click('[data-claim="w6"]').catch(() => {}); await wait(10500);
  const toast6 = (await p.textContent('[data-k="mailbox"] .toast').catch(() => '')) || '';
  await ds(() => window.__ds.on()); await wait(7000);
  const g6 = await rest('gifts/s1_3_1/w6/got'), t6 = await rest('gem/1-3/1/total');
  log('   W6 화면 알림:', toast6.trim(), '· 서버 got', g6, '· 💎', t6);
  ok('W6 끊긴 채 받기 = 선물 got 이면 💎 도 +30 (got 인데 💎 300 = 선물 사라짐)', g6 === true ? t6 === 330 : true, `got ${g6} · 💎 ${t6} · 「${toast6.trim()}」`);
  ok('W6 끊긴 채 받기 알림 ≠ 「이미 받은 선물」 (아직 못 받았는데 이미 받았다고 함)', !/이미 받은/.test(toast6), toast6.trim());
  // W7 (🐞 #83-12) 끊김 → 상점에서 사기(💎 −20 = 더하기 · 산 것 = 합치기) → 끊긴 채 닫기 → 다시 열기 = 산 것 · 💎 같이 · 다른 폰이 그새 산 것도 남음
  const t7 = await rest('gem/1-3/1/total');
  await ds(() => { const d = window.__ds; d.off(); d.S.add('gem/1-3/1/total', -20); d.S.merge('gem/1-3/1/buy', [{ id: 'hero-w7', ver: 1, at: Date.now() }], 'buys'); });
  await wait(1200); await p.close();
  await rest('gem/1-3/1/buy', 'PUT', [{ id: 'other-w7', ver: 1, at: 1 }]); // 다른 폰이 그새 산 것
  p = await open(); await wait(8000);
  const b7 = (await rest('gem/1-3/1/buy')) || [], ids7 = Object.values(b7).map((x) => x.id), t7b = await rest('gem/1-3/1/total');
  ok('W7 끊긴 채 사고 닫았다 열기 = 산 것 + 💎 −20 같이 · 다른 폰 산 것도 그대로', ids7.includes('hero-w7') && ids7.includes('other-w7') && t7b === t7 - 20, `산 것 ${ids7.join(',')} · 💎 ${t7} → ${t7b}`);
  await b.close(); log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
