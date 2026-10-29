// 핀맵 기본 데이터 · 화면 렌더링 · 공통 동작
const $ = s => document.querySelector(s);
const paths = {
  home:'M3 10 12 3l9 7v10H3z M9 20v-7h6v7', bookmark:'M6 3h12v18l-6-4-6 4z',
  map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16', folder:'M3 7V4h7l3 3h8v13H3z',
  plus:'M12 5v14 M5 12h14', search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow:'M5 12h14 M13 6l6 6-6 6', back:'M15 5l-7 7 7 7', close:'m6 6 12 12 M18 6 6 18',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  coffee:'M4 4h12v10a5 5 0 0 1-10 0V4 M16 5h2a3 3 0 0 1 0 6h-2 M3 21h16', check:'m5 12 4 4L20 5',
  external:'M14 3h7v7 M21 3 10 14 M11 3H3v18h18v-8', spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  target:'M12 2v4 M12 18v4 M2 12h4 M18 12h4 M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', calendar:'M4 5h16v15H4z M4 10h16 M9 3v4 M15 3v4',
  heart:'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', comment:'M4 5h16v11H9l-5 4z',
  send:'M21 3 3 10l7 3 3 7z M10 13 21 3',
  link:'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  share:'M12 15V3 M7 8l5-5 5 5 M5 13v7h14v-7', story:'M12 3a9 9 0 1 0 9 9 M12 8v4l3 2',
  more:'M5 12h.01 M12 12h.01 M19 12h.01', image:'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9h.01',
  mail:'M3 6h18v12H3z M3 6l9 7 9-7', user:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0',
  bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4', note:'M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4', copy:'M8 8h12v12H8z M4 16V4h12',
  eat:'M7 3v18 M4 3v5a3 3 0 0 0 6 0V3 M17 21v-9h3V3c-4 0-5 6-3 9',
  event:'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M16 5v3 M16 11v2 M16 16v3',
  walk:'M12 22v-7 M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z',
  shop:'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  route:'M7 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8 M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M21 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0'
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.bookmark}"/></svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 콘텐츠 유형 (저장 카테고리) ---------- */
// place: 지도에 표시하는 장소형 콘텐츠. 나머지는 썸네일·제목·간단 정보 + 원본 보기.
const TYPES = [
  {id:'맛집·카페', emoji:'☕', place:true, art:'cafe'},
  {id:'전시·팝업', emoji:'🖼️', place:true, art:'exhibit'},
  {id:'여행', emoji:'✈️', place:true, art:'sea'},
  {id:'쇼핑', emoji:'🛍️', art:'bag'},
  {id:'레시피', emoji:'🍳', art:'food'},
  {id:'생활 정보', emoji:'💡', art:'tips'},
  {id:'기타', emoji:'🔖', art:'book'}
];
const typeIds = TYPES.map(t => t.id);
const categories = ['전체', ...typeIds];
const typeOf = id => TYPES.find(t => t.id === id) || TYPES[TYPES.length-1];
const isPlace = x => !!typeOf(x.type).place;
const shortType = id => id.split('·')[0].trim();
const COLLECTIONS = PM_ENV.development ? [] : [
  ['이번 주말 성수','coffee','카페, 전시, 산책까지 주말 외출 후보'],
  ['나의 작은 공간','home','집을 조금 더 나답게'],
  ['일상에 영감','spark','요리부터 기록까지']
];
const collectionNames = () => [...new Set([...COLLECTIONS.map(c => c[0]), ...items.map(x => x.collection).filter(Boolean)])];

