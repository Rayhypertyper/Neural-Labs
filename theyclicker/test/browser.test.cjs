const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../src/core.js'), 'utf8') + '\n'
  + fs.readFileSync(require.resolve('../src/browser.js'), 'utf8');

function pageFixture(names, text = '', options = {}) {
  const clicks = [];
  const attributes = new Map();
  function element(name) {
    const attrs = new Map();
    const node = { innerText: name, textContent: name, className: '', isConnected: true,
      disabled: false, value: '', title: '', style: {}, labels: null,
      getAttribute: key => attrs.get(key) || null,
      setAttribute: (key, value) => attrs.set(key, value),
      closest: () => null, getClientRects: () => [{ width: 100, height: 40 }],
      addEventListener: () => {}, remove: () => {},
      click: () => { clicks.push(name); node.setAttribute('aria-pressed', 'true'); },
    };
    attributes.set(name, attrs);
    return node;
  }
  const nodes = names.map(element);
  const panel = new Map(['status', 'toggle', 'close'].map(name => [name, element(name)]));
  const body = { innerText: text };
  const doc = { body,
    querySelectorAll: selector => selector.startsWith('button,') ? nodes : [],
    documentElement: { append: () => {} },
    createElement: () => ({ attachShadow: () => ({ getElementById: id => panel.get(id) }), remove: () => {} }),
  };
  const timeouts = [];
  const events = new Map();
  let clock = 0;
  let motionListener;
  const motion = { matches: options.reducedMotion === true,
    addEventListener: (name, fn) => { motionListener = fn; }, removeEventListener() {} };
  const math = Object.create(Math);
  math.random = () => 0.7;
  const context = { document: doc, location: { hostname: 'student.iclicker.com', hash: '#/course/test/overview' },
    Math: math, getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    Date: class extends Date { static now() { return clock; } },
    matchMedia: () => motion,
    queueMicrotask: fn => { timeouts.push(fn); }, setInterval: () => 1, clearInterval: () => {},
    MutationObserver: class { observe() {} disconnect() {} },
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name), alert() {},
  };
  if (options.chrome) context.chrome = options.chrome;
  if (options.hidden) doc.hidden = true;
  context.window = context;
  vm.runInNewContext(source, context);
  async function flush() {
    for (const callback of timeouts.splice(0)) callback();
    await new Promise(resolve => setImmediate(resolve));
  }
  return { context, nodes, clicks, body, flush, panel, events,
    advance: ms => { clock += ms; },
    reduceMotion: value => { motion.matches = value; motionListener?.(); } };
}

test('course page does not click Add a Course or other navigation', async () => {
  const p = pageFixture(['Add a Course', 'Overview', 'Class History', 'Assignments']);
  await p.flush();
  assert.deepEqual(p.clicks, []);
  assert.equal(p.context.TheyClicker.running, true);
});

test('live Join Class is clicked', async () => {
  const p = pageFixture(['Join Class', 'Add a Course']);
  await p.flush();
  assert.deepEqual(p.clicks, ['Join Class']);
});

test('disabled joins are left alone', async () => {
  const p = pageFixture(['Join']);
  p.nodes[0].disabled = true;
  await p.flush();
  assert.deepEqual(p.clicks, []);
});

test('A-E live question selects the random option and submits', async () => {
  const p = pageFixture(['A', 'B', 'C', 'D', 'E', 'Submit']);
  await p.flush();
  assert.deepEqual(p.clicks, ['D', 'Submit']);
});

test('True/False questions are supported', async () => {
  const p = pageFixture(['True', 'False', 'Submit Answer']);
  await p.flush();
  assert.deepEqual(p.clicks, ['False', 'Submit Answer']);
});

test('existing submitted response is left alone', async () => {
  const p = pageFixture(['A', 'B', 'C', 'D'], 'Your response has been recorded');
  await p.flush();
  assert.deepEqual(p.clicks, []);
});

test('manual selection is preserved before submitting', async () => {
  const p = pageFixture(['A', 'B', 'C', 'D', 'Submit']);
  p.nodes[0].setAttribute('aria-pressed', 'true');
  await p.flush();
  assert.deepEqual(p.clicks, ['Submit']);
});

test('unrecognized question layouts are skipped', async () => {
  const p = pageFixture(['Type answer', 'Submit']);
  await p.flush();
  assert.deepEqual(p.clicks, []);
});

test('pause before pending scan prevents clicks', async () => {
  const p = pageFixture(['Join']);
  p.context.TheyClicker.pause();
  await p.flush();
  assert.deepEqual(p.clicks, []);
});

test('closed poll with A-E buttons still visible does not answer', async () => {
  const p = pageFixture(['A', 'B', 'C', 'D', 'Submit'], 'Polling is closed');
  await p.flush();
  assert.deepEqual(p.clicks, []);
  assert.match(p.panel.get('status').textContent, /Waiting/);
});

