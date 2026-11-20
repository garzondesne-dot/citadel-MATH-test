// 🐢 느린 망 · 저사양 조건 (🐞 11/20 버그 사냥) — 어떤 e2e 든 앞에 붙이면 모든 페이지가 느려짐
//   NODE_PATH=$(npm root -g) node -r ./tools/e2e/_slow.cjs tools/e2e/mailhold-emu.cjs <그림 폴더>
//   CPU = SLOW_CPU 배 느림(기본 4 · 저사양 폰) · HTTP = SLOW_LAT ms 지연 + SLOW_KBPS 속도(기본 150 ms · 1600 kbps ≈ 빠른 3G · 교실 와이파이 붐빌 때)
//   Firebase 웹소켓(에뮬레이터 9000) = 오가는 메시지마다 SLOW_WS ms 늦춤(기본 200 · 순서 그대로) → 「서버 값이 오기 전」 창이 길어짐
const pw = require('playwright');
const CPU = Number(process.env.SLOW_CPU || 4), LAT = Number(process.env.SLOW_LAT || 150), KBPS = Number(process.env.SLOW_KBPS || 1600), WS = Number(process.env.SLOW_WS || 200);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const K = Number(process.env.SLOW_WAIT || 3); // 시험의 고정 대기 · 기다림 한도도 같이 늘림 (앱이 아니라 시험이 먼저 넘어지지 않게)
function stretch(page) {
  const wt = page.waitForTimeout.bind(page), ws = page.waitForSelector.bind(page), sd = page.setDefaultTimeout.bind(page);
  page.waitForTimeout = (ms) => wt(ms * K);
  page.waitForSelector = (sel, o = {}) => ws(sel, { ...o, timeout: (o.timeout ?? 30000) * K });
  page.setDefaultTimeout = (ms) => sd(ms * K);
  sd(30000 * K);
}
async function slowPage(page) {
  stretch(page);
  try {
    const c = await page.context().newCDPSession(page);
    await c.send('Network.enable');
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: LAT, downloadThroughput: (KBPS * 1024) / 8, uploadThroughput: (KBPS * 1024) / 8 });
    await c.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  } catch (e) { console.warn('🐢 CDP 못 붙임', String(e).slice(0, 80)); }
}
async function slowWs(ctx) {
  await ctx.routeWebSocket(/:9000\//, (ws) => {
    const srv = ws.connectToServer();
    let up = Promise.resolve(), down = Promise.resolve();
    ws.onMessage((m) => { up = up.then(() => wait(WS)).then(() => srv.send(m)).catch(() => {}); });
    srv.onMessage((m) => { down = down.then(() => wait(WS)).then(() => ws.send(m)).catch(() => {}); });
  });
}
const launch0 = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await launch0(...a), nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...o) => { const ctx = await nc(...o); await slowWs(ctx); const npg = ctx.newPage.bind(ctx); ctx.newPage = async () => { const p = await npg(); await slowPage(p); return p; }; return ctx; };
  b.newPage = async (...o) => { const ctx = await b.newContext(...o); const p = await ctx.newPage(); return p; };
  void np;
  return b;
};
console.log(`🐢 느린 조건: CPU ×${CPU} · HTTP ${LAT} ms · ${KBPS} kbps · 웹소켓 ${WS} ms · 시험 대기 ×${K}`);
