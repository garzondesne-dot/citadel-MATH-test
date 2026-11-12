// #124 교사 아래 탭 4개 · #125 대시보드 한 바퀴 (360 × 640 · 1280 × 800)
//   스크롤 A = 위 막대 · 전환 칸 · 아래 탭 고정 + 가운데만 넘김 / 학생 시트 / 명단 붙여넣기 / 준비 기본값 → 수업 열 때 방에 / 소식 읽음 → 빨간 점 줄어듦 / 대시보드 보기 12개 · 전체 · 엑셀 받기
// 사용: npm run build → npx vite preview --port 4173 → LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/e2e/tabs.cjs <그림 폴더>  (LC_ALL 없으면 시험 브라우저가 한글 파일 이름을 「download」로 바꿈 · 앱 문제 아님)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'ko_KR.UTF-8', LC_ALL: 'C.UTF-8' } }); // 한글 파일 이름 = UTF-8 언어 설정 필요(없으면 받은 이름이 「download」 · 실제 폰과 상관없음)
  const errs = [], log = (...a) => console.log(...a);
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const tab = async (t) => { await p.click(`.tabs button:has-text("${t}")`); await p.waitForTimeout(150); };
  const fixedOk = async (name) => { const r = await p.evaluate(() => ({ doc: document.scrollingElement.scrollHeight - innerHeight, tabs: Math.round(document.querySelector('.tabs').getBoundingClientRect().bottom), h: innerHeight })); if (r.doc > 0 || r.tabs !== r.h) errs.push(`${name}: 문서 스크롤 ${r.doc} · 탭 바닥 ${r.tabs}/${r.h}`); };
  const shot = (n) => p.screenshot({ path: `${SHOTS}/${n}-360.png` });
  // ⑯ 학생
  await tab('학생'); await fixedOk('⑯ 학생');
  log('⑯ 반 칩:', await p.$$eval('.chips button', (bs) => bs.map((x) => x.textContent.trim()).join(' ')), '| 칸', (await p.$$('.pc')).length);
  await p.$eval('.mid.scroll', (e) => e.scrollTo(0, 999)); await fixedOk('⑯ 명단 넘김'); await shot('b11-pupils');
  await p.click('.pc >> nth=2'); await p.waitForSelector('.ps'); log('👤 시트:', (await p.textContent('.ps .hd')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.four')).replace(/\s+/g, ' ').trim().slice(0, 90));
  await p.click('.acts button:has-text("세특")'); log('📝 세특:', (await p.textContent('.memo')).trim().slice(0, 50), '…'); await shot('b11-pupil-sheet');
  await p.click('.pop .b2'); await p.click('.ps .x');
  await p.click('.plus'); await p.fill('.ta', '1 홍길동\n16 새친구'); await p.click('.sheet .act .btn'); await p.waitForTimeout(200);
  log('＋ 명단:', (await p.textContent('.toast')).trim(), '| 1번', (await p.textContent('.pc >> nth=0')).replace(/\s+/g, ' ').trim(), '| 칸', (await p.$$('.pc')).length);
  // ⑳ 대시보드 (폰)
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(200); await fixedOk('⑳ 대시보드');
  log('⑳ 반 칩:', await p.$$eval('.chips button', (bs) => bs.slice(0, 3).map((x) => x.textContent.trim()).join(' ')), '| 기본 보기', (await p.textContent('.vh b')).trim());
  const views = [];
  for (let g = 0; g < 3; g++) { await p.click(`.grp button >> nth=${g}`); for (const v of await p.$$('.vws button:not([disabled])')) { await v.click(); await p.waitForTimeout(60); views.push((await p.textContent('.vh b')).trim()); } }
  log('⑳ 반 보기:', views.join(' · '));
  await p.click('.chips button:has-text("전체")'); await p.waitForTimeout(150); log('⑳ 전체:', (await p.textContent('.vh b')).trim(), '|', (await p.textContent('.excl')).trim(), '| 표 줄', (await p.$$('.tw tbody tr')).length);
  await shot('b11-dash-all');
  await p.click('.tw tbody tr >> nth=2'); await p.waitForTimeout(150); log('반 누름 →', await p.$eval('.chips button.on', (e) => e.textContent.trim()), (await p.textContent('.vh b')).trim());
  await p.click('.tw tbody tr >> nth=0'); await p.waitForSelector('.ps'); log('이름 누름 → 시트', (await p.textContent('.ps .hd b')).trim()); await p.click('.ps .x');
  await p.click('.xlb'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet .act .btn')]);
  log('⬇ 엑셀:', dl.suggestedFilename()); if (!/^모두의던전_\S+_\d{4}-\d\d-\d\d\.xlsx$/.test(dl.suggestedFilename())) errs.push('엑셀 파일 이름'); await dl.saveAs(`${SHOTS}/dash-sample.xlsx`).catch(() => {});
  // ⑰ 준비
  await p.click('.seg button:has-text("명단")'); await tab('준비'); await fixedOk('⑰ 준비');
  await p.click('.four button >> nth=0'); await p.click('.stp button[aria-label="줄이기"]'); await p.click('.sheet .act .btn');
  log('⑰ 기본값:', (await p.textContent('.four')).replace(/\s+/g, ' ').trim(), '| 주요 단추', (await p.textContent('.tact .btn')).trim(), await p.$eval('.tact .btn', (e) => Math.round(innerHeight - e.getBoundingClientRect().bottom)));
  await shot('b11-prep');
  await p.click('.seg3 button:has-text("시간표")'); await p.click('.sg button:not([disabled]) >> nth=0'); await p.click('.g4 button:has-text("1-6")'); await p.waitForTimeout(100);
  log('⑰ 시간표 칸:', (await p.textContent('.sg button:not([disabled]) >> nth=0')).trim(), '| 진도', (await p.textContent('.pg >> nth=0')).replace(/\s+/g, ' ').trim());
  // ⑱ 소식
  await tab('소식'); await fixedOk('⑱ 소식'); const d0 = (await p.textContent('.tabs .rdot')).trim();
  await p.click('.nb >> nth=0'); await p.waitForTimeout(100); await p.click('.do .b1'); await p.waitForTimeout(100);
  log('⑱ 받은 것: 빨간 점', d0, '→', (await p.$('.tabs .rdot')) ? (await p.textContent('.tabs .rdot')).trim() : '0', '|', (await p.textContent('.nb >> nth=0')).replace(/\s+/g, ' ').trim());
  await shot('b11-news'); await p.click('.seg button:has-text("보내기")'); await p.fill('.card textarea', '내일 형성평가'); await p.click('.card .b1 >> nth=0'); log('⑱ 공지:', (await p.textContent('.toast')).trim());
  // ⑲ 나
  await tab('나'); await fixedOk('⑲ 나'); log('⑲ 나:', (await p.textContent('.hc')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.ver')).trim()); await shot('b11-me');
  await p.click('.item:has-text("종합실 비밀번호")'); await p.fill('.in', '3369'); await p.click('.sheet .act .btn'); await p.waitForTimeout(100);
  // 준비 값 · 종합실 키 → 수업 열기 때 방에
  await tab('수업'); await p.click('text=다른 반'); await p.click('.sheet .pk:has-text("1-3반")'); await p.click('.pk:has-text("6차시")'); await p.click('.tact .btn'); await p.waitForSelector('.nums');
  log('수업 열기: 키', (await p.textContent('.codek small')).trim(), '| 체력 기준 칩', (await p.textContent('.setrow button >> nth=0').catch(() => '(접힘)')).trim());
  // 펼친 화면 (1280)
  await p.click('.lbar button'); await p.click('.ask .btn'); await p.waitForSelector('.tabs');
  await p.setViewportSize({ width: 1280, height: 800 }); await tab('학생'); await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(200);
  log('⑳ 펼친 화면:', await p.$eval('.tp', (e) => Math.round(e.getBoundingClientRect().width)), 'px · 왼쪽 목록', await p.$eval('.dash.wide .nav', (e) => Math.round(e.getBoundingClientRect().width)).catch(() => 0), '| 보기 칩', (await p.$$('.vws button')).length);
  await p.screenshot({ path: `${SHOTS}/b11-dash-wide.png` });
  console.log('오류', JSON.stringify(errs));
  await b.close();
})();
