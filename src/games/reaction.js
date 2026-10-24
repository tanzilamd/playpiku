import { frame, listen, keyboardAllowed } from './shared.js';
import { get, record } from '../store.js';
export function mount(root,ctx){
  let state='idle',times=[],timer,start=0;
  const events=listen();
  const ui=frame(root,{stats:[['Round','1 / 5','round'],['Average','—','average'],['Best',get('best:reaction')===null?'—':`${get('best:reaction')} ms`,'best']],body:'<button class="reaction-panel" id="game-board"><span class="reaction-symbol" aria-hidden="true">ϟ</span><strong>Ready when you are.</strong><span class="reaction-instruction">Tap to start your first round</span></button><div class="round-dots" aria-label="Round results"></div>',controls:'<button class="button secondary" id="reaction-reset">Start over</button>',note:'Five rounds. No rushing the wait. Lower is better.'},ctx);
  const panel=ui.el('#game-board');
  function paint(title,detail,symbol='ϟ'){panel.className='reaction-panel reaction-'+state;panel.innerHTML=`<span class="reaction-symbol" aria-hidden="true">${symbol}</span><strong>${title}</strong><span class="reaction-instruction">${detail}</span>`;ui.say(`${title} ${detail}`);}
  function dots(){ui.el('.round-dots').innerHTML=Array.from({length:5},(_,i)=>`<span class="round-dot ${times[i]!==undefined?'complete':''}">${times[i]!==undefined?times[i]+' ms':i+1}</span>`).join('');}
  function restart(){clearTimeout(timer);times=[];state='idle';ui.stat('round','1 / 5');ui.stat('average','—');dots();paint('Ready when you are.','Tap to start your first round');}
  function begin(){state='waiting';paint('Wait for green…','Hold steady. Don’t tap yet.','•••');timer=setTimeout(()=>{state='go';start=performance.now();paint('GO!','Tap now!','↓');},1600+Math.random()*2800);}
  function click(){
    if(document.querySelector('dialog[open]'))return;
    if(state==='waiting'){clearTimeout(timer);state='early';paint('A little too eager!','No score counted. Tap to retry this round.','↶');return;}
    if(state==='go'){
      const elapsed=Math.round(performance.now()-start);times.push(elapsed);const average=Math.round(times.reduce((a,b)=>a+b,0)/times.length);ui.stat('average',average+' ms');dots();ctx.sound();
      if(times.length===5){state='done';const fresh=record('reaction',average,true);ui.stat('best',get('best:reaction')+' ms');paint(`${average} ms average`,`${fresh?'A new personal best! ':''}Tap to play five more rounds.`,'✦');ctx.sound('win');}
      else{state='result';paint(`${elapsed} ms`,'Nice catch. Tap when you’re ready for the next round.','✓');}return;
    }
    if(state==='done')restart();
    ui.stat('round',`${times.length+1} / 5`);begin();
  }
  function pause(){if(state==='waiting'||state==='go'){clearTimeout(timer);state='interrupted';paint('Take your time.','Round paused. Tap to restart this round.','Ⅱ');}}
  events.on(panel,'click',click);
  events.on(document,'keydown',e=>{if(e.code==='Space'&&!e.repeat&&keyboardAllowed(e)){e.preventDefault();click();}});
  events.on(ui.el('#reaction-reset'),'click',()=>{if(state==='idle'||state==='done')restart();else ctx.restart();});
  restart();return {restart,pause,isPlaying:()=>times.length>0&&state!=='done'||state==='waiting'||state==='go',destroy:()=>{clearTimeout(timer);events.destroy();}};
}
