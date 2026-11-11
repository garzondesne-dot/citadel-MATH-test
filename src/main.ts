import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme } from './theme/theme';

applyTheme('gold');
const target = document.getElementById('app');
if (!target) throw new Error('#app 없음');
export default mount(App, { target });
