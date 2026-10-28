// Use the existing screens with disconnected, empty data. No development-only UI.
if(PM_ENV.development) {
  document.body.classList.add('development-mode');
  startCoach=()=>{};
  const unavailable=()=>toast('아직 데이터가 연결되지 않았어요.');
  notifications=()=>[];
  unreadCount=()=>0;

  // Keep the original components, spacing and controls; change only empty-state copy.
  const originalMy=pages.my;
  pages.my=()=>originalMy().replace('<b></b><small>프로필 편집','<b>프로필 설정</b><small>프로필 편집');
  const originalAccounts=pages.accounts;
  pages.accounts=()=>originalAccounts().replace('프로토타입에서는 실제 로그인 없이 연동 과정을 체험해요. 연동을 중지해도 이미 저장한 콘텐츠는 그대로 남아요.','아직 연결된 계정이 없어요. 계정 연동은 연결 전 상태입니다.');
  const originalAppInfo=pages.appinfo;
  pages.appinfo=()=>originalAppInfo().replace('예시 데이터로 체험하는 프로토타입이에요. 데이터는 이 브라우저에만 저장돼요.','아직 데이터가 연결되지 않은 초기 화면입니다.');
  const originalMapSettings=mapSettings;
  mapSettings=()=>{originalMapSettings();const note=$('#sheet [data-action="location"] small');if(note)note.textContent='연결 전';};

  ['sample','snsdemo','accadd','accsync','pushdemo','pushallow','localways','logoutyes','leaveyes','resetdata','location'].forEach(name=>actions[name]=unavailable);
  const blockedActions='[data-acc-sns],[data-acc-sync],[data-locperm],[data-course-save],[data-course-share]';
  document.addEventListener('click',event=>{if(event.target.closest(blockedActions)){event.preventDefault();event.stopImmediatePropagation();unavailable();}},true);
  document.addEventListener('submit',event=>{if(['saveform','accform','profilepage','profileform'].includes(event.target.id)){event.preventDefault();event.stopImmediatePropagation();unavailable();}},true);
  document.addEventListener('change',event=>{if(event.target.matches('[data-setting],#avatarfile')){event.preventDefault();event.stopImmediatePropagation();if(event.target.type==='checkbox')event.target.checked=false;else event.target.value='';unavailable();}},true);

  const originalRender=render;
  render=function(){originalRender();const note=$('#app .footer span:last-child');if(note)note.textContent='아직 데이터가 연결되지 않았어요.';};
  render();
}
