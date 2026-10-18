/* Photo place markers, real user-submitted place search, and shared navigation. */
(() => {
  const originalRender = render;
  let liveMap, pinLayer, locationMarker, searchController, regionTimer;
  let regionLookup = Promise.resolve(), regionSequence = 0, lastRegionRequest = 0;
  const defaultRegion = '성동구 › 성수동';
  let regionLabel = defaultRegion;
  let userPosition = null;
  let center = [37.5445, 127.043], zoom = 14, category = 'all';
  let searchResults = null, searchQuery = '', selectedResult = null;
  const savedCoords = [
    {id:1, lat:37.5461, lng:127.0434, kind:'cafe', image:'img/cafe.jpg'},
    {id:4, lat:37.5441, lng:127.0495, kind:'event', image:'img/exhibit.jpg'},
    {id:6, lat:37.5445, lng:127.0374, kind:'walk', image:'img/park.jpg'},
    {id:8, lat:37.5490, lng:127.0460, kind:'eat', image:'img/brunch.jpg'}
  ];
  const cats = [['all','✨','전체'],['eat','🍣','맛집'],['cafe','☕','카페'],['event','🎟️','전시·팝업'],['walk','🌳','산책'],['shop','🛍️','쇼핑']];
  const localPhoto = kind => ({eat:'img/brunch.jpg',cafe:'img/cafe.jpg',event:'img/exhibit.jpg',walk:'img/park.jpg',shop:'img/lamp.jpg'})[kind] || 'img/park.jpg';
  const categoryLabel = tag => ({station:'역',stop:'정류장',park:'공원',restaurant:'식당',cafe:'카페',museum:'박물관',gallery:'갤러리',shop:'상점',water:'호수',residential:'주거 지역'})[tag] || tag;
  const kindOf = tag => /restaurant|food|fast_food|bar|pub/.test(tag) ? 'eat' : /cafe|coffee|bakery/.test(tag) ? 'cafe' : /museum|gallery|theatre|artwork/.test(tag) ? 'event' : /park|garden|forest|wood/.test(tag) ? 'walk' : /shop|mall|market/.test(tag) ? 'shop' : 'walk';
  const round = (name, symbol) => `<button class="lm-round" data-lm="locate" aria-label="${name}">${icon(symbol)}</button>`;
  const safe = value => esc(value || '');
  function setRegion(label) {
    regionLabel = label;
    const title = $('#lm-region');
    if (title) title.textContent = label;
  }
  function regionFromAddress(address = {}) {
    const district = [address.borough,address.city_district,address.county]
      .find(value => typeof value === 'string' && /[구군]$/.test(value)) || address.borough || address.county;
    const neighborhood = [address.suburb,address.quarter,address.neighbourhood,address.village,address.town]
      .find(value => typeof value === 'string' && /[동가읍면리]$/.test(value)) || address.suburb || address.quarter || address.neighbourhood;
    return district && neighborhood ? `${district} › ${neighborhood}` : '지역 정보 없음';
  }
  function updateRegion() {
    const sequence = ++regionSequence;
    clearTimeout(regionTimer);
    const map = liveMap;
    const point = [...center];
    if (Math.abs(point[0]-37.5445)<.00001 && Math.abs(point[1]-127.043)<.00001) {
      setRegion(defaultRegion);
      return;
    }
    setRegion('위치 확인 중');
    regionTimer = setTimeout(() => {
      regionLookup = regionLookup.catch(() => {}).then(async () => {
        if (sequence !== regionSequence || liveMap !== map) return;
        const delay = Math.max(0, 1100 - (Date.now() - lastRegionRequest));
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        if (sequence !== regionSequence || liveMap !== map) return;
        lastRegionRequest = Date.now();
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ko&lat=${point[0]}&lon=${point[1]}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`주소 조회 실패: ${response.status}`);
        const data = await response.json();
        if (sequence === regionSequence && liveMap === map) setRegion(regionFromAddress(data.address));
      }).catch(() => {
        if (sequence === regionSequence && liveMap === map) setRegion('지역 정보 없음');
      });
    }, 650);
  }
  const savedPlaces = () => {
    const pinned = savedCoords.map(position => {
      const item = items.find(x => x.id === position.id);
      return item && !item.pending ? {...position, title:item.title, address:item.address || '주소 확인 필요', category:item.category || item.type, description:item.desc || '', source:'저장한 콘텐츠', saved:true} : null;
    }).filter(Boolean);
    const own = items.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && !x.pending && !savedCoords.some(y => y.id === x.id))
      .map(x => ({id:x.id,lat:x.lat,lng:x.lng,kind:kindOf(x.category || ''),image:localPhoto(kindOf(x.category || '')),title:x.title,address:x.address || '',category:x.category || x.type,description:x.desc || '',source:'저장한 콘텐츠',saved:true}));
    return [...pinned,...own];
  };
  function content() {
    return `<section class="live-map" aria-label="지도에서 장소 탐색"><div id="live-map-canvas"></div>
      <h1 class="lm-region-title" id="lm-region" aria-live="polite">${safe(regionLabel)}</h1>
      <form class="lm-search" id="lm-search" role="search">${icon('search')}<input name="q" aria-label="지도 장소 검색" placeholder="장소명 또는 주소 검색" value="${safe(searchQuery)}" autocomplete="off"><button type="submit" aria-label="검색">${icon('arrow')}</button></form>
      <button class="lm-course-link" data-page="course">${icon('calendar')} 코스 짜기</button>
      <div class="lm-status" role="status" hidden></div>
      <div class="lm-search-results" id="lm-search-results" hidden></div><div class="lm-place-detail" id="lm-place-detail" hidden></div>
      <div class="lm-bottom"><div class="lm-area">${round('현재 위치로 이동','target')}</div>
      <div class="lm-categories" role="group" aria-label="지도 카테고리">${cats.map(([id,emoji,label]) => `<button data-lm-cat="${id}" class="${category===id?'selected':''}" aria-pressed="${category===id}"><span class="lm-emoji">${emoji}</span><b>${label}</b></button>`).join('')}</div>
      <nav class="bottomnav lm-shared-nav" aria-label="하단 메뉴">${nav()}</nav></div></section>`;
  }
  function status(message) { const el = $('#app .lm-status'); if (el) { el.textContent = message; el.hidden = !/못|실패|입력|확인하고|검색하고/.test(message); } }
  function visiblePlaces() {
    const list = searchResults || savedPlaces();
    return list.filter(x => category === 'all' || x.kind === category);
  }
  function markerHtml(place) {
    return `<span class="lm-emoji-pin" aria-label="${safe(place.title)}">${cats.find(c=>c[0]===place.kind)?.[1]||'📍'}</span>`;
  }
  function markers() {
    if (!liveMap) return;
    pinLayer.clearLayers();
    const list = visiblePlaces();
    list.forEach(place => {
      const marker = L.marker([place.lat,place.lng], {title:place.title,
        icon:L.divIcon({className:'lm-emoji-marker',html:markerHtml(place),iconSize:[46,46],iconAnchor:[23,23]})}).addTo(pinLayer);
      marker.on('click', () => place.saved ? openDetail(place.id) : showResultDetail(place));
    });
    status(searchResults ? `${list.length}개 실제 장소 검색 결과 · © OpenStreetMap / Photon` : `${list.length}개 저장 장소 · 핀을 누르면 상세 화면으로 이동`);
  }
  function mount() {
    if (!window.L) { status('지도 라이브러리를 불러오지 못했어요.'); return; }
    liveMap = L.map('live-map-canvas',{zoomControl:false,zoomAnimation:false}).setView(center,zoom);
    window.attachPinmapBasemap(liveMap);
    pinLayer = L.layerGroup().addTo(liveMap); markers(); drawLocation();
    liveMap.on('moveend', () => { center=[liveMap.getCenter().lat,liveMap.getCenter().lng]; zoom=liveMap.getZoom(); updateRegion(); });
    requestAnimationFrame(() => liveMap?.invalidateSize());
  }
  render = function() {
    searchController?.abort();
    clearTimeout(regionTimer);
    regionSequence++;
    window.unmountCourseMap?.();
    if (liveMap) { liveMap.remove(); liveMap=null; locationMarker=null; }
    const isMap = page === 'map' && !detailId;
    document.body.classList.toggle('live-map-page',isMap);
    if (isMap) { $('#app').innerHTML=content(); mount(); if(searchResults) showResults(); }
    else { originalRender(); if(page==='course' && !detailId) window.mountCourseMap?.(); }
  };
  function drawLocation() {
    if(!liveMap)return;
    if(locationMarker)liveMap.removeLayer(locationMarker);
    const point=userPosition || [37.5445,127.043];
    locationMarker=L.marker(point,{zIndexOffset:1000,icon:L.divIcon({className:'lm-location-marker',html:'<span class="lm-location-dot"></span>',iconSize:[22,22],iconAnchor:[11,11]}),title:'현재 위치'}).addTo(liveMap);
  }
  function locate() {
    if(!liveMap)return;
    userPosition=[37.5445,127.043];
    liveMap.setView(userPosition,16);drawLocation();
  }
  function resetArea() {
    if (!liveMap) return;
    searchController?.abort();
    searchResults=null; searchQuery=''; selectedResult=null; category='all';
    const input=$('#lm-search input'); if(input){input.value='';input.disabled=false;}
    const results=$('#lm-search-results'); if(results) results.hidden=true;
    const detail=$('#lm-place-detail'); if(detail) detail.hidden=true;
    document.querySelectorAll('[data-lm-cat]').forEach(button => {
      const on=button.dataset.lmCat==='all';
      button.classList.toggle('selected',on);
      button.setAttribute('aria-pressed',String(on));
    });
    center=[37.5445,127.043]; zoom=14;
    liveMap.setView(center,zoom);
    setRegion(defaultRegion);
    markers();
  }
  function showResults() {
    const panel=$('#lm-search-results'); if(!panel) return;
    if(!searchResults) { panel.hidden=true; return; }
    const list=visiblePlaces(); panel.hidden=false;
    panel.innerHTML=`<div class="lm-results-head"><b>장소 검색 · ${list.length}곳</b><button data-lm="clear-search" aria-label="검색 닫기">✕</button></div><small class="lm-result-credit">저장한 장소 우선 검색 · 외부 장소 © OpenStreetMap / Photon</small>`+
      (list.length ? list.map((x,i) => `<button class="lm-result-row" data-result="${i}"><img src="${x.image}" alt=""><span><b>${safe(x.title)}</b><small>${safe(x.address)}</small></span>${icon('arrow')}</button>`).join('') : '<p>일치하는 장소가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>');
  }
  function showResultDetail(place) {
    selectedResult=place;
    const resultsPanel=$('#lm-search-results'); if(resultsPanel) resultsPanel.hidden=true;
    const panel=$('#lm-place-detail'); if(!panel) return;
    const lat=Number(place.lat).toFixed(6), lng=Number(place.lng).toFixed(6);
    panel.hidden=false;
    panel.innerHTML=`<button class="lm-detail-close" data-lm="close-detail" aria-label="장소 정보 닫기">✕</button><img src="${place.image}" alt="장소 유형을 보여주는 예시 사진"><div><small>OpenStreetMap 장소 정보 · 사진은 예시</small><h2>${safe(place.title)}</h2><p>${safe(place.address || '주소 정보 없음')}</p><span>${safe(place.category)}</span><a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}" target="_blank" rel="noopener noreferrer">지도에서 위치 보기 ${icon('external')}</a></div>`;
    liveMap?.panTo([place.lat,place.lng],{animate:true});
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
      if(searchResults.length) liveMap.fitBounds(searchResults.map(x=>[x.lat,x.lng]),{maxZoom:16,padding:[82,180]});
    } catch(error) { if(error.name!=='AbortError') status('검색 연결을 확인해 주세요. 저장한 장소명으로 다시 검색할 수 있어요.'); }
    finally { if(current===searchController && input) input.disabled=false; }
  }
  document.addEventListener('click',event => {
    const result=event.target.closest('[data-result]');
    if(result){const found=visiblePlaces()[Number(result.dataset.result)];if(found) found.saved ? openDetail(found.id) : showResultDetail(found);return;}
    const cat=event.target.closest('[data-lm-cat]');
    if(cat){category=cat.dataset.lmCat;document.querySelectorAll('[data-lm-cat]').forEach(b=>{const on=b===cat;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});markers();showResults();return;}
    const button=event.target.closest('[data-lm]'); if(!button)return;
    switch(button.dataset.lm){
      case 'locate':locate();break;
      case 'clear-search':searchResults=null;searchQuery='';$('#lm-search input').value='';$('#lm-search-results').hidden=true;$('#lm-place-detail').hidden=true;center=[37.5445,127.043];zoom=14;liveMap?.setView(center,zoom);markers();break;
      case 'close-detail':$('#lm-place-detail').hidden=true;selectedResult=null;if(searchResults) showResults();break;
    }
  });
  document.addEventListener('submit',event => { if(event.target.id==='lm-search'){event.preventDefault();searchPlaces(new FormData(event.target).get('q').trim());} });
  render();
})();
