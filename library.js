// 저장목록 화면과 그 안의 컬렉션
NAV[2][2] = '저장목록'; pageName.library = '저장목록';
// app.js의 pages.library와 resultCards를 이 파일에서 다시 정의합니다.

// 추가 아이콘
Object.assign(paths, {
  chevron:'m6 9 6 6 6-6', chevleft:'M15 5l-7 7 7 7',
  nodes:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  pen:'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  trash:'M3 6h18 M8 6V4h8v2 M6 6l1 15h10l1-15 M10 10v7 M14 10v7'
});
let libSelectionMode = false;
const libSelected = new Set();
let libSwipe = null;
let libSuppressClickUntil = 0;
function resetLibrarySelection(){libSelectionMode=false;libSelected.clear();}
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
const LIB_PHOTOS_BY_ID = {
  1:'img/cafe.jpg',  // 햇살이 머무는 성수 카페
  2:'img/lamp.jpg',  // 작은 방을 바꾸는 조명
  6:'img/park.jpg',  // 서울숲에서 잠깐 쉬어가기
  4:'img/exhibit.jpg', // 초록 사이, 주말의 전시
  7:'img/tart.jpg',  // 댓글에서 발견한 카페
  8:'img/brunch.jpg' // 골목 안 작은 브런치 식당
};
const libPhoto = x => x.photo || LIB_PHOTOS_BY_ID[x.id] || LIB_PHOTOS[x.art];
const libThumb = x => libPhoto(x)
  ? `<img src="${esc(libPhoto(x))}" alt="" loading="lazy">` : art(x.art);
