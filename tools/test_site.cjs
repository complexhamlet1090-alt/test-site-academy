const assert = require('node:assert/strict');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('No browser target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params);
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error)));
    else handler.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8080/' });
  await wait(1400);
  assert.equal(await evaluate(`document.documentElement.scrollWidth`), 390, 'Mobile horizontal overflow');
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
  await click('.menu-toggle');
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
  assert.equal(await evaluate(`document.querySelector('#site-nav').classList.contains('is-open')`), true);
  await click('#site-nav a[href="#questions"]');
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');

  for (const clue of ['urgency', 'link', 'pressure']) {
    await click(`[data-clue="${clue}"]`);
  }
  assert.equal(await evaluate(`document.querySelector('#clue-count').textContent`), '3');
  assert.equal(await evaluate(`document.querySelector('#practice-result').hidden`), false);
  await click('#reset-practice');
  assert.equal(await evaluate(`document.querySelector('#clue-count').textContent`), '0');
  assert.equal(await evaluate(`document.querySelector('#practice-result').hidden`), true);

  await click('.accordion details:first-child summary');
  assert.equal(await evaluate(`document.querySelector('.accordion details:first-child').open`), true);

  await click('.form-submit');
  assert.equal(await evaluate(`document.querySelector('#name-error').textContent.length > 0`), true);
  await evaluate(`document.querySelector('#name').value='Анна'; document.querySelector('#contact').value='anna@example.ru'; document.querySelector('#consent').checked=true;`);
  await click('.form-submit');
  assert.equal(await evaluate(`document.querySelector('#form-success').hidden`), false);
  assert.equal(await evaluate(`document.querySelector('#signup-form').hidden`), true);
  assert.equal(await evaluate(`document.querySelector('#name').value`), '', 'Form data should be cleared');
  await click('#form-reset');
  assert.equal(await evaluate(`document.querySelector('#signup-form').hidden`), false);

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hero-copy')).animationName`), 'none');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Desktop horizontal overflow');
  assert.deepEqual(exceptions, [], 'Browser JavaScript exceptions');
  console.log('PASS: responsive widths, mobile menu, all three SMS clues and reset, FAQ, validation, demo submission and reset, data clearing, reduced motion, no JS exceptions.');
  ws.close();
  setTimeout(() => process.exit(0), 100);
}
main().catch(error => { console.error(error); process.exit(1); });
