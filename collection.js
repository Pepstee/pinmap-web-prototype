// 컬렉션 화면: 카테고리 폴더 그리드 (library.js 다음, home.js 전에 불러와요)
// 저장 데이터(items)와 카테고리(TYPES)는 그대로 두고, 화면에서만 폴더로 묶어 보여줘요.
// - 모음(collection)을 열었을 때는 library.js의 기존 목록 화면을 그대로 써요.
// - 검색 · 정렬 · 카드 · 삭제는 library.js의 기능을 그대로 재사용해요.

/* ---------- 폴더 정의 ---------- */
Object.assign(paths, {
  fork:'M7 3v8 M4.5 3v5a2.5 2.5 0 0 0 5 0V3 M7 11v10 M17 3c-2.5 2-2.5 8 0 9v9',
  ticket:'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
  plane:'M3 13.5 21 6l-4 14-5-5-3 4v-6z M12 15l9-9',
  bag:'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  folderplus:'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z M12 10.5v6 M9 13.5h6',
  chef:'M7 14a4 4 0 0 1-.7-7.9 5 5 0 0 1 11.4 0A4 4 0 0 1 17 14 M7 14v6h10v-6 M7 17h10'
});
// 칩과 폴더에 쓰는 카테고리 (순서 = 화면 순서)
const CF_FOLDERS = [
  {id:'맛집', icon:'fork'},
  {id:'카페', icon:'coffee'},
  {id:'전시·팝업', icon:'ticket'},
  {id:'여행', icon:'plane'},
  {id:'쇼핑', icon:'bag'},
  {id:'레시피', icon:'chef'}
];
// 생활 정보 · 기타 콘텐츠는 칩 없이, 저장된 게 있을 때만 맨 뒤 폴더로 보여줘요 (데이터가 숨지 않게)
const CF_EXTRA = {id:'기타', icon:'bookmark'};
const CF_ALL = [...CF_FOLDERS, CF_EXTRA];
const CF_GALLERY = new Set(['쇼핑', '레시피', '기타']); // 장소가 아닌 폴더 → 갤러리형 카드

// 저장 콘텐츠 → 폴더 (맛집·카페는 카페 여부로 나눠요)
const cfIsCafe = x => /카페|커피|cafe|coffee|디저트|베이커리/i.test(`${x.category||''} ${x.title||''}`);
function folderOf(x){
  if (x.type === '맛집·카페') return cfIsCafe(x) ? '카페' : '맛집';
  return CF_FOLDERS.some(f => f.id === x.type) ? x.type : '기타';
}
// 다른 화면에서 넘어온 필터(예: 홈의 '맛집·카페')도 폴더로 바꿔요
const CF_ALIAS = {'맛집·카페':['맛집','카페'], '생활 정보':['기타']};
const cfSelected = () => filter === '전체' ? [] : (CF_ALIAS[filter] || (CF_ALL.some(f => f.id === filter) ? [filter] : []));

// 검색어와 선택한 폴더에 맞는 콘텐츠 (items는 최신 저장 순)
function cfMatches(){
  const q = query.trim().toLowerCase(), sel = cfSelected();
  return items.filter(x => (!sel.length || sel.includes(folderOf(x)))
    && (!q || [x.title, x.desc, x.type, x.category, x.collection, x.memo, folderOf(x)].join(' ').toLowerCase().includes(q)));
}

// 썸네일 URL: 사진이 있으면 사진, 없으면 기존 콘텐츠 썸네일(일러스트)을 이미지로
const cfThumbUrl = x => libPhoto(x) || 'data:image/svg+xml,' + encodeURIComponent(art(x.art));
// 최신 콘텐츠 3개 (사진이 있는 콘텐츠를 먼저)
const cfThumbs = list => [...list].sort((a,b) => (libPhoto(b)?1:0) - (libPhoto(a)?1:0)).slice(0, 3).map(cfThumbUrl);

function cfFolderData(list){
  const q = query.trim(), sel = cfSelected();
  let defs = sel.length ? CF_ALL.filter(f => sel.includes(f.id)) : CF_ALL;
  return defs.map(f => {
    const inFolder = list.filter(x => folderOf(x) === f.id);
    return {id:f.id, title:f.id, icon:f.icon, count:inFolder.length, thumbnails:cfThumbs(inFolder), selected:sel.includes(f.id)};
  }).filter(f => f.count || (!q && f.id !== CF_EXTRA.id)); // 검색 중엔 결과가 있는 폴더만
}