function extensionApi(initial = true) {
  let settings = { enabled: initial };
  let storageListener;
  let messageListener;
  const messages = [];
  return {
    messages,
    runtime: { id: 'test-extension',
      sendMessage: async message => { messages.push(message); return { ok: true }; },
      onMessage: { addListener: fn => { messageListener = fn; } },
    },
    storage: {
      local: { get: async () => settings, set: async values => { settings = { ...settings, ...values }; } },
      onChanged: { addListener: fn => { storageListener = fn; } },
    },
    change: value => storageListener({ enabled: { newValue: value } }, 'local'),
    scan: () => messageListener({ type: 'theyclicker:scan' }, { id: 'test-extension' }, () => {}),
  };
}

test('installed extension starts automatically in a hidden tab', async () => {
  const chrome = extensionApi();
  const p = pageFixture(['Join'], '', { chrome, hidden: true });
  await p.flush();
  await p.flush();
  assert.deepEqual(p.clicks, ['Join']);
  assert.equal(p.context.TheyClicker.running, true);
});

test('stored pause survives a new page load until extension is re-enabled', async () => {
  const chrome = extensionApi(false);
  const p = pageFixture(['Join'], '', { chrome });
  await p.flush();
  await p.flush();
  assert.deepEqual(p.clicks, []);
  assert.equal(p.context.TheyClicker.running, false);
  chrome.change(true);
  await p.flush();
  assert.deepEqual(p.clicks, ['Join']);
});

test('worker scan finds a question while another tab is active', async () => {
  const chrome = extensionApi();
  const p = pageFixture(['A', 'B', 'C', 'D', 'Submit'], 'Waiting for your instructor', { chrome, hidden: true });
  await p.flush();
  await p.flush();
  assert.deepEqual(p.clicks, []);
  p.body.innerText = 'Question 1';
  chrome.scan();
  await p.flush();
  assert.deepEqual(p.clicks, ['C', 'Submit']);
});

test('question alerts continue after submission and clear when the poll closes', async () => {
  const chrome = extensionApi();
  const p = pageFixture(['A', 'B', 'C', 'D', 'Submit'], 'Waiting for your instructor', { chrome, hidden: true });
  await p.flush();
  await p.flush();
  const alerts = () => chrome.messages.filter(message => message.type === 'theyclicker:question');
  assert.equal(alerts().at(-1).active, false);
  p.body.innerText = 'Question 1';
  chrome.scan();
  await p.flush();
  assert.equal(alerts().at(-1).active, true);
  assert.deepEqual(p.clicks, ['C', 'Submit']);
  p.body.innerText = 'Your response has been recorded';
  chrome.scan();
  await p.flush();
  assert.equal(alerts().at(-1).active, true);
  assert.equal(alerts().length, 2);
  p.body.innerText = 'Polling is closed';
  chrome.scan();
  await p.flush();
  assert.equal(alerts().at(-1).active, false);
});

test('active question heartbeat lets a restarted worker recover the badge', async () => {
  const chrome = extensionApi();
  const p = pageFixture(['A', 'B'], '', { chrome });
  await p.flush();
  await p.flush();
  const alerts = () => chrome.messages.filter(message => message.type === 'theyclicker:question');
  assert.equal(alerts().length, 1);
  chrome.scan();
  await p.flush();
  assert.equal(alerts().length, 1);
  p.advance(15000);
  chrome.scan();
  await p.flush();
  assert.equal(alerts().length, 2);
  assert.equal(alerts().at(-1).active, true);
});

test('pausing or leaving a question page clears its toolbar alert', async () => {
  for (const leave of [p => p.context.TheyClicker.pause(), p => p.events.get('pagehide')()]) {
    const chrome = extensionApi();
    const p = pageFixture(['A', 'B'], '', { chrome });
    await p.flush();
    await p.flush();
    leave(p);
    const alerts = chrome.messages.filter(message => message.type === 'theyclicker:question');
    assert.equal(alerts.at(-2).active, true);
    assert.equal(alerts.at(-1).active, false);
  }
});

test('question reports include and refresh the system motion preference', async () => {
  const chrome = extensionApi();
  const p = pageFixture(['A', 'B'], '', { chrome, reducedMotion: true });
  await p.flush();
  await p.flush();
  const alert = () => chrome.messages.filter(message => message.type === 'theyclicker:question').at(-1);
  assert.equal(alert().reducedMotion, true);
  p.reduceMotion(false);
  assert.equal(alert().active, true);
  assert.equal(alert().reducedMotion, false);
});

test('real iClicker checked-in wording is treated as waiting for a question', async () => {
  const p = pageFixture(['Return to Course'], "You're checked in! Stay on this screen to remain in class. We’ll let you know when your instructor starts an activity.");
  await p.flush();
  assert.match(p.panel.get('status').textContent, /Waiting/);
  assert.deepEqual(p.clicks, []);
});

test('ended class returns to the course automatically', async () => {
  const p = pageFixture(['Return to Course'], 'Your class has ended.');
  p.context.location.hash = '#/class/test';
  await p.flush();
  assert.deepEqual(p.clicks, ['Return to Course']);
});
