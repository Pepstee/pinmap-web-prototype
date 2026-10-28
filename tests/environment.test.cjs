const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');
function boot(mode,entries={}) {
  const stored=new Map(Object.entries(entries));
  const context=vm.createContext({location:{search:mode?'?mode='+mode:''},URLSearchParams,encodeURIComponent,NAV:[],pageName:{},localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},console});
  vm.runInContext(read('environment.js'),context);
  vm.runInContext(read('app.js').split('/* ---------- 일러스트')[0],context);
  vm.runInContext(read('pinmap.js').split('/* ---------- 관심사 기반 홈')[0],context);
  vm.runInContext(read('calendar.js').split('/* ---------- 날짜 계산')[0],context);
  return {context,stored,value:expr=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context))};
}
test('development starts with no seeded content, profile, accounts or places',()=>{
  const app=boot('development');
  assert.equal(app.value('items.length'),0);
  assert.deepEqual(app.value('COLLECTIONS'),[]);
  assert.equal(app.value('settings.nickname'),'');
  assert.deepEqual(app.value('settings.places'),[]);
  assert.deepEqual(app.value('settings.accounts'),[]);
  assert.equal(app.value('STORAGE'),'pinmap.dev.v1');
});
test('prototype retains the 13 seeded items and original default profile',()=>{
  const app=boot('prototype');
  assert.equal(app.value('items.length'),13);
  assert.equal(app.value('settings.nickname'),'서연');
  assert.equal(app.value('COLLECTIONS.length'),3);
  assert.equal(app.value('STORAGE'),'pinmap.v3');
});
test('initial development screens ignore stored data without changing or deleting any saved records',()=>{
  const payload=JSON.stringify({items:[{id:1,title:'Existing content',type:'기타'}],settings:{nickname:'Existing user',calSeeded:true}});
  const entries={'pinmap.v3':payload,'pinmap.v2':payload,'pinmap.dev.v1':payload};
  const app=boot('development',entries);
  assert.equal(app.value('items.length'),0);
  assert.equal(app.value('settings.nickname'),'');
  vm.runInContext("items.push({id:9001,title:'In-memory draft',type:'기타'});persist();",app.context);
  for(const [key,value] of Object.entries(entries))assert.equal(app.stored.get(key),value);
  const reload=boot('development',Object.fromEntries(app.stored));
  assert.equal(reload.value('items.length'),0);
  const prototype=boot('prototype',Object.fromEntries(app.stored));
  assert.equal(prototype.value('items[0].title'),'Existing content');
});
test('sample pools, map coordinates, photos and neighborhoods are absent in development',()=>{
  const {context,value}=boot('development');
  for(const [file,expression] of [
    ['mysub.js',/const SYNC_POOL = ([\s\S]*?\n\});/],
    ['map-live.js',/const savedCoords = ([\s\S]*?\n  \]);/],
    ['library.js',/const LIB_PHOTOS_BY_ID = ([\s\S]*?\n\});/],
    ['place.js',/const DONGS = ([\s\S]*?);\nconst dongOf/],
    ['share.js',/const demoPost = ([\s\S]*?\n\});/]
  ]) {
    const match=read(file).match(expression);assert(match,file);
    const data=vm.runInContext('('+match[1]+')',context);
    assert(data===null||Object.keys(data).length===0,file);
  }
  assert.equal(value('LEGACY_KEYS.length'),0);
  assert(read('course.js').includes("'pinmap.dev.courses.v1'"));
  assert(read('course.js').includes('else if(!PM_ENV.development)'));
});
function route(search, navigationType='navigate') {
  const frame={src:'app.html?mode=prototype'},replacements=[];
  vm.runInNewContext(read('entry-router.js'),{
    location:{search,pathname:'/index.html',hash:''},
    performance:{getEntriesByType:()=>[{type:navigationType}]},
    history:{replaceState:(state,title,url)=>replacements.push(url)},
    URLSearchParams,document:{querySelector:()=>frame}
  });
  return {src:frame.src,replacements};
}
test('explicit choices enter the selected app once and remove the mode from the top URL',()=>{
  for(const mode of ['development','prototype']) {
    const result=route('?mode='+mode);
    assert.equal(result.src,'app.html?mode='+mode);
    assert.deepEqual(result.replacements,['/index.html']);
  }
  assert.equal(route('').src,'entry.html');
  assert.equal(route('?mode=invalid').src,'entry.html');
});
test('refresh always returns to version selection, including old links with a mode parameter',()=>{
  for(const query of ['', '?mode=development','?mode=prototype']) {
    assert.equal(route(query,'reload').src,'entry.html');
  }
  const first=route('?mode=development&v=review');
  assert.equal(first.src,'app.html?mode=development');
  assert.deepEqual(first.replacements,['/index.html?v=review']);
  assert.equal(route('?v=review','reload').src,'entry.html');
});

