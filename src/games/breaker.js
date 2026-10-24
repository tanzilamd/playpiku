import { frame, listen, keyboardAllowed, resultOverlay } from './shared.js';
import { get, record } from '../store.js';
const W=480,H=420,PW=84,PH=12,PY=382,R=7;
export function mount(root,ctx){
  const events=listen();let state='ready',score=0,lives=3,level=1,paddle=W/2,ball,bricks,raf,last=0,keys=new Set(),destroyed=false;
  const ui=frame(root,{stats:[['Score',0,'score'],['Lives',3,'lives'],['Level','1 / 3','level'],['Best',get('best:breaker',0),'best']],body:'<div class="canvas-wrap breaker-wrap" id="game-board" tabindex="0" role="group" aria-label="Brick Breaker board. Move with your mouse, arrow keys, or drag your finger."><canvas width="480" height="420" aria-hidden="true"></canvas></div>',controls:'<button id="game-start" class="button primary">Launch ball</button><button class="button secondary" id="pause">Pause</button>',note:'Move your mouse or drag to aim · Arrow keys to move · Space to launch / pause'},ctx);
  const area=ui.el('#game-board'),canvas=ui.el('canvas'),g=canvas.getContext('2d'),launch=ui.el('#game-start'),pauseButton=ui.el('#pause');
  function ballSpeed(){return 235+(level-1)*42;}
  function resetBall(){ball={x:paddle,y:PY-R-2,vx:ballSpeed()*.45,vy:-ballSpeed()*.893};}
  function makeBricks(){bricks=Array.from({length:(level+2)*8},(_,i)=>({x:25+(i%8)*54,y:42+Math.floor(i/8)*27,w:47,h:18,alive:true,row:Math.floor(i/8)}));}
  function draw(){g.fillStyle='#201f2d';g.fillRect(0,0,W,H);g.fillStyle='#30303f';for(let x=24;x<W;x+=24)for(let y=18;y<H;y+=24){g.beginPath();g.arc(x,y,1,0,Math.PI*2);g.fill();}bricks.forEach(b=>{if(!b.alive)return;g.fillStyle=['#d3bcf2','#b29bd6','#f2ae8b','#f4cc8d','#d4ef9c'][b.row];g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,4);g.fill();});g.fillStyle='#d4f59a';g.beginPath();g.roundRect(paddle-PW/2,PY,PW,PH,6);g.fill();g.fillStyle='#fff3db';g.beginPath();g.arc(ball.x,ball.y,R,0,Math.PI*2);g.fill();}
  function updateStats(){ui.stat('score',score);ui.stat('lives',lives);ui.stat('level',`${level} / 3`);ui.stat('best',get('best:breaker',0));}
  function setControls(){launch.textContent=state==='paused'?'Resume':state==='done'?'Play again':state==='ready'?'Launch ball':'Ball in play';launch.disabled=state==='playing';pauseButton.disabled=state!=='playing';}
  function ready(message='Break into your break.'){state='ready';resetBall();setControls();draw();resultOverlay(area,message,`Level ${level} · ${lives} ${lives===1?'life':'lives'} left. Move your paddle, then launch.` ,run,'Launch ball');}
  function restart(){score=0;lives=3;level=1;paddle=W/2;keys.clear();makeBricks();updateStats();ready();ui.say('Ready to launch. Clear all the bricks.');}
  function run(){if(state==='done'){restart();}area.querySelector('.board-overlay')?.remove();state='playing';setControls();last=0;ui.say(`Level ${level}. Ball launched.`);area.focus({preventScroll:true});}
  function pause(){if(state!=='playing')return;state='paused';keys.clear();setControls();resultOverlay(area,'A little breather.','Ready to bounce back?',run,'Resume');ui.say('Game paused. Select Resume to continue.');}
  function finish(won){state='done';record('breaker',score);updateStats();setControls();resultOverlay(area,won?'A clean sweep!':'That was a good run.',`${won?'All three levels cleared. ':''}Your score: ${score}.`,()=>{restart();run();});ui.say(`${won?'All levels complete!':'Game over.'} Final score ${score}.`);ctx.sound(won?'win':'lose');}
  function step(dt){
    if(keys.has('ArrowLeft')||keys.has('a'))paddle-=360*dt;
    if(keys.has('ArrowRight')||keys.has('d'))paddle+=360*dt;
    paddle=Math.max(PW/2,Math.min(W-PW/2,paddle));
    const oldX=ball.x,oldY=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<R){ball.x=R;ball.vx=Math.abs(ball.vx);}else if(ball.x>W-R){ball.x=W-R;ball.vx=-Math.abs(ball.vx);}
    if(ball.y<R){ball.y=R;ball.vy=Math.abs(ball.vy);}
    if(ball.vy>0&&oldY+R<=PY+2&&ball.y+R>=PY&&ball.x>=paddle-PW/2-R&&ball.x<=paddle+PW/2+R){
      const relative=Math.max(-1,Math.min(1,(ball.x-paddle)/(PW/2))),angle=relative*Math.PI/3,speed=ballSpeed();ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;ball.y=PY-R;ctx.sound();
    }
    for(const b of bricks){if(!b.alive||ball.x+R<=b.x||ball.x-R>=b.x+b.w||ball.y+R<=b.y||ball.y-R>=b.y+b.h)continue;b.alive=false;score+=10;record('breaker',score);updateStats();if(oldY+R<=b.y||oldY-R>=b.y+b.h){ball.vy=-ball.vy;ball.y=oldY;}else{ball.vx=-ball.vx;ball.x=oldX;}ctx.sound();break;}
    if(bricks.every(b=>!b.alive)){if(level===3){finish(true);return;}level++;makeBricks();updateStats();ready('Next level. Nice work!');ui.say(`Level ${level-1} cleared. Launch when ready.`);return;}
    if(ball.y-R>H){lives--;updateStats();if(lives===0)finish(false);else{ready('You’ve got another shot.');ui.say(`Life lost. ${lives} lives remain.`);}}
  }
  function loop(time){if(destroyed)return;const dt=last?Math.min((time-last)/1000,.04):0;last=time;if(state==='playing'){const substeps=4;for(let i=0;i<substeps&&state==='playing';i++)step(dt/substeps);draw();}else if(state==='ready'){if(keys.has('ArrowLeft')||keys.has('a'))paddle-=360*dt;if(keys.has('ArrowRight')||keys.has('d'))paddle+=360*dt;paddle=Math.max(PW/2,Math.min(W-PW/2,paddle));resetBall();draw();}raf=requestAnimationFrame(loop);}
  function move(e){if(e.pointerType==='touch')e.preventDefault();const rect=canvas.getBoundingClientRect();paddle=Math.max(PW/2,Math.min(W-PW/2,(e.clientX-rect.left)*W/rect.width));if(state==='ready')resetBall();}
  events.on(area,'pointermove',move);events.on(area,'pointerdown',e=>{if(e.target.closest('button'))return;move(e);area.setPointerCapture(e.pointerId);});
  events.on(document,'keydown',e=>{if(!keyboardAllowed(e))return;if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){e.preventDefault();keys.add(e.key);}if(e.code==='Space'&&!e.repeat){e.preventDefault();state==='playing'?pause():run();}});
  events.on(document,'keyup',e=>keys.delete(e.key));events.on(window,'blur',()=>{keys.clear();pause();});events.on(launch,'click',run);events.on(pauseButton,'click',pause);
  restart();raf=requestAnimationFrame(loop);return {restart,pause,isPlaying:()=>state==='playing'||state==='paused'||score>0&&state==='ready',destroy:()=>{destroyed=true;cancelAnimationFrame(raf);events.destroy();}};
}
