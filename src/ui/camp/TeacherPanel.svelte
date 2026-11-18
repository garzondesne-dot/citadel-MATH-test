<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { CLASSES, roster } from '../../school/school';
  import { POSTS, dissolve, membersOf, type Post } from '../../board/team';
  import { questNeeds, questRows, questCount, HALL, type QPlay, type QuestRec } from '../../school/quest';
  import { allRows, needs, type PhotoRow } from '../../school/photo';
  import { inbox } from '../../school/inbox';
  import { noteLeftByNo } from '../../board/goals';
  import { PACKS } from '../../engine/packs';
  import { castles } from '../../school/castles.svelte';
  import { autoNext, heldNo, prepKey } from '../../school/prepopen';
  import { expFrom, EXP_MIN } from '../../school/explore';
  import { eggsFound } from '../../school/eggs';
  import { CHALS, chalState } from '../../school/challenges';
  import { titleData } from '../../model/titles';
  import QuestCheck from '../teacher/QuestCheck.svelte';
  import PhotoCheck from '../teacher/PhotoCheck.svelte';
  import PrepUnlock from '../teacher/PrepUnlock.svelte';
  import EggHint from '../teacher/EggHint.svelte';
  import { liveValue } from '../room.svelte';
  // 👩‍🏫 #80 교사 캠프 「선생님 칸」 (📜 2026-11-18 DECISIONS 「👩‍🏫 교사 캠프 리뉴얼」) — 그 물건 창 위에 따로 뜨는 칸 · 학생 폰 · TV 엔 없음
  //   읽는 칸 = 교사만 읽기(records · bonus · quest · photo · roster = 서버 규칙 그대로) · 이미 만든 함수 그대로 연결(출제 안건 · 방 닫기 · 예습 열기 · 힌트 스위치)
  type Kind = 'dummy' | 'tent' | 'review' | 'gate' | 'castle' | 'mail' | 'rec';
  const { S, kind, cls = '', onclose }: { S: Store; kind: Kind; cls?: string; onclose: () => void } = $props();
  const TITLE: Record<Kind, string> = { dummy: '📋 게시판', tent: '✏ 출제 공방', review: '🎯 허수아비', gate: '🔥 던전 문', castle: '🏰 성채', mail: '📮 우편함', rec: '⛺ 기록 텐트' };
  const CLS = $derived(cls ? [cls] : CLASSES);
  let ver = $state(0), busy = $state(true), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  const nm = (c: string, n: number) => roster(c, S).find((p) => p.num === n)?.name ?? `${n}번`;
  const ck = (c: string) => c.replace(/[.#$/[\]]/g, '_');
  // 필요한 칸만 한 번 받아 둠 (반마다)
  const need: Record<Kind, string[]> = { dummy: ['roster'], tent: ['roster', 'quest'], review: ['roster', 'records', 'bonus'], gate: ['roster', 'records', 'bonus'], castle: ['roster', 'bonus', 'photo'], mail: ['roster'], rec: ['roster', 'records', 'bonus', 'gem', 'cards', 'xp', 'photo'] };
  $effect(() => { const cs = CLS, k = kind; busy = true; void Promise.all(cs.flatMap((c) => need[k].map((r) => (S.fetch ? S.fetch(`${r}/${ck(c)}`).catch(() => null) : Promise.resolve(null))))).then(() => { busy = false; ver++; }); });
  const lvP = untrack(() => liveValue<Record<string, Post>>(S, POSTS)); const lvQ = untrack(() => liveValue(S, 'quest')); onDestroy(() => { lvP.stop(); lvQ.stop(); });

  // 📋 게시판: 모집 글 실명 · 판정 이유 · 🔒 · 강제 닫기
  const posts = $derived.by(() => { void lvP.v.val; void ver; return Object.values(S.get<Record<string, Post>>(POSTS) || {}).filter((p) => p && p.pid && p.phase !== 'done' && (!cls || membersOf(p).some((m) => m.cls === cls))).sort((a, b) => b.at - a.at); });
  function closePost(p: Post) { if (!confirm(`${p.no}차시 모집 방을 닫을까요? (팀원 화면에서 사라져요)`)) return; dissolve(S, p); ver++; say('🗑 방을 닫았어요'); }
  // ✏ 출제
  const qNeeds = $derived.by(() => { void lvQ.v.val; void ver; return questNeeds(S, cls); });
  const qByCls = $derived.by(() => { void lvQ.v.val; void ver; const out: Record<string, { n: number; g: number; b: number; p: number; who: number }> = {}; for (const c of CLS) { const byN = S.get<Record<string, Record<string, QuestRec>>>(`quest/${ck(c)}`) || {}; const s = { n: 0, g: 0, b: 0, p: 0, who: 0 }; for (const recs of Object.values(byN)) { const q = questCount(recs); s.n += q.n; s.g += q.g; s.b += q.b; s.p += q.p; if (q.n) s.who++; } out[c] = s; } return out; });
  const hall = $derived.by(() => { void ver; return Object.values(S.get<Record<string, QPlay>>(HALL) || {}).filter((h) => h && (!cls || h.by.cls === cls)); });
  // 🎯 허수아비: 반별 남은 복습 많은 학생 위 10
  const reviewTop = $derived.by(() => { void ver; const out: { c: string; n: number; left: number }[] = []; for (const c of CLS) { const recs = S.get<Record<string, Record<string, unknown>>>(`records/${ck(c)}`) || {}, bon = S.get<Record<string, Record<string, unknown>>>(`bonus/${ck(c)}`) || {}; for (const p of roster(c, S)) { const r = recs[String(p.num)]; if (!r) continue; const left = Object.values(noteLeftByNo(PACKS, r as never, (bon[String(p.num)] || {}) as never)).reduce((a, x) => a + x.left, 0); if (left) out.push({ c, n: p.num, left }); } } return out.sort((a, b) => b.left - a.left).slice(0, 10); });
  // 🔥 던전 문: 다음 수업 차시 · 탐사대(예습 처치 2+) 명단
  const explore = $derived.by(() => { void ver; return CLS.map((c) => { const recs = S.get<Record<string, Record<string, unknown>>>(`records/${ck(c)}`) || {}, bon = S.get<Record<string, { review?: Record<string, unknown> }>>(`bonus/${ck(c)}`) || {}; const L = autoNext(heldNo(S, c)).L; const team = L ? roster(c, S).filter((p) => expFrom((bon[String(p.num)]?.review?.[prepKey(L.id)] || null) as never).n >= EXP_MIN) : []; void recs; return { c, L, team }; }); });
  // 🏰 성채: 반별 층 진행 · ⏳ 서술형 확인
  const castleProg = $derived.by(() => { void ver; return CLS.map((c) => { const bon = S.get<Record<string, Record<string, Record<string, { clear?: boolean }>>>>(`bonus/${ck(c)}`) || {}; const ro = roster(c, S); const floors = castles.list.filter((P) => !P.hide).map((P) => { const cleared = ro.map((p) => Object.values(bon[String(p.num)]?.[P.id] || {}).filter((x) => x?.clear).length); const n = P.rooms.length, done = cleared.filter((x) => x >= n).length, avg = cleared.length ? cleared.reduce((a, b) => a + b, 0) / cleared.length : 0; return { name: `${P.floor}층`, n, avg: Math.round(avg * 10) / 10, done }; }); return { c, floors }; }); });
  const castleIds = $derived(new Set(castles.list.map((P) => P.id)));
  const phCastle = $derived.by((): PhotoRow[] => { void ver; return allRows(S).filter((x) => needs(x) && castleIds.has(x.k.slice(0, x.k.indexOf('_'))) && (!cls || x.c === ck(cls))); });
  // 📮 선생님께 온 편지
  const letters = $derived.by(() => { void ver; return inbox(S).filter((x) => x.kind === 'idea' && x.from && (!cls || x.from.cls === cls)).slice(0, 30); });
  // ⛺ 기록 텐트: 반별 도전과제 달성률 · 👑 전설 · 🥚 비밀 찾은 수
  const recStats = $derived.by(() => { void ver; if (kind !== 'rec' || busy) return []; return CLS.map((c) => { let done = 0, tot = 0, eggs = 0; const legs: string[] = []; for (const p of roster(c, S)) { let d: ReturnType<typeof titleData>; try { d = titleData(S, c, p.num); } catch { continue; } const ctx = { d, gifts: {}, castles: castles.list }; for (const ch of CHALS) { if (ch.hide?.(ctx as never)) continue; tot++; let st; try { st = chalState(ch, ctx as never); } catch { continue; } if (st.done) { done++; if (ch.tier === 'leg') legs.push(`${p.num} ${p.name} · ${ch.name}`); } } eggs += eggsFound(d.bonus).length; } return { c, rate: tot ? Math.round((done / tot) * 100) : 0, legs, eggs }; }); });
</script>

<div class="tp" role="dialog" aria-label="선생님 칸" data-k="t-panel-box">
  <div class="bar"><b>👩‍🏫 선생님 칸 · {TITLE[kind]}</b><small>{cls ? `${cls}반` : '전체 반'} · 학생 폰엔 안 보여요</small><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></div>
  <div class="body">
    {#if busy}<p class="mut">불러오는 중…</p>{/if}
    {#if kind === 'dummy'}
      <p class="lab">모집 · 진행 중 방 {posts.length}</p>
      {#each posts as p (p.pid)}<div class="row" data-k="t-post"><div class="tx"><b>{p.no}차시 · {p.phase === 'wait' ? '모집' : '진행'}{p.lk ? ' · 🔒 암호 있음' : ''}</b>{#each membersOf(p) as m (m.uid)}<small>{m.role === 'g' ? '🛡' : '🌱'} {m.cls}반 {m.num}번 {nm(m.cls, m.num)}{m.uid === p.host ? ' (방장)' : ''} — {m.why}</small>{/each}</div><button type="button" class="b2" data-k="t-close" onclick={() => closePost(p)}>방 닫기</button></div>{:else}<p class="mut">열린 방이 없어요</p>{/each}
      <p class="mut">🔒 암호 숫자는 서버에 없어요(모집한 폰에만) · 학생 화면 · 랭킹은 익명 그대로</p>
    {:else if kind === 'tent'}
      <p class="lab">✏ 출제 안건 {qNeeds.length}</p>
      {#each qNeeds as x (x.c + x.n + x.id)}<div class="card"><b>{x.c}반 {x.n}번 {nm(x.c, x.n)}</b><QuestCheck {S} {x} ondone={(ok, saved) => { ver++; say(saved ? (ok ? '✅ 승인' : '✏ 고쳐 주세요') : '저장 못 함'); }} /></div>{:else}<p class="mut">기다리는 안건이 없어요</p>{/each}
      <p class="lab">반별 출제</p>
      <table><thead><tr><th>반</th><th>낸 학생</th><th>모두</th><th>🟢</th><th>🔵</th><th>🟣</th></tr></thead><tbody>{#each CLS as c (c)}{@const q = qByCls[c]}<tr><td>{c}</td><td>{q?.who ?? 0}</td><td>{q?.n ?? 0}</td><td>{q?.g ?? 0}</td><td>{q?.b ?? 0}</td><td>{q?.p ?? 0}</td></tr>{/each}</tbody></table>
      <p class="lab">🏛 명예의 전당 출제자</p>
      {#each hall as h (h.id)}<p class="ln">{h.by.cls}반 {h.by.num}번 {nm(h.by.cls, h.by.num)} · {h.monster || '전당 문제'} · 👍 {Object.keys(h.like || {}).length}</p>{:else}<p class="mut">아직 없어요</p>{/each}
    {:else if kind === 'review'}
      <p class="lab">📕 남은 복습 많은 학생 위 10 {cls ? '' : '(전체 반)'}</p>
      {#each reviewTop as r, i (r.c + r.n)}<p class="ln" data-k="t-review">{i + 1}. {r.c}반 {r.n}번 {nm(r.c, r.n)} · 남은 {r.left}</p>{:else}{#if !busy}<p class="mut">남은 복습이 있는 학생이 없어요</p>{/if}{/each}
    {:else if kind === 'gate'}
      <p class="lab">🔥 다음 수업 탐사대 (예습 처치 {EXP_MIN}+ )</p>
      {#each explore as e (e.c)}<p class="ln" data-k="t-explore"><b>{e.c}반</b> · {e.L ? `${e.L.no}차시` : '다음 차시 없음'} · 탐사 {e.team.length}명{e.team.length ? ` — ${e.team.map((p) => `${p.num} ${p.name}`).join(', ')}` : ''}</p>{/each}
      <p class="lab">📖 차시별 예습 열기 · 닫기</p>
      <PrepUnlock {S} />
    {:else if kind === 'castle'}
      <p class="lab">🏰 반별 층 진행 (학생 평균 처치 방 · 다 깬 학생)</p>
      {#each castleProg as cp (cp.c)}<p class="ln" data-k="t-castle"><b>{cp.c}반</b> · {cp.floors.map((f) => `${f.name} ${f.avg}/${f.n} · 완료 ${f.done}`).join(' · ') || '성채 팩 없음'}</p>{/each}
      <p class="lab">⏳ 서술형 선생님 확인 {phCastle.length}</p>
      {#each phCastle as x (x.c + x.n + x.k + x.id)}<PhotoCheck {S} {x} ondone={(ok, saved) => { ver++; say(saved ? (ok ? '✔ 인정' : '✖ 그대로') : '저장 못 함'); }} />{:else}<p class="mut">기다리는 사진이 없어요</p>{/each}
    {:else if kind === 'mail'}
      <p class="lab">✉ 선생님께 온 편지 {letters.length}</p>
      {#each letters as l (l.id)}<div class="row"><div class="tx"><b>{l.from?.cls}반 {l.from?.num}번 {l.from ? nm(l.from.cls, l.from.num) : ''}{l.read ? '' : ' · 🔴 새 편지'}</b><small>{l.body ?? l.title}</small>{#if l.replied}<small>↩ 답함 · {l.replied}</small>{/if}</div></div>{:else}<p class="mut">편지가 없어요</p>{/each}
      <a class="go" href="?role=teacher&tab=news" data-k="t-news">📮 답장 · 소식 · 선물 보내기 = 소식 탭 ›</a>
    {:else if kind === 'rec'}
      <p class="lab">반별 도전과제 · 👑 전설 · 🥚 비밀</p>
      {#each recStats as r (r.c)}<div class="card" data-k="t-rec"><b>{r.c}반 · 달성률 {r.rate}% · 🥚 찾은 비밀 {r.eggs}</b>{#each r.legs as l (l)}<small>👑 {l}</small>{/each}</div>{/each}
      <EggHint {S} />
    {/if}
  </div>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
</div>

<style>
  .tp { position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(100%, 430px); max-height: 82vh; z-index: 45; display: flex; flex-direction: column; background: var(--surface); border-top: 3px solid var(--accent); border-radius: 20px 20px 0 0; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.55); }
  .bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 12px 8px 16px; } .bar b { font-size: 16px; } .bar small { flex: 1; font-size: 13px; color: var(--text-2); }
  .x { width: 44px; height: 44px; border: 0; background: none; color: var(--text-2); font-size: 18px; }
  .body { overflow: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 8px; }
  .lab { margin: 8px 0 0; font: 700 14px var(--font); } .mut { margin: 0; font-size: 13px; color: var(--text-3); } .ln { margin: 0; font-size: 14px; line-height: 1.5; }
  .row, .card { display: flex; gap: 8px; align-items: center; padding: 10px; border-radius: 12px; background: var(--surface-2); } .card { flex-direction: column; align-items: stretch; }
  .tx { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; } .tx b, .card b { font-size: 14px; } .tx small, .card small { font-size: 13px; color: var(--text-2); }
  .b2 { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--bad); background: none; color: var(--bad); font: 700 13px var(--font); }
  table { border-collapse: collapse; font-size: 13px; } th, td { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: center; }
  .go { min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 14px var(--font); text-decoration: none; }
  .toast { position: absolute; top: -44px; left: 50%; transform: translateX(-50%); margin: 0; padding: 8px 14px; border-radius: 12px; background: var(--surface-2); font-weight: 700; white-space: nowrap; }
</style>
