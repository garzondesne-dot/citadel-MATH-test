<script lang="ts">
  import { untrack } from 'svelte';
  import type { Store } from '../model/types';
  import { memoryStore } from '../store/device';
  import { openRoom, roomPath } from '../raid/actions';
  import { PACKS } from '../engine/packs';
  import { PROFILES } from '../model/profiles';
  import { ATTACKS, ATTACK_IDS, attackMs } from '../raid/attacks';
  import Student from './Student.svelte';
  // 💥 공격 갤러리 (#161 · 테스트 모드 · 선생님 확인용): 학생 폰 화면 그대로(이 기기 메모리 방 · 데미지 · 기록 없음) + 위에 효과 15개 단추
  //   눌러 보면 지금 문제에서 그 공격을 한 번 맞음 · 😡 분노 = 강(체력 50% 아래) 세기로 · 문제 = 첫 일반 몬스터 · ⚔ = 첫 소레이드(졸개 단계)
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  // 일반 = 소레이드 아닌 첫 몬스터가 있는 첫 차시 · 졸개 = 소레이드 몬스터가 있는 첫 차시 (차시 id 를 쓰지 않음 · #136)
  const pick = (chainy: boolean) => { for (const P of PACKS) { const st = P.steps.find((x) => x.kind === 'monster' && !!P.monsters[x.id] && !!(P.monsters[x.id] as { chain?: unknown }).chain === chainy); if (st) return { L: P, id: st.id }; } return { L: PACKS[0]!, id: PACKS[0]!.steps[0]!.id }; };
  const G1 = pick(false), G2 = pick(true), L6 = G1.L, L7 = G2.L;
  let chain = $state(false), strong = $state(false), now = $state('');
  const code = $derived(chain ? 'GAL2' : 'GAL1'), L = $derived(chain ? L7 : L6);
  function mk(c: string, L: typeof L6, id: string) { openRoom(S, L, c, PROFILES.test); const i = L.steps.findIndex((s) => s.id === id); S.set(`${roomPath(c)}/meta/solve`, 0); S.set(`${roomPath(c)}/state`, { step: i, stepAt: S.now() }); }
  untrack(() => { mk('GAL1', L6, G1.id); mk('GAL2', L7, G2.id); });
  function hit(id: string) { const d = ATTACKS[id]!; now = id; (globalThis as { __strike?: (ms: number, id: string, s: boolean) => void }).__strike?.(attackMs(d, 3, strong), id, strong); }
</script>

<div class="gal">
  <div class="bar" role="toolbar" aria-label="공격 갤러리">
    <b>💥 공격 갤러리</b>
    <button type="button" class:on={strong} aria-pressed={strong} onclick={() => (strong = !strong)}>😡 분노</button>
    <button type="button" class:on={chain} aria-pressed={chain} onclick={() => (chain = !chain)}>⚔ 졸개</button>
    <div class="ids">{#each ATTACK_IDS as id (id)}<button type="button" class="a" class:on={now === id} data-id={id} onclick={() => hit(id)}>{ATTACKS[id]!.icon}<small>{ATTACKS[id]!.name}</small></button>{/each}</div>
  </div>
  {#key code}<div class="scr"><Student {S} {L} {code} uid="gallery" num={0} nick="갤러리" board /></div>{/key}
</div>

<style>
  .gal { position: relative; min-height: 100dvh; }
  .bar { position: relative; z-index: 9; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(8, 9, 12, 0.92); border-bottom: 1px solid var(--line); }
  .bar b { font-size: 14px; margin-right: auto; }
  .bar button { height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 13px var(--font); }
  .bar button.on { border-color: var(--accent); color: var(--accent); }
  .ids { width: 100%; display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
  .ids .a { flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 44px; min-width: 44px; padding: 0 4px; font-size: 16px; line-height: 1; }
  .ids .a small { font-size: 11px; font-weight: 500; margin-top: 2px; }
  .scr { position: relative; }
</style>
