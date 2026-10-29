const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function backgroundFixture(tabs = [{ id: 1 }]) {
  const handlers = {};
  const calls = [];
  const intervals = new Map();
  let nextTimer = 0;
  let settings = { enabled: true };
  const event = name => ({ addListener: fn => { handlers[name] = fn; } });
  const chrome = {
    storage: { local: {
      get: async defaults => ({ ...defaults, ...settings }),
      set: async values => {
        settings = { ...settings, ...values };
        handlers.changed?.({ enabled: { newValue: settings.enabled } }, 'local');
      },
    }, onChanged: event('changed') },
    tabs: {
      query: async filter => { calls.push(['query', filter.url]); return tabs; },
      update: async (id, values) => calls.push(['update', id, values.autoDiscardable]),
      sendMessage: async id => calls.push(['scan', id]),
      onRemoved: event('removed'), onUpdated: event('updated'),
    },
    action: {
      setBadgeText: async values => calls.push(['badge', values.text]),
      setBadgeBackgroundColor: async values => calls.push(['color', values.color]),
      setTitle: async values => calls.push(['title', values.title]),
      onClicked: event('clicked'),
    },
    alarms: { create: async (name, options) => calls.push(['alarm', name, options.periodInMinutes]), onAlarm: event('alarm') },
    runtime: { id: 'test', onInstalled: event('installed'), onStartup: event('startup'), onMessage: event('message') },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'), 'utf8'), {
    chrome,
    setInterval: (fn, ms) => { const id = ++nextTimer; intervals.set(id, { fn, ms }); return id; },
    clearInterval: id => intervals.delete(id),
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const question = async (active, tabId = 1, extra = {}) => {
    handlers.message({ type: 'theyclicker:question', active, ...extra },
      { id: 'test', url: 'https://student.iclicker.com/', tab: { id: tabId }, frameId: 0 }, () => {});
    await flush();
  };
  const pulse = async () => {
    for (const { fn } of intervals.values()) fn();
    await flush();
  };
  return { calls, handlers, flush, intervals, question, pulse,
    badge: () => calls.filter(c => c[0] === 'badge').at(-1)?.[1] };
}

test('installation enables watching without any toolbar click', async () => {
  const h = backgroundFixture();
  h.handlers.installed();
  await h.flush();
  assert.ok(h.calls.some(c => c[0] === 'badge' && c[1] === 'ON'));
  assert.ok(h.calls.some(c => c[0] === 'alarm' && c[2] === 0.5));
  assert.ok(h.calls.some(c => c[0] === 'update' && c[2] === false));
  assert.ok(h.calls.some(c => c[0] === 'scan'));
  assert.ok(h.calls.filter(c => c[0] === 'query').every(c => c[1] === 'https://student.iclicker.com/*'));
});

test('toolbar pause stops background scans and restores discardability', async () => {
  const h = backgroundFixture();
  await h.handlers.clicked();
  await h.flush();
  assert.ok(h.calls.some(c => c[0] === 'badge' && c[1] === 'OFF'));
  assert.ok(h.calls.some(c => c[0] === 'update' && c[2] === true));
  assert.equal(h.calls.some(c => c[0] === 'scan'), false);
});

test('fallback scans skip frozen and discarded tabs', async () => {
  const h = backgroundFixture([{ id: 1, frozen: true }, { id: 2, discarded: true }, { id: 3 }]);
  h.handlers.alarm({ name: 'theyclicker-scan' });
  await h.flush();
  assert.deepEqual(h.calls.filter(c => c[0] === 'scan'), [['scan', 3]]);
});

test('a live question flashes the amber LIVE badge until it closes', async () => {
  const h = backgroundFixture();
  await h.question(true);
  assert.equal(h.badge(), 'LIVE');
  assert.ok(h.calls.some(c => c[0] === 'color' && c[1] === '#b45309'));
  assert.match(h.calls.filter(c => c[0] === 'title').at(-1)[1], /live iClicker question/);
  assert.equal(h.intervals.size, 1);
  assert.equal([...h.intervals.values()][0].ms, 1000);
  await h.pulse();
  assert.equal(h.badge(), '');
  await h.question(true); // Heartbeats do not restart or duplicate the pulse.
  assert.equal(h.badge(), '');
  assert.equal(h.intervals.size, 1);
  await h.pulse();
  assert.equal(h.badge(), 'LIVE');
  await h.question(false);
  assert.equal(h.badge(), 'ON');
  assert.equal(h.intervals.size, 0);
  assert.deepEqual(h.calls.filter(c => c[0] === 'color').at(-1), ['color', '#125ea4']);
});

test('pausing clears flashing and ignores live reports until re-enabled', async () => {
  const h = backgroundFixture();
  await h.question(true);
  await h.handlers.clicked();
  await h.flush();
  assert.equal(h.badge(), 'OFF');
  assert.equal(h.intervals.size, 0);
  await h.question(true);
  assert.equal(h.badge(), 'OFF');
  assert.equal(h.intervals.size, 0);
  await h.handlers.clicked();
  await h.flush();
  await h.question(true);
  assert.equal(h.badge(), 'LIVE');
  assert.equal(h.intervals.size, 1);
});

test('another live tab keeps the alert until the last question tab closes', async () => {
  const h = backgroundFixture();
  await h.question(true, 1);
  await h.question(true, 2);
  await h.question(false, 1);
  assert.equal(h.badge(), 'LIVE');
  assert.equal(h.intervals.size, 1);
  h.handlers.removed(2);
  await h.flush();
  assert.equal(h.badge(), 'ON');
  assert.equal(h.intervals.size, 0);
});

test('navigating away clears a tab alert without waiting for a page message', async () => {
  const h = backgroundFixture();
  await h.question(true);
  h.handlers.updated(1, { status: 'loading' });
  await h.flush();
  assert.equal(h.badge(), 'ON');
  assert.equal(h.intervals.size, 0);
});

test('reduced motion keeps the live badge steady and responds to preference changes', async () => {
  const h = backgroundFixture();
  await h.question(true, 1, { reducedMotion: true });
  assert.equal(h.badge(), 'LIVE');
  assert.equal(h.intervals.size, 0);
  await h.question(true, 1, { reducedMotion: false });
  await h.pulse();
  assert.equal(h.badge(), '');
  await h.question(true, 1, { reducedMotion: true });
  assert.equal(h.badge(), 'LIVE');
  assert.equal(h.intervals.size, 0);
});

test('only this extension in a top-level iClicker tab can change the alert', async () => {
  const h = backgroundFixture();
  const sender = { id: 'test', url: 'https://student.iclicker.com/', tab: { id: 1 }, frameId: 0 };
  for (const invalid of [{ id: 'other' }, { url: 'https://example.com/' }, { frameId: 2 }, { tab: {} }]) {
    h.handlers.message({ type: 'theyclicker:question', active: true }, { ...sender, ...invalid }, () => {});
  }
  h.handlers.message({ type: 'theyclicker:question', active: 'true' }, sender, () => {});
  await h.flush();
  assert.equal(h.calls.length, 0);
  assert.equal(h.intervals.size, 0);
});

test('extension manifest starts only on iClicker, in the top-level page', () => {
  const manifest = JSON.parse(fs.readFileSync(require.resolve('../extension/manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://student.iclicker.com/*']);
  assert.deepEqual(manifest.content_scripts[0].js, ['core.js', 'browser.js']);
  assert.equal(manifest.content_scripts[0].all_frames, false);
  assert.equal(manifest.permissions.includes('debugger'), false);
  assert.equal(manifest.permissions.includes('tabs'), false);
});
