// 홈 화면 (레이아웃 개편) · calendar.js 다음, navlabels.js 앞에 불러와요
// 구성: 마감 임박 띠배너(맨 위 고정) → 내 동네 · 알림 → 관심 키워드 → 메인 추천 카드 → 캘린더 위젯 → 작은 위젯 · 최근 저장

/* ---------- 홈 관심 키워드 추가 (온보딩 선택지에는 나오지 않아요) ---------- */
interestOptions.push(
  {id:'cafe', emoji:'☕', label:'카페 갈 때', short:'카페', extra:true},
  {id:'exhibit', emoji:'🖼', label:'전시·팝업 볼 때', short:'전시·팝업', extra:true},
  {id:'travel', emoji:'✈', label:'여행 갈 때', short:'여행', extra:true},
  {id:'recipe', emoji:'🍳', label:'요리할 때', short:'요리', extra:true},
  {id:'deco', emoji:'🏠', label:'집 꾸밀 때', short:'집 꾸미기', extra:true},
  {id:'weekend', emoji:'🌳', label:'주말 나들이', short:'주말 나들이', extra:true},
  {id:'due', emoji:'⏰', label:'마감 전에 볼 것', short:'마감 임박', extra:true}
);
const listOf = f => () => ({list: items.filter(x => !x.pending && f(x))});
Object.assign(homeSections, {
  cafe: listOf(x => x.type === '맛집·카페' && /카페|디저트/.test(x.category || '')),
  exhibit: listOf(x => x.type === '전시·팝업'),
  travel: listOf(x => x.type === '여행'),
  recipe: listOf(x => x.type === '레시피'),
  deco: listOf(x => x.collection === '나의 작은 공간' || x.type === '쇼핑'),
  weekend: listOf(x => x.collection === '이번 주말 성수'),
  due: listOf(x => x.deadline)
});

/* ---------- 마감 임박 띠배너: 맨 위 고정 · 자동 롤링 · 오늘 다시 보지 않기 ---------- */
// 개발 단계라 저장하지 않아요: 새로고침하면 다시 뜨고, 앱 안에서 다른 화면에 갔다 와도 숨긴 상태가 유지돼요
let stripHidden = false;
const stripHiddenToday = () => stripHidden;
const dLabel = x => calDays(x) === 0 ? 'D-day' : 'D-' + calDays(x);
function stripBar(){
  const due = calDueList().filter(x => calDays(x) <= 14);
  if (!due.length || stripHiddenToday()) return '';
  const item = x => `<button class="strip-item" data-detail="${x.id}"><b>${dLabel(x)}</b><span>${esc(x.title)}</span></button>`;
  // 끝에서 처음으로 자연스럽게 이어지도록 첫 항목을 한 번 더 붙여요
  return `<div class="strip" role="region" aria-label="마감 임박 콘텐츠"><small class="strip-label">마감 임박</small><div class="strip-roll"><div class="strip-track" data-n="${due.length}">${due.map(item).join('')}${due.length > 1 ? item(due[0]) : ''}</div></div><button class="strip-hide" data-action="striphide">오늘 다시 보지 않기</button></div>`;
}
let stripIdx = 0;
setInterval(() => {
  const t = document.querySelector('.strip-track'); if (!t) return;
  const n = Number(t.dataset.n); if (n < 2) return;
  stripIdx++;
  t.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
  t.style.transform = `translateY(${-stripIdx * 100 / (n + 1)}%)`;
  if (stripIdx === n) setTimeout(() => { stripIdx = 0; t.style.transition = 'none'; t.style.transform = 'translateY(0)'; }, 480);
}, 3000);
actions.striphide = () => {
  stripHidden = true;
  const y = window.scrollY; render(); window.scrollTo(0, y);
  toast('오늘은 마감 임박 배너를 보지 않아요.');
};

