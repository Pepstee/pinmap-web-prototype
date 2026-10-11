// 저장한 장소로 날짜별 방문 코스를 계획하는 프로토타입.
// 이동 경로와 소요 시간은 계산하지 않으며, 지도 선은 방문 순서만 보여줍니다.
pageName.course = '코스 계획';
const COURSE_STORAGE = 'pinmap.courses.v1';
const courseToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
let courseDate = courseToday();
let coursePlans = {};
try {
  const saved = JSON.parse(localStorage.getItem(COURSE_STORAGE));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) coursePlans = saved;
} catch { /* 저장 공간이 없어도 현재 방문 중에는 계획할 수 있습니다. */ }
const courseValidDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value+'T12:00:00');
  return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === value;
};
// 여러 코스 예시를 별도 보관합니다. 이전 버전이 코스 저장값을 다시 써도 예시가 사라지지 않습니다.
const COURSE_EXAMPLES_STORAGE = 'pinmap.courses.examples.v1';
const COURSE_EXAMPLES_DELETED = 'pinmap.courses.examples.deleted.v1';
try {
  let storedExamples;
  try { storedExamples=JSON.parse(localStorage.getItem(COURSE_EXAMPLES_STORAGE)); } catch {}
  if (!storedExamples || typeof storedExamples!=='object' || Array.isArray(storedExamples)) {
    const hasContent = plan => plan && (String(plan.title||'').trim() || String(plan.note||'').trim() || Array.isArray(plan.ids) && plan.ids.length);
    const examples = [
      {offset:2,title:'성수 카페 산책',ids:[1,8,6],note:'예시 코스 · 저장한 장소로 가볍게 걷는 하루'},
      {offset:4,title:'주말 전시와 저녁',ids:[4,1,8],note:'예시 코스 · 전시와 식사 순서 미리보기'},
      {offset:6,title:'느긋한 동네 탐방',ids:[6,8,1],note:'예시 코스 · 장소 순서를 바꿔보세요'}
    ];
    let count=Object.values(coursePlans).filter(hasContent).length;
    storedExamples={};
    for (const example of examples) {
      if (count>=3) break;
      const day=new Date();day.setDate(day.getDate()+example.offset);
      const date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      if (coursePlans[date]) continue;
      const ids=example.ids.filter(id=>items.some(x=>x.id===id));
      storedExamples[date]={title:example.title,note:example.note,ids,example:true};
      count++;
    }
    localStorage.setItem(COURSE_EXAMPLES_STORAGE,JSON.stringify(storedExamples));
  }
  const deleted=JSON.parse(localStorage.getItem(COURSE_EXAMPLES_DELETED)||'[]');
  for(const [date,plan] of Object.entries(storedExamples)){
    if(!coursePlans[date]&&!deleted.includes(date))coursePlans[date]=plan;
  }
  localStorage.setItem(COURSE_STORAGE,JSON.stringify(coursePlans));
} catch { /* 브라우저 저장이 제한된 경우 기존 코스를 그대로 보여줍니다. */ }
const coursePlan = () => {
  const raw = coursePlans[courseDate] || {};
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    ids: Array.isArray(raw.ids) ? [...new Set(raw.ids.filter(id => Number.isFinite(id) && items.some(x => x.id === id)))] : []
  };
};
function courseSave(plan) {
  coursePlans[courseDate] = plan;
  try { localStorage.setItem(COURSE_STORAGE, JSON.stringify(coursePlans)); }
  catch { toast('브라우저 저장이 제한되어 현재 화면에서만 코스가 유지돼요.'); }
}
function courseRefresh() { const y = scrollY; render(); scrollTo(0, y); }
const courseDateLabel = value => {
  const [y,m,d] = value.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};
