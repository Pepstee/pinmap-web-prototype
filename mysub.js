// 마이 하위 페이지: 프로필 편집 · SNS 계정 연동 (home.js 다음, navlabels.js 앞에 불러와요)
// 하단 시트가 아니라 페이지로 넘어가고, 왼쪽 위 ← 버튼으로 마이로 돌아가요.

/* ---------- 프로필 사진 ---------- */
const avatarHtml = (cls = '') => PM_ENV.development && !settings.avatar ? `<span class="pavatar ${cls}" aria-hidden="true">${icon('user')}</span>` : `<span class="pavatar ${cls}" aria-hidden="true"><img src="${settings.avatar || 'img/profile-demo.png'}" alt=""></span>`;
const subHead = (title, back = 'my') => `<div class="subhead"><button class="subback" data-page="${back}" aria-label="${back === 'guide' ? '이용 가이드로' : '마이로'} 돌아가기">${icon('back')}</button><h1>${title}</h1></div>`;

pages.profile = function(){
  return subHead('프로필 편집') + `
  <div class="pfedit">
    <div class="pfphoto">${avatarHtml('big')}
      <label class="pfchange" aria-label="프로필 사진 변경">${icon('image')}<input type="file" id="avatarfile" accept="image/*" hidden></label>
    </div>
    <div class="pfbtns"><label class="tonal small" for="avatarfile">사진 변경</label>${settings.avatar ? '<button class="textbtn" data-action="avatarreset">기본 이미지로</button>' : ''}</div>
    <form id="profilepage" class="pfform">
      <label class="field"><span>닉네임</span><input name="nickname" value="${esc(settings.nickname)}" required maxlength="12"></label>
      <p class="hint">위치는 ‘현재 위치’에서 바꿀 수 있어요. 이 브라우저에만 저장돼요.</p>
      <button class="filled pfsave" type="submit">저장</button>
    </form>
  </div>`;
};
// 사진을 정사각형으로 잘라 작게 줄인 뒤 저장해요
document.addEventListener('change', e => {
  if (e.target.id !== 'avatarfile' || !e.target.files?.[0]) return;
  const file = e.target.files[0];
  if (!file.type.startsWith('image/')) { toast('이미지 파일만 올릴 수 있어요.'); return; }
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 240;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240);
    URL.revokeObjectURL(url);
    settings.avatar = c.toDataURL('image/jpeg', .85); afterChange(); render(); toast('프로필 사진을 바꿨어요.');
  };
  img.onerror = () => toast('사진을 불러오지 못했어요.');
  img.src = url;
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'profilepage') return;
  e.preventDefault();
  const nick = e.target.nickname.value.trim(); if (!nick) return;
  settings.nickname = nick; afterChange(); go('my'); toast('프로필을 저장했어요.');
});

/* ---------- SNS 계정 연동 ---------- */
const SNS = {
  instagram:{name:'Instagram', logo:'img/logo-instagram.png'},
  youtube:{name:'YouTube', logo:'img/logo-youtube.png'},
  tiktok:{name:'TikTok', logo:'img/logo-tiktok.png'},
  x:{name:'X', logo:'img/logo-x.png'}
};
const myAccounts = () => (settings.accounts ??= PM_ENV.development ? [] : [{id:'a1', sns:'instagram', handle:'@seoyeon.daily'}, {id:'a2', sns:'youtube', handle:'서연의 기록'}]);
// 계정별 저장 수: 콘텐츠의 출처(SNS)와 같은 계정 중 첫 번째에 모아 세요 (예시)
const accountCount = a => { const first = myAccounts().find(b => b.sns === a.sns); return first === a ? items.filter(x => String(x.source||'').toLowerCase().includes(SNS[a.sns].name.toLowerCase())).length : 0; };
const snsLogo = sns => `<img class="snslogo" src="${SNS[sns].logo}" alt="">`;

