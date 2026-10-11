// 배경은 실제 지도입니다. 예시 콘텐츠의 장소 좌표는 검증된 실제 가게 위치가 아닙니다.
let realMap = null;
let realMapMarkers = [];
let mapSearchOpen = false;
let mapSearchIndex = 0;
function destroyRealMap(){ if(realMap){realMap.remove();realMap=null;} realMapMarkers=[]; }
function mapPlaceMatches(place, query){
  return [place.title,place.address,place.placeLabel,place.type,place.category,place.memo,place.desc]
    .filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
}
function filterMapMarkers(){
  if(!realMap)return;
  const q=mapSearchQuery.trim().toLocaleLowerCase();
  realMapMarkers.forEach(({place,marker})=>{
    if(!q||mapPlaceMatches(place,q))marker.addTo(realMap);
    else realMap.removeLayer(marker);
  });
}
function initRealMap(){
  const host=document.getElementById('real-map');
  if(!host)return;
  const fallback=document.getElementById('map-fallback');
  if(!window.L){fallback.hidden=false;return;}
  const places=readyPlaces();
  const selected=places.find(x=>x.id===selectedPin)||places[0];
  const focus=selected?mapCoordinates(selected):[37.5446,127.0474];
  realMap=L.map(host,{zoomControl:false,scrollWheelZoom:false}).setView(focus,selected?.id===9?12:14);
  L.control.zoom({position:'topright'}).addTo(realMap);
  let tileErrors=0;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).on('tileerror',()=>{if(++tileErrors>=3)fallback.hidden=false;}).addTo(realMap);
  for(const place of places){
    const active=place.id===selected?.id;
    const photo=libPhoto(place);
    const image=photo?`<img src="${esc(photo)}" alt="">`:`<span class="map-mini-art">${typeOf(place.type).emoji}</span>`;
    const marker=L.marker(mapCoordinates(place),{
      icon:L.divIcon({
        className:`map-photo-marker${active?' active':''}`,
        html:`<span class="map-photo-marker-inner">${image}<span class="map-photo-copy"><b>${esc(place.title)}</b><small>${esc(mapPlaceLabel(place))}</small></span></span>`,
        iconSize:[172,52],iconAnchor:[86,58]
      }),
      title:`${place.title} · ${mapPlaceLabel(place)}`
    }).addTo(realMap);
    realMapMarkers.push({place,marker});
    marker.on('click',()=>{if(mapPickMode)return;selectedPin=place.id;mapSheetState='peek';mapMenuOpen=false;mapSearchOpen=false;mapSearchQuery='';render();});
  }
  filterMapMarkers();
  realMap.on('click',event=>{
    if(!mapPickMode)return;
    const lat=Number(event.latlng.lat.toFixed(6)), lng=Number(event.latlng.lng.toFixed(6));
    modal('새로운 장소 추가',`<p class="hint">지도에서 선택한 위치에 저장돼요. 장소 이름과 주소를 직접 입력해 주세요.</p><form id="map-place-form"><input type="hidden" name="lat" value="${lat}"><input type="hidden" name="lng" value="${lng}"><label class="field"><span>장소 이름</span><input name="title" maxlength="80" required placeholder="예: 다시 가고 싶은 카페"></label><label class="field"><span>주소 또는 위치 설명</span><input name="address" maxlength="200" required placeholder="예: 서울 성동구 성수동"></label><label class="field"><span>장소 유형</span><select name="type">${TYPES.filter(t=>t.place).map(t=>`<option value="${esc(t.id)}">${t.emoji} ${esc(t.id)}</option>`).join('')}</select></label><label class="field"><span>내 메모 · 선택</span><textarea name="memo" maxlength="300" rows="2" placeholder="이 장소에 가고 싶은 이유"></textarea></label><p class="hint">직접 지정한 위치와 주소입니다. 실제 방문 전에 확인해 주세요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">지도에 추가</button></div></form>`);
  });
  requestAnimationFrame(()=>realMap?.invalidateSize());
}

