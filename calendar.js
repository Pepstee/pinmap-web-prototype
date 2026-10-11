// 마감 캘린더 (하단 메뉴 '캘린더' 탭)
// 마감이 있는 저장 콘텐츠를 달력에 표시하고, 날짜별 · 곧 마감되는 콘텐츠를 보여줘요.
// pinmap.js 다음에 불러와야 해요(브라우저에 저장된 데이터를 읽은 뒤 실행).

/* ---------- 하단 메뉴에 캘린더 추가 ---------- */
NAV.splice(3, 0, ['calendar', 'calendar', '캘린더']);
pageName.calendar = '계획';
pageName.courses = '내 코스';

/* ---------- 마감이 적힌 콘텐츠만 캘린더에 ---------- */
// 전시 기간 · 지원 마감처럼 원본 콘텐츠에 마감이 적혀 있는 것만 표시해요.
// 예전 미리보기에서 임의로 붙였던 예시 마감은 지워요.
const CAL_OLD = [1, 2, 9, 10];
items.forEach(x => {
  if (!x.calPatched) return;
  if (CAL_OLD.includes(x.id)) { delete x.deadline; delete x.dueLabel; }
  delete x.calPatched;
});
const e4 = items.find(x => x.id === 4); if (e4 && !e4.dueLabel) e4.dueLabel = '전시 종료';
// 마감이 적힌 예시 콘텐츠 2개 (한 번만 추가 · 지우면 다시 생기지 않아요)
if (!settings.calSeeded) {
  const seeds = [
    {id:12,title:'2026 하반기 청년 디자인 장학생 모집',type:'생활 정보',category:'장학금',source:'Instagram',ago:'3일 전',desc:'학기당 200만 원 · 포트폴리오 제출',memo:'포트폴리오 PDF 미리 정리해두기',art:'tips',collection:'',deadline:'D-5',dueLabel:'지원 마감',aiClassified:true},
    {id:13,title:'성수 오브젝트 팝업 스토어',type:'전시·팝업',category:'팝업',source:'Instagram',ago:'1일 전',desc:'리빙 브랜드 12곳이 모인 2주 팝업',memo:'친구랑 주말에 같이 가보기',art:'exhibit',distance:'도보 8분',collection:'이번 주말 성수',address:'서울 성동구 성수동 · 예시 팝업',period:'10.3 – 10.21 · 예시 기간',deadline:'D-11',dueLabel:'팝업 종료',aiClassified:true}
  ];
  seeds.forEach(x => { if (!items.some(i => i.id === x.id)) items.push(x); });
  settings.calSeeded = true;
}
afterChange();

/* ---------- 날짜 계산 ---------- */
const calToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
const calKey = d => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
const calDays = x => Number(String(x.deadline || '').replace(/\D/g, '')); // 'D-3' → 3
function calDue(x){ // 마감일 (오늘 기준 D-n)
  if (!x.deadline) return null;
  const d = new Date(calToday); d.setDate(d.getDate() + calDays(x)); return d;
}
const calDueList = () => items.filter(x => calDue(x)).sort((a,b) => calDue(a) - calDue(b));
let calMonth = new Date(calToday.getFullYear(), calToday.getMonth(), 1);
let calSel = calKey(calToday);

function calRow(x){
  const d = calDue(x), n = calDays(x);
  return `<button class="calrow" data-detail="${x.id}">
    <span class="calthumb">${libThumb(x)}</span>
    <span class="caltext"><b>${esc(x.title)}</b><small>${icon('clock')}${esc(x.dueLabel || (x.period ? '운영 종료' : '마감'))} · ${d.getMonth()+1}.${String(d.getDate()).padStart(2,'0')}</small></span>
    <span class="calbadge ${n <= 3 ? 'soon' : ''}">${n === 0 ? 'D-day' : 'D-' + n}</span>
  </button>`;
}

