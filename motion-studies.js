/* Three independent motion studies, shared unchanged R01 geometry/materials.
   GSAP drives the scroll playhead; physical scenes remain reversible when scrubbing. */
(() => {
 'use strict';
 const variant=document.documentElement.dataset.motionStudy;
 const canvas=document.querySelector('#ring'),back=document.querySelector('#scene-back'),front=document.querySelector('#scene-front');
 const renderer=createRingRenderer(canvas,{refined:true});
 const bg=back.getContext('2d'),fg=front.getContext('2d');
 const chapters=[...document.querySelectorAll('.chapter')];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:767px)');
 const dark=variant==='b';
 const ink=dark?'#D8D5CF':'#595959';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const state={scroll:scrollY};
 let W=0,H=0,dpr=1,tops=[],sizes=[],finish='silver',pending=false,last={};
 const tau=.13;
 // v(t)=v_terminal+(v_entry-v_terminal)e^(-t/tau), integrated analytically.
 function underwater(t) {t=clamp(t);return (.31*t+(.95-.31)*tau*(1-Math.exp(-t/tau)))/(.31+(.95-.31)*tau*(1-Math.exp(-1/tau)));}
 function drop(p) {
  p=clamp(p);
  if(p<.28)return {distance:.25*(p/.28)**2,submerged:false,turn:mix(-.8,1.5,(p/.28)**2)};
  if(p<.88){const q=(p-.28)/.6;return {distance:.25+.75*underwater(q),submerged:true,turn:1.5+.8*(1-Math.exp(-q*4))};}
  const q=(p-.88)/.12;
  return {distance:1-Math.sin(q*Math.PI)*.012*(1-q),submerged:true,turn:2.285};
 }
 function newView(x=.73,y=.5,size=.24,rx=.36,ry=-.55,rz=-.5,opacity=1){return{x,y,size,rx,ry,rz,opacity}}
 function productView(i,p) {
  const q=smooth(p),s=Math.sin(p*Math.PI);
  if(variant==='a') {
   return [
    ()=>newView(mix(.82,.72,q),mix(.58,.48,q),mix(.12,.30,q),mix(1.35,.36,q),mix(-1.7,-.55,q),mix(-1.6,-.5,q)),
    ()=>newView(.5,.5,mix(.30,.48,q),.5,p*1.8,-.5,.09),
    ()=>newView(.73,.51,mix(.25,.34,q),mix(.4,-.4,q),mix(-.55,-1.2,q),mix(-.5,1.95,q)),
    ()=>newView(.75,.51,mix(.27,.32,q),-.4,mix(-1.8,-.9,q),1.95),
    ()=>newView(),()=>newView(),
    ()=>newView(.73,.5,.28,.36,-.55+p*.7,-.5)
   ][i]();
  }
  if(variant==='b') {
   return [
    ()=>newView(.72,.49,mix(.36,.27,q),mix(.12,.65,q),mix(-2.3,-.4,q),mix(.8,-.6,q)),
    ()=>newView(.5,.5,.42,.9,p*3.14,.5,.09),
    ()=>newView(.74+s*.05,.5,mix(.36,.27,q),mix(-.5,.2,q),-1.2+p*2,1.95+p*.5),
    ()=>newView(.73,.51,.29,-.4,-2.6+p*1.6,1.95),
    ()=>newView(),()=>newView(),
    ()=>newView(.74,.5,mix(.34,.26,q),.3,-.6+p*1.1,-.5)
   ][i]();
  }
  return [
   ()=>newView(mix(.94,.71,q),.51-Math.sin(q*Math.PI)*.06,mix(.18,.29,q),.36,-.6,mix(-4.4,-.5,q)),
   ()=>newView(.5,.5,.39,.2,.3,p*2,.08),
   ()=>newView(mix(.68,.77,q),.50-s*.08,mix(.25,.31,q),mix(.8,-.4,q),-1.2,mix(-1,1.95,q)),
   ()=>newView(.72,.51,.28,-.4,-1+p*.7,1.95+Math.sin(q*Math.PI)*.5),
   ()=>newView(),()=>newView(),
   ()=>newView(.73,.5,mix(.20,.30,q),.36,-.55,mix(-2,-.5,q))
  ][i]();
 }
 function ellipse(ctx,x,y,rx,ry,fill,stroke,lw=1) {
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
 }
 function line(ctx,x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 function cupGeometry() {
  const h=mobile.matches?Math.min(H*.36,W*.94):Math.min(H*.60,W*.34);
  const w=h*7.3/12.7;
  return {cx:mobile.matches?W*.5:W*(variant==='c'?.73:.75),top:mobile.matches?H*.56:H*.29,w,h};
 }
 function waterView(p,alpha=1) {
  const c=cupGeometry(),motion=drop(p),diam=c.w*22.3/73;
  const entry=c.top+c.h*.26,start=c.top-c.h*.22,bottom=c.top+c.h-diam*.34-12;
  // Air ends at the water line; water resistance then reduces translational and angular speed.
  let y=motion.distance<=.25?mix(start,entry,motion.distance/.25):mix(entry,bottom,(motion.distance-.25)/.75);
  const drift=(variant==='b'?Math.sin(p*5)*.08:variant==='c'?Math.sin(p*4)*.12:Math.sin(p*3)*.035)*c.w*(1-p);
  const v=newView((c.cx+drift)/W,y/H,diam/(2.25*Math.min(W,H)),mix(.4,1.15,smooth(p)),mix(-.6,-.1,smooth(p)),motion.turn,alpha);
  drawGlass(c,p,alpha);
  last.water={...c,ringDiameter:diam,ringY:y,submerged:motion.submerged,distance:motion.distance};
  return v;
 }
 function drawGlass(c,p,a) {
  const {cx,top,w,h}=c,left=cx-w/2,right=cx+w/2,bottom=top+h,wy=top+h*.26,ry=w*.115;
  bg.save();fg.save();bg.globalAlpha=a;fg.globalAlpha=a;
  ellipse(bg,cx,bottom+16,w*.6,w*.09,dark?'#17171740':'#1717170c');
  const glass=bg.createLinearGradient(left,0,right,0);
  glass.addColorStop(0,dark?'#FFFFFF0c':'#FFFFFF80');glass.addColorStop(.12,dark?'#FFFFFF03':'#FFFFFF18');glass.addColorStop(.86,'#FFFFFF04');glass.addColorStop(1,dark?'#FFFFFF15':'#FFFFFF99');
  bg.fillStyle=glass;bg.beginPath();bg.moveTo(left,top);bg.lineTo(left,bottom);bg.ellipse(cx,bottom,w/2,ry,0,Math.PI,0,true);bg.lineTo(right,top);bg.closePath();bg.fill();
  const water=bg.createLinearGradient(0,wy,0,bottom);water.addColorStop(0,dark?'#D8D5CF15':'#59595908');water.addColorStop(1,dark?'#D8D5CF29':'#59595918');
  bg.fillStyle=water;bg.fillRect(left+3,wy,w-6,h*.74);ellipse(bg,cx,bottom-7,w/2-3,ry*.8,water);
  ellipse(bg,cx,wy,w/2-3,ry*.85,dark?'#D8D5CF0b':'#FFFFFF60',dark?'#D8D5CF66':'#59595955');
  // Front glass and water use a light translucent veil; no opaque layer hides the ring.
  fg.fillStyle=dark?'#FFFFFF03':'#FFFFFF0a';fg.fillRect(left+3,wy,w-6,bottom-wy);
  line(fg,left,top,left,bottom-3,dark?'#D8D5CF60':'#59595955',1.2);line(fg,right,top,right,bottom-3,dark?'#FFFFFF90':'#FFFFFF',2);
  line(fg,left+6,top+18,left+6,bottom-20,dark?'#FFFFFF24':'#FFFFFFc0',2);
  line(fg,right-8,top+25,right-8,bottom-22,dark?'#FFFFFF15':'#FFFFFFa0',4);
  ellipse(fg,cx,top,w/2,ry,null,dark?'#D8D5CF80':'#59595960',1.5);
  ellipse(fg,cx,top+3,w/2-3,ry-2,null,dark?'#FFFFFF45':'#FFFFFF',1.3);
  ellipse(fg,cx,bottom,w/2,ry,null,dark?'#D8D5CF85':'#59595960',2);
  ellipse(fg,cx,bottom-8,w/2-4,ry*.9,null,dark?'#FFFFFF35':'#FFFFFFd0',4);
  // The impact ripple expands, then decays; bubbles rise while the ring sinks.
  const impact=clamp((p-.28)/.2),ripAlpha=p>.28&&p<.62?Math.sin(impact*Math.PI)*.7:0;
  if(ripAlpha>0){fg.globalAlpha=a*ripAlpha;ellipse(fg,cx,wy,w*.12+w*.34*impact,ry*.1+ry*.65*impact,null,ink,1);}
  if(p>.28&&p<.88){fg.globalAlpha=a*.50;for(let j=0;j<6;j++){const t=clamp((p-.28)*1.6-j*.035),x=cx+Math.sin(j*2.4+t*8)*w*.13,y=wy+h*.48*(1-t);ellipse(fg,x,y,1.1+j*.18,1.6+j*.2,null,ink,.6)}}
  bg.restore();fg.restore();
 }
 function plane(ctx,x,y,length,angle,alpha=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
  const L=length;
  function poly(points,fill,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*L,y*L*.45):ctx.moveTo(x*L,y*L*.45));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke()}
  poly([[-.5,.12],[.5,-.05],[-.29,-.26],[-.19,-.01]],'#FFFFFF','#D8D5CF');
  poly([[-.5,.12],[.5,-.05],[-.12,.32],[-.19,-.01]],'#E8E5DF','#D8D5CF');
  poly([[-.19,-.01],[.5,-.05],[-.28,.14]],'#F5F4F0','#D8D5CF');
  line(ctx,-.19*L,-.01*L*.45,.5*L,-.05*L*.45,'#D8D5CF',.8);ctx.restore();
 }
 function balanceView(p,alpha=1) {
  const mobileMode=mobile.matches;
  const width=mobileMode?W*.74:Math.min(W*.32,H*.68),cx=mobileMode?W*.5:W*.72;
  const cy=mobileMode?H*.69:H*.54,arm=width*.39;
  const landing=.53;
  let tilt=p<landing?.055:mix(.055,-.095,smooth((p-landing)/.36));
  if(p>landing&&!reduced.matches)tilt+=Math.sin((p-landing)*22)*.018*Math.exp(-(p-landing)*9);
  const ly=cy-Math.sin(tilt)*arm,ry=cy+Math.sin(tilt)*arm;
  const lx=cx-Math.cos(tilt)*arm,rx=cx+Math.cos(tilt)*arm;
  const hang=width*.22,pan=width*180/406;
  const baseY=cy+width*.38;
  bg.save();bg.globalAlpha=alpha;
  ellipse(bg,cx,baseY+10,width*.29,width*.035,dark?'#17171780':'#1717170b');
  const metal=bg.createLinearGradient(cx-10,0,cx+10,0);metal.addColorStop(0,'#595959');metal.addColorStop(.35,'#FFFFFF');metal.addColorStop(.55,'#D8D5CF');metal.addColorStop(1,'#595959');
  bg.fillStyle=metal;bg.beginPath();bg.moveTo(cx-4,cy-7);bg.lineTo(cx-11,baseY);bg.lineTo(cx+11,baseY);bg.lineTo(cx+4,cy-7);bg.closePath();bg.fill();
  ellipse(bg,cx,baseY,width*.24,width*.035,metal,dark?'#D8D5CF55':'#59595955');
  line(bg,lx,ly,rx,ry,ink,3);ellipse(bg,cx,cy,4,4,dark?'#FFFFFF':'#595959');
  for(const [x,y] of [[lx,ly],[rx,ry]]) {
   line(bg,x,y,x-pan*.47,y+hang,ink,.8);line(bg,x,y,x+pan*.47,y+hang,ink,.8);
   ellipse(bg,x,y+hang,pan*.55,pan*.12,dark?'#595959':'#E8E5DF',ink,1);
   ellipse(bg,x,y+hang-2,pan*.51,pan*.09,dark?'#595959':'#F5F4F0',dark?'#D8D5CF66':'#FFFFFF',.8);
  }
  // A4's 20–21 cm folded length is ~9.2× the ring outer diameter.
  const ringD=width*22.3/406,planeL=width*205/406;
  const q=smooth(clamp(p/landing));
  const startX=variant==='b'?cx+width*.25:cx-width*.6;
  const startY=cy-width*.43;
  const px=mix(startX,lx,q),py=mix(startY,ly+hang-planeL*.32*.45,q)-Math.sin(q*Math.PI)*width*(variant==='c'?.14:.08);
  const pa=mix(variant==='b'?-.8:.3,-.10,q)+Math.sin(q*Math.PI)*(variant==='c'?-.65:.3);
  plane(bg,px,py,planeL,pa);
  bg.font=`${mobileMode?11:13}px -apple-system,"PingFang SC",sans-serif`;bg.textAlign='center';bg.fillStyle=ink;
  bg.fillText('≈ 5 g',lx,ly+hang+pan*.43);bg.fillText('4.6 g',rx,ry+hang+pan*.43);
  bg.restore();
  last.balance={tilt,leftPanY:ly+hang,rightPanY:ry+hang,planeL,ringDiameter:ringD,landed:p>=landing,bounds:{left:lx-pan*.55,right:rx+pan*.55,bottom:Math.max(ly,ry)+hang+pan*.43}};
  return newView(rx/W,(ry+hang-ringD*.30)/H,ringD/(2.25*Math.min(W,H)),1.08,-.3,.3,alpha);
 }
 function applyMobile(v,i) {
  if(!mobile.matches||i===4||i===5)return v;
  const copy=chapters[i].querySelector('.copy').getBoundingClientRect();
  const base=Math.max(H*.72,copy.bottom+H*.12);
  return {...v,x:.5+(v.x-.73)*.25,y:Math.min(H*.84,base)/H,size:i===1?.22:Math.min(.21,(H-copy.bottom-65)/(2.4*Math.min(W,H))),opacity:i===1?.08:v.opacity};
 }
 function frame() {
  pending=false;if(!W||!H)return;
  bg.clearRect(0,0,W,H);fg.clearRect(0,0,W,H);
  let i=0;for(let n=1;n<tops.length;n++)if(state.scroll>=tops[n]-.5)i=n;
  const local=Math.max(0,state.scroll-tops[i]),hold=Math.max(1,sizes[i]-H);
  let p=clamp(local/(hold*.8));
  if(reduced.matches)p=1;
  const transition=clamp((local-hold)/H);
  const alpha=1-smooth(transition);
  last={scene:i,progress:p,transition,variant};
  let v=i===4?waterView(p,alpha):i===5?balanceView(p,alpha):applyMobile(productView(i,p),i);
  if(i!==4&&i!==5&&transition>0&&i<6) {
   const target=applyMobile(productView(i+1,0),i+1),t=smooth(transition);
   // Physical scenes enter in their own frame; ring shrinks to their true relative size.
   if(i+1===4){const c=cupGeometry();Object.assign(target,{x:c.cx/W,y:(c.top-c.h*.22)/H,size:(c.w*22.3/73)/(2.25*Math.min(W,H))})}
   if(i+1===5){Object.assign(target,{x:mobile.matches?.65:.88,y:mobile.matches?.74:.62,size:.015})}
   for(const key of Object.keys(v))v[key]=mix(v[key],target[key],t);
  }
  if((i===4||i===5)&&transition>0&&i<6){const target=i===4?balanceView(0,0):applyMobile(productView(i+1,0),i+1),t=smooth(transition);for(const k of Object.keys(v))v[k]=mix(v[k],target[k],t);v.opacity=1;}
  renderer.draw(v,W,H,i===2,finish);
  last.view={...v};canvas.dataset.finish=finish;canvas.dataset.scene=String(i);
  document.querySelector('#chapter').textContent=String(i+1).padStart(2,'0');
  document.documentElement.dataset.chapter=String(i);
 }
 function queue(){if(!pending){pending=true;requestAnimationFrame(frame)}}
 function resize(){W=back.clientWidth;H=back.clientHeight;dpr=Math.min(devicePixelRatio||1,2);for(const c of [back,canvas,front]){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}bg.setTransform(dpr,0,0,dpr,0,0);fg.setTransform(dpr,0,0,dpr,0,0);renderer.resize();tops=chapters.map(el=>el.getBoundingClientRect().top+scrollY);sizes=chapters.map(el=>el.offsetHeight);queue()}
 gsap.registerPlugin(ScrollTrigger);
 const follow=gsap.quickTo(state,'scroll',{duration:.32,ease:'power2.out',onUpdate:queue});
 const mm=gsap.matchMedia();
 mm.add({reduce:'(prefers-reduced-motion:reduce)',normal:'(prefers-reduced-motion:no-preference)'},ctx=>{
  ScrollTrigger.create({start:0,end:()=>ScrollTrigger.maxScroll(window),onUpdate:()=>{if(ctx.conditions.reduce){state.scroll=scrollY;queue()}else follow(scrollY)},onRefresh:()=>{state.scroll=scrollY;resize()}});
 });
 addEventListener('resize',resize);document.fonts.ready.then(()=>{resize();ScrollTrigger.refresh()});resize();
 document.querySelectorAll('button[data-color]').forEach(button=>button.addEventListener('click',()=>{finish=button.dataset.color;document.querySelectorAll('button[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#color-caption').textContent=`已选择 · ${{silver:'雾银',black:'影黑',gold:'杏金'}[finish]}`;queue()}));
 // Read-only diagnostic values for repeatable browser acceptance, plus normal scroll seek.
 window.motionStudy={inspect:()=>JSON.parse(JSON.stringify(last)),dropSample:drop,underwater,seek:(scene,p)=>{scrollTo({top:tops[scene]+clamp(p)*Math.max(1,sizes[scene]-H)*.8,behavior:'instant'});ScrollTrigger.update()}};
})();
