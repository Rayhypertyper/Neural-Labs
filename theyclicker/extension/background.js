'use strict';

const ICLICKER = 'https://student.iclicker.com/*';
const ALARM = 'theyclicker-scan';
// Track all iClicker tabs so closing one poll cannot hide another live poll.
const questionTabs = new Map();
let badgeEnabled = true;
let badgeRevision = 0;
let flashTimer = null;
let flashVisible = true;

async function enabled() {
  return (await chrome.storage.local.get({ enabled: true })).enabled !== false;
}

async function renderBadge() {
  const live = badgeEnabled && questionTabs.size > 0;
  await Promise.all([
    chrome.action.setBadgeText({ text: !badgeEnabled ? 'OFF' : live ? (flashVisible ? 'LIVE' : '') : 'ON' }),
    chrome.action.setBadgeBackgroundColor({ color: !badgeEnabled ? '#66717c' : live ? '#b45309' : '#125ea4' }),
    chrome.action.setTitle({ title: live
      ? 'TheyClicker — live iClicker question; click to pause'
      : badgeEnabled ? 'TheyClicker — automatic watching enabled; click to pause'
      : 'TheyClicker — paused; click to enable' }),
  ]);
}

async function updateBadge() {
  const revision = ++badgeRevision;
  const on = await enabled();
  if (revision !== badgeRevision) return;
  badgeEnabled = on;
  if (!on) questionTabs.clear();
  // Reduced-motion users get a steady LIVE badge with the same status text.
  const shouldFlash = on && [...questionTabs.values()].some(reducedMotion => !reducedMotion);
  if (shouldFlash && flashTimer === null) {
    flashVisible = true;
    flashTimer = setInterval(() => {
      flashVisible = !flashVisible;
      void renderBadge();
    }, 1000);
  } else if (!shouldFlash) {
    clearInterval(flashTimer);
    flashTimer = null;
    flashVisible = true;
  }
  await renderBadge();
}

function forgetQuestion(tabId) {
  if (questionTabs.delete(tabId)) void updateBadge();
}

async function protectTab(tabId, on) {
  try { await chrome.tabs.update(tabId, { autoDiscardable: !on }); }
  catch { /* The tab may have closed between discovery and update. */ }
}

async function scanTabs() {
  const on = await enabled();
  const tabs = await chrome.tabs.query({ url: ICLICKER });
  await Promise.all(tabs.map(async tab => {
    await protectTab(tab.id, on);
    if (!on || tab.discarded || tab.frozen) return;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'theyclicker:scan' }); }
    catch { /* Refresh tabs already open before the extension was installed. */ }
  }));
}

async function initialize() {
  // Alarms run independently of the page's background timer throttling. Page
  // mutations drive fast responses; this is only a fallback every 30 seconds.
  await chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
  await updateBadge();
  await scanTabs();
}

chrome.runtime.onInstalled.addListener(() => { void initialize(); });
chrome.runtime.onStartup.addListener(() => { void initialize(); });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM) void scanTabs();
});
chrome.action.onClicked.addListener(async () => {
  await chrome.storage.local.set({ enabled: !(await enabled()) });
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.enabled) return;
  void updateBadge();
  void scanTabs();
});
chrome.tabs.onRemoved.addListener(forgetQuestion);
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading') forgetQuestion(tabId);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://student.iclicker.com/')
      || !Number.isInteger(sender.tab?.id) || (sender.frameId !== undefined && sender.frameId !== 0)) return;
  let task;
  if (message?.type === 'theyclicker:ready') task = initialize();
  else if (message?.type === 'theyclicker:question' && typeof message.active === 'boolean') {
    if (message.active) questionTabs.set(sender.tab.id, message.reducedMotion === true);
    else questionTabs.delete(sender.tab.id);
    task = updateBadge();
  } else return;
  task.then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
  return true;
});
