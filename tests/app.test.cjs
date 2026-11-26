const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(r => setTimeout(r, 30));
async function app(count = 1) {
  const dom = new JSDOM(`<div id="main"><header><span title="Alex">Alex</span></header><section>${Array.from({ length: count }, (_, i) => `<div class="message-in" data-id="false_alex_${i}"><span class="selectable-text copyable-text">Body ${i}</span></div>`).join('')}</section><footer><div role="textbox" contenteditable="true"></div><button id="send">Send</button></footer></div>`, { runScripts: 'outside-only', url: 'https://web.whatsapp.com' });
  const w = dom.window; let resolveTranslation; let deferred = false;
  for (const f of ['core.js', 'adapter.js', 'styles.js', 'panel-layout.js']) w.eval(readFileSync(require.resolve('../' + f), 'utf8'));
  w.WATEngine = { Engine: class {
    ready() { return true; } prepare() { return Promise.resolve(); } clear() {} cancelTranslations() {}
    translate(text) { return deferred ? new Promise(r => { resolveTranslation = r; }) : Promise.resolve('译文 <b>文字</b> ' + text); }
  } };
  w.eval(readFileSync(require.resolve('../content.js'), 'utf8'));
  await tick();
  return { dom, w, panel: w.document.querySelector('#wat-panel-host').shadowRoot, defer() { deferred = true; }, resolve(text) { resolveTranslation(text); } };
}
test('batch caps at 30 and renders translated text without executing HTML', async () => {
  const a = await app(35);
  try {
    a.panel.querySelector('#batch').click(); await tick(); await tick();
    const hosts = [...a.w.document.querySelectorAll('[data-wat-message]')];
    assert.equal(hosts.filter(h => h.shadowRoot.querySelector('.translation').textContent).length, 30);
    assert.equal(hosts[0].shadowRoot.querySelector('.translation b'), null);
    assert.equal(a.w.document.querySelector('.selectable-text').textContent, 'Body 0');
  } finally { a.dom.window.close(); }
});
test('editing reply during translation makes late result unusable', async () => {
  const a = await app();
  try {
    a.defer(); const draft = a.panel.querySelector('#draft'); draft.value = '原稿'; draft.dispatchEvent(new a.w.Event('input'));
    a.panel.querySelector('#reply-translate').click(); await tick();
    draft.value = '新稿'; draft.dispatchEvent(new a.w.Event('input')); a.resolve('旧译文'); await tick();
    assert.equal(a.panel.querySelector('#fill').disabled, true);
    assert.equal(a.panel.querySelector('#preview').value, '');
    assert.equal(a.panel.querySelector('#reply-translate').disabled, false);
  } finally { a.dom.window.close(); }
});
test('chat switching disables automatic translation and invalidates fill', async () => {
  const a = await app();
  try {
    a.panel.querySelector('#auto').checked = true; a.panel.querySelector('#auto').dispatchEvent(new a.w.Event('change'));
    const draft = a.panel.querySelector('#draft'); draft.value = '你好'; draft.dispatchEvent(new a.w.Event('input'));
    a.panel.querySelector('#reply-translate').click(); await tick();
    assert.equal(a.panel.querySelector('#fill').disabled, false);
    a.w.document.querySelector('header span').setAttribute('title', 'Other');
    await tick(); await tick();
    assert.equal(a.panel.querySelector('#auto').checked, false);
    assert.equal(a.panel.querySelector('#fill').disabled, true);
  } finally { a.dom.window.close(); }
});
test('fill inserts text but existing draft and send button are untouched', async () => {
  const a = await app();
  try {
    let sent = 0; a.w.document.querySelector('#send').onclick = () => sent++;
    const draft = a.panel.querySelector('#draft'); draft.value = '你好'; draft.dispatchEvent(new a.w.Event('input'));
    a.panel.querySelector('#reply-translate').click(); await tick();
    const editor = a.w.document.querySelector('[contenteditable]'); editor.textContent = 'Existing';
    a.panel.querySelector('#fill').click(); assert.equal(editor.textContent, 'Existing');
    editor.textContent = ''; a.panel.querySelector('#fill').click();
    assert.equal(editor.textContent, '译文 <b>文字</b> 你好'); assert.equal(sent, 0);
  } finally { a.dom.window.close(); }
});
test('automatic translation includes first incoming text in an empty chat', async () => {
  const a = await app(0);
  try {
    a.panel.querySelector('#auto').checked = true; a.panel.querySelector('#auto').dispatchEvent(new a.w.Event('change'));
    const node = a.w.document.createElement('div'); node.className = 'message-in'; node.dataset.id = 'false_alex_new';
    node.innerHTML = '<span class="selectable-text copyable-text">First message</span>'; a.w.document.querySelector('section').append(node);
    await tick(); await tick();
    assert.equal(node.querySelector('[data-wat-message]').shadowRoot.querySelector('.translation').textContent, '译文 <b>文字</b> First message');
  } finally { a.dom.window.close(); }
});
test('turning on automatic mode translates already-loaded incoming messages inline', async () => {
  const a = await app(2);
  try {
    a.panel.querySelector('#auto').checked = true; a.panel.querySelector('#auto').dispatchEvent(new a.w.Event('change'));
    await tick(); await tick();
    const texts = [...a.w.document.querySelectorAll('[data-wat-message]')].map(n => n.shadowRoot.querySelector('.translation').textContent);
    assert.deepEqual(texts, ['译文 <b>文字</b> Body 0', '译文 <b>文字</b> Body 1']);
  } finally { a.dom.window.close(); }
});
test('turning automatic off stops the remaining automatically-started batch', async () => {
  const a = await app(3);
  try {
    a.defer(); const toggle = a.panel.querySelector('#auto');
    toggle.checked = true; toggle.dispatchEvent(new a.w.Event('change')); await tick();
    toggle.checked = false; toggle.dispatchEvent(new a.w.Event('change')); a.resolve('First translated');
    await tick(); await tick();
    const hosts = [...a.w.document.querySelectorAll('[data-wat-message]')];
    assert.equal(hosts[0].shadowRoot.querySelector('.translation').textContent, 'First translated');
    assert.equal(hosts[1].shadowRoot.querySelector('.translation').textContent, '');
  } finally { a.dom.window.close(); }
});
test('sent foreign-language bubbles receive an inline Chinese translation including new sent messages', async () => {
  const a = await app(1);
  try {
    const makeSent = (id, text) => {
      const row = a.w.document.createElement('div'); row.dataset.id = id;
      row.innerHTML = '<div data-testid="msg-container"><span data-icon="tail-out"></span><div data-pre-plain-text="sender"><span class="selectable-text copyable-text"></span></div></div>';
      row.querySelector('.selectable-text').textContent = text; a.w.document.querySelector('section').append(row); return row;
    };
    const first = makeSent('true_alex_sent1', 'We will ship on Friday.'); await tick(); await tick();
    const toggle = a.panel.querySelector('#auto'); toggle.checked = true; toggle.dispatchEvent(new a.w.Event('change')); await tick(); await tick();
    assert.equal(first.querySelector('[data-wat-message]').shadowRoot.querySelector('.translation').textContent, '译文 <b>文字</b> We will ship on Friday.');
    assert.equal(first.querySelector('.selectable-text').textContent, 'We will ship on Friday.');
    const second = makeSent('true_alex_sent2', 'Shipping costs USD 35.'); await tick(); await tick();
    assert.equal(second.querySelector('[data-wat-message]').shadowRoot.querySelector('.translation').textContent, '译文 <b>文字</b> Shipping costs USD 35.');
    assert.equal(a.w.document.querySelector('[contenteditable]').textContent, '');
  } finally { a.dom.window.close(); }
});
test('React removing an injected translation control causes it to be remounted', async () => {
  const a = await app();
  try {
    const node = a.w.document.querySelector('.message-in'); node.querySelector('[data-wat-message]').remove();
    await tick(); await tick();
    assert.ok(node.querySelector('[data-wat-message]'));
  } finally { a.dom.window.close(); }
});
test('same-name chat empty transition clears old reply before reused DOM can fill it', async () => {
  const a = await app();
  try {
    a.w.document.querySelector('.message-in').dataset.id = 'm1'; await tick(); await tick();
    a.panel.querySelector('#draft').value = '旧回复'; a.panel.querySelector('#reply-translate').click(); await tick();
    assert.equal(a.panel.querySelector('#fill').disabled, false);
    a.w.document.querySelector('section').replaceChildren(); await tick(); await tick();
    const node = a.w.document.createElement('div'); node.className = 'message-in'; node.dataset.id = 'm2';
    node.innerHTML = '<span class="selectable-text">Other chat</span>'; a.w.document.querySelector('section').append(node); await tick(); await tick();
    assert.equal(a.panel.querySelector('#fill').disabled, true);
    assert.equal(a.panel.querySelector('#preview').value, '');
  } finally { a.dom.window.close(); }
});
