<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { liveValue } from '../room.svelte';
  import { castles } from '../../school/castles.svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { BETA, FORMS, KIT_COUNT, KIT_PUBLIC, siteUrl } from '../../channel';
  import { BUILD } from '../../build';
  import { UPLOADED } from '../../engine/packs';
  import { feat, type FeatId } from '../../school/features.svelte';
  import { estimate, estLine, LIMIT, ltimePath, packTier, timeSig } from '../../school/ltime';
  import { PROFILES } from '../../model/profiles';
  import { RD, rdOf, setRd } from '../../school/rdunCfg';
  import { artless, fixAuto, rdunOf } from '../rdun';
  import { RDUN, RDUN_IDS, dungeonOf } from '../manifest';
  import { canDelete, deletePack, hidePack, prevOf, recOf, revertPack } from '../../school/packOps';
  import Sheet from '../battle/Sheet.svelte';
  import Sprite from '../Sprite.svelte';
  import PackUpload from './PackUpload.svelte';
  import AddonPacks from './AddonPacks.svelte';
  import PrepUnlock from './PrepUnlock.svelte';
  import FeatSettings from './FeatSettings.svelte';
  import PhotoSettings from './PhotoSettings.svelte';
  import QR from '../QR.svelte';

  // 📦 차시 팩 탭 (📜 2026-11-17 #22 · 옛 「📋 준비」 · 시안 NcZJ2JUj7Y1CyFWXrfuCxs ①~⑦ · DECISIONS 「📦 준비 탭 → 「📦 차시 팩」 탭」)
  //   할 일 셋 = 팩 올리기 · 🧪 테스트로 확인 · 문제가 있으면 팩을 고쳐 다시 올리기 (앱 안에서 문제 · 칸 · 그림을 손으로 고치지 않음)
  //   ① 📦 올리기 ② 📚 올린 차시 카드(→ 🧪 · ⬇ · ↩ · 🗑 · 📤 · 🎲 던전 · ⚙ 기능 · ⏱) ③ 🛠 직접 만들기 6단계 ④ ❓ 문의(폼 주소가 있을 때) ⑤ 🧰 도구(접힘)
  const { S, packs, ontest }: { S: Store; packs: LessonPack[]; /** 🧪 테스트로 열기 = ⚔ 수업 탭 🧪 로 그 차시가 골라진 채 */ ontest: (id: string) => void } = $props();
  type AS = Store & { auth?: unknown; isAdmin?: () => boolean };
  const admin = untrack(() => !(S as AS).auth || ((S as AS).isAdmin?.() ?? false));
  let ver = $state(0), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2200); };
  const list = $derived.by(() => { void ver; return [...packs].sort((a, b) => b.no - a.no); });
  let more = $state(false);
  // 🎲 그림 없는 차시 = 아직 고정 전이면 지금 계산값으로 한 번 고정 (📜 #22 ③ · 교사 로그인한 폰에서만)
  untrack(() => { if (admin) for (const L of packs) if (artless(L) && !rdOf(L.id)) fixAuto(S, L, RD); });
  const on = (id: string) => feat(id as FeatId);
  const est = (L: LessonPack) => estimate(L, on, S.get<Record<string, number>>(ltimePath(L.id, timeSig(on))));
  const rdName = (L: LessonPack) => { void ver; const c = rdOf(L.id), d = rdunOf(L); return c?.m === 'pack' || !d ? '🖼 팩 그림' : `🎲 ${RDUN[d]?.name ?? d}`; };
  const md = (t?: number) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  // 🏰 성채 팩 카드 (📜 11/17 「차시올리기에 목록아래」): 층 수 · 연 방이 있는 층 수
  const castleOpen = untrack(() => liveValue<Record<string, Record<string, Record<string, unknown>>>>(S, 'school/castleOpen')); onDestroy(castleOpen.stop);
  const castleOpenN = $derived(castles.list.filter((P) => Object.values(castleOpen.v.val?.[P.id] || {}).some((c) => Object.values(c || {}).some(Boolean))).length);
  const revOf = (L: LessonPack) => (L as LessonPack & { rev?: number }).rev ?? 1;
  /** 📦 카드 판 표시 = 올린 날짜 「11/17 올림」 · 날짜 모름 = 「올림」 · 앱 기본 차시 = 없음 (📜 2026-11-17 선생님 「1 날짜로」) */
  const upTag = (L: LessonPack) => { const t = md((L as LessonPack & { upAt?: number }).upAt); return t ? `${t} 올림` : UPLOADED.has(L.id) ? '올림' : ''; };
  const nMon = (L: LessonPack) => L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id] && !s.later).length;
  // ── ② 차시 카드 ──
  let cur = $state<LessonPack | null>(null), hasPrev = $state(false), ask = $state<'' | 'del' | 'prev'>(''), busy = $state(false);
  async function openCard(L: LessonPack) { cur = L; ask = ''; hasPrev = false; hasPrev = !!(await prevOf(S, L.id)); }
  let expNote = $state('');
  async function exportZip(L: LessonPack) {
    expNote = '📦 묶는 중…';
    try { const { exportPack } = await import('../../school/packExport'); const r = await exportPack(S, L, !UPLOADED.has(L.id), Date.now()); const u = URL.createObjectURL(new File([r.bytes as Uint8Array<ArrayBuffer>], r.name, { type: 'application/zip' })); const a = document.createElement('a'); a.href = u; a.download = r.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); expNote = `⬇ ${r.name}`; }
    catch (e) { expNote = `묶지 못했어요 — ${(e as Error)?.message || String(e)}`; }
  }
  async function doDel(L: LessonPack) {
    busy = true;
    const ok = canDelete(L.id) ? await deletePack(S, L.id) : await hidePack(S, L.id, true);
    busy = false; ask = '';
    if (!ok) { say('바꾸지 못했어요 · 교사 로그인 · 인터넷을 확인해요'); return; }
    say(canDelete(L.id) ? `${L.no}차시 팩을 뺐어요` : `${L.no}차시를 숨겼어요 · 기록은 그대로`); cur = null; ver++;
  }
  async function doPrev(L: LessonPack) { busy = true; const ok = await revertPack(S, L.id); busy = false; ask = ''; if (ok) { say('↩ 바로 전 판으로 돌렸어요 · 한 번 더 누르면 다시 지금 판'); cur = null; ver++; } else say('되돌리지 못했어요'); }
  // 🎲 던전
  let dpick = $state(false), dsel = $state('');
  const mode = (L: LessonPack) => { void ver; return rdOf(L.id)?.m ?? (artless(L) ? 'auto' : 'pack'); };
  function setMode(L: LessonPack, m: 'pack' | 'auto' | 'pick') {
    if (m === 'pick') { dsel = rdunOf(L) || RDUN_IDS[0] || ''; dpick = true; return; }
    if (m === 'pack') setRd(S, L.id, { m: 'pack' });
    else { setRd(S, L.id, null); fixAuto(S, L, RD); if (!rdOf(L.id)) setRd(S, L.id, { m: 'auto', d: RDUN_IDS[(L.no - 1) % RDUN_IDS.length] }); }
    ver++;
  }
  // 📋 차시 기본값 네 칸 (옛 「📚 차시 준비」 · 수업 내용이 아니라 진행 값 · 수업 열 때 방에 옮겨 적음)
  type Prep = { pct: number; retries: number; think: number; solve: number };
  const STEP: Record<keyof Prep, [number, number, number, string, string]> = { pct: [5, 10, 100, '%', '체력 기준'], retries: [1, 0, 5, '번', '한 번 더'], think: [1, 0, 30, '초', '생각 시간'], solve: [10, 0, 300, '초', '정찰'] };
  const prepOf = (L: LessonPack): Prep => { void ver; return { pct: L.defaultPct ?? 90, retries: PROFILES.class.retries, think: PROFILES.class.thinkSec, solve: PROFILES.class.scoutSec, ...(S.get<Partial<Prep>>(`school/prep/${L.id}`) || {}) }; };
  const bump = (L: LessonPack, k: keyof Prep, d: number) => { const [st, lo, hi] = STEP[k], v = Math.max(lo, Math.min(hi, prepOf(L)[k] + d * st)); S.set(`school/prep/${L.id}/${k}`, v); ver++; };
  let featOpen = $state(false);
  // ── ③ 🛠 직접 만들기 6단계 (✔ = 이 기기 기억) ──
  const SK = 'citadel-packbuild';
  let done = $state<boolean[]>((() => { try { const v = JSON.parse(localStorage.getItem(SK) || '[]'); return Array.from({ length: 6 }, (_, i) => !!v[i]); } catch { return Array(6).fill(false); } })());
  const setDone = (i: number, v: boolean) => { done = done.map((x, k) => (k === i ? v : x)); try { localStorage.setItem(SK, JSON.stringify(done)); } catch { /* 이 기기만 */ } };
  const nDone = $derived(done.filter(Boolean).length), nowStep = $derived(done.findIndex((x) => !x));
  let wsTab = $state<'ai' | 'hand'>('ai'), side = $state<'up' | 'make'>('up'), mstep = $state(0);
  const KIT = `${import.meta.env.BASE_URL}kit/모두의던전_차시팩_만들기_꾸러미.zip`;
  let kitOk = $state<boolean | null>(null);
  $effect(() => { if (side !== 'make' || kitOk != null || !KIT_PUBLIC) return; fetch(KIT, { method: 'HEAD', cache: 'no-store' }).then((r) => (kitOk = r.ok && !/text\/html/.test(r.headers.get('content-type') || ''))).catch(() => (kitOk = false)); });
  const STEPS: { t: string; d: string }[] = [
    { t: '자료 한 번에 받기', d: '학습지 틀 · 학습지 도우미 · 팩 도우미 지침 · 설치 안내 · 예시 · 도감 ID (zip 1개)' },
    { t: '📝 우리 양식 학습지 만들기', d: '🤖 AI 로 · ✍ 직접 — 둘 중 하나 · 끝 = 학습지 PDF' },
    { t: '학습지 PDF 로 팩 받기', d: 'AI 에 팩 도우미를 만들고(설치 안내) 학습지 PDF 를 줌 · 한 차시 = 몬스터 3 · 형성평가 3~4 · 45분 이하' },
    { t: 'zip 만들기', d: '팩 1 + 학습지 PDF 1 (+ 영상) · 파일 이름은 영어 · 숫자만' },
    { t: '📦 올리기', d: '「고칠 칸」이 나오면 「📋 AI 에 붙일 문구 복사」 → AI → 다시 올리기' },
    { t: '🧪 테스트로 처음부터 끝까지', d: '이상하면 팩을 고쳐 다시 올림 (손으로 고치지 않음)' },
  ];
  // ── ④ ❓ 문의 · 📤 나눔 ──
  let askOpen = $state(false), share = $state<LessonPack | null>(null);
  const lastErr = () => { try { return localStorage.getItem('citadel-pack-lasterr') || ''; } catch { return ''; } };
  const school = untrack(() => (S.get<{ name?: string }>('school/info') || {}).name || '');
  const askText = $derived(`학교 · 판: ${school || '(학교 이름 없음)'} · ${BETA ? '베타' : '정식'} · ${BUILD}\n막힌 곳: 📦 차시 팩 · ${nowStep >= 0 ? `${nowStep + 1}단계 ${STEPS[nowStep]?.t}` : '6단계 끝'}\n오류 문구: ${lastErr() || '(없음)'}`);
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); say('✔ 복사했어요'); } catch { say('복사가 막혔어요 · 길게 눌러 복사해요'); } }
  // ── ⑤ 🧰 도구 ──
  let tools = $state(false), tool = $state<'' | 'photo' | 'qr' | 'castle' | 'prep'>('');
  let upOpen = $state(false);
  const site = siteUrl();