/* ---------- CollectionFolder 컴포넌트 ---------- */
// 사진 슬롯 3개는 모든 폴더에서 같은 자리 · 같은 각도 (collection.css의 .cf-slot0~2)
// thumbnails[0] = 가장 최근 → 가운데 맨 앞
const CF_EDGE = 'M0 36.2Q0 27.2 9 27.2L30 27.2C39 27.2 41 37.8 50 37.8L91 37.8Q100 37.8 100 46.8'; // 앞판 위 가장자리 (앞판 top 34%)
function CollectionFolder({id, title, icon:ic, count, thumbnails = [], selected = false, attr}){
  // 있는 사진만 보여줘요 (사진이 없으면 가운데 자리표시 1장)
  const shown = Math.max(1, Math.min(3, thumbnails.length));
  const slot = i => {
    if (i >= shown) return '';
    const src = thumbnails[i];
    return `<span class="cf-photo cf-slot${i}${src ? '' : ' cf-empty'}">${src
      ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('cf-empty');this.remove()">` : ''}</span>`;
  };
  return `<button type="button" class="cf-folder${selected ? ' on' : ''}" ${attr || `data-cffolder="${esc(id)}"`} aria-label="${esc(title)} 폴더, 저장 ${count}개">
    <span class="cf-shell" aria-hidden="true">
      <span class="cf-back"><span class="cf-backshape"></span></span>
      ${[2, 1, 0].map(slot).join('')}
      <svg class="cf-shade" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${CF_EDGE}"/></svg>
      <span class="cf-front"></span>
      <svg class="cf-hi" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${CF_EDGE}"/></svg>
      <span class="cf-icon">${icon(ic)}</span>
    </span>
    <span class="cf-meta"><span class="cf-title">${esc(title)}</span><span class="cf-count">${count}</span></span>
  </button>`;
}
// 폴더 모양 (clipPath · 블러는 한 번만 정의해 모든 폴더가 같이 써요)
const CF_DEFS = `<svg class="cf-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <clipPath id="cfFrontClip" clipPathUnits="objectBoundingBox"><path d="M0 .17Q0 0 .09 0L.3 0C.39 0 .41 .2 .5 .2L.91 .2Q1 .2 1 .37L1 .83Q1 1 .91 1L.09 1Q0 1 0 .83Z"/></clipPath>
  <clipPath id="cfBackClip" clipPathUnits="objectBoundingBox"><path d="M0 .14Q0 0 .09 0L.32 0C.37 0 .39 .07 .44 .07L.91 .07Q1 .07 1 .21L1 .86Q1 1 .91 1L.09 1Q0 1 0 .86Z"/></clipPath>
  <filter id="cfBlur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
</svg>`;

/* ---------- 내가 만든 폴더 (모음과 같은 데이터: item.collection) ---------- */
// 새 폴더 이름은 settings.customFolders에 저장돼요 (pinmap.js가 브라우저에 보관)
const cfCustom = () => Array.isArray(settings.customFolders) ? settings.customFolders : [];
// 저장 · 수정 대화상자의 ‘모음’ 목록에도 새 폴더가 나오도록
function cfSyncCollections(){
  cfCustom().forEach(n => { if (!COLLECTIONS.some(c => c[0] === n)) COLLECTIONS.push([n, 'folder', '내가 만든 폴더']); });
}
document.addEventListener('DOMContentLoaded', cfSyncCollections);

/* ---------- 화면 ---------- */
const libraryResultCards = resultCards;  // 기존 목록 (참고용으로 남겨둬요)
const cfQ = () => query.trim().toLowerCase();
const cfHit = x => { const q = cfQ(); return !q || [x.title, x.desc, x.type, x.category, x.collection, x.memo, folderOf(x)].join(' ').toLowerCase().includes(q); };
// 지금 열린 폴더: 카테고리 폴더(칩 · 폴더) 또는 모음 폴더(collection)
const cfOpenTitle = () => collection || (cfSelected().length ? (CF_ALIAS[filter] ? filter : cfSelected()[0]) : '');
const cfOpenList = () => collection ? items.filter(x => x.collection === collection && cfHit(x)) : cfMatches();

// 열린 폴더의 전체 저장 개수 (검색과 상관없이)
const cfTotal = () => collection ? items.filter(x => x.collection === collection).length : items.filter(x => cfSelected().includes(folderOf(x))).length;
function cfStatus(){
  if (!cfOpenTitle() && !cfQ()) return `폴더 ${cfFolderData(items).length + cfCustom().length}개`;
  return `콘텐츠 ${cfOpenList().length}개`;
}
/* ---------- 폴더 안 콘텐츠: 1단 카드 리스트 ---------- */
// 정렬: 최신 저장 순(기본) · 오래된 순 · 가까운 순(장소 폴더에서만)
const CF_SORTS = {recent:'최신 저장 순', old:'오래된 저장 순', near:'가까운 순'};
const cfHasPlaces = list => list.some(x => isPlace(x) && !x.pending && x.address);
function cfSort(list){
  if (libSort === 'old') return [...list].reverse();          // items는 최신 저장 순
  if (libSort === 'near' && cfHasPlaces(list)) return [...list].sort((a,b) => distanceOf(a) - distanceOf(b));
  return list;
}
// 선택 모드: null이면 꺼짐, Set이면 선택한 콘텐츠 id
let cfSel = null, cfSelKey = '';

// 카드 아래 한 줄 정보: 동네 · 거리 · 저장 시점 (유형마다 다르게)
function cfMetaLine(x){
  const parts = [];
  let ic = '';
  if (isPlace(x)) {
    ic = 'pin';
    if (x.pending) parts.push('위치 확인 필요');
    else { if (libArea(x)) parts.push(libArea(x)); if (x.distance) parts.push(x.distance); }
  } else if (x.type === '쇼핑') {
    if (x.price) parts.push(x.price.replace(' · 예시 가격', ''));
    if (x.shop) parts.push(x.shop);
  } else if (x.type === '레시피' && x.recipe) { ic = 'clock'; parts.push(x.recipe.split(' · ')[0]); }
  if (x.deadline) parts.push(x.deadline);
  parts.push(`${x.ago} 저장`);
  return `<p class="cf-itemmeta${x.pending ? ' warn' : ''}">${ic ? icon(ic) : ''}<span>${parts.map(esc).join('<i aria-hidden="true">·</i>')}</span></p>`;
}
function cfItem(x){
  const on = cfSel?.has(x.id);
  const role = cfSel ? `role="checkbox" aria-checked="${!!on}"` : `role="button" data-detail="${x.id}"`;
  return `<div class="cf-item${on ? ' on' : ''}" tabindex="0" ${role} data-cfitem="${x.id}" aria-label="${esc(x.title)}${cfSel ? '' : ' 상세 보기'}">
    <div class="cf-itemimg">${libThumb(x)}${cfSel ? '' : `<button type="button" class="libmark" data-unsave="${x.id}" aria-label="${esc(x.title)} 컬렉션에서 삭제">${icon('bookmark')}</button>`}</div>
    <div class="cf-itembody">
      ${cfSel ? `<span class="cf-check" aria-hidden="true">${icon('check')}</span>` : ''}
      <div class="cf-itemtext"><h3>${esc(x.title)}</h3><p class="cf-itemdesc">${esc(x.desc || x.memo || '')}</p>${cfMetaLine(x)}</div>
    </div>
  </div>`;
}
function cfCards(list, pick, canSelect){
  const sorts = Object.entries(CF_SORTS).filter(([k]) => k !== 'near' || cfHasPlaces(list));
  if (!sorts.some(([k]) => k === libSort)) libSort = 'recent';
  const selBtn = canSelect ? (cfSel
    ? `<button type="button" class="cf-textbtn" data-action="cfselectoff">취소</button>`
    : `<button type="button" class="cf-textbtn" data-action="cfselect">선택</button>`) : '';
  // 폴더 안에서는 개수를 제목 옆에 보여주고, 여기에는 정렬 · 선택만 (검색 결과일 때만 개수 표시)
  const lead = canSelect
    ? (cfSel ? `<span class="cf-selhint">삭제할 콘텐츠를 골라주세요</span>` : `<label class="libsort cf-sortlead"><span class="sr">정렬</span><select data-libsort>${sorts.map(([k,v]) => `<option value="${k}" ${libSort===k?'selected':''}>${v}</option>`).join('')}</select>${icon('chevron')}</label>`)
    : `<h2 class="cf-resulthead">검색 결과 <span>${list.length}</span></h2>`;
  return `<div class="libsection cf-sec">
      ${lead}
      <div class="cf-tools">${pick && !cfSel ? `<button type="button" class="cf-pickbtn" data-action="cfpick">${icon('plus')}담기</button>` : ''}
      ${cfSel || canSelect ? '' : `<label class="libsort"><span class="sr">정렬</span><select data-libsort>${sorts.map(([k,v]) => `<option value="${k}" ${libSort===k?'selected':''}>${v}</option>`).join('')}</select>${icon('chevron')}</label>`}${selBtn}</div>
    </div>
    <div class="cf-items">${cfSort(list).map(cfItem).join('')}</div>`;
}
const cfEmpty = (ic, h, p, btn) => `<div class="cf-list"><div class="empty">${icon(ic)}<h3>${h}</h3><p class="muted">${p}</p>${btn}</div></div>`;

resultCards = function(){
  const q = cfQ(), open = cfOpenTitle();
  // 폴더 안: 폴더 카드 없이 콘텐츠만
  if (open) {
    const list = cfOpenList();
    if (list.length) {
      return cfCards(list, !!collection, true);
    }
    if (q) return cfEmpty('search', '찾는 콘텐츠가 없어요', '다른 키워드로 다시 찾아보세요.', `<button class="tonal" data-action="clear">검색 지우기</button>`);
    return collection
      ? cfEmpty('folder', '아직 담긴 콘텐츠가 없어요', '저장한 콘텐츠를 골라 이 폴더에 담아보세요.', `<button class="tonal" data-action="cfpick">콘텐츠 담기</button>`)
      : cfEmpty('bookmark', '아직 저장한 콘텐츠가 없어요', 'SNS에서 공유 → 핀맵으로 담아보세요.', `<button class="tonal" data-action="save">새로 저장</button>`);
  }
  // 전체: 카테고리 폴더 + 내가 만든 폴더
  const list = cfMatches();
  // 내가 만든 폴더는 가장 최근 것부터 맨 앞(좌측 상단)에, 그 뒤로 카테고리 폴더
  const mine = q ? [] : [...cfCustom()].reverse().map(n => {
    const inFolder = items.filter(x => x.collection === n);
    return CollectionFolder({id:n, title:n, icon:'folder', count:inFolder.length, thumbnails:cfThumbs(inFolder), attr:`data-collection="${esc(n)}"`});
  });
  const folders = [...mine, ...cfFolderData(list).map(CollectionFolder)];
  const grid = folders.length ? `<div class="cf-grid">${folders.join('')}</div>` : '';
  if (!q) return grid;
  if (!list.length) return cfEmpty('search', '찾는 콘텐츠가 없어요', '다른 키워드나 카테고리로 다시 찾아보세요.', `<button class="tonal" data-action="resetfilter">전체 컬렉션 보기</button>`);
  return grid + cfCards(list, false, false);
};

pages.library = function(){
  cfSyncCollections();
  const open = cfOpenTitle(), sel = cfSelected();
  // 다른 폴더로 가면 선택 모드는 꺼요
  if (cfSelKey !== open) { cfSel = null; cfSelKey = open; }
  const chip = (id, on) => `<button class="libchip ${on ? 'on' : ''}" data-filter="${esc(id)}" aria-pressed="${on}">${esc(id)}</button>`;
  // 칩은 컬렉션 첫 화면에서만 (폴더 안에서는 숨김)
  const chips = open ? '' : `<div class="libchips cfchips" role="group" aria-label="카테고리 필터">${chip('전체', !sel.length)}${CF_FOLDERS.map(f => chip(f.id, sel.includes(f.id))).join('')}</div>`;
  // 제목 줄: 높이를 고정해 폴더 안 · 밖, 홈에서 들어온 경우 모두 제목 · 검색창 위치가 같아요
  const back = open
    ? `<button type="button" class="subback cf-back-btn" data-action="cfback" aria-label="컬렉션으로 돌아가기">${icon('back')}</button>`
    : ((typeof backHome !== "undefined" && backHome) ? `<button type="button" class="subback cf-back-btn" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '');
  const ph = open ? `${open}에서 찾기` : '저장한 콘텐츠 찾기';
  const n = cfSel?.size || 0;
  const selbar = cfSel ? `<div class="cf-selbar" role="toolbar" aria-label="선택한 콘텐츠">
      <button type="button" class="cf-selall" data-action="cfselall">${cfOpenList().length && cfOpenList().every(x => cfSel.has(x.id)) ? '선택 해제' : '전체 선택'}</button>
      <span class="cf-selcount" aria-live="polite">${n ? `${n}개 선택` : '콘텐츠를 선택하세요'}</span>
      <button type="button" class="cf-seldel" data-action="cfdelete" ${n ? '' : 'disabled'}>${icon('close')}삭제</button>
    </div>` : '';
  return `<div class="libpage cfpage ${open ? 'cf-infolder' : ''} ${cfSel ? 'cf-selecting' : ''}">${CF_DEFS}
    <div class="libhead cf-fhead${back ? ' hasback' : ''}">${back}<h1>${esc(open || '컬렉션')}</h1>${open ? `<span class="cf-hcount" aria-label="저장 ${cfTotal()}개">${cfTotal()}</span>` : ''}${collection && cfCustom().includes(collection) && !cfSel ? `<button type="button" class="cf-delfolder" data-action="cfdelfolder" aria-label="‘${esc(collection)}’ 폴더 삭제">${icon('trash')}</button>` : ''}</div>
    <label class="libsearch">${icon('search')}<input id="search" type="search" enterkeyhint="search" aria-label="${esc(ph)}" placeholder="${esc(ph)}" value="${esc(query)}"><button class="iconbtn" data-action="clear" aria-label="검색 지우기" ${query ? '' : 'hidden'}>${icon('close')}</button></label>
    ${chips}
    <p id="resultcount" class="sr" role="status">${cfStatus()}</p>
    <div id="results" class="cf-results">${resultCards()}</div>
    ${selbar}
  </div>`;
};