function calSavedCourses(){
  return Object.entries(coursePlans)
    .filter(([date,plan])=>courseValidDate(date)&&plan&&typeof plan==='object'&&(String(plan.title||'').trim()||String(plan.note||'').trim()||Array.isArray(plan.ids)&&plan.ids.length))
    .sort(([a],[b])=>b.localeCompare(a));
}
function calCourseCard([date,plan]){
  const stops=Array.isArray(plan.ids)?plan.ids.map(id=>items.find(x=>x.id===id)).filter(Boolean):[];
  return `<button class="cal-course-card" data-course-view="${date}" aria-label="${esc(courseDateLabel(date))} ${esc(String(plan.title||'').trim()||'하루 코스')} 보기"><span class="cal-course-date">${esc(courseDateLabel(date))}${plan.example?' <span class="cal-course-example">예시</span>':''}</span><span class="cal-course-title">${esc(String(plan.title||'').trim()||'하루 코스')}</span><span class="cal-course-meta">${stops.length}곳${stops.length?` · ${esc(stops.slice(0,2).map(x=>x.title).join(' → '))}${stops.length>2?' 외':''}`:''}</span><span class="cal-course-arrow">${icon('arrow')}</span></button>`;
}
function calCourseSection(){
  const saved=calSavedCourses();
  return `<section class="cal-courses" aria-label="내 코스"><div class="sectionhead"><h2>내 코스 <span class="cal-course-count">${saved.length}</span></h2><button class="textbtn" data-page="course">코스 계획하기 ${icon('arrow')}</button></div>
    ${saved.length?`<div class="cal-course-carousel" aria-label="내 코스 가로 목록">${saved.map(calCourseCard).join('')}</div>${saved.length>2?`<button class="cal-course-all" data-page="courses">모든 코스 보기 ${icon('arrow')}</button>`:''}`:'<p class="cal-course-empty">아직 저장한 코스가 없어요. 날짜와 장소를 골라 첫 코스를 만들어 보세요.</p>'}</section>`;
}

pages.courses = function(){
  const saved=calSavedCourses();
  return `<div class="all-courses-page"><button class="back" data-page="calendar">${icon('back')} 계획으로 돌아가기</button><div class="all-courses-head"><div><span class="eyebrow">내가 계획한 하루</span><h1>내 코스 <span>${saved.length}</span></h1></div><button class="tonal" data-page="course">${icon('plus')} 새 코스</button></div>${saved.length?`<div class="all-courses-list">${saved.map(calCourseCard).join('')}</div>`:'<p class="cal-course-empty">아직 저장한 코스가 없어요. 새 코스를 계획해 보세요.</p>'}</div>`;
};

pages.calendar = function(){
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
  const dueByDay = {};
  calDueList().forEach(x => { const k = calKey(calDue(x)); (dueByDay[k] = dueByDay[k] || []).push(x); });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span class="calcell calblank"></span>');
  for (let d = 1; d <= last; d++) {
    const date = new Date(y, m, d), k = calKey(date), list = dueByDay[k] || [];
    const cls = [k === calKey(calToday) ? 'today' : '', k === calSel ? 'sel' : '', date < calToday ? 'past' : ''].join(' ');
    cells.push(`<button class="calcell ${cls}" data-calday="${k}" aria-pressed="${k === calSel}" aria-label="${m+1}월 ${d}일${list.length ? `, 마감 ${list.length}개` : ''}"><span>${d}</span>${list.length ? '<i class="caldot"></i>' : ''}</button>`);
  }
  const [sy, sm, sd] = calSel.split('-').map(Number);
  const selList = dueByDay[calSel] || [];
  const soon = calDueList().filter(x => calDue(x) >= calToday).slice(0, 5);
  return head('계획', '', false) + `
    ${calCourseSection()}
    <div class="sectionhead"><h2>마감 캘린더</h2></div>
    <section class="calbox">
      <div class="calhead">
        <h2>${y}년 ${m + 1}월</h2>
        <div class="calnav"><button data-calnav="-1" aria-label="이전 달">${icon('chevleft')}</button><button data-calnav="1" aria-label="다음 달">${icon('chevright')}</button></div>
      </div>
      <div class="calweek" aria-hidden="true">${['일','월','화','수','목','금','토'].map(w => `<span>${w}</span>`).join('')}</div>
      <div class="calgrid">${cells.join('')}</div>
    </section>
    <div class="sectionhead"><h2>${sm}월 ${sd}일 마감</h2><span class="hint">${selList.length}개</span></div>
    ${selList.length ? `<div class="callist">${selList.map(calRow).join('')}</div>` : '<p class="calempty">이 날 마감되는 콘텐츠가 없어요.</p>'}
    <div class="sectionhead"><h2>곧 마감돼요</h2></div>
    ${soon.length ? `<div class="callist">${soon.map(calRow).join('')}</div>` : '<p class="calempty">다가오는 마감이 없어요.</p>'}`;
};

document.addEventListener('click', e => {
  const day = e.target.closest('[data-calday]');
  if (day) { calSel = day.dataset.calday; const y = scrollY; render(); scrollTo(0, y); return; }
  const nav = e.target.closest('[data-calnav]');
  if (nav) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(nav.dataset.calnav), 1); const y = scrollY; render(); scrollTo(0, y); }
});

render();
