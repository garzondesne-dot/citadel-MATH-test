import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme, savedTheme } from './theme/theme';
import { chooseStore } from './store/config';
import { startPwa } from './pwa.svelte';
import { addPacks } from './engine/packs';
import { loadUploaded } from './school/packUpload';

applyTheme(savedTheme(), { tv: new URLSearchParams(location.search).get('role') === 'hall' });
startPwa(); // 📲 #38 서비스 워커 · 설치 단추
const target = document.getElementById('app');
if (!target) throw new Error('#app 없음');
// 🔌 「어느 서버」 (#137): 사이트 server.json · ?emu= → 이 기기 / 시험 서버 꽂개를 고른 뒤 화면을 띄움
// 🔐 #163-① 방은 필요할 때 받음 → 주소에 방이 있으면(학생 · TV 시험) 그 방을 먼저 받고 화면을 띄움
void chooseStore().catch((e) => { (window as { bootShow?: (t: string) => void }).bootShow?.('⚠ 서버에 닿지 않아요'); throw e; }).then(async ({ S, where }) => {
  const room = new URLSearchParams(location.search).get('room') || new URLSearchParams(location.search).get('join');
  if (room && S.fetch) await S.fetch(`rooms/${room}`).catch(() => null);
  addPacks(await loadUploaded(S)); // 📦 올린 차시 팩 (L1 · 서버 = 거울 밖 칸 · 화면을 띄우기 전에 차시 목록에)
  mount(App, { target, props: { S, where } });
  requestAnimationFrame(() => (window as { bootDone?: () => void }).bootDone?.()); // ⏳ 첫 화면(index.html) 지움 = 앱이 그려진 다음 프레임
});
