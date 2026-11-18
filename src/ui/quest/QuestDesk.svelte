<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import QuestPlay from './QuestPlay.svelte';
  import { liveValue } from '../room.svelte';
  import { sfx } from '../sound.svelte';
  import { TITLES } from '../../model/hero';
  import { castles } from '../../school/castles.svelte';
  import { bonusBase, castleState, manualOf, progressOf, withLegacy, type CastleRec } from '../../school/castle';
  import { rewriteOf, cfgOf, post } from '../../school/photo';
  import { CHANGES, GRADE_IC, GRADE_NAME, HALL, QUEST, REASON, hallSolveClaim, nameOptPath, questClaim, questPath, solveClaims, QBOARD, type QPlay, type QuestRec } from '../../school/quest';
  import { jpegOf, openImage, rectify } from '../../school/questImg';
  // ✏ #75 출제 공방 (📜 2026-11-18 · QUEST-PHOTO-PLAN · AI-JUDGE) — 캠프 오른쪽 아래 책상
  //   탭 3: 📸 내 문제 올리기 · 📜 내가 낸 문제 · 🏛 명예의 전당
  //   올리기 = 바탕 방(지금 열린 성채 방만) → 객관식 / 주관식 → 무엇을 바꿨나 → 양식 뒷면 사진 1장(하루 3번) → 모서리로 펴고 이름 띠 가림 → 중계소 「출제 분석」
  //   🧪 테스트 = 사진 · 중계소 없이 「✔ 테스트: 판단 결과로 보기」(등급 4개 · 이 기기 기록) · 학생과 같은 화면 · 단계
  const { S, me, cls, num, uid, test = false, tab: tab0 = 'up', claim, onclose }: { S: Store; me: Me; cls: string; num: number; uid: string; test?: boolean; tab?: 'up' | 'mine' | 'hall'; claim: (key: string, row: { g: number; s?: number; at: number; why: string }) => boolean; onclose: () => void } = $props();
  let tab = $state<'up' | 'mine' | 'hall'>(untrack(() => tab0)), toast = $state(''), ver = $state(0);
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2200); };
  const qp = untrack(() => questPath(cls || 'me', num || 0)), lvQ = untrack(() => liveValue<Record<string, QuestRec>>(S, qp)), lvH = untrack(() => liveValue<Record<string, QPlay>>(S, HALL)), bp = QBOARD(cls || 'me'), lvB = untrack(() => liveValue<Record<string, QPlay>>(S, bp));
  onDestroy(() => { lvQ.stop(); lvH.stop(); lvB.stop(); });
  const recs = $derived.by(() => { void ver; void lvQ.v.val; return S.get<Record<string, QuestRec>>(qp) || {}; });
  const mine = $derived(Object.entries(recs).filter(([, r]) => r && r.grade).sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0)));
  const hall = $derived.by(() => { void ver; void lvH.v.val; return Object.values(S.get<Record<string, QPlay>>(HALL) || {}).filter((x) => x && x.problem).sort((a, b) => Object.keys(b.like || {}).length - Object.keys(a.like || {}).length || b.at - a.at); });
  const board = $derived.by(() => { void ver; void lvB.v.val; return Object.values(S.get<Record<string, QPlay>>(bp) || {}).filter((x) => x && x.problem); });

  // ── 바탕 방 = 지금 나에게 열린 성채 방 (첫 판 문제 글 · 정답) ──
  type Base = { pack: string; room: string; floor: number; no: number; label: string; text: string; answer: string };
  const bases = $derived.by((): Base[] => {
    const out: Base[] = [], rec0 = untrack(() => (cls && num ? S.get<Record<string, unknown>>(`records/${cls}/${num}`) : null) || {}), upto = progressOf(S, cls, rec0, test);
    for (const P of castles.list.filter((x) => !x.hide)) {
      const recs = withLegacy(P.id, (S.get<Record<string, CastleRec>>(`${bonusBase(cls, num)}/${P.id}`) || {}) as Record<string, CastleRec>);
      for (const r of castleState(P, upto, recs, test, manualOf(S, P.id, cls)).open) { const w = rewriteOf(r.vers[0] ?? []); out.push({ pack: P.id, room: r.id, floor: P.floor, no: r.no, label: `${P.floor}층 ${r.title}`, text: [w.stem, ...w.lines].filter(Boolean).join(' / ').slice(0, 1200), answer: String(w.ph[0]?.answer ?? '') }); }
    }
    return out;
  });
  let bk = $state(''), qtype = $state<'obj' | 'subj' | ''>(''), changed = $state<Record<string, boolean>>({});
  const base = $derived(bases.find((b) => `${b.pack}/${b.room}` === bk) ?? null);
  const day = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
  const cfg = untrack(() => cfgOf(S)), qcfg = untrack(() => S.get<{ on?: boolean; daily?: number }>('gcfg/quest') || {});
  const daily = Number(qcfg.daily) || QUEST.daily;
  const used = $derived.by(() => { void ver; return test ? mine.filter(([, r]) => r.test && day(Number(r.at) || 0) === day(Date.now())).length : Number(S.get<number>(`quest_q/${String(cls).replace(/[.#$/[\]]/g, '_')}/${num}/${day(Date.now())}`)) || 0; });
  const relayOn = !!(cfg.url && qcfg.on !== false);
  const ready = $derived(!!base && !!qtype && used < daily);
  const why = $derived(!bases.length ? '열린 성채 방이 아직 없어요 · 수업을 들으면 열려요' : !base ? '바탕 방을 골라요' : !qtype ? '객관식 / 주관식을 골라요' : used >= daily ? `오늘 ${daily}번 다 냈어요 · 내일 또 내요` : '');

  // ── 사진 → 펴기 → 이름 띠 가림 → 보내기 ──
  let fileEl = $state<HTMLInputElement | null>(null), shot = $state(''), img: string | null = null, busy = $state(false), err = $state('');
  let rot = 0, im: HTMLImageElement | null = null;
  function choose(cam: boolean) { if (!fileEl) return; if (cam) fileEl.setAttribute('capture', 'environment'); else fileEl.removeAttribute('capture'); fileEl.value = ''; fileEl.click(); }
  async function picked() {
    const f = fileEl?.files?.[0]; if (!f) return; err = ''; shot = ''; img = null;
    try { im = await openImage(f); } catch (e) { err = (e as Error).message; return; }
    rot = 0; flat();
  }
  function flat() { if (!im) return; const c = rectify(im, rot); if (!c) { err = '📐 모서리 ㄱ 표시 4개를 못 찾았어요 — 양식 뒷면 네 귀퉁이가 다 나오게 · 밝은 곳에서 · 종이 밖 바탕이 보이게 다시 찍어요 (이름이 찍힌 채로는 보내지 않아요)'; sfx('block', 0.5); return; } img = jpegOf(c); shot = c.toDataURL('image/jpeg', 0.6); }
  function turn() { rot = (rot + 1) % 4; err = ''; flat(); }
  async function token(): Promise<string | null> { const a = (S as Store & { auth?: { currentUser: { getIdToken(): Promise<string> } | null } }).auth; try { return (await a?.currentUser?.getIdToken()) ?? null; } catch { return null; } }
  const ERRS: Record<string, string> = { off: '선생님이 출제 분석을 잠깐 꺼 두었어요', quota: `오늘 ${daily}번 다 냈어요 · 내일 또 내요`, busy: '지금 친구들이 한꺼번에 보내요 · 30초 뒤 다시', api: 'AI 가 잠깐 바빠요 · 조금 뒤 다시 (횟수는 그대로)', auth: '로그인이 풀렸어요 · 다시 로그인', who: '이 기기 로그인과 계정이 달라요', bad: '사진을 보내지 못했어요 · 다시 찍어요', net: '인터넷이 끊겼거나 오래 걸렸어요 · 다시 보내요' };
  async function send() {
    if (!base || !qtype || !img || busy) return; busy = true; err = '';
    const r = (await post(cfg.url || '', { kind: 'quest', idToken: await token(), c: cls, n: num, base: { pack: base.pack, room: base.room, text: base.text, answer: base.answer }, type: qtype, changed: Object.keys(changed).filter((k) => changed[k]), image: img })) as unknown as { ok: boolean; err?: string; id?: string };
    busy = false;
    if (!r?.ok) { err = `⚠ ${ERRS[r?.err || 'net'] || ERRS.net}`; return; }
    done();
  }
  /** 🧪 테스트: 사진 · 중계소 없이 판단 결과 하나 (학생과 같은 다음 화면) */
  function fake(g: QuestRec['grade']) {
    if (!base || !qtype) return;
    const id = `t${Date.now().toString(36)}`, n = Number(base.answer) || 5, obj = qtype === 'obj';
    const rec: QuestRec = { at: Date.now(), test: true, grade: g, status: g === 'green' ? 'done' : g === 'gray' ? 'gray' : 'wait', reason: g === 'gray' ? 'wrong_answer' : '', base: { pack: base.pack, room: base.room, text: base.text, answer: base.answer }, type: qtype, changed: Object.keys(changed).filter((k) => changed[k]),
      problem: `(테스트) ${base.text.slice(0, 120)} — 숫자를 바꾼 문제`, ...(obj ? { choices: [n - 2, n - 1, n, n + 1, n + 2].map(String), answer: '3' } : { answer: String(n) }), steps: ['① 조건을 식으로 써요', '② 계산해요'], hint: '바탕 방 풀이를 떠올려요', monster: '테스트 슬라임',
      solve1: `${n}`, solve2: `${n}`, agree: g !== 'gray', selfCheckNote: g === 'green' && changed.cond ? '숫자만 바뀐 것 같아요 · 조건도 바꿔 보세요' : '', issues: g === 'gray' ? ['적은 정답이 두 풀이와 달라요'] : [] };
    S.set(`${qp}/${id}`, rec); ver++; done();
  }
  function done() { shot = ''; img = null; im = null; tab = 'mine'; say('📨 냈어요 · 결과는 📜 내가 낸 문제에'); sfx('mail', 0.6); ver++; }

  // ── 보상 받기 (기록이 바뀌면 · 한 번씩) ──
  function claimAll() {
    const log = (cls && num ? S.get<Record<string, { at?: number }>>(`gem/${cls}/${num}/log`) : null) || {}, t = Date.now();
    let g = 0, s = 0;
    for (const [id, r] of mine) { if (r.test && !test) continue; const c = questClaim(id, r, log, t); if (c && claim(c.key, { g: c.g, s: c.s, at: t, why: c.why })) { g += c.g; s += c.s; log[c.key] = { at: t }; } }
    const myPlays = [...board, ...hall].filter(isMine);
    for (const c of solveClaims(myPlays.map((x) => ({ id: x.id, solved: x.solved })), log, t)) if (claim(c.key, { g: c.g, at: t, why: '✏ 친구가 내 문제를 풂' })) { g += c.g; log[c.key] = { at: t }; }
    if (g || s) { say(`🎁 ✏ 출제 보상 💎 +${g}${s ? ` · 📜 +${s}` : ''}`); sfx('scroll', 0.6); }
  }
  $effect(() => { void mine.length; void mine.map(([, r]) => r.status).join(); void board.length; void hall.length; untrack(claimAll); });

  // ── 풀기 (친구 문제 · 전당) ──
  let play = $state<QPlay | null>(null), playHall = false;
  const isMine = (q: QPlay) => q.by.cls === (cls || 'me') && Number(q.by.num) === num;
  function solved() {
    const q = play; if (!q) return;
    const path = playHall ? `${HALL}/${q.id}/solved/${uid}` : `${bp}/${q.id}/solved/${uid}`;
    if (!S.get(path)) S.set(path, Date.now());
    if (playHall) { const log = (cls && num ? S.get<Record<string, { at?: number }>>(`gem/${cls}/${num}/log`) : null) || {}, c = hallSolveClaim(q.id, log, Date.now()); if (c && claim(c.key, { g: c.g, at: Date.now(), why: '🏛 명예의 전당 문제 풂' })) say(`💎 +${c.g}`); }
    ver++;
  }
  function like(q: QPlay) { const p = `${HALL}/${q.id}/like/${uid}`; S.set(p, S.get(p) ? null : Date.now()); ver++; }
  let nameOn = $state(untrack(() => S.get<boolean>(nameOptPath(cls, num)) === true));
  function setName(v: boolean) { nameOn = v; if (cls && num) S.set(nameOptPath(cls, num), v || null); }
  const ttl = (id?: string) => TITLES.find((t) => t.id === id)?.name ?? '';
  const STATUS: Record<string, string> = { done: '✔ 내 문제로 저장', wait: '⏳ 선생님 확인 중', ok: '✅ 선생님 확인', fix: '✏ 고쳐 주세요', gray: '⚪ 다시 내 봐요' };
  function again(r: QuestRec) { bk = `${r.base.pack}/${r.base.room}`; qtype = r.type; changed = Object.fromEntries((r.changed || []).map((k) => [k, true])); tab = 'up'; }
