(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.TheyClickerCore = core;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function choose(options, random = Math.random) {
    if (!options.length) return null;
    const value = random();
    if (!(value >= 0 && value < 1)) throw new RangeError('Random value must be in [0, 1).');
    // E remains possible, with half the weight of every other option.
    const weights = options.map(option => (option?.id ?? option) === 'E' ? 1 : 2);
    let remaining = value * weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < options.length; index++) {
      if (remaining < weights[index]) return options[index];
      remaining -= weights[index];
    }
    return options[options.length - 1];
  }

  // The adapter owns DOM access. This state machine owns exactly-once choices,
  // short retries, and preventing overlapping scans when the UI changes quickly.
  function createController(adapter, options = {}) {
    const now = options.now || Date.now;
    const random = options.random || Math.random;
    const retryMs = options.retryMs ?? 5000;
    const records = new Map();
    let running = false;
    let busy = false;
    let epoch = 0;
    let cycle = 0;
    let previousPhase = '';
    let session = '';
    let lastJoin = null;

    function report(message) { adapter.report?.(message); }

    async function tick() {
      if (!running || busy) return;
      busy = true;
      const ticket = epoch;
      try {
        const state = await adapter.read();
        if (!running || ticket !== epoch) return;
        if (state.session && state.session !== session) {
          session = state.session;
          records.clear();
          cycle = 0;
          lastJoin = null;
        }
        if (state.phase === 'waiting' && previousPhase === 'question') cycle++;
        previousPhase = state.phase;

        if (state.phase === 'join') {
          const key = state.key || 'available-class';
          if (lastJoin?.key === key && now() - lastJoin.at < retryMs) return;
          lastJoin = { key, at: now() };
          await adapter.join(state);
          report(state.message || 'Joining the available class…');
          return;
        }
        if (state.phase !== 'question') {
          report(state.message || 'Waiting for a class or a multiple-choice question.');
          return;
        }

        const key = [session, cycle, state.key].join('|');
        let record = records.get(key);
        if (state.answered) {
          if (record) record.done = true;
          else records.set(key, { done: true });
          report('Answer recorded. Waiting for the next question.');
          return;
        }
        if (record?.done) return;
        if (!state.options?.length) return;
        if (!record) {
          record = { choice: choose(state.options, random).id, selected: false, at: -Infinity };
          records.set(key, record);
          if (records.size > 500) records.delete(records.keys().next().value);
        }
        if (now() - record.at < retryMs) return;
        const choice = state.options.find(item => item.id === record.choice);
        // Never draw again when a previously chosen option temporarily vanishes.
        if (!choice) return;
        record.at = now();

        // An existing selection might have been made manually. Preserve it.
        const selected = state.options.find(item => item.selected);
        if (selected) {
          record.choice = selected.id;
          record.selected = true;
        }
        if (!record.selected) {
          const result = await adapter.select(choice, state);
          if (!running || ticket !== epoch) return;
          record.selected = true;
          if (result === 'submitted') {
            record.done = true;
            report('Random answer ' + choice.label + ' sent.');
            return;
          }
        }
        const fresh = await adapter.read();
        if (!running || ticket !== epoch) return;
        // Never submit if a question ended or changed during the click.
        if (fresh.phase !== 'question' || fresh.key !== state.key) return;
        if (fresh.answered) {
          record.done = true;
          report('Answer recorded. Waiting for the next question.');
        } else if (fresh.submit) {
          // Submission uncertainty must not cause duplicate submissions.
          record.done = true;
          await adapter.submit(fresh);
          report('Answer submitted. Waiting for the next question.');
        } else {
          report('Selected ' + record.choice + '. Waiting for confirmation.');
        }
      } catch (error) {
        if (error.retryable) {
          report('Retrying when the page settles: ' + error.message);
          return;
        }
        report('Paused after an error: ' + error.message);
        running = false;
        epoch++;
        adapter.onPause?.();
      } finally {
        busy = false;
      }
    }

    return {
      tick,
      start() { running = true; epoch++; report('Watching for a class or question.'); },
      pause() { running = false; epoch++; report('Paused.'); },
      get running() { return running; },
    };
  }

  return { choose, createController };
});
