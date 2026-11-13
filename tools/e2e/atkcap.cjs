// 👹 몬스터 공격 「지금 ↔ 새것」 움직이는 그림 (평가판 🧪): 공격 갤러리에서 그 공격을 맞고 · 풀기 동작까지 → 카드 + 노란 단추 둘레만 잘라 webp
//   NODE_PATH=$(npm root -g) node tools/e2e/atkcap.cjs <폴더> <주소> <이름표> <공격…>   (예: http://localhost:4173/ new bind lock · 옛 판은 4174 에 따로 띄워 old)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const [OUT = '.', B = 'http://localhost:4173/', TAG = 'new', ...KINDS] = process.argv.slice(2);
const TMP = fs.mkdtempSync('/tmp/atkcap-');
const ACT = { // 풀기 동작 (사람이 하는 것처럼)
  bind: async (p) => { const r = await p.$eval('.qwrap', (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await p.mouse.move(r.x, r.y); await p.mouse.down(); for (let k = 0; k < 4; k++) { await p.mouse.move(r.x + 90, r.y, { steps: 4 }); await p.mouse.move(r.x - 90, r.y, { steps: 4 }); } await p.mouse.up(); },
  lock: async (p) => { const k = await p.$('.afx .key'); const b = await p.$('.act .pmain'); if (!k || !b) return; const kb = await k.boundingBox(), bb = await b.boundingBox(); await p.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 10 }); await p.mouse.up(); },
};
(async () => {
  const b = await chromium.launch();
  for (const kind of KINDS) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
    await p.goto(B + '?role=atk'); await p.waitForSelector('.ids'); await p.addStyleTag({ content: '.beta-pill,.srv,.newbuild,.bar{visibility:hidden!important}' }); await p.waitForTimeout(600);
    const clip = await p.evaluate(() => { const sc = document.querySelector('.edge, .scene'), q = document.querySelector('.qwrap').getBoundingClientRect(), a = document.querySelector('.act').getBoundingClientRect(), top = sc ? sc.getBoundingClientRect().top + 60 : q.top - 20; return { x: 0, y: Math.max(0, top), width: 390, height: Math.min(844, a.bottom) - Math.max(0, top) }; }); // 장면(용사) + 문제 칸 + 노란 단추
    await p.locator(`.ids button[data-id="${kind}"]`).evaluate((e) => e.click());
    const fr = []; const shot = async (n) => { for (let i = 0; i < n; i++) { const f = path.join(TMP, `${TAG}-${kind}-${String(fr.length).padStart(3, '0')}.png`); await p.screenshot({ path: f, clip }); fr.push(f); await p.waitForTimeout(45); } };
    await shot(26); if (ACT[kind]) { const act = ACT[kind](p); await shot(6); await act; } await shot(18);
    execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nims=[Image.open(f).convert('RGB') for f in sys.argv[2:]]\nw=300;ims=[i.resize((w,round(i.height*w/i.width))) for i in ims]\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:]+[ims[-1]]*8,duration=70,loop=0,quality=72)`, path.join(OUT, `atk-${kind}-${TAG}.webp`), ...fr]);
    console.log(kind, TAG, fr.length, '칸'); await p.context().close();
  }
  await b.close();
})();
