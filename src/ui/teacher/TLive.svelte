<script lang="ts">
  import { V4 } from '../../raid/raid';
  import { hallKeyOf } from '../../school/school';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, BOSS_ID, bossHp, bossState, chainRecord, isChain, isEnd, isLobby, monsterHp, nextIdx, plainRecord, solveLock, stepIdx, stepOf, timeLeft } from '../../raid/raid';
  import { appearNow, chainRelease, heartRelease, endClass, extendTime, giveGift, nextStep, prevStep, roomPath, scoutAdd, sendReload, setAbsent, setBubble, setFocus, setPct, setRest, setSheet, setSolveSec, setThink, setVideo } from '../../raid/actions';
  import { isOld, roster, type Live } from '../../school/school';
  import { hhmm } from '../../school/bells';
  import { COLOR, groups, kindOf, minOf, short, total } from './flow';
  import { liveRoom } from '../room.svelte';
  import QR from '../QR.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { driveFun, endRest, funOf, GAMES, gamesOn, restMinDef, restOn, startFun, stopFun, tdCheer, tdShield, type Game } from '../../rest/run';
  import { status as funStatus, norm, type Fun } from '../../rest/fun';

  // ⑬ 대기실 · ⑭ 리모컨 (#119 · DECISIONS 「대기실 확정」 「리모컨 칸 고정」 「도구 두 줄 맞춤」) — 같은 틀: 위 막대 · 가운데(스크롤 없음) · 주요 단추 68 · 수업 중 막대 62
  //   리모컨 칸 고정: 지금 단계 카드 = 배지 한 줄 · 제출 n / m · 미제출 · 높이 48 칸(정찰 중 −30초 · 등장까지 · +30초 → 등장 뒤 −5% · 체력 · +5%) · 🔒 · 🔄 칩 자리 늘 2줄 · 도구 여섯 칸 52 · 「다음 ▶」
  const { S, L, live, now, onhome, onclose }: { S: Store; L: LessonPack; live: Live; now: number; onhome: () => void; onclose: () => void } = $props();
  const lr = untrack(() => liveRoom(S, live.code));
  onDestroy(lr.stop);
  const R = $derived(lr.v.room as Room | null);
  $effect(() => { if (R?.state.closed) untrack(onclose); }); // 교실 TV 에서 문이 닫혀 끝나도 교사 폰이 따라감
  const code = $derived(live.code);
  const pupils = $derived(roster(live.cls, S));
  const ids = $derived(R ? activeIds(R, now) : []);
  const absent = $derived(R?.absent || {});
  const expected = $derived(pupils.filter((p) => !absent[p.uid]));
  const inSet = $derived(new Set(ids));
  const oldIds = $derived(R ? ids.filter((u) => isOld(R.players?.[u]?.ver)) : []);
  const nameOf = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? `${p.num} ${p.name.slice(1)}` : R?.players?.[u]?.nick ?? u; };
  const numOf = (u: string) => pupils.find((x) => x.uid === u)?.num ?? R?.players?.[u]?.num ?? 0;
  let toast = $state(''), toastT: ReturnType<typeof setTimeout> | null = null;
  const say = (t: string) => { toast = t; if (toastT) clearTimeout(toastT); toastT = setTimeout(() => (toast = ''), 1800); };

  // ── 흐름 · 시간 ──
  const G = $derived(groups(L, R));
  const mins = $derived(total(L, R));
  const left = $derived(R ? timeLeft(R, now) : null);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const i = $derived(R ? stepIdx(R) : -1);
  const step = $derived(R ? stepOf(L, R) : null);
  const steps = $derived(L.steps.map((s, k) => ({ s, k })).filter((x) => !x.s.later));
  const restMin = $derived(steps.filter((x) => x.k > i).reduce((a, x) => a + minOf(L, R, x.s), 0) + (step ? Math.ceil(minOf(L, R, step) / 2) : 0));
  const endAt = $derived(isLobby(R as Room) ? now + mins * 60e3 : now + restMin * 60e3);
  const bell = $derived(R?.state.deadline ? R.state.deadline + (Number(R.state.extend) || 0) * 60e3 : null);
  const late = $derived(bell ? Math.round((endAt - bell) / 60e3) : 0);
  const nextStepObj = $derived(R && !isEnd(L, R) ? L.steps[nextIdx(L, R)] ?? null : null);

  // ── 지금 단계 ──
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : R && step?.kind === 'boss' && L.boss ? bossHp(L, R, now) : null);
  const subd = $derived.by(() => {
    if (!R || !step) return [] as string[];
    if (step.kind === 'boss') return ids.filter((u) => bossState(L, R, u).some((x) => x.n > 0));
    if (!mid) return [];
    return ids.filter((u) => (chain ? chainRecord(L, R, mid, u).submitted : plainRecord(L, R, mid, u).submitted));
  });
  const unsub = $derived(ids.filter((u) => !subd.includes(u)));
  const stuck = $derived.by(() => {
    if (!R || !mid) return [] as { u: string; lock: boolean }[];
    if (chain) return ids.map((u) => ({ u, r: chainRecord(L, R, mid, u) })).filter((x) => x.r.locked || x.r.fail).map((x) => ({ u: x.u, lock: x.r.locked }));
    return ids.map((u) => ({ u, r: plainRecord(L, R, mid, u) })).filter((x) => x.r.submitted && !x.r.canRetry && x.r.best < x.r.total).map((x) => ({ u: x.u, lock: !!x.r.locked })); // v4 ❤ 0 = 🙋 잠김 → 풀어주기
  });
  const boss5 = $derived(left != null && left > 0 && left <= 5 * 60e3 && !R?.state.extend);
  const doorAsk = $derived(!!R?.state.door);

  // ── 시트 ──
  let sheet = $state<'' | 'bubble' | 'set' | 'gift' | 'ask' | 'qr' | 'rest'>('');
  // 🏕 쉼터 (#142 ①): 🏕 = 쉼터 켜고(지난 분) 놀이 고르기 시트 · 놀이 5칸 · ⭕ = 지난 · 오늘 · 분 −/＋ = 다음 쉼터 기본으로 기억 · 이 폰도 놀이 시계를 맡음(TV 가 없을 때)
  const stopDrive = untrack(() => driveFun(S, live.code, 'tp'));
  onDestroy(stopDrive);
  let game = $state<Game>('bal'), oxWhich = $state<'prev' | 'now'>('now'), rmin = $state(untrack(() => restMinDef(S)));
  const fun = $derived(funOf(R));
  const funOn = $derived(!!fun && fun.phase !== 'end');
  const tdf = $derived(fun && (fun.kind as string) === 'td' ? (fun as unknown as { g: number; phase: string; sh?: number; ch?: Record<string, number>; res?: { win: boolean } }) : null);
  const tdWave = $derived(tdf ? Number((R as unknown as { tdl?: Record<string, { wave?: number; life?: number }> }).tdl?.[tdf.g]?.wave) || 1 : 1);
  const funLine = $derived(tdf ? `🏰 디펜스 · ${tdf.phase === 'pick' ? '자리 고르는 중' : tdf.phase === 'play' ? `웨이브 ${tdWave}/5` : tdf.res?.win ? '🏆 승리' : '끝'}` : !fun ? '' : fun.kind === 'nun' ? `🙊 눈치게임 · ${fun.phase === 'end' ? '끝' : `${(fun as unknown as { round: number }).round}판 · 생존 ${Object.keys(fun.alive || {}).length}명`}` : funStatus(norm(fun as Fun)));
  const gameOf = (k: Game) => GAMES.find((g) => g.k === k)!;
  function openRest() { if (!R) return; if (!R.state.rest) restOn(S, code, R, rmin); sheet = 'rest'; }
  function setMin(d: number) { if (!R) return; rmin = Math.max(1, Math.min(20, rmin + d)); restOn(S, code, R, rmin); }
  function goGame() {
    if (!R) return;
    if (funOn) { stopFun(S, code); return; }
    const err = startFun(S, code, R, game, { which: oxWhich, no: L.no, me: 'tp' });
    if (err) say(err); else sheet = '';
  }
  // 🚪 입장 (#138 ③): 코드 크게 + QR(주소 ?join=코드 · 로그인한 폰은 바로 · 아니면 로그인 뒤 그 수업) · 교실 TV 주소
  const site = `${location.origin}${import.meta.env.BASE_URL}`;
  const joinUrl = $derived(`${site}?join=${encodeURIComponent(code)}`);
  const spaced = (c: string) => c.replace(/^(\d{3})(\d{3})$/, '$1 $2');
  let bub = $state('');
  const QUICK = $derived([`${L.no}차시 던전에 온 걸 환영하네!`, '오늘 목표 = 보스 쓰러뜨리기!', '늦게 온 친구는 코드 보고 들어와']);
  // 💎 선물
  let amt = $state(10);
  let picked = $state<Record<string, boolean>>({});
  const pickN = $derived(Object.values(picked).filter(Boolean).length);
  const perfectIds = $derived(R && mid ? ids.filter((u) => (chain ? chainRecord(L, R, mid, u).perfect : plainRecord(L, R, mid, u).perfect)) : []);
  const quick = (xs: string[]) => { picked = Object.fromEntries(xs.map((u) => [u, true])); };
  function sendGift() { const us = Object.keys(picked).filter((u) => picked[u]); const all = ids.length > 0 && ids.every((u) => picked[u]); const n = giveGift(S, code, us, amt, all); sheet = ''; picked = {}; say(`🎁 ${n}명에게 💎 ${amt} 보냈어요`); }

  function main() {
    if (!R) return;
    if (scout?.on) { appearNow(S, L, code); return; }
    if (isEnd(L, R)) { sheet = 'ask'; return; }
    if (R.state.rest) endRest(S, code); // 🏕 쉼터 중 「다음 ▶」 = 쉼터 끝 + 수업으로
    nextStep(S, L, code);
  }
  const mainText = $derived(!R ? '' : isLobby(R) ? '▶ 수업 시작' : scout?.on ? '⚔ 지금 등장' : isEnd(L, R) ? '■ 수업 닫기' : nextStepObj ? `다음 ▶ ${short(nextStepObj)}` : '다음 ▶ 마무리');
  function plus5() { const e = extendTime(S, code); say(e ? `⏰ ${e}` : '⏰ 5분 늘렸어요'); }
  const flex = (s: { s: { id: string } }) => Math.max(1, minOf(L, R, s.s as never));