test('disconnected development keeps the existing page layouts and blocks data creation',()=>{
  const home=()=>'<main class="main">existing empty home</main>';
  const account=()=>'<section class="mycard settings">existing account controls</section>';
  const listeners={};let message='';
  const context=vm.createContext({
    PM_ENV:{development:true},startCoach(){},notifications(){return ['sample'];},unreadCount(){return 1;},
    pages:{home,account,my:()=>'<b></b><small>프로필 편집</small>',accounts:()=>'<section class="mgroup">연동된 계정 0개</section>',appinfo:()=>'<div class="mycard settings">버전</div>'},
    actions:{},mapSettings(){},render(){},$:()=>null,
    toast:text=>message=text,
    document:{body:{classList:{add(){}}},addEventListener:(type,handler)=>listeners[type]=handler}
  });
  vm.runInContext(read('development.js'),context);
  assert.equal(context.pages.home,home);
  assert.equal(context.pages.account,account);
  assert.deepEqual(Array.from(context.notifications()),[]);
  assert(!context.pages.accounts().includes('dev-panel'));
  let prevented=false,stopped=false;
  listeners.submit({target:{id:'saveform'},preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
  assert(prevented&&stopped);
  assert.equal(message,'아직 데이터가 연결되지 않았어요.');
});

test('disconnected map controls do not request location or fetch external places',async()=>{
  const source=read('map-live.js');
  let messages=[],networkCalls=0;
  const context=vm.createContext({PM_ENV:{development:true},toast:text=>messages.push(text),fetch:()=>{networkCalls++;throw Error('Unexpected network');},navigator:{get geolocation(){throw Error('Unexpected geolocation');}}});
  const locate=source.slice(source.indexOf('  function locate()'),source.indexOf('  function showResults()'));
  const search=source.slice(source.indexOf('  async function searchPlaces('),source.indexOf("  document.addEventListener('click',event =>"));
  vm.runInContext(locate,context);vm.runInContext(search,context);
  vm.runInContext('locate()',context);
  await vm.runInContext("searchPlaces('서울숲')",context);
  assert.equal(networkCalls,0);
  assert.equal(messages.length,2);
  assert(messages.every(text=>text.includes('연결되지')));
});

test('empty home shows the existing card layout as placeholders without real content or actions',()=>{
  const source=read('home.js'),start=source.indexOf('pages.home = function(){'),end=source.indexOf('\n};',start)+3;
  const placeholderStart=source.indexOf('function emptyPickCards(){'),placeholderEnd=source.indexOf('\n/* ---------- 캘린더',placeholderStart);
  const html=vm.runInNewContext(source.slice(placeholderStart,placeholderEnd)+source.slice(start,end)+';pages.home();',{
    PM_ENV:{development:true},pages:{},preferences:[],interestOptions:[],homePicks:()=>[],
    stripBar:()=>'',calWidget:()=>'<section id="calendar"></section>',subWidgets:()=>'',PM_IMG:{logo:'logo.png'}
  });
  assert(html.includes('class="mainpick" data-placeholder="true" aria-hidden="true"'));
  assert.equal((html.match(/class="pick pick-placeholder"/g)||[]).length,3);
  for(const slot of ['pickimg','pickword','picktext','pickdots'])assert(html.includes('class="'+slot+'"'));
  assert(!html.includes('data-detail='));
  assert(!html.includes('data-action="save"'));
  assert(!html.includes('선택한 관심사에 맞는 저장 콘텐츠가 아직 없어요.'));
  assert(html.indexOf('mainpick')<html.indexOf('id="calendar"'));
});
