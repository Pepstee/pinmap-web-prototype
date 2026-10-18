// SNS 공유 → 핀맵 저장 체험
// 실제 SNS 공유 메뉴는 웹 프로토타입에서 연결할 수 없어, 예시 SNS 화면 위에서 저장 과정을 재현합니다.
// 흐름: 게시물 공유 버튼 → SNS 공유 시트 → '공유 대상…' → 앱 목록에서 핀맵 → 핀맵 저장 시트 → 저장 배너
const demoPost = {
  author:'seongsu.daily', likes:'1,282',
  caption:'성수동 골목 안, 오후 햇살 가득한 창가 자리 ☕ 디저트도 맛있어요. 주말엔 웨이팅 있어요!',
  art:'cafe',
  // AI가 게시물에서 추출했다고 가정한 정보 (예시)
  ai:{title:'창가 자리가 예쁜 성수 카페', type:'맛집·카페', category:'카페', address:'서울 성동구 성수동 · 예시 주소', distance:'도보 6분'}
};
let sd = {step:'post', item:null, aiOn:true, newCol:false, banner:null, bannerTimer:null, closeTimer:null};

function openShareDemo(){
  if ($('#sheet').open) $('#sheet').close();
  sd = {...sd, step:'post', newCol:false, banner:null};
  let el = $('#sharedemo');
  if (!el) {
    el = document.createElement('section');
    el.id = 'sharedemo';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','SNS에서 핀맵으로 저장하기 체험');
    document.body.append(el);
  }
  document.body.classList.add('sharedemo-open');
  $('#app').inert = true;
  drawShareDemo();
}
function closeShareDemo(){
  clearTimeout(sd.bannerTimer); clearTimeout(sd.closeTimer);
  $('#sharedemo')?.remove();
  document.body.classList.remove('sharedemo-open');
  $('#app').inert = false;
}
const sdSaved = () => sd.item && items.includes(sd.item);

