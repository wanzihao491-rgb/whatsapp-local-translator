const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const layout = require('../panel-layout.js');
test('drag positions remain inside the visible viewport including short windows', () => {
  assert.deepEqual(layout.clamp(-20, 900, 308, 460, 1000, 700), { x:12, y:228 });
  assert.deepEqual(layout.clamp(700, -3, 308, 200, 1000, 400), { x:680, y:12 });
});
test('dragging the title changes panel position but clicking its button does not drag', () => {
  const dom = new JSDOM('<div id="host"><header><span>Title</span><button>Collapse</button></header></div>');
  try {
    const w=dom.window, host=w.document.querySelector('#host'), header=host.querySelector('header');
    host.getBoundingClientRect=()=>({left:host.style.left?parseFloat(host.style.left):500,top:host.style.top?parseFloat(host.style.top):70,width:308,height:460});
    layout.attach(host,header);
    header.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:520,clientY:90,button:0}));
    header.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:320,clientY:150}));
    header.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:320,clientY:150}));
    assert.equal(host.style.left,'300px'); assert.equal(host.style.top,'130px');
    header.querySelector('button').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:1,clientY:1,button:0}));
    header.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:50,clientY:50}));
    assert.equal(host.style.left,'300px');
  } finally { dom.window.close(); }
});
