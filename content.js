(function () {
  'use strict';
  if (document.querySelector('#wat-panel-host')) return;
  const C = globalThis.WATCore, A = globalThis.WATAdapter;
  const engine = new globalThis.WATEngine.Engine();
  const session = new C.Session(100);
  const host = document.createElement('div'); host.id = 'wat-panel-host'; host.dataset.watOwned = 'panel';
  host.style.cssText = 'position:fixed;right:18px;top:76px;z-index:2147483000;max-width:calc(100vw - 24px);';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style'); style.textContent = globalThis.WATStyles; shadow.append(style);
  const shell = document.createElement('div');
  shell.innerHTML = `<button id="launcher" hidden>聊天翻译</button><div class="panel"><header id="drag-handle" class="drag-handle" tabindex="0" aria-label="翻译面板标题栏，可拖动或用方向键移动"><span class="mark" aria-hidden="true">译</span><div><h1>WhatsApp 聊天翻译</h1><div class="sub">按住标题栏拖动 · 本地翻译</div></div><button id="collapse" class="close" aria-label="收起翻译面板">−</button></header><div class="content">
  <label for="language">客户使用的语言</label><select id="language"><option value="en">英语 English</option><option value="es">西班牙语 Español</option><option value="pt">葡萄牙语 Português</option><option value="fr">法语 Français</option><option value="de">德语 Deutsch</option><option value="ar">阿拉伯语 العربية</option><option value="ru">俄语 Русский</option><option value="ja">日语 日本語</option><option value="ko">韩语 한국어</option></select>
  <div class="row prepare"><button id="prepare-read">准备：消息 → 中文</button><button id="prepare-reply">准备：中文 → 回复</button></div>
  <div id="pack-status" class="status" role="status">首次使用请准备两个方向的语言包。</div>
  <div class="eyebrow">READ MESSAGES</div><button id="batch" class="wide">翻译当前聊天 · 最多 30 条</button><label class="check"><input type="checkbox" id="auto">自动翻译双方消息（当前及新消息）</label><div id="chat-status" class="hint"></div>
  <details><summary>粘贴文字，手动译为中文</summary><label for="manual" class="sub">外语原文</label><textarea id="manual" maxlength="4000" dir="auto" placeholder="也可粘贴单条消息到这里"></textarea><button id="manual-translate" class="wide">译为中文</button><textarea id="manual-result" dir="auto" aria-label="中文译文" readonly hidden></textarea></details>
  <hr><div class="eyebrow">WRITE A REPLY</div><label for="draft">用中文写回复</label><textarea id="draft" maxlength="4000" placeholder="例如：您好，样品预计周五寄出。" dir="auto"></textarea><button id="reply-translate" class="primary wide" style="margin-top:8px">翻译回复</button>
  <div id="preview-group" hidden><label for="preview" style="margin-top:12px">译文预览 <span class="badge">可编辑</span></label><textarea id="preview" dir="auto"></textarea><div class="row actions"><button id="copy">复制译文</button><button id="fill" class="primary" disabled>填入 WhatsApp</button></div></div>
  <div id="feedback" class="status" role="status" aria-live="polite"></div></div><div class="privacy">原文保留 · 不自动发送<br>首次下载语言包需要联网，翻译使用浏览器本地模型。</div></div>`;
  shadow.append(shell); document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  const panelLayout=globalThis.WATPanelLayout.attach(host,$('drag-handle'),position=>{
    try { chrome.storage.local.set({panelPosition:position}); } catch { /* Standalone demo. */ }
  });
  let chat = null, language = 'en', entries = new WeakMap(), currentMessages = [], lastTail = null;
  let reply = null, replyVersion = 0, replyRequest = 0, manualVersion = 0, busyReply = false, batchVersion = 0;
  const preparing = new Set();
  const report = (text, error = false) => { $('feedback').textContent = text; $('feedback').classList.toggle('error', error); };
  function errorText(error) {
    if (error.name === 'AbortError') return '操作已取消或超时，请检查网络后重新准备语言包。';
    if (error.name === 'NotAllowedError') return '浏览器未允许下载，请在此页面再次点击“准备”按钮。';
    if (error.name === 'NotSupportedError') return '此语言对暂不受浏览器支持，请换一种客户语言。';
    return error.message || '本地翻译失败，请重试';
  }
  function updatePacks() {
    const read = engine.ready(language, 'zh'), write = engine.ready('zh', language);
    $('prepare-read').textContent = read ? '消息 → 中文 · 已就绪' : '准备：消息 → 中文';
    $('prepare-reply').textContent = write ? '中文 → 回复 · 已就绪' : '准备：中文 → 回复';
    $('prepare-read').disabled = read || preparing.has('read'); $('prepare-reply').disabled = write || preparing.has('reply');
    if (!preparing.size) $('pack-status').textContent = read && write ? '本地语言包已就绪，可以开始翻译。' : '首次使用请准备两个方向的语言包。';
  }
  function prepare(direction) {
    const selected = language; preparing.add(direction); updatePacks();
    $('pack-status').textContent = '正在准备本地语言包，首次可能需要几分钟…';
    $('pack-status').classList.remove('error');
    const source = direction === 'read' ? selected : 'zh'; const target = direction === 'read' ? 'zh' : selected;
    // Nothing asynchronous before create: preserve the button's activation.
    engine.prepare(source, target, percent => {
      if (language === selected) $('pack-status').textContent = `正在下载本地语言包 · ${percent}%`;
    }).then(() => {
      if (language !== selected) return;
      preparing.delete(direction); updatePacks();
    }, error => {
      if (language !== selected) return;
      preparing.delete(direction); updatePacks();
      $('pack-status').textContent = errorText(error); $('pack-status').classList.add('error');
    });
  }
  $('prepare-read').onclick = () => prepare('read'); $('prepare-reply').onclick = () => prepare('reply');
  function invalidateReply() {
    replyVersion++; reply = null; $('preview').value = ''; $('preview-group').hidden = true; $('fill').disabled = true;
  }
  function context() { return { chat: A.getChat(document)?.key || null, draft: $('draft').value, language, generation: session.token() }; }
  function clearMessages() {
    document.querySelectorAll('[data-wat-message]').forEach(n => n.remove()); entries = new WeakMap(); currentMessages = []; lastTail = null;
  }
  function scan() {
    const next = A.getChat(document);
    if ((next?.key || null) !== (chat?.key || null)) {
      session.reset(); engine.cancelTranslations(); batchVersion++; invalidateReply(); manualVersion++;
      replyRequest++; busyReply = false; $('reply-translate').disabled = false; $('manual-translate').disabled = false;
      $('manual').value = ''; $('manual-result').value = ''; $('manual-result').hidden = true;
      $('auto').checked = false; clearMessages();
      if (chat) { $('draft').value = ''; report('已切换聊天；自动翻译已关闭，旧译文已清理。'); }
    }
    chat = next;
    $('chat-status').textContent = chat ? '译文显示在双方消息下方，原文保持不变。' : '打开一个 WhatsApp 聊天，或粘贴文字手动翻译。';
    $('batch').disabled = !chat; $('auto').disabled = !chat;
    $('fill').disabled = !chat || !C.sameReply(reply, context()) || !$('preview').value.trim();
    const messages = A.messages(chat?.root);
    if (chat) $('chat-status').textContent = messages.length ? `已识别 ${messages.length} 条文字消息（收 ${messages.filter(m => m.direction === 'in').length} / 发 ${messages.filter(m => m.direction === 'out').length}），译文显示在原文下方。` : '当前没有可识别的文字消息，可展开粘贴翻译。';
    const previousTail = lastTail;
    currentMessages = messages.map(message => {
      let entry = entries.get(message.node);
      if (entry && (!entry.host.isConnected || !message.node.contains(entry.host) || !A.matches(entry.message) || entry.language !== language)) { entry.host.remove(); entry = null; }
      if (!entry) {
        const messageHost = document.createElement('div'); messageHost.dataset.watOwned = 'message'; messageHost.dataset.watMessage = ''; messageHost.dataset.watDirection = message.direction;
        const messageShadow = messageHost.attachShadow({ mode: 'open' });
        const css = document.createElement('style'); css.textContent = globalThis.WATStyles;
        const box = document.createElement('div'); box.className = 'message';
        const button = document.createElement('button'); button.textContent = '译为中文';
        const translation = document.createElement('div'); translation.className = 'translation'; translation.dir = 'auto'; translation.setAttribute('role', 'status');
        box.append(button, translation); messageShadow.append(css, box); message.mount.append(messageHost);
        entry = { message, host: messageHost, button, translation, language, status: 'idle' };
        button.onclick = () => { scan(); translateEntry(entry).catch(() => {}); }; entries.set(message.node, entry);
      }
      return entry;
    });
    lastTail = messages.at(-1)?.id || null;
    if ($('auto').checked && previousTail !== lastTail) {
      const index = previousTail ? currentMessages.findIndex(e => e.message.id === previousTail) : -1;
      if (!previousTail || index >= 0) currentMessages.slice(index + 1).filter(e => e.status === 'idle').forEach(e => translateEntry(e).catch(() => {}));
    }
  }
  async function translateEntry(entry) {
    if (entry.status === 'working' || entry.status === 'done') return;
    const token = session.token(), selected = language, key = chat?.key;
    const valid = () => session.valid(token) && language === selected && A.getChat(document)?.key === key && A.matches(entry.message) && entry.host.isConnected;
    if (!valid()) return;
    entry.status = 'working'; entry.button.disabled = true; entry.translation.classList.remove('error'); entry.translation.textContent = '正在本地翻译…';
    try {
      C.validateText(entry.message.text);
      const text = await session.enqueue(`${selected}:zh:${entry.message.text}`, () => engine.translate(entry.message.text, selected, 'zh'), token);
      if (!valid()) return;
      entry.translation.textContent = text; entry.button.textContent = '中文译文 · 本地'; entry.status = 'done';
    } catch (error) {
      if (valid()) { entry.translation.textContent = errorText(error); entry.translation.classList.add('error'); entry.button.textContent = '重试翻译'; entry.status = 'idle'; }
      throw error;
    } finally { if (entry.host.isConnected) entry.button.disabled = entry.status === 'done'; }
  }
  async function translateBatch(automatic = false) {
    scan(); const version = ++batchVersion; const batch = currentMessages.filter(e => e.status !== 'done').slice(-30);
    if (!batch.length) { report('当前没有待翻译的文字消息。'); return; }
    $('batch').disabled = true; let done = 0, failed = 0;
    for (const entry of batch) {
      if (version !== batchVersion || (automatic && !$('auto').checked)) break;
      try { await translateEntry(entry); if (entry.status === 'done') done++; else failed++; } catch { failed++; }
      if (version === batchVersion) report(`已处理 ${done + failed}/${batch.length} 条${failed ? `，${failed} 条未完成，可单独重试` : ''}`);
    }
    if (version === batchVersion) $('batch').disabled = !chat;
  }
  $('batch').onclick = () => translateBatch(false);
  $('auto').onchange = () => {
    if ($('auto').checked && !engine.ready(language, 'zh')) { $('auto').checked = false; report('请先准备“消息 → 中文”语言包。', true); }
    lastTail = A.messages(chat?.root).at(-1)?.id || null;
    if ($('auto').checked) translateBatch(true);
  };
  $('draft').oninput = () => { invalidateReply(); report(''); };
  $('reply-translate').onclick = async () => {
    if (busyReply) return; scan(); invalidateReply();
    const captured = context(), version = replyVersion, request = ++replyRequest;
    try {
      C.validateText(captured.draft); busyReply = true; $('reply-translate').disabled = true; report('正在本地翻译回复…');
      const result = await session.enqueue(`zh:${captured.language}:${captured.draft}`, () => engine.translate(captured.draft, 'zh', captured.language));
      if (version !== replyVersion || !C.sameReply(captured, context())) return;
      reply = captured; $('preview').value = result; $('preview-group').hidden = false;
      $('fill').disabled = !chat; report('请核对译文；填入后仍需你手动发送。');
    } catch (error) { if (version === replyVersion) report(errorText(error), true); }
    finally { if (request === replyRequest) { busyReply = false; $('reply-translate').disabled = false; } }
  };
  $('preview').oninput = () => { $('fill').disabled = !chat || !C.sameReply(reply, context()) || !$('preview').value.trim(); };
  $('fill').onclick = () => {
    scan();
    if (!reply || !C.sameReply(reply, context())) { report('聊天或原稿已变化，请重新翻译。', true); return; }
    try { A.fill(A.composer(chat?.root), C.validateText($('preview').value)); report('已填入 WhatsApp，尚未发送。请核对后手动发送。'); }
    catch (error) { report(errorText(error), true); }
  };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText($('preview').value); report('译文已复制。'); }
    catch { $('preview').focus(); $('preview').select(); report('未获得剪贴板权限，已选中译文，请按 Ctrl+C。', true); }
  };
  $('manual').oninput = () => { manualVersion++; $('manual-result').value = ''; $('manual-result').hidden = true; };
  $('manual-translate').onclick = async () => {
    const text = $('manual').value, selected = language, version = ++manualVersion;
    try {
      C.validateText(text); $('manual-translate').disabled = true; report('正在本地翻译…');
      const translated = await session.enqueue(`${selected}:zh:${text}`, () => engine.translate(text, selected, 'zh'));
      if (version !== manualVersion || selected !== language || text !== $('manual').value) return;
      $('manual-result').value = translated; $('manual-result').hidden = false; report('中文译文已生成。');
    } catch (error) { if (version === manualVersion) report(errorText(error), true); }
    finally { $('manual-translate').disabled = false; }
  };
  $('language').onchange = () => {
    language = $('language').value; session.reset(); engine.clear(); preparing.clear(); batchVersion++; invalidateReply(); manualVersion++;
    replyRequest++; busyReply = false; $('reply-translate').disabled = false; $('manual-translate').disabled = false;
    $('manual-result').value = ''; $('manual-result').hidden = true; $('auto').checked = false;
    clearMessages(); updatePacks(); scan(); report('已切换客户语言，请准备对应语言包。');
    try { chrome.storage.local.set({ language }); } catch { /* Standalone demo has no extension storage. */ }
  };
  $('collapse').onclick = () => { shadow.querySelector('.panel').hidden = true; $('launcher').hidden = false; panelLayout.reflow(); };
  $('launcher').onclick = () => { shadow.querySelector('.panel').hidden = false; $('launcher').hidden = true; panelLayout.reflow(); };
  let scheduled;
  const observer = new MutationObserver(records => {
    const meaningful = records.some(r => {
      if (r.target.nodeType === 1 && r.target.closest('[data-wat-owned]')) return false;
      if (r.type === 'childList') {
        const nodes = [...r.addedNodes];
        if (!r.removedNodes.length && nodes.length && nodes.every(n => n.nodeType === 1 && n.hasAttribute('data-wat-owned'))) return false;
      }
      return true;
    });
    if (meaningful) { clearTimeout(scheduled); scheduled = setTimeout(scan, 40); }
  });
  observer.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-id', 'title'] });
  window.addEventListener('pagehide', () => { observer.disconnect(); clearTimeout(scheduled); session.reset(); engine.clear(); }, { once: true });
  try {
    chrome.storage.local.get(['language','panelPosition']).then(prefs => {
      if (prefs.language && [...$('language').options].some(o => o.value === prefs.language)) {
        language = prefs.language; $('language').value = language; updatePacks();
      }
      if(Number.isFinite(prefs.panelPosition?.x) && Number.isFinite(prefs.panelPosition?.y)) panelLayout.position(prefs.panelPosition.x,prefs.panelPosition.y);
    }).catch(() => {});
  } catch { /* Demo / unit-test environment. */ }
  updatePacks(); scan();
})();
