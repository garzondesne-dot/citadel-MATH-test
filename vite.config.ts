import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' = Pages 하위 경로(/citadel-MATH-test/)에서도 그대로 열림
export default defineConfig({
  base: './',
  plugins: [svelte()],
  test: { include: ['tests/**/*.test.ts'] },
});
