import { frame, listen } from './shared.js';
import { shuffle } from '../rules.js';
import { get, set, record } from '../store.js';
const symbols = ['✿','★','☀','♠','♫','◆','☂','☾','♥','✦','♣','⚑','☁','✚','●','▲','⚓','☕'];
export function mount(root, ctx) {
  const saved = get('memory-size',8);
  let pairs = [8,12,18].includes(saved)?saved:8, deck, selected=[], matches=0, moves=0, seconds=0, running=false, paused=false, locked=false, timer, flipTimer, completed=false;
  const events=listen();
  const ui=frame(root,{ stats:[['Moves',0,'moves'],['Time','0:00','time'],['Best','—','best']],options:'<label>Board size <select id="size"><option value="8">Easy · 4 × 4</option><option value="12">Medium · 6 × 4</option><option value="18">Hard · 6 × 6</option></select></label>', body:'<div class="memory-board" id="game-board" aria-label="Memory card board"></div>', controls:'<button id="game-start" class="button secondary">Pause</button>',note:'Find the pairs. Take your time. You’ve got this.'},ctx);
  const board=ui.el('#game-board'), pauseButton=ui.el('#game-start');
  function draw() {
    board.style.setProperty('--columns',pairs===8?4:6);
    board.innerHTML=deck.map((symbol,i)=>`<button class="memory-card" data-index="${i}" aria-label="Card ${i+1}, face down" aria-pressed="false"><span class="card-back" aria-hidden="true">✦</span><span class="card-front" aria-hidden="true">${symbol}</span></button>`).join('');
  }
  function stop() { clearInterval(timer); timer=null; }
  function startTimer() { stop(); timer=setInterval(()=>{ if(running&&!paused){seconds++;ui.stat('time',`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);}},1000); }
  function best() { ui.stat('best',get('best:memory-'+pairs,'—')); }
  function restart() {
    stop();clearTimeout(flipTimer);deck=shuffle([...symbols.slice(0,pairs),...symbols.slice(0,pairs)]);selected=[];matches=0;moves=0;seconds=0;running=false;paused=false;locked=false;completed=false;
    ui.stat('moves',0);ui.stat('time','0:00');best();ui.say('Choose two cards to find a pair.');pauseButton.textContent='Pause';pauseButton.disabled=false;draw();
  }
  function pause() { if(paused||completed||!running)return;paused=true;pauseButton.textContent='Resume';const cover=document.createElement('div');cover.className='memory-pause board-overlay';cover.innerHTML='<h2>A little breather.</h2><p>Your cards are waiting.</p>';board.append(cover);ui.say('Game paused. Select Resume to continue.'); }
  function resume() { paused=false;board.querySelector('.memory-pause')?.remove();pauseButton.textContent='Pause';ui.say('Game resumed.'); }
  events.on(board,'click',e=>{
    const button=e.target.closest('[data-index]');if(!button||paused||locked||button.classList.contains('flipped')||completed)return;
    if(!running){running=true;startTimer();}ctx.sound();const i=Number(button.dataset.index);selected.push(i);button.classList.add('flipped');button.setAttribute('aria-pressed','true');button.setAttribute('aria-label',`Card ${i+1}: ${deck[i]}`);
    if(selected.length<2)return;
    moves++;ui.stat('moves',moves);const [a,b]=selected;
    if(deck[a]===deck[b]) {
      selected.forEach(index=>{const el=board.querySelector(`[data-index="${index}"]`);el.classList.add('matched');el.setAttribute('aria-disabled','true');el.setAttribute('aria-label',`Card ${index+1}: ${deck[index]}, matched`);});matches++;selected=[];ctx.sound('win');ui.say(`Pair found! ${matches} of ${pairs} pairs matched.`);
      if(matches===pairs){completed=true;running=false;stop();const fresh=record('memory-'+pairs,moves,true);best();pauseButton.disabled=true;ui.say(`${fresh?'New personal best! ':''}All pairs found in ${moves} moves and ${seconds} seconds. Play again with the restart button.`);}
    } else {locked=true;ui.say('Not a match. Remember those positions.');flipTimer=setTimeout(()=>{[a,b].forEach(index=>{const el=board.querySelector(`[data-index="${index}"]`);if(el){el.classList.remove('flipped');el.setAttribute('aria-pressed','false');el.setAttribute('aria-label',`Card ${index+1}, face down`);}});selected=[];locked=false;},850);}
  });
  ui.el('#size').value=pairs;
  // A changed size applies only after an explicit restart, preserving the current game.
  events.on(ui.el('#size'),'change',e=>{const next=Number(e.target.value);e.target.value=pairs;if(running||moves>0){ctx.toast('Restart this game first to change the board size.');return;}pairs=next;set('memory-size',pairs);e.target.value=pairs;restart();});
  events.on(pauseButton,'click',()=>paused?resume():pause());
  restart();
  return {restart,pause,isPlaying:()=>running||moves>0&&!completed,destroy:()=>{stop();clearTimeout(flipTimer);events.destroy();}};
}
