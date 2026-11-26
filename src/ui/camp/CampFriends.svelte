<script lang="ts">
  import PetSprite from '../cos/PetSprite.svelte';
  import { activePet, type Pet, type PetState } from '../../model/pets';
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import type { Pupil } from '../../school/school';
  import { feat } from '../../school/features.svelte';
  import { CF, FAKE, FAKE_NAME, HI, HI_EMOJI, freshHi, hiLine, kday, matesOf, pickFriends, sendHi, todayLine, writeMine, type Cand } from '../../school/campfire';
  import { POSTS as T_POSTS } from '../../board/team';
  import { HERO_NAMES, lookId, skillName, ladder, titleOf } from '../../model/hero';
  import HeroSprite from './HeroSprite.svelte';
  import CosAura from '../cos/CosAura.svelte';
  import NameTag from '../cos/NameTag.svelte';
  import { auraColorOf, cardBgOf, cosClean, type CosOn } from '../../model/cosmetics';
  import Sheet from '../battle/Sheet.svelte';
  import { sfx } from '../sound.svelte';
  // 🔥 모닥불 친구 (📜 2026-11-20 · src/school/campfire.ts) — 그루터기 3자리 · 누르면 작은 카드 + 이모지 인사 · 받은 인사 = 들어올 때 한 번 띠
  //   서버 학생 = 같은 반 친구 · 체험판 · 이 기기 · 교사 캠프 = 가상 친구(모험가 A · B · C · 인사 = 이 기기만)
  //   규칙 게시 전 = campfire · campHi 읽기 · 쓰기가 막힘 → 친구 앉기 · 카드(이름 · 칭호 · 스킬)만 · 오라 · 「오늘」 · 인사는 조용히 빠짐
  type TS = Store & { trySet?: (p: string, v: unknown) => Promise<boolean>; fetch?: <T>(p: string) => Promise<T | null> };
  let { S, pupil = null, enh = 0, hiN = $bindable(0), sheetOpen = $bindable(false) }: { S: TS; pupil?: Pupil | null; enh?: number; hiN?: number; sheetOpen?: boolean } = $props();
  type F = { num: number; look: number; base: number; name: string; title: string; fx: string; enh: number; today: string; /** 🎨 옷장 입은 것 (accounts/…/cos · 📜 11/25) */ cos?: CosOn; /** 🐾 데리고 다니는 펫 */ pet?: Pet | null };
  // 그루터기 = Camp STUMPS 중 용사 자리(앞 왼쪽)를 뺀 셋 (그림 % · 위 기준)
  const SEAT_XY: [number, number][] = [[39.4, 61.7], [60.6, 61.7], [64.8, 68]];
  const P0 = untrack(() => pupil), today = kday(Date.now()), real = untrack(() => !!pupil && S.kind === 'server'); // 캠프가 열릴 때의 학생 (캠프는 학생이 바뀌면 다시 그려짐)
  let rulesOn = $state(!untrack(() => !!pupil && S.kind === 'server')); // 서버 학생 = 내 칸 쓰기가 되면(규칙 게시 뒤) 인사 단추 · 이 기기 · 체험판 = 늘
  let friends = $state<F[]>([]), pick = $state<F | null>(null), band = $state(''), sentNote = $state('');
  const SENT = P0 ? `citadel-hi-${P0.cls}-${P0.num}-${today}` : `citadel-hi-me-${today}`, SEEN = P0 ? `citadel-hi-seen-${P0.cls}-${P0.num}` : 'citadel-hi-seen-me';
  const ls = <T,>(k: string, d: T): T => { try { return (JSON.parse(localStorage.getItem(k) || 'null') as T) ?? d; } catch { return d; } };
  const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사생활 창 */ } };
  let sent = $state<number[]>(ls<number[]>(SENT, []));
  const get = async <T,>(p: string): Promise<T | null> => { try { return S.fetch ? await S.fetch<T>(p) : S.get<T>(p); } catch { return null; } };
  const rows = (v: unknown): [number, Record<string, unknown>][] => (v && typeof v === 'object' ? Object.entries(v as Record<string, unknown>).filter(([k, x]) => Number(k) > 0 && x && typeof x === 'object').map(([k, x]) => [Number(k), x as Record<string, unknown>]) : []);
  const mk = (c: Cand & { enh?: number; today?: string }, name: string): F => ({ num: c.num, look: lookId({ hero: c.hero, enh: c.enh ?? 0, fx: c.fx, title: c.title }), base: c.hero, name, title: c.title, fx: c.fx, enh: c.enh ?? 0, today: c.today ?? '' });
  const withCos = (acc: Record<string, unknown> | null, n: number, f0: F): F => { const row = acc?.[String(n)] as { cos?: unknown; pet?: unknown; awk?: Record<string, unknown> } | undefined, f = row?.awk?.[String(f0.base)] ? { ...f0, look: lookId({ hero: f0.base, enh: f0.enh, fx: f0.fx, title: f0.title, had: true }) } : f0 /* 📜 11/26 친구도 한 번 각성 = 유지 */, c = cosClean(row?.cos), pt = activePet(row?.pet as PetState); return { ...f, ...(Object.keys(c).length ? { cos: c } : {}), ...(pt ? { pet: pt } : {}) }; };
  let alive = true; onDestroy(() => (alive = false));
  untrack(() => { if (feat('campfire')) void load(); });
  async function load() {
    if (!real || !pupil) { friends = FAKE.map((c) => mk(c, FAKE_NAME[c.num] ?? '모험가')); return; }
    const { cls, num } = pupil;
    void writeMine(S, cls, num, { day: today, enh: Math.max(0, Math.min(20, Number(enh) || 0)), today: todayLine(S.get(`bonus/${cls}/${num}`), today) }).then((ok) => { if (alive) rulesOn = ok; }); // 게시 전 = 쓰기 실패 → 인사 단추 숨김 (친구 앉기 · 카드는 그대로)
    const [acc, cf, mask] = await Promise.all([get<Record<string, unknown>>(`accounts/${cls}`), get<Record<string, unknown>>(`${CF}/${cls}`), get<Record<string, string>>(`rosterMask/${cls}`)]);
    if (!alive) return;
    const cfm = Object.fromEntries(rows(cf)), mates = matesOf(S.get<Record<string, unknown>>(T_POSTS), pupil.uid, cls);
    const cands = rows(acc).map(([n, a]) => { const h = Number(a.hero), s = (a.socket as Record<string, string>) || {}, c = cfm[n] as { day?: string; enh?: number; today?: string } | undefined; return { num: n, hero: Number.isFinite(h) ? h : 0, title: String(a.title || 'none'), fx: s[String(h)] || ladder(Number.isFinite(h) ? h : 0)[0] || '', mate: mates[n], day: c?.day, enh: c?.day === today || c?.enh != null ? Number(c?.enh) || 0 : 0, today: c?.day === today ? String(c?.today || '') : '', off: !!a.feedOff }; });
    const chosen = pickFriends(cands, num, today, Math.floor(Math.random() * 1e6));
    friends = chosen.map((c) => { const x = cands.find((y) => y.num === c.num)!; return withCos(acc, x.num, mk(x, x.off ? '친구' : (mask && (mask as Record<string, string>)[String(c.num)]) || `${c.num}번 친구`)); });
    // 받은 인사 (게시 전 = 읽기 막힘 → 없음)
    const box = await get<Record<string, unknown>>(`${HI}/${cls}/${num}`); if (!alive) return;
    const seen = ls<string[]>(SEEN, []), fresh = freshHi(box, seen);
    hiN = Object.keys(box || {}).length;
    if (fresh.length) {
      const names = fresh.map((h) => { const a = rows(acc).find(([n]) => n === h.from)?.[1]; return { name: a?.feedOff ? '친구' : (mask && (mask as Record<string, string>)[String(h.from)]) || `${h.from}번 친구`, e: h.e }; });
      band = hiLine(names); sfx('mail', 0.5); setTimeout(() => (band = ''), 5000);
      lsSet(SEEN, [...seen, ...fresh.map((h) => `${h.day}|${h.from}`)].slice(-200));
    }
  }
  function open(f: F) { sfx('click', 0.5); pick = f; sentNote = ''; sheetOpen = true; }
  function close() { pick = null; sheetOpen = false; }
  async function hi(e: string) {
    const f = pick; if (!f || sent.includes(f.num)) return;
    const ok = real && pupil ? await sendHi(S, pupil.cls, f.num, pupil.num, e, today) : true;
    if (!ok) { sentNote = '아직 인사를 보낼 수 없어요 · 선생님 설정 준비 중'; return; }
    sent = [...sent, f.num]; lsSet(SENT, sent); sfx('star', 0.6); sentNote = `${e} 인사를 보냈어요!`;
  }