function sdCoach(){
  if (sd.step === 'snsSheet') return '② ‘공유 대상…’을 눌러 다른 앱으로 보내요';
  if (sd.step === 'osSheet') return '③ 앱 목록에서 <b>핀맵</b>을 선택하세요';
  if (sd.step === 'save') return '';
  if (sdSaved()) return `저장 완료! <button class="sd-coachbtn" data-sd="view">핀맵에서 보기</button>`;
  return '① 게시물 아래 <b>공유 버튼</b>을 눌러보세요';
}
function sdLayer(){
  const p = sd.step;
  if (p === 'snsSheet') return `<div class="sd-dim" data-sd="dismiss"></div>
    <div class="sd-sheet" role="dialog" aria-label="공유">
      <div class="sd-handle"></div>
      <div class="sd-search">${icon('search')} 검색</div>
      <div class="sd-friends" aria-hidden="true">${['지민','하루','도윤','서아'].map(n=>`<span><i>${n[0]}</i>${n}</span>`).join('')}</div>
      <div class="sd-row">
        <button data-sd="nope"><i>${icon('link')}</i>링크 복사</button>
        <button data-sd="nope"><i>${icon('story')}</i>스토리에 추가</button>
        <button data-sd="os" class="target"><i>${icon('share')}</i>공유 대상…</button>
        <button data-sd="nope"><i>${icon('comment')}</i>메시지</button>
      </div>
    </div>`;
  if (p === 'osSheet') return `<div class="sd-dim" data-sd="dismiss"></div>
    <div class="sd-sheet os" role="dialog" aria-label="공유 대상">
      <div class="sd-oshead"><div class="sd-osthumb">${art(demoPost.art)}</div><div><b>${demoPost.author}님의 게시물</b><small>sns.example · 예시</small></div><button class="sd-x" data-sd="dismiss" aria-label="닫기">${icon('close')}</button></div>
      <div class="sd-apps">
        <button data-sd="nope"><i>${icon('comment')}</i>메시지</button>
        <button data-sd="nope"><i>${icon('mail')}</i>메일</button>
        <button data-sd="pinmap" class="target"><i class="pinapp">${icon('bookmark')}</i>핀맵</button>
        <button data-sd="nope"><i>${icon('note')}</i>메모</button>
        <button data-sd="nope"><i>${icon('more')}</i>더보기</button>
      </div>
      <div class="sd-oslist"><span>복사 ${icon('copy')}</span><span>새로운 빠른 메모에 추가 ${icon('note')}</span></div>
    </div>`;
  if (p === 'save') return `<div class="sd-dim light" data-sd="savedone" aria-label="닫고 저장"></div>${saveSheet()}`;
  return '';
}
function saveSheet(){
  const x = sd.item, t = typeOf(x.type);
  const cols = collectionNames().map(name => {
    const first = items.find(i => i.collection === name && i !== x), on = x.collection === name;
    const count = items.filter(i => i.collection === name).length;
    return `<div class="pm-col"><div class="pm-colthumb">${art(first?first.art:'book')}</div><div class="pm-colname"><b>${esc(name)}</b><small>${count}개</small></div><button class="pm-colbtn ${on?'on':''}" data-sd-col="${esc(name)}" aria-pressed="${on}" aria-label="${esc(name)} 모음에 ${on?'저장됨':'저장'}">${icon(on?'check':'plus')}</button></div>`;
  }).join('');
  return `<div class="pm-sheet" role="dialog" aria-label="핀맵에 저장">
    <div class="sd-handle"></div>
    <div class="pm-head">
      <div class="pm-thumb">${art(x.art)}</div>
      <div class="pm-title"><b class="pm-saved">${icon('check')} 핀맵에 저장됨</b><small>${esc(x.title)}</small></div>
      <label class="pm-toggle"><span>AI 자동 분류</span><input type="checkbox" role="switch" data-sd-ai ${sd.aiOn?'checked':''}><i aria-hidden="true"></i></label>
    </div>
    <p class="pm-result" aria-live="polite">${sd.aiOn
      ? `✨ AI가 <b>${t.emoji} ${esc(x.type)}</b>로 분류했어요 · 📍 ${esc(demoPost.ai.distance)}`
      : `직접 고른 <b>${t.emoji} ${esc(x.type)}</b>로 저장돼요`}</p>
    <div class="pm-label">카테고리</div>
    <div class="pm-chips">
      <button class="pm-chip ai ${sd.aiOn?'on':''}" data-sd-type="ai" aria-pressed="${sd.aiOn}">✨ AI 자동 분류</button>
      ${TYPES.map(c => `<button class="pm-chip ${!sd.aiOn&&x.type===c.id?'on':''}" data-sd-type="${c.id}" aria-pressed="${!sd.aiOn&&x.type===c.id}">${c.emoji} ${c.id}</button>`).join('')}
    </div>
    <div class="pm-label">모음 <small>선택</small><button class="pm-new" data-sd="newcol">${icon('plus')} 새 모음</button></div>
    ${sd.newCol?`<form class="pm-newform" id="pm-newform"><input name="name" maxlength="30" placeholder="모음 이름 (예: 10월 데이트)" aria-label="새 모음 이름" required><button class="pm-newsubmit">만들기</button></form>`:''}
    <div class="pm-cols">${cols}</div>
    <button class="pm-done" data-sd="savedone">완료</button>
    <p class="pm-hint">바깥을 눌러도 지금 상태로 저장돼요.</p>
  </div>`;
}
function sdBanner(){
  if (!sd.banner) return '';
  const b = sd.banner;
  return `<div class="sd-banner ${b.undone?'undone':''}" role="status">${b.undone?'':`<div class="sd-bthumb">${art(sd.item.art)}</div>`}<span>${b.text}</span>${b.undone?'':`<button data-sd="undo">실행 취소</button><button data-sd="view" class="strong">보기</button>`}</div>`;
}
function drawShareDemo(){
  const el = $('#sharedemo'); if (!el) return;
  const coach = sdCoach();
  el.innerHTML = `<div class="sd-screen">
    <div class="sd-top"><span class="sd-label">SNS · 예시 화면</span><button class="sd-exit" data-sd="exit">체험 끝내기 ${icon('close')}</button></div>
    <article class="sd-post">
      <header><span class="sd-avatar" aria-hidden="true">S</span><b>${demoPost.author}</b><span class="sd-more" aria-hidden="true">${icon('more')}</span></header>
      <div class="sd-img">${art(demoPost.art)}</div>
      <div class="sd-actions">
        <span aria-hidden="true">${icon('heart')}</span><span aria-hidden="true">${icon('comment')}</span>
        <button class="sd-share ${sd.step==='post'&&!sdSaved()?'target':''}" data-sd="share" aria-label="공유하기">${icon('send')}</button>
        <span class="sd-gap"></span><span aria-hidden="true">${icon('bookmark')}</span>
      </div>
      <p class="sd-likes">좋아요 ${demoPost.likes}개</p>
      <p class="sd-caption"><b>${demoPost.author}</b> ${demoPost.caption}</p>
      <p class="sd-time">2시간 전</p>
    </article>
    ${coach?`<div class="sd-coach" aria-live="polite">${coach}</div>`:''}
    ${sdLayer()}
    ${sdBanner()}
  </div>`;
  el.querySelector('.pm-newform input')?.focus();
}

