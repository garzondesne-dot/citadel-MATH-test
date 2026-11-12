<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { DungeonProfile, LessonPack, Store } from '../model/types';
  import { openRoom } from '../raid/actions';
  import { type Live } from '../school/school';
  import { clock, useClock } from './clock.svelte';
  import { liveValue } from './room.svelte';
  import TV from './tv/TV.svelte';

  // 🖥 교실 TV (#119 ⑮) — 교사 폰이 연 수업(school/live)을 따라감 · 수업이 없으면 교사 캠프
  //   주소에 ?room= 이 있으면 그 방(시험 · 두 탭 체험: 없으면 그 던전으로 만들고 1-1반으로 봄)
  const { S, L, code, P, fixed }: { S: Store; L: LessonPack; code: string; P: DungeonProfile; fixed: boolean } = $props();
  const stopClock = useClock();
  const lv = untrack(() => liveValue<Live>(S, 'school/live'));
  onDestroy(() => { stopClock(); lv.stop(); });
  const devLive = untrack(() => { if (!fixed) return null; openRoom(S, L, code, P); return { code, cls: '1-1', lesson: L.id, key: '0000' } as Live; });
  const live = $derived(devLive ?? lv.v.val);
  const now = $derived(clock.now);
</script>

{#key live?.code ?? ''}<TV {S} {L} {live} {now} />{/key}