function updateMapSearchResults(){
  const host=document.getElementById('map-search-results');
  if(!host)return;
  const q=mapSearchQuery.trim().toLocaleLowerCase();
  const matches=items.filter(x=>isPlace(x)&&mapPlaceMatches(x,q));
  const input=document.getElementById('map-search-input');
  const count=document.querySelector('.map-search-count');
  if(count)count.textContent=`${matches.length}곳`;
  if(mapSearchIndex>=matches.length)mapSearchIndex=0;
  host.hidden=!mapSearchOpen;
  if(input){input.setAttribute('aria-expanded',String(mapSearchOpen));input.setAttribute('aria-activedescendant',mapSearchOpen&&matches.length?`map-search-result-${matches[mapSearchIndex].id}`:'');}
  host.innerHTML=matches.length?matches.map((x,i)=>`<button type="button" id="map-search-result-${x.id}" role="option" aria-selected="${i===mapSearchIndex}" class="${i===mapSearchIndex?'active':''}" data-map-result="${x.id}"><span class="map-result-photo">${libThumb(x)}</span><span><b>${esc(x.title)}</b><small>${readyPlaces().some(p=>p.id===x.id)?esc(mapPlaceLabel(x)):'위치 확인 필요'} · ${esc(x.type)}</small></span></button>`).join(''):'<p>저장한 장소 중 검색 결과가 없어요.</p>';
  filterMapMarkers();
}
actions.mapplace=()=>{mapMenuOpen=false;mapSheetState='closed';mapSearchQuery='';page='map';detailId=null;mapPickMode=true;render();};
document.addEventListener('input',event=>{
  if(event.target.id!=='map-search-input')return;
  mapSearchQuery=event.target.value;
  mapSearchOpen=true;
  mapSearchIndex=0;
  updateMapSearchResults();
});
document.addEventListener('focusin',event=>{
  if(event.target.id==='map-search-input'){mapSearchOpen=true;updateMapSearchResults();}
});
document.addEventListener('keydown',event=>{
  if(event.target.id!=='map-search-input')return;
  const options=[...document.querySelectorAll('#map-search-results [data-map-result]')];
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();mapSearchOpen=true;
    if(options.length)mapSearchIndex=(mapSearchIndex+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
    updateMapSearchResults();
    document.getElementById(`map-search-result-${options[mapSearchIndex]?.dataset.mapResult}`)?.scrollIntoView({block:'nearest'});
  }else if(event.key==='Enter'){
    event.preventDefault();options[mapSearchIndex]?.click();
  }else if(event.key==='Escape'){
    event.preventDefault();
    if(mapSearchQuery){mapSearchQuery='';event.target.value='';mapSearchIndex=0;updateMapSearchResults();}
    else{mapSearchOpen=false;updateMapSearchResults();event.target.blur();}
  }
});
document.addEventListener('click',event=>{
  const result=event.target.closest('[data-map-result]');
  if(result){const id=Number(result.dataset.mapResult);selectedPin=id;mapMenuOpen=false;mapSearchOpen=false;mapSearchQuery='';if(readyPlaces().some(x=>x.id===id)){mapSheetState='peek';render();}else{mapSheetState='closed';openDetail(id);}return;}
  if(mapSearchOpen&&!event.target.closest('.map-search,.map-search-results')){mapSearchOpen=false;updateMapSearchResults();}
  if(event.target.closest('[data-map-sheet-close]')){mapSheetState='closed';render();return;}
  if(event.target.closest('[data-map-sheet-toggle]')){mapSheetState='closed';openDetail(selectedPin);}
});
let mapSheetStart=null;
document.addEventListener('pointerdown',event=>{
  const target=event.target.closest('.map-place-sheet.peek, .map-place-sheet .map-sheet-handle');
  if(!target)return;
  mapSheetStart={y:event.clientY,id:event.pointerId};
});
document.addEventListener('pointerup',event=>{
  if(!mapSheetStart||mapSheetStart.id!==event.pointerId)return;
  const distance=event.clientY-mapSheetStart.y;
  mapSheetStart=null;
  if(distance<-55&&mapSheetState==='peek'){mapSheetState='closed';openDetail(selectedPin);}
});
document.addEventListener('pointercancel',()=>{mapSheetStart=null;});
let mapSheetWheelAmount=0;
document.addEventListener('wheel',event=>{
  if(!event.target.closest('.map-place-sheet.peek')||mapSheetState!=='peek')return;
  event.preventDefault();
  mapSheetWheelAmount=event.deltaY>0?mapSheetWheelAmount+event.deltaY:0;
  if(mapSheetWheelAmount>=55){mapSheetWheelAmount=0;mapSheetState='closed';openDetail(selectedPin);}
},{passive:false});
document.addEventListener('submit',event=>{
  if(event.target.id!=='map-place-form')return;
  event.preventDefault();
  const form=event.target, data=new FormData(form);
  const title=String(data.get('title')||'').trim(), address=String(data.get('address')||'').trim();
  const type=String(data.get('type')||''), lat=Number(data.get('lat')), lng=Number(data.get('lng'));
  if(!title||!address||!typeOf(type).place||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
  const place={id:Date.now(),title,address,type,category:shortType(type),source:'직접 추가',ago:'방금',desc:'지도에서 직접 추가한 장소',memo:String(data.get('memo')||'').trim(),art:typeOf(type).art,coords:[lat,lng],aiClassified:false};
  items.unshift(place);selectedPin=place.id;mapPickMode=false;mapSheetState='peek';afterChange();$('#sheet').close();render();toast('새 장소를 지도에 추가했어요.');
});

// 코스 지도: 숫자와 직선은 방문 순서만 나타내며 길찾기 결과가 아닙니다.
function initCourseMap(){
  const host=document.getElementById('course-map');
  if(!host)return;
  const fallback=document.getElementById('course-map-fallback');
  if(!window.L){fallback.hidden=false;return;}
  const stops=coursePlan().ids.map(id=>items.find(x=>x.id===id)).filter(x=>x&&mapCoordinates(x));
  const points=stops.map(mapCoordinates);
  realMap=L.map(host,{zoomControl:false,scrollWheelZoom:false}).setView(points[0]||[37.5446,127.0474],13);
  L.control.zoom({position:'bottomright'}).addTo(realMap);
  let tileErrors=0;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).on('tileerror',()=>{if(++tileErrors>=3)fallback.hidden=false;}).addTo(realMap);
  if(points.length>1){
    L.polyline(points,{color:'#6351c8',weight:3,dashArray:'7 7',opacity:.9}).addTo(realMap);
    realMap.fitBounds(L.latLngBounds(points).pad(.3),{maxZoom:14});
  }
  stops.forEach((place,index)=>{
    L.marker(mapCoordinates(place),{
      icon:L.divIcon({className:'course-number-marker',html:`<span>${index+1}</span>`,iconSize:[31,31],iconAnchor:[15,31]}),
      title:`${index+1}. ${place.title}`
    }).addTo(realMap).bindPopup(`<b>${index+1}. ${esc(place.title)}</b><br>${esc(mapPlaceLabel(place))}`);
  });
  requestAnimationFrame(()=>realMap?.invalidateSize());
}
