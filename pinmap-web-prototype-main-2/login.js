// 로그인 화면 체험. 계정 확인이나 서버 저장은 하지 않습니다.
function openDemoLogin(){
  let el=document.getElementById('demo-login');
  if(!el){el=document.createElement('section');el.id='demo-login';document.body.append(el);}
  el.setAttribute('role','dialog');
  el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label','체험용 로그인');
  el.innerHTML=`<div class="login-screen"><div class="login-top"><b class="brandmark">${icon('bookmark')}</b><span>핀맵</span></div><div class="login-hero"><span class="login-eyebrow">PINMAP · PROTOTYPE</span><h1>흩어진 저장을<br><em>다시 찾기 쉽게.</em></h1><p>저장한 게시물을 한곳에 모으고,<br>가고 싶은 장소를 지도에서 꺼내보세요.</p><div class="login-graphic" aria-hidden="true"><span>📸 게시물</span><i>→</i><span>📍 장소</span><i>→</i><span>🗺️ 지도</span></div></div><div class="login-bottom"><button class="filled login-button" data-login="continue">체험용 로그인하고 시작하기 ${icon('arrow')}</button><p>버튼을 누르면 바로 시작합니다.<br>실제 계정 연결이나 개인정보 수집은 없습니다.</p></div></div>`;
  document.body.classList.add('login-open');
  document.getElementById('app').inert=true;
  el.querySelector('button').focus();
}
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-login="continue"]'))return;
  document.getElementById('demo-login')?.remove();
  document.body.classList.remove('login-open');
  document.getElementById('app').inert=false;
  openOnboarding(0);
});