</script>

<div class="tbar"><div class="t">차시 팩</div></div>
<div class="mid scroll" data-k="packs-tab">
  <!-- 📦 두 갈래 (📜 11/17 #26): 탭을 열면 늘 「📦 차시 올리기」 · 「🛠 차시 만들기」는 누를 때만 · 갈래를 바꿔도 위 제목 · 아래 탭 막대 그대로 -->
  <div class="side" role="tablist" aria-label="차시 팩 갈래">
    <button type="button" role="tab" class:on={side === 'up'} aria-selected={side === 'up'} data-k="side-up" onclick={() => (side = 'up')}>📦 차시 올리기</button>
    <button type="button" role="tab" class:on={side === 'make'} aria-selected={side === 'make'} data-k="side-make" onclick={() => { side = 'make'; mstep = nowStep >= 0 ? nowStep : 5; }}>🛠 차시 만들기 <small data-k="build-n">{nDone}/6</small></button>
  </div>
  {#if side === 'up'}
  <p class="g">📚 올린 차시 <span>{list.length}개</span></p>
  {#if !list.length}<div class="empty" data-k="packs-empty"><b>아직 차시가 없어요</b><small>아래 📦 단추로 첫 팩을 올려 보세요</small></div>{/if}
  {#each more ? list : list.slice(0, 3) as L (L.id)}
    {@const e = est(L)}
    <button type="button" class="lc" data-k="pack-card" data-id={L.id} onclick={() => openCard(L)}>
      <span class="t"><b>{L.no} · {L.title.split(' · ')[0]}</b><em data-k="pack-up">{upTag(L) ? `${upTag(L)} · ` : ''}{Math.round(e.total)}분</em></span>
      <span class="tags"><span class="tag" class:full={packTier(L) === 'full'} class:basic={packTier(L) === 'basic'}>{packTier(L) === 'full' ? '🏰 풀 팩' : '🪶 기본 팩'}</span><span class="tag">{rdName(L)}</span>{#if e.total > 45}<span class="tag warn">⏱ 45분 넘음</span>{/if}{#if L.hide}<span class="tag">🙈 숨김</span>{/if}</span>
    </button>
  {/each}
  {#if list.length > 3 && !more}<button type="button" class="lc more" data-k="pack-more" onclick={() => (more = true)}>{list[list.length - 1]?.no}~{list[3]?.no}차시 · {list.length - 3}개 더 ▾</button>{/if}
  <button type="button" class="lc castle" data-k="castle-go" onclick={() => (tool = 'castle')}><span class="t"><b>🏰 성채 팩</b><em>층 {castles.list.length}개 · 열린 층 {castleOpenN}</em></span><span class="tags"><span class="tag">층 해금 · 보임/숨김 · 내려받기</span></span></button>
  <button type="button" class="lc castle" data-k="prep-go" onclick={() => (tool = 'prep')}><span class="t"><b>📖 배움터 예습</b><em>기본 = 수업한 다음 차시 자동</em></span><span class="tags"><span class="tag">반마다 열기 · 닫기</span></span></button>
  <button type="button" class="fold" data-k="tools-fold" aria-expanded={tools} onclick={() => (tools = !tools)}>🧰 도구 (사진 채점 · 공격 갤러리 · 입장 QR · 백업)<span>{tools ? '▴' : '▾'}</span></button>
  {#if tools}
    <div class="list" data-k="tools">
      <button type="button" class="item" data-k="photo-set-go" disabled={!admin} onclick={() => (tool = 'photo')}><span class="ic">📷</span><span class="tx"><b>사진 채점 설정</b><small>{admin ? '웹 앱 주소 · 켜고 끄기' : '교사 로그인 뒤'}</small></span></button>
      <a class="item" href="?role=atk&from=me" onclick={() => { try { history.replaceState(history.state, '', '?role=teacher&tab=prep'); } catch { /* 무시 */ } }}><span class="ic">💥</span><span class="tx"><b>공격 갤러리</b><small>몬스터 공격 15개 눌러 보기</small></span></a>
      <button type="button" class="item" data-k="qr-go" onclick={() => (tool = 'qr')}><span class="ic">📱</span><span class="tx"><b>입장 QR</b><small>학생 폰 카메라로 찍으면 로그인 화면</small></span></button>
      <button type="button" class="item" disabled><span class="ic">🗄</span><span class="tx"><b>백업</b><small>지난 차시 백업 받고 정리 · 준비 중</small></span></button>
    </div>
  {/if}
  {:else}
  <div class="mk" data-k="build">
    <div class="map" role="group" aria-label="6단계">
      {#each STEPS as st, i (i)}<button type="button" class="mp" class:ok={done[i]} class:now={i === mstep} data-step={i + 1} aria-current={i === mstep ? 'step' : undefined} onclick={() => (mstep = i)}><b>{done[i] ? '✔' : i + 1}</b><span>{st.t.replace(/^\p{Extended_Pictographic}\S*\s*/u, '')}</span></button>{/each}
      {#if FORMS.ask}<button type="button" class="mp ask" data-k="ask-go" onclick={() => (askOpen = true)}><b>❓</b><span>막히면 문의</span></button>{/if}
    </div>
    <div class="now" data-k="step-now" data-now={mstep + 1}>
      <p class="nt">{mstep + 1}. {STEPS[mstep]?.t}</p><small>{STEPS[mstep]?.d}</small>
      {#if mstep === 0}{#if !KIT_PUBLIC}<em class="soon" data-k="kit-soon">📥 공개 준비 중 · 곧 받을 수 있어요</em>{:else if kitOk === false}<em class="soon" data-k="kit-soon">📥 준비 중 · 곧 받을 수 있어요</em>{:else}<a class="dl" href={KIT} download data-k="kit-dl" onclick={() => { try { if (KIT_COUNT) navigator.sendBeacon?.(KIT_COUNT); } catch { /* 세기만 실패 */ } }}>📥 꾸러미 받기 (zip)</a>{/if}{/if}
      {#if mstep === 1}
        <div class="seg" role="tablist"><button type="button" role="tab" class:on={wsTab === 'ai'} aria-selected={wsTab === 'ai'} data-k="ws-ai" onclick={() => (wsTab = 'ai')}>🤖 AI 로</button><button type="button" role="tab" class:on={wsTab === 'hand'} aria-selected={wsTab === 'hand'} data-k="ws-hand" onclick={() => (wsTab = 'hand')}>✍ 직접</button></div>
        {#if wsTab === 'ai'}<ol class="sub"><li><b>학습지 도우미 만들기</b> GPT · Gemini · Claude 에 「학습지 도우미 지침」 붙여 넣기 (설치 안내 그대로)</li><li><b>재료 주기</b> 교과서 쪽 · 지금 쓰는 학습지(있으면) · 차시 목표 → 우리 양식 학습지 글이 나옴</li><li><b>PDF 로 저장</b> 도우미가 준 파일을 열어 인쇄 → PDF</li></ol>
        {:else}<p class="hand">「레이드용 학습지 틀.docx」를 한글 · 워드 · 구글 문서로 열어 칸을 채우고 PDF 로 저장 · 「예시 10차시」를 옆에 띄워 보며</p>{/if}
        <div class="rule" data-k="ws-rule"><b>✔ 우리 양식 지킬 것 (AI · 직접 같음)</b><small>① 칸 제목 글자 그대로: 「전시 확인 · 생각 열기 · STEP n · 몬스터 n · 문제 n · 형성평가」(올릴 때 이 글자로 칸 그림을 자름) ② 몬스터 3 · 형성평가 3~4 ③ 문제마다 학습지에 쓸 빈칸 ④ A4 · 글자 너무 작지 않게</small></div>
      {/if}
      {#if mstep === 4}<button type="button" class="dl" data-k="step-up" onclick={() => (upOpen = true)}>📦 올리기 창 열기</button>{/if}
      {#if mstep === 5 && list.length}<button type="button" class="dl" data-k="step-test" onclick={() => ontest(list[0]!.id)}>🧪 {list[0]!.no}차시 테스트로 열기</button>{/if}
      {#if done[mstep]}<button type="button" class="mark on" data-k="step-undo" onclick={() => setDone(mstep, false)}>✔ 했어요 · 되돌리기</button>{/if}
    </div>
    <p class="note">✔ 는 이 기기에 기억 · 막히면 {FORMS.ask ? '❓ 문의' : '만든 선생님께 문의(곧 열림)'}</p>
  </div>
  {/if}
</div>
{#if side === 'up'}
  <div class="tact" data-k="upbar"><button type="button" class="btn" data-k="packup-go" onclick={() => (upOpen = true)}>📦 차시 팩 올리기</button></div>
{:else}
  <div class="tact mkfoot"><button type="button" class="btn2" data-k="step-prev" disabled={mstep <= 0} onclick={() => (mstep = Math.max(0, mstep - 1))}>◀ {mstep > 0 ? `${mstep}단계` : '이전'}</button><button type="button" class="btn" data-k="step-done-{mstep + 1}" onclick={() => { setDone(mstep, true); if (mstep < 5) mstep += 1; }}>{mstep < 5 ? `✔ 했어요 · ${mstep + 2}단계 ▶` : '✔ 했어요 · 끝'}</button></div>
{/if}

{#if upOpen}<PackUpload {S} onclose={() => { upOpen = false; ver++; }} />{/if}

{#if cur}
  {@const L = cur}
  {@const e = est(L)}
  {@const pr = prepOf(L)}
  {@const D = RDUN[dsel]}
  <Sheet onclose={() => (dpick ? (dpick = false) : (cur = null))} tall mainText={dpick ? '' : '닫기'}>
    {#snippet title()}{dpick ? `던전 고르기 · ${L.no}차시` : `${L.no} · ${L.title.split(' · ')[0]}`}{/snippet}
    {#snippet act()}{#if dpick}<div class="row2"><button type="button" class="btn2" onclick={() => (dpick = false)}>‹ 돌아가기</button><a class="btn2 lnk" href="?role=atk&from=me&rdun={dsel}" data-k="rd-atk">▶ 공격 보기</a><button type="button" class="btn" data-k="rd-ok" disabled={!dsel} onclick={() => { setRd(S, L.id, { m: 'pick', d: dsel }); dpick = false; ver++; say(`🎲 ${RDUN[dsel]?.name} 던전으로`); }}>이 던전으로</button></div>{:else}<button type="button" class="btn" onclick={() => (cur = null)}>닫기</button>{/if}{/snippet}
    {#if dpick}
    <div class="dg" role="group" aria-label="던전 12곳" data-k="rd-grid">{#each RDUN_IDS as d (d)}<button type="button" class:on={dsel === d} data-rd-id={d} onclick={() => (dsel = d)}><b>{RDUN[d]?.name.split(' ')[0]}</b><small>{RDUN[d]?.name.split(' ').slice(1).join(' ')}</small></button>{/each}</div>
    {#if D}<div class="pv" style:background-image="url({dungeonOf(D.bg)})" data-k="rd-preview"><small>{D.name} · 배경</small><div class="ms">{#each [0, 1, 2, 3, 4] as i (i)}<Sprite ref="{dsel}:{i}" size={52} />{/each}</div><div class="bs"><Sprite ref={D.boss != null ? `${dsel}:${D.boss}` : D.bossRef ?? `${dsel}:4`} size={96} /></div><small>몬스터 5 (6번째부터 색 바꿈) · 👑 {D.bossName} · 공격 {D.attack.length} + 보스 공격 {D.bossAttack.length}</small></div>{/if}
    <p class="note">통째로만 고름 · 몬스터 하나씩은 팩에서 · 팩 파일은 바뀌지 않음(교사 설정) · 학생 · TV · 테스트가 같은 던전</p>
    {:else}
    <div class="card2" data-k="pack-detail">
      <div class="tags"><span class="tag" class:full={packTier(L) === 'full'} class:basic={packTier(L) === 'basic'}>{packTier(L) === 'full' ? '🏰 풀 팩' : '🪶 기본 팩'}</span><span class="tag">{upTag(L) || '앱 기본'}</span><span class="tag">몬스터 {nMon(L)} · 형성평가 {L.boss?.items ?? 0}</span></div>
      <div class="btns">
        <button type="button" class="p" data-k="pack-test" onclick={() => { const id = L.id; cur = null; ontest(id); }}>🧪 테스트로 열기</button>
        <button type="button" data-k="pack-dl" onclick={() => exportZip(L)}>⬇ 팩 내려받기</button>
        <button type="button" data-k="pack-prev" disabled={!hasPrev || busy} onclick={() => (ask = 'prev')}>↩ 전 판{hasPrev ? '' : '(없음)'}</button>
        {#if FORMS.share}<button type="button" data-k="pack-share" onclick={() => (share = L)}>📤 나눔에 올리기</button>{/if}
        <button type="button" class="d" data-k="pack-del" disabled={busy} onclick={() => (ask = 'del')}>{canDelete(L.id) ? '🗑 이 차시 빼기' : '🙈 이 차시 숨기기'}</button>
      </div>
      {#if expNote}<small class="note">{expNote}</small>{/if}
      {#if ask === 'del'}<div class="conf" role="alertdialog" data-k="pack-del-ask"><b>{canDelete(L.id) ? '정말 뺄까요?' : '숨길까요?'}</b><small>{recOf(S, L.id) ? `학생 ${recOf(S, L.id)}명의 기록은 남아요 · ` : ''}{canDelete(L.id) ? '팩 · 칸 그림이 서버에서 지워져요' : '앱 기본 차시 = 지우지 않고 학생 목록에서만 숨김 · 다시 올리면 보여요'}</small><span><button type="button" class="no" onclick={() => (ask = '')}>아니요</button><button type="button" class="yes" data-k="pack-del-yes" onclick={() => doDel(L)}>{canDelete(L.id) ? '🗑 빼기' : '🙈 숨기기'}</button></span></div>{/if}
      {#if ask === 'prev'}<div class="conf" role="alertdialog"><b>바로 전 판으로 돌릴까요?</b><small>지금 판은 「전 판」 자리에 남아요 · 한 번 더 누르면 다시 돌아옴</small><span><button type="button" class="no" onclick={() => (ask = '')}>아니요</button><button type="button" class="yes" data-k="pack-prev-yes" onclick={() => doPrev(L)}>↩ 돌리기</button></span></div>{/if}
      <small class="note">🧪 = ⚔ 수업 탭 「🧪 테스트」로 이 차시가 골라진 채 이동 · 고칠 것이 보이면 ⬇ 팩을 AI 에 주고 고친 팩을 다시 올림</small>

      <div class="sec" data-k="pack-dungeon"><p>🎲 던전 (몬스터 · 배경 셋)</p>
        <div class="seg" role="group" aria-label="던전">
          <button type="button" class:on={mode(L) === 'pack'} data-rd="pack" disabled={artless(L)} onclick={() => setMode(L, 'pack')}>🖼 팩 그대로</button>
          <button type="button" class:on={mode(L) === 'auto'} data-rd="auto" onclick={() => setMode(L, 'auto')}>🎲 자동</button>
          <button type="button" class:on={mode(L) === 'pick'} data-rd="pick" onclick={() => setMode(L, 'pick')}>고르기</button>
        </div>
        <small>{artless(L) ? '이 팩은 그림 칸이 비어 있어 🎲 던전 그림을 입혀요' : '팩에 그림이 있어 「팩 그대로」가 처음 값'} · 지금 {rdName(L)} · 자동 = 올릴 때 한 번 정해 고정 · 팩 파일은 바뀌지 않음</small>
      </div>

      <div class="sec" data-k="pack-time"><p>⚙ 기능 · ⏱ 이 차시 예상</p>
        <div class="tm" class:over={e.total > LIMIT}>{estLine(e)}</div>
        <div class="four">{#each Object.keys(STEP) as k (k)}{@const kk = k as keyof Prep}<div class="f4"><small>{STEP[kk][4]}</small><span><button type="button" aria-label="{STEP[kk][4]} 줄이기" onclick={() => bump(L, kk, -1)}>−</button><b>{pr[kk]}{STEP[kk][3]}</b><button type="button" aria-label="{STEP[kk][4]} 늘리기" onclick={() => bump(L, kk, 1)}>＋</button></span></div>{/each}</div>
        <button type="button" class="lk" data-k="feat" onclick={() => (featOpen = true)}>도움 3단 · 익명 풀이 · 개념 체크 … ⚙ 자세히 ▸</button>
        <small>수업 내용이 아니라 켜고 끄기 · 진행 값만 · 수업을 열 때 방에 옮겨 적어요</small>
      </div>
    </div>
    {/if}
  </Sheet>
{/if}


{#if featOpen}
  <Sheet onclose={() => (featOpen = false)}>
    {#snippet title()}⚙ 기능 단계{/snippet}
    <FeatSettings {S} />
  </Sheet>
{/if}


{#if askOpen}
  <Sheet onclose={() => (askOpen = false)}>
    {#snippet title()}❓ 문의{/snippet}
    {#snippet act()}<div class="row2"><button type="button" class="btn2" data-k="ask-copy" onclick={() => copy(askText)}>📋 내용 복사</button><a class="btn lnk" href={FORMS.ask} target="_blank" rel="noopener" data-k="ask-form">문의 폼 열기 ↗</a></div>{/snippet}
    <p class="lab2">보낼 내용 (자동으로 채움)</p>
    <pre class="ask-t" data-k="ask-text">{askText}</pre>
    <p class="note">팩 파일 = 차시 카드 「⬇ 팩 내려받기」로 받아 폼에 첨부 · 폼 = 만든 선생님의 구글 폼 · 선생님 이메일은 보이지 않음 · 답은 폼에 적은 연락처로</p>
  </Sheet>
{/if}
{#if share}
  {@const L = share}
  <Sheet onclose={() => (share = null)}>
    {#snippet title()}📤 나눔에 올리기 · {L.no}차시{/snippet}
    {#snippet act()}<div class="row2"><button type="button" class="btn2" data-k="share-dl" onclick={() => exportZip(L)}>⬇ 이 차시 팩 zip 받기</button><a class="btn lnk" href={FORMS.share} target="_blank" rel="noopener" data-k="share-form">나눔 폼 열기 ↗</a></div>{/snippet}
    <p class="note big">폼에 zip 을 올리면 만든 선생님이 확인 뒤 다른 선생님과 나눠요 · 학생 이름 · 사진은 넣지 마세요</p>
    {#if expNote}<small class="note">{expNote}</small>{/if}
  </Sheet>
{/if}

{#if tool === 'photo'}<Sheet onclose={() => (tool = '')} tall mainText="닫기">{#snippet title()}📷 사진 채점 설정{/snippet}<PhotoSettings {S} /></Sheet>{/if}
{#if tool === 'qr'}<Sheet onclose={() => (tool = '')} mainText="닫기">{#snippet title()}📱 입장 QR{/snippet}<div class="qr"><QR text={site} size={240} /><small>{site}</small></div></Sheet>{/if}
{#if tool === 'prep'}<Sheet onclose={() => (tool = '')} tall mainText="닫기">{#snippet title()}📖 배움터 예습 열기 · 닫기{/snippet}<PrepUnlock {S} /></Sheet>{/if}
{#if tool === 'castle'}<Sheet onclose={() => (tool = '')} tall mainText="닫기">{#snippet title()}🏰 성채 팩{/snippet}<AddonPacks {S} onup={() => { tool = ''; upOpen = true; }} /></Sheet>{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}

<style>
  .g { margin: 6px 2px 0; font-size: 13px; font-weight: 800; color: var(--accent); display: flex; justify-content: space-between; } .g span { color: var(--text-3); font-weight: 600; }
  .empty { display: flex; flex-direction: column; gap: 4px; padding: 14px; border-radius: var(--r); background: var(--surface); } .empty small { color: var(--text-2); }
  .lc { display: grid; gap: 4px; min-height: 56px; padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); text-align: left; font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .lc.more { display: flex; align-items: center; min-height: 44px; color: var(--text-2); font-weight: 700; font-size: 14px; } /* 접힌 「n개 더」 = 한 줄 높이 (#26 ⑤) */
  .lc .t { display: flex; gap: 6px; align-items: center; } .lc .t b { font-size: 15px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .lc .t em { font-style: normal; font-size: 12.5px; color: var(--text-3); }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; } .tag { font-size: 12px; font-weight: 800; border-radius: 99px; padding: 1px 8px; background: var(--surface-2); color: var(--text-2); } .tag.full { background: #2a2340; color: #e9d5ff; } .tag.basic { background: #13321f; color: #9ff0c6; } .tag.warn { background: #3a1d1f; color: #ffb4b6; }
  .ask, .fold { display: flex; gap: 8px; align-items: center; min-height: 48px; padding: 0 12px; border-radius: var(--r); border: 1px dashed var(--line); background: none; color: var(--text); font: 700 14px var(--font); text-align: left; } .ask span, .fold span { margin-left: auto; color: var(--text-3); } .fold { border-style: solid; color: var(--text-2); }
  a.item { text-decoration: none; }
  .card2 { display: flex; flex-direction: column; gap: 10px; }
  .btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .btns button { min-height: 48px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .btns button:disabled { opacity: 0.4; }
  .btns .p { grid-column: 1 / -1; background: #c084fc; color: #1d0b33; border-color: #c084fc; font-size: 16px; } .btns .d { grid-column: 1 / -1; color: var(--bad); }
  .note { margin: 0; color: var(--text-3); font-size: 13px; } .note.big { font-size: 15px; color: var(--text-2); }
  .conf { display: grid; gap: 4px; padding: 10px; border-radius: var(--r-sm); border: 1px solid var(--bad); background: var(--surface-2); } .conf small { color: var(--text-2); } .conf span { display: flex; gap: 6px; justify-content: flex-end; } .conf button { min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); } .conf .yes { background: var(--bad); border-color: var(--bad); color: #fff; }
  .sec { display: grid; gap: 8px; padding: 10px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); } .sec p { margin: 0; font-size: 15px; font-weight: 800; } .sec small { color: var(--text-3); font-size: 12.5px; }
  .seg { display: flex; gap: 5px; } .seg button { flex: 1; min-height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13.5px var(--font); } .seg button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .seg button:disabled { opacity: 0.35; }
  .tm { padding: 8px 10px; border-radius: 10px; background: var(--surface-2); font-size: 13.5px; } .tm.over { color: var(--bad); }
  .four { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .f4 { display: grid; gap: 2px; padding: 6px; border-radius: 10px; background: var(--surface-2); } .f4 small { font-size: 12px; color: var(--text-2); } .f4 span { display: flex; align-items: center; justify-content: space-between; } .f4 b { color: var(--accent); font-size: 16px; } .f4 button { width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 800 18px var(--font); }
  .lk { min-height: 44px; border: 0; background: none; color: var(--accent); font: 700 14px var(--font); text-align: left; padding: 0; }
  .row2 { display: flex; gap: 8px; } .row2 > * { flex: 1; min-height: 52px; } .lnk { display: flex; align-items: center; justify-content: center; text-decoration: none; }
  .dg { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; } .dg button { min-height: 60px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font-family: var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; } .dg b { font-size: 20px; } .dg small { font-size: 11px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } .dg .on { border: 2px solid var(--accent); }
  .pv { display: grid; gap: 6px; justify-items: center; padding: 10px; border-radius: 12px; background: #120d0a center / cover; color: #f3e6c4; } .pv small { font-size: 12px; text-shadow: 0 1px 2px #000; } .ms { display: flex; justify-content: space-around; width: 100%; } .bs { display: grid; place-items: center; }
  .dl { justify-self: start; min-height: 44px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--accent); color: var(--on-accent); font: 800 14px var(--font); display: inline-flex; align-items: center; text-decoration: none; }
  .soon { font-style: normal; color: var(--text-3); font-size: 13px; }
  .mark { justify-self: start; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 13px var(--font); } .mark.on { color: var(--ok); border-color: var(--ok); }
  .sub { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 13px; color: var(--text-2); } .sub b { color: var(--text); margin-right: 4px; }
  .hand { margin: 0; font-size: 13px; color: var(--text-2); }
  .rule { display: grid; gap: 2px; padding: 8px; border-radius: 10px; border: 1px solid #5a4a1a; } .rule b { font-size: 13.5px; } .rule small { color: var(--text-2); font-size: 12.5px; }
  .lab2 { margin: 0; font-weight: 700; font-size: 13px; color: var(--text-2); } .ask-t { margin: 0; padding: 10px; border-radius: 10px; background: var(--surface-2); white-space: pre-wrap; font: 13px var(--font); }
  .qr { display: grid; justify-items: center; gap: 8px; padding: 12px; background: #fff; border-radius: 12px; } .qr small { color: #333; word-break: break-all; }
  /* 📦 두 갈래 (#26) */
  .side { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .side button { min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 800 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .side button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .side small { font-weight: 600; font-size: 12px; }
  .mk { display: flex; flex-direction: column; gap: 10px; }
  .map { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }
  .mp { min-height: 44px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text-3); font: 800 13px var(--font); padding: 0; display: grid; place-items: center; }
  .mp span { display: none; } .mp.ok { background: #13321f; color: #9ff0c6; border-color: #13321f; } .mp.now { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .mp.ask { display: none; }
  .now { display: grid; gap: 8px; padding: 12px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); }
  .now .nt { margin: 0; font-size: 16px; font-weight: 900; } .now > small { color: var(--text-2); font-size: 13px; }
  .mkfoot { display: grid; grid-template-columns: auto 1fr; gap: 8px; } .mkfoot .btn2 { white-space: nowrap; padding: 0 14px; }
  /* 🖥 PC (≥ 900) = 왼쪽 단계 목록 + ❓ 문의 · 오른쪽 지금 단계 */
  @media (min-width: 900px) {
    .mk { display: grid; grid-template-columns: 220px minmax(0, 1fr); align-items: start; }
    .map { grid-template-columns: 1fr; } .mp { justify-items: start; grid-template-columns: 26px 1fr; gap: 6px; padding: 0 10px; text-align: left; }
    .mp span { display: inline; font-weight: 700; } .mp.ask { display: grid; border-style: dashed; background: none; }
    .mk .note { grid-column: 1 / -1; }
  }
</style>
