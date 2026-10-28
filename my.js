// 마이 페이지 (프로필 · 온보딩 설정 · 모음 · 환경설정) + 알림
// interestOf, preferences, openOnboarding, STORAGE는 pinmap.js에 있고, 화면을 그릴 때 사용합니다.

/* ---------- 알림 ---------- */
// 설정에서 켠 알림만 만들어요. 시간과 내용은 예시입니다.
const dueNum = x => Number(String(x.deadline || '').replace(/\D/g, '')); // 'D-3' → 3 (calendar.js보다 먼저 쓰일 수 있어 따로 둬요)
function notifications(){
  const list = [];
  // 홈 띠배너의 마감 임박 콘텐츠는 알림 목록에도 항상 보여줘요 (설정은 휴대폰 푸시 알림에만 적용)
  items.filter(x => x.deadline).sort((a,b) => dueNum(a) - dueNum(b)).forEach(x => list.push({
    id:'due-'+x.id, emoji:'⏰', title:`마감 ${x.deadline} · ${x.title}`,
    body:`${x.period ? x.period.replace(' · 예시 기간','')+' 운영 · ' : ''}끝나기 전에 다녀오세요.`, time:'오늘 오전 9:00', detail:x.id
  }));
  if (settings.notiNearby) {
    const near = readyPlaces().filter(x => distanceOf(x) < 999).sort((a,b) => distanceOf(a)-distanceOf(b));
    if (near.length) list.push({id:'near', emoji:'📍', title:`성수동 근처에 저장한 장소 ${near.length}곳`, body:`${near[0].title} 외 · 지금 가까이에 있어요.`, time:'1시간 전', page:'map'});
  }
  const pending = items.filter(x => isPlace(x) && (x.pending || !x.address));
  if (pending.length) list.push({id:'pending', emoji:'🔎', title:`장소 확인이 필요한 콘텐츠 ${pending.length}개`, body:'AI가 위치를 확정하지 못했어요. 주소를 확인해 주세요.', time:'어제', detail:pending[0].id});
  if (settings.notiReminder && items.length) {
    const old = items[items.length-1];
    list.push({id:'remind-'+old.id, emoji:'🔖', title:'잊고 있던 저장, 다시 볼까요?', body:`${old.title} · ${old.ago} 저장`, time:'2일 전', detail:old.id});
  }
  return list;
}
unreadCount = () => notifications().filter(n => !settings.readNoti.includes(n.id)).length;

function notiSheet(){
  const list = notifications(), allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  const rows = list.map(n => { const unread = !settings.readNoti.includes(n.id);
    return `<button class="notirow ${unread?'unread':''}" data-noti="${esc(n.id)}"><span class="notiemoji" aria-hidden="true">${n.emoji}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${n.time}${unread?' · 새 알림':''}</small></div></button>`; }).join('');
  modal('알림', `${rows ? `<div class="notilist">${rows}</div>` : `<div class="empty small"><p class="muted">${allOff?'알림이 모두 꺼져 있어요.':'새 알림이 없어요.'}</p></div>`}
    <div class="dialogactions">${list.some(n=>!settings.readNoti.includes(n.id))?'<button class="textbtn" data-action="readall">모두 읽음</button>':''}<button class="tonal" data-action="notisettings">알림 설정</button></div>`);
}
const markRead = ids => { settings.readNoti = [...new Set([...settings.readNoti, ...ids])]; afterChange(); };

