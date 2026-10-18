// 지도에서 여는 날짜별 코스 편집 화면.
(() => {
  const storageKey='pinmap-courses-v1';
  const draftKey='pinmap-course-draft-v1';
  const stopColor=index => index%3===2?'#21c5ad':index%2===1?'#ed607c':'#a65ef2';
  const now=new Date();
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const newId=()=>crypto.randomUUID();
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
  const normalize=value=>{
    if(!value||!Array.isArray(value.days)||!value.days.length)return null;
    return {
      id:typeof value.id==='string'?value.id:newId(),
      title:typeof value.title==='string'?value.title.slice(0,50):'새 코스',
      date:validDate(value.date)?value.date:today,
      days:value.days.slice(0,14).map(day=>Array.isArray(day)?day.filter(stop=>stop&&Number.isFinite(stop.id)&&/^\d{2}:\d{2}$/.test(stop.time)).map(({id,time})=>({id,time})):[])
    };
  };
  let courses=[],course={id:newId(),title:'새 코스',date:today,days:[[]]},draft=null;
  let selectedDay=0,pickerOpen=false,courseMap=null,editing=false;
  try {
    const stored=localStorage.getItem(storageKey);
    if(stored!==null){const values=JSON.parse(stored);if(Array.isArray(values))courses=values.map(normalize).filter(Boolean);}
    else {
      const legacy=normalize(JSON.parse(localStorage.getItem('pinmap-course-v2')));
      if(legacy){courses=[legacy];localStorage.setItem(storageKey,JSON.stringify(courses));}
    }
    draft=normalize(JSON.parse(localStorage.getItem(draftKey)));
    if(draft)course=clone(draft);
  } catch {}
  // Editing saves a recoverable draft; only the Save button updates the saved list.
  const save=()=>{draft=clone(course);try{localStorage.setItem(draftKey,JSON.stringify(draft));return true}catch{toast('임시 저장 공간을 확인해 주세요.');return false}};
  const openCourse=value=>{course=clone(value);selectedDay=0;pickerOpen=false;editing=false;save();go('course')};
  const eligible=()=>items.filter(item=>isPlace(item)&&item.address&&!item.pending);
  const dayStops=()=>course.days[selectedDay];
  const findPlace=id=>eligible().find(item=>item.id===id);
  const thumbnail=item=>({cafe:'img/cafe.jpg',food:'img/brunch.jpg',exhibit:'img/exhibit.jpg',park:'img/park.jpg',sea:'img/park.jpg'})[item.art]||'img/park.jpg';
  const stopTime=()=>{const last=dayStops().at(-1)?.time||'08:30';const [h,m]=last.split(':').map(Number);const total=Math.min(h*60+m+90,23*60+45);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
  const dayDate=index=>{const [y,m,d]=course.date.split('-').map(Number);const date=new Date(y,m-1,d+index);return `${date.getMonth()+1}.${date.getDate()}`};
  const coordinates=item=>item.lat!=null&&item.lng!=null?[item.lat,item.lng]:({1:[37.5461,127.0434],4:[37.5441,127.0495],6:[37.5445,127.0374],8:[37.5490,127.0460],13:[37.5441,127.0495]})[item.id];
  pageName.course='코스 만들기';
  pageName.courses='저장한 코스';
  pages.courses=function(){
    return `<section class="coursepage course-list-page">
      <header class="course-header"><div class="course-toolbar"><button class="course-close" data-page="map" aria-label="지도로 돌아가기">${icon('back')}</button></div><h1>저장한 코스</h1><p>나만의 동선을 모아두고 다시 꺼내보세요.</p></header>
      <div class="course-list-body">
        <button class="course-new" data-course-new>${icon('plus')} 새 코스 만들기</button>
        ${draft?`<button class="course-resume" data-course-resume><span>작성 중인 코스 이어서 만들기</span>${icon('arrow')}</button>`:''}
        <div class="course-list-heading">코스 ${courses.length}개</div>
        ${courses.length?courses.map(saved=>{const places=saved.days.flat().map(stop=>findPlace(stop.id)).filter(Boolean);return `<button class="course-saved-card" data-course-open="${esc(saved.id)}">${places[0]?`<img src="${thumbnail(places[0])}" alt="">`:`<span class="course-saved-placeholder">${icon('map')}</span>`}<span><b>${esc(saved.title)}</b><small>${esc(saved.date)} · 장소 ${places.length}곳</small><span class="course-saved-stops">${places.map(place=>esc(place.title)).join(' → ')||'장소를 추가해 주세요'}</span></span>${icon('arrow')}</button>`}).join(''):'<div class="course-list-empty">아직 저장한 코스가 없어요.<br>저장한 장소로 첫 코스를 만들어 보세요.</div>'}
      </div></section>`;
  };
  pages.course=function(){
    const stops=dayStops().map(stop=>({...stop,place:findPlace(stop.id)})).filter(stop=>stop.place);
    const available=eligible().filter(item=>!dayStops().some(stop=>stop.id===item.id));
    return `<section class="coursepage ${editing?'is-editing':''}">
      <header class="course-header">
        <div class="course-toolbar"><button class="course-close" data-page="courses" aria-label="저장한 코스로 돌아가기">${icon('back')}</button><div class="course-header-actions">
        <button class="course-share" data-course-share aria-label="코스 공유하기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v8h14v-8"/></svg></button><button class="course-save" data-course-save>저장</button></div></div>
        <div class="course-title-row"><div><input data-course-field="title" aria-label="코스 이름" maxlength="50" value="${esc(course.title)}" readonly><button class="course-title-edit" data-course-edit-title aria-label="코스 제목 수정" title="코스 제목 수정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4"/></svg></button></div><label><input data-course-field="date" type="date" aria-label="코스 출발일" value="${esc(course.date)}"></label></div>
      </header>
      <div class="course-map-wrap"><div id="course-map" aria-label="코스 장소 지도"></div></div>
      <div class="course-body">
        ${course.days.length>1?`<div class="course-days" aria-label="코스 날짜">${course.days.map((_,index)=>`<button data-course-day="${index}" class="${selectedDay===index?'selected':''}" aria-pressed="${selectedDay===index}">${index+1}일차 <small>${dayDate(index)}</small></button>`).join('')}</div>`:''}
        <div class="course-edit-bar" ${editing?'':'hidden'}><button data-course-done ${editing?'':'hidden'}>완료</button></div>
        ${stops.length?`<div class="course-timeline">${stops.map((stop,index)=>`<div class="course-row" data-course-id="${stop.id}"><span class="course-badge" style="background:${stopColor(index)}">${index+1}</span><article class="course-card" tabindex="0" aria-label="${esc(stop.place.title)} 일정 편집"><button class="course-remove" data-course-remove="${stop.id}" aria-label="${esc(stop.place.title)} 삭제" ${editing?'':'hidden'}>×</button><div class="course-card-head"><img src="${thumbnail(stop.place)}" alt=""><div><b>${esc(stop.place.title)}</b><small>${esc(stop.place.category||stop.place.type)} · ${esc(stop.place.address)}</small></div></div></article></div>`).join('')}</div>`:'<div class="course-empty">이 날의 코스가 비어 있어요.<br>저장한 장소를 추가해 보세요.</div>'}
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
    dialog.innerHTML=`<section class="course-share-sheet"><h2>코스 공유</h2><p>코스 내용을 복사해 공유하세요.</p><textarea aria-label="공유할 코스" readonly>${esc(text)}</textarea><div><button data-course-share-close>닫기</button><button data-course-share-copy>복사하기</button></div></section>`;
    dialog.showModal();
    dialog.querySelector('[data-course-share-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-course-share-copy]').onclick=async()=>{
      try{await navigator.clipboard.writeText(text);toast('코스를 복사했어요.');dialog.close();}
      catch{dialog.querySelector('textarea').select();toast('선택된 내용을 복사해 주세요.');}
    };
  }
  document.addEventListener('click',async event=>{
    if(page==='courses'){
      if(event.target.closest('[data-course-new]'))openCourse({id:newId(),title:'새 코스',date:today,days:[[]]});
      else if(event.target.closest('[data-course-resume]')&&draft)openCourse(draft);
      else {const button=event.target.closest('[data-course-open]');const saved=button&&courses.find(value=>value.id===button.dataset.courseOpen);if(saved)openCourse(saved);}
      return;
    }
    if(page!=='course')return;
    if(event.target.closest('[data-course-save]')){
      if(!course.days.flat().some(stop=>findPlace(stop.id))){toast('저장할 장소를 한 곳 이상 추가해 주세요.');return;}
      course.title=course.title.trim()||'새 코스';
      const updated=clone(course),next=courses.some(value=>value.id===course.id)?courses.map(value=>value.id===course.id?updated:value):[updated,...courses];
      try{localStorage.setItem(storageKey,JSON.stringify(next));}
      catch{toast('코스를 저장하지 못했어요. 저장 공간을 확인해 주세요.');return;}
      courses=next;draft=null;
      try{localStorage.removeItem(draftKey)}catch{}
      go('courses');toast('코스를 저장했어요.');return;
    }
    if(event.target.closest('[data-course-edit-title]')){
      const title=document.querySelector('[data-course-field="title"]');
      if(title){title.readOnly=false;title.focus();title.select()}
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
  document.addEventListener('focusout',event=>{if(page==='course'&&event.target.dataset.courseField==='title'){event.target.readOnly=true;if(!course.title.trim()){course.title='새 코스';event.target.value=course.title;save()}}});
  document.addEventListener('change',event=>{if(page!=='course')return;if(event.target.dataset.courseField==='date'){if(!validDate(event.target.value)){event.target.value=course.date;toast('출발일을 선택해 주세요.');return;}course.date=event.target.value;refresh()}else if(event.target.dataset.courseTime){const stop=dayStops().find(item=>item.id===Number(event.target.dataset.courseTime));if(stop){stop.time=event.target.value;save()}}});
})();
