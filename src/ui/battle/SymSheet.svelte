<script lang="ts">
  import { SUBJ } from '../../engine/subject';
  const BY = SUBJ.symtalk?.BY ?? {}, SYM_CARD = SUBJ.cards?.bySym ?? {}; // 과목 팩 (#136)
  import { useMe } from '../../store/me.svelte';
  import { closeSym, symState } from './symsheet.svelte';
  import Sheet from './Sheet.svelte';
  import ForgeCard from '../forge/ForgeCard.svelte';
  // 기호 톡 누른 뒤 (⑧′): ① 정확한 뜻(굵게) → ② 쉽게 말하면(기울임 · 옅게) → ③ 기억 고리(작게) · 문구 = 정식 SYMBOL-TALK 그대로
  // ⭐ 기호 톡 ↔ 모루 (#129): 그 기호를 만드는 모루 카드가 있으면 「☆ 모루에 찜」 → 「⭐ 모루에 담았어요 · 캠프 모루에서 만들어요」 1.5초
  //   이미 만든 카드면 「✅ 내 카드」 + 카드 그림 크게 (#129 ⑥) · 찜 개수 제한 · 보상 · 벌 없음
  const r = $derived(symState.open ? BY[symState.open] : null);
  const card = $derived(symState.open ? SYM_CARD[symState.open] ?? null : null);
  const M = useMe(9999, 30, true); // 캠프와 같은 기본값 (테스트 판)
  const made = $derived(!!card && !!M.me.cards?.[card.id]);
  const wished = $derived(!!symState.open && !!M.me.wishes?.[symState.open]);
  let toast = $state(''), t: ReturnType<typeof setTimeout> | null = null;
  function wish() {
    const id = symState.open; if (!id || !card) return;
    M.me.wishes = { ...(M.me.wishes || {}) };
    if (M.me.wishes[id]) delete M.me.wishes[id]; else { M.me.wishes[id] = true; toast = '⭐ 모루에 담았어요 · 캠프 모루에서 만들어요'; if (t) clearTimeout(t); t = setTimeout(() => (toast = ''), 1500); }
    M.save();
  }
</script>

{#if r}
  <Sheet onclose={closeSym} mainText="문제로 돌아가기">
    {#snippet title()}<span class="big">{r.sym}</span>{/snippet}
    {#if made && card}
      {@const fc = SUBJ.forge?.unit.card(card.id)}
      <div class="mine" role="img" aria-label="내 카드 {card.name}"><small>✅ 내 카드</small>{#if fc}<ForgeCard card={fc} w={150} />{:else}<b>{card.fm}</b><span>{card.name}</span>{/if}</div>
    {/if}
    <p class="def">{r.def}</p>
    <p class="easy">쉽게 말하면 · {r.easy}</p>
    {#if r.memo}<p class="memo">기억 고리 · {r.memo}</p>{/if}
    {#if card && !made}
      <button type="button" class="wish" class:on={wished} aria-pressed={wished} onclick={wish}>{wished ? '★ 모루에 찜했어요' : '☆ 모루에 찜'} <small>{card.name} 카드</small></button>
    {/if}
  </Sheet>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
{/if}

<style>
  .big { color: var(--accent); }
  .def { margin: 0; font-size: var(--fs-body); font-weight: 700; line-height: 1.55; }
  .easy { margin: 0; font-size: 15px; font-style: italic; color: var(--text-2); }
  .memo { margin: 0; font-size: var(--fs-small); color: var(--text-3); }
  .mine { align-self: center; width: 200px; min-height: 120px; border-radius: 16px; border: 2px solid var(--accent); background: linear-gradient(160deg, var(--surface-2), var(--bg)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 0 0 4px rgba(245, 184, 74, 0.18); }
  .mine small { font-size: 13px; font-weight: 700; color: var(--ok); }
  .mine b { font-size: 26px; color: var(--accent); }
  .mine span { font-size: 15px; font-weight: 700; }
  .wish { min-height: var(--tab-h); border-radius: 12px; border: 1px dashed var(--accent); background: none; color: var(--accent); font: 700 15px var(--font); display: flex; align-items: center; justify-content: center; gap: 8px; }
  .wish.on { border-style: solid; background: color-mix(in srgb, var(--accent) 14%, transparent); }
  .wish small { font-size: 13px; color: var(--text-2); font-weight: 500; }
  .toast { position: fixed; left: 50%; top: 72px; transform: translateX(-50%); z-index: 40; margin: 0; padding: var(--s2) var(--s3); border-radius: 12px; background: var(--surface-2); border: 1px solid var(--accent); color: var(--text); font-weight: 700; font-size: var(--fs-small); white-space: nowrap; }
</style>