// 예시 데이터 · 실제 SNS 계정과 연결되지 않습니다.
let items = PM_ENV.development ? [] : [
  {id:1,title:'햇살이 머무는 성수 카페',type:'맛집·카페',category:'카페',source:'Instagram',ago:'2일 전',desc:'큰 창 옆에서 커피 한 잔, 느긋한 오후.',memo:'성수에서 친구 만나기 전에 들러보기. 창가 자리!',art:'cafe',distance:'도보 5분',collection:'이번 주말 성수',address:'서울 성동구 성수동 · 예시 장소',saves:128,aiClassified:true},
  {id:2,title:'작은 방을 바꾸는 조명',type:'쇼핑',category:'조명',source:'Instagram',ago:'어제',desc:'공간의 분위기를 바꾸는 작은 빛.',memo:'책상 옆에 두고 싶은 따뜻한 조명.',art:'lamp',collection:'나의 작은 공간',price:'49,000원 · 예시 가격',shop:'예시 리빙 스토어',aiClassified:true},
  {id:3,title:'15분, 바질 토마토 파스타',type:'레시피',category:'파스타',source:'YouTube',ago:'3일 전',desc:'퇴근 후에도 가볍게 만드는 한 접시.',memo:'방울토마토, 바질, 파스타면만 준비하면 끝.',art:'food',collection:'일상에 영감',recipe:'15분 · 재료 4가지 · 1인분',saves:96,aiClassified:true},
  {id:4,title:'초록 사이, 주말의 전시',type:'전시·팝업',category:'전시',source:'Instagram',ago:'4일 전',desc:'식물과 일상의 사물을 새롭게 보는 시간.',memo:'이번 주말 성수에 가면 같이 보기.',art:'exhibit',distance:'도보 12분',collection:'이번 주말 성수',deadline:'D-3',period:'10.1 – 10.8 · 예시 기간',address:'서울 성동구 성수동 · 예시 전시',deleted:true,saves:74,aiClassified:true},
  {id:5,title:'취향을 기록하는 방법',type:'생활 정보',category:'기록',source:'YouTube',ago:'5일 전',desc:'좋아하는 것을 모으고 나만의 언어로.',memo:'기록이 막힐 때 다시 꺼내보기.',art:'book',collection:'일상에 영감',aiClassified:true},
  {id:6,title:'서울숲에서 잠깐 쉬어가기',type:'여행',category:'산책',source:'Instagram',ago:'1주 전',desc:'도시 한가운데에서 만나는 초록.',memo:'커피를 마신 뒤 가볍게 산책하기.',art:'park',distance:'도보 9분',collection:'이번 주말 성수',address:'서울 성동구 뚝섬로 273',mapQuery:'서울숲',aiClassified:false},
  {id:7,title:'댓글에서 발견한 카페',type:'맛집·카페',category:'카페',source:'Instagram',ago:'방금',desc:'위치를 확인하고 지도에 담아보세요.',memo:'원본에서 주소 확인하기',art:'cafe',collection:'이번 주말 성수',pending:true,aiClassified:true},
  {id:8,title:'골목 안 작은 브런치 식당',type:'맛집·카페',category:'맛집',source:'Instagram',ago:'6일 전',desc:'주말 아침, 천천히 먹는 한 접시.',memo:'주말 브런치 약속 장소 후보.',art:'food',distance:'도보 7분',collection:'이번 주말 성수',address:'서울 성동구 성수동 · 예시 맛집',mapQuery:'성수동 브런치',saves:61,aiClassified:true},
  {id:9,title:'바다 앞 작은 숙소',type:'여행',category:'숙소',source:'Instagram',ago:'2주 전',desc:'창문을 열면 바로 바다가 보이는 곳.',memo:'가을 휴가 후보. 일출 보기!',art:'sea',distance:'차로 약 3시간',address:'강원 강릉시 · 예시 여행지',mapQuery:'강릉 바다',aiClassified:true},
  {id:10,title:'매일 드는 캔버스 토트백',type:'쇼핑',category:'가방',source:'Instagram',ago:'1주 전',desc:'노트북도 들어가는 넉넉한 크기.',memo:'세일하면 사기.',art:'bag',collection:'나의 작은 공간',price:'32,000원 · 예시 가격',shop:'예시 패션 스토어',aiClassified:true},
  {id:11,title:'원룸 수납 정리 아이디어',type:'생활 정보',category:'수납',source:'Instagram',ago:'3주 전',desc:'좁은 방을 넓게 쓰는 선반 배치.',memo:'이사 가면 참고하기.',art:'tips',collection:'일상에 영감',saves:142,aiClassified:true}
];
let page='home', filter='전체', query='', detailId=null, selectedPin=1, collection=null, locationAllowed=false, toastTimer;
// 마이 > 프로필 · 설정 (pinmap.js가 브라우저에 저장합니다)
let settings = PM_ENV.development ? {nickname:'',area:'',notiDeadline:false,notiNearby:false,notiReminder:false,aiDefault:false,mapApp:'naver',readNoti:[],push:false,locPerm:'none',places:[],recentPlaces:[],accounts:[],calSeeded:true} : {nickname:'서연', area:'성수동', notiDeadline:true, notiNearby:true, notiReminder:false, aiDefault:true, mapApp:'naver', readNoti:[], push:false, locPerm:'none', places:['성수동','청파동'], recentPlaces:['한남동','연남동','잠실3동']};
const LOC_PERM = {none:'허용 안 함', using:'앱을 사용하는 동안', always:'항상 허용'};
const MAP_APPS = {
  naver:{name:'네이버 지도', url:q=>`https://map.naver.com/p/search/${q}`},
  kakao:{name:'카카오맵', url:q=>`https://map.kakao.com/?q=${q}`},
  google:{name:'구글 지도', url:q=>`https://www.google.com/maps/search/?api=1&query=${q}`}
};
let dueDismissed = false; // 마감 임박 배너를 닫으면 이번 방문 동안 숨김
let unreadCount = () => 0; // my.js가 알림 개수 계산을 연결합니다
const pages = {};          // 화면 렌더 함수 (pinmap.js가 home을 개인화 버전으로 바꿉니다)
let afterChange = () => {}; // 데이터가 바뀌면 호출 (pinmap.js가 브라우저 저장을 연결합니다)

