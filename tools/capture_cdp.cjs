const fs = require('node:fs');
const path = require('node:path');

const output = process.argv[2];
const width = Number(process.argv[3] || 390);
const height = Number(process.argv[4] || 844);
const url = process.argv[5] || 'http://127.0.0.1:8080/';
const fullPage = process.argv[6] === 'full';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('No page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
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
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: true,
    screenWidth: width, screenHeight: height,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Page.navigate', { url });
  await wait(2200);
  const metrics = await send('Runtime.evaluate', {
    expression: `JSON.stringify({innerWidth,outerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,mediaMobile:matchMedia('(max-width:600px)').matches,font:document.fonts.check('16px Onest'),ready:document.readyState})`,
    returnByValue: true,
  });
  console.log(metrics.result.value);
  let captureParams = { format: 'png', captureBeyondViewport: true };
  if (fullPage) {
    const layout = await send('Page.getLayoutMetrics');
    const size = layout.cssContentSize;
    captureParams.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
  }
  const screenshot = await send('Page.captureScreenshot', captureParams);
  fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved ${output}`);
  ws.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
