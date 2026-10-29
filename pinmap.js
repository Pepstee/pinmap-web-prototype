// 핀맵 · 브라우저 저장, 온보딩, 관심사 기반 홈. 빌드 도구나 외부 API 없이 동작합니다.
const STORAGE = PM_ENV.storageKey;
const LEGACY_KEYS = PM_ENV.development ? [] : ['pinmap.v2', 'pinmap.v1'];

// 온보딩 3단계에서 고르는 관심사 · 활용 목적 (홈 구성에 사용)
const interestOptions = [
  {id:'nearby', emoji:'📍', label:'주변에 갈 곳을 찾을 때', short:'주변 장소'},
  {id:'plan',   emoji:'🗓️', label:'여행이나 약속을 계획할 때', short:'여행·약속'},
  {id:'shop',   emoji:'🛍️', label:'사고 싶은 것을 찾을 때', short:'쇼핑'},
  {id:'food',   emoji:'🍴', label:'먹을 곳을 찾을 때', short:'맛집'},
  {id:'study',  emoji:'📚', label:'공부/자료를 찾을 때', short:'공부·자료'},
  {id:'idea',   emoji:'💡', label:'아이디어를 찾을 때', short:'아이디어'},
  {id:'later',  emoji:'🔖', label:'기타', short:'나중에 보기'}
];
const interestIds = interestOptions.map(x => x.id);
const MAX_INTERESTS = Infinity; // 관심사 키워드 개수 제한 없음
const interestOf = id => interestOptions.find(x => x.id === id);
let preferences = [], onboardStep = 0, onboardDone = false, onboardDraft = [], onboardTimer = null;

/* ---------- 브라우저 저장 · 이전 버전 변환 ---------- */
// 이전 유형(장소·상품·글·영상)을 새 저장 카테고리로 바꿉니다.
function migrateType(x){
  if (typeIds.includes(x.type)) return x.type;
  if (x.type === '장소') return /전시|팝업/.test(x.category) ? '전시·팝업' : /산책|여행|숙소/.test(x.category) ? '여행' : '맛집·카페';
  return {'상품':'쇼핑','글·영상':'생활 정보'}[x.type] || (x.type === '레시피' ? '레시피' : '기타');
}
const validItems = list => Array.isArray(list) && list.every(x => x && Number.isFinite(x.id) && typeof x.title === 'string');
try {
  const saved = PM_ENV.development ? null : JSON.parse(localStorage.getItem(STORAGE));
  if (saved && validItems(saved.items) && saved.items.every(x => typeIds.includes(x.type))) {
    items = saved.items;
    preferences = Array.isArray(saved.preferences) ? saved.preferences.filter(x => interestIds.includes(x)).slice(0, MAX_INTERESTS) : [];
    onboardDone = saved.onboardDone === true;
    if (saved.settings && typeof saved.settings === 'object') settings = {...settings, ...saved.settings};
  } else {
    // 이전 버전의 저장 콘텐츠는 유지하고, 예시 콘텐츠의 새 정보(가격·기간 등)를 채웁니다.
    for (const key of LEGACY_KEYS) {
      const old = JSON.parse(localStorage.getItem(key));
      if (!old || !validItems(old.items)) continue;
      const samples = new Map(items.map(x => [x.id, x]));
      const migrated = old.items.map(x => {
        const s = samples.get(x.id), type = migrateType(x);
        const m = s ? {...s, ...x, type, category: s.category, art: s.art} : {...x, type, category: x.category && x.category !== x.type ? x.category : shortType(type)};
        if (m.type !== '장소' && !typeOf(m.type).place) delete m.pending;
        return m;
      });
      const ids = new Set(migrated.map(x => x.id));
      items = [...migrated, ...items.filter(x => !ids.has(x.id))];
      break;
    }
  }
} catch { /* 저장 공간을 쓸 수 없는 브라우저에서도 현재 화면에서는 동작합니다. */ }
function persist() {
  if(PM_ENV.development)return;
  try { localStorage.setItem(STORAGE, JSON.stringify({items,preferences,onboardDone,settings})); }
  catch { toast('브라우저 저장 공간을 사용할 수 없어 현재 화면에서만 보관합니다.'); }
}
afterChange = persist;

