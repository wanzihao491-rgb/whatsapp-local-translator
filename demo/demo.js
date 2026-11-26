let number = 3;
document.getElementById('add').onclick = () => {
  const message = document.createElement('div'); message.className = 'message-in'; message.dataset.id = 'false_alex_new' + ++number;
  const body = document.createElement('span'); body.className = 'selectable-text copyable-text'; body.textContent = 'Can you ship the samples by Friday?';
  message.append(body); document.getElementById('messages').append(message);
};
document.getElementById('switch').onclick = () => {
  const header = document.querySelector('#main header'); const copy = header.cloneNode(true);
  copy.querySelector('[title]').setAttribute('title', 'Blake · Another Sample Buyer'); copy.querySelector('[title]').textContent = 'Blake · Another Sample Buyer';
  header.replaceWith(copy); document.getElementById('messages').replaceChildren(); document.querySelector('[contenteditable]').textContent = '';
};
document.getElementById('demo-send').onclick = () => { document.getElementById('demo-status').textContent = '这是演示页，没有发送任何真实消息。'; };
