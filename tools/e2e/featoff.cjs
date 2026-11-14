// ⚙ 우리 학교 기능 끄기 (📜 2026-11-15 · 에뮬레이터): ① 확인 창 B(🧙 · 🏰 · 📋 끌 때만) · C(묶음 · 낱낱 설정 있을 때만 · 바뀌는 목록)
//   ② 학생 기록을 만든 뒤 → 기능 전부 끔 → 그 학생이 수업 한 판(접속 · 선물 받기) → 다시 켬 → 기록 비교(용사 · 강화 · 스킬 · 호칭 · 테마 · 산 것 · 카드 · 성채 · 게시판 그대로 · 💎 는 선물만큼 늘어남)
//   사용: 에뮬레이터 켬 → NODE_PATH=$(npm root -g) node tools/e2e/featoff.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (p, method = 'GET', body) => fetch(`${DBU}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const t = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs');
  // 학생 계정 만들고(진짜 로그인) 기록 심기
  const s0 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await s0.goto(`${B}?role=student&room=XX&as=1-3:5${E}`); await s0.waitForTimeout(3000); await s0.close();
  const acc0 = await rest('accounts/1-3/5');
  await rest('accounts/1-3/5', 'PATCH', { hero: 7, socket: { fx: 'flame', tier: 3 }, title: 'dragon', theme: 'forest' });
  await rest('gem/1-3/5', 'PUT', { total: 321, scroll: 4, enh: { 7: 6 }, buy: { b1: { id: 'hero-7', ver: 1 } }, ver: 1 });
  await rest('xp/1-3/5', 'PUT', { total: 88 }); await rest('cards/1-3/5', 'PUT', { 'set-02-c1': true });
  await rest('bonus/1-3/5', 'PUT', { 'eval-1': { r1: { clear: 1, tries: 2 } }, review: { 'set-06': { m1: 123 } } });
  const keep = ['accounts/1-3/5', 'gem/1-3/5', 'xp/1-3/5', 'cards/1-3/5', 'bonus/1-3/5'], snap = async () => Object.fromEntries(await Promise.all(keep.map(async (k) => [k, await rest(k)])));
  const A = await snap(); ok('기록 심음 (계정 uid 그대로)', A['accounts/1-3/5'].uid === acc0.uid && A['gem/1-3/5'].total === 321);
  // ① 확인 창
  await t.click('.tabs button:has-text("나")'); await t.click('[data-k="feat"]'); await t.waitForSelector('[data-f="hero"]');
  await t.click('[data-f="hero"]'); const qB = await t.textContent('[data-k="feat-off-ask"]').catch(() => '');
  ok('① B: 🧙 용사 끌 때 묻기 · 문구 그대로', qB.includes('학생 기록(용사 · 강화 · 💎 · 처치 기록)은 그대로 남지만 학생 화면에서 사라져요. 끌까요?'));
  await t.screenshot({ path: `${SHOTS}/featoff-B.png` });
  await t.click('.sheet .btn2:has-text("취소")'); ok('① B 취소 = 그대로 켬', (await rest('school/features'))?.on?.hero !== false);
  await t.click('[data-f="schedule"]'); await t.waitForTimeout(300); ok('① B: 시간표(작은 기능)는 안 묻고 바로', !(await t.$('[data-k="feat-off-ask"]')) && (await rest('school/features'))?.on?.schedule === true);
  await t.click('[data-f="hero"]'); await t.click('[data-k="feat-off-yes"]'); await t.waitForTimeout(300); ok('① B 끄기 = 꺼짐', (await rest('school/features'))?.on?.hero === false);
  await t.click('[data-f="hero"]'); await t.waitForTimeout(300); ok('① B 켤 때는 안 물음', !(await t.$('[data-k="feat-off-ask"]')) && (await rest('school/features'))?.on?.hero === true);
  await t.click('[data-b="standard"]'); const qC = await t.textContent('[data-k="bundle-ask"]').catch(() => ''), dC = await t.textContent('[data-k="bundle-diff"]').catch(() => '');
  ok('① C: 묶음 = 낱낱 설정 n개 · 바뀌는 목록', /하나씩 바꾼 설정 2개가 묶음 기본값으로 돌아가요\. 바꿀까요\?/.test(qC) && /시간표[^]*켬 → 끔/.test(dC), `${qC} | ${dC.replace(/\s+/g, ' ').slice(0, 120)}`);
  await t.screenshot({ path: `${SHOTS}/featoff-C.png` });
  await t.click('[data-k="bundle-yes"]'); await t.waitForTimeout(300); const fc = await rest('school/features'); ok('① C 바꾸기 = 묶음 · 낱낱 지움', fc.bundle === 'standard' && !fc.on, JSON.stringify(fc));
  await t.click('[data-b="full"]'); await t.waitForTimeout(300); ok('① C: 낱낱 설정 없으면 안 묻고 바로', !(await t.$('[data-k="bundle-ask"]')) && (await rest('school/features')).bundle === 'full');
  // ② 기능 전부 끔 → 수업 한 판 · 선물 → 다시 켬
  const allOff = Object.fromEntries(['hero', 'citadel', 'board', 'scarecrow', 'forge', 'theme', 'symtalk', 'mon-attack', 'lesson-fx', 'juice', 'seteuk', 'author', 'contest', 'survey'].map((k) => [k, false]));
  await rest('school/features', 'PUT', { bundle: 'basic', on: allOff });
  await t.click('.sheet .x').catch(() => {}); await t.click('.tabs button:has-text("학생"), .tabs button >> nth=0').catch(() => {}); await t.waitForTimeout(300);
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const code = (await rest('school/live')).code;
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?role=student&room=${code}&as=1-3:5${E}`); await s.waitForTimeout(3500);
  const pl = await rest(`rooms/${code}/players/s1_3_5`); out.push(`ℹ 끈 동안 수업 방 학생 칸: hero ${pl?.hero} · fx ${pl?.fx} · enh ${pl?.enh}`);
  await rest('gifts/s1_3_5/t1', 'PUT', { g: 10, at: Date.now(), code });
  await s.goto(`${B}?role=camp&room=${code}&as=1-3:5${E}`).catch(() => {}); await s.waitForTimeout(3000);
  await rest('school/features', 'PUT', { bundle: 'full' });
  const Z = await snap();
  const strip = (o) => { const x = JSON.parse(JSON.stringify(o || {})); delete x.at; delete x.seen; delete x.ver; return x; };
  ok('② 계정(용사 · 스킬 · 호칭 · 테마) 그대로', JSON.stringify(strip(Z['accounts/1-3/5'])) === JSON.stringify(strip(A['accounts/1-3/5'])), JSON.stringify(strip(Z['accounts/1-3/5'])).slice(0, 140));
  const ga = A['gem/1-3/5'], gz = Z['gem/1-3/5'];
  ok('② 강화 · 산 것 · 📜 그대로', JSON.stringify(gz.enh) === JSON.stringify(ga.enh) && JSON.stringify(gz.buy) === JSON.stringify(ga.buy) && gz.scroll === ga.scroll, JSON.stringify({ enh: gz.enh, scroll: gz.scroll }));
  ok('② 💎 = 그대로 또는 선물만큼 늘어남', gz.total === ga.total || gz.total === ga.total + 10, `${ga.total} → ${gz.total}`);
  for (const k of ['xp/1-3/5', 'cards/1-3/5', 'bonus/1-3/5']) ok(`② ${k.split('/')[0]} 그대로`, JSON.stringify(Z[k]) === JSON.stringify(A[k]));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