/* ---------- 일러스트 (직접 만든 SVG) ---------- */
function art(kind){const base='<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';const svgs={
cafe:'<rect width="400" height="230" fill="#D9D1BF"/><path d="M0 180 400 55v175H0" fill="#B6AA91"/><rect x="58" y="0" width="177" height="150" rx="2" fill="#E6ECE0"/><path d="M145 0v150 M58 75h177" stroke="#8C9886" stroke-width="7"/><path d="m60 150 125 80h155L232 150" fill="#F5E2B5"/><ellipse cx="260" cy="174" rx="73" ry="17" fill="#786E5B"/><path d="M246 183v47" stroke="#786E5B" stroke-width="9"/><ellipse cx="260" cy="166" rx="72" ry="17" fill="#EAE1CF"/><path d="M243 141h29v23q-14 14-29 0z" fill="#FFFDF5"/><path d="M272 146q20-2 13 12h-13" fill="none" stroke="#FFFDF5" stroke-width="6"/><path d="M336 136v-60" stroke="#577154" stroke-width="4"/><ellipse cx="324" cy="84" rx="15" ry="29" fill="#64865D" transform="rotate(-35 324 84)"/><ellipse cx="349" cy="63" rx="14" ry="26" fill="#80966A" transform="rotate(35 349 63)"/><path d="m319 130 8 29h22l8-29" fill="#A97050"/>',
lamp:'<rect width="400" height="230" fill="#E9DECE"/><rect y="180" width="400" height="50" fill="#C5AF93"/><ellipse cx="217" cy="186" rx="60" ry="9" fill="#A18B7266"/><path d="M214 85v95" stroke="#725D44" stroke-width="8"/><path d="M160 100q5-93 110 0z" fill="#AC6C49"/><ellipse cx="215" cy="100" rx="55" ry="10" fill="#F7CF91"/><ellipse cx="215" cy="179" rx="33" ry="8" fill="#8B6A4B"/><path d="M39 179v-38h55v38" fill="#B4BEA2"/><path d="m52 142-9-36 M67 140l19-49" stroke="#687B57" stroke-width="5"/><rect x="304" y="145" width="57" height="35" fill="#DED4BE"/>',
food:'<rect width="400" height="230" fill="#DDDCC5"/><path d="M0 45h400 M0 115h400 M0 185h400 M55 0v230 M145 0v230 M235 0v230 M325 0v230" stroke="#F2F0DB" stroke-width="2"/><ellipse cx="207" cy="116" rx="102" ry="97" fill="#F8F7EC"/><ellipse cx="207" cy="116" rx="76" ry="71" fill="#E5B867"/><path d="M157 100q75-75 107 10t-103 37q-35-50 54-68t28 78q-70 15-70-40t65-9" fill="none" stroke="#F4D797" stroke-width="9"/><g fill="#B95438"><circle cx="168" cy="81" r="15"/><circle cx="237" cy="143" r="17"/><circle cx="249" cy="90" r="13"/><circle cx="173" cy="146" r="12"/></g><path d="M191 105q-24-30 0-34 25 13 0 34 M203 104q32-24 36 0-17 19-36 0" fill="#527448"/><path d="M65 63v124 M53 62v35q12 14 24 0V62" fill="none" stroke="#868A77" stroke-width="5"/>',
exhibit:'<rect width="400" height="230" fill="#D9E1D4"/><rect x="35" y="22" width="330" height="186" fill="#F8F3DF"/><text x="58" y="75" font-size="44" font-weight="700" fill="#365940">GREEN</text><text x="58" y="117" font-size="44" font-weight="700" fill="#365940">MOMENTS</text><path d="M273 185q-75-23-32-65 61-19 32 65 M273 185q66-66 59-7-19 27-59 7" fill="#819F6D"/><path d="M58 150h120" stroke="#7A8A65"/><text x="58" y="174" font-size="11" letter-spacing="2" fill="#52654B">ART · NATURE · EVERYDAY</text>',
book:'<rect width="400" height="230" fill="#D4DDE0"/><g transform="rotate(-12 200 115)"><rect x="116" y="30" width="162" height="184" rx="4" fill="#8A9FA5"/><rect x="109" y="23" width="162" height="184" rx="4" fill="#F3EACF"/><path d="M131 23v184" stroke="#CEBE9D"/><text x="150" y="79" font-size="25" fill="#4C6569">Small</text><text x="150" y="111" font-size="25" fill="#4C6569">things,</text><text x="150" y="143" font-size="25" fill="#4C6569">good days.</text><circle cx="234" cy="180" r="10" fill="#9EAD86"/></g>',
park:'<rect width="400" height="230" fill="#CFDFD0"/><path d="M0 154q110-60 220 0t180 0v76H0" fill="#A0BC8A"/><path d="M183 230q-60-70 16-106h37q-54 43 42 106" fill="#E2D3B3"/><g fill="#78996B"><circle cx="73" cy="92" r="48"/><circle cx="340" cy="75" r="63"/></g><g fill="#91AF80"><circle cx="104" cy="57" r="43"/><circle cx="295" cy="51" r="41"/></g><path d="M85 103v93 M327 89v94" stroke="#6F7D56" stroke-width="9"/><path d="M241 170h54 M248 163v23 M287 163v23" stroke="#8A7457" stroke-width="6"/>',
bag:'<rect width="400" height="230" fill="#E4DCCF"/><rect y="185" width="400" height="45" fill="#CDBFA8"/><path d="M155 88q0-52 45-52t45 52" fill="none" stroke="#6E5B45" stroke-width="8"/><path d="M118 85h164l-14 112H132z" fill="#F3EBDD"/><path d="M118 85h164" stroke="#D8CCB8" stroke-width="4"/><rect x="168" y="122" width="64" height="34" rx="4" fill="#9FD9BD"/><ellipse cx="200" cy="198" rx="82" ry="7" fill="#A8977E55"/><circle cx="324" cy="150" r="22" fill="#B9C7A6"/><path d="M324 172v14" stroke="#7C8B67" stroke-width="5"/>',
tips:'<rect width="400" height="230" fill="#E3E6DD"/><rect x="70" y="36" width="260" height="168" rx="6" fill="#F6F3EA"/><path d="M70 95h260 M70 150h260" stroke="#CFC6B3" stroke-width="5"/><rect x="90" y="54" width="40" height="38" rx="4" fill="#B9C7A6"/><rect x="140" y="61" width="55" height="31" rx="4" fill="#E2B98F"/><rect x="250" y="49" width="60" height="43" rx="6" fill="#9FB7BF"/><rect x="95" y="112" width="70" height="36" rx="5" fill="#D9CDB6"/><circle cx="230" cy="128" r="18" fill="#9FD9BD"/><rect x="270" y="108" width="40" height="40" rx="5" fill="#C7A98A"/><rect x="110" y="165" width="180" height="28" rx="6" fill="#DCD3C2"/>',
sea:'<rect width="400" height="230" fill="#CFE3EA"/><circle cx="300" cy="62" r="26" fill="#F7E3A6"/><path d="M0 120h400v110H0z" fill="#8DB9C8"/><path d="M0 130q50-10 100 0t100 0 100 0 100 0" fill="none" stroke="#E8F3F5" stroke-width="4"/><path d="M0 165q50-10 100 0t100 0 100 0 100 0" fill="none" stroke="#D3E8EC" stroke-width="3"/><path d="M0 190q120-40 260-10t140 10v40H0z" fill="#E9DCC0"/><path d="M60 190v-50 M60 140q-20 0-30 12 M60 140q20-5 32 8 M60 140q-6-16-22-18 M60 140q10-16 26-14" stroke="#6F8A5C" stroke-width="5" fill="none"/>'
};return base+(svgs[kind]||svgs.book)+'</svg>'}

