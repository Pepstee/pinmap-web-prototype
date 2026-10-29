// 마이 하위 페이지 (mysub.js 다음에 불러와요)
// 마이에서 누르는 기능은 아래에서 올라오는 시트 대신 새 페이지로 열리고, 왼쪽 위 ← 로 마이로 돌아가요.
// 현재 위치 · 관심 키워드 · 알림 · 저장 · 위치/지도 · 저장하는 방법 · 앱 정보 · 핀맵 계정 설정

const MY_PAGES = {placeset:'위치 설정', interestset:'관심 키워드 설정', notiset:'알림 설정', saveset:'저장 설정', mapset:'위치 · 지도', guide:'이용 가이드', howtopage:'저장하는 방법', appinfo:'앱 정보', account:'핀맵 계정 설정'};
Object.entries(MY_PAGES).forEach(([k, v]) => { PARENT_TAB[k] = 'my'; pageName[k] = v; });
const myPage = (title, body, cls = '', back = 'my') => `<div class="mypage ${cls}">${subHead(title, back)}${body}</div>`;

/* ---------- 마이 첫 화면: 'SNS에서 바로 저장해보기' 빼고, 문구 · 메뉴 정리 ---------- */
const myBase = pages.my;
pages.my = function(){
  return myBase()
    .replace(/<button class="sharepromo"[\s\S]*?<\/button>\s*/, '')
    .replace('관심사 · 활용 목적', '관심 키워드 설정')
    .replace(/<button class="logout"[^>]*>[\s\S]*?<\/button>/, '')
    .replace(/(<section class="mgroup"><h2>도움말<\/h2>[\s\S]*?)(<\/section>)/, `$1${myRow('account', '👤', '핀맵 계정 설정')}$2`);
};

/* ---------- 현재 위치 ---------- */
const placeSheetBase = placeSheet;
function placeBody(){
  const p = myPlaces();
  const rows = p.map((name, i) => `<div class="prow">
      <button class="pradio ${i===0?'on':''}" data-place-pick="${i}" role="radio" aria-checked="${i===0}" aria-label="${esc(name)} 선택"></button>
      <button class="pname" data-place-pick="${i}"><b>${esc(name)}</b><small>${esc(dongOf(name).full)}${i===0?' · 현재 위치':''}</small></button>
      <button class="picon" data-place-edit="${i}" aria-label="${esc(name)} 수정">${icon('edit')}</button>
      <button class="picon" data-place-del="${i}" aria-label="${esc(name)} 삭제" ${p.length===1?'disabled':''}>${icon('close')}</button>
    </div>`).join('');
  return `<p class="muted psub">최대 ${MAX_PLACES}개의 위치를 선택할 수 있어요.</p>
    <div class="mycard plist" role="radiogroup" aria-label="현재 위치">${rows}</div>
    ${p.length < MAX_PLACES ? `<button class="padd" data-action="placeadd">${icon('plus')} 위치 추가</button>` : `<p class="hint pfull">위치를 바꾸려면 ✎ 수정을 누르거나, 하나를 삭제한 뒤 추가하세요.</p>`}
    ${p.length===1 ? '<p class="hint pfull">위치는 최소 1개가 필요해서 삭제할 수 없어요.</p>' : ''}`;
}
pages.placeset = () => myPage('위치 설정', placeBody(), 'placepage');
// 이 페이지에 있을 때는 시트 대신 페이지를 다시 그려요 (홈 상단에서 열 때는 지금처럼 시트)
placeSheet = function(){ if (page === 'placeset' && !detailId) { if ($('#sheet').open) $('#sheet').close(); render(); } else placeSheetBase(); };
const placeSheetAction = actions.placesheet;
actions.placesheet = () => { if (page === 'placeset') placeSheet(); else placeSheetAction(); };

/* ---------- 관심 키워드 설정 (온보딩으로 가지 않고 이 페이지에서 바로 바꿔요) ---------- */
pages.interestset = function(){
  const opts = interestOptions.filter(o => o.id !== 'later');
  return myPage('관심 키워드 설정', `
    <p class="muted mpdesc">고른 키워드에 맞는 저장 콘텐츠를 홈에서 먼저 보여드려요. 복수 선택이 가능해요!</p>
    <div class="kwgrid" role="group" aria-label="관심 키워드">${opts.map(o => { const on = preferences.includes(o.id);
      return `<button class="kwopt ${on ? 'on' : ''}" data-kw="${o.id}" role="checkbox" aria-checked="${on}"><span class="kwico" aria-hidden="true">${o.emoji}</span><span>${o.short}</span></button>`; }).join('')}</div>
    <p class="hint mpnote">${preferences.length ? `${preferences.length}개 선택됨 · 바로 저장돼요` : '아무것도 고르지 않으면 홈에서 랜덤으로 추천해요'}</p>`);
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-kw]'); if (!b) return;
  const id = b.dataset.kw;
  preferences = preferences.includes(id) ? preferences.filter(x => x !== id) : [...preferences, id];
  homeViewIds = null; afterChange(); render();
});
actions.interests = () => go('interestset');