</script>

{#if feat('campfire')}
  {#each friends as f, i (f.num)}
    {@const p = SEAT_XY[i]}
    {#if p}<button type="button" class="cfr" style="left:{p[0]}%;top:{p[1]}%" aria-label="{f.name} · 모닥불 친구" data-k="cf-friend" data-num={f.num} onclick={(e) => { e.stopPropagation(); open(f); }}><CosAura color={auraColorOf(f.cos)} /><HeroSprite id={f.look} scale={0.62} play aura={f.enh} />{#if f.pet}<span class="fpet"><PetSprite pet={f.pet} size={26} /></span>{/if}</button>{/if}
  {/each}
  {#if band}<p class="cfband" role="status" data-k="cf-band">{band}</p>{/if}
{/if}
{#if pick}
  <Sheet onclose={close}>
    {#snippet title()}🔥 <NameTag name={pick?.name ?? ''} on={pick?.cos} />{/snippet}
    <div class="cfcard" data-k="cf-card" style:background={cardBgOf(pick.cos) || null}>
      <span class="pic"><CosAura color={auraColorOf(pick.cos)} /><HeroSprite id={pick.look} scale={0.9} play aura={pick.enh} /></span>
      <span class="who">
        {#if pick.title !== 'none' && titleOf(pick.title)}<em class="tt">{titleOf(pick.title)?.name}</em>{/if}
        <b>{HERO_NAMES[pick.base]?.name ?? '용사'}</b>
        <small>{skillName(pick.fx)}{pick.enh ? ` · +${pick.enh}` : ''}</small>
        {#if pick.today}<small class="td" data-k="cf-today">오늘: {pick.today}</small>{/if}
      </span>
    </div>
    {#if rulesOn}<div class="his" role="group" aria-label="인사 고르기">
      {#each HI_EMOJI as e (e)}<button type="button" class="hi" disabled={sent.includes(pick.num)} data-hi={e} onclick={() => hi(e)}>{e}</button>{/each}
    </div>
    <p class="note" data-k="cf-note">{sentNote || (sent.includes(pick.num) ? '오늘은 이미 인사했어요 · 내일 또 보내요' : '이모지로 인사해요 · 친구 한 명에게 하루 1번')}</p>{/if}
  </Sheet>
{/if}

<style>
  .cfr :global(.ca) { bottom: 0; }
  .fpet { position: absolute; right: -14px; bottom: 0; }
  .cfr { position: absolute; z-index: 6; /* 물건(게시판) 누르는 칸보다 위 */ transform: translate(-50%, -97%); border: 0; padding: 0; background: none; cursor: pointer; min-width: 44px; min-height: 44px; display: grid; place-items: end center; }
  .cfr:active { transform: translate(-50%, -95%) scale(0.97); }
  .cfband { position: absolute; left: 50%; top: 44%; z-index: 8; transform: translateX(-50%); margin: 0; max-width: 86%; padding: 6px 12px; border-radius: 14px; background: rgba(40, 24, 6, 0.86); border: 1px solid var(--accent); color: #ffe7b0; font: 700 var(--fs-small) var(--font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 0 14px rgba(255, 150, 40, 0.5); pointer-events: none; }
  .cfcard { display: flex; align-items: center; gap: 12px; }
  .cfcard .pic { position: relative; width: 84px; display: grid; place-items: center; }
  .cfcard { border-radius: 12px; padding: 4px; }
  .cfcard .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cfcard .tt { font-style: normal; color: var(--accent); font: 700 var(--fs-small) var(--font); }
  .cfcard b { font-size: 18px; }
  .cfcard small { color: var(--text-2); font-size: var(--fs-small); }
  .cfcard .td { color: var(--ok); }
  .his { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s2); }
  .hi { min-height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); font-size: 26px; box-shadow: 0 3px 0 var(--press-sh); }
  .hi:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .hi:disabled { opacity: 0.4; box-shadow: none; }
  .note { margin: 0; text-align: center; color: var(--text-2); font-size: var(--fs-small); }
</style>
