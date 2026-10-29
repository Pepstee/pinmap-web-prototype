// Tests for place-find.js — the dev-mode Photon place finder.
// The file splits into a pure logic section and a UI section at the
// '/* ---------- UI' marker, so the tests run only the pure part (their
// environment.test.cjs uses the same split style).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');

function loadPure(){
  const pure=read('place-find.js').split('/* ---------- UI')[0];
  const context=vm.createContext({encodeURIComponent, console});
  vm.runInContext(pure,context);
  return context;
}
const value=(context,expr)=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));

test('strips site suffixes from page titles before searching',()=>{
  const c=loadPure();
  assert.equal(value(c,'pfCleanQuery("성수동 - 위키백과, 우리 모두의 백과사전")'),'성수동');
  assert.equal(value(c,'pfCleanQuery("Rick Astley – Official Video")'),'Rick Astley');
  assert.equal(value(c,'pfCleanQuery("맛집 | 리뷰")'),'맛집');
  assert.equal(value(c,'pfCleanQuery("성수동 카페")'),'성수동 카페');
  assert.equal(value(c,'pfCleanQuery("")'),'');
  assert.equal(value(c,'pfCleanQuery(null)'),'');
});

test('keeps Photon relevance order and maps fields faithfully',()=>{
  const c=loadPure();
  const json={features:[
    {geometry:{coordinates:[127.044,37.544]},properties:{osm_id:1,name:'성수동1가',city:'서울특별시',state:'서울'}},
    {geometry:{coordinates:[127.045,37.545]},properties:{osm_id:2,name:'성수동2가',city:'서울특별시',state:'서울'}},
    {geometry:{coordinates:[126.9,35.1]},properties:{osm_id:3,name:'성수동',city:'광주'}},
  ]};
  const r=value(c,'pfParsePhoton('+JSON.stringify(json)+', "성수동")');
  assert.equal(r.length,3);
  assert.deepEqual(r.map(x=>x.name),['성수동1가','성수동2가','성수동']);   // Photon order preserved
  assert.equal(r[0].lat,37.544);
  assert.equal(r[0].lng,127.044);
  assert.equal(r[0].osm_id,1);
  assert.equal(r[0].address.includes('서울특별시'),true);
});

test('drops features without coordinates and tolerates missing names',()=>{
  const c=loadPure();
  const json={features:[
    {properties:{osm_id:9,name:'좌표 없음'}},
    {geometry:{coordinates:[127.0,37.5]},properties:{osm_id:8}},
  ]};
  const r=value(c,'pfParsePhoton('+JSON.stringify(json)+', "성수동")');
  assert.equal(r.length,1);
  assert.equal(r[0].name,'성수동');           // falls back to the query
  assert.equal(r[0].address,'');
});

test('non-array or empty payloads yield no candidates',()=>{
  const c=loadPure();
  assert.deepEqual(value(c,'pfParsePhoton(null, "성수동")'),[]);
  assert.deepEqual(value(c,'pfParsePhoton({}, "성수동")'),[]);
  assert.deepEqual(value(c,'pfParsePhoton({features:[]}, "성수동")'),[]);
});

test('findPlaces queries Photon with the cleaned title and首尔 bias',async()=>{
  const c=loadPure();
  let seen=null;
  c.fetch=async url=>{
    seen=String(url);
    return {ok:true,json:async()=>({features:[{geometry:{coordinates:[127.05,37.54]},properties:{osm_id:1,name:'서울숲'}}]})};
  };
  const r=await vm.runInContext('pfFindPlaces("성수동 - 위키백과")',c);
  assert.equal(r.ok,true);
  assert.equal(r.candidates[0].name,'서울숲');
  assert.match(seen,/q=%EC%84%B1%EC%88%98%EB%8F%99/);           // cleaned query, encoded
  assert.match(seen,/lat=37\.5445&lon=127\.043/);               // default bias
});

test('short queries are refused before any network call',async()=>{
  const c=loadPure();
  let called=false;
  c.fetch=async()=>{called=true;};
  const r=await vm.runInContext('pfFindPlaces("성")',c);
  assert.equal(r.ok,false);
  assert.equal(r.error,'short_query');
  assert.equal(called,false);
});

test('network failures degrade to unreachable, aborts to aborted',async()=>{
  const c=loadPure();
  c.fetch=async()=>{const e=new Error('x');e.name='AbortError';throw e;};
  assert.equal((await vm.runInContext('pfFindPlaces("성수동")',c)).error,'aborted');
  c.fetch=async()=>{throw new Error('boom');};
  assert.equal((await vm.runInContext('pfFindPlaces("성수동")',c)).error,'unreachable');
  c.fetch=async()=>({ok:false});
  assert.equal((await vm.runInContext('pfFindPlaces("성수동")',c)).error,'unreachable');
});
