<script lang="ts">
  import Dummy from '../dummy/Dummy.svelte';
  import { feat } from '../../school/features.svelte';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay } from '../../board/board';
  import SoundToggles from '../SoundToggles.svelte';
  import { BUILD } from '../../build';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { AURA_NAMES, famOfHero, HERO_NAMES, ladder, level, rungs, TIER_NAMES, titleOf } from '../../model/hero';
  import { emptyPlan, equipOf, ownsSkill } from '../../model/draft';
  import HeroSprite from './HeroSprite.svelte';
  import { SUBJ } from '../../engine/subject';
  const wishLeft: (w: Record<string, true> | undefined, m: Record<string, true> | undefined) => number = SUBJ.cards?.wishLeft ?? (() => 0);
  import MyHero from './MyHero.svelte';
  import FirstHero from './FirstHero.svelte';
  import { isEnd } from '../../raid/raid';
  import { CAMP, CAMP_PROPS, HERO, heroGeo, heroNudge, heroUrl, propPos } from '../manifest';
  import CampProp from './CampProp.svelte';
  import { portalOf } from './portal.svelte';
  import { useMe } from '../../store/me.svelte';
  import { liveRoom, liveValue } from '../room.svelte';
  import { mailLine, type Mail } from '../../school/mail';
  import BottomAction from '../battle/BottomAction.svelte';
  import { saveLogin, type Pupil } from '../../school/school';
  import Sheet from '../battle/Sheet.svelte';
  import ThemePicker from '../ThemePicker.svelte';
  import Board from '../board/Board.svelte';
  import Anvil from '../forge/Anvil.svelte';
  import { featsOf, isTheme, savedTheme, setTheme, type Theme } from '../../theme/theme';
  import { meBound, unbindMe } from '../../store/meSync';

  // 🏕 학생 캠프 (#111 · ①′ 물건 누르기 확정 · 스킬 ui-senior 2-1절 캠프 줄)
  //   위 = 장면(정식 캠프 그림 · 자리 그대로) + 「내 캠프 · 💎 · 📜」 / 아래 = 정보판(내 용사 · 사다리 4칸 · 다음 보상) + 주요 단추 「n차시 던전 입장」
  //   이름표 = 상황에 따라: 차시 던전 = 늘(열림 금빛 반짝 · 닫힘 흐림) · 새 소식 = 이름 + 빨간 숫자 · 모루 = ★n · 처음 = 흰 이름표 · 써 봤고 소식 없음 = 숨김 · 빈 땅 = 2초 모두
  const { S, L, code, pupil = null }: { S: Store; L: LessonPack; code: string; pupil?: Pupil | null } = $props();
  async function logout() {
    saveLogin(null); unbindMe();
    const A = (S as Store & { auth?: import('firebase/auth').Auth }).auth;
    if (A) { try { const fa = await import('firebase/auth'); await fa.signOut(A); } catch { /* 무시 */ } }
    location.replace(`${location.pathname}`);
  }
  const P = PROFILES.test; // 테스트 버전 = 테스트 모드 다른 점 표 값(💎 9,999 · 📜 30)
  const fromMe0 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('from') === 'me'; // 👩‍🏫 교사 「나」 → 내 캠프 = 교사 기록(B안)
  const M = useMe(typeof P.reward.gem === 'number' ? P.reward.gem : 0, typeof P.reward.scroll === 'number' ? P.reward.scroll : 0, true, fromMe0);
  const me = M.me;
  // 🎨 테마 (#144): 서버 accounts 에 고른 테마가 있으면(다른 폰에서 고름) 이 폰도 그 테마로
  let theme = $state<Theme>(untrack(() => (isTheme(me.theme) ? me.theme : savedTheme())));
  if (untrack(() => theme) !== savedTheme()) setTheme(untrack(() => theme));
  const feats = $derived.by(() => { const b = meBound(); return featsOf(b ? b.S.get(`records/${b.cls}/${b.num}`) : null, me.cards); });
  function pickTheme(t: Theme) { theme = t; me.theme = t; M.save(); setTheme(t); }
  // ⓪ 로그인한 학생 = 이름표 이름 (명단에서 · 학생이 쓰지 않음)
  if (untrack(() => pupil) && me.nick !== untrack(() => pupil)?.name) { me.nick = untrack(() => pupil)?.name ?? me.nick; M.save(); }
  // 🎁 선생님 선물 받기 (gifts/{uid} · 하루 한도 밖) — 캠프에 들어오면 아직 안 받은 것을 지갑에 넣고 한 줄 알림 (지급 = 기록 · 알림 = 보여 주기)
  let giftToast = $state('');
  {
    const u = untrack(() => pupil)?.uid;
    const G = u ? untrack(() => S).get<Record<string, { g: number; x?: number; fun?: string; got?: boolean; mail?: boolean }>>(`gifts/${u}`) || {} : {};
    const fresh = Object.entries(G).filter(([, x]) => x && !x.got && !x.mail); // ✉ 메시지에 붙은 💎 = 아래 메시지 알림이 받음
    if (u && fresh.length) {
      const sum = fresh.reduce((a, [, x]) => a + (Number(x.g) || 0), 0);
      const xp = fresh.reduce((a, [, x]) => a + (Number(x.x) || 0), 0), funOnly = fresh.every(([, x]) => !!x.fun); // 🏕 쉼터 놀이 보상(#142) = 같은 칸 · EXP 도
      // 🗿 석화 찬스 💎 = 하루 한도 안 (📜 2026-11-13 밤 · 정식 DAY_CAP 100 · 넘은 몫은 버림) · 나머지 선물 = 한도 밖 그대로
      const petri = fresh.filter(([k]) => k.startsWith('petri_')).reduce((a, [, x]) => a + (Number(x.g) || 0), 0), petriGot = earnDaily(me.wallet, petri, kstDay(untrack(() => S).now()), GEM.dayCap);
      me.wallet.gem += sum - petri; me.xp += xp; M.save();
      fresh.forEach(([k]) => S.set(`gifts/${u}/${k}/got`, true));
      giftToast = `${funOnly ? '🏕 쉼터 놀이' : '🎁 선생님 선물'} · 💎 +${sum - petri + petriGot}${xp ? ` · EXP +${xp}` : ''}`;
      setTimeout(() => (giftToast = ''), 2600);
    }
  }
  // ✉ 선생님 메시지 · 답장 (#130 · 테스트 판 = 학생 우편함 대신 폰 알림 한 줄) — 안 본 것을 읽음으로 · 붙은 💎 는 지갑에
  let mailToast = $state('');
  const mu = untrack(() => pupil)?.uid ?? '';
  const mv = untrack(() => liveValue<Record<string, Mail>>(S, mu ? `mail/${mu}` : 'mail/_none'));
  // 🌀 게시판 포털 (TV 교사 캠프와 같은 규칙 · portal.svelte.ts)
  const portal = untrack(() => portalOf(S)); onDestroy(portal.stop);
  if (typeof window !== 'undefined') (window as { __portalBurst?: () => void }).__portalBurst = () => portal.burst();
  onDestroy(mv.stop);
  $effect(() => {
    const fresh = Object.entries(mv.v.val || {}).filter(([, x]) => x && !x.got).sort((a, b) => a[1].at - b[1].at);
    if (!mu || !fresh.length) return;
    untrack(() => {
      let g = 0;
      for (const [k] of fresh) {
        S.set(`mail/${mu}/${k}/got`, true);
        const gf = S.get<{ g: number; got?: boolean }>(`gifts/${mu}/${k}m`);
        if (gf && !gf.got) { g += Number(gf.g) || 0; S.set(`gifts/${mu}/${k}m/got`, true); }
      }
      if (g) { me.wallet.gem += g; M.save(); }
      const last = fresh[fresh.length - 1]![1];
      mailToast = mailLine(last, g) + (fresh.length > 1 ? ` 외 ${fresh.length - 1}` : '');
      setTimeout(() => (mailToast = ''), 3200);
    });
  });
  const live = untrack(() => liveRoom(S, code));
  onDestroy(live.stop);
  const R = $derived(code ? (live.v.room as Room | null) : null); // 코드 없음 = 열린 수업 없음 (rooms/ 전체를 방으로 읽지 않게)
  const open = $derived(!!R && !isEnd(L, R));

  // 장면 움직임: 모닥불 8프레임(0.12초) · 앉은 용사 2프레임(0.8초) — 이 화면 안 시계 하나
  let frame = $state(0);
  const t = setInterval(() => { frame = (frame + 1) % 40; }, CAMP.fire.ms);
  onDestroy(() => clearInterval(t));
  const fireF = $derived(frame % CAMP.fire.frames);
  const sitF = $derived(Math.floor(frame / 7) % 2);

  // 소식 수 (#111 ②) — 성채 새 방 · 허수아비 복습 · 우편 안 읽음 = 그 기능이 생기는 판에서 · 모루 ★ = 찜
  const news: Record<string, number> = { castle: 0, dummy: 0, mail: 0 };
  let showAll = $state(false);
  let allTimer: ReturnType<typeof setTimeout> | null = null;
  function ground() { showAll = true; if (allTimer) clearTimeout(allTimer); allTimer = setTimeout(() => (showAll = false), 2000); }
  const wishN = $derived(wishLeft(me.wishes, me.cards));
  type LabelState = 'gold' | 'dim' | 'news' | 'star' | 'new' | 'hide';
  function lab(id: string): LabelState {
    if (id === 'gate') return open ? 'gold' : 'dim';
    if ((news[id] ?? 0) > 0) return 'news';
    if (id === 'anvil' && wishN > 0) return 'star'; // ⭐ 아직 안 만든 찜 = 「소식 있음」 자리 · 처음 · 익숙 숨김보다 먼저 (#129 ②)
    if (!me.seen[id]) return 'new';
    return showAll ? 'new' : 'hide';
  }
  const NAME: Record<string, string> = { gate: '차시 던전', castle: '성채', tent: '출제 공방', anvil: '모루', dummy: '📋 게시판', scare: '🎯 허수아비', mail: '우편함', hero: '내 용사' };
  const gateText = $derived(open ? `${L.no}차시 던전` : '차시 던전 · 닫힘');

  // 🔁 새로 고침돼도 보던 시트로 (📜 2026-11-14 모든 판 공통 화면 규칙 ①): 이 탭에서 10분 안 · 열린 시트 이름만 기억
  const SK = 'citadel-camp-sheet';
  let sheet = $state<string | null>((() => { try { const j = JSON.parse(sessionStorage.getItem(SK) || 'null') as { s: string; at: number } | null; return j && Date.now() - j.at < 10 * 60e3 ? j.s : null; } catch { return null; } })());
  $effect(() => { const s = sheet; try { if (s) sessionStorage.setItem(SK, JSON.stringify({ s, at: Date.now() })); else sessionStorage.removeItem(SK); } catch { /* 사생활 창 */ } });
  // 🧙 첫 용사 고르기 = 방금 가입한 폰의 첫 캠프에서 한 번 (App 이 가입 때 표시 · 📜 2026-11-13 밤 ❓#1 = A)
  let hero0 = $state((() => { try { return sessionStorage.getItem('citadel-hero0') === '1'; } catch { return false; } })());
  function tap(id: string, e?: Event) {
    e?.stopPropagation();
    M.mark(id);
    if (id === 'gate') { if (open) location.href = `?role=student&room=${encodeURIComponent(code)}`; else sheet = 'gate'; return; }
    sheet = id;
  }

  // 정보판 (#111 ④)
  const fam = $derived(famOfHero(me.hero));
  const lv = $derived(level(me.xp));
  const ladderRows = $derived(rungs(me.hero, ladder(me.hero).filter((id) => ownsSkill(me.wallet, emptyPlan(), me.hero, id)), equipOf({ hero: me.hero, enh: me.enh, socket: me.socket, title: me.title }), me.wallet));
  const ttl = $derived(me.title && me.title !== 'none' ? titleOf(me.title) : null);
  const hero = $derived(HERO_NAMES[me.hero] ?? { name: '용사', job: '' });
  const nextLine = $derived.by(() => {
    const b = ladderRows.find((r) => r.state === 'buy');
    if (b) return `🪜 ${TIER_NAMES[b.tier]} ${b.name.replace(/^\S+ /, '')}를 열 수 있어요 · 💎 ${b.gem}${b.scroll ? ` + 📜 ${b.scroll}` : ''}`;
    return `⭐ Lv.${lv.lv + 1} 까지 EXP ${lv.next - lv.into}`;
  });
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const [W, H] = CAMP.size;
  const zoneStyle = (k: string) => { const z = CAMP.zones[k] as [number, number, number, number]; return `left:${pct(z[0], W)};top:${pct(z[1], H)};width:${pct(z[2] - z[0], W)};height:${pct(z[3] - z[1], H)}`; };
  const objStyle = (o: { x: number; y: number; w: number }) => `left:${pct(o.x, W)};top:${pct(o.y, H)};width:${pct(o.w, W)}`;
  const HS = 1; // 정보판 용사 = 칸 80 × 64 그대로(정수 배율)
  // 🚪 코드로 들어가기 (#138 · 정식 codeGate): 6자리 · 열려 있는 방이어야 함
  let codeIn = $state(''), codeErr = $state('');
  async function enterCode() {
    const c = codeIn.trim();
    if (!/^\d{6}$/.test(c)) { codeErr = '수업 코드 6자리를 넣어 주세요'; return; }
    const R0 = (S.fetch ? await S.fetch<Room>(`rooms/${c}`) : S.get<Room>(`rooms/${c}`)); // 🔐 #163-① 방은 필요할 때 받음 → 한 번 기다림
    if (!R0) { codeErr = '그 코드의 수업이 없어요 · 선생님께 다시 물어봐요'; return; }
    if (R0.state?.closed) { codeErr = '이미 끝난 수업이에요'; return; }
    location.href = `?role=student&room=${encodeURIComponent(c)}`;
  }
  // ⛺ 교사 「나」 → 내 캠프 (📜 2026-11-13 밤 🪞 「선생님이 보는 것 = 학생이 보는 것」): 학생 폰 캠프와 같은 화면 · 교사 지갑(테스트 값) · ‹ = 「나」 탭으로 · QR 은 리모컨 쪽에만
  const fromMe = typeof location !== 'undefined' && new URLSearchParams(location.search).get('from') === 'me';