/* ---------- 선택 삭제 ---------- */
function cfSyncSel(){
  const n = cfSel?.size || 0, list = cfOpenList();
  const c = $('.cf-selcount'); if (c) c.textContent = n ? `${n}개 선택` : '콘텐츠를 선택하세요';
  const d = $('.cf-seldel'); if (d) d.disabled = !n;
  const all = $('.cf-selall'); if (all) all.textContent = list.length && list.every(x => cfSel.has(x.id)) ? '선택 해제' : '전체 선택';
}
actions.cfselect = () => { cfSel = new Set(); cfSelKey = cfOpenTitle(); render(); };
actions.cfselectoff = () => { cfSel = null; render(); };
actions.cfselall = () => {
  const list = cfOpenList(), every = list.every(x => cfSel.has(x.id));
  list.forEach(x => every ? cfSel.delete(x.id) : cfSel.add(x.id));
  $('#results').innerHTML = resultCards(); cfSyncSel();
};
actions.cfdelete = () => {
  const n = cfSel?.size || 0; if (!n) return;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>콘텐츠 ${n}개를 삭제할까요?</h2><p>삭제하면 메모 · 폴더 정보도 함께 지워져요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><p class="eshint">원본 SNS 게시물은 그대로 남아 있어요.</p></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-action="cfdelconfirm">${n}개 삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
};
actions.cfdelconfirm = () => {
  const ids = cfSel || new Set(), n = ids.size;
  items = items.filter(x => !ids.has(x.id)); afterChange();
  $('#sheet').close(); cfSel = null; render();
  toast(`콘텐츠 ${n}개를 삭제했어요.`);
};
// 선택 모드에서는 카드를 누르면 상세 대신 선택돼요 (app.js보다 먼저 처리)
document.addEventListener('click', e => {
  if (!cfSel) return;
  const it = e.target.closest('[data-cfitem]'); if (!it) return;
  e.stopPropagation();
  const id = Number(it.dataset.cfitem);
  cfSel.has(id) ? cfSel.delete(id) : cfSel.add(id);
  it.classList.toggle('on', cfSel.has(id)); it.setAttribute('aria-checked', cfSel.has(id));
  cfSyncSel();
}, true);
// 카드도 키보드 Enter · Space로 열거나 선택해요
document.addEventListener('keydown', e => {
  const c = e.target.closest?.('.cf-item');
  if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); c.click();
});