/* ---------- 알림 · 저장 · 위치/지도 설정 ---------- */
function pageFromModal(fn){ // my.js의 시트 내용을 그대로 페이지에 넣어요
  const realModal = modal; let html = '';
  modal = (t, body) => { html = body; };
  try { fn(); } finally { modal = realModal; }
  return html;
}
pages.notiset = () => myPage('알림 설정', pageFromModal(notiSettings));
pages.saveset = () => myPage('저장 설정', pageFromModal(saveSettings));
pages.mapset = () => myPage('위치 · 지도', pageFromModal(mapSettings));
Object.assign(actions, {
  placesheetmy: () => go('placeset'),
  notisheet: () => go('notiset'),
  notisettings: () => go('notiset'),
  savesheet: () => go('saveset'),
  mapsheet: () => go('mapset'),
  appinfo: () => go('appinfo'),
  account: () => go('account'),
  guide: () => go('guide'),
  howto: () => go('howtopage')
});
// 마이의 '현재 위치' 줄은 페이지로 (홈 상단의 위치 버튼은 지금처럼 시트)
document.addEventListener('click', e => {
  const b = e.target.closest('.mgroup [data-action="placesheet"]');
  if (b && page === 'my') { e.stopImmediatePropagation(); go('placeset'); }
}, true);

/* ---------- 앱 정보 ---------- */
pages.appinfo = () => myPage('앱 정보', `<div class="mycard settings">
    <div class="setrow"><div><b>핀맵</b><small>저장을 다시, 일상으로</small></div></div>
    <div class="setrow"><div><b>버전</b><small>Prototype 03</small></div></div>
    <div class="setrow"><div><b>데이터 보관</b><small>예시 데이터로 체험하는 프로토타입이에요. 데이터는 이 브라우저에만 저장돼요.</small></div></div>
  </div>`);

/* ---------- 이용 가이드 ---------- */
pages.guide = () => myPage('이용 가이드', `<p class="muted mpdesc">핀맵 사용 방법을 언제든 다시 확인해 보세요.</p>
  <section class="mgroup" aria-label="다시 보기 안내">
    ${myRow('howto','📲','저장하는 방법 다시 보기')}
    ${myRow('coachagain','👆','홈 화면 튜토리얼 다시 보기')}
    ${myRow('intro','👋','온보딩 다시 보기')}
  </section>`);

/* ---------- 저장하는 방법 (온보딩 2번째 화면 내용만 · 다음 단계로 넘어가지 않아요) ---------- */
pages.howtopage = function(){
  const keep = onboardStep; onboardStep = 1;
  const html = onboardScreen().replace(/<div class="ob-actions">[\s\S]*?<\/div>\s*$/, '')
    // 제목은 '저장하는 방법 다시 보기', 온보딩 제목은 그 아래 서브 문구로
    .replace(/<h1 class="ob-title"[^>]*>[\s\S]*?<\/h1>/, '<h1 class="ob-title">저장하는 방법 다시 보기</h1><p class="ob-desc howtosub">마음에 드는 콘텐츠를 발견했다면?</p>');
  onboardStep = keep;
  return myPage('', `<div class="ob-screen step2 howtobody">${html}
    <div class="ob-actions"><button class="filled ob-next" data-action="snsdemo">SNS 저장 체험 해보기</button></div></div>`, 'howtopage', 'guide');
};

/* ---------- 핀맵 계정 설정: 로그아웃 · 탈퇴하기 (한 번 더 묻는 팝업) ---------- */
pages.account = () => myPage('핀맵 계정 설정', `<div class="mycard settings">
    <button class="setrow" data-action="logoutask"><div><b>로그아웃</b><small>이 기기에서 핀맵 계정을 로그아웃해요</small></div>${icon('chevright')}</button>
    <button class="setrow danger" data-action="leaveask"><div><b>탈퇴하기</b><small>저장한 콘텐츠와 설정이 모두 지워져요</small></div>${icon('chevright')}</button>
  </div>`);
// 확인(회색 · 왼쪽) / 유지하기(검정 · 오른쪽)
function confirmPop(title, desc, okAction){
  modal('', `<div class="cfpop"><b>${title}</b><p>${desc}</p>
    <div class="cfpopbtns"><button class="cfok" data-action="${okAction}">확인</button><button class="cfkeep" data-action="close">유지하기</button></div></div>`);
  $('#sheet').classList.add('confirmpop');
}
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('confirmpop'));
Object.assign(actions, {
  logoutask: () => confirmPop('로그아웃하시겠습니까?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes'),
  leaveask: () => confirmPop('탈퇴하시겠습니까?', '탈퇴하면 저장한 콘텐츠와 설정이 모두 지워지고 되돌릴 수 없어요.', 'leaveyes'),
  logoutyes: () => { $('#sheet').close(); go('home'); toast('로그아웃했어요. (체험)'); openOnboarding(0); },
  leaveyes: () => { try { [STORAGE, ...LEGACY_KEYS].forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); },
  resetask: () => confirmPop('저장 데이터를 초기화하시겠습니까?', '이 브라우저에 저장한 콘텐츠, 관심사, 설정이 모두 지워지고 예시 상태로 돌아가요.', 'resetdata')
});

/* ---------- 온보딩 다시 보기: 처음 온보딩과 따로 · 고른 관심사는 반영하지 않고 끝나면 마이로 ---------- */
actions.intro = () => openOnboardingPreview();
