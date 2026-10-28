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
  // SVG backdrop displacement is a Chromium enhancement. WebKit and Gecko use
  // the clear CSS material because SVG backdrop filters are not interoperable.
  const refractsBackdrop=/\b(?:Chrome|Chromium|Edg)\//.test(window.navigator?.userAgent||'')&&window.CSS?.supports('backdrop-filter','url("#pm-nav-refraction")');
  // Encoded 264 x 54 capsule normal map: neutral center, inward rim displacement.
  // It bends the backdrop only; icons, hit areas and the dock never change size.
  const navOptics=refractsBackdrop?`<svg class="pm-nav-optics" aria-hidden="true" focusable="false" width="0" height="0"><defs><filter id="pm-nav-refraction" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="data:image/png;base64,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" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="rim"/><feDisplacementMap in="SourceGraphic" in2="rim" scale="12" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`:'';
  let lastNavIndex=null;
  function slideNav(index){
    // Wait for the new page to paint before moving the highlight. Map mounting can
    // otherwise finish the animation before the dock becomes visible.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const dock=document.querySelector('.bottomnav .pm-nav-main');
      if(dock?.dataset.navTarget!==String(index))return;
      dock.style.setProperty('--nav-position',`${index*100}%`);
      dock.style.setProperty('--nav-light',`${(index+.5)*25}%`);
    }));
  }
  nav=function(){
    const current=(typeof PARENT_TAB!=='undefined'&&PARENT_TAB[page])||page;
    const activePage=['course','courses'].includes(current)?'map':current;
    const index=Math.max(0,['home','map','library','my'].indexOf(activePage));
    const from=matchMedia('(prefers-reduced-motion: reduce)').matches?index:lastNavIndex??index;
    queueMicrotask(()=>{lastNavIndex=index;});
    if(from!==index)slideNav(index);
    const entry=(p,label)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${p==='my'?avatarHtml('pm-nav-avatar'):solid(p==='library'?'bookmark':p)}</span></button>`};
    return `${navOptics}<span class="pm-nav-main" data-refraction="${refractsBackdrop}" data-nav-target="${index}" style="--nav-position:${from*100}%;--nav-light:${(from+.5)*25}%"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈')}${entry('map','지도')}${entry('library','저장함')}${entry('my','마이')}</span>`;
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
