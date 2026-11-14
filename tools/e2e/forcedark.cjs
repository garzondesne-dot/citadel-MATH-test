// 🌗 폰 다크 모드 · 강제 어둡게 무시 (📜 2026-11-14 선생님 「웹앱이 다크 모드는 적용 안 되게」): 크롬 강제 다크(--blink-settings=forceDarkModeEnabled · 안드로이드 「자동 어둡게」 · 삼성 인터넷과 같은 엔진) + prefers-color-scheme dark 에서
//   학생 · 리모컨 · TV · 제출 모드(밝은 테마 구름) 화면이 보통 때와 같은지 = 같은 화면 캡처 두 장의 픽셀 차이
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/forcedark.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { execFileSync } = require('child_process');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
const SCENES = [
  ['student-gold', 390, 844, async (p) => { await p.goto(B + '?role=atk'); await p.waitForSelector('.ids'); }],
  ['student-cloud', 390, 844, async (p) => { await p.goto(B + '?role=atk'); await p.evaluate(() => localStorage.setItem('citadel-v1-theme', 'cloud')); await p.reload(); await p.waitForSelector('.ids'); }],
  ['student-paper', 390, 844, async (p) => { await p.goto(B + '?role=atk'); await p.evaluate(() => { localStorage.setItem('citadel-v1-theme', 'gold'); localStorage.setItem('citadel-v1-submit', '1'); }); await p.reload(); await p.waitForSelector('.ids'); }],
  ['teacher', 400, 860, async (p) => { await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); }],
  ['tv', 1280, 720, async (p) => { await p.goto(B + '?role=hall'); await p.waitForTimeout(2500); }],
];
(async () => {
  const errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const shoot = async (args, scheme, tag) => { const b = await chromium.launch({ args }); const res = {};
    for (const [name, w, h, go] of SCENES) { const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const p = await ctx.newPage(); await go(p); await p.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important} .beta-pill,.srv,.newbuild,canvas{visibility:hidden!important}' }); await p.waitForTimeout(900); const f = path.join(SHOTS, `fd-${name}-${tag}.png`); await p.screenshot({ path: f }); res[name] = f; await ctx.close(); }
    await b.close(); return res; };
  const base = await shoot([], 'light', 'normal');
  const dark = await shoot(['--blink-settings=forceDarkModeEnabled=true,forceDarkModeInversionAlgorithm=4'], 'dark', 'forced');
  for (const [name] of SCENES) {
    const d = Number(execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image, ImageChops\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')\nd=ImageChops.difference(a,b).convert('L').point(lambda v:255 if v>40 else 0)\nprint(sum(1 for v in d.get_flattened_data() if v)/(a.width*a.height))`, base[name], dark[name]]).toString().trim());
    ok(`${name} 강제 다크 = 보통과 같음`, d < 0.01, `다른 픽셀 ${(d * 100).toFixed(2)}%`);
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0');
})();