/* ---------- 카드 ---------- */
// 콘텐츠 유형별로 카드에 보여줄 한 줄 정보
function infoLine(x){
  if(isPlace(x)){ if(x.pending) return '📍 위치 확인 필요'; if(x.period) return '🗓 '+x.period.replace(' · 예시 기간',''); return x.distance?'📍 '+x.distance:''; }
  if(x.type==='쇼핑') return x.price?'💳 '+x.price.replace(' · 예시 가격',''):'';
  if(x.type==='레시피') return x.recipe?'⏱ '+x.recipe:'';
  return '';
}
const badge = x => `<span class="badge">${typeOf(x.type).emoji} ${esc(x.category||shortType(x.type))}</span>`;
function card(x){const info=infoLine(x);return `<button class="card" data-detail="${x.id}"><div class="art">${art(x.art)}${badge(x)}<span class="saved">${icon('bookmark')}</span></div><div class="cardbody"><div class="meta"><span>${esc(x.ago)} 저장</span></div><h3>${esc(x.title)}</h3>${info?`<p class="infoline">${esc(info)}</p>`:`<p>${esc(x.desc)}</p>`}<span class="tag">${esc(x.collection||'미분류')}</span>${x.deadline?`<span class="tag due">${esc(x.deadline)}</span>`:''}</div></button>`}
// 비장소 콘텐츠: 갤러리형 카드 (썸네일 · 제목 · 간단 정보 + 원본은 SNS에서)
function gcard(x){const ratio=[0.82,1.12,0.95,1.28][x.id%4];const info=infoLine(x);return `<button class="gcard" data-detail="${x.id}"><div class="gart" style="aspect-ratio:${ratio}">${art(x.art)}${badge(x)}</div><div class="gbody"><h3>${esc(x.title)}</h3>${info?`<p class="infoline">${esc(info)}</p>`:''}<p class="hint">${esc(x.ago)} 저장</p></div></button>`}

/* ---------- 공통 레이아웃 ---------- */
const NAV = [['home','home','홈'],['map','map','지도'],['library','bookmark','저장함'],['my','user','마이']];
const pageName = {home:'홈',map:'지도',library:'저장함',my:'마이'};
function nav(){return NAV.map(([p,i,l])=>`<button class="navitem ${page===p&&!detailId?'active':''}" data-page="${p}" ${page===p?'aria-current="page"':''}><span class="navicon">${icon(i)}</span><span>${l}</span></button>`).join('')}
// 페이지 제목 (서브 문구는 표시하지 않아요)
function head(title,sub,save=true){return `<div class="heading"><div><h1>${title}</h1></div>${save?`<button class="filled" data-action="save" aria-label="새로 저장">${icon('plus')}<span>새로 저장</span></button>`:''}</div>`}
let locbar = () => `<button class="locbar" data-action="location"><span aria-hidden="true">📍</span><b>${esc((settings.places||['성수동'])[0])}</b><span class="hint">${settings.locPerm!=='none'?'현재 위치 · 예시':'예시 위치 · 위치 권한 체험'}</span></button>`;
function chips(){return `<div class="chips" role="group" aria-label="콘텐츠 유형 필터">${categories.map(c=>`<button class="chip ${filter===c?'active':''}" data-filter="${c}" aria-pressed="${filter===c}">${filter===c?icon('check'):(c==='전체'?'':typeOf(c).emoji+' ')}${c}</button>`).join('')}</div>`}
function filtered(){const q=query.toLowerCase();return items.filter(x=>(filter==='전체'||x.type===filter)&&(!collection||x.collection===collection)&&(!q||[x.title,x.desc,x.type,x.category,x.collection,x.memo].join(' ').toLowerCase().includes(q)))}
const galleryMode = () => !collection && filter!=='전체' && !typeOf(filter).place;

