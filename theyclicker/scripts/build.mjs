import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const core = await readFile(new URL('src/core.js', root), 'utf8');
const browser = await readFile(new URL('src/browser.js', root), 'utf8');
const source = core + '\n' + browser;
const metadata = `// ==UserScript==
// @name         TheyClicker
// @namespace    theyclicker.local
// @version      1.1.1
// @description  Join available iClicker classes and choose one random multiple-choice answer.
// @match        https://student.iclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
`;
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/theyclicker.user.js', root), metadata + source);
await writeFile(new URL('dist/theyclicker-console.js', root), source);
// Encode the unminified source so comments/newlines survive bookmark URL handling.
await writeFile(new URL('dist/bookmarklet.txt', root), 'javascript:' + encodeURIComponent('void function(){\n' + source + '\n}()') + '\n');
await mkdir(new URL('dist/theyclicker-extension/', root), { recursive: true });
for (const file of ['manifest.json', 'background.js']) {
  await writeFile(new URL('dist/theyclicker-extension/' + file, root), await readFile(new URL('extension/' + file, root)));
}
await writeFile(new URL('dist/theyclicker-extension/core.js', root), core);
await writeFile(new URL('dist/theyclicker-extension/browser.js', root), browser);
console.log('Built dist/theyclicker-extension/ and the standalone scripts.');
