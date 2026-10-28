const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../course.js'), 'utf8');

function app(seed = {}) {
  const storage = new Map(Object.entries(seed));
  const listeners = {};
  let failSave = false;
  const context = vm.createContext({
    PM_ENV: { development: false },
    crypto: { randomUUID: require('node:crypto').randomUUID },
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

test('legacy days merge into one ordered course without losing places or original storage', async () => {
  const old = JSON.stringify({ title: 'Legacy', date: '2026-10-19', friends: ['Name'], days: [[{ id: 1, time: '10:00' }], [{ id: 4, time: '12:00' }]] });
  const a = app({ 'pinmap-course-v2': old });
  const saved = JSON.parse(a.storage.get('pinmap-courses-v1'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].days.length, 1);
  assert.deepEqual(saved[0].days[0].map(stop => stop.id), [1, 4]);
  assert.equal(a.storage.get('pinmap-course-v2'), old);
  assert.equal(saved[0].friends, undefined);
  await a.click('data-course-open', saved[0].id);
  assert.doesNotMatch(a.html('course'), /일차|data-course-day|data-course-add-day/);
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

test('new courses start empty without a resume action; existing saved courses remain', async () => {
  const a = app();
  await a.click('data-course-new'); await a.click('data-course-add', '1'); await a.click('data-course-save');
  await a.click('data-course-new'); a.input('Unfinished'); await a.click('data-course-add', '4');
  const reloaded = app(Object.fromEntries(a.storage));
  assert.doesNotMatch(reloaded.html('courses'), /이어서|course-resume/);
  await reloaded.click('data-course-new');
  assert.doesNotMatch(reloaded.html('course'), /Unfinished|Place 4/);
  await reloaded.click('data-course-add', '8'); await reloaded.click('data-course-save');
  const saved = JSON.parse(reloaded.storage.get('pinmap-courses-v1'));
  assert.equal(saved.length, 2);
  assert.deepEqual(saved.map(course => course.days[0].map(stop => stop.id)), [[8], [1]]);
});

test('existing multi-day courses become a single editable list with unique places', async () => {
  const seed = [{id:'old',title:'Old',date:'2026-10-19',days:[[{id:1,time:'10:00'}],[{id:4,time:'11:00'},{id:1,time:'12:00'}]]}];
  const a = app({'pinmap-courses-v1':JSON.stringify(seed)});
  await a.click('data-course-open', 'old');
  assert.doesNotMatch(a.html('course'), /일차|course-days/);
  await a.click('data-course-save');
  const saved = JSON.parse(a.storage.get('pinmap-courses-v1'));
  assert.equal(saved[0].days.length, 1);
  assert.deepEqual(saved[0].days[0].map(stop=>stop.id), [1,4]);
});

test('map creation opens a fresh editor directly and preserves saved courses', async () => {
  const a = app();
  await a.click('data-course-new'); await a.click('data-course-add', '1'); await a.click('data-course-save');
  a.context.page='map';
  await a.click('data-course-new');
  assert.equal(a.context.page, 'course');
  assert.match(a.html('course'), /코스가 비어/);
  assert.equal(JSON.parse(a.storage.get('pinmap-courses-v1')).length, 1);
});
