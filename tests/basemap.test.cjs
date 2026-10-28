const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('shared Positron layer keeps Leaflet controls, credit and load status without an API key',()=>{
  const host={dataset:{}},events={};let received,addedTo;
  const layer={addTo(map){addedTo=map;return this},getMaplibreMap(){return {on(name,fn){events[name]=fn}}}};
  const context={window:{},L:{maplibreGL(options){received=options;return layer}}};
  vm.runInNewContext(fs.readFileSync('integration.js','utf8'),context);
  const map={getContainer:()=>host};
  assert.equal(context.window.attachPinmapBasemap(map),layer);
  assert.equal(addedTo,map);
  assert.equal(received.style,'https://tiles.openfreemap.org/styles/positron');
  assert.equal(received.interactive,false);
  for(const source of ['OpenFreeMap','OpenMapTiles','OpenStreetMap'])assert(received.attributionControl.customAttribution.includes(source));
  assert.equal(host.dataset.basemap,'positron');
  assert.equal(host.dataset.basemapReady,undefined);
  events.load();assert.equal(host.dataset.basemapReady,'true');
});
