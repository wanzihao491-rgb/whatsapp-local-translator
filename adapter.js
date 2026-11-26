(function (scope) {
  'use strict';
  const identities = new WeakMap(); const observations = new WeakMap(); let sequence = 0;
  function identity(node) { if (!identities.has(node)) identities.set(node, ++sequence); return identities.get(node); }
  function bodyText(node) {
    if (!node) return '';
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[data-wat-owned], [data-testid="quoted-message"], [data-testid="quoted-message-text"], script, style').forEach(n => n.remove());
    copy.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
    return (copy.textContent || '').trim();
  }
  function getChat(doc) {
    const root = doc.querySelector('#main');
    const header = root?.querySelector('header');
    if (!root || !header) return null;
    const ids = [...root.querySelectorAll('[data-id]')].map(n => n.getAttribute('data-id')).filter(Boolean);
    const peer = ids.map(id => /^(?:true|false)_([^_]+)_/.exec(id)?.[1]).find(Boolean) || '';
    const title = header.querySelector('[title]')?.getAttribute('title') || header.textContent.trim();
    const base = `${identity(root)}:${identity(header)}:${title}`;
    const previous = observations.get(root);
    const sameBase = previous?.base === base;
    const peerChanged = sameBase && previous.peer && peer && previous.peer !== peer;
    const emptied = sameBase && previous.ids.size > 0 && ids.length === 0;
    const disjoint = sameBase && (!peer || !previous.peer) && previous.ids.size && ids.length && !ids.some(id => previous.ids.has(id));
    const generation = previous ? previous.generation + (peerChanged || emptied || disjoint ? 1 : 0) : 0;
    // Learning the peer from the first message is not a chat switch. Losing all
    // messages is conservative invalidation, even when the display name repeats.
    observations.set(root, { base, generation, peer: peer || (sameBase ? previous.peer : ''), ids: new Set(ids) });
    return { root, key: `${base}:${generation}` };
  }
  function messages(root) {
    if (!root) return [];
    const candidates = [...root.querySelectorAll('.message-in, .message-out, [data-testid="msg-container"]')]
      .filter(n => !n.closest('footer, [data-wat-owned]'));
    const nodes = candidates.filter(n => !candidates.some(other => other !== n && other.contains(n)));
    let direction = null;
    return nodes.flatMap(node => {
      const id = node.getAttribute('data-id') || node.closest('[data-id]')?.getAttribute('data-id') || `node-${identity(node)}`;
      // New WhatsApp versions no longer use message-in/out or a direction in
      // data-id. Bubble tail markers identify the first message of each group.
      if (node.matches('.message-out') || /^true_/.test(id) || node.querySelector('[data-icon="tail-out"], [data-testid="tail-out"]')) direction = 'out';
      else if (node.matches('.message-in') || /^false_/.test(id) || node.querySelector('[data-icon="tail-in"], [data-testid="tail-in"]')) direction = 'in';
      if (!direction) return [];
      const bodies = [...node.querySelectorAll('.selectable-text.copyable-text, [data-testid="selectable-text"], [data-testid="msg-text"], .selectable-text')]
        .filter(n => !n.closest('[data-wat-owned], [data-testid="quoted-message"], [data-testid="quoted-message-text"]'));
      // Prefer the outermost selectable body to avoid duplicates for nested spans.
      const body = bodies.find(n => !bodies.some(other => other !== n && other.contains(n)));
      const text = bodyText(body);
      if (!body || !text) return [];
      const mount = body.closest('[data-pre-plain-text]') || body.parentElement;
      return [{ node, body, mount, text, id, direction }];
    });
  }
  function matches(message) {
    return message.node.isConnected && message.body.isConnected && message.node.contains(message.body) &&
      bodyText(message.body) === message.text &&
      (message.node.getAttribute('data-id') || message.node.closest('[data-id]')?.getAttribute('data-id') || `node-${identity(message.node)}`) === message.id;
  }
  function composer(root) {
    const found = root?.querySelectorAll('footer [contenteditable="true"][role="textbox"]');
    return found?.length === 1 ? found[0] : null;
  }
  function isEmpty(editor) {
    return !!editor && !editor.textContent.trim() && !editor.querySelector('img, video, audio, canvas, svg, [data-lexical-decorator], [contenteditable="false"]');
  }
  function fill(editor, text) {
    if (!editor?.isConnected) throw new Error('没有找到当前聊天的输入框，请复制译文');
    if (!isEmpty(editor)) throw new Error('WhatsApp 已有草稿，请保留原稿并复制译文手动处理');
    if (!text.trim()) throw new Error('译文为空');
    const doc = editor.ownerDocument; editor.focus();
    const range = doc.createRange(); range.selectNodeContents(editor); range.collapse(false);
    const selection = doc.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    if (typeof doc.execCommand !== 'function' || !doc.execCommand('insertText', false, text)) {
      // Text-only fallback for browsers without editing commands. Never generates keyboard events.
      editor.textContent = text;
      editor.dispatchEvent(new doc.defaultView.InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
    if (editor.textContent.trim() !== text.trim()) throw new Error('输入框未能完整接收译文，请检查或复制译文');
  }
  const api = { getChat, messages, matches, composer, isEmpty, fill, bodyText };
  scope.WATAdapter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