function courseStop(x, index, total) {
  return `<li class="course-stop">
    <span class="course-stop-number">${index+1}</span>
    <span class="course-stop-photo">${libThumb(x)}</span>
    <div class="course-stop-info"><b>${esc(x.title)}</b><small>${esc(mapPlaceLabel(x))} · ${esc(x.type)}</small></div>
    <div class="course-stop-actions">
      <button data-course-move="${x.id}" data-direction="-1" aria-label="${esc(x.title)} 순서 올리기" ${index===0?'disabled':''}>↑</button>
      <button data-course-move="${x.id}" data-direction="1" aria-label="${esc(x.title)} 순서 내리기" ${index===total-1?'disabled':''}>↓</button>
      <button data-course-remove="${x.id}" aria-label="${esc(x.title)} 코스에서 빼기">${icon('close')}</button>
    </div>
  </li>`;
}
pages.course = function() {
  const plan = coursePlan();
  const stops = plan.ids.map(id => items.find(x => x.id === id)).filter(Boolean);
  const savedDates = Object.keys(coursePlans).filter(courseValidDate).sort().reverse();
  return `<div class="course-page">
    <button class="back" data-page="${courseReturnPage}">${icon('back')} 이전 화면으로 돌아가기</button>
    <div class="course-heading"><span class="eyebrow">내 장소로 계획하기</span><h1>하루 코스</h1><p>저장한 장소를 고르고 방문 순서를 정해보세요.</p></div>
    <div class="course-fields">
      <label>방문 날짜<input type="date" data-course-date value="${courseDate}"></label>
      <label>코스 이름<input type="text" data-course-title maxlength="40" placeholder="예: 성수에서 보내는 토요일" value="${esc(plan.title)}"></label>
    </div>
    ${savedDates.length ? `<div class="course-date-list" aria-label="저장한 코스 날짜">${savedDates.map(d => `<button data-course-saved-date="${d}" class="${d===courseDate?'current':''}">${esc(courseDateLabel(d))}</button>`).join('')}</div>` : ''}
    <div class="course-map-wrap"><div id="course-map" role="application" aria-label="선택한 장소와 방문 순서 지도"></div><p id="course-map-fallback" hidden>지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p><span class="course-map-caption">${esc(courseDateLabel(courseDate))} · ${stops.length}곳</span></div>
    <p class="course-map-note">지도 점과 연결선은 방문 순서 미리보기예요. 예시 장소의 위치는 실제 주소와 다를 수 있으며, 길찾기 경로·거리·시간은 계산하지 않아요.</p>
    <div class="course-section-head"><div><span class="eyebrow">${esc(courseDateLabel(courseDate))}</span><h2>방문 순서 <span>${stops.length}</span></h2></div><button class="tonal" data-course-open>${icon('plus')} 장소 추가</button></div>
    ${stops.length ? `<ol class="course-stops">${stops.map((x,i) => courseStop(x,i,stops.length)).join('')}</ol>` : `<div class="course-empty">아직 코스에 담은 장소가 없어요.<br>저장한 장소를 골라 첫 번째 방문지를 정해보세요.<button class="filled" data-course-open>저장한 장소 고르기</button></div>`}
    <label class="course-note-label">이날의 메모<textarea data-course-note maxlength="500" rows="3" placeholder="만나는 시간이나 준비할 것을 적어보세요.">${esc(plan.note)}</textarea></label>
    <div class="course-endline"><p class="course-saved-hint">변경 내용은 이 브라우저에 자동 저장돼요.</p>${coursePlans[courseDate]?'<button data-course-delete>이 날짜 코스 삭제</button>':''}</div>
  </div>`;
};
function courseOpenPicker() {
  const chosen = new Set(coursePlan().ids);
  const available = readyPlaces().filter(x => !chosen.has(x.id));
  modal('저장한 장소에서 고르기', available.length
    ? `<p class="hint">주소가 확인되어 지도에 표시할 수 있는 장소만 보여줘요.</p><div class="course-picker">${available.map(x => `<button data-course-pick="${x.id}"><span class="course-picker-photo">${libThumb(x)}</span><span><b>${esc(x.title)}</b><small>${esc(mapPlaceLabel(x))} · ${esc(x.type)}</small></span>${icon('plus')}</button>`).join('')}</div>`
    : `<p>추가할 수 있는 저장 장소가 없어요.</p><p class="hint">지도에 표시할 주소가 확인된 장소를 저장하면 여기서 선택할 수 있어요.</p>`);
}
document.addEventListener('click', e => {
  const view = e.target.closest('[data-course-view]');
  if (view && courseValidDate(view.dataset.courseView)) {
    courseDate = view.dataset.courseView;
    go('course');
    return;
  }
  if (e.target.closest('[data-course-open]')) { courseOpenPicker(); return; }
  if (e.target.closest('[data-course-delete]')) {
    modal('코스를 삭제할까요?', `<p>${esc(courseDateLabel(courseDate))}의 방문 순서와 메모가 삭제돼요. 저장목록의 장소는 그대로 남습니다.</p><div class="dialogactions"><button class="textbtn" data-action="close">취소</button><button class="filled course-delete-confirm" data-course-confirm-delete>코스 삭제</button></div>`);
    return;
  }
  if (e.target.closest('[data-course-confirm-delete]')) {
    if(coursePlans[courseDate]?.example){
      try {
        const deleted=JSON.parse(localStorage.getItem(COURSE_EXAMPLES_DELETED)||'[]');
        if(!deleted.includes(courseDate))deleted.push(courseDate);
        localStorage.setItem(COURSE_EXAMPLES_DELETED,JSON.stringify(deleted));
      } catch {}
    }
    delete coursePlans[courseDate];
    try { localStorage.setItem(COURSE_STORAGE, JSON.stringify(coursePlans)); } catch {}
    $('#sheet').close(); courseRefresh(); return;
  }
  const pick = e.target.closest('[data-course-pick]');
  if (pick) {
    const id = Number(pick.dataset.coursePick), plan = coursePlan();
    if (!plan.ids.includes(id) && readyPlaces().some(x => x.id === id)) { plan.ids.push(id); courseSave(plan); }
    $('#sheet').close(); courseRefresh(); return;
  }
  const remove = e.target.closest('[data-course-remove]');
  if (remove) {
    const plan = coursePlan(); plan.ids = plan.ids.filter(id => id !== Number(remove.dataset.courseRemove));
    courseSave(plan); courseRefresh(); return;
  }
  const move = e.target.closest('[data-course-move]');
  if (move) {
    const plan = coursePlan(), from = plan.ids.indexOf(Number(move.dataset.courseMove));
    const to = from + Number(move.dataset.direction);
    if (from < 0 || to < 0 || to >= plan.ids.length) return;
    [plan.ids[from], plan.ids[to]] = [plan.ids[to], plan.ids[from]];
    courseSave(plan); courseRefresh(); return;
  }
  const savedDate = e.target.closest('[data-course-saved-date]');
  if (savedDate && courseValidDate(savedDate.dataset.courseSavedDate)) {
    courseDate = savedDate.dataset.courseSavedDate; courseRefresh(); scrollTo(0,0);
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-course-date]') && courseValidDate(e.target.value)) {
    courseDate = e.target.value; courseRefresh(); scrollTo(0,0);
  }
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-course-title]')) {
    const plan = coursePlan(); plan.title = e.target.value.slice(0,40); courseSave(plan);
  }
  if (e.target.matches('[data-course-note]')) {
    const plan = coursePlan(); plan.note = e.target.value.slice(0,500); courseSave(plan);
  }
});