/* ---------- 마이 페이지 ---------- */
const sw = (key, label, desc) => `<label class="setrow"><div><b>${label}</b><small>${desc}</small></div><input type="checkbox" role="switch" data-setting="${key}" ${settings[key]?'checked':''}><i class="sw" aria-hidden="true"></i></label>`;
// 마이: 첫 화면은 요약만 · 자세한 설정은 누르면 아래에서 올라오는 시트에서 바꿔요
const myRow = (act, emoji, label, value='') => `<button class="mrow" data-action="${act}"><span class="mrico" aria-hidden="true">${emoji}</span><span class="mrlabel">${label}</span>${value ? `<span class="mrval">${value}</span>` : ''}${icon('chevron')}</button>`;
pages.my = function(){
  const cols = collectionNames(), places = items.filter(isPlace).length;
  const prefs = preferences.map(id => interestOf(id).short);
  const prefText = prefs.length ? (prefs.length > 1 ? `${prefs[0]} 외 ${prefs.length-1}개` : prefs[0]) : '선택 안 함';
  const notiOn = ['notiNearby','notiDeadline','notiReminder'].filter(k => settings[k]).length;
  return `
  <button class="mprofile" data-action="profile" aria-label="프로필 편집">
    ${avatarHtml()}
    <span class="mpinfo"><b>${esc(settings.nickname)}</b><small>프로필 편집</small></span>${icon('chevron')}
  </button>
  <button class="sharepromo" data-action="snsdemo"><span aria-hidden="true">📲</span><div><b>SNS에서 바로 저장해보기</b><small>게시물에서 공유 → 핀맵, 저장 과정을 체험해요</small></div>${icon('arrow')}</button>

  <section class="mgroup"><h2>나의 핀맵</h2>
    ${myRow('placesheet','📍','현재 위치', esc(myPlaces().join(' · ')))}
    ${myRow('interests','💡','관심사 · 활용 목적', esc(prefText))}
  </section>
  <section class="mgroup"><h2>계정 설정</h2>
    ${myRow('accounts','🔗','SNS 계정 연동', `${myAccounts().length}개 연결됨`)}
    ${syncBtn()}
  </section>
  <section class="mgroup"><h2>설정</h2>
    ${myRow('notisheet','🔔','알림 설정', settings.push ? `푸시 켜짐 · ${notiOn}개` : '푸시 꺼짐')}
    ${myRow('savesheet','✨','저장 설정', settings.aiDefault ? 'AI 자동 분류' : '직접 분류')}
    ${myRow('mapsheet','🗺️','위치 · 지도', esc(MAP_APPS[settings.mapApp].name))}
  </section>
  <section class="mgroup"><h2>도움말</h2>
    ${myRow('guide','📖','이용 가이드')}
    ${myRow('appinfo','ℹ️','앱 정보')}
    ${myRow('resetask','↺','저장 데이터 초기화')}
  </section>
  <button class="logout" data-action="logout">로그아웃</button>`;
};

/* ---------- 마이 설정 시트 (하단 시트) ---------- */
let mySheet = null; // 지금 열린 설정 시트 (설정을 바꾸면 다시 그려요)
function openMySheet(fn){ mySheet = fn; fn(); $('#sheet').classList.add('bottomsheet'); }
function notiSettings(){
  modal('알림 설정', `<div class="mycard settings">
    ${sw('push','푸시 알림 허용', settings.push ? '앱을 켜지 않아도 휴대폰 알림으로 받아요' : '꺼져 있으면 앱 밖에서는 알림이 오지 않아요')}
    ${sw('notiNearby','현재 위치 기반 추천 알림','앱을 켜지 않아도 지금 있는 곳 근처의 저장 콘텐츠를 알려드려요')}
    ${settings.notiNearby && settings.push && settings.locPerm!=='always' ? `<button class="setwarn" data-action="location">⚠️ 앱을 켜지 않았을 때도 위치에 맞춰 알려드리려면 위치 권한을 ‘항상 허용’으로 바꿔주세요 ›</button>` : ''}
    ${sw('notiDeadline','마감 임박 알림','전시·팝업이 끝나기 3일 전에 알려드려요')}
    ${sw('notiReminder','다시 보기 리마인드','잊고 있던 저장 콘텐츠를 가끔 꺼내드려요')}
    <button class="setrow" data-action="pushdemo"><div><b>앱 밖 알림 미리보기</b><small>앱을 끈 상태에서 위치에 따라 알림이 오는 모습을 체험해요</small></div>${icon('arrow')}</button>
  </div>`);
}
function saveSettings(){
  modal('저장 설정', `<div class="mycard settings">${sw('aiDefault','AI 자동 분류 기본 사용','끄면 저장할 때 카테고리를 직접 골라요')}</div>`);
}
function mapSettings(){
  modal('위치 · 지도', `<div class="mycard settings">
    <button class="setrow" data-action="location"><div><b>위치 권한</b><small>${LOC_PERM[settings.locPerm]}${settings.locPerm==='none'?' · 예시 위치로 체험 중':''}</small></div>${icon('arrow')}</button>
    <div class="setrow col"><div><b>길찾기 지도 앱</b><small>장소 상세의 길찾기 버튼이 이 앱으로 열려요</small></div>
      <div class="segmented" role="radiogroup" aria-label="길찾기 지도 앱">${Object.entries(MAP_APPS).map(([k,v]) => `<button role="radio" aria-checked="${settings.mapApp===k}" class="${settings.mapApp===k?'on':''}" data-mapapp="${k}">${v.name}</button>`).join('')}</div>
    </div></div>`);
}
$('#sheet').addEventListener('close', () => { mySheet = null; });