/* ---------- 동작 ---------- */
// 폴더 밖으로 (홈에서 들어온 경우의 ← 는 컬렉션 첫 화면에서 다시 보여요)
actions.cfback = () => { filter = '전체'; collection = null; query = ''; render(); window.scrollTo(0, 0); };

// 새 폴더 만들기
actions.newfolder = () => {
  modal('새 폴더', `<form id="cfnewform" class="cf-form" novalidate>
    <label class="field"><span>폴더 이름</span><input id="cfname" name="name" maxlength="20" autocomplete="off" placeholder="예: 제주 여행, 생일 선물"></label>
    <p class="hint">만든 폴더에는 저장한 콘텐츠를 골라 담을 수 있어요.</p>
    <p class="error" id="cferr" role="alert"></p>
    <div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">만들기</button></div>
  </form>`);
  $('#sheet').classList.add('cfsheet');
  setTimeout(() => $('#cfname')?.focus(), 50);
};
// 폴더에 콘텐츠 담기 (한 콘텐츠는 한 폴더에만 담겨요)
actions.cfpick = () => {
  const name = collection; if (!name) return;
  const words = x => [x.title, x.desc, folderOf(x), x.category, x.collection, x.memo].join(' ').toLowerCase();
  modal(`‘${esc(name)}’에 담기`, `<form id="cfpickform" class="cf-form">
    <label class="cf-picksearch">${icon('search')}<input id="cfpickq" type="search" enterkeyhint="search" autocomplete="off" aria-label="담을 콘텐츠 찾기" placeholder="담을 콘텐츠 찾기"></label>
    <div class="cf-pick">${items.map(x => `<label class="cf-pickrow" data-q="${esc(words(x))}"><input type="checkbox" name="pick" value="${x.id}" ${x.collection === name ? 'checked' : ''}>
      <span class="cf-pickthumb">${libThumb(x)}</span><span class="cf-picktext"><b>${esc(x.title)}</b><small>${esc(folderOf(x))}${x.collection && x.collection !== name ? ` · ${esc(x.collection)}에 담겨 있음` : ''}</small></span></label>`).join('')}
      <p class="cf-picknone" hidden>찾는 콘텐츠가 없어요.</p></div>
    <p class="hint">다른 폴더에 담긴 콘텐츠를 고르면 이 폴더로 옮겨져요.</p>
    <div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit" id="cfpickok">담기</button></div>
  </form>`);
  $('#sheet').classList.add('cfsheet');
  cfPickCount();
  setTimeout(() => $('#cfpickq')?.focus(), 60);
};
// 담기 대화상자: 검색어로 목록 거르기 · 고른 개수 표시
function cfPickCount(){
  const n = document.querySelectorAll('#cfpickform input[name="pick"]:checked').length, b = $('#cfpickok');
  if (b) b.textContent = n ? `${n}개 담기` : '담기';
}
document.addEventListener('input', e => {
  if (e.target.id !== 'cfpickq') return;
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('#cfpickform .cf-pickrow').forEach(r => { const on = !q || r.dataset.q.includes(q); r.hidden = !on; shown += on; });
  $('.cf-picknone').hidden = !!shown;
});
document.addEventListener('change', e => { if (e.target.closest?.('#cfpickform') && e.target.name === 'pick') cfPickCount(); });
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('cfsheet'));
document.addEventListener('submit', e => {
  if (e.target.id === 'cfnewform') {
    e.preventDefault();
    const name = String(new FormData(e.target).get('name') || '').trim().replace(/\s+/g, ' ');
    const taken = [...CF_ALL.map(f => f.id), '전체', ...collectionNames(), ...cfCustom()];
    const err = !name ? '폴더 이름을 입력해 주세요.' : taken.includes(name) ? '같은 이름의 폴더가 이미 있어요. 다른 이름을 입력해 주세요.' : '';
    if (err) { $('#cferr').textContent = err; $('#cfname').focus(); return; }
    settings.customFolders = [...cfCustom(), name]; cfSyncCollections(); afterChange();
    $('#sheet').close();
    page = 'library'; detailId = null; filter = '전체'; query = ''; collection = name;
    render(); window.scrollTo(0, 0);
    toast(`‘${name}’ 폴더를 만들었어요.`);
  } else if (e.target.id === 'cfpickform') {
    e.preventDefault();
    const name = collection, ids = new Set(new FormData(e.target).getAll('pick').map(Number));
    let n = 0;
    items.forEach(x => {
      if (ids.has(x.id)) { if (x.collection !== name) n++; x.collection = name; }
      else if (x.collection === name) x.collection = '';
    });
    afterChange(); $('#sheet').close(); render();
    toast(n ? `콘텐츠 ${n}개를 ‘${name}’에 담았어요.` : `‘${name}’ 폴더를 정리했어요.`);
  }
});

