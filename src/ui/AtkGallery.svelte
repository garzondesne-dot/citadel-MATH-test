<script lang="ts">
  import { untrack } from 'svelte';
  import type { Store } from '../model/types';
  import { memoryStore } from '../store/device';
  import { openRoom, roomPath } from '../raid/actions';
  import { PACKS } from '../engine/packs';
  import { PROFILES } from '../model/profiles';
  import { ATTACKS, ATTACK_IDS, attackMs } from '../raid/attacks';
  import Student from './Student.svelte';
  import { HEROES, ladder, skillName } from '../model/hero';
  import { heroAtk } from './battle/fx.svelte';
  import { cutin, ultBlast, canUlt, canTrue } from './fx/attack';
  import { guard } from './fx/aura';
  import { setNewFx } from './fx/fx';
  // ⚔ 용사 fx 탭 (🔨 용사 fx · 2026-11-13): 용사 · 끼운 스킬 · 강화를 이 기기 「내 용사」에 적고 같은 학생 화면에서 공격 · 필살기 · 진필살기 · 홀리 방패 · 오라를 하나씩
  //   🃏 카드 특전 공격 이펙트 = 정식에 없음(도감 특전 = 용사 열기) → 흐린 단추 · ❓#3
  // 💥 공격 갤러리 (#161 · 테스트 모드 · 선생님 확인용): 학생 폰 화면 그대로(이 기기 메모리 방 · 데미지 · 기록 없음) + 위에 효과 15개 단추
  //   눌러 보면 지금 문제에서 그 공격을 한 번 맞음 · 😡 분노 = 강(체력 50% 아래) 세기로 · 문제 = 첫 일반 몬스터 · ⚔ = 첫 소레이드(졸개 단계)
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  // 일반 = 소레이드 아닌 첫 몬스터가 있는 첫 차시 · 졸개 = 소레이드 몬스터가 있는 첫 차시 (차시 id 를 쓰지 않음 · #136)
  const pick = (chainy: boolean) => { for (const P of PACKS) { const st = P.steps.find((x) => x.kind === 'monster' && !!P.monsters[x.id] && !!(P.monsters[x.id] as { chain?: unknown }).chain === chainy); if (st) return { L: P, id: st.id }; } return { L: PACKS[0]!, id: PACKS[0]!.steps[0]!.id }; };
  const G1 = pick(false), G2 = pick(true), L6 = G1.L, L7 = G2.L;
  let chain = $state(false), strong = $state(false), now = $state(''), tab = $state<'mon' | 'hero'>('mon');
  const KEY = 'citadel-v1-me';
  const readMe = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') as { hero?: number; enh?: number; socket?: Record<string, string> }; } catch { return {}; } };
  let newfx = $state(false); $effect(() => setNewFx(newfx));
  let hh = $state(Number(readMe().hero) || 0), enh = $state(Number(readMe().enh) || 0), sk = $state(readMe().socket?.[String(readMe().hero ?? 0)] ?? ladder(Number(readMe().hero) || 0)[0]!), ver = $state(0);
  function look(h: number, e: number, k: string) { const m = readMe(); m.hero = h; m.enh = e; m.socket = { ...(m.socket || {}), [String(h)]: k }; try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* 사생활 창 */ } hh = h; enh = e; sk = k; ver += 1; }
  const scene = () => document.querySelector('.edge') as HTMLElement | null;
  async function trueUlt() { await cutin(hh, sk, { gold: true }); const sc = scene(); if (sc) void ultBlast(sc, sc.querySelector('.mon'), sk); }
  async function holy() { await cutin(hh, sk, { guard: true }); const sc = scene(); const hb = sc?.querySelector('.hb') as HTMLElement | null; guard(hb, () => (now = 'guard-hit'), sc?.getBoundingClientRect().height ?? 0, sc?.querySelector('.mon')); }
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
    <div class="tabs2"><button type="button" class:on={tab === 'mon'} onclick={() => (tab = 'mon')}>💥 몬스터 공격</button><button type="button" class:on={tab === 'hero'} onclick={() => (tab = 'hero')}>⚔ 용사 fx</button></div>
    {#if tab === 'hero'}
      <div class="hrow">
        <select aria-label="용사" value={hh} onchange={(e) => { const h = Number((e.currentTarget as HTMLSelectElement).value); look(h, enh, ladder(h)[0]!); }}>{#each HEROES as h (h.id)}<option value={h.id}>{h.id} {h.name} · {h.job}</option>{/each}</select>
        <select aria-label="강화" value={enh} onchange={(e) => look(hh, Number((e.currentTarget as HTMLSelectElement).value), sk)}>{#each Array.from({ length: 11 }, (_, i) => i) as i (i)}<option value={i}>+{i} 오라</option>{/each}</select>
      </div>
      <div class="tabs2"><button type="button" class:on={!newfx} onclick={() => (newfx = false)}>지금 것</button><button type="button" class:on={newfx} data-new onclick={() => (newfx = true)}>✨ 새 것 (⚔ 베기 시제품)</button></div>
      <div class="ids">{#each [...ladder(hh), 'wings', 'smite'] as k, i (k)}<button type="button" class="a" class:on={sk === k} data-sk={k} onclick={() => look(hh, enh, k)}>{i < 4 ? 'ⅠⅡⅢⅣ'[i] : '🪶'}<small>{k === 'wings' ? '황금 날개' : k === 'smite' ? '심판의 빛' : skillName(k)}</small></button>{/each}</div>
      <div class="ids">
        <button type="button" class="a" data-h="hit" onclick={() => heroAtk({ miss: false, hits: 3 })}>⚔<small>공격</small></button>
        <button type="button" class="a" data-h="miss" onclick={() => heroAtk({ miss: true })}>✖<small>틀림</small></button>
        <button type="button" class="a" data-h="finish" onclick={() => heroAtk({ miss: false, hits: 3, finish: true })}>🔥<small>끈기</small></button>
        <button type="button" class="a" data-h="ult" disabled={!canUlt(sk, hh)} title="내 속성 Ⅲ · Ⅳ" onclick={() => heroAtk({ miss: false, hits: 3, ult: true })}>⚡<small>필살기</small></button>
        <button type="button" class="a" data-h="true" disabled={!canTrue(sk, hh)} title="내 속성 Ⅳ" onclick={trueUlt}>🌟<small>진필살기</small></button>
        <button type="button" class="a" data-h="holy" onclick={holy}>🛡<small>홀리 방패</small></button>
        <button type="button" class="a" data-h="state" onclick={() => { const mid = (chain ? G2 : G1).id, rp = `rooms/${code}`; S.set(`${rp}/players/gallery/enh`, 10); S.set(`${rp}/players/gallery/hg`, { mid, at: S.now() }); S.set(`${rp}/players/x/nick`, `하늘`); S.set(`${rp}/heals/${mid}/x/0`, `!true@${S.now()}`); }}>🗿<small>석화 · 🛡 켬</small></button>
        <button type="button" class="a" data-h="card" disabled title="정식에 카드 공격 이펙트 없음 · ❓#3">🃏<small>카드 특전</small></button>
      </div>
    {:else}
    <div class="ids">{#each ATTACK_IDS as id (id)}<button type="button" class="a" class:on={now === id} data-id={id} onclick={() => hit(id)}>{ATTACKS[id]!.icon}<small>{ATTACKS[id]!.name}</small></button>{/each}</div>
    {/if}
  </div>
  {#key `${code}|${ver}`}<div class="scr"><Student {S} {L} {code} uid="gallery" num={0} nick="갤러리" board /></div>{/key}
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
  .tabs2 { width: 100%; display: flex; gap: 4px; } .tabs2 button { flex: 1; }
  .hrow { width: 100%; display: flex; gap: 4px; } .hrow select { flex: 1; min-width: 0; height: 32px; border-radius: 8px; background: var(--surface); color: var(--text); border: 1px solid var(--line); font: 600 13px var(--font); }
  .ids .a:disabled { opacity: 0.35; }
</style>
