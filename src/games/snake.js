import { frame, listen, swipe, pad, keyDirections, keyboardAllowed, resultOverlay } from './shared.js';
import { nextSnake } from '../rules.js';
import { get, set, record } from '../store.js';
const vectors={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
export function mount(root,ctx){
  const events=listen(),N=20,C=20;
  let snake,food,direction,queue=[],score=0,state='ready',timer,speed=['slow','normal','fast'].includes(get('snake-speed'))?get('snake-speed'):'normal';
  const ui=frame(root,{stats:[['Score',0,'score'],['Best',get('best:snake-'+speed,0),'best']],options:'<label>Speed <select id="speed"><option value="slow">Easy going</option><option value="normal">Classic</option><option value="fast">Feeling quick</option></select></label>',body:'<div class="canvas-wrap snake-wrap" id="game-board" tabindex="0" role="group" aria-label="Snake game board. Use arrow keys or WASD to steer."><canvas width="400" height="400" aria-hidden="true"></canvas></div>',controls:`<button id="game-start" class="button primary">Start game</button>${pad}`,note:'Arrows or WASD to steer · Space to pause · Swipe on mobile'},ctx);
  const area=ui.el('#game-board'),canvas=ui.el('canvas'),g=canvas.getContext('2d'),button=ui.el('#game-start');ui.el('#speed').value=speed;
  function placeFood(){const empty=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!snake.some(s=>s.x===x&&s.y===y))empty.push({x,y});return empty[Math.floor(Math.random()*empty.length)];}
  function draw(){g.fillStyle='#19271f';g.fillRect(0,0,400,400);g.strokeStyle='#25352a';g.lineWidth=1;for(let i=1;i<N;i++){g.beginPath();g.moveTo(i*C,0);g.lineTo(i*C,400);g.moveTo(0,i*C);g.lineTo(400,i*C);g.stroke();}if(food){g.fillStyle='#f39178';g.beginPath();g.arc(food.x*C+10,food.y*C+10,6,0,Math.PI*2);g.fill();}snake.forEach((s,i)=>{g.fillStyle=i===0?'#d4f59a':'#9bc96d';g.beginPath();g.roundRect(s.x*C+1,s.y*C+1,18,18,i===0?6:4);g.fill();});const head=snake[0];g.fillStyle='#233b29';const eyeX=head.x*C+10+direction.x*4,eyeY=head.y*C+10+direction.y*4;for(const side of [-1,1]){g.beginPath();g.arc(eyeX+(direction.y?side*4:0),eyeY+(direction.x?side*4:0),1.8,0,Math.PI*2);g.fill();}}
  function stop(){clearInterval(timer);timer=null;}
  function overlay(title,detail,label,fn){resultOverlay(area,title,detail,fn,label);}
  function run(){area.querySelector('.board-overlay')?.remove();state='playing';button.textContent='Pause';stop();timer=setInterval(tick,{slow:175,normal:125,fast:85}[speed]);ui.say('Game started. Steer toward the food.');area.focus({preventScroll:true});}
  function restart(){stop();snake=[{x:7,y:10},{x:6,y:10},{x:5,y:10}];direction=vectors.right;queue=[];score=0;state='ready';food=placeFood();ui.stat('score',0);ui.stat('best',get('best:snake-'+speed,0));button.textContent='Start game';draw();overlay('A classic. A fresh bite.','Eat the coral dots. Avoid walls and your tail.','Start game',run);ui.say('Ready. Choose Start game to begin.');}
  function finish(won=false){stop();state='done';record('snake-'+speed,score);ui.stat('best',get('best:snake-'+speed,0));button.textContent='Play again';overlay(won?'You filled the board!':'One more bite?',`You scored ${score} points. ${won?'Incredible work.':'A fresh start is one click away.'}`,'Play again',()=>{restart();run();});ui.say(`${won?'You win!':'Game over.'} Score ${score}.`);ctx.sound(won?'win':'lose');}
  function tick(){if(queue.length)direction=queue.shift();const next=nextSnake(snake,direction,food,N);if(next.dead){finish();return;}snake=next.snake;if(next.ate){score+=10;ui.stat('score',score);record('snake-'+speed,score);ui.stat('best',get('best:snake-'+speed,0));ctx.sound();food=placeFood();if(!food){draw();finish(true);return;}}draw();}
  function steer(dir){if(state!=='playing'||queue.length>=2)return;const v=vectors[dir],last=queue.at(-1)||direction;if(v.x===-last.x&&v.y===-last.y||v.x===last.x&&v.y===last.y)return;queue.push(v);}
  function pause(){if(state!=='playing')return;stop();state='paused';button.textContent='Resume';overlay('A little breather.','Your snake will wait right here.','Resume',run);ui.say('Paused. Select Resume to continue.');}
  function toggle(){if(state==='playing')pause();else if(state==='done'){restart();run();}else run();}
  events.on(button,'click',toggle);
  events.on(document,'keydown',e=>{if(!keyboardAllowed(e))return;if(keyDirections[e.key]){e.preventDefault();steer(keyDirections[e.key]);}else if(e.code==='Space'&&!e.repeat){e.preventDefault();toggle();}});
  swipe(area,steer,events);root.querySelectorAll('[data-dir]').forEach(b=>events.on(b,'click',()=>steer(b.dataset.dir)));
  events.on(ui.el('#speed'),'change',e=>{if(state==='playing'||state==='paused'){e.target.value=speed;ctx.toast('Restart first to change your speed.');return;}speed=e.target.value;set('snake-speed',speed);restart();});
  restart();return {restart,pause,isPlaying:()=>state==='playing'||state==='paused',destroy:()=>{stop();events.destroy();}};
}