pages.accounts = function(){
  const acc = myAccounts(), total = acc.reduce((n, a) => n + accountCount(a), 0);
  return subHead('SNS 계정 연동') + `
  <p class="muted acchint">연동한 계정들의 저장 콘텐츠를 핀맵 한곳에 모아 보여줘요.</p>
  ${syncBtn()}
  <button class="accall" data-page="library"><span><b>모든 계정의 저장 모음 보기</b><small>${acc.length}개 계정 · 저장 ${total}개</small></span>${icon('arrow')}</button>
  <section class="mgroup"><h2>연동된 계정 ${acc.length}개</h2>
    ${acc.length ? acc.map(a => `<div class="accrow">${snsLogo(a.sns)}<span class="acctext"><b>${esc(a.handle)}</b><small>${SNS[a.sns].name} · 저장 ${accountCount(a)}개 · ${syncingAcc === a.id ? '가져오는 중…' : syncTime(settings.accSync?.[a.id])}</small></span>${accSyncBtn(a)}<button class="accoff" data-acc-off="${a.id}">연동 중지</button></div>`).join('')
      : '<p class="hint accnone">연동된 계정이 없어요. 아래에서 추가해 보세요.</p>'}
  </section>
  <button class="padd accadd" data-action="accadd">${icon('plus')} SNS 계정 연동 추가</button>
  <p class="hint accnote">프로토타입에서는 실제 로그인 없이 연동 과정을 체험해요. 연동을 중지해도 이미 저장한 콘텐츠는 그대로 남아요.</p>`;
};
function accAddSheet(sns){
  if (!sns) {
    modal('SNS 계정 연동 추가', `<p class="muted">저장 콘텐츠를 가져올 SNS를 골라요.</p><div class="snspick">${Object.entries(SNS).map(([k, v]) => `<button class="snsopt" data-acc-sns="${k}">${snsLogo(k)}<b>${v.name}</b>${icon('chevron')}</button>`).join('')}</div>`);
  } else {
    modal(`${SNS[sns].name} 연동`, `<form id="accform" data-sns="${sns}"><div class="snshead">${snsLogo(sns)}<b>${SNS[sns].name}</b></div><label class="field"><span>계정 이름</span><input name="handle" required maxlength="30" placeholder="${sns === 'youtube' ? '채널 이름' : '@아이디'}"></label><p class="hint">실제 서비스에서는 이 단계에서 ${SNS[sns].name} 로그인 화면이 열려요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="accadd">뒤로</button><button class="filled" type="submit">연동하기</button></div></form>`);
  }
  $('#sheet').classList.add('bottomsheet');
}
actions.accadd = () => accAddSheet();
actions.accounts = () => go('accounts');
actions.profile = () => go('profile');
actions.avatarreset = () => { delete settings.avatar; afterChange(); render(); toast('기본 이미지로 바꿨어요.'); };
actions.accoffyes = () => {
  const id = $('#sheet').dataset.acc, acc = myAccounts(), a = acc.find(x => x.id === id);
  if (a) { settings.accounts = acc.filter(x => x.id !== id); afterChange(); toast(`${a.handle} 연동을 중지했어요.`); }
  $('#sheet').close(); render();
};
document.addEventListener('click', e => {
  const s = e.target.closest('[data-acc-sns]'); if (s) { accAddSheet(s.dataset.accSns); setTimeout(() => $('#accform input')?.focus(), 50); return; }
  const off = e.target.closest('[data-acc-off]');
  if (off) {
    const a = myAccounts().find(x => x.id === off.dataset.accOff); if (!a) return;
    modal('연동을 중지할까요?', `<div class="snshead">${snsLogo(a.sns)}<b>${esc(a.handle)}</b></div><p>이 계정에서 새로 저장한 콘텐츠를 더 이상 가져오지 않아요.</p><p class="hint">이미 핀맵에 저장된 콘텐츠는 그대로 남아요.</p><div class="dialogactions"><button class="textbtn" data-action="close">취소</button><button class="filled danger" data-action="accoffyes">연동 중지</button></div>`);
    $('#sheet').dataset.acc = a.id; $('#sheet').classList.add('bottomsheet');
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'accform') return;
  e.preventDefault();
  const sns = e.target.dataset.sns, handle = e.target.handle.value.trim(); if (!handle) return;
  const h = sns !== 'youtube' && !handle.startsWith('@') ? '@' + handle : handle;
  if (myAccounts().some(a => a.sns === sns && a.handle === h)) { toast('이미 연동된 계정이에요.'); return; }
  myAccounts().push({id:'a' + Date.now(), sns, handle:h}); afterChange();
  $('#sheet').close(); render(); toast(`${SNS[sns].name} ${h} 계정을 연동했어요.`);
});

