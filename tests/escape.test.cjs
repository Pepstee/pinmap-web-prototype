// Guard for the app's XSS discipline: every template interpolation of a
// user-controllable item field must go through esc()/safe(), or sit on the
// allowlist below with a justification. Each entry was line-checked 2026-10-28.
// Add nothing new here without escaping at render — prefer `${esc(x.field)}`.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

const FILES=['app.js','library.js','collection.js','detail.js','home.js','pinmap.js','share.js','my.js','course.js','map-live.js','map.js','place.js','noti.js','mypages.js','mysub.js','calendar.js','push.js','login.js','coach.js','icons.js','navlabels.js','integration.js','development.js','style-health.js'];
const FIELDS=['title','memo','collection','address','desc','url','source','category','period','ago','image'];

// file + field → why the raw interpolation is safe
const ALLOWED=new Map([
  // counts and predicates — numbers/booleans, not field values
  ['app.js address','map-app URL passed through encodeURIComponent() before entering href (app.js:145)'],
  ['app.js collection','count predicate: `${items.filter(x=>x.collection===n).length}` renders a number'],
  ['library.js collection','count predicate, renders a number'],
  ['collection.js collection','boolean aria-checked / esc\'ed tail on the same line'],
  ['detail.js collection','boolean class/aria state; colChip() escapes text internally'],
  // transformed values that are escaped at render time
  ['library.js ago','meta-line parts array, joined through esc() at render (library.js libMeta)'],
  ['library.js title','toast text — toast() writes textContent, not innerHTML'],
  ['my.js title','notification object rendered via esc(n.title) in my.js:31'],
  ['my.js period','notification body rendered via esc(n.body) in my.js:31'],
  ['detail.js ago','facts array rendered through esc(v) at detail.js:43'],
  ['detail.js desc','ternary condition only; the value itself renders through esc()'],
  ['detail.js address','toast text — toast() writes textContent'],
  ['collection.js title','regex source in cfIsCafe(), not HTML output'],
  ['collection.js category','regex source in cfIsCafe(), not HTML output'],
  // TEMPORARY: fixed by "Escape the search result image URL attribute" (PR #39);
  // remove this line once #39 is merged
  ['map-live.js image','src attribute — fix pending in PR #39'],
]);

function scan(){
  const found=[];
  for(const file of FILES){
    if(!fs.existsSync(file))continue;
    read(file).split('\n').forEach((line,i)=>{
      const re=/\$\{([^}]+)\}/g;let m;
      while((m=re.exec(line))){
        const expr=m[1];
        const field=FIELDS.find(f=>new RegExp(`\\b(?:x|it|item|c|p)\\.${f}\\b`).test(expr));
        if(!field)continue;
        if(/^(esc|safe)\(/.test(expr.trim()))continue;
        found.push(`${file} ${field}`);
      }
    });
  }
  return [...new Set(found)].sort();
}

test('every user-field interpolation is escaped or on the reviewed allowlist',()=>{
  const unexpected=scan().filter(entry=>!ALLOWED.has(entry));
  assert.deepEqual(unexpected,[],
    'unescaped user-field interpolations found — wrap in esc()/safe(), or add a reviewed allowlist entry only if the value is escaped at render time');
});

test('allowlist entries are all still in use (prune stale ones)',()=>{
  const live=new Set(scan());
  const stale=[...ALLOWED.keys()].filter(entry=>!live.has(entry));
  assert.deepEqual(stale,[],'these usages are gone from the source — prune their allowlist entries');
});
