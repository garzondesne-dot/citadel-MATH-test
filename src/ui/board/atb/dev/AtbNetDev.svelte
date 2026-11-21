<script lang="ts">
  // 🧪 게시판 던전 여럿이 한 판 시험 (테스트 주소만 · ?role=atbnet2 = 폰 두 대(iframe) · 같은 메모리 서버 칸) — 📜 요청 #48
  import { memoryStore } from '../../../../store/device';
  import { PACKS } from '../../../../engine/packs';
  import { HEROES } from '../../../../model/hero';
  import type { Store } from '../../../../model/types';
  import type { Meta } from '../../../../board/atb/net';
  import AtbNet from '../AtbNet.svelte';
  const q = new URLSearchParams(location.search), two = q.get('role') === 'atbnet2', u = q.get('u') ?? 's1_3_1';
  type W = Window & { __atbStore?: Store; __atbEnd?: unknown };
  const P = (two ? window : window.parent) as W;
  const store: Store = P.__atbStore ?? (P.__atbStore = memoryStore());
  const id = (n: string) => HEROES.find((h) => h.name === n)!.id;
  const L = PACKS.find((p) => p.no === 2 && !p.partOf)!;
  const meta: Meta = { v: 1, pid: 'dev', lid: L.id, no: 2, diff: 'normal', seed: 11, t0: Date.now(), slots: [
    { uid: 's1_3_1', cls: '1-3', num: 1, hero: id('로안'), lv: 1, enh: 1, tier: 1, nick: 'A' }, { uid: 's1_3_2', cls: '1-3', num: 2, hero: id('발도르'), lv: 1, enh: 1, tier: 1, nick: 'B' },
    { bot: 'normal', hero: id('루멘') }, { bot: 'normal', hero: id('누아') }] };
  if (!store.get('atb/dev/meta')) store.set('atb/dev/meta', meta); // 한 대만 열어도 됨 (빈 친구 자리 = 봇이 이어받음)
  const names = { s1_3_1: '테스트 가', s1_3_2: '테스트 나' };
</script>

{#if two}
  <div class="two"><iframe title="폰 1" src="?role=atbnet&u=s1_3_1" data-k="phone-1"></iframe><iframe title="폰 2" src="?role=atbnet&u=s1_3_2" data-k="phone-2"></iframe></div>
{:else}
  <AtbNet S={store} pid="dev" uid={u} {names} onend={(r) => { (window as W).__atbEnd = r; }} />
{/if}

<style>
  .two { display: grid; gap: 4px; }
  iframe { width: 844px; height: 390px; border: 0; display: block; }
</style>
