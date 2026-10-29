// Core product flow tests: save a link → item created → persisted → edited.
// Drives the REAL submit handlers registered by app.js inside a vm context —
// the same harness style as course.test.cjs / environment.test.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

// A FormData stand-in the handlers can construct from a fake form object.
class FakeFormData{
  constructor(form){ this.__data = form && form.__data ? form.__data : {}; }
  get(key){ return this.__data[key] ?? null; }
}

function boot(seed = {}, development = false){
  const storage = new Map(Object.entries(seed));
  const listeners = {};
  const sheet = { closed: 0, addEventListener() {}, close(){ this.closed++; } };
  const context = vm.createContext({
    URL, FormData: FakeFormData, encodeURIComponent, console,
    URLSearchParams, location: { search: development ? '?mode=development' : '' },
    setTimeout, clearTimeout,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    document: {
      addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
      querySelector: (() => {
        const els = {};                                   // stable per-selector elements, so written text is readable
        return selector => selector === '#sheet' ? sheet
          : (els[selector] ??= { textContent: '', innerHTML: '', value: '', addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } });
      })(),
      querySelectorAll: () => []
    },
    window: { addEventListener() {}, scrollY: 0, scrollTo() {} },
    openDetail: id => { context.openedDetail = id; },
    requestAnimationFrame: fn => fn(), cancelAnimationFrame() {},
    render() {}, go() {}, afterChange() {}
  });
  vm.runInContext(read('environment.js'), context);
  vm.runInContext(read('app.js'), context);
  vm.runInContext(read('pinmap.js').split('/* ---------- 관심사 기반 홈')[0], context);
  return {
    context, storage, sheet,
    value: expr => JSON.parse(vm.runInContext('JSON.stringify(' + expr + ')', context)),
    async submit(formId, form) {
      const event = { preventDefault() {}, target: Object.assign({ id: formId }, form) };
      for (const fn of listeners.submit ?? []) await fn(event);
    }
  };
}

const LINK_FORM = {
  __data: {},
  url: { value: 'https://ko.wikipedia.org/wiki/성수동' },
  type: { value: '맛집·카페' },
  memo: { value: '주말에 가보기' },
  collection: { value: '이번 주말 성수' },
  elements: { namedItem: name => ({ value: '내가 저장한 제목' }) }
};

test('saving a link creates a place item, persists it and opens the detail', async () => {
  const app = boot();
  assert.equal(app.value('items.length'), 11);
  await app.submit('saveform', LINK_FORM);
  const item = app.value('items[0]');
  assert.equal(item.title, '내가 저장한 제목');
  assert.equal(item.type, '맛집·카페');
  assert.equal(item.url, new URL('https://ko.wikipedia.org/wiki/성수동').href);  // WHATWG normalises the path
  assert.equal(item.collection, '이번 주말 성수');
  assert.equal(item.pending, true);                     // place items start as 장소 확인 필요
  assert.equal(item.sample, false);
  assert.equal(app.value('items.length'), 12);
  assert.equal(app.value('detailId'), item.id);        // detail opens for the new item
  assert.equal(app.sheet.closed, 1);                    // the save dialog closed
  const stored = JSON.parse(app.storage.get('pinmap.v3'));
  assert.equal(stored.items[0].url, new URL('https://ko.wikipedia.org/wiki/성수동').href);  // afterChange() → persist()
});

test('invalid link URLs are rejected with a hint and nothing is stored', async () => {
  const app = boot();
  await app.submit('saveform', { ...LINK_FORM, url: { value: 'notaurl' } });
  assert.equal(app.value('items.length'), 11);
  const errorEl = vm.runInContext('document.querySelector("#saveerror")', app.context);
  assert.match(String(errorEl.textContent), /http 또는 https/);
  assert.equal(app.storage.has('pinmap.v3'), false);
});

test('AI classification guesses the type from the title when selected', async () => {
  const app = boot();
  await app.submit('saveform', {
    ...LINK_FORM,
    url: { value: 'https://example.com/베이글 카페' },
    type: { value: 'ai' },
    elements: { namedItem: () => ({ value: '성수동 베이글 카페' }) }
  });
  const item = app.value('items[0]');
  assert.equal(item.aiClassified, true);
  assert.equal(item.type, '맛집·카페');                    // guessType recognised the café
  assert.equal(app.value('items.length'), 12);
});

test('editing the save details updates the item and confirms the toast', async () => {
  const app = boot();
  await app.submit('saveform', LINK_FORM);
  const id = app.value('items[0].id');
  app.context.detailId = id;
  await app.submit('editform', {
    __data: { type: '전시·팝업', title: '수정한 제목', address: '서울 성동구 성수동', memo: '업데이트 메모', collection: '이번 주말 성수' }
  });
  const item = app.value('items[0]');
  assert.equal(item.type, '전시·팝업');
  assert.equal(item.title, '수정한 제목');
  assert.equal(item.address, '서울 성동구 성수동');
  assert.equal(item.aiClassified, false);                // manual classification after edit
  assert.match(String(vm.runInContext('document.querySelector("#snackbar").textContent', app.context)), /수정/);
  const stored = JSON.parse(app.storage.get('pinmap.v3'));
  assert.equal(stored.items[0].title, '수정한 제목');      // edit persisted too
});

test('the sample demo link is labeled as a sample and YouTube source', async () => {
  const app = boot();
  await app.submit('saveform', {
    ...LINK_FORM,
    url: { value: 'https://www.youtube.com/watch?v=sample-prototype' },
    type: { value: 'ai' },
    elements: { namedItem: () => ({ value: '주말에 만들어볼 토마토 파스타 레시피' }) }
  });
  const item = app.value('items[0]');
  assert.equal(item.sample, true);
  assert.equal(item.source, 'YouTube');
});
