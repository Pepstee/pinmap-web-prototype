// 컬렉션(구 저장함) 화면 리디자인 (Figma 시안 반영)
// 하단 메뉴와 화면 이름을 ‘컬렉션’으로 바꿔요
NAV[2][2] = '컬렉션'; pageName.library = '컬렉션';
// 기존 기능(검색 · 카테고리 필터 · 모음 · 갤러리 보기 · 상세 열기 · 새로 저장)은 그대로 쓰고 화면 모양만 바꿉니다.
// app.js의 pages.library와 resultCards를 이 파일에서 다시 정의합니다. 다른 파일은 수정하지 않았어요.

// 추가 아이콘
Object.assign(paths, {
  chevron:'m6 9 6 6 6-6', chevleft:'M15 5l-7 7 7 7',
  nodes:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  pen:'M4 20h4L19 9l-4-4L4 16z M14 6l4 4'
});
let libSort = 'recent'; // 정렬: recent(최신 저장 순) · near(가까운 순)
const LIB_SORTS = {recent:'최신 저장 순', near:'가까운 순'};

// 주소에서 동네 이름만 꺼내기 (예: '서울 성동구 성수동 · 예시 장소' → '성수동')
// 동·읍·면이 없으면 구·시·군으로 (예: '서울 성동구 뚝섬로 273' → '성동구')
function libArea(x){
  const words = (x.address || '').split('·')[0].trim().split(/\s+/);
  return [...words].reverse().find(w => /(동|읍|면)$/.test(w)) || [...words].reverse().find(w => /(구|시|군)$/.test(w)) || '';
}

// 카드 둘째 줄: 기간 또는 저장 시점 + 동네 · 판매처
function libSub(x){
  const parts = [x.period ? x.period.replace(' · 예시 기간','') + ' 운영' : `${x.ago} 저장`];
  if (isPlace(x) && !x.pending && libArea(x)) parts.push(libArea(x));
  else if (x.type === '쇼핑' && x.shop) parts.push(x.shop);
  else if (!isPlace(x) && x.type !== '쇼핑' && x.type !== '레시피') parts.push(x.desc);
  return parts.filter(Boolean).map(esc).join('<i class="libsep" aria-hidden="true"></i>');
}
// 카드 셋째 줄: 거리 · 가격 · 조리 정보
const libMetaLine = (ic, text, cls='') => `<p class="libmeta m-${ic} ${cls}">${icon(ic)}<span>${esc(text)}</span></p>`;
function libMeta(x){
  if (isPlace(x)) {
    if (x.pending) return libMetaLine('pin', '위치 확인 필요', 'warn');
    return x.distance ? libMetaLine('pin', x.distance) : '';
  }
  if (x.type === '쇼핑' && x.price) return libMetaLine('bookmark', x.price.replace(' · 예시 가격',''));
  if (x.type === '레시피' && x.recipe) return libMetaLine('clock', x.recipe);
  return '';
}
// 카드 사진: img 폴더에 사진이 있으면 사진, 없으면 기존 일러스트 (일러스트 종류별로 연결)
const LIB_PHOTOS = {};
// 예시 콘텐츠별 사진 (id 기준 · 브라우저에 저장된 예전 데이터에도 적용돼요)
const LIB_PHOTOS_BY_ID = PM_ENV.development ? {} : {
  1:'img/cafe-window.jpg',  // 햇살이 머무는 성수 카페 (큰 창 · 햇살)
  2:'img/lamp-orange.jpg',  // 작은 방을 바꾸는 조명
  6:'img/park-picnic.jpg',  // 서울숲에서 잠깐 쉬어가기
  4:'img/exhibit.jpg',      // 초록 사이, 주말의 전시
  7:'img/cafe-corner.jpg',  // 댓글에서 발견한 카페 (골목 모퉁이 디저트 카페)
  8:'img/brunch-toast.jpg', // 골목 안 작은 브런치 식당
  9:'img/sea-room.jpg',     // 바다 앞 작은 숙소
  3:'img/pasta.jpg',        // 15분, 바질 토마토 파스타
  11:'img/desk-organizer.jpg', // 원룸 수납 정리 아이디어
  12:'img/classroom.jpg',   // 2026 하반기 청년 디자인 장학생 모집
  10:'img/tote-bag.jpg',    // 매일 드는 캔버스 토트백
  5:'img/notebook.jpg',     // 취향을 기록하는 방법
  13:'img/popup-store.jpg'  // 성수 오브젝트 팝업 스토어
};
const libPhoto = x => x.photo || (PM_ENV.development ? '' : LIB_PHOTOS_BY_ID[x.id] || LIB_PHOTOS[x.art]);
const libThumb = x => libPhoto(x)
  ? `<img src="${esc(libPhoto(x))}" alt="" loading="lazy">` : art(x.art);
