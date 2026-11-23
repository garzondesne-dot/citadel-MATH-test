<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { CLASSES, isBeta, roster, uidOf } from '../../school/school';
  import { inbox, type InboxItem } from '../../school/inbox';
  import { allUids, classUids, GEMS, QUICK, sendMail } from '../../school/mail';
  import { hhmm } from '../../school/bells';
  import { doneCount, keepNo, pickNo, setOpen, stateOf } from '../../school/survey';
  import { NO12, svLabel } from '../../school/survey12';
  import { feat } from '../../school/features.svelte';
  import { allRows, photoNeeds, roomTitle, type PhotoRow } from '../../school/photo';
  import { liveValue } from '../room.svelte';
  import PhotoCheck from './PhotoCheck.svelte';
  import QuestCheck from './QuestCheck.svelte';
  import { questNeeds, questRows, GRADE_IC, type QRow } from '../../school/quest';
  import Sheet from '../battle/Sheet.svelte';
  import NoteSet from './NoteSet.svelte';
  import ChangeList from './ChangeList.svelte';
  import TFeedback from './TFeedback.svelte';
  import { notePerm, notePref } from '../../school/notify.svelte';
  import { chanOf, upTo } from '../../school/changes';
  import { BUILD, BUILD_ID } from '../../build';

  // 🔔 소식 탭 (#124 ⑱ · 스크롤 A) — 위 고정 = [받은 것 n · 보내기]
  //   받은 것 = 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과를 한 목록(새 것 위 · 안 본 것 = 왼쪽 빨간 줄 + 점 · 종류 칩 거르기 · 누르면 그 자리에서 처리)
  //   💬 학생 메시지 = 누르면 그 자리에서 펼침(금빛 테 · 접기 ⌃): 번호 · 이름 · 반 · 시각 · 원문 말풍선 → 빠른 답 칩 4 → [답장 쓰기 | 💎 | 보내기] (#130)
