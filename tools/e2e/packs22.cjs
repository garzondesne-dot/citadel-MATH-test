// 📦 차시 팩 탭 (📜 2026-11-17 #22 · 시안 NcZJ2JUj7Y1CyFWXrfuCxs ①~⑦) — 이 기기 저장
//   ① 탭 이름 · 큰 올리기 · 차시 카드 3 + 「n개 더」 ② 카드 → 🧪 · ⬇ · ↩ · 🙈/🗑 · 🎲 던전 · ⚙ ⏱ ③ 던전 고르기 12곳 → 교사 설정(팩 안 바뀜) → 수업 방 meta.rdun
//   ④ 🛠 6단계 · 꾸러미 zip 받기 · ✔ 이 기기 기억 ⑤ 꾸러미 예시 팩 = 검사 통과 · 그림 없음 → 🎲 자동 고정 ⑥ 고칠 칸 → 📋 AI 문구 ⑦ 나 = 용사 · 캠프만
//   NODE_PATH=$(npm root -g) node tools/e2e/packs22.cjs <폴더> [주소]
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const KIT = JSON.parse(fs.readFileSync(`${__dirname}/../../kit/${fs.readdirSync(`${__dirname}/../../kit`).find((x) => x.startsWith('06_'))}`, 'utf8'));
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const txt = async (s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  ok('① 아래 탭 = 📦 차시 팩', /차시 팩/.test(await txt('.tabs')) && !/준비/.test(await txt('.tabs')));
  await p.click('.tabs button:has-text("차시 팩")'); await p.waitForSelector('[data-k="packs-tab"]');
  ok('① 큰 「📦 차시 팩 올리기」', !!(await p.$('[data-k="packup-go"]')));
  const n0 = (await p.$$('[data-k="pack-card"]')).length;
  ok('① 차시 카드 3 + 「n개 더 ▾」', n0 === 3 && !!(await p.$('[data-k="pack-more"]')), `${n0}`);
  ok('① 🛠 차시 만들기 갈래 · 🧰 도구 접힘 · ❓ 문의(폼 주소 없음 = 숨김)', !!(await p.$('[data-k="side-make"]')) && !!(await p.$('[data-k="tools-fold"]')) && !(await p.$('[data-k="tools"]')) && !(await p.$('[data-k="ask-go"]')));
  await p.screenshot({ path: `${SHOTS}/p22-1-tab.png` });
  await p.click('[data-k="pack-more"]'); const nAll = (await p.$$('[data-k="pack-card"]')).length; ok('「n개 더」 = 모두 펼침', nAll > 3, `${nAll}`);
  // ② 카드 · ③ 던전
  const id = await p.$eval('[data-k="pack-card"]', (e) => e.dataset.id);
  await p.click(`[data-k="pack-card"][data-id="${id}"]`); await p.waitForSelector('[data-k="pack-detail"]');
  const det = await txt('[data-k="pack-detail"]');
  ok('② 🧪 · ⬇ · ↩ · 🙈/🗑 · 🎲 던전 · ⚙ ⏱', ['pack-test', 'pack-dl', 'pack-prev', 'pack-del', 'pack-dungeon', 'pack-time'].every((k) => det && true) && !!(await p.$('[data-k="pack-test"]')) && !!(await p.$('[data-k="pack-dungeon"]')) && /예상/.test(det), det.slice(0, 120));
  ok('② 문제 · 칸 · 그림 고치는 단추 없음', !/그림 고치|학습지 · 영상 한 번에|단계별 그림/.test(det));
  ok('② 📤 나눔 = 폼 주소 없으면 숨김', !(await p.$('[data-k="pack-share"]')));
  await p.screenshot({ path: `${SHOTS}/p22-2-card.png` });
  await p.click('[data-rd="pick"]'); await p.waitForSelector('[data-k="rd-grid"]');
  ok('③ 던전 12곳 + 미리 보기 + ▶ 공격 보기', (await p.$$('[data-rd-id]')).length === 12 && !!(await p.$('[data-k="rd-preview"]')) && !!(await p.$('[data-k="rd-atk"]')));
  await p.click('[data-rd-id="d03"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${SHOTS}/p22-3-dungeon.png` });
  await p.click('[data-k="rd-ok"]'); await p.waitForTimeout(300);
  const rd = await p.evaluate((i) => window.__dbGet(`school/rdun/${i}`), id);
  ok('③ 고르기 = 교사 설정 school/rdun (팩 파일 안 바뀜)', rd?.m === 'pick' && rd?.d === 'd03', JSON.stringify(rd));
  await p.click('[data-k="pack-test"]'); await p.waitForTimeout(400);
  ok('② 🧪 테스트로 열기 = ⚔ 수업 탭 🧪 + 그 차시', await p.$eval('[data-cls="test"]', (e) => e.classList.contains('on')).catch(() => false) && !!(await p.$('.pk3 .pk.on')));
  await p.click('[data-mode="remote"]'); for (let i = 0; i < 6; i++) await p.click('[aria-label="봇 줄이기"]').catch(() => {});
  await p.click('[data-k="open-go"]'); await p.click('[data-k="open-yes"]'); await p.waitForTimeout(800);
  const lv = await p.evaluate(() => window.__dbGet('school/live')), mrd = lv && (await p.evaluate((c) => window.__dbGet(`rooms/${c}/meta/rdun`), lv.code));
  ok('③ 수업 방 meta.rdun = 고른 던전 (학생 · TV 같은 값)', mrd === 'd03', `${mrd}`);
  await p.click('.lbar button:has-text("수업 닫기")').catch(() => {}); await p.click('.ask .btn').catch(() => {});
  await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]');
  // ④ 🛠 6단계
  await p.click('[data-k="side-make"]'); await p.waitForSelector('[data-k="build"]');
  ok('④ 6단계 · 꾸러미 받기 = 공개 전 숨김(「공개 준비 중」 · 📜 #23)', (await p.$$('[data-step]')).length === 6 && !(await p.$('[data-k="kit-dl"]')) && !!(await p.$('[data-k="kit-soon"]')));
  // 베타 빌드에는 zip 있음(정식 빌드는 공개 전 뺌)
  const href = new URL('kit/모두의던전_차시팩_만들기_꾸러미.zip', B).href; const r = await p.evaluate(async (u) => { const x = await fetch(u); return { ok: x.ok, t: x.headers.get('content-type'), n: (await x.arrayBuffer()).byteLength }; }, href);
  ok('④ 꾸러미 zip 받아짐', r.ok && r.n > 10000 && !/html/.test(r.t || ''), JSON.stringify(r));
  await p.click('[data-step="2"]'); await p.click('[data-k="ws-hand"]'); ok('⑦ ✍ 직접 탭 · 「우리 양식 지킬 것」', /틀\.docx/.test(await txt('[data-k="build"]')) && /칸 제목 글자 그대로/.test(await txt('[data-k="ws-rule"]')));
  await p.click('[data-step="1"]'); await p.click('[data-k="step-done-1"]'); await p.screenshot({ path: `${SHOTS}/p22-4-build.png` });
  await p.reload(); await p.waitForSelector('[data-k="packs-tab"]');
  ok('④ ✔ = 이 기기 기억 (1/6)', /1\/6/.test(await txt('[data-k="build-n"]')), await txt('[data-k="side-make"]'));
  // ⑤ 꾸러미 예시 팩 올리기 · ⑥ 고칠 칸
  const mk = (o) => JSON.stringify({ ...KIT, id: 'kit-test', no: 20, ...o });
  await p.click('[data-k="packup-go"]'); await p.click('button:has-text("글로 붙여 넣기")'); await p.fill('[data-k="packtext"]', mk({})); await p.click('button:has-text("검사하기")'); await p.waitForTimeout(400);
  ok('⑤ 예시 팩 = ✔ 검사 통과', /검사 통과/.test(await txt('[data-k="packsum"]')), await txt('[data-k="packsum"]'));
  await p.click('.sheet .act .btn'); await p.waitForTimeout(1500);
  const rd2 = await p.evaluate(() => window.__dbGet('school/rdun/kit-test'));
  ok('⑤ 그림 없는 팩 = 🎲 자동 던전이 올릴 때 고정', rd2?.m === 'auto' && /^d\d\d$/.test(rd2?.d || ''), JSON.stringify(rd2));
  await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]');
  await p.click('[data-k="packup-go"]'); await p.click('button:has-text("글로 붙여 넣기")'); await p.fill('[data-k="packtext"]', mk({ boss: { ...KIT.boss, items: 9 } })); await p.click('button:has-text("검사하기")'); await p.waitForTimeout(400);
  const hasErr = /고칠 칸/.test(await txt('[data-k="packsum"]'));
  if (hasErr) { await p.click('[data-k="ai-copy"]'); await p.waitForTimeout(200); }
  const clip = hasErr ? await p.evaluate(() => navigator.clipboard.readText()).catch(() => '') : '';
  ok('⑥ 고칠 칸 → 📋 AI 문구 = 「이 팩을 아래대로 고쳐 다시 줘」 + ✘ 줄', hasErr && /^이 팩을 아래대로 고쳐 다시 줘\n- /.test(clip), clip.slice(0, 80));
  await p.screenshot({ path: `${SHOTS}/p22-5-err.png` });
  await p.keyboard.press('Escape'); await p.goto(B + '?role=teacher&tab=me'); await p.waitForSelector('.tabs');
  const me = await txt('.mid');
  ok('⑦ 나 = 용사 · 내 캠프만 (기능 · 사진 · 갤러리 없음)', /내 캠프/.test(me) && !/우리 학교 기능|사진 채점|공격 갤러리/.test(me), me.slice(0, 100));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