// 선택한 칩이 가로 스크롤 밖에 있으면 보이도록 (화면을 다시 그려도 칩 줄 위치 유지)
let cfChipScroll = 0;
function cfSyncChips(){
  const row = $('.cfchips'); if (!row) return;
  row.scrollLeft = cfChipScroll;
  const on = row.querySelectorAll('.libchip.on'), last = on[on.length - 1], first = on[0];
  if (!first || first.dataset.filter === '전체') return;
  const pad = 20;
  if (last.offsetLeft + last.offsetWidth > row.scrollLeft + row.clientWidth - pad) row.scrollLeft = last.offsetLeft + last.offsetWidth - row.clientWidth + pad;
  if (first.offsetLeft < row.scrollLeft + pad) row.scrollLeft = first.offsetLeft - pad;
}
document.addEventListener('click', e => {
  if (e.target.closest('.cfchips [data-filter]')) cfChipScroll = $('.cfchips')?.scrollLeft || 0;
}, true);
document.addEventListener('click', e => {
  if (e.target.closest('.cfchips [data-filter]')) { cfSyncChips(); return; }
  // 카테고리 폴더: 누르면 폴더 안으로
  const f = e.target.closest('[data-cffolder]'); if (!f) return;
  cfChipScroll = 0; filter = f.dataset.cffolder; query = '';
  render(); window.scrollTo(0, 0); cfSyncChips();
});
// 검색: app.js가 #results를 다시 그린 뒤 개수 안내를 맞춰요
document.addEventListener('input', e => {
  if (e.target.id !== 'search' || page !== 'library') return;
  const n = $('#resultcount'); if (n) n.textContent = cfStatus();
});