function libCard(x, gallery){
  const ratio = gallery ? [1.2,1.5,1.3,1.6][x.id % 4] : 2.1;
  return `<div class="libcard" role="button" tabindex="0" data-detail="${x.id}" aria-label="${esc(x.title)} 상세 보기">
    <div class="libart" style="aspect-ratio:${ratio}">${libThumb(x)}<button type="button" class="libmark" data-unsave="${x.id}" aria-label="${esc(x.title)} 컬렉션에서 삭제">${icon('bookmark')}</button></div>
    <div class="libbody">
      <h3>${esc(x.title)}</h3>
      <p class="libsub">${libSub(x)}</p>
      ${libMeta(x)}
      <div class="libtags"><span class="libpill">${esc(x.type)}</span>${x.deadline ? `<span class="libpill due">${esc(x.deadline)}</span>` : ''}</div>
    </div>
  </div>`;
}
// 홈 · 지도 등 다른 화면의 카드도 같은 모양으로 (app.js의 card · gcard 대체)
card = x => libCard(x, false);
gcard = x => libCard(x, true);
function libList(){
  const list = filtered();
  return libSort === 'near' ? [...list].sort((a,b) => distanceOf(a) - distanceOf(b)) : list;
}

resultCards = function(){
  const list = libList(), gallery = galleryMode();
  return list.map(x => libCard(x, gallery)).join('')
    || `<div class="empty">${icon('search')}<h3>아직 찾는 콘텐츠가 없어요</h3><p class="muted">다른 키워드나 유형으로 다시 찾아보세요.</p><button class="tonal" data-action="resetfilter">전체 콘텐츠 보기</button></div>`;
};

pages.library = function(){
  const title = collection ? esc(collection) : '컬렉션';
  const sub = collection ? '하나의 계획으로 연결되는 다양한 취향' : '필요한 순간을 위해 모아둔 콘텐츠';
  const chipRow = `<div class="libchips" role="group" aria-label="카테고리 필터">${categories.map(c =>
    `<button class="libchip ${filter===c?'on':''}" data-filter="${c}" aria-pressed="${filter===c}">${c}</button>`).join('')}</div>`;
  const cols = collection ? '' : `<div class="libcols" aria-label="내 모음">${collectionNames().map(n =>
    `<button class="libcol" data-collection="${esc(n)}">${icon('folder')}${esc(n)} <span>${items.filter(x => x.collection===n).length}</span></button>`).join('')}</div>`;
  return `<div class="libpage">
    ${collection ? `<button class="back" data-page="library">${icon('back')} 전체 컬렉션</button>` : ''}
    <div class="libhead"><h1>${title}</h1></div>
    <label class="libsearch">${icon('search')}<input id="search" aria-label="저장 콘텐츠 검색" placeholder="저장한 콘텐츠 찾기" value="${esc(query)}"><button class="iconbtn" data-action="clear" aria-label="검색 지우기" ${query?'':'hidden'}>${icon('close')}</button></label>
    ${chipRow}
    ${cols}
    <div class="libsection">
      <h2>저장된 콘텐츠 <span id="resultcount" class="libcount">${filtered().length}</span></h2>
      <label class="libsort"><span class="sr">정렬</span><select data-libsort>${Object.entries(LIB_SORTS).map(([k,v]) => `<option value="${k}" ${libSort===k?'selected':''}>${v}</option>`).join('')}</select>${icon('chevron')}</label>
    </div>
    <div id="results" class="libgrid ${galleryMode()?'gallerymode':''}">${resultCards()}</div>
    <button class="libfab" data-action="save" aria-label="새로 저장">${icon('plus')}<span>새로 저장</span></button>
  </div>`;
};

