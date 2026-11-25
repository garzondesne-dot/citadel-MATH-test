<script lang="ts">
  import { hintUsed, markHintUsed, nudgeOn } from '../../raid/hintNudge';
  import './nudge.css';
  import { petriPop } from './petriPop.svelte';
  import { setSymPack } from '../battle/symsheet.svelte';
  import { helpOf } from '../../school/help';
  import { feat } from '../../school/features.svelte';
  import HelpSheet from './HelpSheet.svelte';
    import { paperOn, pw } from '../submit.svelte';
  import { isDummy } from '../../raid/raid';
  import SkillCards from './SkillCards.svelte';
  import Hearts from '../battle/Hearts.svelte';
  import { V4 } from '../../raid/raid';
  // ▢ 소레이드 도전 칸 (#152): 쓴 칸 = 빨강 − · 졸개 오답 ½ = 노랑 반 칸
  const chainMarks = (t: number, l: number): Mark[] => { const used = Math.max(0, t - l), full = Math.floor(used + 1e-9); return [...Array.from({ length: full }, () => 'bad' as Mark), ...(used - full > 0.01 ? ['part' as Mark] : [])]; };
  import { untrack } from 'svelte';
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { CHAIN_SLOTS, chainItems, chainRecord, PRAC_MAX, pracUsed, stone, whyStages } from '../../raid/raid';
  import { giveHint, hintLines, hintState } from '../../school/hintGive';
  import { chainSubmit, heartRelease, pracStart } from '../../raid/actions';
  import ChainStage from './ChainStage.svelte';
  import KeyTag from './KeyTag.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import Slots, { type Mark } from '../battle/Slots.svelte';
  import EnergyCard from './EnergyCard.svelte';
  import { heroAtk } from '../battle/fx.svelte';
  import { sfx } from '../sound.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import PhotoSheet, { type PhotoOut } from './PhotoSheet.svelte';
  import PrepImg from './PrepImg.svelte';
  import { chainItems as phItems, codeRubrics, pendState, raidMax, cfgOf, ready as phReady, rubric as phRubric, rubricLesson } from '../../school/photo';
  import { chainPhotoFill, photoScroll, snapEnd, snapStart } from '../../raid/actions';
  import { keepOk } from './multiFb';

  // ⚔ 소레이드 학생 카드 (정식 chainView · ⑤): 지금 단계 하나 · 졸개 오답 −½ · 대장 오답 −1 · 1칸 남으면 🙋 선생님 확인
  //   대장 처치 뒤 = 「🔥 한 판 더 (n/3)」 (저절로 넘어가지 않음 · 나타난 뒤 1.5초 잠금) · 연습 판 = 숫자 바뀜 · 📜 원문 · 💡 근거 빈칸
  //   ✍ 서술형 📸 (정식 #50 · 📜 2026-11-15): 언제나(시작 전 · 졸개 도중 · 대장 뒤 · 한 판 더 중) · 학습지 숫자 그대로 · 통과 = 🌟 진필살기 + 📜 1 + 남은 단계 처치
  const { S, L, R, code, mid, uid, now, locked, title, onhint, cls = '', num = 0, demo = false, photo = true, photoS = null, extWr = null }: { /** 🏰 성채 = 방이 사진을 처리 · 단추만 문제 칸 안에 (#56) */ extWr?: { label: string; sub: string; on: () => void } | null; /** 📷 사진 · 📜 · 기준표 = 이 저장소 (🎯 허수아비 = 이 탭 방이라 서버 저장소를 따로 · #40) */ photoS?: Store | null; S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string; onhint?: () => void; cls?: string; num?: number; /** 🎮 선생님 시연 = 사진 없이 「✔ 테스트: 사진 통과로 보기」 (데미지 · 기록 없음) */ demo?: boolean; /** 📷 수업 레이드만 (정식: 🎯 허수아비 · 📋 게시판 = 사진 없음 · 🏰 성채 = 방 목록에서 따로) */ photo?: boolean } = $props();
  $effect(() => setSymPack(L as { id: string; no?: number; kind?: string })); // 📖 기호 톡 누른 횟수 = 이 차시 칸에
  const rec = $derived(chainRecord(L, R, mid, uid));
  // 💡 친구에게 힌트 주기 (📜 2026-11-17 #23 · 옛 정식 #26 · #52 ②): 근거 줄을 맞힌 학생만 · 줄마다 한 번 · EXP +1 · TV 첫 1명 말풍선 · 풀고 있는 친구 = 「💡 친구 힌트 n개」
  const hs = $derived(hintState(L, R, mid, uid));
  const fh = $derived(hintLines(L, R, mid, uid));
  const fhN = $derived(fh.reduce((a, x) => a + x.by.length, 0));
  const nick = (u: string) => (R.players?.[u] as { nick?: string } | undefined)?.nick || '친구';
  function doHint() { if (hs.next == null) return; const r = giveHint(S, L, R, code, mid, uid, hs.next); toast = r.ok ? '💡 힌트를 줬어요 · 종합실에 떠요 · EXP +1' : r.why; setTimeout(() => (toast = ''), 2400); }
  const v4 = $derived(V4(R)); // ❤ ⚡ 베타 v4 (📜 2026-11-13 밤)
  let pracPass = $state<number | null>(null);
  const prac = $derived(rec.done && pracPass != null);
  const pass = $derived(prac ? (pracPass as number) : 0);
  const pItems = $derived(prac ? chainItems(L, R, mid, uid, pass) : rec.items);
  const stage = $derived(prac ? (rec.pass === pass ? rec.pStage : 0) : rec.stage);
  const says = $derived(prac ? (rec.pass === pass ? rec.pSays : []) : rec.says);
  const needWhy = $derived(prac && rec.pass === pass && rec.pWhy >= 0);
  const wq = $derived(needWhy ? pItems[rec.pWhy] : null);
  const pFail = $derived(prac && rec.pass === pass && rec.pFail);
  const pDone = $derived(prac && stage >= pItems.length && !needWhy);
  const q = $derived(pItems[Math.min(stage, pItems.length - 1)]);
  const key = $derived(`${mid}|${pass}|${stage}|${rec.nextK}`);
  let given = $state<Given>(null);
  let formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; const kept = !prac && rec.lastWrong && rec.lastWrong.s === stage ? keepOk(q, rec.lastWrong.given) : null; given = q ? (kept ?? emptyOf(q)) : null; } }); // ☑ 모두 고르기 = 맞은 보기는 고른 채로
  const ready = $derived(!!q && filled(q, given));
  const lastWrong = $derived(!prac && !!rec.lastWrong && rec.lastWrong.s === stage);
  const used = $derived(pracUsed(R, mid, uid, rec));
  const pLeftN = $derived(Math.max(0, PRAC_MAX - used));
  let armKey = '', armAt = $state(0);
  const pracShown = $derived((!prac && rec.done) || pDone || pFail);
  $effect(() => { const k = `${pass}|${pracShown}`; if (pracShown && k !== armKey) { armKey = k; armAt = untrack(() => now) + 1500; } });
  let toast = $state('');
  const stName = (i: number, n: number) => (paperOn() ? `단계 ${i + 1} / ${n}` : i === n - 1 ? '대장' : `졸개 ${'①②③④⑤⑥'[i]}`);
  let flip = $state<{ i: number; ok: boolean; text: string | null } | null>(null), flipT: ReturnType<typeof setTimeout> | null = null;
  function go() {
    if (!q || !ready || locked || flip) return;
    const l0 = penLine(q, given, 0), sent = l0 ? stripNo(l0) : null;
    const before = stage, err = chainSubmit(S, L, code, mid, uid, stage, pass, finalOf(q, given));
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    const okNow = prac ? r2.pass === pass && r2.pStage > before : r2.stage > before;
    heroAtk({ miss: !okNow, noDmg: prac, win: !prac && r2.done, prac: prac && okNow ? 1 : 0 });
    if (okNow) petriPop(S, code, uid, mid, 1); // 🗿 석화 찬스 (진짜 · 🔥 한 판 더 모두 · 석화 한 번에 3까지) // ⚔ 정식 소레이드 = 단계마다 공격 한 번
    flip = { i: before, ok: okNow, text: sent }; if (flipT) clearTimeout(flipT); flipT = setTimeout(() => (flip = null), 650); // #116 그 칸만 뒤집힘
    toast = okNow ? (before === pItems.length - 1 ? (prac ? '✔ 연습 사슬 완성!' : r2.perfect ? '🌟 퍼펙트 사슬!' : '👑 대장 처치!') : `✔ 졸개 ${'①②③④⑤⑥'[before]} 처치!`)
      : prac ? (r2.pFail ? '✘ 이번 연습 판은 기회를 다 썼어요' : `✘ 틀렸어요 · 연습 칸 ${before === pItems.length - 1 ? '하나' : '반'} 사용`)
      : r2.locked ? '⚔ 칼이 다 떨어졌어요 · 🙋 선생님께 보급받기' : r2.fail ? '기회를 다 썼어요' : `✘ 틀렸어요 · 칼 ${before === rec.n - 1 ? '하나' : '반 칸'} 사용`;
    if (v4 && !dummy && !okNow && !prac && r2.locked) setTimeout(() => sfx('lock', 0.8), 500); // 🔊 2차 ❤ 0 잠김 (정식 student.js 같은 순간 · 💔 하트 쪼개짐 0.5초 뒤)
    if (v4 && !okNow) toast = ''; // 틀렸을 때 = 배너 · 안내 없이 하트 쪼개짐 · 나의 풀이 빨강 줄만 (📜 2026-11-13 밤)
  }
  function why(i: number) {
    const err = chainSubmit(S, L, code, mid, uid, rec.pWhy, pass, i, 1);
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    toast = r2.pWhy < 0 ? '💡 근거 완성!' : '다시 골라 봐요 — 벌은 없어요';
  }
  function again() { const p = pracStart(S, L, code, mid, uid); if (p) { pracPass = p; toast = ''; } }
  const hearts = $derived(prac && !pDone && !pFail ? { total: CHAIN_SLOTS, left: rec.pass === pass ? rec.pLeft : CHAIN_SLOTS } : { total: rec.slots, left: rec.left });
  // 🎯 허수아비 방 = ❤ · ⚡ 없음 · 문제 위 꼬리표 「📄 학습지 숫자」/「🔁 바뀐 숫자」(수업 기록 기준)
  const dummy = $derived(isDummy(R));
  const numTag = $derived(dummy ? (R.meta.fresh?.[mid] ? '🔁 바뀐 숫자' : '📄 학습지 숫자') : '');
  // ── ✍ 서술형 📸 ──
  const PS = untrack(() => photoS ?? S); // 📷 사진 저장소 (#40)
  const rl = $derived(rubricLesson(PS, L));
  const srv = untrack(() => (PS as { kind?: string }).kind === 'server');
  const trialPh = $derived(demo || !srv); // 서버 없는 이 기기 체험 · 시연 = 사진 안 받음
  const canPhoto = $derived(!photo || (!cls && !demo && srv) ? false /* 🎯 허수아비 · 📋 게시판 · 🏰 성채 전투 = 사진 없음 */ : trialPh ? !!(phRubric(PS, rl, mid) ?? codeRubrics()[rl]?.[mid]) : phReady(PS, rl, mid)); // 🐞 #52 켜짐 · 기준표 = 서버 저장소(PS) — 🎯 허수아비 방(S)은 이 탭 메모리라 설정이 없어 단추가 안 보였음
  const myP = $derived((R.players?.[uid] || {}) as { ph?: Record<string, number>; wr?: Record<string, string>; pp?: Record<string, string | number> });
  const phN = $derived(Number(myP.ph?.[mid]) || 0), wrOk = $derived(myP.wr?.[mid]), phMax = $derived(raidMax(cfgOf(PS))); // #52 설정 = 서버
  const pendId = $derived(myP.pp?.[mid]);
  // 📷 사진 문제 숫자 = 늘 학습지 숫자 (🎯 허수아비 = 바뀐 숫자 판이라 fresh 를 뺀 판으로 · 📜 11/13 「서술형은 늘 학습지 숫자」 · #40)
  const phRec = $derived(isDummy(R) && R.meta.fresh?.[mid] ? chainRecord(L, { ...R, meta: { ...R.meta, fresh: {} } } as Room, mid, uid) : rec);
  const pendPh = $derived(!!pendId && wrOk !== 'ok' && cls ? pendState(PS, cls, num, rl, mid, String(pendId)) : null);
  let wm = $state<{ peek: boolean } | null>(null), shot = $state(false), peekAsk = $state(false);
  $effect(() => { if (pendPh === 'ok' && wrOk !== 'ok') untrack(() => { const out = snapEnd(S, L, code, uid, mid, { status: 'pass' }); if (out) { photoScroll(PS, uid, rl, mid); if (!rec.done) chainPhotoFill(S, L, code, uid, mid); toast = '✔ 선생님이 서술형을 인정했어요 — 🌟'; } }); }); // ⏳ 선생님 ✔ 처치 인정 → 통과와 같은 길
  function snapOpen() { if (!wm || phN >= phMax) return; if (!trialPh) snapStart(S, code, uid, mid); sfx('block', 0.5); shot = true; }
  function snapDone(res: PhotoOut | null) {
    shot = false; const peek = !!wm?.peek;
    if (trialPh && demo) { if (res?.status === 'pass') { wm = null; toast = '🌟 서술형 통과! (시연 · 데미지 · 기록 없음)'; } return; }
    const out = snapEnd(S, L, code, uid, mid, res, peek);
    if (!peek && out) photoScroll(PS, uid, rl, mid);
    const missOf = (r: PhotoOut | null) => Object.values(r?.steps || {}).map((x, i) => (x && !x.earned ? (i === rec.n - 1 ? '👑' : '①②③④⑤⑥'[i]) : null)).filter(Boolean);
    if (res?.status === 'pass') {
      const nFill = !peek && !rec.done ? chainPhotoFill(S, L, code, uid, mid) : 0;
      wm = null;
      toast = peek ? '✍ 연습 쓰기 통과! (진필살기 없음)' : out === 'true' ? '🌟 진필살기 발동! 몬스터가 돌로 굳어요' : '🌟 서술형 통과!';
      const more = [nFill ? `✍ 남은 ${nFill}단계 모두 처치!` : '', missOf(res).length ? `✏ ${missOf(res).join(' · ')} 단계는 학습지에 다시 정리해 둬요` : ''].filter(Boolean).join(' · ');
      if (more) setTimeout(() => (toast = more), 3500);
    } else if (res?.steps && missOf(res).length) toast = `✏ 빠진 단계: ${missOf(res).join(' · ')} — 그 졸개만 다시 고쳐 써요`;
  }
  // 💡 도움 3단 (📜 2026-11-15 · school/help.ts): 그 문항에 help 가 있으면 💡 = 도움 3단 시트 · 없으면 예전 힌트(개념)
  let helpOpen = $state(false);
  const helpNow = $derived(!feat('help3') ? null : helpOf(L, mid, stage, q ?? null));
  let hUsed = $state(hintUsed()); // 💡 말풍선 (📜 11/25) = 같은 단계 2번 틀림 · 써 본 기기는 안 띄움
  const nudge = $derived(!prac && !rec.done && nudgeOn(rec.wrongN?.[stage] ?? 0, hUsed));
  const useHint = () => { if (!hUsed) { markHintUsed(); hUsed = true; } };
  // 🤝 손 놓은 학생 (📜 2026-11-16 · 🌊 ①): 학생 폰 「첫 줄만 같이 볼까?」 → 도움 2단(없으면 1단) · 도움이 없으면 예전 💡 힌트
  let helpStart = $state(1);
  $effect(() => { const on = () => { if (helpNow) { helpStart = 2; helpOpen = true; } else onhint?.(); }; window.addEventListener('citadel-idlehelp', on); return () => window.removeEventListener('citadel-idlehelp', on); });
  const handUp = $derived(((R.players?.[uid] as { hand?: { mid?: string } | null } | undefined)?.hand?.mid) === mid);