/* ---------- 동작 ---------- */
Object.assign(actions, {
  noti: notiSheet,
  readall: () => { markRead(notifications().map(n => n.id)); notiSheet(); render(); },
  notisettings: () => { if (page !== 'my') go('my'); openMySheet(notiSettings); },
  notisheet: () => openMySheet(notiSettings),
  savesheet: () => openMySheet(saveSettings),
  mapsheet: () => openMySheet(mapSettings),
  coachagain: () => { go('home'); setTimeout(startCoach, 300); },
  appinfo: () => { modal('앱 정보', `<p>핀맵 Prototype 03</p><p class="hint">예시 데이터로 체험하는 프로토타입이에요. 데이터는 이 브라우저에만 저장돼요.</p>`); $('#sheet').classList.add('bottomsheet'); },
  howto: () => openOnboarding(1),
  profile: () => { modal('프로필 편집', `<form id="profileform"><label class="field"><span>닉네임</span><input name="nickname" value="${esc(settings.nickname)}" required maxlength="12"></label><p class="hint">위치는 ‘현재 위치’에서 바꿀 수 있어요. 이 브라우저에만 저장돼요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">저장</button></div></form>`); $('#sheet').classList.add('bottomsheet'); },
  resetask: () => modal('저장 데이터 초기화', `<p>이 브라우저에 저장한 콘텐츠, 관심사, 설정이 모두 지워지고 예시 상태로 돌아가요.</p><div class="dialogactions"><button class="textbtn" data-action="close">취소</button><button class="filled danger" data-action="resetdata">초기화</button></div>`),
  resetdata: () => { try { [STORAGE, ...LEGACY_KEYS].forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); },
  logout: () => toast('프로토타입에서는 로그아웃 기능을 제공하지 않아요.')
});

document.addEventListener('click', e => {
  const n = e.target.closest('[data-noti]');
  if (n) {
    const item = notifications().find(x => x.id === n.dataset.noti);
    markRead([n.dataset.noti]); $('#sheet').close();
    if (item?.detail) { page = page === 'my' ? 'library' : page; openDetail(item.detail); }
    else if (item?.page) go(item.page);
    else render();
    return;
  }
  const m = e.target.closest('[data-mapapp]');
  if (m) { settings.mapApp = m.dataset.mapapp; afterChange(); render(); mySheet?.(); toast(`길찾기는 ${MAP_APPS[settings.mapApp].name}으로 열려요.`); }
});
document.addEventListener('change', e => {
  const key = e.target.dataset?.setting;
  if (!key) return;
  if (key === 'push' && e.target.checked) { e.target.checked = false; askPushPermission(); return; }
  settings[key] = e.target.checked; afterChange();
  const y = window.scrollY; render(); window.scrollTo(0, y);
  mySheet?.(); // 열려 있는 설정 시트도 바로 갱신
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'profileform') return;
  e.preventDefault();
  const f = e.target, nick = f.nickname.value.trim();
  if (!nick) return;
  settings.nickname = nick; afterChange();
  $('#sheet').close(); render(); toast('프로필을 저장했어요.');
});