</script>

<Sheet onclose={() => (play ? (play = null) : onclose())} tall mainText={play ? '목록으로' : '닫기'} onmain={() => (play ? (play = null) : onclose())}>
  {#snippet title()}✏ 출제 공방{/snippet}
  <div class="qd" data-k="quest-desk">
    {#if play}
      <p class="cap">{playHall ? '🏛 명예의 전당' : '✏ 친구 문제'} · {play.grade ? GRADE_IC[play.grade] : ''} {play.base ? `바탕 ${play.base.room}` : ''}</p>
      <QuestPlay q={play} mine={isMine(play)} onsolved={solved} />
    {:else}
    <div class="tabs" role="tablist">
      {#each [['up', '📸 내 문제 올리기'], ['mine', `📜 내가 낸 문제 ${mine.length}`], ['hall', '🏛 명예의 전당']] as [k, t] (k)}<button type="button" role="tab" aria-selected={tab === k} class:on={tab === k} data-k="quest-tab-{k}" onclick={() => (tab = k as typeof tab)}>{t}</button>{/each}
    </div>
    {#if tab === 'up'}
      <p class="cap">🏰 성채 문제를 바꿔서 내 문제로 · 오늘 <b>{Math.max(0, daily - used)}</b> / {daily}번 남음</p>
      <label class="lab" for="qbase">① 바탕 방 (지금 열린 성채 방)</label>
      <select id="qbase" data-k="quest-base" bind:value={bk} disabled={!bases.length}><option value="">{bases.length ? '고르기 ▾' : '열린 방이 없어요'}</option>{#each bases as b (`${b.pack}/${b.room}`)}<option value="{b.pack}/{b.room}">{b.label}</option>{/each}</select>
      {#if base}<p class="bt">{base.text}</p>{/if}
      <span class="lab">② 형식</span>
      <div class="seg" role="radiogroup" aria-label="형식">{#each [['obj', '객관식 (5지)'], ['subj', '주관식']] as [k, t] (k)}<button type="button" role="radio" aria-checked={qtype === k} class:on={qtype === k} data-k="quest-type-{k}" onclick={() => (qtype = k as 'obj' | 'subj')}>{qtype === k ? '✓ ' : ''}{t}</button>{/each}</div>
      <span class="lab">③ 무엇을 바꿨나 (여러 개)</span>
      <div class="chips">{#each CHANGES as [k, t] (k)}<button type="button" aria-pressed={!!changed[k]} class:on={!!changed[k]} data-k="quest-ch-{k}" onclick={() => (changed = { ...changed, [k]: !changed[k] })}>{changed[k] ? '✓ ' : ''}{t}</button>{/each}</div>
      <span class="lab">④ 양식 뒷면 사진 1장</span>
      {#if test}
        <div class="tst" data-k="quest-test"><b>✔ 테스트: 판단 결과로 보기</b><small>사진 · AI 없이 · 이 기기 기록 (학생과 같은 다음 화면)</small>
          <div class="g4">{#each ['green', 'blue', 'purple', 'gray'] as g (g)}<button type="button" disabled={!ready} data-k="quest-fake-{g}" onclick={() => fake(g as QuestRec['grade'])}>{GRADE_IC[g as QuestRec['grade']]} {GRADE_NAME[g as QuestRec['grade']]}</button>{/each}</div>
        </div>
      {:else if !relayOn}
        <p class="why">📴 선생님이 아직 출제 분석을 켜지 않았어요</p>
      {:else}
        <input bind:this={fileEl} type="file" accept="image/*" hidden onchange={picked} />
        {#if shot}<img class="shot" src={shot} alt="반듯하게 편 양식 뒷면 (이름 칸 가림)" /><div class="row2"><button type="button" class="b2" onclick={turn}>🔄 돌리기</button><button type="button" class="b2" onclick={() => choose(true)}>📷 다시 찍기</button></div>
        {:else}<div class="row2"><button type="button" class="b2" data-k="quest-cam" disabled={!ready} onclick={() => choose(true)}>📷 찍기</button><button type="button" class="b2" disabled={!ready} onclick={() => choose(false)}>🖼 앨범</button></div>
          <p class="tip">📐 네 귀퉁이 ㄱ 표시가 다 보이게 · 맨 위 이름 칸은 앱이 가려서 보내요 · 사진은 저장하지 않아요</p>{/if}
        <button type="button" class="go" data-k="quest-send" disabled={!ready || !img || busy} onclick={send}>{busy ? '🤖 살펴보는 중… (20초쯤)' : '📨 출제 분석 보내기'}</button>
      {/if}
      {#if err}<p class="err" role="alert">{err}</p>{/if}
      {#if why}<p class="why">{why}</p>{/if}
      <p class="rw">🟢 숫자 바꿈 💎{QUEST.green.g} · 🔵 변형 = 선생님 확인 뒤 💎{QUEST.blue.g} 📜{QUEST.blue.s} · 친구 문제 · 🟣 독창 = 선생님 확인 뒤 💎{QUEST.purple.g} 📜{QUEST.purple.s} · 🏛 전당</p>
    {:else if tab === 'mine'}
      {#each mine as [id, r] (id)}
        <div class="it g-{r.grade}" data-k="quest-mine">
          <div class="h"><span class="gd">{GRADE_IC[r.grade]} {GRADE_NAME[r.grade]}</span><small>{STATUS[r.status] ?? ''}{r.test ? ' · 🧪' : ''}</small></div>
          {#if r.problem}<p class="pb">{r.problem}</p>{/if}
          {#if r.grade === 'gray'}<p class="rs">{REASON[r.reason || ''] ?? '다시 살펴봐요'}{r.issues?.[0] ? ` · ${r.issues[0]}` : ''}</p>{/if}
          {#if r.selfCheckNote}<p class="sc">💬 {r.selfCheckNote}</p>{/if}
          {#if r.status === 'fix' || (r.fixNote && r.status === 'ok')}<p class="fx">👩‍🏫 {r.fixNote}</p>{/if}
          {#if r.grade === 'gray' || r.status === 'fix'}<button type="button" class="b2" data-k="quest-again" onclick={() => again(r)}>✏ 고쳐서 다시 내기</button>{/if}
        </div>
      {:else}<div class="empty"><span>✏</span><p>아직 낸 문제가 없어요 · 📸 올리기에서 처음 내 봐요</p></div>{/each}
      {#if board.length}<p class="lab">✏ 우리 반 친구 문제 {board.length}</p>
        {#each board as q (q.id)}<button type="button" class="pl" data-k="quest-friend" onclick={() => { playHall = false; play = q; }}><span>{GRADE_IC[q.grade]} {q.monster || '친구 문제'}</span><small>{isMine(q) ? '내 문제' : q.solved?.[uid] ? '✔ 풂' : '풀어 보기 ›'} · 푼 친구 {Object.keys(q.solved || {}).length}</small></button>{/each}{/if}
    {:else}
      <label class="opt"><input type="checkbox" checked={nameOn} data-k="quest-nameopt" onchange={(e) => setName((e.currentTarget as HTMLInputElement).checked)} /> 내 문제가 전당에 오르면 이름도 보이기 <small>(끄면 용사 · 칭호 · 반만)</small></label>
      {#each hall as q (q.id)}
        <div class="hl" data-k="quest-hall">
          <span class="hs"><HeroSprite id={q.hero ?? 0} scale={1} /></span>
          <div class="hx"><b>{q.monster || '전당 문제'}</b><small>{q.by.cls}반{q.name ? ` · ${q.name}` : ''}{ttl(q.title) ? ` · 「${ttl(q.title)}」` : ''}</small>
            <div class="hb"><button type="button" class="b2" onclick={() => { playHall = true; play = q; }}>{q.solved?.[uid] ? '✔ 다시 풀기' : '⚔ 1:1 풀기'}</button><button type="button" class="lk" class:on={!!q.like?.[uid]} aria-pressed={!!q.like?.[uid]} onclick={() => like(q)}>👍 {Object.keys(q.like || {}).length}</button></div>
          </div>
        </div>
      {:else}<div class="empty"><span>🏛</span><p>아직 전당에 오른 문제가 없어요 · 🟣 독창 문제가 선생님 확인을 받으면 여기에</p></div>{/each}
    {/if}
    {/if}
    {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  </div>
</Sheet>

<style>
  .qd { display: flex; flex-direction: column; gap: 10px; padding-bottom: 12px; }
  .tabs { display: flex; gap: 6px; overflow-x: auto; position: sticky; top: 0; z-index: 2; padding: 2px 0 6px; background: var(--surface); }
  .tabs button { flex: none; min-height: 40px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text-2); font: 700 14px var(--font); }
  .tabs button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  .cap { margin: 0; font-size: 14px; color: var(--text-2); }
  .lab { font: 700 14px var(--font); color: var(--text); margin-top: 4px; }
  select { min-height: 48px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 600 15px var(--font); }
  .bt { margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); font: 500 14px/1.5 var(--font); color: var(--text-2); max-height: 120px; overflow: auto; }
  .seg, .chips, .row2, .g4 { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg button, .chips button, .b2, .g4 button { min-height: 48px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--line); }
  .seg button { flex: 1; } .row2 .b2 { flex: 1; }
  .seg button.on, .chips button.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, var(--surface-2)); }
  button:disabled { opacity: 0.45; box-shadow: none; }
  .go { min-height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 16px var(--font); box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 55%, #000); }
  .shot { width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; background: #fff; }
  .tip, .rw { margin: 0; font-size: 13px; color: var(--text-3); line-height: 1.5; }
  .why { margin: 0; font: 600 14px var(--font); color: var(--text-2); }
  .err { margin: 0; font: 600 14px/1.5 var(--font); color: var(--bad); }
  .tst { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; border: 1px dashed var(--accent); }
  .tst small { color: var(--text-3); font-size: 13px; } .g4 button { flex: 1 1 45%; }
  .it { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: var(--surface-2); border-left: 4px solid var(--line); }
  .it.g-green { border-left-color: #4cc38a; } .it.g-blue { border-left-color: #6cc6ff; } .it.g-purple { border-left-color: #c79bff; } .it.g-gray { border-left-color: #7c8190; }
  .h { display: flex; justify-content: space-between; align-items: center; gap: 8px; } .gd { font: 800 15px var(--font); } .h small { font-size: 13px; color: var(--text-2); }
  .pb { margin: 0; font: 500 14px/1.5 var(--font); white-space: pre-wrap; }
  .rs, .sc, .fx { margin: 0; font-size: 14px; line-height: 1.5; } .rs { color: var(--bad); } .sc { color: var(--text-2); } .fx { color: var(--accent); }
  .pl { display: flex; justify-content: space-between; align-items: center; min-height: 52px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--line); }
  .pl small { font: 600 13px var(--font); color: var(--text-2); }
  .opt { display: flex; align-items: center; gap: 8px; font: 600 14px var(--font); min-height: 48px; } .opt small { color: var(--text-3); font-size: 13px; } .opt input { width: 22px; height: 22px; }
  .hl { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 12px; background: var(--surface-2); }
  .hs { width: 64px; height: 64px; display: grid; place-items: center; overflow: hidden; flex: none; }
  .hx { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; } .hx small { color: var(--text-2); font-size: 13px; }
  .hb { display: flex; gap: 8px; } .lk { min-height: 48px; min-width: 64px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); } .lk.on { border-color: var(--accent); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 24px 8px; color: var(--text-2); text-align: center; } .empty span { font-size: 32px; } .empty p { margin: 0; font-size: 14px; }
  .toast { position: sticky; bottom: 0; margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--accent); font: 700 14px var(--font); text-align: center; }
</style>