//   보내기 = 📮 메시지(받는 사람 [반 전체 | 학생 고르기] · 💎 같이 · #130) · 🎁 친구 선물 켜기(반마다) · 📝 설문(차시 ▾ · 모든 반 열기 · 닫기)
  const { S, packs, onread }: { S: Store; packs: LessonPack[]; onread: () => void } = $props();
  let seg = $state<'in' | 'box' | 'out'>('in');
  let side = $state<'' | 'note' | 'changes' | 'fbk'>(''); // 🔔 알림 · 📜 바뀐 것 = 소식 탭 위 작은 단추 둘 (📜 2026-11-17 #21 A · 옛 「나」 탭)
  let kind = $state<'' | InboxItem['kind']>('');
  let ver = $state(0), open = $state(''), toast = $state('');
  // 📷 사진 승인 (📜 2026-11-15 머리 🔨): ⏳ 확인 필요 · 🙋 이의 신청 = 「📷 사진」 칩 한 줄씩 · 빨간 점(✔ ✖ 하기 전까지) · 누르면 그 자리에서 ✔ 처치 인정 / ✖ 그대로 → 목록에서 빠짐
  const lvp = untrack(() => liveValue(S, 'photo')); onDestroy(lvp.stop);
  type Item = InboxItem & { ph?: PhotoRow; qx?: QRow };
  // ✏ #75 출제 안건 (🔵 🟣 = AI 판단 뒤 선생님 확인) = 「✏ 출제」 칩 · 빨간 점(✅ ✏ 하기 전까지) · 처리한 것 = 보관함(최근 30)
  const lvq = untrack(() => liveValue(S, 'quest')); onDestroy(lvq.stop);
  const qItems = $derived.by((): Item[] => { void lvq.v.val; void ver; return questNeeds(S).map((x) => ({ id: `q_${x.c}_${x.n}_${x.id}`, kind: 'quiz', title: `✏ 출제 안건 · ${qWho(x)} · ${GRADE_IC[x.grade]}`, sub: `${x.c === 'me' ? '🧪' : `${x.c}반`} · 바탕 ${x.base?.room ?? ''} · ${hhmm(Number(x.at) || 0)}`, at: Number(x.at) || 0, read: false, qx: x })); });
  const qDoneItems = $derived.by((): Item[] => { void lvq.v.val; void ver; return questRows(S).filter((x) => x.status === 'ok' || x.status === 'fix').slice(0, 30).map((x) => ({ id: `qd_${x.c}_${x.n}_${x.id}`, kind: 'quiz', title: `✏ ${qWho(x)} · ${GRADE_IC[x.grade]}`, sub: `${x.c === 'me' ? '🧪' : `${x.c}반`} · ${x.status === 'ok' ? '✅ 출제 승인' : '✏ 고쳐 주세요'}`, at: Number(x.at) || 0, read: true })); });
  const qWho = (x: QRow) => (x.c === 'me' || !x.n ? '🧪 테스트' : `${x.n}번 ${nameOf(x.c, x.n)}`);
  function qDone(ok: boolean, saved: boolean) { say(saved ? (ok ? '✅ 출제 승인 · 학생 폰이 열면 보상' : '✏ 고쳐 달라고 보냈어요') : '저장하지 못했어요 — 교사 로그인을 확인해 주세요'); open = ''; ver++; onread(); }
  const phItems = $derived.by((): Item[] => { void lvp.v.val; void ver; return S.kind !== 'server' ? [] : photoNeeds(S).map((x) => ({ id: `ph_${x.c}_${x.n}_${x.k}_${x.id}`, kind: 'photo', title: `${x.n}번 ${nameOf(x.c, Number(x.n))} · ${roomTitle(S, x.k)}`, sub: `${x.c}반 · ${x.appeal ? '🙋 이의 신청' : '⏳ 확인 필요'} · ${x.score ?? '-'} / ${x.total ?? '-'} · ${hhmm(Number(x.at) || 0)}`, at: Number(x.at) || 0, read: false, ph: x })); });
  const items = $derived.by((): Item[] => { void ver; return [...phItems, ...qItems, ...inbox(S)].sort((a, b) => b.at - a.at); });
  function phDone(ok: boolean, saved: boolean) { say(saved ? (ok ? '✔ 처치로 인정했어요' : '✖ 그대로 두었어요') : '저장하지 못했어요 — 교사 로그인을 확인해 주세요'); open = ''; ver++; onread(); }
  // 🗂 보관함 (📜 2026-11-15 머리 🔨): 읽은 소식 = 보관함 · 이번에 열 때 안 읽었던 줄은 이 화면을 떠날 때까지 「받은 것」에 그대로 · 읽음 = 서버(school/inbox/{id}/read)
  //   📷 처리한 사진(✔ ✖) = 보관함에 보기만 (최근 30)
  const unread0 = untrack(() => new Set(inbox(S).filter((x) => !x.read).map((x) => x.id)));
  const inList = $derived(items.filter((x) => x.ph || x.qx || !x.read || unread0.has(x.id)));
  const phDoneItems = $derived.by((): Item[] => { void lvp.v.val; void ver; return S.kind !== 'server' ? [] : allRows(S).filter((x) => x.ok != null).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)).slice(0, 30).map((x) => ({ id: `phd_${x.c}_${x.n}_${x.k}_${x.id}`, kind: 'photo', title: `${x.n}번 ${nameOf(x.c, Number(x.n))} · ${roomTitle(S, x.k)}`, sub: `${x.c}반 · ${x.ok ? '✔ 처치 인정' : '✖ 그대로'}`, at: Number(x.at) || 0, read: true, ph: x })); });
  const boxList = $derived([...items.filter((x) => !x.ph && !x.qx && x.read && !unread0.has(x.id)), ...phDoneItems, ...qDoneItems].sort((a, b) => b.at - a.at));
  const shown = $derived((seg === 'box' ? boxList : inList).filter((x) => !kind || x.kind === kind));
  const unread = $derived(items.filter((x) => !x.read).length);
  const IC: Record<InboxItem['kind'], string> = { idea: '💬', photo: '📷', quiz: '✏', survey: '📝', news: '📢' };
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  function tap(x: Item) { open = open === x.id ? '' : x.id; if (x.ph || x.qx) return; if (!x.read) { S.set(`school/inbox/${x.id}/read`, true); ver++; onread(); } }
  function done(x: InboxItem, msg: string) { S.set(`school/inbox/${x.id}/done`, msg); ver++; say(msg); open = ''; }
  // 💬 답장 (#130 ①) — 학생 우편함 「선생님 답장」(+💎) · 그 메시지 「↩ 답함」 · 빨간 점 빠짐
  const nameOf = (c: string, n: number) => roster(c, S).find((p) => p.num === n)?.name ?? `${n}번`;
  let rtext = $state(''), rg = $state(0), rgem = $state(false);
  function tapMsg(x: InboxItem) { rtext = ''; rg = 0; rgem = false; tap(x); }
  function reply(x: InboxItem) {
    if (!x.from || !rtext.trim()) return;
    sendMail(S, [uidOf(x.from.cls, x.from.num)], rtext, rg, 'reply');
    S.set(`school/inbox/${x.id}/replied`, rtext.trim()); S.set(`school/inbox/${x.id}/done`, '↩ 답함');
    say(`↩ ${nameOf(x.from.cls, x.from.num)}에게 답장${rg ? ` · 💎 ${rg}` : ''}`);
    rtext = ''; rg = 0; rgem = false; open = ''; ver++;
  }
  // 보내기
  let ncls = $state('1-3'), note = $state('');
  // 📮 메시지 (#130 ②) — 받는 사람 [반 전체 | 학생 고르기](반 ▾ 아래 번호 칩 · 여러 명 · 다른 반 섞기) · 💎 마정석도 같이
  let to = $state<'cls' | 'pick'>('cls'), mg = $state(0);
  let picks = $state<Record<string, { cls: string; num: number; name: string }>>({});
  const pickL = $derived(Object.entries(picks));
  const ros = $derived(roster(ncls, S));
  const togglePick = (p: { cls: string; num: number; name: string; uid: string }) => { const n = { ...picks }; if (n[p.uid]) delete n[p.uid]; else n[p.uid] = { cls: p.cls, num: p.num, name: p.name }; picks = n; };
  const nTo = $derived(to === 'cls' ? ros.length : pickL.length);
  function send(all: boolean) {
    const tx = note.trim(); if (!tx) return;
    const uids = all ? allUids(S) : to === 'cls' ? classUids(S, ncls) : pickL.map(([u]) => u);
    if (to === 'cls') { const t = Date.now(); (all ? CLASSES : [ncls]).forEach((c) => S.set(`school/notice/${c}/${t}`, { text: tx, at: t })); }
    const n = sendMail(S, uids, tx, mg, 'msg');
    say(`📮 ${all ? '모든 반' : to === 'cls' ? `${ncls}반` : ''} ${n}명에게 보냈어요${mg ? ` · 💎 ${mg}` : ''}`.replace('📮  ', '📮 '));
    note = ''; mg = 0; if (to === 'pick') picks = {};
  }
  const fg = (c: string) => { void ver; return !!S.get<boolean>(`school/cls/${c}/friendGift`); };
  // 📝 수업 설문 (정식 survey.js panel · 반마다 열기 · 닫기 · 응답 수 · 차시 번호 = 이 기기 기억 · 기본 10)
  let svNo = $state(pickNo(untrack(() => packs[0]?.no ?? 10)));
  const svRows = $derived.by(() => { void ver; return CLASSES.map((c) => ({ c, st: stateOf(S, c), done: doneCount(S, c), size: roster(c, S).length, beta: isBeta(S, c) })); });
  const svStop = untrack(() => CLASSES.map((c) => S.watch(`surveyDone/${c}`, () => ver++))); onDestroy(() => svStop.forEach((f) => f())); // 응답 수 실시간 (반 덩어리)
  function svSet(list: string[], on: boolean) { const no = keepNo(svNo); svNo = no; for (const c of list) setOpen(S, c, on, no); ver++; say(on ? `📝 ${svLabel(no)} 설문을 열었어요` : '📝 설문을 닫았어요'); }
