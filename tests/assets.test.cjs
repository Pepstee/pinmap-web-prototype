const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
test('every local CSS/JS asset uses its current content version',()=>{
  for(const page of ['app.html','index.html','entry.html']) {
    const html=fs.readFileSync(page,'utf8');
    const assets=[...html.matchAll(/(?:href|src)="([^"?]+\.(?:css|js))(?:\?v=([^"?]+))?"/g)];
    assert(assets.length,page);
    for(const [,name,version] of assets) {
      assert(fs.existsSync(name),'Missing asset: '+name);
      const hash=crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex').slice(0,12);
      assert.equal(version,hash,'Stale asset version: '+name);
    }
  }
});
test('a failed stylesheet is retried once and marked ready only after it loads',()=>{
  const vm=require('node:vm');
  const callbacks={},dataset={};let load;
  const good={href:'http://localhost/style.css?v=good',sheet:{cssRules:[{}]},getAttribute(){return this.href;}};
  const failed={href:'http://localhost/home.css?v=bad',sheet:null,getAttribute(){return this.href;},addEventListener:(name,fn)=>callbacks[name]=fn};
  vm.runInNewContext(fs.readFileSync('style-health.js','utf8'),{URL,Date,window:{addEventListener:(name,fn)=>load=fn},document:{querySelectorAll:()=>[good,failed],documentElement:{dataset}}});
  load();assert.equal(dataset.pmStylesReady,'false');
  assert(new URL(failed.href).searchParams.has('retry'));
  assert.equal(good.href,'http://localhost/style.css?v=good');
  failed.sheet={cssRules:[{}]};callbacks.load();assert.equal(dataset.pmStylesReady,'true');
});
