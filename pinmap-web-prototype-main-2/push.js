// 앱 밖 푸시 알림 (위치 기반 저장 콘텐츠 추천)
// 웹 프로토타입은 앱이 꺼진 상태에서 위치를 확인하거나 휴대폰 알림을 보낼 수 없어,
// 잠금화면 미리보기로 실제 앱의 동작을 재현합니다. 조건: 푸시 알림 허용 + 위치 권한 '항상 허용' + 위치 기반 추천 알림 켜짐.

// 이동 시나리오: 사용자가 이곳에 도착하면 근처에 저장한 콘텐츠를 추천합니다.
const PUSH_SCENES = [
  // dist: 그 위치에서의 거리 (예시)
  {id:'seongsu', emoji:'☕', label:'성수동 도착', place:'성수동', match:x => /성수/.test(x.address||''), dist:x => x.distance||'근처'},
  {id:'forest', emoji:'🌳', label:'서울숲 산책 중', place:'서울숲', match:x => /뚝섬로|서울숲/.test((x.address||'')+(x.mapQuery||'')), dist:() => '바로 근처'},
  {id:'gangneung', emoji:'🌊', label:'강릉 여행 중', place:'강릉', match:x => /강릉/.test(x.address||''), dist:() => '차로 10분'},
  {id:'home', emoji:'🏠', label:'집 근처', place:'집 근처', match:() => false}
];
let ps = {list:[], timer:null, clock:null};

// 위치에 맞는 추천 알림 만들기: 마감 임박 → 온보딩 관심사 → 가까운 순
function pushFor(scene){
  const near = readyPlaces().filter(scene.match);
  if (!near.length) return null;
  const pref = x => (preferences.includes('food') && x.type==='맛집·카페') || (preferences.includes('plan') && (x.type==='여행' || x.deadline)) || (preferences.includes('nearby')) ? 0 : 1;
  const due = settings.notiDeadline ? near.filter(x => x.deadline) : [];
  const pick = due[0] || [...near].sort((a,b) => pref(a)-pref(b) || distanceOf(a)-distanceOf(b))[0];
  const more = near.length > 1 ? ` · 근처에 저장한 곳 ${near.length-1}개 더` : '';
  if (pick.deadline) return {id:pick.id, title:`⏰ 근처에 저장한 콘텐츠가 ${pick.deadline}에 마감돼요`, body:`‘${pick.title}’ · ${scene.dist(pick)}. 지나가는 길에 들러볼까요?${more}`};
  return {id:pick.id, title:`📍 ${scene.place}에 저장해둔 곳이 있어요`, body:`‘${pick.title}’ · ${scene.dist(pick)}${pick.memo?` · “${pick.memo}”`:''}${more}`};
}
// 알림이 오지 않는 이유 (설정 상태)
function pushBlocker(){
  if (!settings.push) return {text:'푸시 알림이 꺼져 있어 앱 밖에서는 알림이 오지 않아요.', btn:'푸시 알림 허용하기', act:'pushallow'};
  if (!settings.notiNearby) return {text:'현재 위치 기반 추천 알림이 꺼져 있어요.', btn:'추천 알림 켜기', act:'nearbyon'};
  if (settings.locPerm !== 'always') return {text:'앱을 켜지 않았을 때 위치를 알려면 위치 권한이 ‘항상 허용’이어야 해요.', btn:'항상 허용으로 바꾸기', act:'localways'};
  return null;
}

/* ---------- 권한 요청 (휴대폰 시스템 창 모양) ---------- */
function askPushPermission(){
  modal('', `<div class="ospermit"><div class="osicon">${icon('bookmark')}</div><b>‘핀맵’에서 알림을 보내려고 합니다</b><p>알림에는 근처에 저장한 장소, 마감 임박 콘텐츠 등이 포함될 수 있어요. 설정에서 언제든 바꿀 수 있어요.</p><div class="osbtns"><button data-action="pushdeny">허용 안 함</button><button data-action="pushallow" class="strong">허용</button></div></div>`);
  $('#sheet').classList.add('osdialog');
}

