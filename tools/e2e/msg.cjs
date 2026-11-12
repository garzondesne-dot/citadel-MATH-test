// #130 소식 답장 · 💎 · 메시지 · 준비 안 된 차시 ＋ (360 × 640)
//   ⑫ 점선 ＋ 칸 → ⑰ 준비 탭 그 차시 · 스크롤 0 · 주요 단추 바닥 74
//   ⑱ 받은 것: 💬 학생 메시지 펼침(금빛 테) → 빠른 답 → 💎 10 → 보내기 → 「↩ 답함」 · 빨간 점 빠짐 → 그 학생 캠프 알림 · 💎
//   ⑱ 보내기: 📮 반 전체 「보내기 · 1-3반 n명」(열려 있는 학생 캠프에 바로 알림) · 학생 고르기(다른 반 섞기 · 칩 ✕)
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/msg.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const errs = [], log = (...a) => console.log(...a);
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  const watch = (q) => { q.on('pageerror', (e) => errs.push(String(e))); q.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); return q; };
  const p = watch(await ctx.newPage());
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const shot = (q, n) => q.screenshot({ path: `${SHOTS}/${n}-360.png` });
  const fixed = async (name) => { const r = await p.evaluate(() => ({ doc: document.scrollingElement.scrollHeight - innerHeight, mid: (() => { const m = document.querySelector('.mid'); return m.scrollHeight - m.clientHeight; })(), btn: (() => { const e = document.querySelector('.tact .btn'); return e ? Math.round(innerHeight - e.getBoundingClientRect().bottom) : null; })() })); if (r.doc > 0) errs.push(`${name}: 문서 스크롤 ${r.doc}`); return r; };
  // ⑫ 점선 ＋
  const r12 = await fixed('⑫'); if (r12.mid > 0) errs.push(`⑫ 가운데 넘침 ${r12.mid}`); if (r12.btn !== 74) errs.push(`⑫ 주요 단추 바닥 ${r12.btn}`);
  const cells = await p.$$eval('.pk3 .pk', (bs) => bs.map((x) => `${x.classList.contains('add') ? '＋' : '▣'}${x.textContent.trim()}`));
  log('⑫ 차시 칸:', cells.join(' | '), '| 가운데 넘침', r12.mid, '| 주요 단추 바닥', r12.btn);
  const dash = await p.$eval('.pk.add', (e) => getComputedStyle(e).borderStyle + ' ' + getComputedStyle(e).borderWidth);
  log('   점선 칸 테두리:', dash); if (!dash.startsWith('dashed 2px')) errs.push('⑫ 점선 2px 아님');
  await shot(p, 'b14-home');
  await p.click('.pk.add >> nth=0'); await p.waitForTimeout(200);
  const r17 = await fixed('⑰');
  log('   ＋ 누름 → 탭', (await p.textContent('.tabs button.on')).trim(), '| 차시 ▾', await p.$eval('.lsel select', (s) => s.options[s.selectedIndex].text), '|', (await p.textContent('.mid .empty')).replace(/\s+/g, ' ').trim(), '| 주요 단추', (await p.textContent('.tact .btn')).trim(), await p.$eval('.tact .btn', (e) => e.disabled), r17.btn);
  await shot(p, 'b14-prep-todo');
  // 고르기는 안 됨: 수업 탭으로 돌아가도 고른 차시 없음
  await p.click('.tabs button:has-text("수업")'); log('   돌아와 고른 차시:', (await p.$$('.pk3 .pk.on')).length);
  // 학생 1-3 3번 캠프를 열어 둠 (반 전체 메시지가 바로 와야 함)
  const s3 = watch(await ctx.newPage());
  await s3.goto(B); await s3.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-3', num: 3 }))); await s3.reload(); await s3.waitForTimeout(600);
  // ⑱ 받은 것
  await p.click('.tabs button:has-text("소식")'); await p.waitForTimeout(150);
  const rd0 = (await p.textContent('.tabs .rdot')).trim();
  await p.click('.nb:has-text("박쥐")'); await p.waitForTimeout(150);
  log('⑱ 펼침:', (await p.textContent('.nw.opn .who')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.nw.opn .bub')).trim(), '| 테', await p.$eval('.nw.opn', (e) => getComputedStyle(e).boxShadow.slice(0, 40)), '| 접기', !!(await p.$('.nw.opn .fold')) , '| 빨간 점', rd0, '→', (await p.textContent('.tabs .rdot').catch(() => '0')).trim());
  log('   빠른 답:', await p.$$eval('.qk button', (bs) => bs.map((x) => x.textContent.trim()).join(' · ')));
  await p.click('.qk button:has-text("고칠게")'); await p.click('.rw .gm'); await p.click('.gms button:has-text("10")');
  const rw = await p.$$eval('.rw > *', (es) => es.map((e) => Math.round(e.getBoundingClientRect().height)));
  log('   [쓰기 | 💎 | 보내기] 높이', rw.join('/'), '| 쓰기 칸', await p.inputValue('.rw input'), '| 💎', (await p.textContent('.rw .gm')).trim());
  await shot(p, 'b14-reply');
  await p.click('.rw .snd'); await p.waitForTimeout(150);
  log('   보냄:', (await p.textContent('.toast')).trim(), '| 줄', (await p.textContent('.nb:has-text("박쥐") small')).trim());
  // ⑱ 보내기 · 반 전체
  await p.click('.seg button:has-text("보내기")'); await p.selectOption('.card select >> nth=0', '1-3');
  await p.fill('.card textarea >> nth=0', '내일 6차시 형성평가 있어요'); await p.click('.gms button:has-text("5") >> nth=0');
  log('⑱ 반 전체 단추:', (await p.textContent('.card .row .b1 >> nth=0')).trim(), '·', (await p.textContent('.card .row .b2 >> nth=0')).trim());
  await shot(p, 'b14-send-cls');
  await p.click('.card .row .b1 >> nth=0'); await p.waitForTimeout(500);
  log('   보냄:', (await p.textContent('.toast')).trim(), '| 1-3 3번 캠프 알림:', (await s3.textContent('.gtoast').catch(() => '(없음)')).trim());
  await shot(s3, 'b14-student-msg');
  // ⑱ 보내기 · 학생 고르기 (다른 반 섞기)
  await p.click('.seg.sm button:has-text("학생 고르기")');
  await p.click('.nums button >> nth=2'); await p.click('.nums button >> nth=4');
  await p.selectOption('.card select >> nth=0', '1-5'); await p.click('.nums button >> nth=0');
  log('⑱ 받는 사람 칩:', await p.$$eval('.tos button', (bs) => bs.map((x) => x.textContent.trim()).join(' | ')), '| 단추', (await p.textContent('.card .row .b1 >> nth=0')).trim());
  await p.click('.tos button >> nth=1'); log('   ✕ 한 명 →', (await p.textContent('.card .row .b1 >> nth=0')).trim());
  await p.fill('.card textarea >> nth=0', '오답노트 확인해 줘'); await shot(p, 'b14-send-pick');
  await p.click('.card .row .b1 >> nth=0'); await p.waitForTimeout(200); log('   보냄:', (await p.textContent('.toast')).trim());
  const nw = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0).length);
  if (nw) errs.push(`⑱ 가로 넘침 ${nw}`);
  // 답장 받은 학생 (1-2 4번) 캠프 → 알림 · 💎 지갑
  const s4 = watch(await ctx.newPage());
  await s4.goto(B); await s4.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-2', num: 4 }))); await s4.reload(); await s4.waitForTimeout(700);
  log('1-2 4번 캠프 알림:', (await s4.textContent('.gtoast').catch(() => '(없음)')).trim());
  const got = await s4.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('mail/s1_2_4') && k.endsWith('/got') || (k.includes('mail/s1_2_4') && localStorage.getItem(k).includes('"got":true'))).length);
  log('   읽음 표시', got);
  await shot(s4, 'b14-student-reply');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
