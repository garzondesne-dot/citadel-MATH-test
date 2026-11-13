// b8 (#119) 교사 쪽 + 학생 첫 화면 한 바퀴: ⓪ 가입 · 로그인 → 캠프 / ⑫ 시간표 · 수업 열기 / ⑬ 대기실(옛 판 · 결석 · 말풍선) / ⑭ 리모컨(정찰 ±30 · ±5% · 집중 · 선물 · 보스 직전) / ⑮ 교실 TV 장면
//   재기: 교사 폰 세 화면 × 두 크기(360 × 640 · 390 × 844) × 상황별 = 스크롤 0(문서 · 모든 칸) · 주요 단추(높이 68 · 바닥에서 74) · 도구 칸 · 조정 칸 좌표가 상황과 상관없이 같음
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/b8.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch();
  const errs = [], log = (...a) => console.log(...a);
  const watch = (p) => { p.on('pageerror', (e) => errs.push(`${p.url().replace(/.*\//, '')} ${String(e.stack || e).split('\n').slice(0, 3).join(' ')}`)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); return p; };
  for (const [W, H] of [[360, 640], [390, 844]]) {
    const tag = `${W}x${H}`;
    const ctx = await b.newContext({ viewport: { width: W, height: H } });
    const shot = async (p, n) => { if (W === 360) await p.screenshot({ path: `${SHOTS}/${n}-360.png` }); };
    // ⓪ 학생 첫 화면: 가입 → 캠프 · 로그아웃 없이 다시 열면 바로 캠프 · 틀린 비밀번호
    const s0 = watch(await ctx.newPage());
    await s0.goto(B); await s0.evaluate(() => localStorage.clear()); await s0.reload(); await s0.waitForSelector('.title');
    await shot(s0, 'b8-title');
    const pin = async (pg, k, digits) => { if (!(await pg.$('.pad'))) await pg.click(`.pw >> nth=${k}`); for (const d of digits) await pg.click(`.keys button:text-is("${d}")`); };
    await s0.selectOption('select >> nth=0', '1-3'); await s0.selectOption('select >> nth=1', '12');
    log(tag, '⓪ 이름:', (await s0.textContent('.name')).trim(), '| 단추', (await s0.textContent('.title .pmain')).trim());
    await pin(s0, 0, '1234'); await pin(s0, 1, '1235'); await s0.click('.title .pmain'); log(tag, '⓪ 두 번 다름:', (await s0.textContent('.err')).trim());
    await pin(s0, 0, '1234'); await pin(s0, 1, '1234'); await shot(s0, 'b8-title-join'); await s0.click('.title .pmain'); await s0.waitForSelector('.camp');
    await s0.reload(); await s0.waitForSelector('.camp'); log(tag, '⓪ 다시 열기 = 바로 캠프 ·', (await s0.textContent('.hero-card .nm')).trim());
    // #120 학생 폰 단추 높이: 주요 56 · 탭 · 되돌리기 48 · 작은 알약 36 · 가로 넘침 0
    const hgt = async (sel) => s0.$eval(sel, (e) => Math.round(e.getBoundingClientRect().height)).catch(() => null);
    const h1 = await hgt('.act .btn');
    await s0.click('button[aria-label="내 용사 보기"]'); await s0.waitForSelector('.mh');
    const h2 = { 강화: await hgt('.mh .pmain'), 탭: await hgt('.htabs button'), 용사바꾸기: await hgt('.chg') };
    await s0.click('.mh .pmain'); await s0.waitForTimeout(100); h2.저장 = await hgt('.mh .pmain'); h2.되돌리기 = await hgt('.savebar .btn2');
    const ox = await s0.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    log(tag, '#120 높이: 입장', h1, JSON.stringify(h2), '| 가로 넘침', ox);
    if (h1 !== 56 || h2.강화 !== 56 || h2.탭 !== 48 || h2.용사바꾸기 !== 48 || h2.저장 !== 56 || h2.되돌리기 !== 48 || ox > 0) errs.push(`${tag} #120 단추 높이 ${h1} ${JSON.stringify(h2)} 넘침 ${ox}`);
    if (W === 360) await s0.screenshot({ path: `${SHOTS}/b8-myhero-360.png` });
    await s0.click('.savebar .btn2'); await s0.click('.mh .back'); await s0.waitForTimeout(100);


    // ⑫ 교사 첫 화면
    const t = watch(await ctx.newPage()); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp');
    const meas = async (name) => {
      const m = await t.evaluate(() => {
        const r = (e) => { if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)]; };
        const doc = document.scrollingElement.scrollHeight - innerHeight;
        const scrollers = [...document.querySelectorAll('.tp *')].filter((e) => { if (e.closest('.sheet')) return false; const cs = getComputedStyle(e); return e.scrollHeight > e.clientHeight + 1 && (/(auto|scroll)/.test(cs.overflowY) || e.classList.contains('mid')); }).map((e) => `${e.className.split(' ')[0]}:${e.scrollHeight - e.clientHeight}`);
        const main = document.querySelector('.tact .btn');
        return { doc, scrollers, main: r(main), fromBottom: main ? Math.round(innerHeight - main.getBoundingClientRect().bottom) : null, tools: [...document.querySelectorAll('.rdock button')].map(r), adj: r(document.querySelector('.adj')), alerts: r(document.querySelector('.alerts')), card: r(document.querySelector('.rstat')) };
      });
      if (m.doc > 0) errs.push(`${tag} ${name}: 문서 스크롤 ${m.doc}`);
      if (m.scrollers.length) errs.push(`${tag} ${name}: 칸 스크롤 ${m.scrollers.join(' ')}`);
      if (m.main && (m.main[3] !== 68 || Math.abs(m.fromBottom - 74) > 1)) errs.push(`${tag} ${name}: 주요 단추 ${m.main} · 바닥에서 ${m.fromBottom}`);
      return m;
    };
    await t.evaluate(() => window.__featSet({ bundle: 'full', on: { schedule: true } })); await t.waitForTimeout(300); // 📅 시간표 켬 = 옛 ⑫ 시간표 길 (기본 = 끔)
    await shot(t, 'b8-t-home-empty'); const mh0 = await meas('⑫ 빈 시간표');
    await t.click('text=시간표 넣기'); const dow = await t.evaluate(() => (new Date(Date.now() + 9 * 3600e3).getUTCDay() || 7));
    if (dow <= 5) { const c = t.locator('.sg button').nth(2 * 5 + (dow - 1)); for (let k = 0; k < 3; k++) await c.click(); }
    await t.click('.sheet .act .btn');
    if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); } // 주말 = 오늘 시간표 비어 있음
    await t.click('.pk:has-text("6차시")'); await shot(t, 'b8-t-home'); const mh1 = await meas('⑫ 고름');
    log(tag, '⑫ 주요 단추:', (await t.textContent('.tact .btn')).trim(), '| 자리', mh1.main, '바닥에서', mh1.fromBottom, '| 빈 판과 같은 자리', JSON.stringify(mh0.main) === JSON.stringify(mh1.main));
    await t.click('.tact .btn'); await t.waitForSelector('.nums');
    const live = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB);
    // ⑬ 대기실 (학생 0 → 5명 · 5번 = 옛 판)
    const ml0 = await meas('⑬ 대기실 0명');
    const studs = [];
    for (const n of [1, 2, 3, 5, 12]) { const s = watch(await ctx.newPage()); await s.goto(`${B}?role=student&room=${live.code}&as=1-3:${n}${n === 5 ? '&ver=b6' : ''}`); studs.push(s); }
    await t.waitForTimeout(700);
    await t.click('.n:text-is("15")'); await t.waitForTimeout(100);
    await shot(t, 'b8-t-lobby'); const ml1 = await meas('⑬ 대기실 5명');
    log(tag, '⑬ 들어온:', (await t.textContent('.cnt')).replace(/\s+/g, ' ').trim(), '| 옛 판 단추:', (await t.textContent('.wide')).trim(), '| 결석 15번:', await t.$eval('.n:text-is("15")', (e) => e.className.includes('ab')), '| 단추 같은 자리', JSON.stringify(ml0.main) === JSON.stringify(ml1.main) && JSON.stringify(ml1.main) === JSON.stringify(mh1.main));
    await t.click('.bub'); await t.click('.qk button >> nth=1'); log(tag, '⑬ 말풍선:', (await t.textContent('.bub b')).trim());
    // ⑮ TV (교사 캠프 → 던전 대기실)
    const tv = watch(await ctx.newPage()); await tv.setViewportSize({ width: 1280, height: 720 }); await tv.goto(B + '?role=hall'); await tv.waitForSelector('.tv');
    await tv.mouse.move(640, 300); if (W === 360) await tv.screenshot({ path: `${SHOTS}/b8-tv-camp.png` });
    log(tag, '⑮ 교사 캠프 숫자 칸:', (await tv.textContent('.nbox')).replace(/\s+/g, ' ').trim(), '| QR', !!(await tv.$('.campqr svg')), '| 위 막대:', (await tv.textContent('.top .ttl')).trim(), '| 흐름도 숨김', await tv.$eval('.tflow', (e) => e.classList.contains('hide')), '| 시간 선', !!(await tv.$('.tline')), '| 캠프 안 내 용사', !!(await tv.$('.ob.me2')));
    await tv.click('.dock .go'); await tv.waitForSelector('.lring'); await tv.mouse.move(650, 300);
    if (W === 360) await tv.screenshot({ path: `${SHOTS}/b8-tv-lobby.png` });
    log(tag, '⑮ 던전 대기실:', (await tv.textContent('.nbox')).replace(/\s+/g, ' ').trim(), '| 말풍선', (await tv.textContent('.bub')).trim(), '| 흐린 친구', (await tv.$$('.rows .h.nin')).length);
    // ⑭ 리모컨: 개념 → 정찰 → 문제
    await t.click('.tact .btn'); await t.waitForSelector('.rflow'); const mr0 = await meas('⑭ 개념');
    await tv.waitForTimeout(250); log(tag, '⑮ 수업 중 위 막대:', (await tv.textContent('.top .ttl')).trim(), '| 흐름도 지금', (await tv.textContent('.fs.now em')).trim(), '| 시간 선 칩', (await tv.textContent('.tlt')).trim(), '| 조작 막대', (await tv.$$eval('.dock button', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ''))).catch(() => [])).join(' '));
    if (W === 360) await tv.screenshot({ path: `${SHOTS}/b8-tv-concept.png` });
    await t.click('.tact .btn'); await t.waitForTimeout(200); const mr1 = await meas('⑭ 정찰');
    const sc0 = (await t.textContent('.adj .hpl small')).trim(); await t.click('.adj button:has-text("+30초")'); await t.waitForTimeout(250);
    log(tag, '⑭ 정찰:', sc0, '→ +30초', (await t.textContent('.adj .hpl small')).trim(), '| TV', (await tv.textContent('.sc .r')).replace(/\s+/g, ' ').trim(), '| 주요 단추', (await t.textContent('.tact .btn')).trim());
    await shot(t, 'b8-t-remote-scout'); if (W === 360) await tv.screenshot({ path: `${SHOTS}/b8-tv-scout.png` });
    await t.click('.tact .btn'); await t.waitForTimeout(250); const mr2 = await meas('⑭ 문제');
    const hp0 = (await t.textContent('.adj .hpl small')).trim(); await t.click('.adj button:has-text("−5%")'); await t.waitForTimeout(150);
    log(tag, '⑭ 체력:', hp0, '→ −5%', (await t.textContent('.adj .hpl small')).trim());
    const same = (a, c) => JSON.stringify(a) === JSON.stringify(c);
    log(tag, '⑭ 칸 고정: 도구', same(mr0.tools, mr1.tools) && same(mr1.tools, mr2.tools), '| 조정 칸', same(mr0.adj, mr1.adj) && same(mr1.adj, mr2.adj), '| 칩 자리', same(mr1.alerts, mr2.alerts), '| 주요 단추 높이 · 자리', same(mr0.main, mr2.main) && mr2.main[1] === mh1.main[1] && mr2.main[3] === mh1.main[3], mr2.main, '| 도구 높이', [...new Set(mr2.tools.map((x) => x[3]))]);
    if (!(same(mr0.tools, mr1.tools) && same(mr1.tools, mr2.tools) && same(mr0.adj, mr2.adj) && same(mr0.main, mr2.main) && mr2.main[1] === mh1.main[1])) errs.push(`${tag} ⑭ 칸이 움직임`);
    if (mr2.tools.some((x) => x[3] !== 52)) errs.push(`${tag} ⑭ 도구 높이 52 아님`);
    // 🔒 · 🔄 칩 (5번 옛 판) · 문제 풀이 학생 1명
    log(tag, '⑭ 칩:', (await t.textContent('.alerts')).replace(/\s+/g, ' ').trim());
    await shot(t, 'b8-t-remote-play'); await tv.mouse.move(660, 300); if (W === 360) await tv.screenshot({ path: `${SHOTS}/b8-tv-play.png` });
    // 🔴 집중: 학생 폰 덮개 · TV ⏸ · 남은 시간은 흐름
    await t.click('.rdock button:has-text("집중")'); await t.waitForTimeout(300);
    log(tag, '🔴 집중: 학생 폰', (await studs[0].textContent('.cover b')).trim(), '| TV', (await tv.textContent('.ov.fo')).replace(/\s+/g, ' ').trim(), '| 배지', (await t.textContent('.rs1 .badge')).trim(), '| ⏳ 멈춤', !!(await tv.$('.tline em.still')));
    if (W === 360) { await tv.screenshot({ path: `${SHOTS}/b8-tv-focus.png` }); await studs[0].screenshot({ path: `${SHOTS}/b8-s-focus-360.png` }); }
    const mr3 = await meas('⑭ 집중'); if (!same(mr3.tools, mr2.tools)) errs.push(`${tag} 집중 때 도구가 움직임`);
    await t.click('.rdock button:has-text("집중")'); await t.waitForTimeout(150);
    // 💎 선물: 모두 → 보내기 → TV 「🎁 선생님 선물!」 → 캠프 지갑
    await t.click('.rdock button:has-text("선물")'); await t.click('.ggrid .gn >> nth=0'); await t.click('.sheet .act .btn'); await t.waitForTimeout(300);
    log(tag, '💎 한 명 선물: TV', (await tv.$('.gift')) ? '뜸(✗)' : '없음', '| 받은 학생 폰', (await studs[0].$('.gift')) ? (await studs[0].textContent('.gift')).trim() : '없음');
    if (await tv.$('.gift')) errs.push(`${tag} 몇 명 선물인데 TV 에 뜸`);
    await t.waitForTimeout(4200);
    await t.click('.rdock button:has-text("선물")'); await t.click('.gquick button >> nth=0'); await shot(t, 'b8-t-gift');
    const gl = (await t.textContent('.sheet .act .btn')).trim(); await t.click('.sheet .act .btn'); await t.waitForTimeout(250);
    log(tag, '💎 선물:', gl, '| TV', (await tv.$('.gift')) ? (await tv.textContent('.gift')).trim() : '없음');
    // 👑 보스 직전: 마감 = 지금 + 3분 (저장소를 고친 뒤 교사 폰 새로 고침) → +5분 반짝 · 배지
    await t.evaluate(({ k, c }) => { localStorage.setItem(`${k}|rooms/${c}/state/deadline`, JSON.stringify(Date.now() + 3 * 60e3)); localStorage.setItem(`${k}|rooms/${c}/state/extend`, 'null'); }, { k: DB, c: live.code });
    await t.reload(); await t.waitForSelector('.rflow'); const mr4 = await meas('⑭ 보스 직전');
    log(tag, '👑 보스 직전:', (await t.textContent('.rs1 .badge')).replace(/\s+/g, ' ').trim(), '| +5분 반짝', !!(await t.$('.rdock .glow')), '| 도구 같은 자리', same(mr4.tools, mr2.tools));
    if (!same(mr4.tools, mr2.tools) || !same(mr4.adj, mr2.adj)) errs.push(`${tag} 보스 직전 칸이 움직임`);
    await shot(t, 'b8-t-remote-boss');
    await t.click('.rdock .t5'); await t.waitForTimeout(150); log(tag, '⏰ +5분 뒤:', (await t.textContent('.tbar .t small')).trim(), '| 다시 누름 막힘', await t.$eval('.rdock .t5', (e) => e.disabled));
    // 수업 끝 → 학생 캠프 선물
    log(tag, '수업 닫기 단추:', (await t.textContent('.lbar button')).trim()); await t.click('.lbar button'); await t.click('.ask .btn'); await t.waitForSelector('.tabs');
    log(tag, '수업 닫기 → 탭 돌아옴');
    await s0.waitForFunction((k) => Object.keys(localStorage).some((x) => x.startsWith(`${k}|gifts/s1_3_12/`) && x.endsWith('/got')), DB, { timeout: 4000 }).catch(() => {});
    const g = await s0.evaluate((k) => { const gs = Object.keys(localStorage).filter((x) => x.startsWith(`${k}|gifts/s1_3_12/`) && !x.endsWith('/got')).map((x) => ({ ...JSON.parse(localStorage.getItem(x)), got: JSON.parse(localStorage.getItem(`${x}/got`) || 'false') })); return { n: gs.length, got: gs.every((x) => x.got), gem: JSON.parse(localStorage.getItem('citadel-v1-me')).wallet.gem }; }, DB);
    log(tag, '🎁 12번 캠프: 선물', g.n, '줄 · 받음', g.got, '· 💎', g.gem, '| TV', (await tv.textContent('.ttl')).trim());
    if (!g.got || g.gem !== 9999 + 10) errs.push(`${tag} 선물이 지갑에 안 들어감`);
    // ⏯ 이어서: 문제 1 처치 안 됨 → 「문제 1부터 이어서」 → 새 방 시작 = 문제 1
    if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); } // 주말 = 오늘 시간표 비어 있음
    const rs = (await t.$('.item:has-text("이어서")')) ? (await t.textContent('.item:has-text("이어서") b')).trim() : '없음';
    log(tag, '⏯ 이어서:', rs); if (!/문제 1부터 이어서/.test(rs)) errs.push(`${tag} 이어서 자리가 안 맞음 ${rs}`);
    await t.click('.item:has-text("이어서")'); await t.waitForSelector('.nums');
    const nl = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB); const sN = watch(await ctx.newPage()); await sN.goto(`${B}?role=student&room=${nl.code}&as=1-3:2`);
    await t.waitForTimeout(700); await t.click('.tact .btn'); await t.waitForSelector('.rflow');
    log(tag, '⏯ 새 수업 시작 단계:', (await t.textContent('.rfcap b')).trim()); await t.click('.lbar button'); await t.click('.ask .btn'); await t.waitForSelector('.tabs');
    await ctx.close();
  }
  console.log('오류', JSON.stringify([...new Set(errs)], null, 1));
  await b.close();
})();