// 검색할 때 개수 배지와 지우기 버튼 갱신 (app.js의 검색 처리 다음에 실행돼요)
document.addEventListener('input', e => {
  if (e.target.id !== 'search' || page !== 'library') return;
  const n = $('#resultcount'); if (n) n.textContent = filtered().length;
  const clear = $('.libsearch [data-action="clear"]'); if (clear) clear.hidden = !e.target.value;
});
// 스크롤하는 동안만 보이는 얇은 스크롤 바 (화면 · 팝업 · 온보딩 등 세로로 스크롤되는 모든 곳)
(() => {
  const bar = document.createElement('div');
  bar.id = 'scrollhint'; bar.setAttribute('aria-hidden', 'true');
  let hideTimer;
  addEventListener('scroll', e => {
    const page = e.target === document || e.target === document.documentElement;
    const el = page ? document.documentElement : e.target;
    if (!(el instanceof Element) || el.scrollHeight <= el.clientHeight + 1) return; // 가로 스크롤(칩 줄 등)은 제외
    // 팝업(top layer) 안이면 팝업 안에 붙여야 위에 보여요
    const host = page ? document.body : (el.closest('dialog') || document.body);
    if (bar.parentNode !== host) host.append(bar);
    const r = page ? {top:0, bottom:innerHeight, right:innerWidth} : el.getBoundingClientRect();
    const top = r.top + 8, bottom = page && $('.bottomnav') && getComputedStyle($('.bottomnav')).display !== 'none' ? 92 : 8;
    const track = (r.bottom - r.top) - 8 - bottom, view = el.clientHeight, total = el.scrollHeight;
    const h = Math.max(32, track * view / total);
    const y = top + (track - h) * Math.min(1, el.scrollTop / (total - view));
    Object.assign(bar.style, {height: h + 'px', top: '0px', left: (r.right - 7) + 'px', right: 'auto', transform: `translateY(${y}px)`});
    bar.classList.add('on');
    clearTimeout(hideTimer); hideTimer = setTimeout(() => bar.classList.remove('on'), 700);
  }, {passive: true, capture: true});
})();

// 정렬 바꾸기
document.addEventListener('change', e => {
  if (!e.target.matches('[data-libsort]')) return;
  libSort = e.target.value;
  $('#results').innerHTML = resultCards();
});

/* ---------- 북마크를 눌러 컬렉션에서 삭제 ---------- */
function unsaveSheet(id){
  const x = items.find(i => i.id === id); if (!x) return;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>컬렉션에서 삭제할까요?</h2><p>삭제하면 메모 · 모음 정보도 함께 지워져요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><div class="delitem"><span class="delthumb">${libThumb(x)}</span><span><b>${esc(x.title)}</b><small>${esc(x.type)} · ${esc(x.ago)} 저장</small></span></div>
      <p class="eshint">원본 SNS 게시물은 그대로 남아 있어요.</p></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-delconfirm="${x.id}">삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
}
// 카드 안 북마크 · 삭제 확인은 카드 열기보다 먼저 처리해요
document.addEventListener('click', e => {
  const un = e.target.closest('[data-unsave]');
  if (un) { e.stopPropagation(); e.preventDefault(); unsaveSheet(Number(un.dataset.unsave)); return; }
  const ok = e.target.closest('[data-delconfirm]');
  if (ok) {
    e.stopPropagation();
    const id = Number(ok.dataset.delconfirm), x = items.find(i => i.id === id);
    items = items.filter(i => i.id !== id); afterChange();
    $('#sheet').close();
    if (detailId === id) detailId = null;
    const y = scrollY; render(); scrollTo(0, y);
    toast(`‘${x ? x.title : '콘텐츠'}’을 컬렉션에서 삭제했어요.`);
  }
}, true);
// 카드(div)도 키보드 Enter · Space로 열려요
document.addEventListener('keydown', e => {
  const c = e.target.closest?.('.libcard[data-detail]');
  if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); c.click();
});
