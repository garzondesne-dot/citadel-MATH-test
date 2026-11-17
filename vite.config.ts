import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { zipSync } from 'fflate';
import { join } from 'node:path';

// 🔄 #134 ① 사이트의 판 번호 = version.json (src/build.ts BUILD 그대로) → 화면이 옛 판인지 BETA 알약이 확인
const BUILD = /BUILD = '([^']+)'/.exec(readFileSync(new URL('./src/build.ts', import.meta.url), 'utf8'))?.[1] ?? '';
// 📲 출시 막는 것 7 (📜 2026-11-14): 판 하나 = 이름 둘 — VITE_CHANNEL=release 로 빌드하면 정식 이름 · 아이콘 · manifest id(./ = 정식 앱과 같은 앱으로 이어짐) · 그 밖(베타 Pages · 시험) = 베타 그대로
const CH = process.env.VITE_CHANNEL === 'release' ? 'release' : 'beta';
// 🏫 학교판 (📜 머리 🔨): VITE_SCHOOL=<코드> → tools/school/schools.json 의 그 학교 = 빈 과목 팩(school) + 과목 이름 + 표준 묶음 + 그 학교 server.json · 앱 이름 「모두의 던전 : <과목>」
//   빌드: VITE_SCHOOL=srzmf npx vite build --outDir <사이트>/s/srzmf (정식 · 베타와 같은 코드 · 다른 점 = CLAUDE.md 「🏫 학교판 규칙」 목록만)
const SCHOOL_CODE = process.env.VITE_SCHOOL || '';
const SCHOOL = SCHOOL_CODE ? (JSON.parse(readFileSync(new URL('./tools/school/schools.json', import.meta.url), 'utf8')) as Record<string, { name: string; subject: string; fb: Record<string, string> }>)[SCHOOL_CODE] : null;
if (SCHOOL_CODE && !SCHOOL) throw new Error(`학교 목록에 없는 코드: ${SCHOOL_CODE}`);
const ID = SCHOOL
  ? { name: `모두의 던전 : ${SCHOOL.subject}`, short: '모두의 던전', desc: `${SCHOOL.name} ${SCHOOL.subject} 협동 던전 학습 게임`, id: './', start: './index.html', bg: '#14110f',
      icons: ['icons/icon-192-v2.png', 'icons/icon-512-v2.png', 'icons/icon-maskable-512-v2.png'], apple: 'icons/apple-touch-icon-v2.png', fav: 'icons/icon-192-v2.png' }
  : CH === 'release'
  ? { name: '모두의 던전 : 공통수학2', short: '모두의 던전', desc: '함께 풀고, 모두 함께 돌파하라 — 공통수학2 협동 던전 학습 게임 (학생 폰 · 교사 폰 · 종합상황실)', id: './', start: './index.html', bg: '#14110f',
      icons: ['icons/icon-192-v2.png', 'icons/icon-512-v2.png', 'icons/icon-maskable-512-v2.png'], apple: 'icons/apple-touch-icon-v2.png', fav: 'icons/icon-192-v2.png' }
  : { name: '모두의 던전 베타', short: '던전 베타', desc: '공통수학2 교실 협동 레이드 · 베타(시험판)', id: '/citadel-MATH-test/', start: './', bg: '#0f1115',
      icons: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'], apple: 'icons/apple-touch-icon.png', fav: 'icons/favicon-32.png' };
// 🔔 알림 작은 아이콘 = 흰 실루엣 (📜 2026-11-17 #19 · 알림 badge 96 · manifest monochrome 192)
const BADGE = 'icons/badge-dungeon-v2-192.png', BADGE96 = 'icons/badge-dungeon-v2-96.png';
const manifest = { name: ID.name, short_name: ID.short, description: ID.desc, id: ID.id, start_url: ID.start, scope: './', display: 'standalone', lang: 'ko', background_color: ID.bg, theme_color: ID.bg,
  icons: [{ src: ID.icons[0], sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: ID.icons[1], sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: ID.icons[2], sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: BADGE, sizes: '192x192', type: 'image/png', purpose: 'monochrome' }] };
// version.json = build(베타 화면이 읽음) + v(정식 fresh.js 가 읽음 → 옛 정식 폰이 판이 바뀐 걸 알고 한 번 새로 고침)
const versionJson = { name: 'version-json', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
  this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD, v: `citadel-1.0-${BUILD}` }) });
  this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) });
} };
const htmlId = { name: 'html-id', transformIndexHtml(h: string) {
  if (CH !== 'release' && !SCHOOL) return h;
  return h.replace('<title>모두의 던전 베타</title>', `<title>${ID.name}</title>`).replace('content="던전 베타"', `content="${ID.short}"`)
    .replace(/<link rel="icon"[^>]*favicon-32\.png" \/>/, `<link rel="icon" type="image/png" href="./${ID.fav}" />`).replace(/\s*<link rel="icon"[^>]*favicon-16\.png" \/>/, '')
    .replace('href="./icons/apple-touch-icon.png"', `href="./${ID.apple}"`);
} };