</script>

<div class="tbar"><div class="t">소식</div><button type="button" class="tchip" data-k="news-fbk" onclick={() => (side = 'fbk')}>🛠 의견</button><button type="button" class="tchip" data-k="news-note" onclick={() => (side = 'note')}>{notePref.on && notePerm() === 'granted' ? '🔔' : '🔕'} 알림</button><button type="button" class="tchip" data-k="changes" onclick={() => (side = 'changes')}>📜 바뀐 것</button></div>
<div class="fixed">
  <div class="seg" role="tablist"><button type="button" role="tab" class:on={seg === 'in'} aria-selected={seg === 'in'} onclick={() => (seg = 'in')}>받은 것 {unread}</button><button type="button" role="tab" class:on={seg === 'box'} aria-selected={seg === 'box'} data-k="news-box" onclick={() => (seg = 'box')}>🗂 보관함 {boxList.length}</button><button type="button" role="tab" class:on={seg === 'out'} aria-selected={seg === 'out'} onclick={() => (seg = 'out')}>보내기</button></div>
  {#if seg !== 'out'}<div class="chips">{#each [['', '전체'], ['idea', '💬 의견'], ['photo', '📷 사진'], ['quiz', '✏ 출제'], ['survey', '📝 설문']] as const as [k, t] (k)}<button type="button" class:on={kind === k} data-chip={k} onclick={() => (kind = k)}>{t}{k === 'photo' && phItems.length ? ` ${phItems.length}` : k === 'quiz' && qItems.length ? ` ${qItems.length}` : ''}</button>{/each}</div>{/if}
</div>
<div class="mid scroll">
  {#if seg !== 'out'}
    {#each shown as x (x.id)}
      {@const msg = x.kind === 'idea' && !!x.from}
      <div class="nw" class:new={!x.read} class:opn={msg && open === x.id}>
        <button type="button" class="nb" onclick={() => (msg ? tapMsg(x) : tap(x))} aria-expanded={open === x.id}><span class="ic">{IC[x.kind]}</span><span class="tx"><b>{x.title}</b><small>{x.sub}{x.done ? ` · ${x.done === '↩ 답함' ? '' : '✔ '}${x.done}` : ''}</small></span>{#if !x.read}<i class="dot" aria-label="안 봄"></i>{:else if msg && open === x.id}<i class="fold" aria-label="접기">⌃</i>{/if}</button>
        {#if open === x.id && msg && x.from}
          <div class="msg">
            <div class="who"><b>{x.from.num}번 {nameOf(x.from.cls, x.from.num)}</b><small>{x.from.cls}반 · {hhmm(x.at)}</small></div>
            <p class="bub">{x.body ?? x.title}</p>
            {#if x.replied}<p class="rep">↩ 답함 · 「{x.replied}」</p>{/if}
            <div class="qk" role="group" aria-label="빠른 답">{#each QUICK as q (q)}<button type="button" class:on={rtext === q} onclick={() => (rtext = q)}>{q}</button>{/each}</div>
            <div class="rw">
              <input type="text" maxlength="80" bind:value={rtext} placeholder="답장 쓰기" aria-label="답장" />
              <button type="button" class="gm" class:on={rgem || rg > 0} aria-pressed={rgem} aria-label="💎 같이 보내기" onclick={() => (rgem = !rgem)}>💎{rg ? ` ${rg}` : ''}</button>
              <button type="button" class="snd" disabled={!rtext.trim()} onclick={() => reply(x)}>보내기</button>
            </div>
            {#if rgem}<div class="gms" role="group" aria-label="💎 같이 보내기"><span>💎 같이 보내기</span>{#each GEMS as a (a)}<button type="button" class:on={rg === a} aria-pressed={rg === a} onclick={() => (rg = rg === a ? 0 : a)}>{a}</button>{/each}</div>{/if}
          </div>
        {:else if open === x.id}
          <div class="do">
            {#if x.body}<p>{x.body}</p>{/if}
            {#if x.ph}<PhotoCheck {S} x={x.ph} who={false} readonly={x.ph.ok != null} ondone={phDone} />
            {:else if x.qx}<QuestCheck {S} x={x.qx} ondone={qDone} />
            {:else if x.kind === 'photo'}<button type="button" class="b1" onclick={() => done(x, '통과')}>✔ 통과</button><button type="button" class="b2" onclick={() => done(x, '다시')}>↺ 다시</button>
            {:else if x.kind === 'quiz'}<button type="button" class="b1" onclick={() => done(x, '받음')}>받기</button><button type="button" class="b2" onclick={() => done(x, '고치기 보냄')}>고치기</button>
            {:else if x.kind === 'idea'}<button type="button" class="b2" onclick={() => done(x, '읽음')}>읽음</button>
            {:else}<button type="button" class="b2" onclick={() => done(x, '봄')}>닫기</button>{/if}
          </div>
        {/if}
      </div>
    {:else}<div class="empty"><b>{seg === 'box' ? '🗂' : '📭'}</b><span>{seg === 'box' ? '보관함이 비었어요' : boxList.length ? '새 소식이 없어요 · 읽은 것은 🗂 보관함에' : '받은 것이 없어요'}</span></div>{/each}
    <p class="hint">새 것이 위 · 빨간 점 = 아직 안 봄 · 누르면 그 자리에서 처리 · 💬 학생 메시지 = 답장{S.kind === 'server' ? '' : ' · 🧪 이 기기 체험 = 가짜 소식'}</p>
  {:else}
    <div class="card">
      <span class="lab">📮 메시지 · 학생 폰에 「선생님 메시지」</span>
      <div class="seg sm" role="tablist" aria-label="받는 사람"><button type="button" role="tab" class:on={to === 'cls'} aria-selected={to === 'cls'} onclick={() => (to = 'cls')}>반 전체</button><button type="button" role="tab" class:on={to === 'pick'} aria-selected={to === 'pick'} onclick={() => (to = 'pick')}>학생 고르기</button></div>
      <select bind:value={ncls} aria-label="반">{#each CLASSES as c (c)}<option value={c}>{c}반{isBeta(S, c) ? ' 🧪' : ''}</option>{/each}</select>
      {#if to === 'pick'}
        <div class="nums" role="group" aria-label="{ncls}반 번호">{#each ros as p (p.uid)}<button type="button" class:on={!!picks[p.uid]} aria-pressed={!!picks[p.uid]} aria-label="{p.num}번 {p.name}" onclick={() => togglePick(p)}>{p.num}</button>{/each}</div>
        {#if pickL.length}<div class="tos" aria-label="받는 사람">{#each pickL as [u, p] (u)}<button type="button" aria-label="{p.name} 빼기" onclick={() => { const n = { ...picks }; delete n[u]; picks = n; }}>{p.cls === ncls ? '' : `${p.cls} `}{p.num} {p.name} ✕</button>{/each}</div>{:else}<p class="hint">번호를 눌러 받는 사람을 골라요 · 다른 반도 섞을 수 있어요</p>{/if}
      {/if}
      <textarea rows="2" maxlength="80" bind:value={note} placeholder="예: 내일 6차시 형성평가 있어요"></textarea>
      <div class="gms g5" role="group" aria-label="💎 마정석도 같이"><span>💎 마정석도 같이</span><button type="button" class:on={!mg} aria-pressed={!mg} onclick={() => (mg = 0)}>없음</button>{#each GEMS as a (a)}<button type="button" class:on={mg === a} aria-pressed={mg === a} onclick={() => (mg = a)}>{a}</button>{/each}</div>
      <div class="row"><button type="button" class="b1" disabled={!note.trim() || !nTo} onclick={() => send(false)}>{to === 'cls' ? `보내기 · ${ncls}반 ${nTo}명` : nTo ? `보내기 · ${nTo}명` : '받는 사람을 골라요'}</button>{#if to === 'cls'}<button type="button" class="b2" disabled={!note.trim()} onclick={() => send(true)}>모든 반에</button>{/if}</div>
    </div>
    <div class="card">
      <span class="lab">🎁 친구 선물 (반마다 · 처음엔 꺼짐 · 하루 보내기 · 받기 💎 10)</span>
      <div class="tg">{#each CLASSES as c (c)}<button type="button" class:on={fg(c)} aria-pressed={fg(c)} onclick={() => { S.set(`school/cls/${c}/friendGift`, !fg(c) || null); ver++; }}>{c}{fg(c) ? ' ✔' : ''}</button>{/each}</div>
    </div>
    {#if feat('survey')}<div class="card" data-k="sv-panel">
      <span class="lab">📝 수업 설문 · 열면 그 반 학생 폰(캠프)에 📝 단추 · 이름 없이 3분 · 결과 = 학생 탭 대시보드 「설문」</span>
      <div class="row">{#if svNo !== NO12}<label class="svno">차시 <input type="number" min="1" max="30" bind:value={svNo} onchange={() => (svNo = keepNo(svNo))} data-k="sv-no" /></label>{/if}<label class="svno"><input type="checkbox" data-k="sv-12" checked={svNo === NO12} onchange={(e) => (svNo = keepNo(e.currentTarget.checked ? NO12 : 10))} /> 12월 마무리</label><button type="button" class="b1" data-k="sv-all1" onclick={() => { if (confirm(`모든 반(${CLASSES.length}개) 설문을 ${svLabel(keepNo(svNo))}(으)로 열까요?`)) svSet(CLASSES, true); }}>모든 반 열기</button><button type="button" class="b2" data-k="sv-all0" onclick={() => { if (confirm('모든 반 설문을 닫을까요?')) svSet(CLASSES, false); }}>모든 반 닫기</button></div>
      <div class="svt">{#each svRows as r (r.c)}<div class="svr" data-sv-cls={r.c}><b>{r.c}반{r.beta ? ' 🧪' : ''}</b><span class:open={!!r.st}>{r.st ? `열림 · ${svLabel(r.st.no)}` : '닫힘'}</span><small>{r.done}/{r.size}명</small><button type="button" class:b1={!r.st} class:b2={!!r.st} onclick={() => svSet([r.c], !r.st)}>{r.st ? '✕ 닫기' : '열기'}</button></div>{/each}</div>
    </div>{/if}
  {/if}
</div>
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

{#if side === 'note'}
  <Sheet onclose={() => (side = '')}>
    {#snippet title()}🔔 알림 · 이 교사 폰{/snippet}
    <NoteSet {S} />
  </Sheet>
{:else if side === 'fbk'}
  <TFeedback {S} onclose={() => (side = '')} /><!-- 🛠 #98 학생 의견 · 그림 · 난이도 -->
{:else if side === 'changes'}
  <Sheet onclose={() => (side = '')} tall mainText="닫기">
    {#snippet title()}📜 바뀐 것 · 지금 {BUILD_ID}{/snippet}
    <ChangeList list={upTo(BUILD)} chan={chanOf()} showStudent={chanOf() === 'beta'} />
  </Sheet>
{/if}

<style>
  .tchip { flex: none; min-height: 40px; padding: 0 10px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); box-shadow: 0 2px 0 var(--press-sh); }
  .svno { display: flex; align-items: center; gap: 6px; font: 700 14px var(--font); color: var(--text-2); }
  .svno input { width: 56px; height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); text-align: center; }
  .svt { display: flex; flex-direction: column; gap: 4px; }
  .svr { display: grid; grid-template-columns: 64px 1fr auto 76px; align-items: center; gap: var(--s2); min-height: 44px; }
  .svr span { color: var(--text-3); font-size: 14px; } .svr span.open { color: var(--accent); font-weight: 700; }
  .svr small { font-size: 14px; color: var(--text-2); }
  .svr button { height: 40px; }
  .fixed { flex: none; padding: 0 var(--s4) var(--s2); display: flex; flex-direction: column; gap: var(--s2); }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; border-radius: 12px; background: var(--surface); }
  .seg button { height: 40px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font: 700 14px var(--font); }
  .seg button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 0 0 2px var(--accent); }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .chips button { flex: none; height: 34px; padding: 0 12px; border-radius: 17px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 13px var(--font); }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .nw { border-radius: var(--r); background: var(--surface); border-left: 4px solid transparent; }
  .nw.new { border-left-color: var(--bad); }
  .nb { width: 100%; min-height: 56px; display: flex; align-items: center; gap: var(--s3); padding: 0 var(--s3); border: 0; background: none; color: var(--text); font: inherit; text-align: left; }
  .nb .ic { font-size: 20px; } .nb .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nb b { font-size: 14.5px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2; word-break: keep-all; overflow-wrap: anywhere; } /* 🐞 #62-2 두 줄까지 */ .nb small { font-size: 12.5px; color: var(--text-2); }
  .dot { width: 9px; height: 9px; border-radius: 5px; background: var(--bad); flex: none; }
  .do { display: flex; flex-wrap: wrap; gap: var(--s2); padding: 0 var(--s3) var(--s3); }
  .do p { flex-basis: 100%; margin: 0; font-size: 13.5px; color: var(--text-2); white-space: pre-line; }
  .b1 { flex: 1; height: 44px; border: 0; border-radius: 12px; background: var(--accent); color: var(--on-accent); font: 700 15px var(--font); }
  .b2 { flex: 1; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); }
  .b1:disabled, .b2:disabled { opacity: 0.4; }
  .row { display: flex; gap: var(--s2); }
  select, textarea { width: 100%; box-sizing: border-box; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 600 15px var(--font); padding: 10px var(--s3); }
  select { height: 44px; padding: 0 var(--s3); }
  .tg { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .tg button { height: 40px; border-radius: 10px; border: 1px dashed var(--line); background: none; color: var(--text-2); font: 700 13px var(--font); }
  .tg button.on { border: 1px solid var(--ok); color: var(--ok); background: var(--surface-2); }
  .hint { margin: var(--s2) 0 0; font-size: 12.5px; color: var(--text-3); }
  .card .hint { margin: 0; }
  /* 💬 펼친 학생 메시지 (#130 ①) */
  .nw.opn { box-shadow: inset 0 0 0 2px var(--accent); }
  .fold { font-style: normal; font-size: 18px; color: var(--accent); flex: none; width: 24px; text-align: center; }
  .msg { display: flex; flex-direction: column; gap: var(--s2); padding: 0 var(--s3) var(--s3); }
  .who { display: flex; align-items: baseline; gap: var(--s2); } .who b { font-size: 15px; } .who small { font-size: 12.5px; color: var(--text-2); }
  .bub { margin: 0; padding: 10px 12px; border-radius: 4px 14px 14px 14px; background: var(--surface-2); font-size: 15px; line-height: 1.45; }
  .rep { margin: 0; font-size: 13px; color: var(--ok); }
  .qk { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .qk button { flex: none; height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 13.5px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .qk button.on { border-color: var(--accent); color: var(--accent); }
  .rw { display: grid; grid-template-columns: minmax(0, 1fr) 48px 72px; gap: 6px; }
  .rw input { min-width: 0; height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 600 15px var(--font); padding: 0 var(--s3); }
  .gm { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 14px var(--font); padding: 0; }
  .gm.on { border-color: var(--gem); color: var(--gem); }
  .snd { height: 48px; border: 0; border-radius: var(--r); background: var(--accent); color: var(--on-accent); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .snd:disabled { opacity: 0.4; box-shadow: none; }
  .gms { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .gms span { font-size: 13px; font-weight: 700; color: var(--gem); margin-right: 2px; }
  .gms button { height: 36px; min-width: 44px; padding: 0 10px; border-radius: 18px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 13.5px var(--font); }
  .gms.g5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .gms.g5 span { grid-column: 1 / -1; }
  .gms.g5 button { min-width: 0; padding: 0; height: 40px; }
  .gms button.on { border-color: var(--gem); background: color-mix(in srgb, var(--gem) 18%, transparent); color: var(--gem); }
  /* 📮 받는 사람 (#130 ②) */
  .seg.sm button { height: 36px; font-size: 13.5px; }
  .nums { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
  .nums button { height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 14px var(--font); padding: 0; }
  .nums button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .tos { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .tos button { flex: none; height: 32px; padding: 0 10px; border-radius: 16px; border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
</style>
