<script lang="ts">
  // 🟣 벤 다이어그램 그림 (정식 DS.UI.venn · vshade 같은 모양 · 색칠 = 정식 분홍 #ff4fa3 55%)
  const { venn = null, shade = null }: { venn?: [string, string] | null; shade?: string | null } = $props();
  const id = `vs${Math.random().toString(36).slice(2, 8)}`;
</script>

{#if venn}
  <svg class="venn" viewBox="0 0 160 70" role="img" aria-label="벤 다이어그램 {venn[0]}: {venn[1]}"><ellipse cx="80" cy="38" rx="72" ry="28" fill="none" stroke="currentColor" stroke-width="2" /><text x="80" y="11" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">{venn[0]}</text><text x="80" y="44" font-size="15" text-anchor="middle" fill="currentColor">{venn[1]}</text></svg>
{:else if shade}
  <svg class="venn shade" viewBox="0 0 160 100" role="img" aria-label="벤 다이어그램 색칠 {shade}">
    <defs><mask id={id}><rect width="160" height="100" fill="#000" />
      {#if shade === 'Ac'}<rect x="6" y="8" width="148" height="84" rx="8" fill="#fff" /><circle cx="62" cy="50" r="30" fill="#000" />
      {:else if shade === 'B-A'}<circle cx="98" cy="50" r="30" fill="#fff" /><circle cx="62" cy="50" r="30" fill="#000" />
      {:else if shade === 'AnB'}<circle cx="62" cy="50" r="30" fill="#fff" />
      {:else}<circle cx="62" cy="50" r="30" fill="#fff" />{#if shade === 'A-B'}<circle cx="98" cy="50" r="30" fill="#000" />{:else}<circle cx="98" cy="50" r="30" fill="#fff" />{/if}{/if}
    </mask></defs>
    {#if shade === 'AnB'}<g fill="#ff4fa3" fill-opacity="0.55" mask="url(#{id})"><circle cx="98" cy="50" r="30" /></g>
    {:else if ['A-B', 'B-A', 'Ac', 'AuB'].includes(shade)}<rect width="160" height="100" fill="#ff4fa3" fill-opacity="0.55" mask="url(#{id})" />{/if}
    <g fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="148" height="84" rx="8" /><circle cx="62" cy="50" r="30" /><circle cx="98" cy="50" r="30" /></g>
    <text x="44" y="24" font-size="13" font-style="italic" fill="currentColor">A</text><text x="110" y="24" font-size="13" font-style="italic" fill="currentColor">B</text><text x="140" y="24" font-size="11" font-style="italic" fill="currentColor">U</text>
  </svg>
{/if}

<style>
  .venn { display: block; width: 100%; max-width: 220px; height: auto; color: var(--text); }
  .venn.shade { max-width: 180px; }
</style>