/* ---------- 화면 ---------- */
pages.home = function(){return locbar()+head('저장한 취향이, 오늘의 일상으로.','잊고 있던 좋은 것들을 다시 꺼내볼까요?',false)+`<div class="grid">${items.slice(0,4).map(card).join('')}</div>`};

pages.library = function(){
  const sub = collection?'하나의 계획으로 연결되는 다양한 취향.':`지금까지 담아둔 ${items.length}개의 콘텐츠를 한곳에서.`;
  return head(esc(collection)||'내 저장함',sub)+`${collection?`<button class="back" data-page="library">${icon('back')} 전체 저장함</button>`:''}<label class="search">${icon('search')}<input id="search" aria-label="저장 콘텐츠 검색" placeholder="제목, 키워드, 저장한 이유로 찾기" value="${esc(query)}"><button class="iconbtn" data-action="clear" aria-label="검색 지우기">${icon('close')}</button></label>${collection?'':`<div class="colstrip" aria-label="내 모음">${collectionNames().map(n=>`<button class="colpill" data-collection="${esc(n)}">📁 ${esc(n)} <span>${items.filter(x=>x.collection===n).length}</span></button>`).join('')}</div>`}${chips()}<div class="sectionhead"><span id="resultcount" class="muted">${filtered().length}개의 콘텐츠</span><span class="hint">${galleryMode()?'갤러리 보기 · ':''}최근 저장순</span></div><div id="results" class="${galleryMode()?'gallery':'grid'}">${resultCards()}</div>`;
};
function resultCards(){const list=filtered();return list.map(galleryMode()?gcard:card).join('')||`<div class="empty">${icon('search')}<h3>아직 찾는 콘텐츠가 없어요</h3><p class="muted">다른 키워드나 유형으로 다시 찾아보세요.</p><button class="tonal" data-action="resetfilter">전체 콘텐츠 보기</button></div>`}

const readyPlaces = () => items.filter(x=>isPlace(x)&&x.address&&!x.pending);
const distanceOf = x => /도보/.test(x.distance||'') ? Number(String(x.distance).replace(/\D/g,''))||99 : 999;
pages.map = function(){
  const ready=readyPlaces().sort((a,b)=>distanceOf(a)-distanceOf(b)), near=ready.filter(x=>distanceOf(x)<999), pending=items.filter(x=>isPlace(x)&&(!x.address||x.pending));
  const x=near.find(p=>p.id===selectedPin)||near[0];
  const pins=near.slice(0,4).map((p,i)=>`<button class="pin ${x&&p.id===x.id?'selected':''}" style="left:${[46,65,19,30][i]}%;top:${[33,53,42,62][i]}%" data-pin="${p.id}" aria-label="${esc(p.title)} 선택">${typeOf(p.type).emoji} ${esc(p.category)}</button>`).join('');
  return locbar()+head('저장한 곳, 지금 가까이에.','내 주변에 저장한 장소를 지도에서 찾아요.')+`<div class="mapwrap"><svg class="mapdrawing" viewBox="0 0 850 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="850" height="540" fill="#E7EADC"/><path d="M0 480 850 420v120H0" fill="#C0D9E0"/><path d="m100 50 220 25 30 175-250 20z" fill="#C4D7B7"/><g stroke="#F9F9EF" stroke-width="22" fill="none"><path d="M-40 300 900 90 M20 400 900 230 M320-20 530 500 M600-20 760 460 M120-20 230 480"/></g><g stroke="#CDD1C1" stroke-width="2" fill="none"><path d="M-40 300 900 90 M20 400 900 230 M320-20 530 500 M600-20 760 460"/></g><g fill="#D6D9CC"><rect x="390" y="45" width="120" height="70" rx="8" transform="rotate(-14 390 45)"/><rect x="435" y="290" width="85" height="62" rx="8" transform="rotate(-14 435 290)"/><rect x="550" y="165" width="60" height="61" rx="7"/><rect x="630" y="290" width="90" height="60" rx="8"/></g><g font-size="14" fill="#707B66"><text x="150" y="170">서울숲</text><text x="565" y="84">성수동</text><text x="345" y="285">서울숲길</text><text x="640" y="445">한강</text></g><circle cx="410" cy="260" r="30" fill="#648EAA22"/><circle cx="410" cy="260" r="9" fill="#507FA6" stroke="white" stroke-width="4"/></svg><span class="maplabel">예시 지도 · 실제 거리와 다를 수 있어요</span>${pins}${x?`<div class="mapcard"><div><span class="hint">${esc(x.distance||'성수동')} · ${esc(x.category)}</span><h3>${esc(x.title)}</h3><p class="muted">${esc(x.memo)}</p></div><button class="filled" data-detail="${x.id}">상세 보기</button></div>`:''}<button class="iconbtn location" data-action="location" aria-label="위치 권한 체험">${icon('target')}</button></div><div class="sectionhead"><h2>지도에 담긴 내 장소</h2><span class="hint">${ready.length}곳 · 가까운 순</span></div><div class="grid">${ready.map(card).join('')}</div>`+(pending.length?`<div class="sectionhead"><h2>장소 확인 필요 · ${pending.length}개</h2></div><p class="hint">AI가 위치를 확정하지 못한 콘텐츠예요. 주소를 확인하면 지도에 표시돼요.</p><div class="grid">${pending.map(card).join('')}</div>`:'');
};

