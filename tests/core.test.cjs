const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('rejects blank and oversized text without truncating valid source', () => {
  assert.throws(() => core.validateText('  '), /文字/);
  assert.throws(() => core.validateText('a'.repeat(4001)), /4,000/);
  assert.equal(core.validateText(' USD 12.50\n型号 A-01 🙂 '), ' USD 12.50\n型号 A-01 🙂 ');
});
test('serial queue recovers after a rejected translation', async () => {
  const s = new core.Session(2); const order = [];
  const first = s.enqueue('a', async () => { order.push('a'); throw Error('download failed'); });
  const second = s.enqueue('b', async () => { order.push('b'); return '乙'; });
  await assert.rejects(first, /download failed/);
  assert.equal(await second, '乙'); assert.deepEqual(order, ['a', 'b']);
});
test('chat reset rejects late results and queued work never starts', async () => {
  const s = new core.Session(); let release; let ran = false;
  const token = s.token();
  const first = s.enqueue('a', () => new Promise(resolve => { release = resolve; }));
  await Promise.resolve();
  const queued = s.enqueue('b', async () => { ran = true; return 'B'; });
  const checked = Promise.all([assert.rejects(first, { name: 'StaleError' }), assert.rejects(queued, { name: 'StaleError' })]);
  s.reset(); release('A'); await checked;
  assert.equal(ran, false); assert.equal(s.valid(token), false);
  assert.equal(await s.enqueue('c', async () => 'C'), 'C');
});
test('cache reuses successful work and evicts old text at its limit', async () => {
  const s = new core.Session(2); let calls = 0;
  const work = async () => String(++calls);
  assert.equal(await s.enqueue('a', work), '1');
  assert.equal(await s.enqueue('a', work), '1');
  await s.enqueue('b', work); await s.enqueue('c', work);
  assert.equal(await s.enqueue('a', work), '4');
});
test('reply gate fails after chat, draft or language changes', () => {
  const result = { chat: 'one', draft: '你好', language: 'en', generation: 3 };
  assert.equal(core.sameReply(result, { ...result }), true);
  for (const change of [{ chat: 'two' }, { draft: '再见' }, { language: 'es' }, { generation: 4 }]) {
    assert.equal(core.sameReply(result, { ...result, ...change }), false);
  }
});
test('new chat work starts even if an old chat translation has not settled', async () => {
  const s = new core.Session(); let release;
  const old = s.enqueue('old', () => new Promise(r => { release = r; }));
  const checked = assert.rejects(old, { name: 'StaleError' }); await Promise.resolve();
  s.reset(); let began = false;
  const fresh = s.enqueue('new', async () => { began = true; return 'new'; });
  await Promise.resolve(); await Promise.resolve(); assert.equal(began, true);
  assert.equal(await fresh, 'new'); release('old'); await checked;
});
