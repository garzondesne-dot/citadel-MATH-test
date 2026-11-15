// 📈 활용 추이 (에뮬레이터 · 📜 2026-11-15 머리 🔨 「대시보드 = 옛 정식 그대로」 (a))
//   ① 학생이 캠프에 들어오면 act/{반}/{오늘}/{번호}.v = 1 (규칙 통과 · 하루 한 번) ② 교사 대시보드 「활용 추이」 = 기록 시작 줄 · KPI 4 · 막대 3(기록 전 ≈ 줄무늬) · 학생별 표 · 📥 CSV
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const pad = (n) => String(n).padStart(2, '0'), ymd = (t) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; };
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' });
  const now = Date.now(), D = 864e5, t1 = ymd(now - D), t9 = ymd(now - 9 * D);
  await rest('', 'PATCH', {
    roster: { '1-3': { 3: '시험삼', 5: '시험오', 6: '시험육' } }, rosterMask: { '1-3': { 3: '시*삼', 5: '시*오', 6: '시*육' } },
    act: { '1-3': { [t1]: { 5: { r: 2, c: 1, v: 1, at: now - D } }, [t9]: { 5: { r: 1, at: now - 9 * D }, 6: { v: 1, j: 1, at: now - 9 * D } } } },
    gem: { '1-3': { 6: { total: 10, log: { rift1: { at: now - 30 * D, why: '복습' } } } } },
  });
  const b = await chromium.launch();
  // ① 학생 접속 기록
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(2000); }
  await s.waitForTimeout(1500);
  const mine = await rest(`act/1-3/${ymd(Date.now())}/3`);
  ok('① 학생 캠프 접속 = 오늘 칸 v 1 (규칙 통과)', mine && mine.v === 1, JSON.stringify(mine));
  await s.reload(); await s.waitForTimeout(4000);
  ok('① 다시 열어도 하루 한 번', (await rest(`act/1-3/${ymd(Date.now())}/3`))?.v === 1);
  // ② 교사 대시보드
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&${E}`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400);
  await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800);
  await p.click('.grp button:has-text("우리 반 어때")'); await p.waitForTimeout(300); await p.click('.vws button:has-text("활용 추이")'); await p.waitForTimeout(1000);
  const note = await p.textContent('[data-k="use-note"]').catch(() => '');
  ok('② 기록 시작 줄 (≈ 추정)', /기록 시작 \d+\/\d+ — 그 전 주는 ≈ 추정/.test(note), note);
  const kp = await p.$$eval('.kp b', (x) => x.map((e) => e.textContent));
  ok('② KPI 4 = 활동 1/3 · 풀이 3회 · 1인당 · 접속 2/3', kp.length === 4 && kp[0] === '1 / 3명' && kp[1] === '3회' && kp[3] === '2 / 3명', kp.join(' | '));
  const nBars = await p.$$eval('.chart', (x) => x.length), nEst = await p.$$eval('.bc.est', (x) => x.length);
  ok('② 막대 3 · 기록 전 주 = ≈ 줄무늬', nBars === 3 && nEst >= 3, `막대 ${nBars} · 줄무늬 칸 ${nEst}`);
  const row1 = await p.$$eval('tbody tr:first-child td', (x) => x.map((e) => e.textContent));
  ok('② 학생별 표 1등 = 5번 · 최근 7일 3 · 그 전 7일 1 · ▲ 2', row1[0] === '5' && row1[2] === '3' && row1[3] === '1' && /▲ 2/.test(row1[4]), row1.join(' | '));
  await p.screenshot({ path: `${SHOTS}/usage-dash.png`, fullPage: true });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-k="csv"]')]);
  const txt = require('fs').readFileSync(await dl.path(), 'utf8');
  ok('② 📥 CSV = 머리줄 + 3명', /^﻿반,번호,이름/.test(txt) && txt.trim().split('\n').length === 4, dl.suggestedFilename());
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
