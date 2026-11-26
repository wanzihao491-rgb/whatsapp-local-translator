const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const adapter = require('../adapter.js');
const fixture = () => new JSDOM(`<div id="main"><header><span title="Customer">Customer</span></header><div class="message-in" data-id="m1"><div data-pre-plain-text="[10:00] Alex: "><div data-testid="quoted-message"><span class="selectable-text">Quoted old text</span></div><span class="selectable-text copyable-text"><span>Price USD 12.50</span><br><span>MOQ 200 🙂</span></span></div></div><div class="message-out" data-id="m2"><span class="selectable-text">Sent</span></div><footer><div contenteditable="true" role="textbox"></div><button aria-label="Send">Send</button></footer></div>`).window.document;

test('extracts both chat directions without quote or sidebar text', () => {
  const doc = fixture(); const messages = adapter.messages(doc.querySelector('#main'));
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, 'Price USD 12.50\nMOQ 200 🙂');
  assert.equal(messages[0].id, 'm1');
  assert.equal(messages[1].text, 'Sent');
  assert.deepEqual(messages.map(m => m.direction), ['in', 'out']);
});
test('modern WhatsApp bubbles use msg-container and tail markers without message-in class', () => {
  const doc = new JSDOM(`<div id="main"><header>Customer</header>
  <div data-id="ABC123"><div data-testid="msg-container"><span data-icon="tail-in"></span><div data-pre-plain-text="sender"><div><span data-testid="selectable-text" class="selectable-text copyable-text">Quote 200 units<br>USD 12.50</span></div></div></div></div>
  <div data-id="DEF456"><div data-testid="msg-container"><span data-testid="tail-out"></span><span class="selectable-text copyable-text">Already sent</span></div></div>
  <footer><div contenteditable="true" role="textbox"><p class="selectable-text copyable-text">Unsent composer</p></div></footer></div>`).window.document;
  const messages = adapter.messages(doc.querySelector('#main'));
  assert.equal(messages.length, 2);
  assert.equal(messages[0].id, 'ABC123'); assert.equal(messages[0].text, 'Quote 200 units\nUSD 12.50');
  assert.equal(messages[1].text, 'Already sent'); assert.equal(messages[1].direction, 'out');
});
test('modern groups preserve both incoming and outgoing directions', () => {
  const doc = new JSDOM(`<div id="main"><header>Customer</header>
  <div data-id="A"><div data-testid="msg-container"><span data-icon="tail-in"></span><span class="selectable-text">First</span></div></div>
  <div data-id="B"><div data-testid="msg-container"><span class="selectable-text">Grouped followup</span></div></div>
  <div data-id="C"><div data-testid="msg-container"><span data-icon="tail-out"></span><span class="selectable-text">Sent</span></div></div></div>`).window.document;
  assert.deepEqual(adapter.messages(doc.querySelector('#main')).map(m => m.text), ['First', 'Grouped followup', 'Sent']);
  assert.deepEqual(adapter.messages(doc.querySelector('#main')).map(m => m.direction), ['in', 'in', 'out']);
});
test('same-name replacement chat has a different identity', () => {
  const doc = fixture(); const first = adapter.getChat(doc);
  const header = doc.querySelector('header'); header.replaceWith(header.cloneNode(true));
  assert.notEqual(adapter.getChat(doc).key, first.key);
});
test('same-name reused header through an empty state invalidates old chat identity', () => {
  const doc = fixture(); const first = adapter.getChat(doc);
  doc.querySelectorAll('.message-in,.message-out').forEach(n => n.remove());
  const empty = adapter.getChat(doc);
  const node = doc.createElement('div'); node.className = 'message-in'; node.dataset.id = 'm9';
  node.innerHTML = '<span class="selectable-text">New conversation</span>'; doc.querySelector('footer').before(node);
  assert.notEqual(empty.key, first.key);
  assert.notEqual(adapter.getChat(doc).key, first.key);
});
test('recycled or removed message fails attachment validation', () => {
  const doc = fixture(); const message = adapter.messages(doc.querySelector('#main'))[0];
  assert.equal(adapter.matches(message), true);
  message.body.textContent = 'Changed';
  assert.equal(adapter.matches(message), false);
  message.node.remove(); assert.equal(adapter.matches(message), false);
});
test('composer protection includes text and rich nontext draft', () => {
  const doc = fixture(); const editor = adapter.composer(doc.querySelector('#main'));
  assert.equal(adapter.isEmpty(editor), true);
  editor.textContent = 'Unsent draft'; assert.equal(adapter.isEmpty(editor), false);
  editor.innerHTML = '<img alt="🙂">'; assert.equal(adapter.isEmpty(editor), false);
});
test('filling preserves nonempty draft and never activates send', () => {
  const doc = fixture(); const root = doc.querySelector('#main'); const editor = adapter.composer(root);
  let sent = 0; doc.querySelector('button').onclick = () => sent++;
  editor.textContent = 'Keep this';
  assert.throws(() => adapter.fill(editor, 'Translated'), /草稿/);
  assert.equal(editor.textContent, 'Keep this'); assert.equal(sent, 0);
});