/* ---------- 메인 추천 카드 (크게 · 좌우로 넘기기) ---------- */
function homePicks(){
  const active = preferences.length ? preferences : ['nearby','plan','later'];
  const seen = new Set(), picks = [];
  // 켜진 관심사마다 2개씩, 사진이 있는 콘텐츠를 먼저
  active.forEach(id => {
    const list = homeSections[id]().list.filter(x => !seen.has(x.id)).sort((a,b) => (libPhoto(b)?1:0) - (libPhoto(a)?1:0)).slice(0, 2);
    list.forEach(x => { seen.add(x.id); picks.push({x, id}); });
  });
  // 관심사가 적어도 카드가 너무 적지 않게, 나머지 저장 콘텐츠로 8개까지 채워요
  items.filter(x => !x.pending && !seen.has(x.id)).sort((a,b) => (libPhoto(b)?1:0) - (libPhoto(a)?1:0))
    .forEach(x => { if (picks.length < 8) { seen.add(x.id); picks.push({x, id:null}); } });
  return picks.slice(0, 8);
}
function pickCard({x, id}){
  return `<button class="pick" data-detail="${x.id}" aria-label="${esc(x.title)} 상세 보기">
    <span class="pickimg">${libThumb(x)}</span>
    <span class="pickword" aria-hidden="true">${esc(x.category || shortType(x.type))}</span>
    <span class="pickpanel"><b>${esc(x.title)}</b><i class="pickgo">${icon('external')}</i></span>
  </button>`;
}

/* ---------- 캘린더 위젯: 오늘부터 7일 · 마감 있는 날에 점 ---------- */
function calWidget(){
  const due = calDueList(), byDay = {};
  due.forEach(x => { const k = calKey(calDue(x)); (byDay[k] = byDay[k] || []).push(x); });
  const W = ['일','월','화','수','목','금','토'];
  const days = Array.from({length:7}, (_, i) => { const d = new Date(calToday); d.setDate(d.getDate() + i); return d; });
  const next = due.slice(0, 2);
  return `<section class="hwidget calw">
    <div class="hwhead"><h2>${calToday.getMonth()+1}월 일정</h2><button class="textbtn" data-action="gocal">캘린더 ${icon('arrow')}</button></div>
    <div class="weekstrip">${days.map((d, i) => { const k = calKey(d), has = byDay[k]; return `<button class="wday ${i===0?'today':''}" data-calday="${k}" aria-label="${d.getMonth()+1}월 ${d.getDate()}일${has?` · 마감 ${has.length}개`:''}"><small>${W[d.getDay()]}</small><b>${d.getDate()}</b><i class="${has?'on':''}"></i></button>`; }).join('')}</div>
    ${next.length ? `<div class="calnext">${next.map(x => `<button class="cnrow" data-detail="${x.id}"><span class="cnbadge">${dLabel(x)}</span><span class="cntext">${esc(x.title)}</span><small>${esc(x.dueLabel || '마감')}</small></button>`).join('')}</div>` : '<p class="hint calnone">다가오는 마감이 없어요.</p>'}
  </section>`;
}

/* ---------- 작은 위젯 · 최근 저장 ---------- */
// 관심 키워드에서 켠 것들의 콘텐츠를 모아 보여줘요 (아무것도 안 켰으면 최근 저장)
const rcard = x => `<button class="rcard" data-detail="${x.id}"><span class="rcimg">${libThumb(x)}</span><b>${esc(x.title)}</b><small>${esc(x.ago)} 저장</small></button>`;
function subWidgets(){
  const list = items.slice(0, 12);
  return `<section class="recentw">
      <h2 class="rwtitle">최근 저장한 목록</h2>
      ${list.length ? `<div class="recentrow">${list.map(rcard).join('')}</div>` : '<p class="muted rwempty">아직 저장한 콘텐츠가 없어요.</p>'}
    </section>`;
}