function sdCreateItem(){
  if (sdSaved()) return;
  const a = demoPost.ai;
  sd.item = {id:Date.now(), title:a.title, type:a.type, category:a.category, source:'SNS · '+demoPost.author, ago:'방금', desc:'공유하기로 저장한 콘텐츠', memo:'', art:demoPost.art, distance:a.distance, address:a.address, collection:'', aiClassified:true, sample:true};
  // 마이 > 설정에서 AI 자동 분류 기본 사용을 끄면 ‘기타’로 시작해 직접 고르게 합니다.
  sd.aiOn = settings.aiDefault;
  if (!sd.aiOn) Object.assign(sd.item, {type:'기타', category:'기타', aiClassified:false});
  items.unshift(sd.item); afterChange();
}
function sdSetType(type){
  const x = sd.item, a = demoPost.ai;
  if (type === 'ai') { sd.aiOn = true; Object.assign(x, {type:a.type, category:a.category, art:demoPost.art, aiClassified:true}); }
  else { sd.aiOn = false; Object.assign(x, {type, category: type===a.type ? a.category : shortType(type), art: type===a.type ? demoPost.art : typeOf(type).art, aiClassified:false}); }
  if (typeOf(x.type).place) { x.address = a.address; x.distance = a.distance; delete x.pending; }
  afterChange(); drawShareDemo();
}
// 시트를 닫고 원래 게시물 하단에 배너를 띄웁니다.
function sdFinish(){
  clearTimeout(sd.closeTimer);
  const x = sd.item; afterChange();
  sd.step = 'post'; sd.newCol = false;
  const what = x.collection ? `‘${esc(x.collection)}’ 모음에 저장됨` : (x.aiClassified ? `✨ ${esc(x.type)}로 저장됨` : `${typeOf(x.type).emoji} ${esc(x.type)}로 저장됨`);
  sd.banner = {text:`<b>핀맵</b> · ${what}`};
  drawShareDemo();
  clearTimeout(sd.bannerTimer);
  sd.bannerTimer = setTimeout(() => { sd.banner = null; drawShareDemo(); }, 5000);
}

document.addEventListener('click', e => {
  if (!e.target.closest('#sharedemo')) return;
  const ai = e.target.closest('[data-sd-ai]');
  if (ai) {
    if (ai.checked) sdSetType('ai');
    else { sd.aiOn = false; sd.item.aiClassified = false; afterChange(); drawShareDemo(); } // AI 분류 결과를 시작점으로 직접 고르기
    return;
  }
  const typeBtn = e.target.closest('[data-sd-type]');
  if (typeBtn) { sdSetType(typeBtn.dataset.sdType); return; }
  const col = e.target.closest('[data-sd-col]');
  if (col) {
    const name = col.dataset.sdCol;
    if (sd.item.collection === name) { sd.item.collection = ''; afterChange(); drawShareDemo(); return; }
    // case2: 모음을 직접 고르면 체크 표시 후 시트가 내려갑니다.
    sd.item.collection = name; afterChange(); drawShareDemo();
    sd.closeTimer = setTimeout(sdFinish, 450);
    return;
  }
  const b = e.target.closest('[data-sd]'); if (!b) return;
  const v = b.dataset.sd;
  if (v === 'exit') { const saved = sdSaved(); closeShareDemo(); render(); if (saved) toast('저장한 콘텐츠는 홈과 컬렉션에서 볼 수 있어요.'); }
  else if (v === 'share') { sd.step = 'snsSheet'; sd.banner = null; drawShareDemo(); }
  else if (v === 'os') { sd.step = 'osSheet'; drawShareDemo(); }
  else if (v === 'pinmap') { sdCreateItem(); sd.step = 'save'; drawShareDemo(); }
  else if (v === 'dismiss') { sd.step = 'post'; drawShareDemo(); }
  else if (v === 'savedone') sdFinish();          // case1: 바깥을 누르거나 완료 → 지금 상태로 저장
  else if (v === 'newcol') { sd.newCol = !sd.newCol; drawShareDemo(); }
  else if (v === 'nope') { const c = $('#sharedemo .sd-coach'); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } }
  else if (v === 'view') { const id = sd.item?.id; closeShareDemo(); page = 'library'; if (id && sdSaved()) openDetail(id); else render(); }
  else if (v === 'undo') {
    items = items.filter(i => i !== sd.item); afterChange();
    sd.banner = {text:'저장을 취소했어요', undone:true}; drawShareDemo();
    clearTimeout(sd.bannerTimer); sd.bannerTimer = setTimeout(() => { sd.banner = null; drawShareDemo(); }, 2000);
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'pm-newform') return;
  e.preventDefault();
  const name = e.target.elements.name.value.trim(); if (!name) return;
  sd.item.collection = name; sd.newCol = false; afterChange(); drawShareDemo();
  sd.closeTimer = setTimeout(sdFinish, 450);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !$('#sharedemo')) return;
  if (sd.step === 'save') sdFinish();
  else if (sd.step !== 'post') { sd.step = 'post'; drawShareDemo(); }
});
actions.snsdemo = openShareDemo;