</script>

<div class="camp">
  <!-- #145 ② 짧은 화면(360 × 640 등): 장면만 비율 그대로 줄여 가운데 · 정보판 · 주요 단추는 늘 같은 자리(겹침 0) -->
  <div class="stagebox" style:--ar={W / H}>
  <div class="stage" role="presentation" onclick={ground} style:aspect-ratio="{W} / {H}" style:background-image="url({CAMP.bg})">
    <img class="obj" alt="" src={CAMP.castle.src} style={objStyle(CAMP.castle)} />
    <img class="obj lit" class:on={sheet === 'castle'} alt="" src={CAMP.castle.lit} style={objStyle(CAMP.castle)} />
    <img class="obj" alt="" src={CAMP.tent.src} style={objStyle(CAMP.tent)} />
    <img class="obj gate-on" class:on={open} alt="" src={CAMP.gateOn.src} style={objStyle(CAMP.gateOn)} />
    <i class="sp fire" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect};background-image:url({CAMP.fire.src});background-size:{CAMP.fire.cols * 100}% {CAMP.fire.rows * 100}%;background-position:{(fireF % CAMP.fire.cols) / (CAMP.fire.cols - 1) * 100}% {Math.floor(fireF / CAMP.fire.cols) * 100}%"></i>
    <i class="sp hero" style="translate:{heroNudge(me.hero, HERO.sitRow).dx + heroGeo(me.hero).dx}px {heroNudge(me.hero, HERO.sitRow).dy + heroGeo(me.hero).dy - HERO.h + heroGeo(me.hero).h}px;left:{CAMP.hero.left}%;bottom:{CAMP.hero.bottom}%;width:{heroGeo(me.hero).w}px;height:{heroGeo(me.hero).h}px;background-image:url({heroUrl(me.hero)});background-size:{HERO.cols * 100}% {HERO.rows * 100}%;background-position:{(sitF / (HERO.cols - 1)) * 100}% {(HERO.sitRow / (HERO.rows - 1)) * 100}%"></i>

    {#each ['castle', 'tent', 'gate'].filter((k) => k === 'gate' || feat(k === 'castle' ? 'citadel' : 'author')) as k (k)}
      {@const st = lab(k)}
      <button type="button" class="zone" style={zoneStyle(k)} aria-label={k === 'gate' ? gateText : NAME[k]} onclick={(e) => tap(k, e)}>
        <span class="label {st}">{k === 'gate' ? gateText : NAME[k]}{#if st === 'news'}<b class="dot">{news[k]}</b>{/if}</span>
      </button>
    {/each}
    {#each CAMP_PROPS.filter((p) => !p.feat || feat(p.feat)) as p (p.k)}
      {@const k = p.k}
      {@const st = lab(k)}
      <button type="button" class="prop" style={propPos(p)} aria-label={NAME[k]} data-prop={k} onclick={(e) => tap(k, e)}>
        <CampProp {p} phase={k === 'dummy' ? portal.phase : 'idle'} />
        <span class="label {st}">{NAME[k]}{#if st === 'news'}<b class="dot">{news[k]}</b>{:else if st === 'star'}<b class="star">★{wishN}</b>{/if}</span>
      </button>
    {/each}

    <div class="top">
      {#if pupil}<button type="button" class="back" aria-label="메뉴" onclick={() => (sheet = 'menu')}>‹</button>{:else if fromMe}<a class="back" href="?role=teacher&tab=me" aria-label="나 탭으로">‹</a>{/if}<b class="ttl">내 캠프</b><span class="sp2"></span>
      <span class="pill" aria-label="마정석 {me.wallet.gem}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{me.wallet.gem.toLocaleString()}</span>
      <span class="pill" aria-label="서술 조각 {me.wallet.scroll}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" fill="var(--scroll)" /></svg>{me.wallet.scroll}</span>
      <button type="button" class="gear" aria-label="설정" onclick={() => (sheet = 'set')}>⚙</button>
    </div>
    {#if mailToast}<p class="gtoast mail" role="status">{mailToast}</p>{:else if giftToast}<p class="gtoast" role="status">{giftToast}</p>{/if}
  </div>
  </div>

  <section class="info">
    {#if feat('hero')}<button type="button" class="card hero-card" onclick={() => tap('hero')} aria-label="내 용사 보기">
      <span class="pic"><HeroSprite id={me.hero} scale={HS} aura={me.enh} play />{#if me.enh}<b class="enh">+{me.enh}</b>{/if}</span>
      <span class="who">
        <span class="nm">{#if ttl}<em class="tt">{ttl.name}</em>{/if}<b>{fromMe ? '선생님' : me.nick}</b></span>
        <span class="sub">{hero.job} {hero.name} · {fam.name} · {me.enh ? AURA_NAMES[me.enh] : '오라 없음'}</span>
        <span class="lv"><b>Lv.{lv.lv}</b> <small>{lv.title}</small><i class="xp"><i style:width="{(lv.into / lv.next) * 100}%"></i></i><small>{lv.into}/{lv.next}</small></span>
      </span>
    </button>
    <div class="ladder" role="group" aria-label="스킬 사다리">
      {#each ladderRows as r (r.id)}
        <button type="button" class="rung {r.state}" onclick={() => tap('hero')} aria-label="{TIER_NAMES[r.tier]} {r.name} {r.state === 'equip' ? '장착' : r.state === 'own' ? '가짐' : r.state === 'buy' ? `살 수 있음 💎 ${r.gem}` : `잠김 ${r.why ?? ''}`}">
          <b>{(TIER_NAMES[r.tier] ?? '').split(' ')[0]}</b>
          <span>{r.name.replace(/^\S+ /, '')}</span>
          <small>{r.state === 'equip' ? '장착' : r.state === 'own' ? '✔' : `💎${r.gem}${r.scroll ? ` 📜${r.scroll}` : ''}`}</small>
          {#if r.state === 'buy'}<i class="bdot" aria-hidden="true"></i>{/if}
        </button>
      {/each}
    </div>
    <p class="next">{nextLine}</p>{/if}
  </section>
  <BottomAction dock={false} disabled={!open} why={open ? '' : '선생님이 수업을 열면 차원문에 빛이 들어와요'} onmain={() => tap('gate')} mainLabel="{L.no}차시 던전 입장">
    {#snippet aux()}{#if !open}<button type="button" class="codebtn" onclick={() => (sheet = 'gate')}>🚪 코드</button>{/if}{/snippet}
    {#snippet main()}<span>{open ? `${L.no}차시 던전 입장` : '차시 던전 · 닫힘'}</span>{/snippet}
  </BottomAction>
</div>

{#if sheet === 'castle'}
  <Sheet onclose={() => (sheet = null)} mainText="닫기">
    {#snippet title()}🏰 성채 던전{/snippet}
    {#each SUBJ.camp.floors as f (f.no)}<div class="floor" class:off={!!f.off}><span class="no">{f.no}</span><span><b>{f.name}</b><span>{f.sub}</span></span></div>{/each}
  </Sheet>
{:else if sheet === 'menu'}
  <!-- ‹ 메뉴 (#172 · 정식 「◀ 메뉴화면」 자리 · ui-senior TopBar = 왼쪽 위 ‹) — 내 캠프 · 교사 폰 · 교실 TV · 로그아웃 -->
  <Sheet onclose={() => (sheet = null)} mainText="🏕 내 캠프로">
    {#snippet title()}메뉴{/snippet}
    <div class="menu">
      <a class="mi" href="?role=teacher"><span>📱</span><b>교사 폰</b><small>수업 열기 · 리모컨</small></a>
      <a class="mi" href="?role=hall"><span>🖥</span><b>교실 TV</b><small>종합실 · 교사 캠프</small></a>
      <button type="button" class="mi" disabled={open} onclick={() => (sheet = 'out')}><span>🚪</span><b>처음 화면으로</b><small>{open ? '수업 중엔 못 나가요 · 수업이 끝나면' : pupil ? `${pupil.cls}반 ${pupil.num}번 · 기록은 그대로` : '로그인 화면으로'}</small></button>
    </div>
  </Sheet>
{:else if sheet === 'set'}
  <Sheet onclose={() => (sheet = null)} mainText="다 했어요">
    {#snippet title()}⚙ 설정{/snippet}
    {#if feat('theme')}<span class="slab">🎨 테마</span>
    <ThemePicker now={theme} {feats} onpick={pickTheme} paper />{/if}
    <span class="slab">🔊 소리</span>
    <SoundToggles />
    <!-- ↪ #171 로그아웃 = 첫 화면(반 · 번호 · 「교사 · 종합실 ›」)으로 · 이 폰의 로그인 기억 지움 · 시험 서버 로그인도 끝냄 -->
    <button type="button" class="out" disabled={open} onclick={() => (sheet = 'out')}>🚪 처음 화면으로 <small>{open ? '수업 중엔 못 나가요' : pupil ? `${pupil.cls}반 ${pupil.num}번` : ''}</small></button>
    <p class="build">판 {BUILD}{(S as Store & { auth?: unknown }).auth ? ' · 시험 서버' : ' · 이 기기'}</p>
  </Sheet>
{:else if sheet === 'out'}
  <!-- 🚪 처음 화면으로 (📜 2026-11-13 밤 · 로그아웃 = 로그인 정보만 지움 · 이 기기 테스트 · 체험 저장은 그대로) -->
  <Sheet onclose={() => (sheet = null)} mainText="🚪 처음 화면으로" onmain={logout}>
    {#snippet title()}처음 화면으로 갈까요?{/snippet}
    <p class="outq">다른 반 · 번호로 다시 들어가요 · 내 기록 · 💎 는 그대로예요</p>
  </Sheet>
{:else if sheet === 'anvil'}
  <!-- ⚒ 모루 (#148 · 정식 모루 그대로 · 캠프 모루에서만) -->
  <Anvil {me} save={M.save} who={pupil ? `${pupil.cls.replace(/[.#$/[\]]/g, '_')}-${pupil.num}` : 'me'} onclose={() => (sheet = null)} />
{:else if sheet === 'scare'}
  <!-- 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 쪼갬) -->
  <Dummy {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} onclose={() => (sheet = null)} />
{:else if sheet === 'dummy'}
  <!-- 📋 게시판 던전 (#143 · 허수아비 자리 · 허수아비 화면은 없앰) -->
  <Board {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} {open} onclose={() => (sheet = null)} />
{:else if sheet === 'hero'}
  <MyHero {me} persist={M.save} onclose={() => (sheet = null)} teacher={fromMe0} onreset={fromMe0 ? M.reset : undefined} />
{:else if sheet}
  <Sheet onclose={() => (sheet = null)} mainText="닫기">
    {#snippet title()}{sheet === 'gate' ? '차시 던전' : NAME[sheet ?? '']}{/snippet}
    {#if sheet === 'gate'}
      <!-- 🚪 코드로 들어가기 (#138 · 정식 camp.js codeGate 그대로: 수업 코드 6자리 → 던전 대기실) -->
      <p class="cg">아직 문이 닫혀 있어요. 선생님이 알려 준 <b>수업 코드 6자리</b>를 넣으면 던전 대기실로 넘어가요.</p>
      <input class="cin" inputmode="numeric" maxlength="6" placeholder="6자리" autocomplete="off" aria-label="수업 코드 6자리" bind:value={codeIn} oninput={() => (codeErr = '')} />
      {#if codeErr}<p class="cerr" role="alert">{codeErr}</p>{/if}
      <button type="button" class="cgo" onclick={enterCode}>⚔ 던전으로</button>
    {:else}
    <div class="empty"><span class="ic" aria-hidden="true">{sheet === 'gate' ? '🌀' : sheet === 'dummy' ? '🎯' : sheet === 'mail' ? '📮' : sheet === 'tent' ? '✏' : sheet === 'anvil' ? '⚒' : '🧙'}</span>
      <p>{sheet === 'gate' ? '지금은 닫혀 있어요 · 선생님이 수업을 열면 빛이 들어와요' : '다음 판에서 열려요'}</p></div>
    {/if}
  </Sheet>
{/if}

{#if hero0 && !me.seen['hero0'] && !fromMe0}<FirstHero {me} persist={M.save} ondone={() => { hero0 = false; try { sessionStorage.removeItem('citadel-hero0'); } catch { /* 무시 */ } }} />{/if}

<style>
  /* 📋 게시판 던전 = 파란 포털 빛 (게시판 그림이 오기 전 자리 · 평소 불씨) */
  .outq { margin: 0; font-size: 16px; color: var(--text-2); }
  .out:disabled, .mi:disabled { opacity: 0.45; }
  .back { flex: none; width: 40px; height: var(--tap); margin-left: -8px; border: 0; background: none; color: #fff; font-size: 30px; line-height: 1; text-shadow: 0 1px 2px #000; cursor: pointer; display: grid; place-items: center; text-decoration: none; }
  .menu { display: flex; flex-direction: column; gap: var(--s2); }
  .mi { display: grid; grid-template-columns: 40px 1fr; grid-template-rows: auto auto; align-items: center; column-gap: var(--s2); min-height: 56px; padding: var(--s2) var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); text-decoration: none; font: inherit; text-align: left; }
  .mi span { grid-row: span 2; font-size: 24px; text-align: center; } .mi b { font-size: 16px; } .mi small { color: var(--text-3); font-size: 13px; }
  .build { margin: var(--s2) 0 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .out { margin-top: var(--s3); min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); display: flex; align-items: center; justify-content: center; gap: var(--s2); }
  .out small { color: var(--text-3); font-weight: 500; }
  .codebtn { flex: 1; min-height: var(--btn-h); padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .cg { margin: 0; font-size: 15px; line-height: 1.5; color: var(--text-2); } .cg b { color: var(--text); }
  .cin { width: 100%; box-sizing: border-box; height: 56px; border-radius: var(--r); border: 2px solid var(--line); background: var(--bg); color: var(--text); font: 700 26px var(--font); letter-spacing: 6px; text-align: center; }
  .cin:focus { border-color: var(--accent); outline: none; }
  .cerr { margin: 0; color: var(--bad); font-size: 14px; font-weight: 700; }
  .cgo { min-height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .camp { max-width: 430px; margin: 0 auto; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  .stagebox { flex: 1 1 auto; min-height: 0; container-type: size; display: flex; justify-content: center; align-items: flex-start; }
  .camp > :global(.act) { flex: none; }
  .info { flex: none; }
  .stage { position: relative; width: min(100cqw, 100cqh * var(--ar)); flex: none; background-size: 100% 100%; overflow: hidden; }
  .stage::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: linear-gradient(transparent, var(--bg)); pointer-events: none; z-index: 4; }
  .obj { position: absolute; z-index: 1; pointer-events: none; }
  .obj.lit { opacity: 0; transition: opacity 0.4s; }
  .obj.lit.on { opacity: 1; }
  .obj.gate-on { opacity: 0; transition: opacity 1.2s; }
  .obj.gate-on.on { opacity: 1; }
  .sp { position: absolute; z-index: 2; display: block; background-repeat: no-repeat; image-rendering: pixelated; pointer-events: none; }
  .fire { filter: drop-shadow(0 0 18px #ff9a2a); }
  .zone { position: absolute; z-index: 5; background: none; border: 0; padding: 0; }
  .prop { position: absolute; z-index: 5; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
  .prop:active :global(.img) { transform: scale(1.06); } /* 누른 느낌 = 물건이 살짝 커졌다 돌아옴 (0.12초 · 파란 네모 대신) */
  .label { position: absolute; left: 50%; bottom: -6px; transform: translate(-50%, 100%); white-space: nowrap; height: 26px; padding: 0 9px; border-radius: 13px; background: var(--surface-2); color: var(--text); font: 700 var(--fs-small) var(--font); display: flex; align-items: center; gap: var(--s1); box-shadow: 0 3px 0 #000; z-index: 5; transition: opacity var(--t); }
  .zone .label { bottom: 4px; transform: translate(-50%, 0); }
  .zone[aria-label='출제 공방'] .label { bottom: auto; top: 0; transform: translate(-50%, -60%); } /* 출제 공방 이름표 = 텐트 위 (아래 빈 땅 = 🎯 허수아비 자리 · 캠프 자리표) */
  .label.new { background: #f2f3f5; color: #14161b; }
  .label.gold { background: var(--accent); color: var(--on-accent); animation: glow 1.6s ease-in-out infinite; }
  .label.dim { opacity: 0.7; color: var(--text-2); }
  .label.hide { opacity: 0; pointer-events: none; }
  .dot { min-width: 18px; height: 18px; border-radius: 9px; background: var(--bad); color: #fff; font-size: 12px; display: grid; place-items: center; padding: 0 4px; }
  .star { color: var(--accent); }
  @keyframes glow { 50% { box-shadow: 0 3px 0 #000, 0 0 0 4px rgba(245, 184, 74, 0.35); } }
  @media (prefers-reduced-motion: reduce) { .label.gold { animation: none; } }
  .zone::before, .prop::before { content: ''; position: absolute; inset: -6px; }
  .gtoast.mail { border-color: var(--accent); }
  .gtoast { position: absolute; top: 60px; left: var(--s4); right: var(--s4); z-index: 7; margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); color: var(--text); font-weight: 700; text-align: center; }
  .top { position: absolute; top: 0; left: 0; right: 0; z-index: 6; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s4); }
  .ttl { color: #fff; font-size: var(--fs-title); text-shadow: 0 1px 2px #000, 0 0 6px rgba(0, 0, 0, 0.8); white-space: nowrap; flex: none; }
  .sp2 { flex: 1; }
  .gear { width: 40px; height: 40px; margin: 0 -4px 0 0; position: relative; border: 0; border-radius: 20px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: 18px; display: grid; place-items: center; }
  .gear::before { content: ''; position: absolute; inset: -4px; }
  .slab { font-size: var(--fs-small); font-weight: 700; color: var(--text-2); }
  .pill { display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .info { padding: var(--s2) var(--s4) 0; display: flex; flex-direction: column; gap: var(--s3); }
  .card { display: flex; gap: var(--s3); align-items: center; text-align: left; padding: var(--s3); border-radius: 14px; border: 0; background: var(--surface); color: var(--text); font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .card:active { transform: translateY(2px); box-shadow: none; }
  .pic { position: relative; flex: none; display: grid; place-items: center; width: 96px; height: 80px; }
  .hsp { display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  .enh { position: absolute; right: 0; top: 0; padding: 0 6px; border-radius: 10px; background: var(--accent); color: var(--on-accent); font-size: var(--fs-small); }
  .who { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .nm { display: flex; gap: var(--s1); align-items: baseline; flex-wrap: wrap; }
  .nm b { font-size: 17px; }
  .tt { font-style: normal; font-size: var(--fs-small); color: var(--accent); }
  .sub { font-size: var(--fs-small); color: var(--text-2); overflow-wrap: anywhere; }
  .lv { display: flex; align-items: center; gap: var(--s1); font-size: var(--fs-small); }
  .lv small { color: var(--text-2); }
  .xp { flex: 1; min-width: 40px; height: 8px; border-radius: 4px; background: var(--surface-2); display: block; }
  .xp i { display: block; height: 8px; border-radius: 4px; background: var(--accent); }
  .ladder { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .rung { position: relative; min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: var(--s1); border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface); color: var(--text); font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rung b { font-size: var(--fs-small); color: var(--text-2); }
  .rung span { font-size: var(--fs-small); font-weight: 700; text-align: center; overflow-wrap: anywhere; }
  .rung small { font-size: var(--fs-small); color: var(--text-2); }
  .rung.equip { border-color: var(--accent); }
  .rung.equip small { color: var(--accent); font-weight: 700; }
  .rung.own small { color: var(--ok); }
  .rung.buy { border-style: dashed; border-color: var(--gem); }
  .rung.lock { opacity: 0.45; box-shadow: none; }
  .bdot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 4px; background: var(--gem); }
  .next { margin: 0; font-size: var(--fs-small); color: var(--text-2); text-align: center; }
  .floor { min-height: 64px; border-radius: var(--r); background: var(--surface-2); display: flex; align-items: center; gap: var(--s3); padding: 0 14px; }
  .floor.off { opacity: 0.55; }
  .floor .no { width: 38px; height: 38px; border-radius: 10px; background: var(--bg); display: grid; place-items: center; font-weight: 700; flex: none; }
  .floor b { display: block; }
  .floor span span { font-size: var(--fs-small); color: var(--text-2); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s5) 0; color: var(--text-2); }
  .empty .ic { font-size: 40px; }
  .empty p { margin: 0; }
</style>
