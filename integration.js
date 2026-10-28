/* Integration layer: keep collection/detail implementations untouched. */
(() => {
  const silhouettes={
    home:'M12 2 1 11h3v11h6v-7h4v7h6V11h3Z',
    map:'M2 5 8 2v17l-6 3Zm8-3 5 3v17l-5-3Zm7 3 5-3v17l-5 3Z',
    bookmark:'M6 2h12a1 1 0 0 1 1 1v20l-7-5-7 5V3a1 1 0 0 1 1-1Z',
    plus:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7Z',
    folderplus:'M2 5a2 2 0 0 1 2-2h5l3 3h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Zm9 5v3H8v2h3v3h2v-3h3v-2h-3v-3Z'
  };
  const solid=name=>`<svg class="pm-solid" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${silhouettes[name]}"></path></svg>`;
  let lastNavIndex=null;
  nav=function(){
    const current=(typeof PARENT_TAB!=='undefined'&&PARENT_TAB[page])||page;
    const activePage=['course','courses'].includes(current)?'map':current;
    const index=Math.max(0,['home','map','library','my'].indexOf(activePage));
    const from=lastNavIndex??index;
    queueMicrotask(()=>{lastNavIndex=index;});
    const entry=(p,label)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${p==='my'?avatarHtml('pm-nav-avatar'):solid(p==='library'?'bookmark':p)}</span><span>${label}</span></button>`};
    return `<span class="pm-nav-main${from===index?'':' is-sliding'}" style="--nav-from:${from*100}%;--nav-to:${index*100}%"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈')}${entry('map','지도')}${entry('library','저장함')}${entry('my','마이')}</span>`;
  };
  // Keep the loaded basemap in the same moving pane as the markers.
  const attachFallbackBasemap=map=>{
    let current=null,pending=null,timer,disposed=false;
    function position(view){
      const scale=map.getZoomScale(map.getZoom(),view.zoom);
      const point=map.latLngToLayerPoint(view.nw);
      view.el.style.transform=`translate3d(${point.x}px,${point.y}px,0) scale(${scale})`;
    }
    function load(){
      if(disposed)return;
      // Reuse the overscanned map while swiping nearby places.
      const covers=view=>view&&view.zoom===map.getZoom()&&view.bounds.contains(map.getBounds());
      if(covers(pending))return;
      if(covers(current)){pending?.el.remove();pending=null;return;}
      if(pending)pending.el.remove();
      const size=map.getSize().add([320,320]),zoom=map.getZoom();
      const center=map.project(map.getCenter(),zoom),half=size.divideBy(2);
      const nw=map.unproject(center.subtract(half),zoom),se=map.unproject(center.add(half),zoom);
      const el=document.createElement('div');el.className='pm-basemap-layer';
      Object.assign(el.style,{width:size.x+'px',height:size.y+'px',opacity:'0'});
      const frame=document.createElement('iframe');frame.title='지도';frame.tabIndex=-1;
      const bounds=L.latLngBounds(map.unproject(center.subtract(half.multiplyBy(.99)),zoom),map.unproject(center.add(half.multiplyBy(.99)),zoom));
      frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].join('%2C')+'&layer=mapnik';
      el.append(frame);map.getPane('tilePane').append(el);
      const view={el,nw,zoom,bounds};pending=view;position(view);
      frame.onload=()=>{if(disposed||pending!==view)return;position(view);el.style.opacity='1';current?.el.remove();current=view;pending=null;};
    }
    const sync=()=>{if(current)position(current);if(pending)position(pending);};
    map.on('zoom viewreset',sync);
    map.on('moveend resize',()=>{clearTimeout(timer);timer=setTimeout(load,100);});
    map.on('unload',()=>{disposed=true;clearTimeout(timer);current?.el.remove();pending?.el.remove();});
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    load();
  };
  // Share one vector basemap across the place map, course editor and previews.
  window.attachPinmapBasemap=map=>{
    const host=map.getContainer();
    try {
      const layer=L.maplibreGL({
        style:'map-style.json?v=47c49842960b',
        interactive:false,
        attributionControl:{customAttribution:'<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · 출구 © <a href="https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0" target="_blank" rel="noopener">행정안전부·Esri Korea</a>'}
      }).addTo(map);
      host.dataset.basemap='warm-minimal';
      layer.getMaplibreMap().on('load',()=>{host.dataset.basemapReady='true';});
      return layer;
    } catch(error) {
      // Keep maps usable on devices without WebGL support.
      host.dataset.basemap='osm-fallback';
      return attachFallbackBasemap(map);
    }
  };
})();