/* ---------- 키워드 카테고리 페이지: 칩을 누르면 바로 이동 ---------- */
let topicId = null;
pageName.topic = '카테고리';
pages.topic = function(){
  const o = interestOf(topicId), list = (homeSections[topicId]?.().list) || [];
  return `<div class="subhead topichead"><button class="subback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button><h1>${esc(o.short || o.label)}</h1><span class="hint">${list.length}개</span></div>
    ${list.length ? `<div class="libgrid">${list.map(x => libCard(x, false)).join('')}</div>` : `<div class="empty"><p class="muted">이 카테고리로 저장한 콘텐츠가 아직 없어요.</p></div>`}`;
};
// 홈 칩은 켜고 끄지 않고 카테고리 페이지로 (pinmap.js의 켜기/끄기보다 먼저 받아요)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-homeint]'); if (!b) return;
  e.stopImmediatePropagation(); topicId = b.dataset.homeint; go('topic');
}, true);

/* ---------- 홈 ---------- */
pages.home = function(){
  const rank = o => preferences.includes(o.id) ? 1 : 0; // 온보딩에서 고른 관심사 먼저
  const order = [...interestOptions].sort((a,b) => rank(b) - rank(a));
  const chip = o => `<button class="prefchip" data-homeint="${o.id}">${o.emoji} ${o.short}</button>`;
  const half = Math.ceil(order.length / 2);
  const chips = `<div class="chiprows" role="group" aria-label="카테고리 바로가기"><div class="prefchips">${order.slice(0, half).map(chip).join('')}</div><div class="prefchips">${order.slice(half).map(chip).join('')}</div></div>`;
  const picks = homePicks();
  const main = picks.length
    ? `<div class="mainwrap"><div class="mainpick" aria-label="추천 저장 콘텐츠">${picks.map(pickCard).join('')}</div>${picks.length > 1 ? `<div class="herodots pickdots" aria-hidden="true">${picks.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`
    : `<div class="empty small"><p class="muted">선택한 관심사에 맞는 저장 콘텐츠가 아직 없어요.</p><button class="tonal" data-action="save">새로 저장하기</button></div>`;
  return stripBar() + placebar() + main + calWidget() + chips + subWidgets();
};

/* 캘린더 위젯의 날짜를 누르면 그 날짜가 선택된 캘린더로 */
document.addEventListener('click', e => { const d = e.target.closest('[data-calday]'); if (d) { calSel = d.dataset.calday; backHome = true; go('calendar'); } });

/* 홈의 캘린더 위젯 · 전체 보기 · 검색으로 들어간 화면: 왼쪽 위 ← 버튼으로 홈으로 */
let backHome = false;
actions.gocal = () => { backHome = true; go('calendar'); };
actions.golib = () => { backHome = true; go('library'); };
actions.backhome = () => { backHome = false; go('home'); };
const homeSearch = actions.homesearch;
actions.homesearch = () => { backHome = true; (homeSearch || (() => go('library')))(); };
document.addEventListener('click', e => { if (e.target.closest('.bottomnav [data-page], .rail [data-page]')) backHome = false; }, true);
const backBtn = () => backHome ? `<button class="subback pageback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '';
for (const p of ['calendar', 'library']) { const base = pages[p]; pages[p] = function(){ return backBtn() + base(); }; }

/* 메인 카드: 가운데 카드는 크게, 옆 카드는 작고 흐리게 + 점 표시 */
function updatePicks(){
  const track = document.querySelector('.mainpick'); if (!track) return;
  const mid = track.scrollLeft + track.clientWidth / 2;
  let best = 0, bestD = Infinity;
  const cs = [...track.children], step = cs.length > 1 ? cs[1].offsetLeft - cs[0].offsetLeft : 1;
  cs.forEach((c, i) => {
    // 양옆 카드를 메인 카드 뒤로 끌어당겨, 바깥 쪽 카드가 약 42px 보이게
    const sd = (c.offsetLeft + c.offsetWidth / 2 - mid) / step, a = Math.abs(sd), sg = Math.sign(sd), k = Math.min(a, 1);
    const sc = 1 - k * 0.14, peek = 42, T = step + c.offsetWidth * sc / 2 - c.offsetWidth / 2 - peek;
    const tx = a <= 1 ? -sd * T : -sg * (T + (a - 1) * step);
    c.style.transform = `translateX(${tx}px) scale(${sc})`;
    c.style.opacity = String(a <= 1 ? 1 - k * 0.25 : Math.max(0, 0.75 - (a - 1) * 3));
    c.style.zIndex = String(10 - Math.round(Math.min(a, 2) * 4));
    if (a * step < bestD) { bestD = a * step; best = i; }
  });
  track.parentNode.querySelector('.pickdots')?.querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('on', i === best));
  pickIdx = best;
}
let pickIdx = null; // 처음에는 두 번째 카드를 가운데에 둬서 양옆 카드가 보이게
function centerPick(){
  const track = document.querySelector('.mainpick'); if (!track) return;
  const n = track.children.length, i = Math.min(pickIdx ?? (n >= 3 ? 1 : 0), n - 1), c = track.children[i];
  // 화면을 그릴 때는 카드가 모여드는 움직임 없이 바로 제자리에
  track.classList.add('noanim');
  if (c) track.scrollLeft = c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2;
  updatePicks();
  track.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('noanim')));
}
document.addEventListener('scroll', e => { if (e.target.classList?.contains('mainpick')) updatePicks(); }, true);
window.addEventListener('resize', updatePicks);
const renderBeforeHome = render;
render = function(){ renderBeforeHome(); centerPick(); };