</script>

{#if wm}
  <div class="bcard wr-card" data-k="write-mode">
    <span class="lab acc">✍ {title} · {wm.peek ? '✍ 연습 쓰기 (진필살기 없음)' : '게임 풀이를 보지 말고 처음부터 · 학습지 숫자 그대로'}</span>
    <PrepImg {S} {L} id={mid} alt="학습지 문제"><p class="wq">{phRubric(PS, rl, mid)?.ask || title}</p></PrepImg>
    {#if wm.peek}<div class="story"><b>📜 나의 풀이</b><ol>{#each rec.says as t2, k (k)}<li>{t2}</li>{/each}</ol></div>{/if}
    {#if pendPh === 'wait'}<p class="muted">⏳ 서술형 사진은 <b>선생님이 직접 확인</b>하고 있어요 (AI 가 확신하지 못함) · 더 또렷하게 다시 찍어도 돼요</p>{/if}
    <p class="hand">✍ 학습지 서술형 칸에 <b>직접 손으로 쓴 풀이</b>만 찍어요 · 화면 · 인쇄 글은 통과 안 돼요</p>
    <p class="muted">종이에 풀이를 처음부터 끝까지 쓰고 📸 찍어요 (이 소레이드 {Math.max(0, phMax - phN)}장 남음)</p>
  </div>
{:else if needWhy && wq?.why}
  <div class="bcard">
    <span class="lab acc">💡 근거 한 줄 · 틀려도 괜찮아요</span>
    <p class="wq">{wq.why.pre} <b class="bl">____</b>{wq.why.post}</p>
    <div class="opts">{#each wq.why.choices as c, i (i)}<button type="button" class="opt" onclick={() => why(i)}>{c}</button>{/each}</div>
  </div>
{:else if rec.fail}
  <div class="bcard"><span class="lab acc">기회를 다 썼어요 · 벌은 없어요</span><p class="muted">아래 풀이를 학습지에 옮겨 적고 복습에서 다시 도전해요.</p>
    <div class="story"><b>📜 나의 풀이</b><ol>{#each rec.items as x, k (k)}<li>{x.say}</li>{/each}</ol></div></div>
{:else if (!prac && rec.done) || pDone || pFail}
  <div class="bcard">
    <div class="okline"><span class="ic" aria-label="맞음">{pFail ? '✘' : '✔'}</span><span><b>{pFail ? '이번 연습 판은 기회를 다 썼어요' : pDone ? '연습 사슬 완성!' : rec.perfect ? '퍼펙트 사슬!' : '대장 처치!'}</b><span>{prac ? '데미지 없음 · 수업 기록 그대로' : `데미지 ${rec.best}`}</span></span></div>
    <div class="story"><b>📜 나의 풀이</b><ol>{#each pFail ? pItems.map((x) => x.say || '') : says as t, k (k)}<li>{t}</li>{/each}</ol></div>
    {#if hs.next != null}<button type="button" class="hgive" data-k="hint-give" onclick={doHint}>💡 힌트 주기{hs.lines > 1 ? ` (근거 줄 ${whyStages(rec.items).indexOf(hs.next) + 1})` : ''}<small>근거 한 줄이 종합실에 떠요 · 줄마다 한 번 · EXP +1</small></button>{:else if hs.gave}<p class="hgave" data-k="hint-gave">💡 친구에게 힌트를 줬어요</p>{/if}
    {#if !v4}<p class="muted">숫자만 바뀐 새 문제 · 판마다 도전 칸 4개 · 데미지 0</p>{/if}
  </div>
  {#if canPhoto && !pFail}<div class="wrrow">{@render wrBtn()}</div>{/if}
  {#if v4}{#if !dummy}<SkillCards {S} {L} {R} {code} {mid} {uid} {now} onround={again} />{/if}{:else if !prac && rec.done}<div class="bcard"><EnergyCard {S} {L} {R} {code} {mid} {uid} {now} /></div>{/if}
{:else if rec.locked && !prac}
  <ChainStage items={pItems} stage={pItems.length} {says} {title} value={null} onchange={() => {}} />
{:else}
  {#if fhN && !rec.done}<details class="fhints" data-k="friend-hints"><summary>💡 친구 힌트 {fhN}개 <small>(누르면 펼침)</small></summary>{#each fh as x (x.s)}<p class="fht">{x.text}</p><p class="fhb">{x.by.slice(0, 5).map(nick).join(' · ')}{x.by.length > 5 ? ` 외 ${x.by.length - 5}` : ''}</p>{/each}</details>{/if}
  {#if numTag && !prac}<p class="tagl"><span class="tag">{numTag}</span></p>{/if}
  {#if !prac}<KeyTag {L} {R} {uid} at={mid} n={stage + 1} />{/if}<!-- 🔑 #59 -->
  {#if v4 && prac}<p class="tagl"><span class="tag">🔁 숫자 바뀜</span><button type="button" class="stop" onclick={() => (pracPass = null)}>그만하기</button></p>{/if}
  <ChainStage items={pItems} {stage} {says} {title} value={given} {lastWrong} {prac} {flip} disabled={locked} onchange={(v) => (given = v)} {v4} prev={rec.lastWrong?.given} prevAt={rec.nextK} hintKey={`${code}|${mid}|s${stage}`} wrongText={lastWrong && rec.lastWrong && q ? (() => { const l = penLine(q, rec.lastWrong.given, 0); return l ? stripNo(l) : null; })() : null} />
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}
{#if wm}
  <BottomAction battle disabled={phN >= phMax} why={phN >= phMax ? '📸 이 소레이드 사진을 다 썼어요' : ''} onmain={snapOpen} mainLabel="찍어서 채점">
    {#snippet left()}{#if !wm?.peek}<button type="button" class="side wx" data-k="wr-peek" onclick={() => (peekAsk = true)}><i>📜</i>풀이 보기</button>{/if}{/snippet}
    {#snippet right()}<button type="button" class="side wx" data-k="wr-x" onclick={() => (wm = null)}><i>✕</i>그만 쓰기</button>{/snippet}
    {#snippet main()}<span>📸 찍어서 채점</span>{/snippet}
  </BottomAction>
{:else if needWhy}
  <span></span>
{:else if pracShown && v4}
  <span></span>
{:else if pracShown}
  <BottomAction battle disabled={pLeftN <= 0 || armAt > now} why={pLeftN > 0 ? '' : `🔥 연습 ${PRAC_MAX}번 끝!`} onmain={again} mainLabel="한 판 더">
    {#snippet main()}<span>🔥 한 판 더 {pLeftN}/{PRAC_MAX}</span>{/snippet}
  </BottomAction>
{:else if rec.fail}
  <span></span>
{:else if rec.locked && !prac}
  {#if v4 && R.meta.profile === 'test'}<button type="button" class="tbtn" data-k="test-supply" onclick={() => heartRelease(S, code, mid, uid)}>✔ 테스트: 선생님 보급</button>{/if}<!-- 🧪 테스트 모드 = 선생님 「⚔ 보급」을 스스로 (📜 2026-11-15 칼) -->
  <BottomAction battle disabled why={v4 ? '⚔ 칼이 다 떨어졌어요 · 🙋 학습지에 풀이를 정리하면 선생님이 「⚔ 보급」으로 칼 하나를 줘요' : '⚔ 칼이 다 떨어졌어요 · 🙋 학습지에 풀이를 정리해 두면 선생님이 와서 보급해 줘요'}>
    {#snippet right()}{#if extWr}{@render extBtn()}{:else if canPhoto}{@render wrBtn()}{/if}{/snippet}
    {#snippet main()}<span>🙋 선생님께 보급받기</span>{#if v4}{#if !dummy}<Hearts total={rec.slots} left={rec.left} memo={`${code}|${mid}|${uid}`} />{/if}{/if}{/snippet}
  </BottomAction>
{:else}
  <BottomAction battle disabled={!ready || locked || !!flip} why={!ready && !locked ? '답을 고르면 공격할 수 있어요' : ''} onmain={go} mainLabel="{stName(stage, pItems.length)} 공격 (도전 기회 {hearts.left}번)">
    {#snippet left()}{#if v4 && (onhint || helpNow)}<button type="button" class="side hint" class:nudge aria-label="힌트" data-k="hint" onclick={() => { useHint(); if (helpNow) helpOpen = true; else onhint?.(); }}>{#if nudge}<span class="nudgebub" data-k="hint-nudge">막히면 눌러 봐</span>{/if}<i>💡</i>{helpNow ? '도움' : '힌트'}</button>{/if}{/snippet}
    {#snippet right()}{#if extWr}{@render extBtn()}{:else if canPhoto}{@render wrBtn()}{:else if v4}<button type="button" class="side wr" disabled aria-label="서술형 (이 문제는 사진 채점 준비 중)">✍ 서술형<small>준비 중</small></button>{/if}{/snippet}
    {#snippet main()}<span>{pw(`${stName(stage, pItems.length)} ${prac ? (v4 ? '한 번 더 ' : '연습 ') : ''}공격`)}</span>{#if v4 && prac}{#if !dummy}<Hearts mode="energy" left={rec.tokLeft} lock />{/if}{:else if v4}{#if !dummy}<Hearts total={rec.slots} left={rec.left} memo={`${code}|${mid}|${uid}`} />{/if}{:else}<Slots total={hearts.total} marks={chainMarks(hearts.total, hearts.left)} />{/if}{/snippet}
  </BottomAction>
{/if}

{#snippet extBtn()}<button type="button" class="side wr" data-k="castle-wr" onclick={() => extWr?.on()}>{extWr?.label}<small>{extWr?.sub}</small></button>{/snippet}
{#snippet wrBtn()}{#if wrOk === 'ok'}<button type="button" class="side wr" disabled data-k="wr-btn">🌟 통과<small>서술형</small></button>{:else if phN >= phMax}<button type="button" class="side wr" disabled data-k="wr-btn">📸 다 씀<small>{phN}/{phMax}</small></button>{:else}<button type="button" class="side wr" data-k="wr-btn" onclick={() => (wm = { peek: false })}>✍ 서술형<small>📄 학습지 숫자</small></button>{/if}{/snippet}
{#if peekAsk}
  <Sheet onclose={() => (peekAsk = false)} mainText="📜 볼게요" onmain={() => { peekAsk = false; if (wm) wm.peek = true; }}>
    {#snippet title()}📜 풀이 다시 보기{/snippet}
    <p class="muted">풀이를 보면 이번 도전은 「✍ 연습 쓰기」가 돼요 (진필살기 없음). 볼까요?</p>
  </Sheet>
{/if}
{#if shot && wm}
  <PhotoSheet S={PS} {cls} {num} lesson={rl} room={mid} {title} items={phItems(phRubric(PS, rl, mid), title, phRec.items, phRec.says)} trial={trialPh} onclose={snapDone} />
{/if}

{#if helpOpen && helpNow}<HelpSheet {S} {code} {uid} {mid} i={stage} help={helpNow} hand={handUp} start={helpStart} onclose={() => { helpOpen = false; helpStart = 1; }} />{/if}

<style>
  .hgive { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; min-height: 52px; margin-top: 8px; border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface-2); color: var(--text); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .hgive small { font-size: 12px; font-weight: 500; color: var(--text-2); }
  .hgave { margin: 8px 0 0; text-align: center; font-size: 13px; color: var(--text-2); }
  .fhints { margin: 0 0 6px; padding: 6px 10px; border-radius: var(--r-sm); background: var(--surface-2); font-size: 14px; } .fhints summary { font-weight: 800; cursor: pointer; } .fhints small { color: var(--text-3); font-weight: 500; } .fht { margin: 6px 0 0; } .fhb { margin: 0; font-size: 12px; color: var(--text-3); }
  .tbtn { display: block; width: 100%; min-height: var(--tap); margin-top: var(--s2); border-radius: var(--r); border: 2px dashed var(--accent); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); }
  .wr-card .hand { margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 15px; line-height: 1.5; }
  .wrrow { display: flex; justify-content: flex-end; }
  .wrrow :global(.side.wr) { min-width: 120px; min-height: var(--tap); padding: 4px 12px; border-radius: 14px; border: 2px solid var(--scroll); background: rgba(199, 155, 255, 0.14); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); }
  .wrrow :global(.side.wr small) { font-size: 11px; font-weight: 500; color: var(--scroll); }
  .wrrow :global(.side.wr:disabled) { opacity: 0.5; box-shadow: none; }
  :global(.line .side.wx) { width: 84px; font-size: 13px; } :global(.line .side.wx i) { font-style: normal; font-size: 18px; line-height: 1.1; }
  .wr-card .muted { margin: 0; color: var(--text-2); font-size: 14px; }
  .tagl { margin: 0; display: flex; align-items: center; gap: var(--s2); }
  .tag { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 13px; background: var(--surface-2); border: 1px solid var(--line, #2f3440); color: var(--text-2); font: 700 13px var(--font); }
  .stop { margin-left: 6px; padding: 0; border: 0; background: none; color: var(--text-2); font: 700 14px var(--font); text-decoration: underline; min-height: 32px; }
  .wq { margin: 0; font-size: 17px; font-weight: 700; overflow-wrap: anywhere; }
  .bl { color: var(--accent); }
  .opts { display: flex; flex-direction: column; gap: var(--s2); }
  .opt { min-height: var(--tap); text-align: left; padding: var(--s2) var(--s3); border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); overflow-wrap: anywhere; }
  .opt:active { transform: translateY(2px); box-shadow: none; }
</style>
