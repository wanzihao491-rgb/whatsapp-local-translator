(function(scope) {
  'use strict';
  function clamp(x, y, width, height, viewportWidth, viewportHeight) {
    return { x:Math.max(12,Math.min(x,Math.max(12,viewportWidth-width-12))), y:Math.max(12,Math.min(y,Math.max(12,viewportHeight-height-12))) };
  }
  function attach(host, handle, save = () => {}) {
    const view=host.ownerDocument.defaultView; let drag=null, moved=false;
    function position(x,y) {
      const rect=host.getBoundingClientRect(); const next=clamp(x,y,rect.width,rect.height,view.innerWidth,view.innerHeight);
      host.style.left=`${next.x}px`; host.style.top=`${next.y}px`; host.style.right='auto'; host.style.bottom='auto'; return next;
    }
    function reflow() { const rect=host.getBoundingClientRect(); return position(rect.left,rect.top); }
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0 || event.target.closest('button, input, select, textarea, a')) return;
      const rect=host.getBoundingClientRect(); drag={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,id:event.pointerId}; moved=false;
      handle.setPointerCapture?.(event.pointerId); handle.classList.add('dragging'); event.preventDefault();
    });
    handle.addEventListener('pointermove',event=>{
      if(!drag) return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
      position(drag.left+dx,drag.top+dy);
    });
    function end() {
      if(!drag) return;
      if(handle.hasPointerCapture?.(drag.id)) handle.releasePointerCapture(drag.id);
      drag=null; handle.classList.remove('dragging'); if(moved) save(reflow());
    }
    handle.addEventListener('pointerup',end); handle.addEventListener('pointercancel',end);
    handle.addEventListener('keydown',event=>{
      if(event.target!==handle || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      const rect=host.getBoundingClientRect(),step=event.shiftKey?40:16;
      save(position(rect.left+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),rect.top+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)));
      event.preventDefault();
    });
    view.addEventListener('resize',reflow);
    if(view.ResizeObserver) { const observer=new view.ResizeObserver(reflow); observer.observe(host); view.addEventListener('pagehide',()=>observer.disconnect(),{once:true}); }
    return {position,reflow};
  }
  const api={clamp,attach}; scope.WATPanelLayout=api; if(typeof module!=='undefined') module.exports=api;
})(globalThis);
