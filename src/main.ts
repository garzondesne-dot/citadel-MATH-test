import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme } from './theme/theme';
import { chooseStore } from './store/config';

applyTheme('gold');
const target = document.getElementById('app');
if (!target) throw new Error('#app 없음');
// 🔌 「어느 서버」 (#137): 사이트 server.json · ?emu= → 이 기기 / 시험 서버 꽂개를 고른 뒤 화면을 띄움
void chooseStore().then(({ S, where }) => mount(App, { target, props: { S, where } }));
