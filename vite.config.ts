import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

// 🔄 #134 ① 사이트의 판 번호 = version.json (src/build.ts BUILD 그대로) → 화면이 옛 판인지 BETA 알약이 확인
const BUILD = /BUILD = '([^']+)'/.exec(readFileSync(new URL('./src/build.ts', import.meta.url), 'utf8'))?.[1] ?? '';
const versionJson = { name: 'version-json', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); } };

// base './' = Pages 하위 경로(/citadel-MATH-test/)에서도 그대로 열림
export default defineConfig({
  base: './',
  plugins: [svelte(), versionJson],
  test: { include: ['tests/**/*.test.ts'] },
});
