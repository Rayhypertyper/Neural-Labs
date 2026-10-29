# TheyClicker

A local extension for `https://student.iclicker.com` that clicks **Join / Join Class / Join Session** when available and selects one random A–E (or True/False) option for each live question. It sends the answer if a separate Submit control appears.

## Install once in Chrome, Edge, or Brave

Use the entire **`dist/theyclicker-extension` folder**. You do not paste a file into the browser for this version.

1. Open your browser's extensions page: `chrome://extensions`, `edge://extensions`, or `brave://extensions`.
2. Turn on **Developer mode**, click **Load unpacked**, and select the `dist/theyclicker-extension` folder in this project. Select the folder containing `manifest.json`, not an individual file.
3. Refresh any iClicker tab that was already open. Sign in and leave the course **Overview** open.

Watching is enabled automatically after installation and on every subsequent iClicker page load. No extension-button click is required per class, per question, or after a normal page reload. The toolbar badge shows **ON**; click the toolbar button only to pause or re-enable it. Pause persists across page loads and browser restarts. The page panel also has a Pause button; **Hide panel** hides it while watching continues.

Pin **TheyClicker** to the browser toolbar to see question alerts. When a live multiple-choice question is detected, the badge flashes amber **LIVE** once every two seconds, including while you use another tab. It continues after an answer is submitted and returns to **ON** when the question closes. Pausing, closing the iClicker tab, or leaving the page clears the alert. With the system's reduced-motion preference enabled, **LIVE** stays steady.

You can use another tab. The iClicker tab does not need to be selected. It must remain open and signed in, and the browser and computer must remain running. This does not operate with a closed tab/browser, an expired login, or a sleeping computer.

Page changes trigger scans directly through a MutationObserver and a microtask, rather than a debounce timer that can be heavily delayed in background tabs. A service worker also requests a fallback scan every 30 seconds and sets iClicker tabs to `autoDiscardable: false` while enabled. Those measures do not guarantee execution if the browser forcibly freezes the tab or the operating system suspends it. If your browser still suspends it, add `student.iclicker.com` to its list of sites kept active; do not disable energy-saving settings globally.

The extension requests access only to `student.iclicker.com`, plus local settings storage and alarms. It has no account credentials, remote backend, or access to other websites. Its source is in `extension/` and `src/`.

## Run once in your browser

1. Sign in to iClicker and open your course **Overview**.
2. Open the browser's developer console.
3. Paste the contents of `dist/theyclicker-console.js` and run it.
4. Keep the tab open. The **TheyClicker** panel shows its status. Use **Pause** or **Stop & close** to stop it.

Alternatively, make a bookmark whose URL is the entire line in `dist/bookmarklet.txt`, and click it while on the iClicker tab.

## Run automatically on future visits

If your browser already has a userscript manager such as Tampermonkey or Violentmonkey, create a userscript, replace its contents with `dist/theyclicker.user.js`, and save it. It starts when you visit iClicker. The manager must allow the script to run on `student.iclicker.com`.

## Behavior and limits

- Runs locally in the signed-in page. No account credentials, external services, or dependencies are used.
- Watches page changes and also checks every 1.5 seconds. The extension adds a service-worker fallback scan and requests that iClicker tabs remain loaded; see the background limits above.
- Makes one random choice per question and preserves an existing manual selection. Repeated scans do not redraw the answer.
- E has half the selection weight of each other option. With A–E available, E has about an 11.1% chance and A–D each have about a 22.2% chance. Questions without E keep equal odds.
- Needs the course Overview open initially to see the live Join control. After an ended class, it returns automatically if iClicker displays **Return to Course**. It does not enroll in courses or switch among course pages.
- Text, numeric, target, and unrecognized question layouts are skipped.
- Retries if a page update replaces a control mid-click. Unexpected errors pause it and show a status message. Does not automate sign-in or location prompts.
- A page reload removes the one-time script. A userscript manager reinstalls it on reload.
- If two identical questions appear without a visible question number or a waiting state between them, the script keeps the existing answer instead of risking a duplicate submission.
- The live **Join** control and the subsequent **You're checked in!** screen were verified on iClicker. Live-question compatibility still needs verification; no question was open during that check.
- The Codex in-app browser supports interactive control, but its automation calls cannot continue after the tool execution ends. This project is a browser script; merely opening iClicker in Codex does not activate it.

## Development

Requires Node.js 18 or later; no npm packages need installing.

```sh
npm run check
```

The tests cover random selection, duplicate prevention, new question/session transitions, separate submission, manual selections, rate-limited joins, pause, concurrent scans, extension startup, persisted pause, hidden-page scans, live-question badge flashing and cleanup, reduced motion, and service-worker behavior. Browser APIs and hidden-page state are simulated in the automated tests; these tests do not establish real-browser timing under memory/energy-saving modes.

Official references: [automatic content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#static-declarative) and [tab discard/freeze behavior](https://developer.chrome.com/docs/extensions/reference/api/tabs).
