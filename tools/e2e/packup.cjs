// 📦 차시 팩 올리기 + 자동 검사기 (L1 · 머리 🔨 2026-11-14) — 교사 폰 360 × 760 (이 기기 저장)
//   ① 준비 → 도구 → 「📦 차시 팩 올리기」 → 틀린 팩 5개 = 칸 · 이유 · 저장 못 함 ② 예시 팩 = ✔ 통과 · 미리 보기(학생과 같은 QItem · 버전 0 ~ 2) → 저장
//   ③ 새로 고침 뒤 차시 ▾ 에 11차시 · 🧪 테스트 해 보기 = 학생 폰 문제와 같음 ④ 앱 차시(엔진 꼴)도 같은 길 = 통과 + 「이미 있는 차시」 확인 한 줄
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIR = path.join(__dirname, '../pack-upload');
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const openUp = async () => { await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(200); await p.click('.seg3 button:has-text("도구")'); await p.waitForTimeout(200); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]'); };
  const upload = async (f) => { await p.setInputFiles('[data-k="packfile"]', path.join(DIR, f)); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(200); };
  const mainDis = () => p.$eval('.sheet .btn.pmain', (x) => x.disabled).catch(() => null);
  await openUp();
  // ① 틀린 팩 5개
  const want = { 'bad-1-fields.json': /제목\(title\)/, 'bad-2-choice-range.json': /보기 번호 범위/, 'bad-3-recheck.json': /정답 재계산이 달라요 — 다시 풀면 25/, 'bad-4-versions.json': /버전이 8개/, 'bad-5-dex.json': /도감에 없어요/ };
  for (const [f, re] of Object.entries(want)) {
    await upload(f);
    const sum = await p.textContent('[data-k="packsum"]'), iss = await p.textContent('[data-k="packiss"]').catch(() => '');
    ok(`① ${f} = 오류 · 칸 · 이유 · 저장 못 함`, /고칠 칸/.test(sum) && re.test(iss) && (await mainDis()) === true, `${sum.trim()} | ${iss.replace(/\s+/g, ' ').slice(0, 90)}`);
    if (f === 'bad-3-recheck.json') await p.screenshot({ path: `${SHOTS}/packup-1-bad.png` });
  }
  // ② 예시 팩
  // 🖼 그림 없이 올림 = 「그림 없음」 7칸 ⚠ · 저장 단추는 켜짐 → 🖼 칸 그림 8장(7칸 + 쓰이지 않는 extra) 같이 고름 = 「그림 없음」 사라짐 · 「쓰이지 않는 그림 1개」
  await upload('example-ex-11.json'); await p.waitForTimeout(1200); // 그림 · 영상 확인은 뒤따라 옴
  { const iss = (await p.textContent('[data-k="packiss"]').catch(() => '')).replace(/\s+/g, ' ');
    ok('🖼 그림 안 고름 = 「그림 없음」 7칸 ⚠ · 영상 3편 있음 · 저장 켜짐', /그림\(img\) review · c1 · m1 · c2 · m2 · sum · boss/.test(iss) && !/영상 없음/.test(iss) && (await mainDis()) === false, iss.slice(0, 140)); }
  const IMG = path.join(DIR, 'img'), files = ['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'boss', 'extra'].map((c) => path.join(IMG, `${c}.png`));
  await p.setInputFiles('[data-k="packimgs"]', files); await p.waitForTimeout(1500);
  { const iss = (await p.textContent('[data-k="packiss"]').catch(() => '')).replace(/\s+/g, ' '), ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim();
    ok('🖼 그림 같이 고름 = 「그림 없음」 사라짐 · 7칸 붙음 · 쓰이지 않는 그림 1개 · 영상 3편 연결', !/그림 없음/.test(iss) && /그림 7칸 붙음/.test(ms) && /쓰이지 않는 그림 1개 \(extra\.png\)/.test(ms) && /영상 3편 연결/.test(ms), ms); }
  await p.click('.chips2 button:has-text("개념 1")'); await p.waitForTimeout(500);
  { const m = await p.evaluate(() => ({ img: !!document.querySelector('[data-k="packimg"] img'), vid: document.querySelector('[data-k="packvid"]')?.getAttribute('src') ?? '' }));
    const ok2 = await p.evaluate(async (u) => (await fetch(u, { method: 'HEAD' })).headers.get('content-type'), m.vid).catch(() => '');
    ok('🖼 🎬 미리 보기 개념 1 = 칸 그림 + 영상 v11-49 (재생 파일 있음)', m.img && /v11-49/.test(m.vid) && /video/.test(ok2 || ''), `${JSON.stringify(m)} · ${ok2}`);
    await p.screenshot({ path: `${SHOTS}/packup-5-media.png` }); }
  { const vids = []; for (const st of ['개념 2', '형성평가']) { await p.click(`.chips2 button:has-text("${st}")`); await p.waitForTimeout(250); vids.push(await p.$eval('[data-k="packvid"]', (x) => x.getAttribute('src')).catch(() => '')); }
    ok('🎬 영상 3편 = 개념 2 v11-50 · 형성평가 v11-51', /v11-50/.test(vids[0]) && /v11-51/.test(vids[1]), vids.join(' · ')); }
  await p.click('.chips2 button:has-text("문제 1")'); await p.waitForTimeout(200);
  const sum = (await p.textContent('[data-k="packsum"]')).trim();
  ok('② 예시 팩 = ✔ 통과 · 저장 단추 켜짐', /검사 통과/.test(sum) && (await mainDis()) === false, sum);
  const prev = async () => p.$$eval('[data-k="packprev"] .pq', (xs) => xs.map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 60)));
  const v0 = await prev(); const kinds = await p.$$eval('[data-k="packprev"] .pq', (xs) => xs.map((x) => (x.querySelector('.rune-slot') ? 'rune' : x.querySelectorAll('button').length ? 'chips' : '?')));
  ok('② 미리 보기 = 학생 문제 꼴(QItem · 칩 · 룬) · 정답 펼침', v0.length === 2 && kinds.join() === 'chips,rune', `${kinds} · ${v0.join(' / ')}`);
  await p.screenshot({ path: `${SHOTS}/packup-2-preview.png` });
  await p.click('.chips2.vers button:has-text("버전 1")'); await p.waitForTimeout(150); const v1 = await prev();
  ok('② 버전 1 = 다른 숫자', v1.length === 2 && v1[1] !== v0[1], v1[1]);
  await p.click('.chips2 button:has-text("형성평가")'); await p.waitForTimeout(150); ok('② 형성평가 미리 보기', (await prev()).length === 2);
  await p.click('.sheet .btn.pmain'); await p.waitForTimeout(400);
  ok('② 저장 → prep/packs/ex-11', await p.evaluate(() => Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('"ex-11"'))));
  ok('🖼 저장 → prep/ex-11/img 7칸 (팩과 같은 자리 · webp)', await p.evaluate(() => { const all = Object.keys(localStorage).map((k) => localStorage.getItem(k) || '').join(''); const keys = Object.keys(localStorage); const val = (c) => { const k = keys.find((x) => x.endsWith(`prep/ex-11/img/${c}`)); return k ? JSON.parse(localStorage.getItem(k) || 'null') : null; }; void all; return ['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'boss'].every((c) => /^data:image\/webp/.test(val(c) || '')) && !val('extra'); }));
  await p.waitForNavigation({ timeout: 5000 }).catch(() => {}); await p.waitForSelector('.tabs');
  // ③ 차시 목록 · 테스트
  await p.click('.tabs button:has-text("준비")').catch(() => {}); await p.waitForTimeout(300);
  const opts = await p.$$eval('.lsel option', (xs) => xs.map((x) => x.textContent));
  ok('③ 차시 ▾ 에 11차시', opts.some((t) => /11차시 예시/.test(t)), opts.filter((t) => /11/.test(t)).join(' | '));
  await p.selectOption('.lsel select', 'ex-11').catch(() => {}); await p.waitForTimeout(200);
  await p.screenshot({ path: `${SHOTS}/packup-3-list.png` });
  // 학생 폰 = 같은 문제 (테스트 방 · 11차시)
  const hall = await ctx.newPage(); await hall.setViewportSize({ width: 1000, height: 800 }); await hall.goto(B + '?role=hall&mode=test&room=PKU&lesson=ex-11'); await hall.waitForSelector('.dock'); // 🧪 시험 TV = ?lesson 차시로 방을 엶
  const s = await ctx.newPage(); await s.goto(B + '?role=student&room=PKU'); await hall.waitForTimeout(1200);
  const next = async () => { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(400); };
  for (let g = 0; g < 8; g++) { const t = await hall.$eval('.fs.now em', (x) => x.textContent).catch(() => ''); if (/문제 1/.test(t)) break; await next(); }
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await s.waitForTimeout(800);
  const q = await s.textContent('.bcard .item').catch(() => '');
  ok('③ 학생 폰 = 올린 팩 문제 (버전 0 · 1번)', /\(A ∪ B\)ᶜ 의 원소를 모두/.test(q), q.replace(/\s+/g, ' ').slice(0, 80));
  await s.screenshot({ path: `${SHOTS}/packup-4-student.png` });
  // ④ 앱 차시(엔진 꼴) 같은 길
  await p.bringToFront(); await openUp();
  await p.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../../src/subjects/common-math2/lessons/set-06.json')); await p.waitForSelector('[data-k="packsum"]');
  const s6 = (await p.textContent('[data-k="packsum"]')).trim(), i6 = (await p.textContent('[data-k="packiss"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('④ 풀 판 6차시(생성기) = 통과 + 「이미 있는 차시」 확인', /검사 통과/.test(s6) && /이미 있는 차시/.test(i6), `${s6} | ${i6.slice(0, 80)}`);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok('360 가로 넘침 0', over <= 0, String(over));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