// 📲 #38 베타 서비스 워커 = sw.js 를 빌드 때 만듦 (판 번호 · 이번 빌드 엔진 파일 목록을 넣어서)
//   미리 저장(core) = index · manifest · 아이콘 · 첫 화면 그림 2장 · assets/ 의 js · css (글꼴 조각 · 그림 · 소리 · 배경음은 쓸 때 저장)
//   🐞 (📜 2026-11-15 출시 리허설): CSS 만 있는 동적 import(classic.css)는 빌드 목록엔 빈 js 조각으로 잡혔다가 쓰기 전에 빠짐 → 그 이름이 미리 저장 목록에 들어가 설치가 실패 · 새 워커가 영영 안 켜짐
//   → 파일을 다 쓴 뒤(writeBundle) 실제로 있는 파일만 목록에 넣음
type Bundle = Record<string, { fileName: string }>;
const swPlugin = { name: 'beta-sw', writeBundle(o: { dir?: string }, bundle: Bundle) {
  const out = o.dir ?? 'dist', has = (f: string) => existsSync(join(out, f));
  const core = ['./', './index.html', './manifest.webmanifest', ...[...ID.icons, ID.apple, ID.fav, BADGE, BADGE96, 'fonts/dungeon-icons-v2.woff'].filter((x, i, a) => a.indexOf(x) === i).map((x) => `./${x}`), './art/brand-bg-v1.webp', './art/brand-school-logo-v1.webp',
    ...Object.values(bundle).map((b) => b.fileName).filter((f) => /^assets\/.+\.(js|css)$/.test(f)).map((f) => `./${f}`)].filter((u) => u === './' || has(u.slice(2)));
  const src = readFileSync(new URL('./src/sw/sw.template.js', import.meta.url), 'utf8').replace('__BUILD__', BUILD).replace('__CORE__', JSON.stringify(core));
  writeFileSync(join(out, 'sw.js'), src);
  if (SCHOOL) writeFileSync(join(out, 'server.json'), JSON.stringify({ mode: 'server', firebase: SCHOOL.fb, school: { code: SCHOOL_CODE, name: SCHOOL.name, subject: SCHOOL.subject } }, null, 2)); // 🏫 그 학교 서버(공개 설정값)
} };

// 👩‍🏫 체험판 (📜 2026-11-17 #33): 같은 빌드를 trial/ 에서 = trial/index.html(<base href="../"> · 그림 · 엔진은 위 폴더 그대로 · <meta dungeon-trial>) + trial/manifest(「던전 체험판」 따로 설치) · 학교판엔 없음
let OUT_DIR = 'dist';
const trialPlugin = { name: 'trial', configResolved(c: { root: string; build: { outDir: string } }) { OUT_DIR = join(c.root, c.build.outDir).replace(/^(.*?)(\/\/?)$/, '$1'); if (c.build.outDir.startsWith('/')) OUT_DIR = c.build.outDir; }, closeBundle() {
  if (SCHOOL) return;
  const out = OUT_DIR, ix = join(out, 'index.html'); if (!existsSync(ix)) return;
  const h = readFileSync(ix, 'utf8').replace('<head>', '<head>\n    <base href="../" />\n    <meta name="dungeon-trial" content="1" />')
    .replace(/<title>[^<]*<\/title>/, '<title>모두의 던전 체험판</title>').replace(/(name="apple-mobile-web-app-title" content=")[^"]*"/, '$1던전 체험판"')
    .replace(/href="\.\/manifest\.webmanifest"/, 'href="./trial/manifest.webmanifest"');
  mkdirSync(join(out, 'trial'), { recursive: true }); writeFileSync(join(out, 'trial', 'index.html'), h);
  const up = (u: string) => `../${u}`;
  writeFileSync(join(out, 'trial', 'manifest.webmanifest'), JSON.stringify({ ...manifest, name: '모두의 던전 체험판', short_name: '던전 체험판', description: '선생님이 혼자 10분 해 보는 체험판 · 로그인 없음 · 기록 안 남음', id: './', start_url: './', scope: './',
    icons: manifest.icons.map((i: { src: string }) => ({ ...i, src: up(i.src) })) }, null, 2));
} };
// base './' = Pages 하위 경로(/citadel-MATH-test/)에서도 그대로 열림
// 📦 차시 팩 만들기 꾸러미 (📜 2026-11-17 #22 ④ 1단계) = 저장소 kit/ (머리 hero-v2 docs/handoff/kit/ 원본 · README 빼고) → 사이트 kit/ 에 zip 하나 · 빌드 때마다 다시 묶음
export const KIT_ZIP = '모두의던전_차시팩_만들기_꾸러미.zip';
const kitZip = {
  name: 'kit-zip',
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: Uint8Array }) => void }) {
    const dir = new URL('./kit/', import.meta.url); if (!existsSync(dir)) return;
    // 📜 #23: 공개 전 = 정식 빌드에는 zip 안 넣음(베타만) · 공개 = src/channel.ts KIT_PUBLIC = true
    if (CH === 'release' && !/KIT_PUBLIC = true/.test(readFileSync(new URL('./src/channel.ts', import.meta.url), 'utf8'))) return;
    const files = Object.fromEntries(readdirSync(dir).filter((n) => n !== 'README.md' && !n.startsWith('.')).sort().map((n) => [n, new Uint8Array(readFileSync(new URL(n, dir)))]));
    if (Object.keys(files).length) this.emitFile({ type: 'asset', fileName: `kit/${KIT_ZIP}`, source: zipSync(files, { level: 6, mtime: new Date('2026-11-17T00:00:00Z') }) });
  },
};
export default defineConfig({
  base: './',
  define: SCHOOL ? { 'import.meta.env.VITE_SUBJECT': JSON.stringify('school'), 'import.meta.env.VITE_SCHOOL_SUBJECT': JSON.stringify(SCHOOL.subject), 'import.meta.env.VITE_SCHOOL_NAME': JSON.stringify(SCHOOL.name), 'import.meta.env.VITE_BUNDLE': JSON.stringify('basic') } : {},
  plugins: [svelte(), versionJson, htmlId, swPlugin, kitZip, trialPlugin],
  test: { include: ['tests/**/*.test.ts'] },
});
