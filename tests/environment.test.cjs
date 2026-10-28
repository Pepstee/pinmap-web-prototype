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
test('development ignores prototype and legacy data, and writes only its own key',()=>{
  const payload=JSON.stringify({items:[{id:1,title:'Existing prototype content',type:'기타'}],settings:{nickname:'Prototype user',calSeeded:true}});
  const app=boot('development',{'pinmap.v3':payload,'pinmap.v2':payload});
  assert.equal(app.value('items.length'),0);
  vm.runInContext("items.push({id:9001,title:'User-entered link',type:'기타',url:'https://www.openstreetmap.org/about'});persist();",app.context);
  assert.equal(app.stored.get('pinmap.v3'),payload);
  assert.equal(app.stored.get('pinmap.v2'),payload);
  const reload=boot('development',Object.fromEntries(app.stored));
  assert.equal(reload.value('items.length'),1);
  assert.equal(reload.value('items[0].title'),'User-entered link');
  const prototype=boot('prototype',Object.fromEntries(app.stored));
  assert.equal(prototype.value('items[0].title'),'Existing prototype content');
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
