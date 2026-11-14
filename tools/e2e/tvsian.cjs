// 📺 TV = 컨펌 시안대로 (머리 🔨 2026-11-14 · 대조 페이지 6상황): 교사 캠프 · 던전 대기실 · 개념 · 문제 풀이 · 정찰 · 집중 · 1280 × 720 캡처 + 항목 확인
//   ① 번호 겹침 없음 ② 개념 = 수식 상자 · 문제 = 공통 조건 한 번 · ⤢ 누르면 크게 ③ 남은 시간 = 위 가운데 ④ 몬스터 이름 · ✔ 낸 학생
//   ⑤ 정찰 = +30초 단추 없음 · 큰 카드 · 붉은 테두리 실루엣 ⑥ 대기실 = 도구 + 수업 시작 ⑦ 교사 캠프 부제
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', W = 1280, H = 720;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], out = [];
  const ok = (name, cond, info = '') => { out.push(`${cond ? '✅' : '❌'} ${name}${info ? ` · ${info}` : ''}`); if (!cond) errs.push(name); };
  const hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
  await hall.goto(B + '?role=hall&mode=test&room=SIAN&lesson=set-06'); await hall.waitForSelector('.dock'); await hall.waitForTimeout(900);
  const shot = (n) => hall.screenshot({ path: `${SHOTS}/tv-${n}.png` });
  const go = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(700); };
  const dock = () => hall.$$eval('.dock button', (bs) => bs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  // 🏛 교사 캠프
  await hall.waitForSelector('.campv'); await hall.waitForTimeout(600); await shot('1-camp');
  const subs = await hall.$$eval('.campv .ob', (xs) => xs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  ok('⑦ 캠프 부제', ['단원 평가', '차시 던전', '복습', '연성', '용사 바꾸기'].every((w) => subs.some((s) => s.includes(w))), subs.join(' | '));
  // 📺 아래 막대 정리 · ⚙ 설정 (📜 2026-11-14): 막대 = 📌 고정이 맨 끝 · 처음 · 테마 · 소리 · 전체 없음 / ⚙ 펼침 = 내 캠프(수업 중) · 테마 · 전체 화면 · 소리 · 처음으로
  { const cd = await dock(); ok('📌 고정 맨 끝 · 막대에 처음 · 테마 · 소리 · 전체 없음', /고정/.test(cd[cd.length - 1] || '') && !cd.some((t) => /처음|테마|소리|꺼짐|⛶/.test(t)), cd.join(' | ')); // 「반 전체 던전 대기실로」(던전 입장 아래 글) 는 제외
    await hall.click('.gear[data-k="tvset"]'); await hall.waitForTimeout(250); const menu = await hall.$$eval('.setbox button', (bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
    ok('⚙ 설정 펼침', ['테마', '전체 화면', '소리', '처음으로'].every((w) => menu.some((t) => t.includes(w))), menu.join(' | '));
    await hall.screenshot({ path: `${SHOTS}/tv-0-settings.png` }); await hall.mouse.click(40, H / 2); await hall.waitForTimeout(200); ok('⚙ 바깥 누르면 닫힘', !(await hall.$('.setbox'))); }
  // ⚔ 던전 대기실
  await hall.evaluate(() => window.__tvFake(5)); await go(); await hall.waitForTimeout(1200); await shot('2-lobby');
  const ld = await dock(); ok('⑥ 대기실 도구 + 수업 시작', ['쉼터', '영상', '문제', '시연', '필기', '집중'].every((w) => ld.some((t) => t.includes(w))) && ld.some((t) => t.includes('수업 시작')), ld.join(' | '));
  // ⏳ 남은 시간 칸이 보이게 = 수업 마감 50분 뒤
  await hall.evaluate(() => window.__dbSet?.('rooms/SIAN/state/deadline', Date.now() + 50 * 60e3));
  // 📖 개념 (도입이 있으면 건너뜀)
  for (let g = 0; g < 4 && !(await hall.$('.split')); g++) await go();
  await hall.waitForTimeout(800); await shot('3-concept');
  const cc = await hall.evaluate(() => ({ fbox: document.querySelectorAll('.split .fbox').length, head: [...document.querySelectorAll('.split .qhead b')].map((x) => x.textContent), qi: [...document.querySelectorAll('.split .qi')].map((x) => (/^\(\d+\)/.exec(x.textContent)?.[0] ?? '') + (x.querySelector('.cn') ? ` ${x.querySelector('.cn').textContent}` : '')), zm: [...document.querySelectorAll('.split .zm')].map((x) => { const r = x.getBoundingClientRect(); return r.bottom <= innerHeight && r.width > 0; }), talk: /먼저 말로/.test(document.querySelector('.split')?.textContent || '') }));
  const labs = cc.qi.filter(Boolean);
  ok('① 번호 겹침 없음', new Set(labs).size === labs.length, labs.join(' '));
  ok('② 개념 수식 상자 · 교사 말 없음', cc.fbox >= 1 && !cc.talk, `상자 ${cc.fbox}`);
  ok('② 문제 공통 조건 한 번', cc.head.length >= 1, cc.head.join(' / '));
  ok('② ⤢ 누르면 크게 보임', cc.zm.length >= 1 && cc.zm.every(Boolean));
  const tl = await hall.$eval('.tlt', (x) => { const r = x.getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), top: Math.round(r.top) }; }).catch(() => null);
  ok('③ 남은 시간 = 위 가운데', !!tl && Math.abs(tl.cx - W / 2) < W * 0.08 && tl.top < H * 0.2, JSON.stringify(tl));
  // 🌫 정찰 (문제 1 들어가자마자)
  await go(); await hall.waitForTimeout(400); await shot('4-scout');
  const sc = await hall.evaluate(() => { const c = document.querySelector('.sc'); const r = c?.getBoundingClientRect(); return { on: !!c, w: r ? Math.round(r.width) : 0, plus: [...document.querySelectorAll('.sc button, .tv button')].some((x) => /\+30/.test(x.textContent || '')) }; });
  ok('⑤ 정찰 +30초 단추 TV 에 없음', sc.on && !sc.plus); ok('⑤ 정찰 카드 큼', sc.w >= W * 0.2, `${sc.w}px`);
  // ⚔ 문제 풀이 (정찰 5초 지나고 · 가상 학생 하나 냄)
  await hall.waitForTimeout(5600); out.push('· 내기 전 이름표: ' + (await hall.evaluate(() => (window.__arena?.names ?? []).join(' ')))); await hall.evaluate(() => window.__perfect?.('SIAN', 'm1', 'fake0')); await hall.waitForTimeout(1500); await shot('5-play');
  const pl = await hall.evaluate(() => ({ hp: window.__arena?.hpName ?? '', ticks: window.__arena?.names ?? [] }));
  ok('④ 몬스터 이름 (「문제 1」 아님)', !!pl.hp && !/^문제 \d/.test(pl.hp), pl.hp);
  ok('④ ✔ 낸 학생', pl.ticks.some((t) => t.startsWith('✓') || t.startsWith('✔')), pl.ticks.join(' '));
  // 🔴 집중
  await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .fo'); await hall.waitForTimeout(700); await shot('6-focus'); await hall.mouse.move(W / 3, H / 2); await hall.click('.dock .fo');
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
