import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

// 🔄 #134 ① 사이트의 판 번호 = version.json (src/build.ts BUILD 그대로) → 화면이 옛 판인지 BETA 알약이 확인
const BUILD = /BUILD = '([^']+)'/.exec(readFileSync(new URL('./src/build.ts', import.meta.url), 'utf8'))?.[1] ?? '';
const versionJson = { name: 'version-json', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); } };

// 📲 #38 베타 서비스 워커 = sw.js 를 빌드 때 만듦 (판 번호 · 이번 빌드 엔진 파일 목록을 넣어서)
//   미리 저장(core) = index · manifest · 아이콘 · 첫 화면 그림 2장 · assets/ 의 js · css (글꼴 조각 · 그림 · 소리 · 배경음은 쓸 때 저장)
type Bundle = Record<string, { fileName: string }>;
const swPlugin = { name: 'beta-sw', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }, _o: unknown, bundle: Bundle) {
  const core = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png', './art/brand-bg-v1.webp', './art/brand-school-logo-v1.webp',
    ...Object.values(bundle).map((b) => b.fileName).filter((f) => /^assets\/.+\.(js|css)$/.test(f)).map((f) => `./${f}`)];
  const src = readFileSync(new URL('./src/sw/sw.template.js', import.meta.url), 'utf8').replace('__BUILD__', BUILD).replace('__CORE__', JSON.stringify(core));
  this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
} };

// base './' = Pages 하위 경로(/citadel-MATH-test/)에서도 그대로 열림
export default defineConfig({
  base: './',
  plugins: [svelte(), versionJson, swPlugin],
  test: { include: ['tests/**/*.test.ts'] },
});
