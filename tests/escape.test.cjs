// Guard known item-field interpolations. This is a source-level regression
// check, not a complete XSS audit: review every new HTML sink separately.
// Prefer `${esc(x.field)}` or `${safe(x.field)}` for rendered values.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const read=file=>fs.readFileSync(file,'utf8');

// Scan every root-level script automatically, so a screen file added later is
// covered without touching this test (vendor/ lives in a subfolder and is not matched).
const FILES=fs.readdirSync('.').filter(f=>f.endsWith('.js') && !f.includes('/'));
const FIELDS=['title','memo','collection','address','desc','url','source','category','period','ago','image'];

// Each exception is tied to the exact reviewed source line. A new interpolation
// in the same file and field has a different line hash and must be reviewed.
// Hashing the whole line also catches new raw output appended to that line.
const ALLOWED=new Map([
  // counts and predicates — numbers/booleans, not field values
  ['app.js address 542fabeecaa5','map-app URL is constructed with encodeURIComponent'],
  ['app.js collection 100174a49790','count predicate renders a number'],
  ['library.js collection f455917b56a6','count predicate renders a number'],
  ['collection.js collection 22d2a02a7127','checked state renders a fixed string'],
  ['collection.js collection bcc6639fa2e0','condition only; collection text is escaped in the nested template'],
  ['detail.js collection 4d6ba10d472f','class and aria state render fixed strings'],
  ['detail.js collection 4244da040e1f','colChip escapes the collection text internally'],
  // transformed values that are escaped at render time
  ['library.js ago 73170870aafe','meta parts are escaped when rendered'],
  ['library.js title 278f1e10795f','toast writes textContent'],
  ['my.js title 0693840f8b9d','notification text is escaped when rendered'],
  ['my.js period dc6f68dc79ea','notification body is escaped when rendered'],
  ['detail.js ago f9477af421eb','facts are escaped when rendered'],
  ['detail.js desc c2284849e17a','condition only; description is escaped when rendered'],
  ['detail.js address 80d05f3cdda3','toast writes textContent'],
  ['place-find.js address d77722ddefbe','confirmation writes textContent, not innerHTML'],
  ['collection.js title 75a5731d4d77','regex source, not HTML output'],
  ['collection.js category 75a5731d4d77','regex source, not HTML output'],
]);

const lineHash=line=>crypto.createHash('sha256').update(line.trim()).digest('hex').slice(0,12);
function scanSource(file,source){
  const found=[];
  source.split('\n').forEach((line,i)=>{
    const re=/\$\{([^}]+)\}/g;let m;
    while((m=re.exec(line))){
      const expr=m[1];
      const field=FIELDS.find(f=>new RegExp(`\\b(?:x|it|item|c|p)\\.${f}\\b`).test(expr));
      if(!field || /^(esc|safe)\(/.test(expr.trim()))continue;
      found.push({key:`${file} ${field} ${lineHash(line)}`,line:i+1,expr});
    }
  });
  return found;
}
function scan(){return FILES.flatMap(file=>scanSource(file,read(file)));}

test('known user-field interpolations are escaped or exactly reviewed',()=>{
  const unexpected=scan().filter(entry=>!ALLOWED.has(entry.key));
  assert.deepEqual(unexpected,[],
    'unescaped item-field interpolation found — escape it, or review the exact source line');
});

test('allowlist entries are all still in use (prune stale ones)',()=>{
  const live=new Set(scan().map(entry=>entry.key));
  const stale=[...ALLOWED.keys()].filter(entry=>!live.has(entry));
  assert.deepEqual(stale,[],'these usages are gone from the source — prune their allowlist entries');
});

test('a new raw interpolation is not covered by an older exception in the same file',()=>{
  const added=scanSource('library.js','function unsafe(x){return `<div>${x.title}</div>`;}');
  assert.equal(added.length,1);
  assert.equal(ALLOWED.has(added[0].key),false);
});
