// 온보딩이 끝난 뒤 홈 화면 코치마크 튜토리얼 (3단계)
const COACH_STEPS = [
  {sel:'.mainpick', title:'관심사 추천 콘텐츠', text:'관심사에 맞는 저장 콘텐츠를 보여줘요. 좌우로 넘겨보고, 누르면 상세페이지로 이동해요.'},
  {sel:'.chiprows', title:'키워드 보기', text:'관심사에 맞는 키워드를 골라봐요. 두 줄을 각각 좌우로 넘길 수 있어요. 키워드를 누르면 키워드에 맞는 콘텐츠 목록을 보여줘요.'},
  {sel:'.bottomnav', title:'홈 · 지도 · 컬렉션 · 마이', text:'저장한 장소는 지도에서, 모든 저장 콘텐츠는 컬렉션에서 한눈에 볼 수 있어요.'}
];
let coachStep = 0;
function startCoach(){
  if (page !== 'home' || detailId) return;
  coachStep = 0;
  window.scrollTo(0, 0);
  lockScroll(true);
  let el = $('#coach');
  if (!el) { el = document.createElement('div'); el.id = 'coach'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','핀맵 사용 안내'); document.body.append(el); }
  drawCoach();
}
function endCoach(){ $('#coach')?.remove(); window.removeEventListener('resize', placeCoach); lockScroll(false); }
// 튜토리얼 중에는 사용자가 스크롤할 수 없게 막고, 강조할 위치로만 자동 이동해요
const SCROLL_KEYS = ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '];
const blockScroll = e => { if (e.type !== 'keydown' || SCROLL_KEYS.includes(e.key)) e.preventDefault(); };
function lockScroll(on){
  document.documentElement.classList.toggle('coach-lock', on);
  for (const t of ['wheel','touchmove','keydown']) on ? window.addEventListener(t, blockScroll, {passive:false}) : window.removeEventListener(t, blockScroll);
  on ? window.addEventListener('scroll', placeCoach) : window.removeEventListener('scroll', placeCoach);
}
function drawCoach(){
  const s = COACH_STEPS[coachStep], target = document.querySelector(s.sel);
  if (!target) { if (coachStep < COACH_STEPS.length-1) { coachStep++; drawCoach(); } else endCoach(); return; }
  const fixed = getComputedStyle(target).position === 'fixed';
  if (!fixed) { const r = target.getBoundingClientRect(); window.scrollTo(0, Math.max(0, window.scrollY + r.top - window.innerHeight/2 + r.height/2 - 60)); }
  const last = coachStep === COACH_STEPS.length-1;
  $('#coach').innerHTML = `<button class="cm-close" data-coach="skip" aria-label="튜토리얼 닫기">${icon('close')}</button><div class="cm-hole"></div><div class="cm-tip" aria-live="polite">
      <span class="cm-step">${coachStep+1} / ${COACH_STEPS.length}</span><b>${s.title}</b><p>${s.text}</p>
      <div class="cm-btns">${coachStep>0?`<button class="cm-prev" data-coach="prev" aria-label="이전 설명 보기">${icon('back')}</button>`:''}${last?'':'<button class="cm-skip" data-coach="skip">건너뛰기</button>'}<button class="cm-next" data-coach="next">${last?'시작하기':'다음'}</button></div>
    </div>`;
  requestAnimationFrame(placeCoach);
  window.addEventListener('resize', placeCoach);
  $('#coach .cm-next').focus();
}
// 강조 영역과 말풍선 위치를 대상 요소에 맞춰요
function placeCoach(){
  const c = $('#coach'); if (!c) return;
  const target = document.querySelector(COACH_STEPS[coachStep].sel); if (!target) return;
  // area가 있으면 그 요소들만 감싸서 강조해요 (예: 위치 이름만, 검색 · 알림 아이콘은 빼고)
  const parts = COACH_STEPS[coachStep].area ? [...document.querySelectorAll(COACH_STEPS[coachStep].area)].map(el => el.getBoundingClientRect()) : [];
  const r = parts.length ? (() => { const L = Math.min(...parts.map(x => x.left)), T = Math.min(...parts.map(x => x.top)), R = Math.max(...parts.map(x => x.right)), B = Math.max(...parts.map(x => x.bottom)); return {left:L, top:T, right:R, bottom:B, width:R-L, height:B-T}; })() : target.getBoundingClientRect(), pad = 6, hole = c.querySelector('.cm-hole'), tip = c.querySelector('.cm-tip');
  Object.assign(hole.style, {left:`${r.left-pad}px`, top:`${r.top-pad}px`, width:`${r.width+pad*2}px`, height:`${r.height+pad*2}px`});
  const tw = Math.min(320, window.innerWidth - 32), th = tip.offsetHeight;
  const below = r.bottom + pad + 14 + th < window.innerHeight;
  const left = Math.max(16, Math.min(r.left + r.width/2 - tw/2, window.innerWidth - tw - 16));
  Object.assign(tip.style, {width:`${tw}px`, left:`${left}px`, top: below ? `${r.bottom+pad+14}px` : `${r.top-pad-14-th}px`});
  tip.classList.toggle('above', !below);
  tip.style.setProperty('--ax', `${Math.max(18, Math.min(r.left + r.width/2 - left, tw-18))}px`);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-coach]');
  if (!b) return;
  if (b.dataset.coach === 'skip') { endCoach(); return; }
  if (b.dataset.coach === 'prev') { if (coachStep > 0) { coachStep--; drawCoach(); } return; }
  if (coachStep < COACH_STEPS.length-1) { coachStep++; drawCoach(); } else { endCoach(); window.scrollTo(0,0); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#coach')) endCoach(); });
// 튜토리얼 중에는 말풍선 버튼 말고 아무것도 누를 수 없어요 (하단 메뉴 포함)
['click','pointerdown','mousedown','touchstart'].forEach(t => window.addEventListener(t, e => {
  if (!document.getElementById('coach') || e.target.closest?.('#coach .cm-tip, #coach .cm-close')) return;
  e.preventDefault(); e.stopImmediatePropagation();
}, {capture:true, passive:false}));
