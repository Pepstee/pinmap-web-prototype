// Retry failed styles once and expose their status for visual verification.
(() => {
  const links=[...document.querySelectorAll('link[rel="stylesheet"]')];
  function inspect(){
    const report=links.map(link=>{let rules=0;try{rules=link.sheet?.cssRules.length||0;}catch{return {href:link.getAttribute('href'),loaded:!!link.sheet};}return {href:link.getAttribute('href'),loaded:rules>0};});
    document.documentElement.dataset.pmStylesReady=String(report.every(sheet=>sheet.loaded));
    document.documentElement.dataset.pmStyleReport=JSON.stringify(report);
    return report;
  }
  window.addEventListener('load',()=>{
    const report=inspect();
    report.forEach((sheet,index)=>{
      if(sheet.loaded)return;
      const link=links[index],url=new URL(link.href);
      url.searchParams.set('retry',Date.now());
      link.addEventListener('load',inspect,{once:true});
      link.addEventListener('error',inspect,{once:true});
      link.href=url.href;
    });
  },{once:true});
})();
