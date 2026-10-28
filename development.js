// Developer mode adapts the same app UI; the prototype path keeps its behavior.
if(PM_ENV.development) {
  document.body.classList.add('development-mode');
  startCoach=()=>{};
  const unavailable = () => toast('아직 실제 서비스와 연결하지 않았어요. 실제 링크를 직접 저장해 주세요.');
  // Missing images must not become sample venue photos or illustrations.
  art=()=>`<svg viewBox="0 0 400 240" aria-hidden="true"><rect width="400" height="240" fill="#F4F4F5"/><text x="200" y="125" text-anchor="middle" font-size="18" fill="#6B6B70">사진 없음</text></svg>`;
  const homeBase=pages.home;
  pages.home=()=>`<section class="dev-panel" aria-label="개발 테스트 환경"><span>개발 테스트 · 저장 ${items.length}개</span><h1>실제 콘텐츠로 테스트하기</h1><p>실제 링크와 제목을 직접 저장할 수 있어요.<br>SNS 자동 수집은 아직 연결하지 않았어요.</p><div><button data-action="save">실제 링크 저장</button><a href="index.html" target="_top">버전 선택</a></div></section>`+homeBase();
  const myBaseDev=pages.my;
  pages.my=()=>myBaseDev().replace('<b></b><small>프로필 편집', '<b>프로필 설정</b><small>프로필 편집')+`<a class="dev-return" href="index.html" target="_top">버전 선택으로 돌아가기</a>`;
  pages.accounts=()=>subHead('SNS 계정 연동')+`<div class="dev-panel"><h2>연결된 계정이 없어요</h2><p>실제 SNS 인증과 콘텐츠 수집은 아직 연결하지 않았어요. 이 환경에서는 예시 계정과 게시물을 만들지 않아요.</p><button data-action="save">실제 링크 직접 저장</button></div>`;
  pages.account=()=>myPage('핀맵 계정 설정','<div class="dev-panel"><p>실제 회원 인증은 아직 연결하지 않았어요. 저장한 데이터는 이 브라우저의 개발 테스트 환경에 보관됩니다.</p></div>');
  pages.appinfo=()=>myPage('앱 정보','<div class="dev-panel"><h2>핀맵 개발 테스트</h2><p>실제 링크를 직접 저장하는 독립된 테스트 환경입니다. SNS 인증·크롤링·AI 추출·백그라운드 푸시는 아직 연결하지 않았습니다.</p><a href="index.html" target="_top">버전 선택으로 돌아가기</a></div>');
  const saveBase=actions.save;
  actions.save=()=>{saveBase();$('#sheet [data-action="sample"]')?.remove();$('#sheet option[value="ai"]')?.remove();const field=$('#sheet select[name="type"]');if(field)field.value='기타';const hint=$('#sheet .eshint');if(hint)hint.textContent='입력한 링크와 제목을 그대로 저장합니다. 원문 자동 추출은 아직 연결하지 않았어요.';};
  ['sample','snsdemo','accadd','accsync','pushdemo','pushallow','localways','logoutyes'].forEach(name=>actions[name]=unavailable);
  actions.resetask=()=>confirmPop('개발 테스트 데이터를 초기화할까요?','이 환경에 저장한 콘텐츠와 설정만 지워집니다. 프로토타입 체험 데이터는 유지됩니다.','resetdata');
  actions.resetdata=()=>{try{[STORAGE,'pinmap.dev.courses.v1','pinmap.dev.course-draft.v1'].forEach(key=>localStorage.removeItem(key));}catch{}location.reload();};
  notiSettings=()=>modal('알림 설정','<p>실제 푸시·마감·재발견 알림은 아직 연결하지 않았어요. 개발 테스트에서는 예시 알림을 만들지 않습니다.</p>');
  saveSettings=()=>modal('저장 설정','<p>개발 테스트에서는 입력한 제목과 카테고리를 그대로 저장합니다. AI 자동 추출은 아직 연결하지 않았어요.</p>');
  locationDialog=()=>modal('현재 위치','<p>지도 화면의 현재 위치 버튼을 누르면 브라우저에 실제 위치 권한을 요청합니다. 이 설정 화면에서는 예시 위치나 가짜 권한을 만들지 않아요.</p><button class="filled" data-dev-map>지도 열기</button>');
  actions.location=()=>locationDialog();
  document.addEventListener('click',event=>{if(event.target.closest('[data-dev-map]')){$('#sheet').close();go('map');}});
  // These are display examples, not real notifications or permissions.
  notifications=()=>[];unreadCount=()=>0;
  const renderBase=render;
  render=function(){renderBase();const foot=$('#app .footer');const detailHint=$('#app .dthint.dtfoot');if(detailHint)detailHint.textContent='입력한 정보와 원본 링크를 표시합니다. 원문 자동 추출은 아직 연결하지 않았어요.';if(foot)foot.innerHTML='<span>핀맵 · 개발 테스트</span><span>직접 저장한 콘텐츠만 표시합니다.</span>';};
  render();
}
