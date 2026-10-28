/* Photo place markers, real user-submitted place search, and shared navigation. */
(() => {
  const originalRender = render;
  let liveMap, pinLayer, locationMarker, searchController;
  let expandedKey=null;
  const markerEntries=new Map();
  let userPosition = null;
  let userHeading = null, locationWatch = null, orientationActive = false;
  let locationBusy = false;
  let center = [37.5445, 127.043], zoom = 15, category = 'all';
  let searchResults = null, searchQuery = '';
  const savedCoords = [
    {id:1, lat:37.5461, lng:127.0434, kind:'cafe', image:'img/cafe.jpg'},
    {id:4, lat:37.5441, lng:127.0495, kind:'event', image:'img/exhibit.jpg'},
    {id:6, lat:37.5445, lng:127.0374, kind:'walk', image:'img/park.jpg'},
    {id:8, lat:37.5490, lng:127.0460, kind:'eat', image:'img/brunch.jpg'},
    {id:13, lat:37.5447, lng:127.0557, kind:'event', image:'img/popup-store.jpg'}, // 성수 오브젝트 팝업 (예시 위치)
    {id:9, lat:37.7720, lng:128.9470, kind:'walk', image:'img/sea-room.jpg'}  // 바다 앞 작은 숙소 · 강릉 (예시 위치)
  ];
  const cats = [['all','전체'],['eat','맛집'],['cafe','카페'],['event','전시·팝업'],['walk','산책'],['shop','쇼핑']];
  // Use the same line style as the app navigation on every platform.
  const categoryPaths = {
    all: paths.spark,
    eat: 'M7 3v18 M4 3v5a3 3 0 0 0 6 0V3 M17 21v-9h3V3c-4 0-5 6-3 9',
    cafe: paths.coffee,
    event: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M16 5v3 M16 11v2 M16 16v3',
    walk: 'M12 22v-7 M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z',
    shop: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2'
  };
  const categoryIcon = kind => `<svg class="lm-category-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${categoryPaths[kind] || paths.pin}"/></svg>`;
  const localPhoto = kind => ({eat:'img/brunch.jpg',cafe:'img/cafe.jpg',event:'img/exhibit.jpg',walk:'img/park.jpg',shop:'img/lamp.jpg'})[kind] || 'img/park.jpg';
  const categoryLabel = tag => ({station:'역',stop:'정류장',park:'공원',restaurant:'식당',cafe:'카페',museum:'박물관',gallery:'갤러리',shop:'상점',water:'호수',residential:'주거 지역'})[tag] || tag;
  const kindOf = tag => /restaurant|food|fast_food|bar|pub/.test(tag) ? 'eat' : /cafe|coffee|bakery/.test(tag) ? 'cafe' : /museum|gallery|theatre|artwork/.test(tag) ? 'event' : /park|garden|forest|wood/.test(tag) ? 'walk' : /shop|mall|market/.test(tag) ? 'shop' : 'walk';
  const round = (name, symbol) => `<button class="lm-round" data-lm="locate" aria-label="${name}" title="${name}">${icon(symbol)}</button>`;
  const routeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v8a4 4 0 0 0 4 4h2a4 4 0 0 0 0-8h2a6 6 0 0 0 6-6 M16 5h3v3"/></svg>';
  const safe = value => esc(value || '');
  const savedPlaces = () => {
    const pinned = savedCoords.map(position => {
      const item = items.find(x => x.id === position.id);
      return item && !item.pending ? {...position, image:libPhoto(item)||position.image, title:item.title, address:item.address || '주소 확인 필요', category:item.category || item.type, description:item.desc || '', source:'저장한 콘텐츠', saved:true} : null;
    }).filter(Boolean);
    const own = items.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && !x.pending && !savedCoords.some(y => y.id === x.id))
      .map(x => ({id:x.id,lat:x.lat,lng:x.lng,kind:kindOf(x.category || ''),image:libPhoto(x)||localPhoto(kindOf(x.category || '')),title:x.title,address:x.address || '',category:x.category || x.type,description:x.desc || '',source:'저장한 콘텐츠',saved:true}));
    return [...pinned,...own];
  };
  function content() {
    return `<section class="live-map" aria-label="지도에서 장소 탐색"><div id="live-map-canvas"></div>
      <header class="lm-header">
        <h1 class="lm-sr-only">지도에서 저장한 장소 찾기</h1>
        <div class="lm-search-row"><form class="lm-search-pill" id="lm-search" role="search">${icon('search')}<input name="q" type="search" enterkeyhint="search" aria-label="지도 장소 검색" placeholder="어디로 가고 싶으세요?" value="${safe(searchQuery)}" autocomplete="off"><button type="submit" class="lm-sr-only" aria-label="장소 검색">검색</button></form><button type="button" class="lm-saved-courses" data-page="courses" aria-label="저장한 코스 목록" title="저장한 코스 목록">${icon('folder')}</button></div>
        <div class="lm-categories" role="group" aria-label="지도 카테고리">${cats.map(([id,label]) => `<button type="button" data-lm-cat="${id}" class="${category===id?'selected':''}" aria-pressed="${category===id}"><span class="lm-category-art">${categoryIcon(id)}</span><b>${label}</b></button>`).join('')}</div>
      </header>
      <div class="lm-status" role="status" hidden></div>
      <div class="lm-search-results" id="lm-search-results" hidden></div>
      <div class="lm-floating-actions">${round('현재 위치로 이동','target')}<button type="button" class="lm-course-create" data-course-new aria-label="코스 짜기" title="코스 짜기">${routeIcon}</button></div>
      <div class="lm-selected-host" id="lm-selected-place" aria-live="polite" hidden></div>
      <footer class="lm-bottom"><span class="lm-sheet-handle" aria-hidden="true"></span><p class="lm-place-count" id="lm-place-count"></p><nav class="bottomnav lm-shared-nav" aria-label="하단 메뉴">${nav()}</nav></footer></section>`;
  }
  function status(message) { const el = $('#app .lm-status'); if (el) { el.textContent = message; el.hidden = !/못|실패|입력|확인하고|검색하고/.test(message); } }
  function visiblePlaces() {
    const list = searchResults || savedPlaces();
    return list.filter(x => category === 'all' || x.kind === category);
  }
  const placeKey=place=>`${place.saved?'saved':'search'}:${place.id}`;
  function markerIcon(place,expanded=false) {
    const symbol=categoryIcon(place.kind);
    return L.divIcon({className:`lm-photo-marker${expanded?' is-selected':''}`,
      html:`<span class="lm-place-badge"><span class="lm-badge-image">${symbol}<img src="${safe(place.image||localPhoto(place.kind))}" alt=""></span><span class="lm-badge-category">${symbol}</span></span>`,
      iconSize:[76,76],iconAnchor:[38,38]});
  }
  function updateMarker(entry,expanded) {
    entry.marker.setIcon(markerIcon(entry.place,expanded));
    entry.marker.setZIndexOffset(expanded?2000:0);
    const element=entry.marker.getElement();
    element?.setAttribute('aria-label',`${entry.place.title} · ${entry.place.category} · 장소 정보 ${expanded?'닫기':'보기'}`);
    element?.setAttribute('aria-expanded',String(expanded));
    element?.setAttribute('aria-controls','lm-selected-place');
  }
  function collapsePlace() {
    if(expandedKey&&markerEntries.has(expandedKey))updateMarker(markerEntries.get(expandedKey),false);
    expandedKey=null;
    const host=$('#lm-selected-place');if(host){host.hidden=true;host.innerHTML='';}
    $('#app .live-map')?.classList.remove('has-place');
  }
  function expandPlace(place,toggle=false) {
    const key=placeKey(place),previous=expandedKey;
    collapsePlace();
    if(toggle&&previous===key)return;
    const entry=markerEntries.get(key);if(!entry)return;
    expandedKey=key;updateMarker(entry,true);
    const host=$('#lm-selected-place');
    const address=place.address||'주소 정보 없음';
    host.innerHTML=`<article class="lm-place-banner" aria-label="선택한 장소 정보"><button class="lm-banner-main" data-lm="open-place" aria-label="${safe(place.title)} ${place.saved?'상세 보기':'외부 지도에서 보기'}"><img src="${safe(place.image||localPhoto(place.kind))}" alt=""><span class="lm-banner-copy"><strong>${safe(place.title)}</strong><span>${safe(place.category)} · ${place.saved?'저장한 장소':'검색한 장소'}</span><span class="lm-banner-address">${safe(address)}</span><b>${place.saved?'상세 보기':'지도에서 보기'} ${icon('arrow')}</b></span></button><button type="button" class="lm-banner-close" data-lm="close-place" aria-label="장소 정보 닫기">${icon('close')}</button></article>`;
    host.hidden=false;$('#app .live-map')?.classList.add('has-place');
    const resultsPanel=$('#lm-search-results');if(resultsPanel)resultsPanel.hidden=true;
    liveMap.panInside([place.lat,place.lng],{paddingTopLeft:[48,200],paddingBottomRight:[48,300],animate:false});
    entry.marker.getElement()?.focus({preventScroll:true});
  }
  function markers() {
    if (!liveMap) return;
    collapsePlace();markerEntries.clear();pinLayer.clearLayers();
    const list = visiblePlaces();
    const count=$('#lm-place-count');if(count)count.textContent=list.length?`${searchResults?'검색한':'저장한'} ${category==='all'?'장소':cats.find(([id])=>id===category)?.[1]||'장소'} ${list.length}곳`:'표시할 장소가 없어요';
    list.forEach(place => {
      const marker=L.marker([place.lat,place.lng],{title:place.title,icon:markerIcon(place),bubblingMouseEvents:false}).addTo(pinLayer);
      const entry={place,marker};markerEntries.set(placeKey(place),entry);updateMarker(entry,false);
      marker.on('click',()=>expandPlace(place,true));
    });
    status(searchResults ? `${list.length}개 실제 장소 검색 결과` : `${list.length}개 저장 장소`);
  }
  function mount() {
    if (!window.L) { status('지도 라이브러리를 불러오지 못했어요.'); return; }
    liveMap = L.map('live-map-canvas',{zoomControl:false,zoomAnimation:false}).setView(center,zoom);
    window.attachPinmapBasemap(liveMap);
    pinLayer = L.layerGroup().addTo(liveMap); markers(); drawLocation();
    if(typeof window.DeviceOrientationEvent?.requestPermission!=='function')startOrientation();
    liveMap.on('moveend', () => { center=[liveMap.getCenter().lat,liveMap.getCenter().lng]; zoom=liveMap.getZoom(); });
    liveMap.on('click',collapsePlace);
    requestAnimationFrame(() => liveMap?.invalidateSize());
  }
  render = function() {
    searchController?.abort();
    expandedKey=null;markerEntries.clear();
    window.unmountCourseMap?.();
    window.unmountCourseThumbnails?.();
    stopLocation();
    if (liveMap) { liveMap.remove(); liveMap=null; locationMarker=null; }
    const isMap = page === 'map' && !detailId;
    document.body.classList.toggle('live-map-page',isMap);
    // 상세 페이지 '지도에서 보기' → 그 장소로 이동해 핀을 펼쳐요
    const focusId = isMap ? window.pmMapFocus : null;
    if (focusId != null) { window.pmMapFocus = null; searchResults = null; searchQuery = ''; category = 'all';
      const f = savedPlaces().find(p => p.id === focusId); if (f) { center = [f.lat, f.lng]; zoom = 15; } }
    if (isMap) { $('#app').innerHTML=content(); mount(); if(searchResults) showResults();
      if (focusId != null) { const f = savedPlaces().find(p => p.id === focusId); if (f && liveMap) expandPlace(f); } }
    else { originalRender(); if(page==='course' && !detailId) window.mountCourseMap?.(); if(page==='courses' && !detailId) window.mountCourseThumbnails?.(); }
  };
  function drawLocation() {
    if(!liveMap)return;
    if(locationMarker)liveMap.removeLayer(locationMarker);
    const point=userPosition || [37.5425,127.042];
    const demo=!userPosition,heading=userHeading??(demo?35:null);
    const label=demo?'성수동 예시 위치 · 방향 예시':heading==null?'현재 위치 · 방향 정보 없음':`현재 위치 · 북쪽 기준 ${Math.round(heading)}도`;
    locationMarker=L.marker(point,{zIndexOffset:1000,icon:L.divIcon({className:'lm-location-marker',html:`<span class="lm-location-person${heading==null?' no-heading':''}" style="--heading:${heading??0}deg"><span class="lm-heading-cone" aria-hidden="true"></span><span class="lm-location-dot"></span>${demo?'<span class="lm-location-demo">예시 위치</span>':''}</span>`,iconSize:[92,92],iconAnchor:[46,46]}),title:label}).addTo(liveMap);
    locationMarker.getElement()?.setAttribute('aria-label',label);
  }
  function updateHeading(event) {
    const angle=Number.isFinite(event.webkitCompassHeading)?event.webkitCompassHeading:event.absolute&&Number.isFinite(event.alpha)?(360-event.alpha)%360:null;
    if(angle==null||!liveMap)return;
    userHeading=(angle+360)%360;
    const person=locationMarker?.getElement()?.querySelector('.lm-location-person');
    person?.classList.remove('no-heading');person?.style.setProperty('--heading',userHeading+'deg');
    if(userPosition)locationMarker?.getElement()?.setAttribute('aria-label',`현재 위치 · 북쪽 기준 ${Math.round(userHeading)}도`);
  }
  function startOrientation() {
    if(orientationActive)return;
    window.addEventListener('deviceorientation',updateHeading);
    window.addEventListener('deviceorientationabsolute',updateHeading);
    orientationActive=true;
  }
  function stopLocation() {
    if(locationWatch!==null)navigator.geolocation?.clearWatch(locationWatch);
    locationWatch=null;locationBusy=false;
    window.removeEventListener('deviceorientation',updateHeading);
    window.removeEventListener('deviceorientationabsolute',updateHeading);orientationActive=false;
  }
  function locate() {
    if(!liveMap||locationBusy)return;
    const request=window.DeviceOrientationEvent?.requestPermission;
    if(typeof request==='function'){
      try{Promise.resolve(request.call(window.DeviceOrientationEvent,true)).then(result=>{if(result==='granted'&&page==='map'&&liveMap)startOrientation();}).catch(()=>{});}catch{}
    }else startOrientation();
    if(userPosition){liveMap.setView(userPosition,16);drawLocation();if(locationWatch!==null)return;}
    if(!navigator.geolocation){toast('이 기기에서는 현재 위치를 확인할 수 없어요.');return;}
    locationBusy=true;
    locationWatch=navigator.geolocation.watchPosition(position=>{
      if(!liveMap||page!=='map')return;
      const first=!userPosition;locationBusy=false;userPosition=[position.coords.latitude,position.coords.longitude];
      // A GPS travel heading is not the direction the person is facing.
      if(first)liveMap.setView(userPosition,16);
      drawLocation();
    },()=>{if(!liveMap||page!=='map')return;locationBusy=false;if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);locationWatch=null;toast('위치 권한을 확인해주세요. 성수동 예시 지도를 유지합니다.');},{enableHighAccuracy:true,maximumAge:30000,timeout:12000});
  }
  function showResults() {
    const panel=$('#lm-search-results'); if(!panel) return;
    if(!searchResults) { panel.hidden=true; return; }
    const list=visiblePlaces(); panel.hidden=false;
    panel.innerHTML=`<div class="lm-results-head"><b>장소 검색 · ${list.length}곳</b><button data-lm="clear-search" aria-label="검색 닫기">✕</button></div><small class="lm-result-credit">저장한 장소 우선 검색 · 외부 장소 © OpenStreetMap / Photon</small>`+
      (list.length ? list.map((x,i) => `<button class="lm-result-row" data-result="${i}"><img src="${x.image}" alt=""><span><b>${safe(x.title)}</b><small>${safe(x.address)}</small></span>${icon('arrow')}</button>`).join('') : '<p>일치하는 장소가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>');
  }
  async function searchPlaces(q) {
    if (q.length < 2) { status('검색어를 2자 이상 입력해 주세요.'); return; }
    searchController?.abort(); searchController=new AbortController();
    const current=searchController;
    status('실제 장소를 검색하고 있어요…');
    const input=$('#lm-search input'); if(input) input.disabled=true;
    try {
      const local=savedPlaces().filter(x=>[x.title,x.address,x.category].join(' ').toLowerCase().includes(q.toLowerCase()));
      let found=local;
      if(!local.length){
        const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&lat='+center[0]+'&lon='+center[1]+'&limit=12',{signal:current.signal});
        if(!response.ok)throw new Error('장소 검색 연결을 확인해 주세요.');
        const data=await response.json();
        found=(data.features||[]).map(f=>{const p=f.properties,kind=kindOf(p.osm_value||'');return {id:p.osm_id,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],title:p.name||q,address:[p.city,p.district,p.street,p.housenumber].filter(Boolean).join(' '),category:categoryLabel(p.osm_value||'장소'),kind,image:localPhoto(kind),saved:false}});
      }
      if (!liveMap || current !== searchController) return;
      searchQuery=q;searchResults=found;
      category='all'; document.querySelectorAll('[data-lm-cat]').forEach(b=>{const on=b.dataset.lmCat==='all';b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
      markers();showResults();
      if(searchResults.length) liveMap.fitBounds(searchResults.map(x=>[x.lat,x.lng]),{maxZoom:16,paddingTopLeft:[80,200],paddingBottomRight:[80,240]});
    } catch(error) { if(error.name!=='AbortError') status('검색 연결을 확인해 주세요. 저장한 장소명으로 다시 검색할 수 있어요.'); }
    finally { if(current===searchController && input) input.disabled=false; }
  }
  document.addEventListener('click',event => {
    const result=event.target.closest('[data-result]');
    if(result){const found=visiblePlaces()[Number(result.dataset.result)];if(found) expandPlace(found);return;}
    const cat=event.target.closest('[data-lm-cat]');
    if(cat){category=cat.dataset.lmCat;document.querySelectorAll('[data-lm-cat]').forEach(b=>{const on=b===cat;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});markers();showResults();return;}
    const button=event.target.closest('[data-lm]'); if(!button)return;
    switch(button.dataset.lm){
      case 'locate':locate();break;
      case 'close-place':{const key=expandedKey;collapsePlace();markerEntries.get(key)?.marker.getElement()?.focus({preventScroll:true});break;}
      case 'open-place':{const place=markerEntries.get(expandedKey)?.place;if(!place)break;if(place.saved)openDetail(place.id);else window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.lat+','+place.lng),'_blank','noopener,noreferrer');break;}
      case 'clear-search':searchResults=null;searchQuery='';$('#lm-search input').value='';$('#lm-search-results').hidden=true;center=[37.5445,127.043];zoom=15;liveMap?.setView(center,zoom);markers();break;
    }
  });
  document.addEventListener('error',event=>{if(event.target.matches?.('.lm-badge-image img'))event.target.hidden=true;},true);
  document.addEventListener('keydown',event=>{if(page!=='map')return;if(event.key==='Escape'){collapsePlace();return;}if(event.key===' '&&event.target.closest('.lm-photo-marker')){event.preventDefault();event.target.closest('.lm-photo-marker').click();}});
  document.addEventListener('submit',event => { if(event.target.id==='lm-search'){event.preventDefault();searchPlaces(new FormData(event.target).get('q').trim());} });
  render();
})();