/* ---------- 하단 메뉴: 검정 캡슐 + 오른쪽 원형 버튼 ---------- */
// 컬렉션 화면에서는 ‘새 폴더’, 다른 화면에서는 ‘새로 저장’
const navCore = nav;
nav = function(){
  const lib = page === 'library' && !detailId;
  const fab = lib
    ? `<button type="button" class="navfab" data-action="newfolder" aria-label="새 폴더 만들기">${icon('folderplus')}</button>`
    : `<button type="button" class="navfab" data-action="save" aria-label="새로 저장">${icon('plus')}</button>`;
  return `<span class="navcap">${navCore()}</span>${fab}`;
};
// 담기 검색창에서 Enter는 검색만 (대화상자가 닫히지 않게)
document.addEventListener('keydown', e => { if (e.target.id === 'cfpickq' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

/* ---------- 내가 만든 폴더 삭제 (콘텐츠는 남아요) ---------- */
actions.cfdelfolder = () => {
  const name = collection; if (!name || !cfCustom().includes(name)) return;
  const n = items.filter(x => x.collection === name).length;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>‘${esc(name)}’ 폴더를 삭제할까요?</h2><p>${n ? `안에 담긴 콘텐츠 ${n}개는 지워지지 않고 컬렉션에 그대로 남아요.` : '빈 폴더예요.'}</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-action="cfdelfolderok">폴더 삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
};
actions.cfdelfolderok = () => {
  const name = collection; if (!name) return;
  settings.customFolders = cfCustom().filter(n => n !== name);
  items.forEach(x => { if (x.collection === name) x.collection = ''; });
  const i = COLLECTIONS.findIndex(c => c[0] === name); if (i >= 0) COLLECTIONS.splice(i, 1);
  afterChange(); $('#sheet').close();
  collection = null; filter = '전체'; query = ''; render(); window.scrollTo(0, 0);
  toast(`‘${name}’ 폴더를 삭제했어요.`);
};
