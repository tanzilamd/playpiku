export function frame(root, { stats, options = '', body, controls = '', note = '' }, ctx) {
  root.innerHTML = `<div class="game-toolbar"><div class="game-stats">${stats.map(([label,value,id])=>`<div class="stat"><span>${label}</span><strong id="${id}">${value}</strong></div>`).join('')}</div><button class="icon-button restart-button" aria-label="Restart game" title="Restart game">↻</button></div>${options?`<div class="game-options">${options}</div>`:''}<div class="game-stage">${body}</div><div class="game-controls">${controls}</div>${note?`<p class="game-note">${note}</p>`:''}<div class="game-feedback" role="status" aria-live="polite"></div>`;
  root.querySelector('.restart-button').onclick = ctx.restart;
  return {
    el: selector => root.querySelector(selector),
    stat: (id, value) => { root.querySelector('#' + id).textContent = value; },
    say: message => { root.querySelector('.game-feedback').textContent = message; }
  };
}
export function listen() {
  const controller = new AbortController();
  return { on: (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: controller.signal }), destroy: () => controller.abort() };
}
export function keyboardAllowed(e) { return !document.querySelector('dialog[open]') && !['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(e.target.tagName); }
export function swipe(element, callback, listeners) {
  let origin = null;
  listeners.on(element, 'pointerdown', e => { if (e.pointerType === 'mouse') return; origin = { x:e.clientX, y:e.clientY }; element.setPointerCapture(e.pointerId); });
  listeners.on(element, 'pointerup', e => { if (!origin) return; const dx=e.clientX-origin.x,dy=e.clientY-origin.y; origin=null; if (Math.max(Math.abs(dx),Math.abs(dy))<18) return; callback(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up'); });
  listeners.on(element, 'pointercancel', () => origin=null);
}
export const pad = '<div class="direction-pad" aria-label="Direction controls"><button data-dir="up" aria-label="Move up">↑</button><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move down">↓</button><button data-dir="right" aria-label="Move right">→</button></div>';
export const keyDirections = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', s:'down', a:'left', d:'right' };
export function resultOverlay(board, title, detail, action, label='Play again') {
  board.querySelector('.board-overlay')?.remove();
  const overlay = document.createElement('div'); overlay.className = 'board-overlay';
  const heading = document.createElement('h2'); heading.textContent = title;
  const p = document.createElement('p'); p.textContent = detail;
  const button = document.createElement('button'); button.className='button primary'; button.textContent=label; button.onclick=action;
  overlay.append(heading,p,button); board.append(overlay);
  return overlay;
}
