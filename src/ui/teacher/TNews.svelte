<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { CLASSES, isBeta, roster, uidOf } from '../../school/school';
  import { inbox, type InboxItem } from '../../school/inbox';
  import { allUids, classUids, GEMS, QUICK, sendMail } from '../../school/mail';
  import { hhmm } from '../../school/bells';

  // 🔔 소식 탭 (#124 ⑱ · 스크롤 A) — 위 고정 = [받은 것 n · 보내기]
  //   받은 것 = 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과를 한 목록(새 것 위 · 안 본 것 = 왼쪽 빨간 줄 + 점 · 종류 칩 거르기 · 누르면 그 자리에서 처리)
  //   💬 학생 메시지 = 누르면 그 자리에서 펼침(금빛 테 · 접기 ⌃): 번호 · 이름 · 반 · 시각 · 원문 말풍선 → 빠른 답 칩 4 → [답장 쓰기 | 💎 | 보내기] (#130)
//   보내기 = 📮 메시지(받는 사람 [반 전체 | 학생 고르기] · 💎 같이 · #130) · 🎁 친구 선물 켜기(반마다) · 📝 설문(차시 ▾ · 모든 반 열기 · 닫기)
  const { S, packs, onread }: { S: Store; packs: LessonPack[]; onread: () => void } = $props();
  let seg = $state<'in' | 'out'>('in');
  let kind = $state<'' | InboxItem['kind']>('');
  let ver = $state(0), open = $state(''), toast = $state('');
  const items = $derived.by(() => { void ver; return inbox(S); });
  const shown = $derived(items.filter((x) => !kind || x.kind === kind));
  const unread = $derived(items.filter((x) => !x.read).length);
  const IC: Record<InboxItem['kind'], string> = { idea: '💬', photo: '📷', quiz: '✏', survey: '📝' };
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  function tap(x: InboxItem) { open = open === x.id ? '' : x.id; if (!x.read) { S.set(`school/inbox/${x.id}/read`, true); ver++; onread(); } }
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
  let ncls = $state('1-3'), note = $state(''), slid = $state(untrack(() => packs[0]?.id ?? ''));
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
  const sv = $derived.by(() => { void ver; return !!S.get<boolean>(`school/survey/${slid}`); });
</script>

<div class="tbar"><div class="t">소식</div></div>
<div class="fixed">
  <div class="seg" role="tablist"><button type="button" role="tab" class:on={seg === 'in'} aria-selected={seg === 'in'} onclick={() => (seg = 'in')}>받은 것 {unread}</button><button type="button" role="tab" class:on={seg === 'out'} aria-selected={seg === 'out'} onclick={() => (seg = 'out')}>보내기</button></div>
  {#if seg === 'in'}<div class="chips">{#each [['', '전체'], ['idea', '💬 의견'], ['photo', '📷 사진'], ['quiz', '✏ 출제'], ['survey', '📝 설문']] as const as [k, t] (k)}<button type="button" class:on={kind === k} onclick={() => (kind = k)}>{t}</button>{/each}</div>{/if}
</div>
<div class="mid scroll">
  {#if seg === 'in'}
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
            {#if x.kind === 'photo'}<button type="button" class="b1" onclick={() => done(x, '통과')}>✔ 통과</button><button type="button" class="b2" onclick={() => done(x, '다시')}>↺ 다시</button>
            {:else if x.kind === 'quiz'}<button type="button" class="b1" onclick={() => done(x, '받음')}>받기</button><button type="button" class="b2" onclick={() => done(x, '고치기 보냄')}>고치기</button>
            {:else if x.kind === 'idea'}<button type="button" class="b2" onclick={() => done(x, '읽음')}>읽음</button>
            {:else}<button type="button" class="b2" onclick={() => done(x, '봄')}>닫기</button>{/if}
          </div>
        {/if}
      </div>
    {:else}<div class="empty"><b>📭</b><span>받은 것이 없어요</span></div>{/each}
    <p class="hint">새 것이 위 · 빨간 점 = 아직 안 봄 · 누르면 그 자리에서 처리 · 💬 학생 메시지 = 답장 · 🧪 테스트 판 가짜 소식</p>
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
    <div class="card">
      <span class="lab">📝 수업 설문 · 학생 폰에 버튼 · 3분</span>
      <select bind:value={slid}>{#each packs as p (p.id)}<option value={p.id}>{p.no}차시 {p.title}</option>{/each}</select>
      <div class="row"><button type="button" class="b1" disabled={sv} onclick={() => { S.set(`school/survey/${slid}`, true); ver++; say('📝 모든 반 설문을 열었어요'); }}>모든 반 열기</button><button type="button" class="b2" disabled={!sv} onclick={() => { S.set(`school/survey/${slid}`, null); ver++; say('📝 설문을 닫았어요'); }}>모든 반 닫기</button></div>
    </div>
  {/if}
</div>
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
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
  .nb b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .nb small { font-size: 12.5px; color: var(--text-2); }
  .dot { width: 9px; height: 9px; border-radius: 5px; background: var(--bad); flex: none; }
  .do { display: flex; flex-wrap: wrap; gap: var(--s2); padding: 0 var(--s3) var(--s3); }
  .do p { flex-basis: 100%; margin: 0; font-size: 13.5px; color: var(--text-2); }
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
