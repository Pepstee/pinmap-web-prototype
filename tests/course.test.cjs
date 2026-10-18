const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../course.js'), 'utf8');

function app(seed = {}) {
  const storage = new Map(Object.entries(seed));
  const listeners = {};
  let sequence = 0, failSave = false;
  const context = vm.createContext({
    crypto: { randomUUID: () => `course-${++sequence}` },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { if (failSave && key === 'pinmap-courses-v1') throw Error('quota'); storage.set(key, value); },
      removeItem: key => storage.delete(key)
    },
    items: [1, 4, 8].map(id => ({ id, title: `Place ${id}`, address: 'Seoul', art: 'cafe', type: '카페' })),
    isPlace: () => true, esc: value => String(value), icon: () => '',
    page: 'courses', pageName: {}, pages: {},
    document: { addEventListener: (type, fn) => (listeners[type] ??= []).push(fn), querySelector: () => null, querySelectorAll: () => [], body: { classList: { remove() {} } } },
    window: { addEventListener() {}, scrollY: 0, scrollTo() {} },
    render() {}, requestAnimationFrame: fn => fn(), cancelAnimationFrame() {}, setTimeout, clearTimeout,
    toast: message => { context.message = message; },
    go: page => { context.page = page; }
  });
  vm.runInContext(source, context);
  return {
    context, storage,
    fail: () => { failSave = true; },
    html: page => context.pages[page](),
    async click(attribute, value = '') {
      const datasetKey = attribute.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const button = { dataset: { [datasetKey]: value }, hasAttribute: name => name === attribute };
      const event = { target: { closest: selectors => selectors.split(',').some(selector => selector === `[${attribute}]`) ? button : null } };
      for (const fn of listeners.click) await fn(event);
    },
    input(title) { for (const fn of listeners.input ?? []) fn({ target: { dataset: { courseField: 'title' }, value: title } }); }
  };
}

test('new course stays a draft until Save; reload and editing update the existing entry', async () => {
  const a = app();
  assert.match(a.html('courses'), /코스 0개/);
  await a.click('data-course-new');
  assert.equal(a.context.page, 'course');
  await a.click('data-course-save');
  assert.equal(a.context.page, 'course');
  assert.match(a.context.message, /한 곳 이상/);
  a.input('Weekend');
  await a.click('data-course-add', '1');
  await a.click('data-course-add', '1');
  await a.click('data-course-add', '8');
  assert.equal(a.storage.has('pinmap-courses-v1'), false);
  await a.click('data-course-save');
  assert.equal(a.context.page, 'courses');
  let saved = JSON.parse(a.storage.get('pinmap-courses-v1'));
  assert.deepEqual(saved[0].days[0].map(stop => stop.id), [1, 8]);
  assert.equal(a.storage.has('pinmap-course-draft-v1'), false);
  const reloaded = app(Object.fromEntries(a.storage));
  assert.match(reloaded.html('courses'), /Weekend/);
  await reloaded.click('data-course-open', saved[0].id);
  reloaded.input('Updated');
  assert.equal(JSON.parse(reloaded.storage.get('pinmap-courses-v1'))[0].title, 'Weekend');
  await reloaded.click('data-course-save');
  saved = JSON.parse(reloaded.storage.get('pinmap-courses-v1'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, 'Updated');
});

test('legacy data migrates once, preserving days and the original storage', async () => {
  const old = JSON.stringify({ title: 'Legacy', date: '2026-10-19', friends: ['Name'], days: [[{ id: 1, time: '10:00' }], [{ id: 4, time: '12:00' }]] });
  const a = app({ 'pinmap-course-v2': old });
  const saved = JSON.parse(a.storage.get('pinmap-courses-v1'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].days.length, 2);
  assert.equal(a.storage.get('pinmap-course-v2'), old);
  assert.equal(saved[0].friends, undefined);
  await a.click('data-course-open', saved[0].id);
  assert.match(a.html('course'), /2일차/);
  assert.doesNotMatch(a.html('course'), /course-friends|course-companions|course-card-summary/);
  const reloaded = app(Object.fromEntries(a.storage));
  assert.match(reloaded.html('courses'), /코스 1개/);
});

test('save failure keeps the draft and does not claim success', async () => {
  const a = app();
  await a.click('data-course-new');
  await a.click('data-course-add', '1');
  a.fail();
  await a.click('data-course-save');
  assert.equal(a.context.page, 'course');
  assert.match(a.context.message, /저장하지 못/);
  assert.equal(a.storage.has('pinmap-courses-v1'), false);
  assert.equal(a.storage.has('pinmap-course-draft-v1'), true);
});

test('a second saved course keeps the first and drafts can be resumed after reload', async () => {
  const a = app();
  await a.click('data-course-new'); await a.click('data-course-add', '1'); await a.click('data-course-save');
  await a.click('data-course-new'); a.input('Second'); await a.click('data-course-add', '4');
  const resumed = app(Object.fromEntries(a.storage));
  assert.match(resumed.html('courses'), /이어서 만들기/);
  await resumed.click('data-course-resume');
  assert.match(resumed.html('course'), /Second/);
  await resumed.click('data-course-save');
  const saved = JSON.parse(resumed.storage.get('pinmap-courses-v1'));
  assert.equal(saved.length, 2);
  assert.equal(new Set(saved.map(value => value.id)).size, 2);
});
