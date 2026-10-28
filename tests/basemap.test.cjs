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
  assert.match(received.style,/^map-style\.json\?v=/);
  assert.equal(received.interactive,false);
  for(const source of ['OpenFreeMap','OpenMapTiles','OpenStreetMap'])assert(received.attributionControl.customAttribution.includes(source));
  assert.equal(host.dataset.basemap,'warm-minimal');
  assert.equal(host.dataset.basemapReady,undefined);
  events.load();assert.equal(host.dataset.basemapReady,'true');
});

test('warm map style is valid, simplifies background detail and retains orientation labels',()=>{
  const style=JSON.parse(fs.readFileSync('map-style.json','utf8'));
  assert.equal(style.version,8);
  assert.equal(style.sources.openmaptiles.url,'https://tiles.openfreemap.org/planet');
  const byId=Object.fromEntries(style.layers.map(layer=>[layer.id,layer]));
  assert.equal(byId.background.paint['background-color'],'#F6F2E9');
  for(const id of ['highway-name-minor','highway-name-path','highway-shield-non-us'])assert.equal(byId[id].layout.visibility,'none');
  for(const id of ['highway-name-major','label_city','water_name_line_label'])assert.notEqual(byId[id].layout.visibility,'none');
  const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync('map-style.json')).digest('hex').slice(0,12);
  assert(fs.readFileSync('integration.js','utf8').includes('map-style.json?v='+hash));
});