/* ---------- 연동 새로고침 ---------- */
// 계정마다 아직 반영되지 않은 저장 콘텐츠가 있다고 가정한 예시 (한 번 가져오면 다시 나오지 않아요)
const SYNC_POOL = PM_ENV.development ? {} : { // SNS마다 아직 안 가져온 저장이 2개씩 있다고 가정해요
  instagram:[
    {id:101, title:'연남동 골목 와인바', type:'맛집·카페', category:'와인바', ago:'방금', desc:'작은 골목 안 조용한 와인바', memo:'', art:'cafe', distance:'지하철 20분', address:'서울 마포구 연남동 · 예시 장소', aiClassified:true},
    {id:105, title:'망원동 빈티지 소품샵', type:'쇼핑', category:'소품', ago:'방금', desc:'주말에 들르기 좋은 작은 가게', memo:'', art:'bag', price:'1만 원대', aiClassified:true}],
  youtube:[
    {id:102, title:'10분 아침 스트레칭 루틴', type:'생활 정보', category:'운동', ago:'방금', desc:'출근 전 가볍게 따라 하기', memo:'', art:'tips', aiClassified:true},
    {id:106, title:'원룸 조명 바꾸기 꿀팁', type:'생활 정보', category:'인테리어', ago:'방금', desc:'스탠드 하나로 분위기 바꾸기', memo:'', art:'tips', aiClassified:true}],
  tiktok:[
    {id:103, title:'편의점 디저트 꿀조합', type:'레시피', category:'디저트', ago:'방금', desc:'5분이면 끝나는 간단 디저트', memo:'', art:'food', recipe:'5분 · 재료 3가지', aiClassified:true},
    {id:107, title:'에어프라이어 감자칩', type:'레시피', category:'간식', ago:'방금', desc:'기름 없이 바삭하게', memo:'', art:'food', recipe:'20분 · 재료 2가지', aiClassified:true}],
  x:[
    {id:104, title:'성수 플리마켓 일정 정리', type:'전시·팝업', category:'마켓', ago:'방금', desc:'이번 달 주말 플리마켓 모음', memo:'', art:'exhibit', address:'서울 성동구 성수동 · 예시 장소', distance:'도보 10분', aiClassified:true},
    {id:108, title:'이번 주 무료 전시 모음', type:'전시·팝업', category:'전시', ago:'방금', desc:'예약 없이 볼 수 있는 곳', memo:'', art:'exhibit', aiClassified:true}]
};
let syncing = false, syncingAcc = null; // 전체 새로고침 중 / 계정 하나만 새로고침 중
const syncTime = t => t ? (Date.now() - t < 60000 ? '방금 업데이트' : `${new Date(t).toLocaleString('ko-KR', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})} 업데이트`) : '아직 업데이트 안 함';
const syncLabel = () => syncTime(settings.lastSync);
// 계정 하나에서 아직 안 가져온 저장을 모두 가져와요
function pullAccount(a){
  if(PM_ENV.development)return [];
  const got = [];
  (SYNC_POOL[a.sns] || []).forEach(p => { if (!items.some(x => x.id === p.id)) { items.unshift({...p, source:SNS[a.sns].name, account:a.id}); got.push(p); } });
  settings.accSync = {...(settings.accSync || {}), [a.id]: Date.now()};
  return got;
}
const syncToast = (n, who) => toast(n ? `${who ? who + '에서 ' : ''}새 저장 콘텐츠 ${n}개를 가져왔어요.` : `${who ? who + '에서 ' : ''}새로 가져올 저장 콘텐츠가 없어요.`);
actions.accsync = () => { // 연동한 계정 전체
  if (syncing || syncingAcc) return;
  syncing = true; render();
  setTimeout(() => {
    const got = myAccounts().flatMap(pullAccount);
    settings.lastSync = Date.now(); syncing = false; afterChange(); render(); syncToast(got.length);
  }, 1200);
};
document.addEventListener('click', e => { // 계정별 새로고침
  const b = e.target.closest('[data-acc-sync]'); if (!b) return;
  if (syncing || syncingAcc) return;
  const a = myAccounts().find(x => x.id === b.dataset.accSync); if (!a) return;
  syncingAcc = a.id; render();
  setTimeout(() => {
    const got = pullAccount(a); syncingAcc = null; afterChange(); render(); syncToast(got.length, a.handle);
  }, 1000);
});
const syncBtn = () => `<button class="syncbtn ${syncing ? 'on' : ''}" data-action="accsync" ${syncing ? 'aria-busy="true"' : ''}><span class="syncico">${icon('sync')}</span><span><b>${syncing ? '가져오는 중…' : '전체 연동 새로고침'}</b><small>${syncing ? '연동한 모든 계정의 새 저장을 확인하고 있어요' : syncLabel()}</small></span></button>`;
const accSyncBtn = a => { const on = syncing || syncingAcc === a.id;
  return `<button class="accsync ${on ? 'on' : ''}" data-acc-sync="${a.id}" aria-label="${esc(a.handle)} 새로고침" ${on ? 'aria-busy="true"' : ''}>${icon('sync')}</button>`; };
paths.sync = 'M20 11a8 8 0 0 0-14.3-4.9L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.3 4.9L20 16 M20 20v-4h-4';

/* 하위 페이지와 캘린더에서도 하단 메뉴의 해당 탭이 켜져 있게 */
const PARENT_TAB = {profile:'my', accounts:'my', courses:'my', course:'my', calendar:'home', topic:'home'};
const navBase = nav;
nav = function(){ const real = page; if (PARENT_TAB[page]) page = PARENT_TAB[page]; const h = navBase(); page = real; return h; };

/* 홈 검색 버튼: 저장됨 탭의 검색으로 */
actions.homesearch = () => { backHome = true; go('library'); setTimeout(() => $('#search')?.focus(), 60); };
