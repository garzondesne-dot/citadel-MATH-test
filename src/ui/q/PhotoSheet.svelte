<script lang="ts">
  // 📷 풀이 사진 올리기 (정식 js/raid/photo.js grade 그대로 · 아래 시트 하나 · 📜 2026-11-15 선생님 「오늘 사진 채점 기능까지」)
  //   ① 안내(📷 찍기 · 🖼 앨범) → ② ✂ 손가락으로 끌어 자르기 · 🔄 돌리기 → 🧹 1차 거르기(폰 안 · 장 수 안 깎임) → ③ 📨 채점 중 → ④ 결과
  //   결과: pass(🎉 통과 · 도장 쾅쾅) · check(⏳ 선생님 확인 · 장 수 안 깎임) · retry(✏ 점수 · 다시 · 🙋 이의 신청)
  //   👩‍🏫 trial = 사진을 받지 않음 · 「✔ 테스트: 사진 통과로 보기」 한 단추 (이 기기 체험 · 서버 없음)
  //   🎮 test = 선생님 시연 · 선생님 토큰 + test 표시 (중계소가 기록 안 남김 · 정식 #47)
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import { sfx } from '../sound.svelte';
  import { appealPath, cfgOf, coolSec, daily, EDGE, errMsg, keyOf, leftToday, pack, passScroll, post, PRE_MSG, precheckOf, QUAL, rubric, stretchLevels, roomMax, type PhotoRes } from '../../school/photo';

  export interface PhotoOut { status: 'pass' | 'check' | 'retry' | 'appeal'; id?: string; score?: number; total?: number; scores: number[]; steps?: PhotoRes['steps'] }
  const { S, cls, num, lesson, room, title, items, trial = false, test = false, again = false, fresh = false, onclose }:
    { S: Store; cls: string; num: number; lesson: string; room: string; title: string; items: { question?: string; answer?: unknown; solution?: string; check?: Record<string, unknown> }[]; trial?: boolean; /** 📜 #57 ✍ 실력 쓰기 (숫자 바꾼 판 · 📜 칸 따로) */ again?: boolean; /** 🐞 11/23 숫자 바꾼 판이지만 실력 쓰기는 아님(성채 다른 판) = 중계소에 학생 문제 글로 채점하라고만 알림 */ fresh?: boolean; test?: boolean; onclose: (v: PhotoOut | null) => void } = $props();
  const P = untrack(() => pack(items)), cfg = untrack(() => cfgOf(S)), r0 = untrack(() => rubric(S, lesson, room)) || { total: 4, pass: 3 };
  const rk = untrack(() => keyOf(lesson, room).replace(/[.#$/[\]]/g, '_'));
  type View = 'intro' | 'edit' | 'wait' | 'pass' | 'check' | 'retry' | 'appeal';
  let view = $state<View>('intro'), msg = $state(''), pre = $state('');
  let left = $state<number | null>(null), roomLeft = $state<number | null>(null), coolUntil = $state(0), nowT = $state(Date.now());
  const tick = setInterval(() => (nowT = Date.now()), 500); onDestroy(() => clearInterval(tick));
  const wait = $derived(Math.max(0, Math.ceil((coolUntil - nowT) / 1000)));
  let res = $state<PhotoRes | null>(null), shown = $state(0), stamped = $state(-1), gold = $state(false);
  const scores: number[] = [];
  let finished = false;
  function close(v: Partial<PhotoOut> | null) {
    if (finished) return; finished = true;
    onclose(v ? { scores, steps: res?.steps, ...v } as PhotoOut : scores.length ? { status: 'retry', scores, steps: res?.steps } : null);
  }
  if (!untrack(() => trial)) { const v = untrack(() => leftToday(S, cfg, cls, num, rk)); left = v.left; roomLeft = v.roomLeft; if (v.wait) coolUntil = Date.now() + v.wait * 1000; }

  // ── 사진 고르기 · 돌리기 · 자르기 · 줄이기 ──
  let fileEl = $state<HTMLInputElement | null>(null), cam = false;
  function choose(c: boolean) { cam = c; if (!fileEl) return; if (c) fileEl.setAttribute('capture', 'environment'); else fileEl.removeAttribute('capture'); fileEl.value = ''; fileEl.click(); }
  let im: HTMLImageElement | null = null, rot = 0, src: HTMLCanvasElement | null = null, rc = { x: 0, y: 0, w: 0, h: 0 };
  async function picked() {
    const f = fileEl?.files?.[0]; if (!f) return;
    try { im = await new Promise<HTMLImageElement>((ok, no) => { const u = URL.createObjectURL(f), x = new Image(); x.onload = () => { URL.revokeObjectURL(u); ok(x); }; x.onerror = () => { URL.revokeObjectURL(u); no(new Error('사진을 열지 못했어요')); }; x.src = u; }); }
    catch (e) { msg = (e as Error).message; return; }
    rot = 0; src = rotated(im, rot); rc = { x: 0, y: 0, w: src.width, h: src.height }; pre = ''; view = 'edit'; queueMicrotask(paint);
  }
  function rotated(img: HTMLImageElement, r: number) {
    const s = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'), q = r % 2 === 1; c.width = q ? h : w; c.height = q ? w : h;
    const g = c.getContext('2d')!; g.translate(c.width / 2, c.height / 2); g.rotate((r * Math.PI) / 2); g.drawImage(img, -w / 2, -h / 2, w, h); return c;
  }
  function exportJpeg(s: HTMLCanvasElement, r: typeof rc) {
    const k = Math.min(1, EDGE / Math.max(r.w, r.h)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(r.w * k)); c.height = Math.max(1, Math.round(r.h * k));
    const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(s, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    try { const im = g.getImageData(0, 0, c.width, c.height); if (stretchLevels(im.data)) g.putImageData(im, 0, 0); } catch { /* 그대로 보냄 */ } // 🐞 11/24 흐린 사진 = 대비 펴기
    return c.toDataURL('image/jpeg', QUAL).split(',')[1]!;
  }
  /** 🧹 1차 거르기 (정식 precheck 그대로 · 칸마다 종이 밝기 · 글씨 = 그 칸 종이보다 25 이상 어두운 점) */
  function precheck(s: HTMLCanvasElement, r: typeof rc) {
    const k = 256 / Math.max(r.w, r.h), w = Math.max(16, Math.round(r.w * k)), h = Math.max(16, Math.round(r.h * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; g.drawImage(s, r.x, r.y, r.w, r.h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, n = w * h, y = new Float32Array(n);
    let sum = 0, sat = 0; for (let i = 0; i < n; i++) { const R = d[i * 4]!, G = d[i * 4 + 1]!, B = d[i * 4 + 2]!, mx = Math.max(R, G, B), mn = Math.min(R, G, B); y[i] = 0.299 * R + 0.587 * G + 0.114 * B; sum += y[i]!; sat += mx ? (mx - mn) / mx : 0; }
    const mean = sum / n; sat /= n;
    const Bk = 16, bw = Math.ceil(w / Bk), bh = Math.ceil(h / Bk), loc = new Float32Array(bw * bh), all: number[] = [];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { const v: number[] = []; for (let yy = by * Bk; yy < Math.min(h, by * Bk + Bk); yy++) for (let x = bx * Bk; x < Math.min(w, bx * Bk + Bk); x++) v.push(y[yy * w + x]!); v.sort((a, b) => a - b); loc[by * bw + bx] = v[Math.floor(v.length * 0.8)]!; all.push(loc[by * bw + bx]!); }
    all.sort((a, b) => a - b); const paper = all[Math.floor(all.length / 2)]!;
    let ink = 0; for (let yy = 0; yy < h; yy++) for (let x = 0; x < w; x++) if (y[yy * w + x]! < loc[Math.floor(yy / Bk) * bw + Math.floor(x / Bk)]! - 25) ink++;
    const t = document.createElement('canvas'); t.width = 9; t.height = 8; const tg = t.getContext('2d')!; tg.drawImage(s, r.x, r.y, r.w, r.h, 0, 0, 9, 8);
    const td = tg.getImageData(0, 0, 9, 8).data; let hash = ''; for (let rr = 0; rr < 8; rr++) for (let x = 0; x < 8; x++) { const a = td[(rr * 9 + x) * 4]! + td[(rr * 9 + x) * 4 + 1]!, b = td[(rr * 9 + x + 1) * 4]! + td[(rr * 9 + x + 1) * 4 + 1]!; hash += a > b ? '1' : '0'; }
    return { err: precheckOf({ mean, paper, sat, inkR: ink / n }), hash };
  }
  const HKEY = 'citadel-ph-hash', hashes = (): string[] => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]') || []; } catch { return []; } };
  const sameAs = (h: string) => hashes().some((x) => { let d = 0; for (let i = 0; i < 64; i++) if (x[i] !== h[i]) d++; return d <= 4; });
  const keepHash = (h: string) => { try { localStorage.setItem(HKEY, JSON.stringify([h, ...hashes()].slice(0, 30))); } catch { /* 무시 */ } };
  let cv = $state<HTMLCanvasElement | null>(null), stage = $state<HTMLDivElement | null>(null), sc = 1, p0: { x: number; y: number } | null = null;
  function paint() {
    if (!cv || !src) return; const g = cv.getContext('2d')!;
    const mw = Math.max(200, stage?.clientWidth || 320), mh = Math.max(200, Math.min(innerHeight * 0.5, 520));
    sc = Math.min(mw / src.width, mh / src.height); cv.width = Math.round(src.width * sc); cv.height = Math.round(src.height * sc);
    g.drawImage(src, 0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(0,0,0,.55)'; const X = rc.x * sc, Y = rc.y * sc, W = rc.w * sc, H = rc.h * sc;
    g.fillRect(0, 0, cv.width, Y); g.fillRect(0, Y + H, cv.width, cv.height - Y - H); g.fillRect(0, Y, X, H); g.fillRect(X + W, Y, cv.width - X - W, H);
    g.strokeStyle = '#ffd25a'; g.lineWidth = 2; g.strokeRect(X + 1, Y + 1, Math.max(0, W - 2), Math.max(0, H - 2));
  }
  const at = (e: PointerEvent) => { const b = cv!.getBoundingClientRect(), s = src!; return { x: Math.max(0, Math.min(s.width, ((e.clientX - b.left) / b.width) * s.width)), y: Math.max(0, Math.min(s.height, ((e.clientY - b.top) / b.height) * s.height)) }; };
  function down(e: PointerEvent) { p0 = at(e); cv?.setPointerCapture?.(e.pointerId); e.preventDefault(); }
  function move(e: PointerEvent) { if (!p0) return; const p = at(e); rc = { x: Math.min(p0.x, p.x), y: Math.min(p0.y, p.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) }; paint(); }
  function up() { p0 = null; if (src && (rc.w < 40 || rc.h < 40)) rc = { x: 0, y: 0, w: src.width, h: src.height }; paint(); }
  function turn() { if (!im) return; rot = (rot + 1) % 4; src = rotated(im, rot); rc = { x: 0, y: 0, w: src.width, h: src.height }; paint(); }
  function whole() { if (src) { rc = { x: 0, y: 0, w: src.width, h: src.height }; paint(); } }
  let lastHash: string | null = null;
  function sendIt() {
    if (!src) return; const ck0 = precheck(src, rc), why = ck0.err || (sameAs(ck0.hash) ? 'dup' : null);
    if (why) { pre = `⚠ ${PRE_MSG[why]} (채점으로 보내지 않았어요 · 장 수는 그대로)`; sfx('block', 0.6); return; } // 🧹 AI 에 안 넘김 · 장 수 안 깎임
    lastHash = ck0.hash; void send(exportJpeg(src, rc));
  }
  async function token(): Promise<string | null> { const a = (S as Store & { auth?: { currentUser: { getIdToken(): Promise<string> } | null } }).auth; try { return (await a?.currentUser?.getIdToken()) ?? null; } catch { return null; } }
  async function send(image: string) {
    view = 'wait';
    const r = await post(cfg.url || '', { idToken: await token(), ...(test ? { test: true } : {}), ...(again || fresh ? { again: true } : {}), c: cls, n: num, lesson, room, ask: P.ask, answer: P.answer, ref: P.ref, params: P.params, image, media: 'image/jpeg' });
    if (finished) return;
    if (!r || !r.ok) { if (r?.err === 'quota') left = 0; if (r?.err === 'roomquota') roomLeft = 0; if (r?.err === 'wait') coolUntil = Date.now() + (Number(r.sec) || coolSec(cfg)) * 1000; msg = `⚠ ${errMsg(r, cfg)}`; view = 'intro'; return; }
    if (lastHash) keepHash(lastHash);
    left = r.left ?? left; roomLeft = r.roomLeft ?? roomLeft; coolUntil = Date.now() + (r.cool != null ? Number(r.cool) : coolSec(cfg)) * 1000;
    res = r; scores.push(Number(r.score) || 0); view = r.status === 'pass' ? 'pass' : r.status === 'check' ? 'check' : 'retry'; stamp(r);
    if (r.status === 'pass' && !trial && !test) passScroll(S, cls, num, lesson, room, again, String(r.id || '')); // 📜 #38 ① 결과가 온 자리에서 바로 (닫기 전에 화면을 떠나도)
  }
  // 📷 도장 쾅쾅 (정식 2026-11-06): 단계마다 0.45초 간격 ✅/✏ → 점수가 올라감 → 만점이면 💯 금도장
  const stepsOf = (r: PhotoRes | null) => Object.values(r?.steps || {}).filter((x) => x && x.note);
  function stamp(r: PhotoRes) {
    const li = stepsOf(r); shown = 0; stamped = -1; gold = false;
    if (r.status === 'pass') sfx('correct', 0.7);
    if (!li.length) { shown = Number(r.score) || 0; return; }
    li.forEach((x, i) => setTimeout(() => { if (finished) return; stamped = i; sfx(x.earned ? 'spark' : 'block', 0.5); if (x.earned) shown = Math.min(shown + 1, Number(r.score) || 0); if (i === li.length - 1) { shown = Number(r.score) || 0; if (r.score === r.total && Number(r.total) > 0) { gold = true; sfx('correct', 0.7); } } }, 350 + i * 450));
  }
  let appealT = $state(''), appealErr = $state('');
  async function sendAppeal() {
    const t = appealT.trim(); if (t.length < 2) { appealErr = '조금만 더 적어 주세요.'; return; }
    const p = appealPath(cls, num, lesson, room, String(res?.id || '')), v = { t: t.slice(0, 300), at: S.now() };
    const ok = S.trySet ? await S.trySet(p, v) : (S.set(p, v), true);
    if (!ok) { appealErr = '보내지 못했어요 — 이미 보냈거나 로그인이 풀렸어요'; return; }
    close({ status: 'appeal', id: res?.id });
  }
  const passOut = () => ({ status: 'pass' as const, id: res?.id, score: res?.score, total: res?.total });
  const headT: Record<View, string> = { intro: '📷 풀이 사진 올리기', edit: '✂ 풀이 부분만 남기기', wait: '📨 채점 중…', pass: '🎉 풀이 통과!', check: '⏳ 선생님이 직접 볼게요', retry: '✏ 조금만 더!', appeal: '🙋 이의 신청' };
  const canAgain = $derived(!!left && roomLeft !== 0);
  const main = $derived.by((): { text: string; on?: () => void; dis?: boolean; why?: string } => {
    if (trial) return { text: '✔ 테스트: 사진 통과로 보기', on: () => { sfx('correct', 0.7); scores.push(1); close({ status: 'pass', id: 'trial', score: 1, total: 1 }); } };
    if (view === 'intro') return { text: wait ? `📷 찍기 (${wait}초 뒤)` : '📷 찍기', on: () => choose(true), dis: !!wait || left === 0 || roomLeft === 0, why: left === 0 ? '오늘 사진 채점을 다 썼어요 — 내일 또 해요!' : roomLeft === 0 ? `이 방은 오늘 ${roomMax(cfg)}번 다 해 봤어요` : '' };
    if (view === 'edit') return { text: '📨 채점 받기', on: sendIt };
    if (view === 'wait') return { text: '채점 중…', dis: true, why: 'AI 가 풀이를 읽고 있어요 (10~20초) — 창을 닫지 말아 주세요' };
    if (view === 'pass') return { text: again ? '📜 +1 받기' : '⚔ 처치하러!', on: () => close(passOut()) };
    if (view === 'check') return { text: '알겠어요', on: () => close({ status: 'check', id: res?.id }) };
    if (view === 'appeal') return { text: '📨 보내기', on: () => void sendAppeal() };
    return canAgain ? { text: wait ? `📷 고쳐서 다시 찍기 (${wait}초 뒤)` : '📷 고쳐서 다시 찍기', on: () => { msg = ''; view = 'intro'; }, dis: !!wait } : { text: '나중에', on: () => close(null) };
  });
  function x() { if (view === 'pass') close(passOut()); else if (view === 'check') close({ status: 'check', id: res?.id }); else if (view !== 'wait') close(null); }
</script>

<input bind:this={fileEl} type="file" accept="image/*" class="hide" onchange={picked} aria-hidden="true" tabindex="-1" />
<Sheet onclose={x} tall={view === 'edit'} mainText={main.text} onmain={main.on} mainDisabled={!!main.dis} why={main.why || ''}>
  {#snippet title()}{headT[trial ? 'intro' : view]}{/snippet}
  <div class="ph" data-k="photo-sheet" data-view={trial ? 'trial' : view}>
    {#if trial}
      <p class="q"><b>{title}</b></p>
      <p class="hand">✍ 실제 수업에서는 학습지 서술형 칸에 <b>직접 손으로 쓴 풀이</b>를 📸 찍으면 AI 가 기준표대로 채점하고, 통과하면 🌟 진필살기가 나가요.</p>
      <p class="noname" data-k="photo-noname">✋ 이름 칸은 빼고 풀이만 찍어요</p><!-- 🛠 #137 사진은 저장 안 하지만 AI 채점 요청에 그대로 가서 이름이 찍히지 않게 (체험판 · 🧪 · 시연도 같은 부품) -->
      <p class="muted">👩‍🏫 이 기기 체험은 사진을 받지 않아요 — 아래 단추로 「통과」 장면을 봐요.</p>
    {:else if view === 'intro'}
      <p class="q"><b>{title}</b><br />{P.ask}</p>
      {#if msg}<p class="err" role="alert">{msg}</p>{/if}
      <p class="noname" data-k="photo-noname">✋ 이름 칸은 빼고 풀이만 찍어요</p>
      <p class="hand">✍ 학습지 서술형 칸에 <b>직접 손으로 쓴 풀이</b>만 찍어요 · 화면 · 인쇄 글은 통과 안 돼요</p>
      <ul class="tips">
        <li>📄 <b>이 숫자 그대로</b> 종이에 풀이를 처음부터 끝까지 써요</li>
        <li>💡 밝은 곳 · 위에서 똑바로 · 종이 한 장만 보이게</li>
        <li>🙈 이름 · 얼굴은 찍히지 않게 (사진은 저장되지 않아요)</li>
        <li>✅ 통과 = {r0.total || 4}점 중 <b>{r0.pass || 3}점</b> 이상 · 하루 {daily(cfg)}장 · 이 방은 하루 {roomMax(cfg)}장{#if left != null} (오늘 <b>{left}</b>장 · 이 방 <b>{roomLeft}</b>장 남음){/if}</li>
      </ul>
      <button type="button" class="alb" disabled={!!wait || left === 0 || roomLeft === 0} onclick={() => choose(false)}>🖼 앨범에서</button>
      <p class="muted">AI 가 기준표대로 먼저 채점하고, 애매하면 선생님이 직접 확인해요. 성적에는 쓰지 않아요.</p>
    {:else if view === 'edit'}
      <p class="noname" data-k="photo-noname">✋ 이름 칸은 빼고 풀이만 찍어요</p>
      <p class="muted">사진 위를 손가락으로 끌면 그 부분만 남아요 (풀이 전체가 들어가게 · 이름 칸은 밖으로).</p>
      {#if pre}<p class="err" role="alert" data-k="photo-pre">{pre}</p>{/if}
      <div class="stage" bind:this={stage}><canvas bind:this={cv} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}></canvas></div>
      <div class="tools"><button type="button" onclick={turn}>🔄 돌리기</button><button type="button" onclick={whole}>↺ 전체</button><button type="button" onclick={() => choose(cam)}>📷 다시 찍기</button></div>
    {:else if view === 'wait'}
      <div class="spin" aria-hidden="true"><i></i></div>
      <p class="muted center">AI 가 풀이를 읽고 있어요 (10~20초) — 창을 닫지 말아 주세요.</p>
    {:else if view === 'appeal'}
      <p class="muted">어느 부분을 맞게 썼는지 적어 주세요. 선생님이 확인하고 맞으면 처치로 바꿔 줘요.</p>
      <textarea bind:value={appealT} maxlength="300" rows="4" placeholder="예) 2번째 줄에 X ⊂ B 라고 썼어요"></textarea>
      {#if appealErr}<p class="err" role="alert">{appealErr}</p>{/if}
    {:else if res}
      {#if view !== 'check'}<div class="score {res.status}" class:gold><b class="num" data-k="photo-score">{shown}</b> / {res.total}<span>통과 {res.pass}점</span>{#if gold}<i class="c100">💯</i>{/if}</div>{/if}
      {#if view === 'check'}<p>사진이 흐리거나 AI 가 확신하지 못했어요. <b>선생님이 확인하면 처치</b>로 바뀌어요. 이번 장은 세지 않았어요{#if left != null} (오늘 {left}장 남음){/if}.</p>{/if}
      {#if res.feedback}<p class="fb">💬 {res.feedback}</p>{/if}
      {#if stepsOf(res).length}<ul class="steps">{#each stepsOf(res) as s, i (i)}<li class:ok={!!s.earned} class:no={!s.earned} class:wait={i > stamped} class:stamped={i <= stamped}><i>{s.earned ? '✅' : '✏'}</i><span>{s.note}</span></li>{/each}</ul>{/if}
      {#if view === 'retry'}
        <p class="muted">빠진 단계를 채워 다시 찍어요 · 이 방 {roomLeft ?? '?'}장 · 오늘 {left ?? '?'}장 남음 · 점수가 이상하면 🙋 이의 신청 (선생님이 확인)</p>
        <div class="tools"><button type="button" data-k="photo-appeal" onclick={() => { appealT = ''; appealErr = ''; view = 'appeal'; }}>🙋 이의 신청</button>{#if canAgain}<button type="button" onclick={() => close(null)}>나중에</button>{/if}</div>
      {:else if view === 'check' && canAgain}
        <div class="tools"><button type="button" disabled={!!wait} onclick={() => { msg = ''; view = 'intro'; }}>📷 더 또렷하게 다시 찍기{wait ? ` (${wait}초 뒤)` : ''}</button></div>
      {/if}
    {/if}
  </div>
</Sheet>

<style>
  .noname { margin: 0; padding: 10px 12px; border-radius: var(--r-sm); background: color-mix(in srgb, var(--accent) 16%, var(--surface-2)); border: 1px solid var(--accent); color: var(--text); font: 700 15px/1.4 var(--font); }
  .hide { position: fixed; left: -9999px; width: 1px; height: 1px; opacity: 0; }
  .ph { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s2); }
  .ph p { margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
  .q { font-size: 16px; }
  .hand { padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 15px; }
  .muted { color: var(--text-2); font-size: 14px; }
  .center { text-align: center; }
  .err { color: var(--bad); font-weight: 700; font-size: 15px; }
  .tips { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 15px; color: var(--text-2); }
  .tips b { color: var(--text); }
  .alb, .tools button { min-height: var(--tap); padding: 0 var(--s3); border-radius: var(--r); border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .alb:active:not(:disabled), .tools button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .alb:disabled, .tools button:disabled { opacity: 0.4; box-shadow: none; }
  .tools { display: flex; flex-wrap: wrap; gap: var(--s2); }
  .tools button { flex: 1; }
  .stage { display: grid; place-items: center; touch-action: none; }
  canvas { max-width: 100%; border-radius: var(--r-sm); touch-action: none; }
  .spin { display: grid; place-items: center; height: 96px; }
  .spin i { width: 44px; height: 44px; border-radius: 50%; border: 4px solid var(--surface-2); border-top-color: var(--accent); animation: sp 0.9s linear infinite; display: block; }
  @keyframes sp { to { transform: rotate(360deg); } }
  .score { position: relative; display: flex; align-items: baseline; justify-content: center; gap: 6px; padding: var(--s3); border-radius: var(--r); background: var(--surface-2); font: 700 20px var(--font); font-variant-numeric: tabular-nums; }
  .score .num { font-size: 40px; }
  .score.pass .num { color: var(--ok); }
  .score.retry .num { color: var(--accent); }
  .score span { margin-left: var(--s2); font-size: 14px; color: var(--text-2); }
  .score.gold { box-shadow: inset 0 0 0 2px var(--accent); }
  .c100 { position: absolute; right: 12px; top: 8px; font-style: normal; font-size: 28px; animation: pop 0.2s ease-out; }
  .fb { font-size: 15px; }
  .steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; align-self: stretch; width: 100%; }
  .steps li { width: 100%; box-sizing: border-box; text-align: left; display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s2) var(--s3); border-radius: var(--r-sm); background: var(--surface-2); font-size: 15px; }
  .steps li i { font-style: normal; }
  .steps li.ok { border-left: 3px solid var(--ok); }
  .steps li.no { border-left: 3px solid var(--accent); }
  .steps li.wait { opacity: 0.25; }
  .steps li.stamped i { animation: pop 0.18s ease-out; display: inline-block; }
  @keyframes pop { from { transform: scale(1.8); } to { transform: scale(1); } }
  textarea { width: 100%; box-sizing: border-box; min-height: 96px; padding: var(--s3); border-radius: var(--r); border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 500 16px var(--font); }
</style>