/* ---------- 잠금화면 미리보기 ---------- */
function openPushDemo(){
  if ($('#sheet').open) $('#sheet').close();
  let el = $('#pushdemo');
  if (!el) {
    el = document.createElement('section');
    el.id = 'pushdemo'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','앱 밖 알림 미리보기');
    document.body.append(el);
  }
  ps.list = [];
  document.body.classList.add('pushdemo-open'); $('#app').inert = true;
  drawPushDemo();
  ps.clock = setInterval(() => { const c = $('#pushdemo .ls-time'); if (c) c.textContent = clockText(); }, 15000);
}
function closePushDemo(){
  clearTimeout(ps.timer); clearInterval(ps.clock);
  $('#pushdemo')?.remove(); document.body.classList.remove('pushdemo-open'); $('#app').inert = false;
}
const clockText = () => new Date().toLocaleTimeString('ko-KR', {hour:'numeric', minute:'2-digit', hour12:false});
const dateText = () => new Date().toLocaleDateString('ko-KR', {month:'long', day:'numeric', weekday:'long'});
function drawPushDemo(){
  const el = $('#pushdemo'); if (!el) return;
  const block = pushBlocker();
  el.innerHTML = `<div class="ls-screen">
    <div class="ls-top"><span class="ls-tag">잠금화면 · 앱이 꺼진 상태</span><button class="ls-exit" data-ps="exit">체험 끝내기 ${icon('close')}</button></div>
    <div class="ls-clock"><small>${dateText()}</small><div class="ls-time">${clockText()}</div></div>
    <div class="ls-notis" aria-live="polite">${ps.list.map((n,i) => n.waiting
      ? `<div class="ls-noti waiting"><span class="ls-spin" aria-hidden="true"></span>${esc(n.text)}</div>`
      : n.none ? `<div class="ls-noti quiet">${esc(n.text)}</div>`
      : `<button class="ls-noti" data-ps-open="${n.id}"><div class="ls-app"><i>${icon('bookmark')}</i>핀맵<span>${i===0?'지금':'조금 전'}</span></div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></button>`).join('')}</div>
    <div class="ls-panel">
      ${block ? `<div class="ls-block"><p>${block.text}</p><button data-action="${block.act}">${block.btn}</button></div>` : ''}
      <p class="ls-q">어디로 이동해볼까요? <small>앱을 켜지 않은 채 위치만 바뀌어요</small></p>
      <div class="ls-scenes">${PUSH_SCENES.map(s => `<button data-ps-scene="${s.id}"><span aria-hidden="true">${s.emoji}</span>${s.label}</button>`).join('')}</div>
      <p class="ls-foot">설정: 푸시 ${settings.push?'허용':'꺼짐'} · 위치 ${LOC_PERM[settings.locPerm]} · 위치 기반 추천 ${settings.notiNearby?'켜짐':'꺼짐'}</p>
    </div>
  </div>`;
}
function moveTo(id){
  const scene = PUSH_SCENES.find(s => s.id === id);
  clearTimeout(ps.timer);
  ps.list = ps.list.filter(n => !n.waiting && !n.none);
  const block = pushBlocker();
  if (block) { ps.list.unshift({none:true, text:`${scene.label} · 알림이 오지 않았어요`}); drawPushDemo(); return; }
  ps.list.unshift({waiting:true, text:`${scene.label} · 위치 확인 중…`});
  drawPushDemo();
  ps.timer = setTimeout(() => {
    ps.list = ps.list.filter(n => !n.waiting);
    const n = pushFor(scene);
    ps.list.unshift(n || {none:true, text:`${scene.label} · 근처에 저장한 콘텐츠가 없어 알림을 보내지 않았어요`});
    drawPushDemo();
    if (n) navigator.vibrate?.(80);
  }, 1300);
}

Object.assign(actions, {
  pushdemo: openPushDemo,
  pushallow: () => { settings.push = true; afterChange(); if ($('#sheet').open) $('#sheet').close(); toast('푸시 알림을 허용했어요.'); if ($('#pushdemo')) drawPushDemo(); else render(); },
  pushdeny: () => { $('#sheet').close(); toast('푸시 알림을 허용하지 않았어요. 앱 안 알림만 받아요.'); render(); },
  nearbyon: () => { settings.notiNearby = true; afterChange(); drawPushDemo(); },
  localways: () => { settings.locPerm = 'always'; afterChange(); drawPushDemo(); toast('위치 권한을 ‘항상 허용’으로 바꿨어요.'); }
});
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('osdialog'));
document.addEventListener('click', e => {
  const lp = e.target.closest('[data-locperm]');
  if (lp) { settings.locPerm = lp.dataset.locperm; afterChange(); $('#sheet').close(); render(); toast(`위치 권한: ${LOC_PERM[settings.locPerm]}`); return; }
  if (!e.target.closest('#pushdemo')) return;
  const sc = e.target.closest('[data-ps-scene]');
  if (sc) { moveTo(sc.dataset.psScene); return; }
  const op = e.target.closest('[data-ps-open]');
  if (op) { // 알림을 누르면 앱이 열리고 해당 콘텐츠 상세로 바로 이동
    const id = Number(op.dataset.psOpen); closePushDemo();
    if (typeof closeOnboarding === 'function') closeOnboarding();
    page = 'map'; openDetail(id); toast('알림에서 핀맵을 열었어요.');
    return;
  }
  if (e.target.closest('[data-ps="exit"]')) { closePushDemo(); render(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#pushdemo')) { closePushDemo(); render(); } });