function libCard(x, gallery){
  const ratio = gallery ? [1.2,1.5,1.3,1.6][x.id % 4] : 2.1;
  const selectable = page==='library' && !detailId && libSelectionMode;
  const selected = selectable && libSelected.has(x.id);
  return `<div class="libcard ${selected?'selected':''}" role="button" tabindex="0" data-detail="${x.id}" aria-label="${esc(x.title)} ${selectable?(selected?'선택 해제':'선택'):'상세 보기'}" ${selectable?`aria-pressed="${selected}"`:''}>
    <div class="libart" style="aspect-ratio:${ratio}">${libThumb(x)}${selectable?`<span class="libcheck" aria-hidden="true">${selected?icon('check'):''}</span>`:''}</div>
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
  const title = collection ? esc(collection) : '저장목록';
  const sub = collection ? '하나의 계획으로 연결되는 다양한 취향' : '필요한 순간을 위해 모아둔 콘텐츠';
  const chipRow = `<div class="libchips" role="group" aria-label="카테고리 필터">${categories.map(c =>
    `<button class="libchip ${filter===c?'on':''}" data-filter="${c}" aria-pressed="${filter===c}">${c}</button>`).join('')}</div>`;
  const cols = collection ? '' : `<div class="libcols" aria-label="내 컬렉션">${collectionNames().map(n =>
    `<button class="libcol" data-collection="${esc(n)}">${icon('folder')}${esc(n)} <span>${items.filter(x => inCollection(x,n)).length}</span></button>`).join('')}</div>`;
  return `<div class="libpage ${libSelectionMode?'selecting':''}">
    ${collection ? `<button class="back" data-page="library">${icon('back')} 전체 저장목록</button>` : ''}
    <div class="libhead"><h1>${title}</h1></div>
    <label class="libsearch">${icon('search')}<input id="search" aria-label="저장 콘텐츠 검색" placeholder="저장한 콘텐츠 찾기" value="${esc(query)}"><button class="iconbtn" data-action="clear" aria-label="검색 지우기" ${query?'':'hidden'}>${icon('close')}</button></label>
    ${chipRow}
    ${cols}
    <div class="libsection">
      <h2>저장된 콘텐츠 <span id="resultcount" class="libcount">${filtered().length}</span></h2>
      <div class="libtools">${libSelectionMode?'':`<label class="libsort"><span class="sr">정렬</span><select data-libsort>${Object.entries(LIB_SORTS).map(([k,v]) => `<option value="${k}" ${libSort===k?'selected':''}>${v}</option>`).join('')}</select>${icon('chevron')}</label>`}<button class="lib-select-toggle" data-libselect-toggle aria-pressed="${libSelectionMode}">${libSelectionMode?'취소':'선택'}</button></div>
    </div>
    <div id="results" class="libgrid ${galleryMode()?'gallerymode':''}">${resultCards()}</div>
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

/* ---------- 저장목록에서 선택한 콘텐츠를 정리 ---------- */
function libSelectionControls(){
  const count=libSelected.size;
  return `<div class="lib-selection-actions" role="group" aria-label="선택한 콘텐츠 작업">
    <button class="collectionfab" data-lib-collection-open aria-label="선택한 ${count}개를 컬렉션에 추가" ${count?'':'disabled'}>${icon('folder')}<span>컬렉션</span></button>
    <button class="deletefab" data-lib-trash aria-label="선택한 ${count}개 삭제" ${count?'':'disabled'}>${icon('trash')}<span>삭제</span>${count?`<span class="deletefab-count" aria-hidden="true">${count}</span>`:''}</button>
  </div>`;
}
function libRefreshSelection(){
  const y=scrollY; render(); scrollTo(0,y);
}
function libToggleCard(id){
  if(libSelected.has(id))libSelected.delete(id);else libSelected.add(id);
  libRefreshSelection();
}
function libDeleteSheet(){
  const chosen=items.filter(x=>libSelected.has(x.id));
  if(!chosen.length){toast('삭제할 콘텐츠를 먼저 선택해 주세요.');return;}
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>선택한 ${chosen.length}개를 삭제할까요?</h2><p>저장목록에서 콘텐츠와 메모가 삭제돼요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><div class="delitem"><span class="delthumb">${libThumb(chosen[0])}</span><span><b>${esc(chosen[0].title)}${chosen.length>1?` 외 ${chosen.length-1}개`:''}</b><small>원본 SNS 게시물은 그대로 남아요.</small></span></div></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-lib-delete-confirm>삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
}
function libCollectionSheet(){
  const chosen=items.filter(x=>libSelected.has(x.id));
  if(!chosen.length){toast('컬렉션에 넣을 콘텐츠를 먼저 선택해 주세요.');return;}
  modal('', `<div class="esform colsheet">
    <div class="eshead"><span class="esicon" aria-hidden="true">${icon('folder')}</span><div><h2>컬렉션에 추가</h2><p>선택한 ${chosen.length}개 콘텐츠를 정리해요.</p></div><button type="button" class="esclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><p class="colsheet-hint">기존 컬렉션에서도 계속 볼 수 있어요.</p>
      <div class="colsheet-list" role="group" aria-label="기존 컬렉션 선택">${collectionNames().map(name=>`<button type="button" data-lib-collection-target="${esc(name)}">${icon('folder')}<span><b>${esc(name)}</b><small>${items.filter(x=>inCollection(x,name)).length}개 콘텐츠</small></span>${icon('arrow')}</button>`).join('')}</div>
      <form id="lib-new-collection-form" class="colsheet-new"><label for="lib-new-collection-name">새 컬렉션 만들기</label><div><input id="lib-new-collection-name" name="name" maxlength="30" placeholder="컬렉션 이름" autocomplete="off" required><button type="submit">만들고 추가</button></div><p class="colsheet-error" role="alert" hidden></p></form>
    </div>
  </div>`);
  $('#sheet').classList.add('editsheet');
}
function libAddSelectionToCollection(name){
  const chosen=items.filter(x=>libSelected.has(x.id));
  let added=0;
  for(const x of chosen)if(addItemCollection(x,name))added++;
  if(added)afterChange();
  $('#sheet').close();resetLibrarySelection();collection=name;filter='전체';query='';render();scrollTo(0,0);
  toast(added?`${added}개를 ‘${name}’ 컬렉션에 추가했어요.`:`선택한 콘텐츠가 이미 ‘${name}’에 있어요.`);
}
// 사진 앱처럼 손가락이나 마우스로 여러 카드를 쓸어 선택합니다.
function libCardAt(x,y){
  return document.elementFromPoint(x,y)?.closest('.libpage.selecting .libcard[data-detail]');
}
function libVisitSwipe(x,y){
  if(!libSwipe)return;
  const last=libSwipe.last;
  const steps=Math.max(1,Math.ceil(Math.hypot(x-last.x,y-last.y)/12));
  for(let i=1;i<=steps;i++){
    const card=libCardAt(last.x+(x-last.x)*i/steps,last.y+(y-last.y)*i/steps);
    if(card){libSwipe.ids.add(Number(card.dataset.detail));card.classList.add('sweep-preview');}
  }
  libSwipe.last={x,y};
}
function libFinishSwipe(x,y){
  if(!libSwipe)return;
  const swipe=libSwipe;
  libVisitSwipe(x,y);
  libSwipe=null;
  if(!swipe.moved){document.querySelectorAll('.sweep-preview').forEach(c=>c.classList.remove('sweep-preview'));return;}
  for(const id of swipe.ids){if(swipe.select)libSelected.add(id);else libSelected.delete(id);}
  libSuppressClickUntil=performance.now()+450;
  libRefreshSelection();
}
// capture 단계에서 일반 카드 상세 열기보다 먼저 처리합니다.
document.addEventListener('click', e => {
  const toggle=e.target.closest('[data-libselect-toggle]');
  if(toggle){e.preventDefault();e.stopPropagation();libSelectionMode=!libSelectionMode;libSelected.clear();libRefreshSelection();return;}
  const confirm=e.target.closest('[data-lib-delete-confirm]');
  if(confirm){e.preventDefault();e.stopPropagation();const count=libSelected.size;items=items.filter(x=>!libSelected.has(x.id));afterChange();$('#sheet').close();resetLibrarySelection();libRefreshSelection();toast(`${count}개를 저장목록에서 삭제했어요.`);return;}
  const collectionOpen=e.target.closest('[data-lib-collection-open]');
  if(collectionOpen){e.preventDefault();e.stopPropagation();libCollectionSheet();return;}
  const collectionTarget=e.target.closest('[data-lib-collection-target]');
  if(collectionTarget){e.preventDefault();e.stopPropagation();libAddSelectionToCollection(collectionTarget.dataset.libCollectionTarget);return;}
  const trash=e.target.closest('[data-lib-trash]');
  if(trash){e.preventDefault();e.stopPropagation();libDeleteSheet();return;}
  const card=e.target.closest('.libpage.selecting .libcard[data-detail]');
  if(card){e.preventDefault();e.stopPropagation();if(performance.now()<libSuppressClickUntil)return;libToggleCard(Number(card.dataset.detail));}
},true);
document.addEventListener('submit',e=>{
  if(e.target.id!=='lib-new-collection-form')return;
  e.preventDefault();e.stopPropagation();
  const name=String(new FormData(e.target).get('name')||'').trim().replace(/\s+/g,' ');
  const error=e.target.querySelector('.colsheet-error');
  if(!name){error.textContent='컬렉션 이름을 입력해 주세요.';error.hidden=false;return;}
  if(collectionNames().some(existing=>existing.toLocaleLowerCase()===name.toLocaleLowerCase())){error.textContent='이미 있는 컬렉션이에요. 위 목록에서 선택해 주세요.';error.hidden=false;return;}
  libAddSelectionToCollection(name);
},true);
document.addEventListener('pointerdown',e=>{
  const card=e.target.closest?.('.libpage.selecting .libcard[data-detail]');
  if(!card||e.button!==0)return;
  const id=Number(card.dataset.detail);
  libSwipe={pointerId:e.pointerId,start:{x:e.clientX,y:e.clientY},last:{x:e.clientX,y:e.clientY},ids:new Set([id]),select:!libSelected.has(id),moved:false};
},true);
document.addEventListener('pointermove',e=>{
  if(!libSwipe||e.pointerId!==libSwipe.pointerId)return;
  if(!libSwipe.moved&&Math.hypot(e.clientX-libSwipe.start.x,e.clientY-libSwipe.start.y)>=9)libSwipe.moved=true;
  if(!libSwipe.moved)return;
  if(e.pointerType==='touch')e.preventDefault();
  libVisitSwipe(e.clientX,e.clientY);
}, {capture:true,passive:false});
document.addEventListener('pointerup',e=>{if(libSwipe&&e.pointerId===libSwipe.pointerId)libFinishSwipe(e.clientX,e.clientY);},true);
document.addEventListener('mouseup',e=>{if(libSwipe)libFinishSwipe(e.clientX,e.clientY);},true);
document.addEventListener('pointercancel',()=>{libSwipe=null;document.querySelectorAll('.sweep-preview').forEach(c=>c.classList.remove('sweep-preview'));},true);
document.addEventListener('dragstart',e=>{if(e.target.closest?.('.libpage.selecting .libcard'))e.preventDefault();},true);
// 카드(div)도 키보드 Enter · Space로 열거나 선택할 수 있습니다.
document.addEventListener('keydown', e => {
  const c = e.target.closest?.('.libcard[data-detail]');
  if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); c.click();
});