function collectionCard(name){const meta=COLLECTIONS.find(c=>c[0]===name)||[name,'folder','내가 만든 모음'];const list=items.filter(x=>x.collection===name);const due=list.find(x=>x.deadline);return `<button class="collection" data-collection="${esc(name)}">${icon(meta[1])}<div><h3>${esc(name)}</h3><p>${esc(meta[2])}</p><span class="hint">${list.length}개의 콘텐츠${due?` · ${esc(due.deadline)} 일정 포함`:''}</span></div></button>`}
function detail(){
  const x=items.find(x=>x.id===detailId);
  if(!x){detailId=null;return pages[page]();}
  const t=typeOf(x.type);let info='';
  if(t.place){
    if(x.pending||!x.address) info+=`<div class="infobox warn"><div class="inline">${icon('pin')}<h3>장소 확인 필요</h3></div><p>AI가 위치를 확정하지 못했어요. 원본을 확인하고 주소를 입력하면 지도에서 찾을 수 있어요.</p><button class="tonal" data-action="edit">장소 직접 입력</button></div>`;
    else info+=`<div class="infobox"><div class="inline">${icon('pin')}<h3>${x.type==='여행'?'여행지 정보':'장소 정보'}</h3></div><p>${esc(x.address)}</p><p class="hint">${esc(x.distance||'거리 정보 없음')} · 실제 방문 전 원본에서 정보를 확인하세요.</p></div>`;
    if(x.period) info+=`<div class="infobox"><div class="inline">${icon('calendar')}<h3>운영 기간</h3></div><p>${esc(x.period)}${x.deadline?` · 마감 ${esc(x.deadline)}`:''}</p></div>`;
  }
  if(x.type==='쇼핑') info+=`<div class="infobox"><div class="inline">${icon('bookmark')}<h3>구매 정보</h3></div><p>${esc(x.price||'가격 정보 없음')}</p><p class="hint">${esc(x.shop||'판매처 정보 없음')} · 가격과 재고는 원본에서 다시 확인하세요.</p></div>`;
  if(x.type==='레시피') info+=`<div class="infobox"><div class="inline">${icon('clock')}<h3>간단 정보</h3></div><p>${esc(x.recipe||'정보 없음')}</p><p class="hint">자세한 조리법은 원본 콘텐츠에서 확인해요.</p></div>`;
  const original = x.deleted
    ? `<div class="infobox deletedbox"><div class="inline">${icon('external')}<h3>원본 콘텐츠</h3></div><p>삭제된 게시물입니다.</p><p class="hint">원본을 열 수 없지만 ${t.place?'장소 정보와 ':''}내 메모는 그대로 남아 있어요.</p></div>`
    : '';
  const mapLink = t.place && x.address && !x.pending ? `<a class="outlined" target="_blank" rel="noopener noreferrer" href="${(MAP_APPS[settings.mapApp]||MAP_APPS.naver).url(encodeURIComponent(x.mapQuery||x.address))}">${icon('map')} ${(MAP_APPS[settings.mapApp]||MAP_APPS.naver).name}에서 길찾기</a>` : '';
  return `<div class="detail"><button class="back" data-action="back">${icon('back')} 돌아가기</button><div class="art">${art(x.art)}${badge(x)}</div><div class="detailmeta"><span>${esc(x.source)}에서 저장 · ${esc(x.ago)}</span><span class="classlabel">${x.aiClassified?'✨ AI 분류':'직접 분류'} · ${t.emoji} ${esc(x.type)}</span></div><h1>${esc(x.title)}</h1><p class="muted">${esc(x.desc)}</p><span class="tag">${esc(x.collection||'미분류')}</span>${info}<div class="infobox"><div class="inline">${icon('bookmark')}<h3>이래서 저장했어요</h3></div><p>${esc(x.memo||'아직 메모가 없어요.')}</p><button class="textbtn" data-action="edit">${t.place?'장소·분류·메모 수정':'분류·메모 수정'}</button></div>${original}<div class="actions">${x.deleted?'':`<button class="filled" data-action="original">${icon('external')} 원본 콘텐츠 보기</button>`}${mapLink}</div><p class="hint">원본 콘텐츠는 저장한 SNS에서 확인해요. 핀맵은 썸네일과 요약만 보여줘요. (예시 콘텐츠)</p></div>`;
}