</script>

{#if R}
  <div class="tbar">
    <button type="button" class="back" aria-label="수업 열기로" onclick={onhome}>‹</button>
    <div class="t">{live.cls}반 · {L.no}차시{live.test ? ' · 🧪' : ''}<small>{isLobby(R) ? '대기실' : left != null ? `⏳ 남은 시간 ${mmss(left)}` : '시간 제한 없음'}</small></div>
    <span class="codek" aria-label="수업 코드 {code} · 종합실 키 {hallKeyOf(S, code)}"><b>코드 {code}</b><small>종합실 키 {hallKeyOf(S, code)}</small></span>
  </div>

  {#if isLobby(R)}
    <!-- ⑬ 대기실 -->
    <div class="mid lob">
      <button type="button" class="join" onclick={() => (sheet = 'qr')} aria-label="수업 코드 {code} · QR 보기"><span>🚪 코드</span><b>{spaced(code)}</b><em>📱 QR ›</em></button>
      <div class="card">
        <div class="hd"><span class="lab">들어온 학생 · 판 확인</span><b class="cnt">{ids.length} <small>/ {expected.length}</small></b></div>
        <div class="nums" role="group" aria-label="번호 칸">
          {#each pupils as p (p.uid)}
            {@const st = absent[p.uid] ? 'ab' : inSet.has(p.uid) ? (isOld(R.players?.[p.uid]?.ver) ? 'old' : 'in') : 'no'}
            <button type="button" class="n {st}" aria-label="{p.num}번 {st === 'in' ? '새 판' : st === 'old' ? '옛 판' : st === 'ab' ? '결석' : '안 옴'}" disabled={st === 'in' || st === 'old'} onclick={() => setAbsent(S, code, p.uid, st !== 'ab')}>{p.num}{#if st === 'old'}<i>⚠</i>{:else if st === 'ab'}<i>결</i>{/if}</button>
          {/each}
        </div>
        <div class="legend fold"><span><i class="lg in"></i>새 판 {ids.length - oldIds.length}</span><span><i class="lg old"></i>옛 판 {oldIds.length}{oldIds.length ? ` (${oldIds.map(numOf).join(' · ')}번)` : ''}</span><span><i class="lg no"></i>안 옴 {expected.length - ids.length}</span></div>
        <button type="button" class="wide" disabled={!oldIds.length} onclick={() => { sendReload(S, code, oldIds); say(`🔄 ${oldIds.length}명에게 새로 고침을 보냈어요`); }}>{oldIds.length ? `⚠ 옛 판 ${oldIds.length}명에게 새로 고침` : '옛 판 없음'} · 안 온 번호 = 눌러서 결석</button>
      </div>
      <button type="button" class="bub" onclick={() => { bub = R.state.bubble || QUICK[0] || ''; sheet = 'bubble'; }}><span>💬</span><b>「{R.state.bubble || QUICK[0]}」</b><em>바꾸기 ›</em></button>
      <div class="card fl">
        <div class="hd"><span class="lab">오늘 흐름 · 약 {mins}분</span><span class="endt"><b>끝 {hhmm(endAt)}</b>{#if bell} <small>종 {hhmm(bell)}</small>{/if}</span></div>
        <div class="fbar">{#each G as g (g.from)}<i style:flex={g.min} style:background={COLOR[g.kind]}></i>{/each}</div>
        <ol class="tl2 fold">{#each G as g (g.from)}<li><i style:background={COLOR[g.kind]}></i><span>{g.label}</span><em>{g.min}분</em></li>{/each}</ol>
        <div class="setrow fold"><button type="button" class="chipbtn" onclick={() => (sheet = 'set')}>체력 기준 {R.meta.pct ?? L.defaultPct}%</button><button type="button" class="chipbtn" onclick={() => (sheet = 'set')}>정찰 {R.meta.solve}초</button><button type="button" class="chipbtn" onclick={() => (sheet = 'set')}>생각 {R.meta.think}초</button></div>
        <button type="button" class="fsum unfold" onclick={() => (sheet = 'set')}>{G.map((g) => `${g.label.replace(/ ⚔$/, '')} ${g.min}`).join(' · ')}분 · <b>설정 ›</b></button>
      </div>
    </div>
    <div class="tact"><button type="button" class="btn" disabled={!ids.length} onclick={main}>▶ 수업 시작<small>들어온 학생 {ids.length} / {expected.length}</small></button></div>
    <div class="lbar"><i class="live"></i><span>{live.cls}반 · {L.no}차시 · <b>대기실</b></span><button type="button" onclick={() => (sheet = 'ask')}>수업 닫기</button></div>
  {:else}
    <!-- ⑭ 리모컨 -->
    <div class="rflow" aria-label="단계 {steps.findIndex((x) => x.k === i) + 1} / {steps.length}">
      <div class="rfbar">{#each steps as x (x.s.id)}<i class:ok={x.k < i} class:now={x.k === i} style:flex={flex(x)} style:--c={COLOR[kindOf(L, R, x.s)]} title={short(x.s)}></i>{/each}</div>
      <div class="rfcap"><span>{Math.max(0, steps.findIndex((x) => x.k === i)) + 1} / {steps.length}</span><b>{isEnd(L, R) ? '마무리' : `지금 · ${short(step)}`}</b><span>{nextStepObj ? `다음 · ${short(nextStepObj)} ›` : '다음 · 마무리'}</span></div>
    </div>
    <div class="mid rem">
      <div class="pace fold"><span>끝 예상 <b>{hhmm(endAt)}</b></span>{#if bell}<span class:late={late > 0}>종 {hhmm(bell)}{late > 0 ? ` · ${late}분 늦음` : ' · 맞춰 가요'}</span>{/if}</div>
      <div class="card rstat">
        <div class="rs1"><span class="lab acc">{isEnd(L, R) ? '마무리 · 학급 결과' : `지금 · ${step?.title ?? ''}`}</span>
          {#if doorAsk}<span class="badge boss">👑 문 닫는 중</span>{:else if boss5 && left != null}<span class="badge boss">👑 문을 닫아요 · <b>{mmss(left)}</b></span>{:else if scout?.on}<span class="badge sc">🌫 정찰 중</span>{:else if R.state.focus}<span class="badge fo">⏸ 집중</span>{:else if R.state.rest}<span class="badge fo">🏕 {funLine || '쉼터'}</span>{/if}
        </div>
        <div class="rs2"><div class="big2"><b>{mid || step?.kind === 'boss' ? subd.length : ids.length}</b><span>/ {ids.length} {mid || step?.kind === 'boss' ? '제출' : '접속'}</span></div>
          <span class="unsub">{#if mid || step?.kind === 'boss'}{#if !unsub.length}미제출 없음{:else if unsub.length <= 4}미제출 <b>{unsub.map(numOf).join(' · ')}번</b>{:else}미제출 <b>{unsub.length}명</b>{/if}{:else}{step?.kind === 'concept' ? '개념 설명 중' : ''}{/if}</span>
        </div>
        {#if scout?.on}
          <div class="adj" aria-label="정찰 시간 조정"><button type="button" aria-label="정찰 30초 줄이기" onclick={() => scoutAdd(S, L, code, -30)}>−30초</button>
            <div class="hpl"><div class="b sc"><i style:width="{Math.min(100, (scout.left / ((scout.end - scout.t0) || 1)) * 100)}%"></i></div><small>등장까지 <b>{Math.ceil(scout.left / 1000)}초</b> · 준비 완료 <b>{Object.keys(R.ready?.[scout.id] || {}).length}</b></small></div>
            <button type="button" aria-label="정찰 30초 늘리기" onclick={() => scoutAdd(S, L, code, 30)}>+30초</button></div>
        {:else}
          <div class="adj" aria-label="체력 기준 조정"><button type="button" aria-label="체력 기준 5% 내리기" disabled={!hp} onclick={() => setPct(S, code, (R.meta.pct ?? L.defaultPct) - 5)}>−5%</button>
            <div class="hpl"><div class="b"><i style:width="{hp && hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div><small>{#if hp}체력 <b>{hp.left} / {hp.max}</b> · 기준 <b>{hp.pct}%</b>{:else}몬스터 없음 · 기준 <b>{R.meta.pct ?? L.defaultPct}%</b>{/if}</small></div>
            <button type="button" aria-label="체력 기준 5% 올리기" disabled={!hp} onclick={() => setPct(S, code, (R.meta.pct ?? L.defaultPct) + 5)}>+5%</button></div>
        {/if}
      </div>
      <div class="alerts" aria-label="챙길 학생">
        <div class="al stuck">{#if stuck.length}<span class="alh">🔒 막힘 {stuck.length}</span>{#each stuck.slice(0, 3) as x (x.u)}<button type="button" onclick={() => { if (x.lock && mid) { if (R && V4(R)) heartRelease(S, code, mid, x.u); else chainRelease(S, code, mid, x.u); say(`✔ ${nameOf(x.u)} 풀어 줬어요`); } else say(`${nameOf(x.u)} · 기회를 다 썼어요 (학습지로)`); }}>{nameOf(x.u)}</button>{/each}{#if stuck.length > 3}<span class="more">+{stuck.length - 3}</span>{/if}{/if}</div>
        <div class="al old">{#if oldIds.length}<span class="alh">🔄 옛 판 {oldIds.length}</span>{#each oldIds.slice(0, 2) as u (u)}<button type="button" onclick={() => { sendReload(S, code, [u]); say(`🔄 ${nameOf(u)} 새로 고침`); }}>{nameOf(u)} · 새로 고침</button>{/each}{#if oldIds.length > 2}<span class="more">+{oldIds.length - 2}</span>{/if}{/if}</div>
      </div>
    </div>
    <div class="rdock" role="group" aria-label="도구">
      <button type="button" class:on={!!R.state.rest} aria-pressed={!!R.state.rest} onclick={openRest}><b>🏕 쉼터</b></button>
      <button type="button" class:on={!!R.state.video} disabled={!step || !L.videos?.[step.id]} aria-pressed={!!R.state.video} onclick={() => setVideo(S, code, R.state.video ? null : step?.id ?? null)}><b>🎬 영상</b></button>
      <button type="button" class:on={!!R.state.sheet} disabled={!mid && step?.kind !== 'concept'} aria-pressed={!!R.state.sheet} onclick={() => setSheet(S, code, R.state.sheet ? null : step?.id ?? null)}><b>📄 문제</b></button>
      <button type="button" onclick={() => { picked = {}; sheet = 'gift'; }}><b>💎 선물</b></button>
      <button type="button" class:on={!!R.state.focus} aria-pressed={!!R.state.focus} onclick={() => setFocus(S, code, !R.state.focus)}><b>🔴 집중</b></button>
      <button type="button" class="t5" class:glow={boss5 || doorAsk} disabled={!!R.state.extend || !R.state.deadline} onclick={plus5}><b>⏰ +5분</b></button>
    </div>
    <div class="tact"><button type="button" class="btn2" aria-label="앞 단계" disabled={i <= 0} onclick={() => prevStep(S, L, code)}>◀</button><button type="button" class="btn" onclick={main}>{mainText}</button></div>
    <div class="lbar"><i class="live"></i><span>{live.cls}반 · {L.no}차시 · <b>수업 중</b>{left != null ? ` · ${mmss(left)}` : ''}</span><button type="button" onclick={() => (sheet = 'ask')}>수업 닫기</button></div>
  {/if}

  {#if toast}<p class="toast" role="status">{toast}</p>{/if}

  {#if sheet === 'bubble'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}💬 TV 대기실 선생님 말{/snippet}
      {#snippet act()}<button type="button" class="btn" disabled={!bub.trim()} onclick={() => { setBubble(S, code, bub.trim()); sheet = ''; }}>이 말로 바꾸기</button>{/snippet}
      <div class="qk">{#each QUICK as q (q)}<button type="button" class:on={bub === q} onclick={() => { setBubble(S, code, q); sheet = ''; }}>{q}</button>{/each}</div>
      <label class="own">직접 쓰기 <small>{bub.length} / 20</small><input maxlength="20" bind:value={bub} /></label>
    </Sheet>
  {:else if sheet === 'set'}
    <Sheet onclose={() => (sheet = '')} mainText="다 했어요">
      {#snippet title()}설정{/snippet}
      {#each [['체력 기준', `${R.meta.pct ?? L.defaultPct}%`, () => setPct(S, code, (R.meta.pct ?? L.defaultPct) - 5), () => setPct(S, code, (R.meta.pct ?? L.defaultPct) + 5)], ['정찰', `${R.meta.solve}초`, () => setSolveSec(S, code, R.meta.solve - 10), () => setSolveSec(S, code, R.meta.solve + 10)], ['생각', `${R.meta.think}초`, () => setThink(S, code, R.meta.think - 1), () => setThink(S, code, R.meta.think + 1)]] as const as [k, v, dn, up] (k)}
        <div class="stp"><span>{k}</span><button type="button" aria-label="{k} 줄이기" onclick={dn}>−</button><b>{v}</b><button type="button" aria-label="{k} 늘리기" onclick={up}>+</button></div>
      {/each}
    </Sheet>
  {:else if sheet === 'gift'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}💎 마정석 선물{/snippet}
      {#snippet act()}<button type="button" class="btn big" disabled={!pickN} onclick={sendGift}>{pickN ? `고른 ${pickN}명에게 💎 ${amt} 보내기` : '받을 학생을 골라요'}</button>{/snippet}
      <div class="gamt">{#each [5, 10, 20, 50] as a (a)}<button type="button" class:on={amt === a} onclick={() => (amt = a)}>{a}</button>{/each}<span class="gpm"><button type="button" aria-label="5 줄이기" onclick={() => (amt = Math.max(5, amt - 5))}>−5</button><b>💎 {amt}</b><button type="button" aria-label="5 늘리기" onclick={() => (amt = Math.min(100, amt + 5))}>+5</button></span></div>
      <div class="gquick"><button type="button" onclick={() => quick(ids)}>모두 {ids.length}</button><button type="button" disabled={!stuck.length} onclick={() => quick(stuck.map((x) => x.u))}>🔒 막힌 학생 {stuck.length}</button><button type="button" disabled={!perfectIds.length} onclick={() => quick(perfectIds)}>✨ 퍼펙트 {perfectIds.length}</button><button type="button" onclick={() => quick(subd.length ? subd : ids)}>미제출 빼고</button></div>
      <div class="ggrid">{#each ids as u (u)}<button type="button" class="gn" class:on={!!picked[u]} aria-pressed={!!picked[u]} onclick={() => (picked = { ...picked, [u]: !picked[u] })}><b>{numOf(u)}</b>{nameOf(u).split(' ')[1] ?? ''}</button>{/each}</div>
      <p class="gnote">하루 한도와 상관없이 바로 들어가요 · {pickN && pickN === ids.length ? 'TV 에 「🎁 선생님 선물! 모두」' : '받은 학생 폰에만 알림 (TV 없음)'}</p>
    </Sheet>
  {:else if sheet === 'rest'}
    <Sheet onclose={() => (sheet = '')}>
      {#snippet title()}🏕 놀이 고르기{/snippet}
      {#snippet act()}<div class="rsact"><div class="row"><button type="button" class="btn2" onclick={() => { endRest(S, code); sheet = ''; }}>쉼터 끝</button><button type="button" class="btn rbig" onclick={goGame}>{funOn ? `■ 놀이 그만 · ${funLine}` : `▶ ${gameOf(game).ic} ${gameOf(game).name}${game === 'quiz' ? (oxWhich === 'prev' ? ' · 지난' : ' · 오늘') : ''} 시작`}</button></div></div>{/snippet}
      {#if !(tdf && tdf.phase === 'play')}<div class="games" role="group" aria-label="놀이">
        {#each gamesOn() as g (g.k)}<button type="button" class="game" class:on={game === g.k} aria-pressed={game === g.k} disabled={funOn} onclick={() => (game = g.k)}><i>{g.ic}</i>{g.name}</button>{/each}
        {#if game === 'quiz'}<div class="oxw" role="group" aria-label="OX 문장"><button type="button" class:on={oxWhich === 'prev'} onclick={() => (oxWhich = 'prev')}>지난 차시</button><button type="button" class:on={oxWhich === 'now'} onclick={() => (oxWhich = 'now')}>오늘</button></div>{/if}
      </div>{/if}
      {#if tdf && tdf.phase === 'play'}<div class="tdc"><button type="button" disabled={!!tdf.sh} onclick={() => { tdShield(S, code); say('🛡 수호 방패! 성에 닿는 몬스터 3마리를 막아요'); }}>🛡 수호 방패<small>{tdf.sh ? '썼어요' : '한 판 한 번'}</small></button><button type="button" disabled={!!tdf.ch?.[tdWave]} onclick={() => { tdCheer(S, code, tdWave); say('✨ 응원! 5초 동안 공격 속도 +20%'); }}>✨ 응원 마법<small>{tdf.ch?.[tdWave] ? '이번 웨이브 씀' : `웨이브 ${tdWave} · 한 번`}</small></button></div>{/if}
      <div class="rstep"><button type="button" aria-label="1분 줄이기" onclick={() => setMin(-1)}>−</button><b>{rmin}분<small>{R.state.rest ? `남은 ${mmss(Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - now))}` : ''}</small></b><button type="button" aria-label="1분 늘리기" onclick={() => setMin(1)}>＋</button></div>
    </Sheet>
  {:else if sheet === 'qr'}
    <Sheet onclose={() => (sheet = '')} mainText="닫기">
      {#snippet title()}🚪 수업 입장{/snippet}
      <div class="qrbox"><QR text={joinUrl} size={220} /><b class="qcode">{spaced(code)}</b>
        <p>휴대폰 카메라로 QR → 로그인한 폰은 바로 대기실 · 처음이면 반 · 번호로 로그인 뒤 들어와요<br />QR 이 안 되면 캠프 「🚪 코드」에 위 6자리</p>
        <p class="tvu">🖥 교실 TV 주소 · <b>{site}?role=hall</b></p></div>
    </Sheet>
  {:else if sheet === 'ask'}
    <div class="askbg" role="presentation" onclick={() => (sheet = '')}></div>
    <div class="ask" role="alertdialog" aria-modal="true" aria-label="정말?">
      <b>정말 수업을 닫을까요?</b><p>{isLobby(R) ? '학생들은 캠프로 돌아가요' : isEnd(L, R) ? '오늘 차시를 다 했어요 · 학생들은 캠프로' : '지금 자리를 기억해요 · 다음 수업 「이어서」'}</p>
      <div class="row"><button type="button" class="btn2" onclick={() => (sheet = '')}>아니요</button><button type="button" class="btn" onclick={() => { endClass(S, L, code); sheet = ''; onclose(); }}>수업 닫기</button></div>
    </div>
  {/if}
{:else}
  <div class="empty"><b>🚪</b><span>수업 방을 찾지 못했어요</span><button type="button" class="chipbtn" onclick={onclose}>수업 열기로</button></div>
{/if}

<style>
  .join { flex: none; display: flex; align-items: center; gap: var(--s3); min-height: 52px; padding: 0 var(--s3); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface); color: var(--text); font: inherit; box-shadow: 0 3px 0 var(--press-sh); }
  .join span { font-size: 13px; font-weight: 700; color: var(--text-2); } .join b { flex: 1; text-align: left; font-size: 24px; letter-spacing: 2px; color: var(--accent); font-variant-numeric: tabular-nums; } .join em { font-style: normal; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .qrbox { display: flex; flex-direction: column; align-items: center; gap: var(--s2); text-align: center; }
  .qcode { font-size: 34px; letter-spacing: 4px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .qrbox p { margin: 0; font-size: 14px; color: var(--text-2); line-height: 1.5; } .qrbox .tvu { font-size: 13px; word-break: break-all; } .qrbox .tvu b { color: var(--text); }
  .cnt { font-size: 20px; }
  .cnt small { font-size: 13px; color: var(--text-2); }
  .nums { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 6px; }
  .n { position: relative; height: 36px; border-radius: 9px; border: 1px dashed var(--line); background: none; color: var(--text-3); font: 700 14px var(--font); padding: 0; }
  .n.in { border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); opacity: 1; }
  .n.old { border: 1px solid #f0a24a; background: #3a2a12; color: #ffd7a0; opacity: 1; }
  .n.ab { border: 1px solid var(--line); background: var(--surface-2); color: var(--text-3); text-decoration: line-through; }
  .n i { position: absolute; top: -6px; right: -6px; font-style: normal; font-size: 11px; text-decoration: none; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: var(--text-2); }
  .legend span { display: flex; align-items: center; gap: 5px; }
  .lg { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
  .lg.in { border: 1px solid var(--accent); background: var(--surface-2); }
  .lg.old { border: 1px solid #f0a24a; background: #3a2a12; }
  .lg.no { border: 1px dashed var(--line); }
  .wide { width: 100%; height: 40px; border-radius: var(--r); border: 1px solid var(--line); background: none; color: var(--text); font: 700 13px var(--font); }
  .wide:disabled { color: var(--text-3); }
  .bub { display: flex; align-items: center; gap: var(--s2); height: 48px; flex: none; padding: 0 var(--s3); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .bub b { flex: 1; min-width: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bub em { font-style: normal; font-size: 12.5px; color: var(--text-2); flex: none; }
  .endt { font-size: 13px; } .endt b { color: var(--accent); } .endt small { color: var(--text-2); }
  .fbar { display: flex; gap: 2px; height: 10px; border-radius: 5px; overflow: hidden; }
  .fbar i { display: block; }
  .tl2 { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .tl2 li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 24px; font-size: 13.5px; }
  .tl2 li > i { width: 10px; height: 10px; border-radius: 3px; }
  .tl2 em { font-style: normal; font-size: 12px; color: var(--text-2); }
  .setrow { display: flex; gap: 6px; flex-wrap: wrap; }
  .fsum { border: 0; background: none; padding: 0; text-align: left; font: 500 12.5px var(--font); color: var(--text-2); min-height: 32px; }
  .fsum b { color: var(--text); }
  .rflow { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: 5px; }
  .rfbar { display: flex; gap: 2px; height: 12px; }
  .rfbar i { display: block; border-radius: 3px; background: var(--surface-2); border: 1px solid var(--line); }
  .rfbar i.ok { background: #2d5c45; border-color: #2d5c45; }
  .rfbar i.now { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 2px rgba(245, 184, 74, 0.3); }
  .rfcap { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s2); font-size: 12.5px; color: var(--text-2); white-space: nowrap; }
  .rfcap b { color: var(--text); font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; }
  .pace { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 6px 12px; border-radius: var(--r); background: var(--surface); border: 1px solid var(--line); font-size: 13px; color: var(--text-2); }
  .pace b { color: var(--text); font-size: 15px; }
  .pace .late { color: #f0a24a; font-weight: 700; }
  .rstat { gap: 6px; }
  .rs1 { display: flex; align-items: center; justify-content: space-between; gap: 6px; height: 26px; overflow: hidden; }
  .rs1 .lab { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .acc { color: var(--accent); }
  .badge { flex: none; white-space: nowrap; font-size: 12.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
  .badge.sc { background: #1d2a3d; color: #9fc8ff; }
  .badge.boss { background: #3a1717; color: #ffb4ae; }
  .badge.fo { background: var(--surface-2); color: var(--text); }
  .rs2 { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s2); }
  .big2 { display: flex; align-items: baseline; gap: 6px; }
  .big2 b { font-size: 40px; line-height: 1; }
  .big2 span { font-size: 15px; color: var(--text-2); }
  .unsub { font-size: 13px; color: var(--text-2); text-align: right; }
  .unsub b { color: var(--text); }
  .adj { display: grid; grid-template-columns: 56px minmax(0, 1fr) 56px; gap: 8px; align-items: center; height: 48px; }
  .adj button { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .adj button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .adj button:disabled { opacity: 0.35; box-shadow: none; }
  .hpl { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .hpl .b { height: 10px; border-radius: 5px; background: var(--surface-2); overflow: hidden; }
  .hpl .b i { display: block; height: 10px; border-radius: 5px; background: var(--hp); transition: width 0.3s ease-out; }
  .hpl .b.sc i { background: #6aa3ff; }
  .hpl small { font-size: 12px; color: var(--text-2); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hpl b { color: var(--text); }
  .alerts { display: flex; flex-direction: column; gap: 6px; height: 74px; flex: none; }
  .al { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; height: 34px; overflow: hidden; }
  .alh { font-size: 12.5px; font-weight: 700; min-width: 64px; white-space: nowrap; flex: none; }
  .al button { flex: none; height: 34px; padding: 0 10px; border-radius: 17px; font: 700 13px var(--font); border: 1px solid; }
  .al.stuck .alh { color: #ffb4ae; } .al.stuck button { background: #3a1717; border-color: var(--bad); color: #ffd9d6; }
  .al.old .alh { color: #ffd7a0; } .al.old button { background: #3a2a12; border-color: #f0a24a; color: #ffd7a0; }
  .more { font-size: 12.5px; color: var(--text-2); flex: none; }
  .rdock { flex: none; padding: var(--s2) var(--s4) 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .rdock button { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; box-shadow: 0 3px 0 var(--press-sh); }
  .rdock button b { font-size: 16px; }
  .rdock button.on { border: 2px solid var(--accent); background: var(--surface-2); }
  .rdock button:disabled { opacity: 0.4; box-shadow: none; }
  .rdock button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .rdock .glow { border: 2px solid var(--accent); background: var(--surface-2); box-shadow: 0 0 0 3px rgba(245, 184, 74, 0.25); }
  @media (prefers-reduced-motion: no-preference) { .rdock .glow { animation: glow 1.6s ease-in-out infinite; } }
  @keyframes glow { 50% { box-shadow: 0 0 0 6px rgba(245, 184, 74, 0.35); } }
  .games { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .game { height: 84px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .game i { font-style: normal; font-size: 26px; line-height: 1.1; } .game small { font-size: 11px; color: var(--text-3); }
  .game.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh); } .game.on small { color: var(--on-accent); }
  .game:disabled:not(.on) { opacity: 0.4; box-shadow: none; }
  .oxw { height: 84px; display: flex; flex-direction: column; gap: 6px; }
  .oxw button { flex: 1; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); }
  .oxw button.on { border: 2px solid var(--accent); background: var(--surface-2); color: var(--accent); }
  .rstep { display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; gap: var(--s2); }
  .rstep button { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 24px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rstep b { text-align: center; font-size: 24px; display: flex; flex-direction: column; } .rstep b small { font-size: 12px; color: var(--text-2); font-weight: 500; }
  .tdc { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tdc button { height: 84px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 0 var(--press-sh); }
  .tdc button small { font-size: 11.5px; color: var(--text-2); font-weight: 500; } .tdc button:disabled { opacity: 0.45; box-shadow: none; }
  .rsact { padding-bottom: 59px; } /* 주요 단추 68 · 바닥 75 (리모컨 주요 단추와 같은 자리) */
  :global(.sheet .act .btn.rbig) { min-height: 68px; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qk { display: flex; flex-direction: column; gap: var(--s2); }
  .qk button { min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); text-align: left; padding: 0 var(--s3); }
  .qk button.on { border: 2px solid var(--accent); }
  .own { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-2); }
  .own small { float: right; }
  .own input { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 16px var(--font); padding: 0 var(--s3); }
  .stp { display: grid; grid-template-columns: 1fr 52px 80px 52px; align-items: center; gap: var(--s2); }
  .stp span { font-weight: 700; } .stp b { text-align: center; font-size: 18px; }
  .stp button { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 20px var(--font); }
  .gamt { display: flex; gap: 6px; align-items: center; }
  .gamt > button { height: 40px; min-width: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .gamt > button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .gpm { margin-left: auto; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  .gpm button { height: 40px; min-width: 40px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 13px var(--font); }
  .gquick { display: flex; flex-wrap: wrap; gap: 6px; }
  .gquick button { height: 36px; padding: 0 10px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 12.5px var(--font); }
  .gquick button:disabled { opacity: 0.4; }
  .ggrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; max-height: 172px; overflow: auto; }
  .gn { height: 38px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .gn.on { background: var(--gem); color: #05121f; border-color: var(--gem); }
  .gn b { font-size: 13px; opacity: 0.7; }
  .gnote { margin: 0; font-size: 12px; color: var(--text-3); }
  :global(.sheet .act .btn.big) { min-height: 68px; font-size: 19px; }
  .askbg { position: absolute; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.6); }
  .ask { position: absolute; left: var(--s4); right: var(--s4); top: 30%; z-index: 41; background: var(--surface); border-radius: var(--r-lg); padding: var(--s4); display: flex; flex-direction: column; gap: var(--s2); }
  .ask b { font-size: 18px; } .ask p { margin: 0; color: var(--text-2); font-size: 14px; }
  .ask .row { display: flex; gap: var(--s2); }
  .ask .btn { flex: 1; height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .ask .btn2 { width: 92px; height: 52px; border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
</style>