/* ---------- 관심사 기반 홈 ---------- */
// 홈 상단에서 고른 메인 동네 근처의 저장 장소 (place.js의 inMainPlace)
const nearPlaces = () => readyPlaces().filter(x => distanceOf(x) < 999 && inMainPlace(x)).sort((a,b) => distanceOf(a)-distanceOf(b));
const homeSections = {
  nearby: () => ({
    title:'지금 내 주변, 저장해둔 곳', sub:`${esc(mainPlace())} 기준 가까운 순`,
    more:'data-page="map"', moreLabel:'지도',
    hero:{title: nearPlaces().length ? '가까이에 저장한 곳' : '이 동네 저장 장소 모으기', desc: nearPlaces().length ? `${esc(mainPlace())} 근처에 저장한 장소 ${nearPlaces().length}곳` : `${esc(mainPlace())} 근처에는 아직 저장한 장소가 없어요`, btn:'지도에서 보기', attr:'data-page="map"'},
    list: nearPlaces()
  }),
  plan: () => ({
    title:'계획에 바로 쓰는 콘텐츠', sub:'마감이 있는 일정과 주말·여행 후보',
    more:'data-collection="이번 주말 성수"', moreLabel:'모음',
    hero:{title:'주말엔 저장해둔 성수로', desc:'카페부터 전시까지, 모아둔 후보로 하루를 계획해요.', btn:'모아둔 콘텐츠 보기', attr:'data-collection="이번 주말 성수"'},
    list: items.filter(x => !x.pending && (x.collection==='이번 주말 성수' || x.type==='여행' || x.deadline)).sort((a,b) => (b.deadline?1:0)-(a.deadline?1:0))
  }),
  shop: () => ({
    title:'사고 싶었던 것', sub:'장바구니 대신 저장해둔 상품',
    more:'data-libfilter="쇼핑"', moreLabel:'쇼핑', gallery:true,
    hero:{title:'사고 싶던 물건 모아보기', desc:'저장해둔 상품의 가격과 구매처를 한곳에서.', btn:'쇼핑 모아보기', attr:'data-libfilter="쇼핑"'},
    list: items.filter(x => x.type==='쇼핑')
  }),
  food: () => ({
    title:'오늘 뭐 먹지?', sub:'저장한 맛집·카페와 레시피',
    more:'data-libfilter="맛집·카페"', moreLabel:'맛집·카페',
    hero:{title:'나만의 맛집 리스트', desc:'저장한 맛집·카페와 레시피를 모았어요.', btn:'맛집·카페 보기', attr:'data-libfilter="맛집·카페"'},
    list: items.filter(x => !x.pending && (x.type==='맛집·카페' || x.type==='레시피'))
  }),
  study: () => ({
    title:'다시 볼 공부·자료', sub:'저장해둔 생활 정보와 레퍼런스',
    more:'data-libfilter="생활 정보"', moreLabel:'생활 정보', gallery:true,
    hero:{title:'공부 자료 모아뒀어요', desc:'나중에 보려던 글과 영상을 다시 꺼내보세요.', btn:'자료 보기', attr:'data-libfilter="생활 정보"'},
    list: items.filter(x => x.type==='생활 정보' || x.type==='기타')
  }),
  idea: () => ({
    title:'영감이 필요할 때', sub:'레시피부터 생활 정보까지, 일상의 아이디어',
    more:'data-collection="일상에 영감"', moreLabel:'모음', gallery:true,
    hero:{title:'막힐 때 보는 영감 모음', desc:'저장해둔 아이디어로 새로운 하루를 시작해요.', btn:'영감 모음 보기', attr:'data-collection="일상에 영감"'},
    list: items.filter(x => x.collection==='일상에 영감' || x.type==='생활 정보')
  }),
  later: () => ({
    title:'다시 꺼내볼 때가 됐어요', sub:'저장한 지 오래된 콘텐츠부터',
    more:'data-page="library"', moreLabel:'컬렉션',
    hero:{title:'잊고 있던 저장 꺼내기', desc:'오래전에 담아둔 콘텐츠를 모았어요.', btn:'컬렉션 보기', attr:'data-page="library"'},
    list: [...items].reverse()
  })
};
// 마감 임박 배너: 현재 위치 바로 아래, 홈 제목 위에 표시합니다.
const dday = x => Number(String(x.deadline||'').replace(/\D/g,'')) || 99;
function dueBar() {
  const due = items.filter(x => x.deadline).sort((a,b) => dday(a)-dday(b));
  if (!due.length || dueDismissed) return '';
  const x = due[0];
  return `<div class="duebar" role="status"><button class="duemain" data-detail="${x.id}"><span class="duebadge">${esc(x.deadline)}</span><span class="duetext"><b>${esc(x.title)}</b><small>마감이 얼마 남지 않았어요${due.length>1?` · 외 ${due.length-1}개`:''}</small></span>${icon('arrow')}</button><button class="dueclose" data-action="duedismiss" aria-label="마감 임박 알림 닫기">${icon('close')}</button></div>`;
}
// 홈에서 지금 보고 있는 관심사 (저장하지 않아요 · 앱을 다시 열면 기본값으로 돌아와요)
let homeViewIds = null;
const homeView = () => (homeViewIds ??= [...preferences]);
actions.homeintreset = () => { homeViewIds = null; render(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-homeint]'); if (!b) return;
  const id = b.dataset.homeint, v = homeView();
  if (v.includes(id) && v.length === 1) { toast('관심사를 하나 이상 선택해 주세요.'); return; }
  if (!v.includes(id) && v.length >= MAX_INTERESTS) { toast(`관심사는 한 번에 최대 ${MAX_INTERESTS}개까지 볼 수 있어요.`); return; }
  homeViewIds = v.includes(id) ? v.filter(x => x !== id) : [...v, id];
  const y = window.scrollY; render(); window.scrollTo(0, y);
});
pages.home = function() {
  const view = homeView(), active = view.length ? view : ['nearby','plan','later'];
  // 섹션끼리 같은 카드가 반복되지 않도록, 위에서 보여준 콘텐츠는 뒤로 미룹니다.
  const seen = new Set();
  const sections = active.map(id => {
    const s = {id, ...homeSections[id]()};
    const fresh = s.list.filter(x => !seen.has(x.id));
    const n = fresh.length >= 2 ? Math.min(4, fresh.length) : Math.min(2, s.list.length);
    s.list = [...fresh, ...s.list.filter(x => seen.has(x.id))].slice(0, n);
    s.list.forEach(x => seen.add(x.id));
    return s;
  });
  // 관심사 키워드: 모두 보여주고, 누른 키워드만 홈에 표시 (기본값 = 마이에서 정한 관심사)
  const isDefault = view.length === preferences.length && view.every(id => preferences.includes(id));
  const prefRow = `<div class="prefchips" role="group" aria-label="홈에서 볼 관심사">${[...interestOptions].sort((a,b) => (preferences.includes(b.id)?1:0)-(preferences.includes(a.id)?1:0)).map(o => { const on = view.includes(o.id); return `<button class="prefchip ${on?'on':''}" data-homeint="${o.id}" aria-pressed="${on}">${o.emoji} ${o.short}</button>`; }).join('')}${preferences.length && !isDefault ? '<button class="prefreset" data-action="homeintreset">기본값으로</button>' : ''}</div>`;
  // 켜진 관심사마다 추천 카드 1장 · 좌우로 넘겨서 봐요
  const hero = `<div class="herocar" aria-label="관심사별 추천 카드">${sections.map(s2 => `<section class="forhero" data-hero="${s2.id}"><div class="forhero-emoji" aria-hidden="true">${interestOf(s2.id).emoji}</div><div class="fhbody"><h2>${s2.hero.title}</h2><p>${s2.hero.desc}</p><button class="filled" ${s2.hero.attr}>${s2.hero.btn} ${icon('arrow')}</button></div></section>`).join('')}</div>${sections.length > 1 ? `<div class="herodots" aria-hidden="true">${sections.map((_, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div>` : ''}`;
  // 홈 카드는 모두 같은 크기의 2열 격자 (줄마다 위아래 정렬)
  const grid = list => `<div class="grid homegrid">${list.map(card).join('')}</div>`;
  const body = sections.map(s => `<section class="forsection"><div class="sectionhead"><div><h2>${s.title}</h2><p class="muted">${s.sub}</p></div><button class="textbtn" ${s.more}>${s.moreLabel} ${icon('arrow')}</button></div>${s.list.length ? grid(s.list) : `<div class="empty small"><p class="muted">아직 저장한 콘텐츠가 없어요.</p><button class="tonal" data-action="save">새로 저장하기</button></div>`}</section>`).join('');
  const popular = items.filter(x => x.saves && !seen.has(x.id)).sort((a,b) => b.saves-a.saves).slice(0,2);
  popular.forEach(x => seen.add(x.id));
  const recent = items.filter(x => !seen.has(x.id)).slice(0,4);
  return placebar() + dueBar()
    + prefRow + hero + body
    + (popular.length ? `<div class="sectionhead"><h2>저장 수가 많은 콘텐츠</h2><span class="hint">예시 집계</span></div><div class="grid">${popular.map(x => `<div>${card(x)}<p class="hint savecount">${x.saves}명이 저장했어요</p></div>`).join('')}</div>` : '')
    + (recent.length ? `<div class="sectionhead"><h2>그 밖의 최근 저장</h2><button class="textbtn" data-page="library">전체 보기 ${icon('arrow')}</button></div><div class="grid">${recent.map(card).join('')}</div>` : '');
};

/* ---------- 전체 화면 온보딩 (4단계) ---------- */
const photo = (kind, cls='') => `<div class="ob-tile photo ${cls}">${art(kind)}</div>`;
const loader = text => `<div class="ob-loader" role="status"><div class="ob-bar"><i></i></div><p>${text}</p></div>`;
function onboardScreen() {
  const s = onboardStep;
  // 첫 화면: 로고만 심플하게 (화면을 누르면 바로 다음 단계)
  if (s === 0) return `<button class="ob-splash" data-ob="next" aria-label="핀맵 시작"><img src="${PM_IMG.splash}" alt="Pinmap"></button>`;
  if (s === 1) return `
    <h1 class="ob-title" tabindex="-1">마음에 드는 콘텐츠를<br><em>발견</em>했다면?</h1>
    <ol class="ob-flow">
      <li class="ob-flowcard"><div class="ob-flowtext"><h3><span class="ob-num">1</span>콘텐츠 발견</h3><p>SNS에서 마음에 드는 콘텐츠를 찾아요.</p></div>
        <div class="ob-mock ob-post" aria-hidden="true"><div class="ob-postimg">${art('park')}</div><div class="ob-postbar">${icon('heart')}${icon('comment')}<span class="ob-hl"><img class="ob-sendico" src="${PM_IMG.send}" alt=""></span><span class="ob-gap"></span>${icon('more')}</div></div></li>
      <li class="ob-arrow" aria-hidden="true">↓</li>
      <li class="ob-flowcard"><div class="ob-flowtext"><h3><span class="ob-num">2</span>공유하기</h3><p>공유하기 버튼을 눌러주세요.</p></div>
        <div class="ob-mock ob-sheet" aria-hidden="true"><span><i>${icon('link')}</i>링크 복사</span><span><i>${icon('story')}</i>스토리</span><span class="on"><i><img class="ob-sendico" src="${PM_IMG.send}" alt=""></i>공유하기</span><span><i>${icon('comment')}</i>메시지</span></div></li>
      <li class="ob-arrow" aria-hidden="true">↓</li>
      <li class="ob-flowcard"><div class="ob-flowtext"><h3><span class="ob-num">3</span>핀맵으로 보내기</h3><p>[핀맵]을 선택하면 저장 완료!</p></div>
        <div class="ob-mock ob-sheet apps" aria-hidden="true"><span><i>${icon('image')}</i>SNS</span><span class="on"><i class="pin-app"><img src="${PM_IMG.logo}" alt=""></i>핀맵</span><span><i>${icon('more')}</i>더보기</span></div></li>
    </ol>
    <div class="ob-actions"><button class="filled ob-next" data-ob="next">다음</button></div>`;
  if (s === 2) return `
    <h1 class="ob-title" tabindex="-1">저장한 콘텐츠를<br><em>주로 언제 다시 찾아보나요?</em></h1>
    <p class="ob-desc">(복수 선택 가능)</p>
    <div class="ob-options" role="group" aria-label="관심사 · 활용 목적">
      ${interestOptions.filter(o => !o.extra).map(o => { const on = onboardDraft.includes(o.id); return `<button class="ob-option ${on?'on':''}" role="checkbox" aria-checked="${on}" data-ob-interest="${o.id}"><span class="ob-emoji" aria-hidden="true">${o.emoji}</span><span class="ob-label">${o.label}</span></button>`; }).join('')}
    </div>
    <div class="ob-actions"><button class="filled ob-next" data-ob="next">시작하기</button></div>`;
  // 마지막 화면: 문구 없이, 저장 카드에서 핀맵으로 점이 하나씩 채워지며 이어지는 애니메이션
  return '';
}
function drawOnboarding() {
  clearTimeout(onboardTimer);
  const el = $('#onboarding');
  if (!el) return;
  const bare = onboardStep === 0; // 첫 화면은 위쪽 단계 표시 없이
  el.innerHTML = `<div class="ob-screen step${onboardStep+1}${bare ? ' bare' : ''}">
    <div class="ob-top">
      <div class="ob-topleft">${onboardStep===2?`<button class="ob-back" data-ob="back" aria-label="이전">${icon('back')}</button>`:''}<span class="ob-count" aria-label="${onboardStep}단계, 전체 2단계"><b>${onboardStep}</b> / 2</span></div>
      ${'<button class="ob-skip" data-ob="skip">건너뛰기</button>'}
    </div>
    ${onboardScreen()}
  </div>`;
  el.scrollTop = 0;
  el.querySelector('.ob-title')?.focus?.();
  if (onboardStep === 0) onboardTimer = setTimeout(() => { onboardStep = 1; drawOnboarding(); }, 1400);
}
let onboardPreview = false; // 이용 가이드 > 온보딩 다시 보기: 고른 관심사를 반영하지 않고, 끝나면 가이드로
let onboardFull = false; // 처음부터 본 온보딩일 때만 끝나고 튜토리얼을 보여줘요
function openOnboarding(step = 0) {
  onboardFull = step === 0; onboardPreview = false;
  onboardDraft = onboardFull ? [] : [...preferences];
  onboardStep = step;
  if ($('#sheet').open) $('#sheet').close();
  let el = $('#onboarding');
  if (!el) {
    el = document.createElement('section');
    el.id = 'onboarding';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','핀맵 시작하기');
    document.body.append(el);
  }
  document.body.classList.add('onboarding-open');
  $('#app').inert = true;
  drawOnboarding();
}
function closeOnboarding() {
  clearTimeout(onboardTimer);
  $('#onboarding')?.remove();
  document.body.classList.remove('onboarding-open');
  $('#app').inert = false;
}
function finishOnboarding() {
  if (onboardPreview) { onboardPreview = false; closeOnboarding(); go('guide'); return; }
  onboardDone = true;
  persist();
  closeOnboarding();
  go('home');
  // 온보딩이 끝나면 홈 화면 사용법을 코치마크로 간단히 안내해요 (coach.js)
  // 코치마크 1단계는 홈 카드를 가리켜요: 350ms 뒤에도 홈 화면이 열려 있을 때만 시작해요.
  if (onboardFull) setTimeout(() => { if (page === 'home' && !detailId) startCoach(); }, 350);
  else if (preferences.length) toast('관심사 기본값을 바꿨어요.');
}
intro = function() { openOnboarding(0); };
// 온보딩 다시 보기 (처음 온보딩과 같은 화면이지만 연습용: 관심사 저장 안 함 · 끝나면 이용 가이드)
function openOnboardingPreview(){ openOnboarding(0); onboardPreview = true; onboardFull = false; onboardDraft = []; drawOnboarding(); }

actions.interests = () => openOnboarding(2);

document.addEventListener('click',e=>{
  const choice=e.target.closest('[data-ob-interest]');
  if(choice){
    const id=choice.dataset.obInterest;
    if(!onboardDraft.includes(id)&&onboardDraft.length>=MAX_INTERESTS){toast(`관심사는 최대 ${MAX_INTERESTS}개까지 고를 수 있어요.`);return;}
    onboardDraft=onboardDraft.includes(id)?onboardDraft.filter(v=>v!==id):[...onboardDraft,id];
    const on=onboardDraft.includes(id);
    choice.classList.toggle('on',on);choice.setAttribute('aria-checked',on);
    
    
    return;
  }
  const step=e.target.closest('[data-ob]');
  if(!step)return;
  const v=step.dataset.ob;
  if(v==='skip'){if(onboardFull&&!onboardPreview)preferences=[...onboardDraft];homeViewIds=null;finishOnboarding();return;}
  if(v==='back'){onboardStep=Math.max(1,onboardStep-1);drawOnboarding();return;}
  if(v==='next'){
    if(onboardStep===2){if(!onboardPreview){preferences=[...onboardDraft];homeViewIds=null;}finishOnboarding();return;}
    onboardStep=Math.min(2,onboardStep+1);drawOnboarding();
  }
});
render();
// 페이지를 열 때마다 온보딩부터 보여줍니다. (이전에 고른 관심사는 3단계에 미리 선택돼 있어요)
openOnboarding(0);

// 추천 카드 넘길 때 아래 점 표시 갱신
document.addEventListener('scroll', e => {
  const car = e.target.closest?.('.herocar'); if (!car) return;
  const i = Math.round(car.scrollLeft / (car.firstElementChild?.offsetWidth + 10 || 1));
  car.nextElementSibling?.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
}, true);