function render(){
  const content=detailId?detail():pages[page]();
  $('#app').innerHTML=`<div class="layout"><aside class="rail"><a href="#" class="brand" data-page="home"><b class="brandmark">${icon('bookmark')}</b><span>핀맵</span></a><button class="filled" data-action="save">${icon('plus')}<span>새로 저장</span></button><nav aria-label="주 메뉴">${nav()}</nav><div class="railfoot">저장을 다시, 일상으로.<button data-action="intro">사용 방법 알아보기</button><span>Prototype 03</span></div></aside><main class="main"><header class="topbar"><span class="breadcrumb">핀맵 / ${detailId?'콘텐츠 상세':pageName[page]}</span>${page==='my'&&!detailId?'<h1 class="toptitle">마이</h1>':`<a href="#" class="brand mobilebrand" data-page="home"><b class="brandmark">${icon('bookmark')}</b>핀맵</a>`}<div class="topactions">${page==='home'&&!detailId?`<button class="bellbtn searchbtn" data-action="homesearch" aria-label="저장한 콘텐츠 검색">${icon('search')}</button>`:''}${(n=>`<button class="bellbtn" data-action="noti" aria-label="알림${n?` ${n}개 안 읽음`:''}">${icon('bell')}${n?`<span class="belldot">${n}</span>`:''}</button>`)(unreadCount())}</div></header>${content}<footer class="footer"><span>핀맵 · 저장을 다시, 일상으로.</span><span>예시 데이터로 체험하는 프로토타입</span></footer></main><nav class="bottomnav" aria-label="하단 메뉴">${nav()}</nav></div>`;
}
function go(p){page=p;detailId=null;collection=null;filter='전체';query='';render();window.scrollTo(0,0)}
function openDetail(id){detailId=id;render();window.scrollTo(0,0)}
function toast(t){$('#snackbar').textContent=t;$('#snackbar').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#snackbar').classList.remove('show'),3200)}
function modal(title,body){const d=$('#sheet');d.innerHTML=`<div class="handle"></div><div class="dialoghead"><h2>${title}</h2><button class="iconbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div>${body}`;if(!d.open)d.showModal()}

/* ---------- AI 분류 (프로토타입용 간단한 규칙) ---------- */
function guessType(text){
  const t=text.toLowerCase();
  if(/카페|커피|맛집|브런치|식당|베이커리|디저트/.test(t)) return '맛집·카페';
  if(/전시|팝업|미술관|갤러리|공연/.test(t)) return '전시·팝업';
  if(/여행|숙소|호텔|바다|여행지|캠핑/.test(t)) return '여행';
  if(/레시피|요리|만들기|파스타|recipe/.test(t)) return '레시피';
  if(/구매|가방|조명|옷|신발|템|shop|store/.test(t)) return '쇼핑';
  if(/정리|꿀팁|방법|팁|공부|자료/.test(t)) return '생활 정보';
  return '기타';
}

/* ---------- 대화상자 ---------- */
function saveDialog(){modal('새로 저장',`<button class="sharecta" data-action="snsdemo"><span class="bigemoji" aria-hidden="true">📲</span><div><b>SNS에서 공유로 저장하기</b><small>SNS 게시물에서 공유 → 핀맵을 누르는 저장 과정을 체험해요</small></div>${icon('arrow')}</button><div class="divider"><span>또는 링크 붙여넣기</span></div><form id="saveform"><label class="field"><span>콘텐츠 링크</span><input type="url" name="url" placeholder="https://" required></label><button type="button" class="textbtn" data-action="sample">예시 링크로 채우기 ${icon('arrow')}</button><label class="field"><span>제목</span><input name="title" placeholder="다시 찾기 쉬운 이름" required maxlength="80"></label><label class="field"><span>카테고리</span><select name="type"><option value="ai" ${settings.aiDefault?'selected':''}>✨ AI 자동 분류</option>${TYPES.map(t=>`<option value="${t.id}" ${!settings.aiDefault&&t.id==='기타'?'selected':''}>${t.emoji} ${t.id}</option>`).join('')}</select></label><label class="field"><span>모음 · 선택</span><select name="collection"><option value="">나중에 정리</option>${collectionNames().map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label class="field"><span>저장한 이유 · 선택</span><textarea name="memo" rows="2" maxlength="300" placeholder="어떤 순간에 다시 보고 싶나요?"></textarea></label><p class="hint">이 브라우저에 저장돼요. AI 분류는 프로토타입용 간단한 규칙이에요.</p><p class="error" id="saveerror"></p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">${icon('bookmark')} 저장하기</button></div></form>`)}
function editDialog(){const x=items.find(x=>x.id===detailId);modal('저장 정보 수정',`<form id="editform"><label class="field"><span>카테고리</span><select name="type">${TYPES.map(t=>`<option value="${t.id}" ${t.id===x.type?'selected':''}>${t.emoji} ${t.id}</option>`).join('')}</select></label><label class="field"><span>제목 / 장소명</span><input name="title" value="${esc(x.title)}" required maxlength="80"></label><label class="field"><span>주소 · 맛집·카페, 전시·팝업, 여행에만 사용</span><input name="address" value="${esc(x.address||'')}" maxlength="200" placeholder="원본에서 확인한 주소"></label><label class="field"><span>내 메모</span><textarea name="memo" maxlength="300">${esc(x.memo||'')}</textarea></label><label class="field"><span>모음</span><input name="collection" list="collectionlist" value="${esc(x.collection||'')}" maxlength="80" placeholder="나중에 정리"><datalist id="collectionlist">${collectionNames().map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label><p class="hint">직접 바꾼 카테고리는 ‘직접 분류’로 표시돼요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">수정 내용 저장</button></div></form>`)}
function intro(){modal('핀맵',`<p class="muted">저장한 콘텐츠를 필요한 순간 다시 꺼내보세요.</p><div class="dialogactions"><button class="filled" data-action="close">확인</button></div>`)}
// 위치 권한 (프로토타입: 실제 위치는 요청하지 않고 성수동 예시 위치를 사용)
function locationDialog(){modal('위치 권한',`<p>현재 위치 주변에 저장한 장소를 찾을 때 사용해요.</p><div class="permopts" role="radiogroup" aria-label="위치 권한">${Object.entries(LOC_PERM).map(([k,v])=>`<button role="radio" aria-checked="${settings.locPerm===k}" class="permopt ${settings.locPerm===k?'on':''}" data-locperm="${k}"><b>${v}</b><small>${{none:'예시 위치(성수동)로만 체험해요',using:'앱을 켜 두었을 때 주변 장소를 보여줘요',always:'앱을 켜지 않아도 근처 저장 콘텐츠를 알려드려요'}[k]}</small></button>`).join('')}</div><p class="hint">프로토타입에서는 실제 위치를 요청하지 않아요.</p>`)}

/* ---------- 동작 ---------- */
const actions = {
  save: saveDialog, intro: () => intro(), close: () => $('#sheet').close(),
  back: () => { detailId=null; render(); },
  clear: () => { query=''; render(); $('#search')?.focus(); },
  resetfilter: () => { query=''; filter='전체'; render(); },
  location: locationDialog,
  allow: () => { if(settings.locPerm==='none')settings.locPerm='using'; afterChange(); $('#sheet').close(); render(); toast('예시 위치(성수동)로 주변 장소를 표시했어요'); },
  later: () => { $('#sheet').close(); toast('위치 권한 없이 성수동 예시 지도를 둘러봅니다'); },
  edit: editDialog,
  duedismiss: () => { dueDismissed = true; render(); },
  sample: () => { const f=$('#saveform'); f.url.value='https://www.youtube.com/watch?v=sample-prototype'; f.elements.namedItem('title').value='주말에 만들어볼 토마토 파스타 레시피'; f.type.value='ai'; f.collection.value='일상에 영감'; f.memo.value='토요일 점심에 만들어보기'; },
  original: () => { const x=items.find(x=>x.id===detailId); const url=x.url&&!x.sample?x.url:null;
    modal('원본 콘텐츠 보기',url?`<p>저장한 링크를 새 탭에서 엽니다.</p><div class="dialogactions"><a class="filled" target="_blank" rel="noopener noreferrer" href="${esc(url)}">원본 열기 ${icon('external')}</a></div>`:`<p>‘${esc(x.title)}’은 체험용 콘텐츠입니다.</p><p class="muted">실제 서비스에서는 이 단계에서 저장한 ${esc(x.source)} 게시물로 이동합니다.</p><div class="dialogactions"><button class="filled" data-action="close">확인</button></div>`); }
};
function action(a){ (actions[a]||(()=>{}))(); }

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-page],[data-detail],[data-filter],[data-action],[data-collection],[data-pin],[data-libfilter],[data-libquery]');
  if(!b)return;
  const d=b.dataset;
  if(d.page){e.preventDefault();go(d.page);}
  else if(d.detail){openDetail(Number(d.detail));}
  else if(d.filter){filter=d.filter;render();}
  else if(d.collection){page='library';detailId=null;collection=d.collection;filter='전체';query='';render();window.scrollTo(0,0);}
  else if(d.pin){selectedPin=Number(d.pin);render();}
  else if(d.libfilter||d.libquery){page='library';detailId=null;collection=null;filter=d.libfilter||'전체';query=d.libquery||'';render();window.scrollTo(0,0);}
  else action(d.action);
});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#results').innerHTML=resultCards();$('#resultcount').textContent=filtered().length+'개의 콘텐츠'}});
document.addEventListener('submit',e=>{
  if(e.target.id==='saveform'){
    e.preventDefault();const f=e.target;let u;
    try{u=new URL(f.url.value);if(!['https:','http:'].includes(u.protocol))throw Error()}catch{$('#saveerror').textContent='http 또는 https 링크를 입력해 주세요.';return}
    const title=f.elements.namedItem('title').value.trim(), ai=!PM_ENV.development&&f.type.value==='ai', type=ai?guessType(title+' '+u.href):f.type.value, sample=!PM_ENV.development&&f.url.value.includes('sample-prototype');
    const x={id:Date.now(),title,type,category:shortType(type),source:sample?'YouTube':u.hostname.replace(/^www\./,''),ago:'방금',desc:PM_ENV.development?'':'새롭게 담아둔 나의 취향',memo:f.memo.value,art:typeOf(type).art,collection:f.collection.value,url:u.href,sample,aiClassified:ai};
    if(typeOf(type).place)x.pending=true;
    items.unshift(x);afterChange();$('#sheet').close();page='library';openDetail(x.id);
    toast(ai?`저장했어요. AI가 ‘${type}’로 분류했어요.`:'저장했어요. 필요할 때 다시 꺼내보세요.');
  } else if(e.target.id==='editform'){
    e.preventDefault();const data=new FormData(e.target),x=items.find(x=>x.id===detailId);
    const type=String(data.get('type'));
    if(type!==x.type){x.aiClassified=false;x.category=shortType(type);x.art=x.art||typeOf(type).art;}
    x.type=type;
    for(const k of ['title','address','memo','collection']) x[k]=String(data.get(k)||'').trim();
    x.pending=isPlace(x)&&!x.address; if(x.address)x.mapQuery=x.mapQuery||x.address;
    $('#sheet').close();render();toast('저장 정보를 수정했어요.');afterChange();
  }
});
$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});

// 브라우저가 WebMCP를 지원하면 같은 검색 동작을 노출합니다.
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'search_saved_content',description:'Search the prototype saved collection and show matching cards. Does not save or modify records.',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input.query!=='string')throw new Error('query must be a string');page='library';detailId=null;collection=null;filter='전체';query=input.query;render();return {count:filtered().length,items:filtered().map(x=>({id:x.id,title:x.title,type:x.type}))}}})).catch(()=>{})}catch{}}
