const { test } = require('node:test');
const assert = require('node:assert/strict');
const { choose, createController } = require('../src/core.js');

function harness(initial, overrides = {}) {
  let state = initial;
  let clock = 0;
  const calls = [];
  const adapter = {
    read: async () => state,
    select: async choice => { calls.push(['select', choice.id]); return 'submitted'; },
    submit: async () => calls.push(['submit']),
    join: async s => calls.push(['join', s.key]),
    ...overrides,
  };
  const controller = createController(adapter, { random: () => 0.7, now: () => clock });
  controller.start();
  return { controller, calls, set: s => { state = s; }, advance: ms => { clock += ms; } };
}

const question = (key = 'q1') => ({ phase: 'question', session: 's1', key,
  options: ['A', 'B', 'C', 'D'].map(id => ({ id, label: id })) });

test('every available option can be chosen and empty lists are harmless', () => {
  const answers = ['A', 'B', 'C'];
  assert.equal(choose(answers, () => 0), 'A');
  assert.equal(choose(answers, () => 0.4), 'B');
  assert.equal(choose(answers, () => 0.9999), 'C');
  assert.equal(choose([]), null);
  assert.throws(() => choose(answers, () => 1), RangeError);
});

test('E is half as likely as each other option regardless of option order or representation', () => {
  for (const answers of [
    ['A', 'B', 'C', 'D', 'E'],
    ['E', 'C', 'A', 'D', 'B'].map(id => ({ id, label: id })),
  ]) {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (let index = 0; index < 900; index++) {
      const answer = choose(answers, () => (index + 0.5) / 900);
      counts[answer.id ?? answer]++;
    }
    assert.deepEqual(counts, { A: 200, B: 200, C: 200, D: 200, E: 100 });
  }
});

test('questions without E keep equal odds for all available options', () => {
  for (const answers of [['A', 'B', 'C', 'D'], ['true', 'false']]) {
    const counts = new Map(answers.map(answer => [answer, 0]));
    for (let index = 0; index < 100; index++) {
      const answer = choose(answers, () => (index + 0.5) / 100);
      counts.set(answer, counts.get(answer) + 1);
    }
    assert.ok([...counts.values()].every(count => count === 100 / answers.length));
  }
});

test('answer is drawn once despite repeated DOM scans', async () => {
  const h = harness(question());
  await h.controller.tick();
  h.advance(10000);
  await h.controller.tick();
  assert.deepEqual(h.calls, [['select', 'C']]);
});

test('new question and new session each get one answer', async () => {
  const h = harness(question());
  await h.controller.tick();
  h.set(question('q2'));
  await h.controller.tick();
  h.set({ ...question(), session: 's2' });
  await h.controller.tick();
  assert.equal(h.calls.length, 3);
});

test('identical question after a waiting phase gets a new answer', async () => {
  const h = harness(question());
  await h.controller.tick();
  h.set({ phase: 'waiting' });
  await h.controller.tick();
  h.set(question());
  await h.controller.tick();
  assert.equal(h.calls.length, 2);
});

test('already recorded answers and paused controller cause no clicks', async () => {
  const h = harness({ ...question(), answered: true });
  await h.controller.tick();
  h.set(question('q2'));
  h.controller.pause();
  await h.controller.tick();
  assert.deepEqual(h.calls, []);
});

test('join retries are rate limited', async () => {
  const h = harness({ phase: 'join', key: 'course-1' });
  await h.controller.tick();
  await h.controller.tick();
  h.advance(5000);
  await h.controller.tick();
  assert.equal(h.calls.length, 2);
});

test('selection followed by Submit does not change the answer', async () => {
  const q = { ...question(), submit: true };
  const h = harness(q, { select: async choice => { h.calls.push(['select', choice.id]); } });
  await h.controller.tick();
  h.advance(10000);
  await h.controller.tick();
  assert.deepEqual(h.calls, [['select', 'C'], ['submit']]);
});

test('a question changing during selection is never submitted', async () => {
  const h = harness(question(), { select: async () => { h.set({ ...question('q2'), submit: true }); } });
  await h.controller.tick();
  assert.deepEqual(h.calls, []);
});

test('manual selection is preserved', async () => {
  const q = { ...question(), submit: true };
  q.options[0].selected = true;
  const h = harness(q);
  await h.controller.tick();
  assert.deepEqual(h.calls, [['submit']]);
});

test('concurrent scans do not double click', async () => {
  const h = harness(question());
  await Promise.all([h.controller.tick(), h.controller.tick(), h.controller.tick()]);
  assert.equal(h.calls.length, 1);
});

test('pause while reading prevents the pending action', async () => {
  let resolve;
  const h = harness(question(), { read: () => new Promise(r => { resolve = r; }) });
  const pending = h.controller.tick();
  h.controller.pause();
  resolve(question());
  await pending;
  assert.deepEqual(h.calls, []);
});

test('an error pauses the automation', async () => {
  const h = harness(question(), { select: async () => { throw new Error('removed'); } });
  await h.controller.tick();
  assert.equal(h.controller.running, false);
});

test('a control replaced during a page update is retried without manual restart', async () => {
  let attempts = 0;
  const h = harness(question(), { select: async choice => {
    if (++attempts === 1) { const error = new Error('changed'); error.retryable = true; throw error; }
    h.calls.push(['select', choice.id]);
    return 'submitted';
  } });
  await h.controller.tick();
  assert.equal(h.controller.running, true);
  h.advance(5000);
  await h.controller.tick();
  assert.deepEqual(h.calls, [['select', 'C']]);
});
