// 🎬 zip 안 .mp4 = 영상 (📜 2026-11-14 「전부 진행해」) — 이름 끝맞춤 → 칸 · 저장 = 서버 prep/{팩}/vid · 차시 준비 🎬 목록에서 재생
//   팩 video 칸 「v99-01」 (앱에 없는 파일) + zip 「(11차시) 01_v99-01.mp4」 → c1 · m1 · sum / zip 「도입_intro.mp4」 → intro (video 칸 없이 단계 칸 이름)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/packvid.cjs <폴더> [emu]   (emu = 시험 서버 에뮬레이터 길 · 교사 admins 로그인 · 서버 칸 확인)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { zipSync, strToU8 } = require(path.join(__dirname, '../../node_modules/fflate'));
const [SHOTS = '.', MODE = ''] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..'), EMU = MODE === 'emu', E = EMU ? '&emu=127.0.0.1' : '';
const emu = EMU ? require('./_emu.cjs') : null;
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pack-upload/example-ex-11.json'), 'utf8'));
  pack.id = 'ex-v'; pack.no = 12; pack.title = '영상 시험'; pack.video = [{ file: 'v99-01', at: ['c1', 'm1', 'sum'] }]; delete pack.img;
  const v1 = fs.readFileSync(path.join(ROOT, 'public/video/v11-49.mp4')), v2 = fs.readFileSync(path.join(ROOT, 'public/video/v11-50.mp4'));
  const zp = path.join(SHOTS, 'ex-v.zip'); fs.writeFileSync(zp, zipSync({ 'ex-v.json': strToU8(JSON.stringify(pack)), 'mv/(11차시) 01_v99-01.mp4': v1, '도입_intro.mp4': v2, '모름.mp4': new Uint8Array([0, 1]) }, { level: 0 }));
  const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  if (EMU) { await emu.rest('prep/packs/ex-v', 'DELETE'); await emu.rest('prep/ex-v', 'DELETE'); }
  await p.goto(B + '?role=teacher' + E); await p.evaluate(() => localStorage.clear()); await p.reload();
  if (EMU) { await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await emu.asAdmin(p, '.tabs'); } else await p.waitForSelector('.tabs');
  const can = await p.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'));
  await p.click('.tabs button:has-text("준비")'); await p.click('.seg3 button:has-text("도구")'); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]');
  await p.setInputFiles('[data-k="packfile"]', zp);
  await p.waitForSelector('[data-k="packmedia-sum"]', { timeout: 20000 }); await p.waitForTimeout(800);
  const ms = (await p.textContent('[data-k="packmedia-sum"]')).trim();
  ok('zip 영상 2편 → 칸 c1 · m1 · sum · intro · 모름.mp4 = 칸 못 찾음', /zip 영상 2편/.test(ms) && /c1/.test(ms) && /intro/.test(ms) && /칸을 못 찾은 영상 모름\.mp4/.test(ms), ms);
  ok('없는 영상 ⚠ 없음 (zip 영상이 대신함)', !/영상 없음/.test(await p.textContent('[data-k="packup"]')));
  await p.click('[data-k="packup"] .chips2 button:has-text("개념 1")').catch(() => {}); await p.waitForTimeout(300);
  const pv = await p.$eval('[data-k="packvid"]', (v) => v.getAttribute('src')).catch(() => ''); ok('미리 보기 영상 = 이 기기 Blob', /^blob:/.test(pv), pv.slice(0, 30));
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 30000 }).catch(() => {}); await p.waitForSelector('.tabs');
  if (EMU) {
    const n1 = await emu.rest('prep/ex-v/vid/(11차시)_01_v99-01/n'), n2 = await emu.rest('prep/ex-v/vid/도입_intro/n'), c0 = await emu.rest('prep/ex-v/vid/(11차시)_01_v99-01/c/0');
    ok('서버 = prep/ex-v/vid 두 편 (쪼갬 · 머리 칸)', n1 === 2 && n2 === 2 && typeof c0 === 'string' && c0.length === 1000000, `n ${n1} · ${n2} · 첫 쪼갬 ${c0 && c0.length}`);
    const sp = await emu.rest('prep/packs/ex-v'); const vids = sp && sp.videos;
    ok('서버 팩 videos = rtdb: 주소', vids && /^rtdb:prep\/ex-v\/vid\//.test(vids.c1) && /^rtdb:/.test(vids.intro), JSON.stringify(vids || {}).slice(0, 90));
    await p.reload(); await p.waitForSelector('.tabs', { timeout: 20000 });
  } else {
  const keys = await p.evaluate(() => Object.keys(localStorage).filter((k) => /prep\/ex-v\/vid\//.test(k)).map((k) => k.replace(/^.*prep\//, '')));
  ok('저장 = prep/ex-v/vid/{이름} 두 편 (쪼갬 · 머리 칸)', keys.some((k) => /vid\/\(11차시\)_01_v99-01\/c\/0$/.test(k)) && keys.some((k) => /vid\/도입_intro\/n$/.test(k)), keys.filter((k) => /\/n$/.test(k)).join(' · '));
  const vids = await p.evaluate(() => { const x = localStorage.getItem(Object.keys(localStorage).find((k) => /prep\/packs\/ex-v$/.test(k))); return x ? JSON.parse(x).videos : null; });
  ok('팩 videos = rtdb: 주소', vids && /^rtdb:prep\/ex-v\/vid\//.test(vids.c1) && /^rtdb:/.test(vids.intro) && vids.c1 === vids.sum, JSON.stringify(vids).slice(0, 90));
  }
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300); await p.selectOption('.lsel select', 'ex-v'); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.waitForTimeout(400);
  const vb = (await p.textContent('[data-k="vid-go"]')).trim(); ok('차시 준비 「영상 2편 · 칸 4곳」', /영상 2편/.test(vb) && /칸 4곳/.test(vb), vb);
  await p.click('[data-k="vid-go"]'); await p.waitForSelector('[data-k="vidlist"]'); await p.click('[data-k="vidlist"] .row >> nth=1');
  await p.waitForSelector('[data-k="prepvid"]', { timeout: 15000 }).catch(() => {});
  const r = await p.evaluate(async () => { const v = document.querySelector('[data-k="prepvid"]'); if (!v) return null; const blob = await (await fetch(v.src)).blob(); return { src: v.src.slice(0, 5), size: blob.size, type: blob.type }; });
  ok('🎬 목록 재생 = 서버 영상 받아 Blob (바이트 같음)', r && r.src === 'blob:' && r.size === v1.length, JSON.stringify(r));
  await p.waitForTimeout(1500); const st = await p.$eval('[data-k="prepvid"]', (v) => ({ rs: v.readyState, d: v.duration, err: v.error && v.error.code })).catch(() => null);
  out.push(`ℹ 이 시험 브라우저 H.264 재생: canPlayType=「${can}」 · readyState ${st?.rs} · 길이 ${st?.d} · 오류 ${st?.err}`);
  await p.screenshot({ path: path.join(SHOTS, 'packvid-list.png') });
  if (EMU) { // 📺 TV 🎬 = 같은 부품 · 서버 영상 받아 재생 (교사 「테스트 해 보기」로 ex-v 수업 → TV 종합실 키 → 영상 켬)
    await p.click('.sheet .bar .x').catch(() => {}); await p.click('.tact .btn'); await p.waitForTimeout(1500);
    const live = await emu.rest('school/live'); ok('ex-v 수업 열림', live && live.lesson === 'ex-v', JSON.stringify(live));
    const tctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), tv = await tctx.newPage(); tv.on('pageerror', (e) => errs.push(String(e)));
    await tv.goto(B + '?role=hall' + E); await emu.asHost(tv, live.code); await tv.waitForSelector('.dock', { timeout: 20000 });
    await emu.rest(`rooms/${live.code}/state/video`, 'PUT', 'c1');
    await tv.waitForSelector('[data-k="tvvid"]', { timeout: 20000 }).catch(() => {});
    const tr = await tv.evaluate(async () => { const v = document.querySelector('[data-k="tvvid"]'); if (!v) return { none: document.querySelector('.ov.vid')?.textContent || '덮개 없음' }; const bl = await (await fetch(v.src)).blob(); return { src: v.src.slice(0, 5), size: bl.size }; });
    ok('📺 TV 🎬 = 서버 영상 재생 (바이트 같음)', tr.src === 'blob:' && tr.size === v1.length, JSON.stringify(tr));
    await tv.waitForTimeout(1200); await tv.screenshot({ path: path.join(SHOTS, 'packvid-tv.png') });
    await emu.rest(`rooms/${live.code}/state/video`, 'DELETE'); await emu.rest('school/live', 'DELETE');
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); if (EMU) { await emu.rest('prep/packs/ex-v', 'DELETE'); await emu.rest('prep/ex-v', 'DELETE'); } await b.close();
})();
