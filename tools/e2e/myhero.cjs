// b7 내 용사 시트 한 바퀴 (360px): 캠프 → 내 용사 → 강화 고름 · 스킬 고름 · 기록 · 호칭 · 용사 바꾸기(사기 · 출전) → 💾 저장(확인 1번) → 다시 열어도 그대로 · 저장 안 하고 닫기 = 한 번 물음
// 사용: npm run build → npx vite preview --port 4173 → node tools/e2e/myhero.cjs <그림 저장 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const base = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const errs = [];
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const log = (...a) => console.log(...a);
  const t = async (sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const over = async (w) => { const o = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.mh .body, .sheet .body')].map((x) => x.scrollWidth)) - innerWidth); if (o > 0) errs.push(`가로 넘침 ${o}px · ${w}`); };
  const small = async (w) => { const s = await p.$$eval('.mh button, .sheet button', (bs) => bs.filter((x) => x.offsetParent && !x.closest('.grid') && (x.getBoundingClientRect().height < 44)).map((x) => `${(x.getAttribute('aria-label') || x.textContent).trim().slice(0, 12)}:${Math.round(x.getBoundingClientRect().height)}`)); if (s.length) errs.push(`누름 칸 작음 ${w}: ${s.join(' ')}`); };
  const gold = async (w) => { const n = await p.$$eval('.mh .btn, .sheet .btn', (bs) => bs.filter((x) => x.offsetParent && !x.disabled).length); if (n > 1) errs.push(`금빛 단추 ${n}개 · ${w}`); return n; };
  await p.goto(base + '?role=camp&room=MH'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.stage');
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh');
  log('맨 위 카드:', await t('.mh .top'), '| 탭 점', await p.$$eval('.tabs button', (bs) => bs.map((x) => `${x.textContent.trim()}${x.querySelector('.bdot') ? '•' : ''}`).join(' ')));
  // ① 강화
  log('강화 탭:', await t('.enhbox'), '| 주요 단추', await t('.mh .act .main'), '| 금빛', await gold('강화'));
  await p.screenshot({ path: `${SHOTS}/b7-enh-360.png` }); await over('강화'); await small('강화');
  await p.click('.mh .act .main'); await p.waitForTimeout(150);
  log('강화 고름 뒤:', await t('.enhbox .muted'), '| 막대', await t('.savebar'), '| 주요', await t('.mh .act .main'), '| 💎', await t('.mh .bar .pill'), '| 금빛', await gold('강화 고름'));
  await p.screenshot({ path: `${SHOTS}/b9-enh-dirty-360.png` });
  // ② 스킬
  await p.click('.tabs button:nth-child(2)'); await p.waitForTimeout(150);
  log('스킬 탭 안내:', (await p.$('.tip')) ? await t('.tip') : '(없음)', '| 칸', await p.$$eval('.lr', (ls) => ls.map((x) => `${x.querySelector('b').textContent}[${[...x.classList].filter((c) => !/svelte|lr/.test(c))}] ${x.querySelector('small').textContent}`).join(' / ')));
  await p.click('.lr:nth-child(2)'); await p.waitForTimeout(250);
  log('Ⅱ 고름:', await p.$$eval('.lr', (ls) => ls.map((x) => `${x.querySelector('b').textContent}[${[...x.classList].filter((c) => !/svelte|lr/.test(c))}]`).join(' ')), '| 미리 보기', (await p.$('.prev')) ? await t('.prev') : '없음');
  await p.screenshot({ path: `${SHOTS}/b7-skill-pick-360.png` }); await over('스킬'); await small('스킬'); await gold('스킬');
  await p.click('.lr:nth-child(4)'); await p.waitForTimeout(150); log('Ⅳ 누름(잠김):', (await p.$('.toast')) ? await t('.toast') : '');
  await p.waitForTimeout(1700); log('미리 보기 1.6초 뒤:', (await p.$('.prev')) ? '남음' : '사라짐');
  // ③ 기록 · 호칭
  await p.click('.tabs button:nth-child(3)'); await p.waitForTimeout(150);
  log('기록 탭:', await t('.tiles'), '|', await t('.stats'), '|', await t('.mh .body .row'), '|', await t('.mh .body > .muted'));
  await p.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 4000 }); await p.screenshot({ path: `${SHOTS}/b7-record-360.png` }); await over('기록'); await small('기록');
  await p.click('.mh .body .row'); await p.waitForSelector('.sheet'); log('호칭 시트:', (await p.$$('.tp:not(.lock)')).length, '개 얻음 (테스트 = 모두)');
  await p.click('.tp:has-text("새벽의 개척자")'); await p.waitForTimeout(150); log('호칭 고름 뒤 카드:', await t('.mh .top .nm'));
  // ④ 용사 바꾸기
  await p.click('.mh .top'); await p.waitForSelector('.hsw');
  log('용사 바꾸기 시트: 위', await p.evaluate(() => Math.round(document.querySelector('.hsw').getBoundingClientRect().top)), '| 내 카드 아래', await p.evaluate(() => Math.round(document.querySelector('.mh .top').getBoundingClientRect().bottom)), '| 칸', (await p.$$('.swc')).length, '| 출전 중', await t('.swc.cur'));
  await p.click('.swc[aria-label*="연금술사"]'); await p.waitForTimeout(150);
  log('상세:', await t('.swd'), '| 단추', await t('.hsw .main'));
  await p.screenshot({ path: `${SHOTS}/b9-hero-switch-360.png` }); await over('용사 바꾸기');
  await p.click('.hsw .main'); await p.waitForTimeout(100); log('사기 고름 뒤 단추:', await t('.hsw .main'));
  await p.click('.hsw .main'); await p.waitForTimeout(150); log('출전 고름 뒤 카드:', await t('.mh .top .sub'), '| 막대', await t('.savebar .chg2'));
  // 💾 저장
  await p.click('.mh .act .main'); await p.waitForSelector('.ask'); log('확인:', await t('.askbox'));
  await p.click('.askbox .btn'); await p.waitForTimeout(250); log('저장 뒤:', await t('.mh .act .main'), '| 막대', (await p.$('.savebar')) ? '남음' : '없음', '| 💎', await t('.mh .bar .pill'));
  await p.waitForTimeout(1000); log('1초 뒤:', await t('.mh .act .main'));
  await p.click('.mh .back'); await p.waitForTimeout(150); await p.reload(); await p.waitForSelector('.stage');
  log('다시 열기(캠프 카드):', await t('.hero-card'), '| 사다리', await p.$$eval('.rung', (rs) => rs.map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' / ')));
  // 저장 안 하고 닫기
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh'); await p.click('.mh .act .main'); await p.click('.mh .back'); await p.waitForTimeout(100);
  log('저장 안 하고 닫기:', (await p.$('.ask')) ? await t('.askbox') : '물음 없음'); await p.click('.askbox .btn2'); await p.waitForTimeout(100); log('버리기 뒤:', (await p.$('.mh')) ? '창 남음' : '닫힘');
  // 전투 장면 = 고른 용사
  log('오류', errs);
  await b.close();
})();
