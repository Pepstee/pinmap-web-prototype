// 마감 캘린더 (하단 메뉴 '캘린더' 탭)
// 마감이 있는 저장 콘텐츠를 달력에 표시하고, 날짜별 · 곧 마감되는 콘텐츠를 보여줘요.
// pinmap.js 다음에 불러와야 해요(브라우저에 저장된 데이터를 읽은 뒤 실행).

/* ---------- 하단 메뉴에 캘린더 추가 ---------- */
NAV.splice(3, 0, ['calendar', 'calendar', '캘린더']);
pageName.calendar = '캘린더';

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
if (!PM_ENV.development && !settings.calSeeded) {
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
let calBodyH = 0; // 월 목록 높이 (열기 직전 달력 높이)
let calPick = false; // 월 선택 패널 열림
let calMonth = new Date(calToday.getFullYear(), calToday.getMonth(), 1);
let calSel = calKey(calToday);
const calSelDate = () => { const [y, m, d] = calSel.split('-').map(Number); return new Date(y, m - 1, d); };

function calRow(x){
  const d = calDue(x), n = calDays(x);
  return `<button class="calrow" data-detail="${x.id}">
    <span class="calthumb">${libThumb(x)}</span>
    <span class="caltext"><b>${esc(x.title)}</b><small>${icon('clock')}${esc(x.dueLabel || (x.period ? '운영 종료' : '마감'))} · ${d.getMonth()+1}.${String(d.getDate()).padStart(2,'0')}</small></span>
    <span class="calbadge ${n <= 3 ? 'soon' : ''}">${n === 0 ? 'D-day' : 'D-' + n}</span>
  </button>`;
}

pages.calendar = function(){
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
  const dueByDay = {};
  calDueList().forEach(x => { const k = calKey(calDue(x)); (dueByDay[k] = dueByDay[k] || []).push(x); });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span class="calcell calblank"></span>');
  for (let d = 1; d <= last; d++) {
    const date = new Date(y, m, d), k = calKey(date), list = dueByDay[k] || [];
    // 오늘 → 고른 날짜까지 남은 기간을 연한 띠로 이어 보여줘요 (주 끝·시작은 둥글게)
    const selD = calSelDate(), lo = selD < calToday ? selD : calToday, hi = selD < calToday ? calToday : selD;
    const inRange = +lo !== +hi && date >= lo && date <= hi;
    const dow = date.getDay();
    const cls = [k === calKey(calToday) ? 'today' : '', k === calSel ? 'sel' : '', date < calToday ? 'past' : '', list.length ? 'hasdue' : '',
      inRange ? 'range' : '', inRange && (+date === +lo || dow === 0 || d === 1) ? 'rstart' : '', inRange && (+date === +hi || dow === 6 || d === last) ? 'rend' : ''].join(' ');
    cells.push(`<button class="calcell ${cls}" data-calday="${k}" aria-pressed="${k === calSel}" aria-label="${m+1}월 ${d}일${list.length ? `, 마감 ${list.length}개` : ''}"><span>${d}</span>${list.length ? '<i class="caldot"></i>' : ''}</button>`);
  }
  const [sy, sm, sd] = calSel.split('-').map(Number);
  const selList = dueByDay[calSel] || [];
  const soon = calDueList().filter(x => calDue(x) >= calToday).slice(0, 5);
  // 배경: 가장 가까운 마감 콘텐츠 사진을 흐리게 깔고 그 위에 유리 카드
  const bgItem = calDueList().find(x => calDue(x) >= calToday && libPhoto(x)) || calDueList().find(x => libPhoto(x));
  const bg = ''; // 유리 배경은 취소 (흰 카드 유지)
  const back = typeof backHome !== 'undefined' && backHome ? `<button class="calback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '';
  // 월 선택: 작년 ~ 내년을 연도별로 묶은 세로 스크롤 목록
  const y0 = calToday.getFullYear();
  const months = [y0 - 1, y0, y0 + 1].map(yy => `<div class="calyr"><b>${yy}년</b>${Array.from({length:12}, (_, i) => `<button class="calmon ${yy === y && i === m ? 'on' : ''} ${yy === y0 && i === calToday.getMonth() ? 'now' : ''}" data-calmon="${yy}-${i}">${i + 1}월${yy === y0 && i === calToday.getMonth() ? '<small>이번 달</small>' : ''}</button>`).join('')}</div>`).join('');
  return `<div class="calfhead">${back}<h1>캘린더</h1></div>` + `
    <section class="calbox">${bg}
      <div class="calhead">
        <button class="caltitle" data-calpick aria-expanded="${calPick}" aria-label="다른 달로 이동"><small>${y}</small><span>${m + 1}월${icon('chevron')}</span></button>
        ${`<div class="calnav" ${calPick ? 'style="visibility:hidden"' : ''}><button data-calnav="-1" aria-label="이전 달">${icon('chevleft')}</button><button data-calnav="1" aria-label="다음 달">${icon('chevright')}</button></div>`}
      </div>
      ${calPick ? `<div class="calmonths" role="group" aria-label="월 선택">${months}</div>` : `
      <div class="calweek" aria-hidden="true">${['일','월','화','수','목','금','토'].map(w => `<span>${w}</span>`).join('')}</div>
      <div class="calgrid">${cells.join('')}</div>`}
    </section>
    ${selList.length ? `<div class="sectionhead calsec"><h2>${sm}월 ${sd}일 마감<span>${selList.length}</span></h2></div><div class="callist">${selList.map(calRow).join('')}</div>` : ''}
    ${soon.length ? `<div class="sectionhead calsec"><h2>곧 마감돼요<span>${soon.length}</span></h2></div><div class="callist">${soon.map(calRow).join('')}</div>` : ''}`;
};

document.addEventListener('click', e => {
  const day = e.target.closest('[data-calday]');
  if (day) { calSel = day.dataset.calday; const y = scrollY; render(); scrollTo(0, y); return; }
  if (e.target.closest("[data-calpick]")) {
    // 지금 달력(요일 + 날짜) 높이를 재서, 월 목록도 같은 높이로 → 블럭 크기 그대로
    const wk = document.querySelector('.calweek'), gr = document.querySelector('.calgrid');
    if (wk && gr) calBodyH = wk.offsetHeight + gr.offsetHeight;
    calPick = !calPick; const y = scrollY; render(); scrollTo(0, y);
    const ml = document.querySelector('.calmonths'); if (ml && calBodyH) ml.style.height = calBodyH + 'px';
    // 열면 보고 있던 달이 목록 가운데에 오게
    const list = document.querySelector('.calmonths'), on = list?.querySelector('.calmon.on');
    if (list && on) list.scrollTop = on.offsetTop - list.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2;
    return; }
  const mon = e.target.closest('[data-calmon]');
  if (mon) { const [my, mm] = mon.dataset.calmon.split('-').map(Number); calMonth = new Date(my, mm, 1); calPick = false; const y = scrollY; render(); scrollTo(0, y); return; }
  const nav = e.target.closest('[data-calnav]');
  if (nav) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(nav.dataset.calnav), 1); const y = scrollY; render(); scrollTo(0, y); }
});

render();