/* 마우스로도 메인 카드를 끌어서 넘기기 (PC 브라우저는 끌기 스크롤이 기본으로 안 돼요)
   · 옆에 살짝 보이는 카드를 누르면 그 카드로 넘어가요 */
let pickDrag = null, pickMoved = false;
const snapPick = (track, i) => { const c = track.children[Math.max(0, Math.min(i, track.children.length - 1))]; if (c) track.scrollTo({left: c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2, behavior:'smooth'}); };
document.addEventListener('pointerdown', e => {
  const track = e.target.closest('.mainpick'); if (!track || e.pointerType !== 'mouse' || e.button !== 0) return;
  pickDrag = {track, x:e.clientX, left:track.scrollLeft, start:pickIdx}; pickMoved = false;
});
document.addEventListener('pointermove', e => {
  if (!pickDrag) return;
  const dx = e.clientX - pickDrag.x;
  if (!pickMoved && Math.abs(dx) > 5) { pickMoved = true; pickDrag.track.style.scrollSnapType = 'none'; pickDrag.track.style.cursor = 'grabbing'; }
  if (pickMoved) { pickDrag.track.scrollLeft = pickDrag.left - dx; e.preventDefault(); }
});
document.addEventListener('pointerup', e => {
  if (!pickDrag) return;
  const {track, x, start} = pickDrag, dx = e.clientX - x; pickDrag = null;
  if (!pickMoved) return;
  track.style.cursor = '';
  // 조금만 끌어도(40px) 다음 · 이전 카드로
  const to = Math.abs(dx) > 40 ? start + (dx < 0 ? 1 : -1) : start;
  snapPick(track, to);
  setTimeout(() => { track.style.scrollSnapType = ''; }, 450);
});
document.addEventListener('click', e => {
  const card = e.target.closest('.mainpick .pick'); if (!card) return;
  if (pickMoved) { pickMoved = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
  const track = card.parentNode, i = [...track.children].indexOf(card);
  if (i !== pickIdx) { e.preventDefault(); e.stopImmediatePropagation(); snapPick(track, i); }
}, true);
document.addEventListener('dragstart', e => { if (e.target.closest?.('.mainpick')) e.preventDefault(); });
