<script lang="ts">
  import type { Store } from '../../model/types';
  import { BUNDLES, FEATS, featCfg, saveBundle, saveOne, stateOf, lockOf, wanted, schoolInfo } from '../../school/features.svelte';
  import { CLASSES } from '../../school/school';
  // ⚙ 우리 학교 기능 (V1-DESIGN 10절 · 교사 「나」 탭): 묶음(시작값) 하나 고르고 → 낱낱 스위치로 더하고 뺌
  //   🔒 잠김 = 켰지만 「필요한 것」(과목 팩 · AI 키) 없음 → 채우는 길 한 줄 · 꺼진 기능은 학생 · TV 화면에서 통째로 사라짐
  const { S }: { S: Store } = $props();
  const c = $derived(featCfg());
  const groups = [...new Set(FEATS.map((f) => f.group))];
  // 🏫 학교 정보 · 반 목록 (school/info/classes · 처음 반 = 첫째) — 교시 시각 · 요일 교시는 같은 칸(bells · periods)에 저장 · 화면은 다음 판
  let cls = $state((() => { void schoolInfo.ver; return CLASSES.join(', '); })());
  const clsList = $derived(cls.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean));
  let saved = $state('');
  function saveCls() { S.set('school/info/classes', clsList); saved = `✔ 반 ${clsList.length}개 저장`; setTimeout(() => (saved = ''), 1600); }
</script>

<div class="fs">
  <p class="lead">묶음을 고른 뒤 기능을 하나씩 켜고 끌 수 있어요</p>
  <div class="bund" role="radiogroup" aria-label="묶음">
    {#each BUNDLES as b (b.id)}
      <button type="button" role="radio" class="b" class:on={c.bundle === b.id} aria-checked={c.bundle === b.id} data-b={b.id} onclick={() => saveBundle(S, b.id)}>
        <i>{b.ic}</i><b>{b.name}</b><small>{b.sub}</small>
      </button>
    {/each}
  </div>
  {#each groups as g (g)}
    <h4>{g}</h4>
    <ul>
      {#each FEATS.filter((f) => f.group === g) as f (f.id)}
        {@const st = stateOf(S, c, f.id)}
        {@const lk = lockOf(S, f.id)}
        <li class:locked={st === 'locked'}>
          <span class="ic">{f.ic}</span>
          <span class="tx"><b>{f.name}</b>{#if st === 'locked' && lk}<small class="why">🔒 {lk}</small>{:else if f.sub}<small>{f.sub}</small>{/if}</span>
          <button type="button" class="sw" class:on={wanted(c, f.id)} role="switch" aria-checked={wanted(c, f.id)} aria-label="{f.name} {wanted(c, f.id) ? '켬' : '끔'}" data-f={f.id} onclick={() => saveOne(S, f.id, !wanted(c, f.id))}><i></i></button>
        </li>
      {/each}
    </ul>
  {/each}
  <h4>🏫 학교 정보</h4>
  <label class="cls"><span>반 목록 <small>쉼표로 · 처음 반 = 첫째</small></span><input class="in" bind:value={cls} placeholder="1-1, 1-2, 1-3" data-k="classes" /></label>
  <button type="button" class="save" disabled={!clsList.length} onclick={saveCls}>반 목록 저장 · {clsList.length}개</button>{#if saved}<small class="ok">{saved}</small>{/if}
  <p class="foot">🦴 기본 뼈대(수업 레이드 · 엑셀 차시 · 학습지 · 결과 · 대시보드 · 복습 · 소리)는 늘 켜져 있어요</p>
</div>

<style>
  .fs { display: flex; flex-direction: column; gap: var(--s3); }
  .cls { display: flex; flex-direction: column; gap: var(--s1); font-size: 14px; color: var(--text-2); } .cls small { color: var(--text-3); }
  .cls .in { min-height: 48px; padding: 0 var(--s3); border-radius: var(--r); border: 1px solid #3a3f4c; background: var(--surface-2); color: var(--text); font: 500 16px var(--font); }
  .save { min-height: 48px; border-radius: var(--r); border: 0; background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); } .save:disabled { opacity: 0.5; }
  .ok { color: var(--ok); }
  .lead, .foot { margin: 0; color: var(--text-2); font-size: 14px; }
  .bund { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s2); }
  .b { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 88px; padding: var(--s2); border-radius: var(--r); border: 2px solid transparent; background: var(--surface-2); color: var(--text); font: inherit; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); }
  .b:active { translate: 0 2px; box-shadow: none; }
  .b i { font-style: normal; font-size: 22px; } .b b { font-size: 16px; } .b small { font-size: 13px; color: var(--text-2); text-align: center; line-height: 1.3; }
  .b.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--surface-2)); }
  h4 { margin: var(--s2) 0 0; font-size: 14px; color: var(--text-2); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s1); }
  li { display: flex; align-items: center; gap: var(--s3); min-height: 56px; padding: 0 var(--s3); border-radius: var(--r); background: var(--surface-2); }
  .ic { width: 24px; text-align: center; font-size: 20px; }
  .tx { flex: 1; display: flex; flex-direction: column; min-width: 0; } .tx b { font-size: 16px; } .tx small { font-size: 13px; color: var(--text-3); }
  .why { color: var(--accent) !important; }
  li.locked .tx b { color: var(--text-3); }
  .sw { position: relative; flex: none; width: 52px; height: 32px; border-radius: 16px; border: 0; background: #3a3f4c; padding: 0; }
  .sw::after { content: ''; position: absolute; inset: -8px 0; } /* 누르는 칸 48 */
  .sw i { position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: left var(--t); }
  .sw.on { background: var(--ok); } .sw.on i { left: 24px; }
  li.locked .sw.on { background: color-mix(in srgb, var(--ok) 40%, #3a3f4c); }
</style>
