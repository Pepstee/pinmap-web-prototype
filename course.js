// 지도에서 여는 날짜별 코스 편집 화면.
(() => {
  const storageKey='pinmap-course-v2';
  const stopColor=index => index%3===2?'#21c5ad':index%2===1?'#ed607c':'#a65ef2';
  const now=new Date();
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const exampleFriends=['민지','준호','서연'];
  const friendDirectory=['민지','준호','서연','지우','현우'];
  const friendPhotoStyle=name=>`background-position:${Math.max(0,friendDirectory.indexOf(name))%3*50}% center`;
  const initial={title:'성수 하루 코스',date:today,friends:exampleFriends,days:[[{id:1,time:'10:00'},{id:8,time:'12:00'},{id:4,time:'14:00'}],[]]};
  let course=initial,selectedDay=0,pickerOpen=false,courseMap=null,editing=false;
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved&&Array.isArray(saved.days)&&saved.days.length) course={
      title:typeof saved.title==='string'?saved.title:initial.title,
      friends:Array.isArray(saved.friends)?[...new Set([...exampleFriends,...saved.friends.filter(x=>typeof x==='string')])]:exampleFriends,
      date:/^\d{4}-\d{2}-\d{2}$/.test(saved.date)?saved.date:initial.date,
      days:saved.days.slice(0,14).map(day=>Array.isArray(day)?day.filter(stop=>Number.isFinite(stop.id)&&/^\d{2}:\d{2}$/.test(stop.time)):[])
    };
  } catch {}
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(course))}catch{}};
  const eligible=()=>items.filter(item=>isPlace(item)&&item.address&&!item.pending);
  const dayStops=()=>course.days[selectedDay];
  const findPlace=id=>eligible().find(item=>item.id===id);
  const thumbnail=item=>({cafe:'img/cafe.jpg',food:'img/brunch.jpg',exhibit:'img/exhibit.jpg',park:'img/park.jpg',sea:'img/park.jpg'})[item.art]||'img/park.jpg';
  const stopTime=()=>{const last=dayStops().at(-1)?.time||'08:30';const [h,m]=last.split(':').map(Number);const total=Math.min(h*60+m+90,23*60+45);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
  const dayDate=index=>{const [y,m,d]=course.date.split('-').map(Number);const date=new Date(y,m-1,d+index);return `${date.getMonth()+1}.${date.getDate()}`};
  const coordinates=item=>item.lat!=null&&item.lng!=null?[item.lat,item.lng]:({1:[37.5461,127.0434],4:[37.5441,127.0495],6:[37.5445,127.0374],8:[37.5490,127.0460],13:[37.5441,127.0495]})[item.id];
  pageName.course='코스 짜기';
  pages.course=function(){
    const stops=dayStops().map(stop=>({...stop,place:findPlace(stop.id)})).filter(stop=>stop.place);
    const available=eligible().filter(item=>!dayStops().some(stop=>stop.id===item.id));
    return `<section class="coursepage ${editing?'is-editing':''}">
      <header class="course-header">
        <div class="course-toolbar"><button class="course-close" data-page="map" aria-label="지도로 돌아가기">${icon('close')}</button><div class="course-header-actions">
        <button class="course-friends" data-course-friends aria-label="친구 추가하기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="3"/><path d="M12 13a7 7 0 0 0-3-1c-4 0-6 2-6 5v2h7"/><circle cx="17" cy="17" r="5"/><path d="M17 14.5v5M14.5 17h5"/></svg></button>
        <button class="course-share" data-course-share aria-label="코스 공유하기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v8h14v-8"/></svg></button></div></div>
        <div class="course-title-row"><div><input data-course-field="title" aria-label="코스 이름" maxlength="50" value="${esc(course.title)}" readonly><button class="course-title-edit" data-course-edit-title aria-label="코스 제목 수정" title="코스 제목 수정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4"/></svg></button></div><label><input data-course-field="date" type="date" aria-label="코스 출발일" value="${esc(course.date)}"></label></div>
      </header>
      <div class="course-map-wrap"><div id="course-map" aria-label="코스 장소 지도"></div></div>
      <div class="course-companions" aria-label="함께하는 친구">${(course.friends||[]).map(name=>`<span class="course-friend" title="${esc(name)}"><span class="course-friend-photo" style="${friendPhotoStyle(name)}"></span><span class="course-friend-name">${esc(name)}</span></span>`).join('')}</div>
      <div class="course-body">
        <div class="course-edit-bar" ${editing?'':'hidden'}><button data-course-done ${editing?'':'hidden'}>완료</button></div>
        ${stops.length?`<div class="course-timeline">${stops.map((stop,index)=>`<div class="course-row" data-course-id="${stop.id}"><span class="course-badge" style="background:${stopColor(index)}">${index+1}</span><article class="course-card" tabindex="0" aria-label="${esc(stop.place.title)} 일정 편집"><button class="course-remove" data-course-remove="${stop.id}" aria-label="${esc(stop.place.title)} 삭제" ${editing?'':'hidden'}>×</button><div class="course-card-head"><img src="${thumbnail(stop.place)}" alt=""><div><b>${esc(stop.place.title)}</b><small>${esc(stop.place.category||stop.place.type)} · ${esc(stop.place.address)}</small></div></div><div class="course-card-summary"><strong>추천</strong><span>${esc(stop.place.desc||stop.place.memo||'다음에 방문하고 싶은 장소')}</span></div></article></div>`).join('')}</div>`:'<div class="course-empty">이 날의 코스가 비어 있어요.<br>저장한 장소를 추가해 보세요.</div>'}
        <button class="course-add-place" data-course-picker aria-label="장소 추가하기">${icon('plus')}</button>
        ${pickerOpen?`<section id="course-picker" class="course-picker"><div class="course-picker-heading"><h2>저장한 장소</h2><button data-course-picker aria-label="장소 목록 닫기">${icon('close')}</button></div>${available.length?available.map(item=>`<div class="course-option"><img src="${thumbnail(item)}" alt=""><div><b>${esc(item.title)}</b><small>${esc(item.category||item.type)}</small></div><button data-course-add="${item.id}" aria-label="${esc(item.title)} 추가">추가</button></div>`).join(''):'<p>이 날짜에 추가할 장소가 없습니다.</p>'}</section>`:''}

      </div>
    </section>`;
  };
  window.unmountCourseMap=()=>{if(courseMap){courseMap.remove();courseMap=null}};
  window.mountCourseMap=()=>{
    window.unmountCourseMap();
    if(!window.L||!document.getElementById('course-map'))return;
    courseMap=L.map('course-map',{zoomControl:false,scrollWheelZoom:false,zoomAnimation:false,dragging:false,keyboard:false}).setView([37.5445,127.043],13);
    const points=[];
    dayStops().forEach((stop,index)=>{const place=findPlace(stop.id),point=place&&coordinates(place);if(!point)return;points.push(point);L.marker(point,{icon:L.divIcon({className:'course-map-marker',html:`<span style="background:${stopColor(index)}">${index+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(courseMap)});
    if(points.length>1){L.polyline(points,{color:'#737373',weight:3,opacity:.75,dashArray:'6 6'}).addTo(courseMap);courseMap.fitBounds(points,{padding:[48,48],maxZoom:14})}
    else if(points.length===1)courseMap.setView(points[0],14);
    window.attachPinmapBasemap(courseMap);
    requestAnimationFrame(()=>courseMap?.invalidateSize());
  };
  const renderInPlace=()=>{const y=window.scrollY;render();window.scrollTo(0,y);requestAnimationFrame(()=>window.scrollTo(0,y))};
  const refresh=()=>{save();renderInPlace()};
  let gesture=null,holdTimer=null,dragFrame=null,suppressClickUntil=0;
  const enterEdit=()=>{
    editing=true;
    document.querySelector('.coursepage')?.classList.add('is-editing');
    document.querySelector('.course-edit-bar')?.removeAttribute('hidden');
    document.querySelectorAll('.course-remove,[data-course-done]').forEach(el=>el.hidden=false);
  };
  function dragTick(){
    if(!gesture?.active)return;
    const g=gesture;
    if(!g.row.isConnected){endGesture(true);return;}
    g.ghost.style.top=`${g.y-g.offset}px`;
    const edge=85, height=window.innerHeight;
    const speed=g.y<edge?-Math.ceil((edge-g.y)/7):g.y>height-edge?Math.ceil((g.y-height+edge)/7):0;
    if(speed)window.scrollBy(0,speed);
    placeRow(g);
    dragFrame=requestAnimationFrame(dragTick);
  }
  function placeRow(g){
    const rows=[...g.row.parentNode.querySelectorAll('.course-row')].filter(row=>row!==g.row);
    const next=rows.find(row=>{const rect=row.getBoundingClientRect();return g.y<rect.top+rect.height/2});
    g.row.parentNode.insertBefore(g.row,next||null);
  }
  function activateDrag(){
    if(!gesture||!gesture.row.isConnected)return;
    enterEdit();
    const g=gesture,rect=g.row.getBoundingClientRect();
    g.active=true;g.offset=g.y-rect.top;
    g.ghost=g.row.cloneNode(true);g.ghost.removeAttribute('data-course-id');
    g.ghost.classList.add('course-drag-ghost');g.ghost.setAttribute('aria-hidden','true');
    Object.assign(g.ghost.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`});
    document.body.append(g.ghost);g.row.classList.add('course-drag-placeholder');
    document.body.classList.add('course-dragging');dragTick();
  }
  function startGesture(target,x,y,id){
    if(page!=='course'||target.closest('button,input,a,select'))return;
    const card=target.closest('.course-card');if(!card)return;
    endGesture(true);
    gesture={row:card.closest('.course-row'),x,y,startX:x,startY:y,id,active:false};
    if(editing)activateDrag();else holdTimer=setTimeout(activateDrag,450);
  }
  function moveGesture(x,y,event){
    if(!gesture)return;
    if(!gesture.active&&Math.hypot(x-gesture.startX,y-gesture.startY)>10){endGesture(true);return;}
    gesture.x=x;gesture.y=y;
    if(gesture.active&&event.cancelable)event.preventDefault();
  }
  function endGesture(cancelled=false){
    clearTimeout(holdTimer);cancelAnimationFrame(dragFrame);
    const g=gesture;gesture=null;if(!g)return;
    g.ghost?.remove();g.row.classList.remove('course-drag-placeholder');document.body.classList.remove('course-dragging');
    if(!g.active)return;
    suppressClickUntil=Date.now()+350;
    if(!cancelled&&g.row.isConnected){
      placeRow(g);
      const ids=[...g.row.parentNode.querySelectorAll('[data-course-id]')].map(row=>Number(row.dataset.courseId));
      const original=dayStops();course.days[selectedDay]=[...ids.map(id=>original.find(stop=>stop.id===id)).filter(Boolean),...original.filter(stop=>!ids.includes(stop.id))];
      save();
    }
    if(page==='course')renderInPlace();
  }
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0){if(event.target.closest('.course-card')&&!event.target.closest('button,input,a,select'))event.preventDefault();startGesture(event.target,event.clientX,event.clientY,event.pointerId)}});
  document.addEventListener('pointermove',event=>{if(gesture?.id===event.pointerId)moveGesture(event.clientX,event.clientY,event)});
  document.addEventListener('pointerup',event=>{if(gesture?.id===event.pointerId){gesture.y=event.clientY;endGesture()}});
  document.addEventListener('pointercancel',()=>endGesture(true));
  document.addEventListener('touchstart',event=>{if(event.touches.length!==1){endGesture(true);return;}const t=event.touches[0];startGesture(event.target,t.clientX,t.clientY,'touch')},{passive:true});
  document.addEventListener('touchmove',event=>{if(gesture?.id==='touch'){const t=event.touches[0];moveGesture(t.clientX,t.clientY,event)}},{passive:false});
  document.addEventListener('touchend',()=>{if(gesture?.id==='touch')endGesture()});
  document.addEventListener('touchcancel',()=>endGesture(true));
  window.addEventListener('blur',()=>endGesture(true));
  document.addEventListener('contextmenu',event=>{if(event.target.closest('.course-card'))event.preventDefault()});
  document.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
  document.addEventListener('keydown',event=>{
    const card=event.target.closest('.course-card');if(!card||event.target!==card)return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();enterEdit();}
    if(editing&&['ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();const id=Number(card.closest('[data-course-id]').dataset.courseId),list=dayStops(),index=list.findIndex(stop=>stop.id===id),next=index+(event.key==='ArrowUp'?-1:1);
      if(next>=0&&next<list.length){[list[index],list[next]]=[list[next],list[index]];refresh();document.querySelector(`[data-course-id="${id}"] .course-card`)?.focus()}
    }
    if(event.key==='Escape'){editing=false;render()}
  });
  function shareText(){
    const stops=dayStops().map(stop=>findPlace(stop.id)).filter(Boolean);
    return `${course.title}\n${course.date}\n\n`+stops.map((place,index)=>`${index+1}. ${place.title}\n${place.address||''}`).join('\n\n');
  }
  function shareFallback(text){
    const dialog=document.getElementById('sheet');
    dialog.innerHTML=`<section class="course-share-sheet"><h2>친구에게 코스 공유</h2><p>내용을 복사해 친구에게 보내세요.</p><textarea aria-label="공유할 코스" readonly>${esc(text)}</textarea><div><button data-course-share-close>닫기</button><button data-course-share-copy>복사하기</button></div></section>`;
    dialog.showModal();
    dialog.querySelector('[data-course-share-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-course-share-copy]').onclick=async()=>{
      try{await navigator.clipboard.writeText(text);toast('코스를 복사했어요.');dialog.close();}
      catch{dialog.querySelector('textarea').select();toast('선택된 내용을 복사해 주세요.');}
    };
  }
  document.addEventListener('click',async event=>{
    if(page!=='course')return;
    if(event.target.closest('[data-course-edit-title]')){
      const title=document.querySelector('[data-course-field="title"]');
      if(title){title.readOnly=false;title.focus();title.select()}
      return;
    }
    if(event.target.closest('[data-course-friends]')){
      const dialog=document.getElementById('sheet');
      const contacts=[...new Set([...friendDirectory,...(course.friends||[])])];
      dialog.innerHTML=`<form class="course-friends-sheet" id="course-friend-form"><div class="course-friends-head"><div><h2>친구 초대</h2><p>함께할 친구를 선택해 주세요</p></div><button type="button" data-friend-close aria-label="닫기">×</button></div><input class="course-friends-search" type="search" aria-label="친구 검색" placeholder="친구 이름 검색" autocomplete="off"><div class="course-friends-list" role="group" aria-label="친구 목록">${contacts.map(name=>{const invited=(course.friends||[]).includes(name);return `<label class="course-friends-row" data-friend-name="${esc(name)}"><span class="course-friend-photo" style="${friendPhotoStyle(name)}"></span><span class="course-friends-name">${esc(name)}</span>${invited?'<span class="course-friends-invited">참여 중</span>':''}<input type="checkbox" name="friend" value="${esc(name)}" aria-label="${esc(name)} 초대" ${invited?'disabled':''}></label>`}).join('')}</div><p class="course-friends-empty" hidden>검색 결과가 없습니다.</p><div class="course-friends-actions"><button type="button" data-friend-close>취소</button><button type="submit" data-friend-invite disabled>친구 선택</button></div></form>`;
      dialog.showModal();dialog.querySelector('.course-friends-search').focus();
      dialog.querySelector('[data-friend-close]').onclick=()=>dialog.close();
      dialog.querySelectorAll('[data-friend-close]').forEach(button=>button.onclick=()=>dialog.close());
      const updateInvite=()=>{const selected=dialog.querySelectorAll('input[name="friend"]:checked:not(:disabled)').length;const button=dialog.querySelector('[data-friend-invite]');button.disabled=!selected;button.textContent=selected?`${selected}명 초대하기`:'친구 선택'};
      dialog.querySelector('.course-friends-list').onchange=updateInvite;
      dialog.querySelector('.course-friends-search').oninput=e=>{let visible=0;dialog.querySelectorAll('.course-friends-row').forEach(row=>{row.hidden=!row.dataset.friendName.includes(e.target.value.trim());if(!row.hidden)visible++});dialog.querySelector('.course-friends-empty').hidden=!!visible};
      dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const selected=[...dialog.querySelectorAll('input[name="friend"]:checked:not(:disabled)')].map(input=>input.value);if(!selected.length)return;course.friends=[...new Set([...(course.friends||[]),...selected])];save();dialog.close();render();toast(`${selected.length}명을 코스에 추가했어요`)};
      return;
    }
    if(event.target.closest('[data-course-share]')){
      const text=shareText();
      if(navigator.share){try{await navigator.share({title:course.title,text});}catch(error){if(error.name!=='AbortError')shareFallback(text);}}
      else shareFallback(text);
      return;
    }
    const button=event.target.closest('[data-course-day],[data-course-add-day],[data-course-remove-day],[data-course-picker],[data-course-add],[data-course-remove],[data-course-done]');
    if(!button)return;
    if(button.hasAttribute('data-course-done')){editing=false;render();return}
    if(button.dataset.courseDay!==undefined){editing=false;selectedDay=Number(button.dataset.courseDay);pickerOpen=false;render();window.scrollTo(0,0);return}
    if(button.hasAttribute('data-course-add-day')){if(course.days.length<14){course.days.push([]);selectedDay=course.days.length-1;pickerOpen=true;refresh()}return}
    if(button.hasAttribute('data-course-remove-day')){if(selectedDay>0){course.days.splice(selectedDay,1);selectedDay=Math.max(0,selectedDay-1);pickerOpen=false;refresh()}return}
    if(button.hasAttribute('data-course-picker')){pickerOpen=!pickerOpen;render();if(pickerOpen)requestAnimationFrame(()=>document.getElementById('course-picker')?.scrollIntoView({behavior:'smooth',block:'start'}));return}
    if(button.dataset.courseAdd){const id=Number(button.dataset.courseAdd);if(findPlace(id)&&!dayStops().some(stop=>stop.id===id)){dayStops().push({id,time:stopTime()});refresh()}return}
    if(button.dataset.courseRemove&&editing){course.days[selectedDay]=dayStops().filter(stop=>stop.id!==Number(button.dataset.courseRemove));refresh();return}

  });
  document.addEventListener('input',event=>{if(page==='course'&&event.target.dataset.courseField==='title'){course.title=event.target.value;save()}});
  document.addEventListener('focusout',event=>{if(page==='course'&&event.target.dataset.courseField==='title'){event.target.readOnly=true;if(!course.title.trim()){course.title='성수 하루 코스';event.target.value=course.title;save()}}});
  document.addEventListener('change',event=>{if(page!=='course')return;if(event.target.dataset.courseField==='date'){course.date=event.target.value;refresh()}else if(event.target.dataset.courseTime){const stop=dayStops().find(item=>item.id===Number(event.target.dataset.courseTime));if(stop){stop.time=event.target.value;save()}}});
})();
