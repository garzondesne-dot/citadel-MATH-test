<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { CLASSES, isBeta } from '../../school/school';
  import { inbox, type InboxItem } from '../../school/inbox';

  // 🔔 소식 탭 (#124 ⑱ · 스크롤 A) — 위 고정 = [받은 것 n · 보내기]
  //   받은 것 = 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과를 한 목록(새 것 위 · 안 본 것 = 왼쪽 빨간 줄 + 점 · 종류 칩 거르기 · 누르면 그 자리에서 처리)
  //   보내기 = 📮 공지(반 ▾ · 이 반 · 모든 반) · 🎁 친구 선물 켜기(반마다) · 📝 설문(차시 ▾ · 모든 반 열기 · 닫기)
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
  // 보내기
  let ncls = $state('1-3'), note = $state(''), slid = $state(untrack(() => packs[0]?.id ?? ''));
  const send = (all: boolean) => { const t = Date.now(); (all ? CLASSES : [ncls]).forEach((c) => S.set(`school/notice/${c}/${t}`, { text: note.trim(), at: t })); note = ''; say(all ? '📮 모든 반에 보냈어요' : `📮 ${ncls}반에 보냈어요`); };
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
      <div class="nw" class:new={!x.read}>
        <button type="button" class="nb" onclick={() => tap(x)} aria-expanded={open === x.id}><span class="ic">{IC[x.kind]}</span><span class="tx"><b>{x.title}</b><small>{x.sub}{x.done ? ` · ✔ ${x.done}` : ''}</small></span>{#if !x.read}<i class="dot" aria-label="안 봄"></i>{/if}</button>
        {#if open === x.id}
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
    <p class="hint">새 것이 위 · 빨간 점 = 아직 안 봄 · 누르면 그 자리에서 처리 · 🧪 테스트 판 가짜 소식</p>
  {:else}
    <div class="card">
      <span class="lab">📮 공지 · 학생 우편함 「새 소식」</span>
      <select bind:value={ncls}>{#each CLASSES as c (c)}<option value={c}>{c}반{isBeta(S, c) ? ' 🧪' : ''}</option>{/each}</select>
      <textarea rows="2" maxlength="80" bind:value={note} placeholder="예: 내일 6차시 형성평가 있어요"></textarea>
      <div class="row"><button type="button" class="b1" disabled={!note.trim()} onclick={() => send(false)}>이 반에 보내기</button><button type="button" class="b2" disabled={!note.trim()} onclick={() => send(true)}>모든 반에</button></div>
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
</style>
