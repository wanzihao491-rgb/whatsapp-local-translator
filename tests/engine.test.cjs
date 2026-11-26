const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../core.js');
const { Engine } = require('../engine.js');
test('preparation starts during click and a download failure can be retried', async () => {
  let started = false; let fail = true;
  const engine = new Engine({ create() { started = true; return fail ? Promise.reject(Error('offline')) : Promise.resolve({ translate: async t => `译:${t}`, destroy() {} }); } });
  const preparation = engine.prepare('en', 'zh'); assert.equal(started, true);
  await assert.rejects(preparation, /offline/); fail = false;
  await engine.prepare('en', 'zh'); assert.equal(await engine.translate('Hi', 'en', 'zh'), '译:Hi');
});
test('translation never implicitly downloads a missing language pack', async () => {
  const engine = new Engine({ create() { throw Error('must not create'); } });
  await assert.rejects(engine.translate('Hi', 'en', 'zh'), /准备/);
});
test('changing language destroys a late preparation result', async () => {
  let resolve; let destroyed = false;
  const engine = new Engine({ create() { return new Promise(r => { resolve = r; }); } });
  const result = engine.prepare('en', 'zh'); const checked = assert.rejects(result, { name: 'StaleError' });
  engine.clear(); resolve({ translate() {}, destroy() { destroyed = true; } });
  await checked; assert.equal(destroyed, true); assert.equal(engine.ready('en', 'zh'), false);
});
test('cancelling current translation keeps downloaded language pair reusable', async () => {
  const engine = new Engine({ create() { return Promise.resolve({ translate(text, options) {
    return text === 'slow' ? new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))) : Promise.resolve('新结果');
  }, destroy() { throw Error('must preserve model'); } }); } });
  await engine.prepare('en', 'zh');
  const slow = engine.translate('slow', 'en', 'zh'); const checked = assert.rejects(slow, { name: 'AbortError' });
  engine.cancelTranslations(); await checked;
  assert.equal(engine.ready('en', 'zh'), true);
  assert.equal(await engine.translate('new', 'en', 'zh'), '新结果');
});
