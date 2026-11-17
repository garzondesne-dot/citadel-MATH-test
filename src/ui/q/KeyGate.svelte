<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import QItem from './QItem.svelte';
  import { emptyOf, filled } from '../../engine/input';
  import { answerText, keyQ, keyRight, keysOf, keyWindow, myKeys } from '../../school/keys';
  import { sfx } from '../sound.svelte';
  import { roomPath } from '../../raid/actions';
  // 🔑 입장 열쇠 얻기 (📜 #59 · 정정 2): 대기실 · 첫 몬스터 전까지 학생 스스로 · 열쇠마다 판 0 한 문제씩
  //   맞힘 = 「🔑 열쇠 획득!」 · 틀림 = 💡 한 줄 + 정답 → 바로 🔑 (다시 풀기 없음 · 칼 · 체력 · 벌 없음)
  const { S, L, R, code, uid, band = false }: { S: Store; L: LessonPack; R: Room; code: string; uid: string; /** 도입 · 개념 화면 = 띠 꼴 */ band?: boolean } = $props();
  const ks = $derived(keysOf(L));
  const mine = $derived(myKeys(R, uid));
  const got = $derived(ks.filter((k) => mine[k.id]).length);
  const next = $derived(ks.find((k) => !mine[k.id]) ?? null);
  const open = $derived(keyWindow(L, R));
  let sheet = $state(false), given = $state<Given>(null), res = $state<{ ok: boolean; name: string; help: string; ans: string } | null>(null), curId = $state('');
  const cur = $derived(ks.find((k) => k.id === curId) ?? null);
  function start() { const k = next; if (!k) return; curId = k.id; given = emptyOf(keyQ(k)); res = null; sheet = true; }
  function check() {
    const k = cur; if (!k || !filled(keyQ(k), given)) return;
    const ok = keyRight(k, given);
    S.set(`${roomPath(code)}/players/${uid}/keys/${k.id}`, { ok, at: S.now() }); // 맞든 틀리든 🔑 (못 받는 학생 없게 · 첫 번에 맞혔나만 기록)
    res = { ok, name: k.name, help: k.help, ans: answerText(keyQ(k)) }; sfx(ok ? 'correct' : 'block', 0.6);
  }
  function after() { res = null; const k = ks.find((x) => !myKeys(R, uid)[x.id] && x.id !== curId) ?? null; if (k) { curId = k.id; given = emptyOf(keyQ(k)); } else sheet = false; }
  const idx = $derived(cur ? ks.indexOf(cur) + 1 : 0);
</script>

{#if ks.length && (open || sheet)}
  {#if band}
    {#if next}<button type="button" class="kband" data-k="key-band" onclick={start}><b>🔑 열쇠 얻기 ({got} / {ks.length})</b><span>첫 몬스터 전까지 · 오늘 쓸 중학교 내용</span></button>{/if}
  {:else}
    <div class="bcard kcard" data-k="key-gate">
      {#if next}<button type="button" class="kbtn" data-k="key-go" onclick={start}><b>🔑 열쇠 얻기 ({got} / {ks.length})</b><small>친구들을 기다리는 동안 · 오늘 쓸 중학교 내용 {ks.length}문제</small></button>
      {:else}<p class="kdone" data-k="key-done">🔑 열쇠 {ks.length}개 준비 끝!</p>{/if}
      <ul class="kl">{#each ks as k (k.id)}<li class:on={!!mine[k.id]}>{mine[k.id] ? '🔑' : '🔒'} {k.name}</li>{/each}</ul>
    </div>
  {/if}
{/if}
{#if sheet && cur}
  <Sheet onclose={() => (sheet = false)} mainText={res ? (!res.ok ? '알겠어요 · 🔑 열쇠 받기' : ks.some((x) => !myKeys(R, uid)[x.id]) ? '다음 열쇠 ▶' : '🔑 다 모았어요') : '확인'} mainDisabled={!res && !filled(keyQ(cur), given)} onmain={res ? after : check}>
    {#snippet title()}🔑 열쇠 {idx} / {ks.length} · {cur.name}{/snippet}
    <div class="ks" data-k="key-sheet">
      {#if res}
        {#if res.ok}<p class="kok" data-k="key-ok">🔑 열쇠 획득! · {res.name}</p>
        {:else}<div class="kno" data-k="key-no"><b>💡 {res.help}</b><span>답 = {res.ans}</span></div>{/if}
      {:else}
        <QItem q={keyQ(cur)} i={0} value={given} showNo={false} onchange={(v) => (given = v)} />
      {/if}
    </div>
  </Sheet>
{/if}

<style>
  .kcard { display: flex; flex-direction: column; gap: var(--s2); }
  .kbtn { display: grid; gap: 2px; justify-items: center; min-height: 56px; border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface-2); color: var(--text); font: 800 17px var(--font); box-shadow: 0 3px 0 var(--press-sh, rgba(0, 0, 0, 0.45)); }
  .kbtn small { font: 500 13px var(--font); color: var(--text-2); } .kbtn:active { transform: translateY(2px); box-shadow: none; }
  .kdone { margin: 0; text-align: center; font: 800 16px var(--font); color: var(--accent); }
  .kl { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
  .kl li { padding: 2px 10px; border-radius: 12px; background: var(--surface-2); color: var(--text-3); font: 700 13px var(--font); } .kl li.on { color: var(--accent); }
  .kband { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; min-height: 52px; margin-bottom: var(--s2); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface); color: var(--text); font: 800 16px var(--font); }
  .kband span { font: 500 13px var(--font); color: var(--text-2); }
  .ks { padding-bottom: var(--s3); display: flex; flex-direction: column; gap: var(--s3); }
  .kok { margin: 0; padding: var(--s3); border-radius: var(--r); background: color-mix(in srgb, var(--ok) 18%, transparent); font: 800 18px var(--font); text-align: center; }
  .kno { display: flex; flex-direction: column; gap: 6px; padding: var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 15px; line-height: 1.5; }
  .kno span { font-weight: 800; color: var(--ok); } .kno em { font-style: normal; color: var(--text-2); font-size: 14px; }
</style>
