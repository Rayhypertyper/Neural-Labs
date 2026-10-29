(function () {
  'use strict';
  if (location.hostname !== 'student.iclicker.com') {
    alert('Open student.iclicker.com, sign in, and run TheyClicker there.');
    return;
  }
  if (window.TheyClicker?.version) {
    window.TheyClicker.start();
    return;
  }

  const extension = typeof chrome === 'object' && chrome.runtime?.id && chrome.storage?.local;
  const { createController } = window.TheyClickerCore;
  const host = document.createElement('div');
  host.id = 'theyclicker-control';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host { all: initial; position: fixed; right: 18px; bottom: 18px;
      z-index: 2147483647; color-scheme: light; }
    section { box-sizing: border-box; width: min(310px, calc(100vw - 36px));
      background: #fff; color: #18212b; border: 1px solid #cbd5df;
      border-radius: 12px; padding: 16px; font: 14px/1.5 system-ui, sans-serif;
      box-shadow: 0 4px 24px #18212b20; }
    strong { font-size: 16px; } p { margin: 8px 0 12px; }
    button { cursor: pointer; font: inherit; font-weight: 600; min-height: 40px;
      border: 1px solid #bcc8d4; border-radius: 6px; padding: 6px 12px;
      background: #f7f9fb; color: #18212b; }
    button:focus-visible { outline: 3px solid #0076c9; outline-offset: 2px; }
    #toggle { background: #125ea4; border-color: #125ea4; color: white; }
    small { display: block; margin-top: 10px; color: #536273; font-size: 12px; }
  </style><section aria-label="TheyClicker automation">
    <strong>TheyClicker</strong>
    <p id="status" role="status" aria-live="polite">Starting…</p>
    <button id="toggle" type="button">Pause</button>
    <button id="close" type="button">Stop & close</button>
    <small>Joins live classes and sends one random multiple-choice answer. Keep this tab open.</small>
  </section>`;
  document.documentElement.append(host);
  const status = shadow.getElementById('status');
  const toggle = shadow.getElementById('toggle');
  const close = shadow.getElementById('close');
  if (extension) close.textContent = 'Hide panel';
  const report = message => { if (status.textContent !== message) status.textContent = message; };
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let questionActive;
  let lastQuestionReport = 0;
  function reportQuestion(active, force = false) {
    if (!extension) return;
    const now = Date.now();
    // Refresh active state occasionally so a restarted service worker recovers
    // the badge even if the question has not changed.
    if (!force && active === questionActive && (!active || now - lastQuestionReport < 15000)) return;
    questionActive = active;
    lastQuestionReport = now;
    try {
      void chrome.runtime.sendMessage({ type: 'theyclicker:question', active,
        reducedMotion: motionPreference?.matches === true }).catch(() => {});
    } catch { /* A reloaded extension may invalidate this content script. */ }
  }
  const clearQuestion = () => reportQuestion(false);
  const updateMotion = () => reportQuestion(questionActive === true, true);
  motionPreference?.addEventListener('change', updateMotion);
  const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
  const visible = element => {
    if (!element || element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const enabled = element => !element.disabled && element.getAttribute('aria-disabled') !== 'true';
  const label = element => normalize(element.getAttribute('aria-label') || element.innerText || element.value || element.title);
  const controls = () => [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a')].filter(visible);
  const selected = element => element.checked || element.getAttribute('aria-checked') === 'true'
    || element.getAttribute('aria-pressed') === 'true' || element.getAttribute('aria-selected') === 'true'
    || /(?:^|\s)(?:selected|checked|active)(?:\s|$)/.test(element.className || '');

  function questionKey(options) {
    const identity = [...document.querySelectorAll('[data-question-id], [data-poll-id]')].find(visible);
    const headings = [...document.querySelectorAll('h1, h2, h3, [role="heading"]')].filter(visible);
    const number = headings.map(label).find(text => /(?:question|poll)\s*#?\s*\d+/i.test(text))
      || normalize(document.body.innerText).match(/\b(?:question|poll)\s*#?\s*\d+\b/i)?.[0];
    // Exclude countdowns and response confirmations from identity.
    const explicit = identity?.getAttribute('data-question-id') || identity?.getAttribute('data-poll-id') || number;
    return [location.hash, explicit || '', options.map(option => option.label).join(';')].join('|');
  }

  function read() {
    const buttons = controls();
    const text = normalize(document.body.innerText);
    const session = location.hash.match(/(?:session|class)\/([^/]+)/)?.[0]
      || location.hash.match(/course\/([^/]+)/)?.[0] || '';
    if (/\/(?:login|account)(?:\/|$)/.test(location.hash)) {
      return { phase: 'login', message: 'Sign in to iClicker to continue.' };
    }

    // Restrict this to the live Join control, never Add a Course or enrollment.
    const join = buttons.find(button => enabled(button) && /^(?:join|join class|join session|join live session)$/i.test(label(button)));
    if (join) return { phase: 'join', session, key: location.hash + '|' + label(join), element: join };

    const classEnded = /(?:class|session) (?:has )?ended|class is over/i.test(text);
    const returnToCourse = classEnded && /\/class\//.test(location.hash)
      && buttons.find(button => enabled(button) && /^(?:return|back) to course$/i.test(label(button)));
    if (returnToCourse) return { phase: 'join', session, key: location.hash + '|return-to-course', element: returnToCourse,
      message: 'Returning to the course to watch for the next class.' };

    const isHistory = /\/(?:history|assignments?|study)(?:\/|$)/i.test(location.hash)
      || buttons.some(button => /^(?:class history|assignments|study tools)$/i.test(label(button))
        && button.getAttribute('aria-selected') === 'true');
    if (isHistory) return { phase: 'inactive', message: 'Open the course Overview or a live class.' };

    // Closed polls can retain their option buttons. Observe this transition even
    // when A-E are still present, so a subsequent identical poll is answered.
    const waiting = /you['’]re checked in|instructor starts an activity|waiting for (?:a |the |your instructor)|polling (?:has |is )?(?:closed|stopped)|question (?:has )?(?:ended|closed)|class (?:has )?ended|no (?:active |live )?(?:question|poll)/i.test(text);
    if (waiting) return { phase: 'waiting', session, message: 'Waiting for the next live question.' };

    const optionNodes = [...document.querySelectorAll('button, [role="button"], input[type="radio"], [role="radio"], input[type="checkbox"], [role="checkbox"]')]
      .filter(visible).map(element => {
        const optionLabel = element.labels?.length ? normalize([...element.labels].map(label).join(' ')) : label(element);
        const match = optionLabel.match(/^(?:answer\s+)?([A-E])(?:[\s.):–-]+.*)?$/i);
        const boolean = optionLabel.match(/^(true|false)$/i);
        return { id: match?.[1].toUpperCase() || boolean?.[1].toLowerCase(), label: optionLabel,
          element, selected: selected(element), enabled: enabled(element) };
      }).filter(option => option.id);
    const options = [...new Map(optionNodes.map(option => [option.id, option])).values()];
    const letters = options.map(option => option.id).join('');
    const recognized = /^(?:AB|ABC|ABCD|ABCDE)$/.test(letters)
      || (options.length === 2 && options.some(option => option.id === 'true') && options.some(option => option.id === 'false'));
    if (!recognized) {
      return { phase: 'inactive', session, message: 'Watching for Join or a multiple-choice question.' };
    }
    const answered = /(?:answer|response)\s+(?:(?:has been|was)\s+)?(?:submitted|received|recorded|saved)/i.test(text)
      || (options.some(option => option.selected) && options.every(option => !option.enabled));
    const submit = buttons.find(button => enabled(button) && /^(?:submit|submit answer|submit response|send answer|send response)$/i.test(label(button)));
    return { phase: 'question', session, key: questionKey(options), options, answered, submit };
  }

  function click(element) {
    if (!element?.isConnected || !visible(element) || !enabled(element)) {
      const error = new Error('The control changed. Waiting for the page to settle.');
      error.retryable = true;
      throw error;
    }
    element.click();
  }
  const controller = createController({
    read: () => {
      const state = read();
      reportQuestion(state.phase === 'question');
      return state;
    },
    join: state => click(state.element),
    select: option => { click(option.element); },
    submit: state => click(state.submit),
    report,
    onPause: () => { toggle.textContent = 'Start'; clearQuestion(); },
  });
  let queued = false;
  const scan = () => {
    if (queued) return;
    queued = true;
    // A microtask responds to DOM updates without waiting on a timer that a
    // browser can throttle when another tab is foregrounded.
    queueMicrotask(() => { queued = false; void controller.tick(); });
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'aria-pressed', 'aria-checked', 'aria-selected', 'class'] });
  const timer = setInterval(scan, 1500);
  window.addEventListener('hashchange', scan);
  window.addEventListener('pageshow', scan);
  window.addEventListener('pagehide', clearQuestion);
  window.addEventListener('online', scan);
  document.addEventListener?.('resume', scan);
  function start(persist = true) {
    controller.start(); toggle.textContent = 'Pause'; scan();
    if (extension && persist) void chrome.storage.local.set({ enabled: true });
  }
  function pause(persist = true) {
    controller.pause(); toggle.textContent = 'Start';
    clearQuestion();
    if (extension && persist) void chrome.storage.local.set({ enabled: false });
  }
  function stop() {
    pause(); observer.disconnect(); clearInterval(timer);
    window.removeEventListener('hashchange', scan); host.remove(); delete window.TheyClicker;
    window.removeEventListener('pageshow', scan);
    window.removeEventListener('pagehide', clearQuestion);
    window.removeEventListener('online', scan);
    document.removeEventListener?.('resume', scan);
    motionPreference?.removeEventListener('change', updateMotion);
  }
  toggle.addEventListener('click', () => controller.running ? pause() : start());
  close.addEventListener('click', () => extension ? (host.style.display = 'none') : stop());
  window.TheyClicker = { version: '1.1.1', start, pause, stop,
    get running() { return controller.running; } };
  if (extension) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type !== 'theyclicker:scan' || sender.id !== chrome.runtime.id) return;
      scan(); sendResponse({ running: controller.running });
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.enabled) return;
      if (changes.enabled.newValue !== false) start(false);
      else pause(false);
    });
    chrome.storage.local.get({ enabled: true }).then(settings => {
      if (settings.enabled !== false) start(false);
      else pause(false);
      return chrome.runtime.sendMessage({ type: 'theyclicker:ready' });
    }).catch(() => { pause(false); report('Extension reloaded. Refresh this iClicker tab once.'); });
  } else start();
})();
