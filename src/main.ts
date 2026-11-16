import { TEST_ADDR } from './channel'; // 🧪 맨 먼저 = 출시 주소면 시험 고리 잠금 (출시 막는 것 9)
import './oldUrl'; // 🔗 옛 정식 주소(?code= · &key=)를 지금 꼴로 · 키는 주소에서 곧바로 지움 (출시 막는 것 8)
import { mount } from 'svelte';
// 🔍 iOS 사파리는 user-scalable=no 를 무시 → 두 손가락 확대 · 두 번 톡 확대를 직접 막음 (📜 2026-11-16 선생님 「줌이 당겨짐 · 안 당겨지게」)
if (typeof document !== 'undefined') {
  const stop = (e: Event) => e.preventDefault();
  for (const k of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(k, stop, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // 두 번 톡 확대 = CSS touch-action (빠른 숫자 두 번 누름은 그대로 들어가야 해서 touchend 는 막지 않음)
}
import App from './App.svelte';
import { applyTheme, savedTheme } from './theme/theme';
import { chooseStore } from './store/config';
import { startPwa } from './pwa.svelte';
import { addPacks, PACKS } from './engine/packs';
import { loadVids } from './school/video';
import { loadUploaded } from './school/packUpload';
import { loadCastles } from './school/castle';
import { addCastles } from './school/castles.svelte';
import { prefetchStudent, preloadRole } from './ui/lazy';

applyTheme(savedTheme(), { tv: new URLSearchParams(location.search).get('role') === 'hall' });
startPwa(); // 📲 #38 서비스 워커 · 설치 단추
const target = document.getElementById('app');
if (!target) throw new Error('#app 없음');
// 🔌 「어느 서버」 (#137): 사이트 server.json · ?emu= → 이 기기 / 시험 서버 꽂개를 고른 뒤 화면을 띄움
// 🔐 #163-① 방은 필요할 때 받음 → 주소에 방이 있으면(학생 · TV 시험) 그 방을 먼저 받고 화면을 띄움
// 📦 (📜 2026-11-16 로딩 줄이기) 교사 · TV · 갤러리 화면 묶음 = 서버 연결과 같이 받기 시작
const rolePre = preloadRole(new URLSearchParams(location.search).get('role')).catch(() => null);
void chooseStore().catch((e) => { (window as { bootShow?: (t: string) => void }).bootShow?.('⚠ 서버에 닿지 않아요'); throw e; }).then(async ({ S, where }) => {
  const room = new URLSearchParams(location.search).get('room') || new URLSearchParams(location.search).get('join');
  // 📦 방 · 올린 차시 팩 · 성채 팩 = 서로 기다리지 않고 한꺼번에 받음 (더하는 순서는 그대로: 차시 팩 → 영상 → 성채)
  const [, up, cas] = await Promise.all([room && S.fetch ? S.fetch(`rooms/${room}`).catch(() => null) : null, loadUploaded(S), loadCastles(S)]);
  { const r0 = new URLSearchParams(location.search).get('role'); addPacks(up.filter((p) => !(p.hide && (!r0 || r0 === 'camp')))); } await loadVids(S, PACKS); // 👀 숨긴 팩 = 학생 캠프에서만 빠짐 (수업 · 교사 · TV 는 그대로) // 📦 … · 🎬 차시 준비에서 더한 영상(prep/vids)
  addCastles(cas); // 🏰 올린 성채 팩 (prep/addons/castle · 📜 2026-11-14)
  // 📦 올린 차시 팩 (L1 · 서버 = 거울 밖 칸 · 화면을 띄우기 전에 차시 목록에)
  { const m = /^(\d-\d):(\d+)$/.exec(new URLSearchParams(location.search).get('as') || ''); if (m && where.kind === 'emulator' && TEST_ADDR) { const { emuAsLogin } = await import('./school/school'); const e = await emuAsLogin(S, m[1]!, Number(m[2])); if (e) console.warn('?as 로그인', e); } } // 🧪 에뮬레이터 ?as = 진짜 로그인 (📜 2026-11-14 규칙 학생 칸 주인)
  await rolePre; // 📦 교사 · TV · 갤러리 묶음을 받은 뒤 그림 (빈 화면 없이 로딩 용사 그대로)
  mount(App, { target, props: { S, where } });
  { const r = new URLSearchParams(location.search).get('role'); if (!r || r === 'student' || r === 'camp') prefetchStudent(); } // 📦 학생 화면 = 쉬는 틈에 캠프 · 쉼터 묶음 미리
  requestAnimationFrame(() => (window as { bootDone?: () => void }).bootDone?.()); // ⏳ 첫 화면(index.html) 지움 = 앱이 그려진 다음 프레임
});
