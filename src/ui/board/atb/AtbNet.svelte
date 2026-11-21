<script lang="ts">
  // 📡 게시판 던전(ATB) 여럿이 한 판 (📜 요청 #48 · #51 · 서버 칸 = docs/board-atb/SERVER-v1.md 2절)
  //   방장(host) 폰 = 엔진을 돌림 · 친구 행동(act)을 받아 처리 · 상태 요약(snap)을 0.2초마다 씀
  //   다른 폰 = 받은 상태로 그림 · 내 행동만 act/{uid}/{번호} 로 보냄 · 문제 풀이 · 채점은 각자 폰
  //   심장 박동 hb/{uid} 3초마다 · 10초 끊기면: 방장이면 다음 사람이 방장(받은 상태에서 이어감) · 친구면 그 자리 봇이 이어받고 돌아오면 돌려줌
  //   판 끝 = 각 폰이 내 결과 end/{uid} 를 씀(공적 · 💎 · ⭐ · 내 자리만) → 결과 화면 → 「게시판으로」 = onend
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../../model/types';
  import { heroOf, ladder } from '../../../model/hero';
  import { PACKS } from '../../../engine/packs';
  import { bossOf } from '../../../board/atb/tune';
  import type { State } from '../../../board/atb/engine';
  import { newBot, type Bot } from '../../../board/atb/bots';
  import { INTRO, metBefore } from '../../../board/atb/story';
  import { applyAct, atbResultFor, battleOf, decodeSnap, encodeSnap, introDone, isBot, lostSlots, NET, overwrite, pickHost, slotOf, type Act, type AtbEnd, type Meta, type Snap } from '../../../board/atb/net';
  import { bossArt } from './rdunBoss';
  import AtbBattle from './AtbBattle.svelte';
  import Land from './Land.svelte';
  import AtbResult from './AtbResult.svelte';

  const { S: store, pid, uid, names = {}, prevStars = 0, mastery = 0, onend }: {
    /** 서버 칸 (게시판과 같은 Store) */ S: Store; pid: string; uid: string;
    /** 👥 파티원 보이는 이름 (uid → 같은 반 = 실명 · 다른 반 = 「1-3 실명」 · 게시판이 명단에서 만듦 · 📜 #48 덧) */ names?: Record<string, string>;
    /** ⭐ 이 차시 지금까지 최고 별 (boardStar/{lid} · ⭐ 골고루 돌기) */ prevStars?: number; /** 🏅 이 차시 게시판 이긴 판 (숙련 메달) */ mastery?: number;
    onend: (r: AtbEnd | null, again?: boolean) => void;
  } = $props();
  const base = `atb/${pid}`;
  let meta = $state<Meta | null>(null), host = $state<string | null>(null), hb: Record<string, number> = {}, snapN = $state(-1);
  const rightMids = new Set<string>(); // 📕 #67 내가 맞힌 몬스터 칸 (판 끝 결과 mids → 복습 완료)
  let G = $state<State | null>(null), started = $state(false), res = $state<AtbEnd | null>(null), phase = $state<'wait' | 'battle' | 'result'>('wait');
  let ack: Record<string, number> = {}, myQ = 0, bots = $state<Bot[]>([]), lostKey = '';
  const isHost = $derived(!!meta && host === uid);
  const me = $derived(meta ? slotOf(meta, uid) : -1);
  const L = $derived(meta ? (PACKS.find((p) => p.id === meta!.lid) ?? PACKS.find((p) => p.no === meta!.no && !p.partOf) ?? null) : null);
  const art = $derived(meta ? bossArt(bossOf(meta.no), meta.diff) : null);
  /** 👥 자리 이름: 나 = 「나」 · 친구 = 실명 · 봇 = 「🤖 모험가 A」 */
  const labels = $derived.by(() => { const o: Record<number, string> = {}; let b = 0; meta?.slots.forEach((s, i) => { o[i] = isBot(s) ? `🤖 모험가 ${'ABCD'[b++]}` : s.uid === uid ? '나' : (names[s.uid] ?? s.nick ?? heroOf(s.hero).name); }); return o; });
  /** 📜 #80 컷인 이름 = 나도 실명(명단 이름 · 없으면 별명 · 용사 이름) · 봇 = 용사 이름 (모든 폰 같은 meta → 같은 글) */
  const whoNames = $derived.by(() => { const o: Record<number, string> = {}; meta?.slots.forEach((s, i) => { o[i] = isBot(s) ? String(heroOf(s.hero).name) : (names[s.uid] ?? s.nick ?? String(heroOf(s.hero).name)); }); return o; });
  const fx = $derived(Object.fromEntries((meta?.slots ?? []).map((s, i) => [i, s.fx || (ladder(s.hero)[Math.max(0, (s.tier ?? 1) - 1)] as string) || (ladder(s.hero)[0] as string)])));

  const unsubs: (() => void)[] = [];
  unsubs.push(store.watch<Meta>(`${base}/meta`, (v) => { if (v && !meta) { meta = v; untrack(start); } }));
  unsubs.push(store.watch<string>(`${base}/host`, (v) => { host = v ?? null; }));
  unsubs.push(store.watch<Record<string, number>>(`${base}/hb`, (v) => { hb = v ?? {}; }));
  unsubs.push(store.watch<Snap>(`${base}/snap`, (v) => untrack(() => onSnap(v))));
  unsubs.push(store.watch<Record<string, Record<string, Act>>>(`${base}/act`, (v) => untrack(() => onActs(v))));
  // 🗺 조우 · 정찰 (요청 #69): 시작 = meta.t0 (모든 폰 같은 때) · 준비 = act ready → 방장이 ready 목록 · go 시각을 씀
  let readyL = $state<number[]>([]), goAt = $state<number | null>(null), readySet = new Set<number>();
  unsubs.push(store.watch<number[]>(`${base}/ready`, (v) => { readyL = Array.isArray(v) ? v : []; }));
  unsubs.push(store.watch<number>(`${base}/go`, (v) => { goAt = typeof v === 'number' ? v : null; }));
  const scoutEnd = () => (meta?.t0 ?? 0) + INTRO.meet + INTRO.scout;
  function hostIntro() {
    if (!meta || host !== uid || goAt != null) return;
    const bots0 = meta.slots.map((s, i) => (isBot(s) ? i : -1)).filter((i) => i >= 0), list = [...new Set([...bots0, ...readySet])].sort((a, b) => a - b);
    if (list.join() !== readyL.join()) store.set(`${base}/ready`, list);
    if (introDone(meta, readySet, hb, store.now(), scoutEnd())) { const t = store.now(); store.set(`${base}/go`, t); goAt = t; }
  }

  function start() {
    if (!meta || !art) return;
    G = battleOf(meta, art, (s) => heroOf(s.hero).name);
    const mine = store.get<Record<string, Act>>(`${base}/act/${uid}`); myQ = Math.max(0, ...Object.keys(mine ?? {}).map(Number).filter(Number.isFinite)); // 다시 들어옴 = 번호 이어서
    const sn = store.get<Snap>(`${base}/snap`); if (sn) onSnap(sn); // 판 중간에 들어옴 = 받은 상태부터
    beat(); phase = 'battle'; started = true;
  }
  /** 받은 상태 → 방장 아니면 덮어씀 (방장은 내 엔진이 진짜) */
  function onSnap(sn: Snap | null) {
    if (!sn || !G || sn.n < snapN) return;
    if (host === uid && sn.host === uid) return;
    const d = decodeSnap(sn); if (!d) return;
    snapN = sn.n; ack = { ...(sn.ack ?? {}) }; overwrite(G, d);
  }
  /** 방장 = 친구 행동 처리 (번호 순 · 자기 자리 행동만) */
  function onActs(all: Record<string, Record<string, Act>> | null) {
    if (!G || !meta || host !== uid || !all) return;
    for (const [u, list] of Object.entries(all)) {
      const s = slotOf(meta, u); if (s < 0) continue;
      const qs = Object.keys(list ?? {}).map(Number).filter((q) => Number.isFinite(q) && q > (ack[u] ?? 0)).sort((a, b) => a - b);
      for (const q of qs) { const a = list[String(q)]!; if (a?.k === 'ready' && a.s === s) readySet.add(s); else if (a && a.s === s && !(u === uid)) applyAct(G, a); ack[u] = q; }
    }
    hostIntro();
  }
  function send(a: Act) { myQ++; store.set(`${base}/act/${uid}/${myQ}`, a); }
  function beat() { store.set(`${base}/hb/${uid}`, store.now()); }

  // ⏱ 심장 박동 · 방장 고르기 · 끊긴 자리 봇 · 상태 요약
  const tHb = setInterval(beat, NET.hbMs);
  const tWho = setInterval(() => {
    if (!meta || !G || !L) return;
    const now = store.now(), want = pickHost(meta, hb, now, host);
    if (want === uid && host !== uid) { for (const i of store.get<number[]>(`${base}/ready`) ?? []) readySet.add(i); const sn = store.get<Snap>(`${base}/snap`), d = sn ? decodeSnap(sn) : null; if (d && sn) { overwrite(G, d); ack = { ...(sn.ack ?? {}) }; snapN = sn.n; } store.set(`${base}/host`, uid); host = uid; } // 👑 방장 넘겨받음 = 마지막 상태에서 이어감
    if (host === uid) hostIntro();
    if (host === uid) { const lost = lostSlots(meta, hb, now).filter((i) => i !== me), key = lost.join(','); if (key !== lostKey || !bots.length) { lostKey = key; bots = meta.slots.map((s, i) => (isBot(s) || lost.includes(i) ? newBot(L, i, isBot(s) ? s.bot : 'normal', meta!.seed) : null)).filter((b): b is Bot => !!b); } }
    else if (bots.length) bots = [];
  }, 1000);
  const tSnap = setInterval(() => { if (G && meta && host === uid) store.set(`${base}/snap`, encodeSnap(G, uid, store.now(), ack)); }, NET.snapMs);
  onDestroy(() => { clearInterval(tHb); clearInterval(tWho); clearInterval(tSnap); for (const u of unsubs) u(); });

  /** 판 끝 = 내 결과를 내 자리에 (방장 · 친구 모두 · 한 번) */
  function ended(B: State) {
    if (res || me < 0) { phase = 'result'; return; }
    if (host === uid) store.set(`${base}/snap`, encodeSnap(B, uid, store.now(), ack)); // 마지막 상태
    res = { ...atbResultFor(B, me, { prevStars }), ...(rightMids.size ? { mids: [...rightMids] } : {}) }; store.set(`${base}/end/${uid}`, res); phase = 'result';
  }
</script>

<Land>
{#if phase === 'wait' || !G || !L || !meta}
  <div class="netwait" role="status" data-k="atb-net-wait">⏳ 판을 준비하는 중… (방장 폰을 기다려요)</div>
{:else if phase === 'battle' && started}
  <AtbBattle {L} S={G} {me} onright={(m) => rightMids.add(m)} bots={isHost ? bots : []} seed={`${pid}|${uid}`} {fx} bg={art?.bg ?? ''} {labels} {whoNames} skipOld={!isHost && snapN > 0} net={{ remote: !isHost, send }} intro={{ t0: meta.t0, goAt, ready: readyL, short: metBefore(meta.no) || mastery > 0, now: () => store.now(), onready: () => { if (me >= 0) send({ k: 'ready', s: me }); } }} onend={ended} />
{:else if phase === 'result'}
  <AtbResult S={G} no={meta.no} {me} {mastery} practice={false} {labels} end={res} onagain={() => onend(res, true)} onswap={() => onend(res)} onexit={() => onend(res)} />
{/if}
</Land>

<style>
  .netwait { position: fixed; inset: 0; display: grid; place-items: center; background: #1a1424; color: #ffe9b0; font: 800 18px var(--font); }
</style>
