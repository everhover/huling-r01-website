/* Three independent motion studies, shared unchanged R01 geometry/materials.
   GSAP drives the scroll playhead; physical scenes remain reversible when scrubbing. */
(() => {
 'use strict';
 const variant=document.documentElement.dataset.motionStudy;
 const canvas=document.querySelector('#ring'),back=document.querySelector('#scene-back'),front=document.querySelector('#scene-front');
 const renderer=createRingRenderer(canvas,{refined:true});
 const bg=back.getContext('2d'),fg=front.getContext('2d');
 const glassPhoto=new Image();glassPhoto.src='assets/glass-reference.jpg';glassPhoto.onload=()=>queue();
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
 function rawProductView(i,p) {
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
 const stopPoses=[
  {rx:.95,ry:-1.82,rz:.30},
  {rx:1.1,ry:-1.95,rz:-.20},
  {rx:.75,ry:-2.12,rz:.48},
  null,
  {rx:1.05,ry:-1.72,rz:-.12},
  {rx:.82,ry:-1.95,rz:.22},
  {rx:.9,ry:-1.9,rz:.18}
 ];
 function controlsPose(v,p=0,scene=0) {
  const pose=stopPoses[scene]||stopPoses[0];
  // A full turn while travelling, then ease into a distinct readable hardware view.
  const travel=1-smooth(clamp((p-.10)/.70));
  const turn=(variant==='b'?1.15:variant==='c'?-.95:.85)*Math.PI*2*travel;
  return {...v,size:mobile.matches?v.size:Math.min(v.size,.26),
   rx:pose.rx+Math.sin(p*Math.PI*2)*.18*travel,
   ry:pose.ry+turn,rz:pose.rz+Math.sin(p*Math.PI)*.42*travel};
 }
 function productView(i,p) {
  const v=rawProductView(i,p);
  if(i===6)return {...v,x:.73,y:.5,size:mobile.matches?v.size:.28*Math.min(W*.44,H*.72)/Math.min(W,H),...stopPoses[6]};
  return i===3?v:controlsPose(v,p,i);
 }
 // Conservative projection of the unchanged ring envelope, including perspective.
 function ringEnvelope(v) {
  const cx=Math.cos(v.rx),sx=Math.sin(v.rx),cy=Math.cos(v.ry),sy=Math.sin(v.ry),cz=Math.cos(v.rz),sz=Math.sin(v.rz);
  const m=[cz*cy,sz*cy,-sy,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx];
  const scale=Math.min(W,H)*v.size,points=[];
  for(const z of [-3.75/9.9,3.75/9.9])for(let j=0;j<128;j++){
   const t=j/128*Math.PI*2,x=12.65/9.9*Math.cos(t),y=12.65/9.9*Math.sin(t);
   const yy=m[1]*x+m[4]*y+m[7]*z,zz=m[2]*x+m[5]*y+m[8]*z;
   points.push(yy*scale*5/(5-zz));
  }
  return {bottom:Math.max(...points),top:Math.min(...points)};
 }
 function ellipse(ctx,x,y,rx,ry,fill,stroke,lw=1) {
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
 }
 function line(ctx,x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 function cupGeometry() {
  const h=mobile.matches?Math.min(H*.36,W*.94):Math.min(H*.60,W*.34);
  const w=h*7.3/14.9;
  return {cx:mobile.matches?W*.5:W*(variant==='c'?.73:.75),top:mobile.matches?H*.56:H*.29,w,h};
 }
 function waterView(p,alpha=1) {
  const c=cupGeometry(),motion=drop(p),diam=c.w*25.3/73;
  const ringScale=diam/((25.3/9.9)*Math.min(W,H));
  const settled=controlsPose(newView(c.cx/W,.5,ringScale,0,0,0,alpha),1,4);
  const entry=c.top+c.h*.26,start=c.top-c.h*.22,bottom=c.top+c.h*.855-ringEnvelope(settled).bottom-2;
  // Air ends at the water line; water resistance then reduces translational and angular speed.
  let y=motion.distance<=.25?mix(start,entry,motion.distance/.25):mix(entry,bottom,(motion.distance-.25)/.75);
  const drift=(variant==='b'?Math.sin(p*5)*.08:variant==='c'?Math.sin(p*4)*.12:Math.sin(p*3)*.035)*c.w*(1-p);
  const v=controlsPose(newView((c.cx+drift)/W,y/H,diam/((25.3/9.9)*Math.min(W,H)),0,0,0,alpha),p,4);
  const envelope=ringEnvelope(v),floorY=c.top+c.h*.855;
  v.y=Math.min(v.y,(floorY-envelope.bottom-2)/H);
  drawGlass(c,p,alpha);
  last.water={...c,ringDiameter:diam,ringY:v.y*H,floorY,pixelBottom:v.y*H+envelope.bottom,submerged:motion.submerged,distance:motion.distance};
  return v;
 }
 function drawGlass(c,p,a) {
  const {cx,top,w,h}=c,left=cx-w/2,bottom=top+h,wy=top+h*.26,ry=w*.025;
  bg.save();fg.save();bg.globalAlpha=a;fg.globalAlpha=a;
  ellipse(bg,cx,bottom+6,w*.53,w*.035,'#17171713');
  if(glassPhoto.complete&&glassPhoto.naturalWidth) {
   bg.globalCompositeOperation='multiply';
   bg.drawImage(glassPhoto,165,16,270,568,left,top,w,h);
   bg.globalCompositeOperation='source-over';
  }
  // Water occupies the straight inner bore above the 12 mm solid glass base.
  const inset=w*.045,base=h*.145,innerBottom=bottom-base;
  const water=bg.createLinearGradient(0,wy,0,innerBottom);
  water.addColorStop(0,'#89948c08');water.addColorStop(.85,'#737d7710');water.addColorStop(1,'#59595919');
  bg.fillStyle=water;bg.fillRect(left+inset,wy,w-2*inset,innerBottom-wy);
  ellipse(bg,cx,wy,w*.455,ry,null,'#59595945',.8);
  ellipse(bg,cx,innerBottom,w*.445,ry*.65,null,'#FFFFFFcc',1);
  if(p>.80){bg.globalAlpha=a*smooth((p-.8)/.12)*.18;ellipse(bg,cx,innerBottom-1,w*.12,2,'#171717');bg.globalAlpha=a;}
  // Photograph's side walls and solid base sit in front of the submerged ring.
  if(glassPhoto.complete&&glassPhoto.naturalWidth) {
   fg.globalCompositeOperation='multiply';
   fg.drawImage(glassPhoto,165,16,17,568,left,top,w*17/270,h);
   fg.drawImage(glassPhoto,416,16,19,568,left+w*(251/270),top,w*19/270,h);
   fg.drawImage(glassPhoto,165,536,270,48,left,top+h*(520/568),w,h*48/568);
   fg.globalCompositeOperation='source-over';
  }
  fg.fillStyle='#FFFFFF06';fg.fillRect(left+inset,wy,w-2*inset,innerBottom-wy);
  const impact=clamp((p-.28)/.22);
  if(p>.28&&p<.53){fg.globalAlpha=a*(1-impact)*.6;ellipse(fg,cx,wy,w*(.10+.33*impact),ry*(.2+.7*impact),null,'#595959',.8)}
  if(p>.28&&p<.88){fg.globalAlpha=a*.45;for(let j=0;j<5;j++){const t=clamp((p-.28)*1.6-j*.035);ellipse(fg,cx+Math.sin(j*2.4+t*8)*w*.11,wy+h*.45*(1-t),1+j*.13,1.4+j*.15,null,'#595959',.55)}}
  bg.restore();fg.restore();
 }
 function paperPoints(length) {
  const verts=[ [.54,0,.01],[-.48,0,.10],[-.41,-.24,.02],[-.36,-.21,.055],[-.27,-.055,.10],[-.41,.24,.02],[-.36,.21,.055],[-.27,.055,.10],[-.36,0,-.095],[-.17,0,-.07] ];
  return verts.map(([x,y,z])=>[(x*Math.cos(-.15)-y*Math.sin(-.15))*length,(y*.55-z*.92+x*.28)*length]);
 }
 function plane(ctx,x,y,length,angle,alpha=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
  // Folded dart: raised centre crease, swept wings, turned-up trailing tips and keel.
  const vertices=[ [.54,0,.01],[-.48,0,.10],[-.41,-.24,.02],[-.36,-.21,.055],[-.27,-.055,.10],[-.41,.24,.02],[-.36,.21,.055],[-.27,.055,.10],[-.36,0,-.095],[-.17,0,-.07] ];
  const projected=paperPoints(length);
  const project=v=>projected[vertices.indexOf(v)];
  const faces=[{v:[0,8,9],fill:'#D8D5CF'},{v:[0,9,1],fill:'#E8E5DF'},{v:[0,2,3,4],fill:'#F5F4F0'},{v:[0,4,1],fill:'#FFFFFF'},{v:[0,1,7],fill:'#E8E5DF'},{v:[0,7,6,5],fill:'#FFFFFF'}];
  faces.forEach(face=>{ctx.beginPath();face.v.forEach((n,i)=>{const p=project(vertices[n]);i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.closePath();const g=ctx.createLinearGradient(-length*.4,-length*.2,length*.4,length*.2);g.addColorStop(0,face.fill);g.addColorStop(1,face.fill==='#FFFFFF'?'#F5F4F0':face.fill);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#59595926';ctx.lineWidth=.45;ctx.stroke()});
  const a=project(vertices[1]),b=project(vertices[0]);line(ctx,...a,...b,'#FFFFFFcc',.9);ctx.restore();
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
  const metal=bg.createLinearGradient(cx-12,0,cx+12,0);
  [[0,'#595959'],[.13,'#D8D5CF'],[.32,'#FFFFFF'],[.49,'#FFFFFF'],[.61,'#595959'],[.78,'#D8D5CF'],[1,'#595959']].forEach(([p,c])=>metal.addColorStop(p,c));
  // Turned-metal pedestal with a raised cylindrical foot and polished collars.
  const foot=bg.createLinearGradient(0,baseY-10,0,baseY+8);foot.addColorStop(0,'#FFFFFF');foot.addColorStop(.25,'#D8D5CF');foot.addColorStop(.65,'#595959');foot.addColorStop(.82,'#D8D5CF');foot.addColorStop(1,'#595959');
  ellipse(bg,cx,baseY+7,width*.24,width*.045,'#595959');
  bg.fillStyle=foot;bg.fillRect(cx-width*.24,baseY-2,width*.48,9);
  ellipse(bg,cx,baseY-2,width*.24,width*.045,foot,'#59595980',.7);
  ellipse(bg,cx,baseY-4,width*.224,width*.036,'#D8D5CF','#FFFFFFaa',.8);
  bg.fillStyle=metal;bg.beginPath();bg.moveTo(cx-4,cy-10);bg.bezierCurveTo(cx-7,cy+35,cx-5,baseY-22,cx-17,baseY-5);bg.quadraticCurveTo(cx,baseY+2,cx+17,baseY-5);bg.bezierCurveTo(cx+5,baseY-22,cx+7,cy+35,cx+4,cy-10);bg.closePath();bg.fill();
  ellipse(bg,cx,baseY-6,19,5,metal,'#59595955',.7);
  // A tapered, solid beam replaces the hairline crossbar.
  const beam=bg.createLinearGradient(0,cy-7,0,cy+7);beam.addColorStop(0,'#595959');beam.addColorStop(.26,'#FFFFFF');beam.addColorStop(.5,'#D8D5CF');beam.addColorStop(.75,'#595959');beam.addColorStop(1,'#D8D5CF');
  bg.beginPath();bg.moveTo(lx,ly-2);bg.lineTo(cx,cy-7);bg.lineTo(rx,ry-2);bg.lineTo(rx,ry+2);bg.lineTo(cx,cy+4);bg.lineTo(lx,ly+2);bg.closePath();bg.fillStyle=beam;bg.fill();
  line(bg,lx,ly-2,cx,cy-7,'#FFFFFFaa',.7);line(bg,cx,cy-7,rx,ry-2,'#FFFFFFaa',.7);
  const pivot=bg.createRadialGradient(cx-2,cy-3,0,cx,cy,7);pivot.addColorStop(0,'#FFFFFF');pivot.addColorStop(.45,'#D8D5CF');pivot.addColorStop(.8,'#595959');pivot.addColorStop(1,'#171717');ellipse(bg,cx,cy,7,7,pivot);ellipse(bg,cx,cy,2,2,'#595959');
  for(const [x,y] of [[lx,ly],[rx,ry]]) {
   ellipse(bg,x,y,2.5,3.5,null,'#595959',1);
   line(bg,x,y+3,x-pan*.47,y+hang,'#595959',.9);line(bg,x+.8,y+3,x+pan*.47,y+hang,'#D8D5CF',1.2);line(bg,x,y+3,x,y+hang-pan*.08,'#59595966',.6);
   const py=y+hang;
   const bowl=bg.createLinearGradient(0,py-pan*.10,0,py+pan*.16);
   bowl.addColorStop(0,'#FFFFFF');bowl.addColorStop(.25,'#D8D5CF');bowl.addColorStop(.5,'#595959');bowl.addColorStop(.67,'#FFFFFF');bowl.addColorStop(.88,'#D8D5CF');bowl.addColorStop(1,'#595959');
   ellipse(bg,x,py+4,pan*.55,pan*.135,bowl,'#59595980',.8);
   const interior=bg.createRadialGradient(x-pan*.16,py-pan*.02,pan*.02,x,py,pan*.55);interior.addColorStop(0,'#FFFFFF');interior.addColorStop(.48,'#F5F4F0');interior.addColorStop(.87,'#D8D5CF');interior.addColorStop(.97,'#595959');interior.addColorStop(1,'#FFFFFF');
   ellipse(bg,x,py-2,pan*.55,pan*.115,interior,'#FFFFFFcc',1.2);
   ellipse(bg,x,py-1,pan*.50,pan*.090,null,'#59595966',.6);
   const shadow=bg.createRadialGradient(x,py,0,x,py,pan*.30);shadow.addColorStop(0,'#17171722');shadow.addColorStop(1,'#17171700');
   ellipse(bg,x,py,pan*.30,pan*.045,shadow);
  }
  // A4's 20–21 cm folded length is ~9.2× the ring outer diameter.
  const ringD=width*25.3/406,planeL=width*205/406;
  const q=smooth(clamp(p/landing));
  const startX=variant==='b'?cx+width*.25:cx-width*.6;
  const startY=cy-width*.43;
  const paperFloor=Math.max(...paperPoints(planeL).map(([x,y])=>x*Math.sin(-.10)+y*Math.cos(-.10)));
  const px=mix(startX,lx,q),py=mix(startY,ly+hang-paperFloor,q)-Math.sin(q*Math.PI)*width*(variant==='c'?.14:.08);
  const pa=mix(variant==='b'?-.8:.3,-.10,q)+Math.sin(q*Math.PI)*(variant==='c'?-.65:.3);
  plane(bg,px,py,planeL,pa);
  bg.font=`${mobileMode?11:13}px -apple-system,"PingFang SC",sans-serif`;bg.textAlign='center';bg.fillStyle=ink;
  bg.fillText('≈ 5 g',lx,ly+hang+pan*.43);bg.fillText('4.6 g',rx,ry+hang+pan*.43);
  bg.restore();
  last.balance={tilt,leftPanY:ly+hang,rightPanY:ry+hang,planeL,ringDiameter:ringD,landed:p>=landing,bounds:{left:lx-pan*.55,right:rx+pan*.55,bottom:Math.max(ly,ry)+hang+pan*.43}};
  return controlsPose(newView(rx/W,(ry+hang-ringD*.30)/H,ringD/((25.3/9.9)*Math.min(W,H)),0,0,0,alpha),1,5);
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
  const alpha=1-smooth(i===4?clamp(transition/.45):transition);
  last={scene:i,progress:p,transition,variant};
  let v=i===4?waterView(p,alpha):i===5?balanceView(p,alpha):applyMobile(productView(i,p),i);
  if(i!==4&&i!==5&&transition>0&&i<6) {
   const target=applyMobile(productView(i+1,0),i+1),t=smooth(transition);
   // Physical scenes enter in their own frame; ring shrinks to their true relative size.
   if(i+1===4){const c=cupGeometry();Object.assign(target,{x:c.cx/W,y:(c.top-c.h*.22)/H,size:(c.w*25.3/73)/((25.3/9.9)*Math.min(W,H))})}
   if(i+1===5){Object.assign(target,{x:mobile.matches?.65:.88,y:mobile.matches?.74:.62,size:.015})}
   for(const key of Object.keys(v))v[key]=mix(v[key],target[key],t);
  }
  if((i===4||i===5)&&transition>0&&i<6){const target=i===4?balanceView(0,0):applyMobile(productView(i+1,0),i+1),t=smooth(i===4?clamp((transition-.5)/.5):transition);for(const k of Object.keys(v))v[k]=mix(v[k],target[k],t);v.opacity=1;}
  if(transition>0&&i<6&&!(i===4&&transition<=.5)&&!reduced.matches) {
   v.ry+=Math.sin(transition*Math.PI*2)*(variant==='b'?1.5:variant==='c'?-1.3:1.1);
   v.rz+=Math.sin(transition*Math.PI)*.35;
  }
  // Water remains collision-constrained during travel out of the glass as well.
  if(i===4&&transition<=.5){const e=ringEnvelope(v),floorY=last.water.floorY;v.y=Math.min(v.y,(floorY-e.bottom-2)/H);last.water.pixelBottom=v.y*H+e.bottom;}
  renderer.draw({...v,opacity:i===6?0:v.opacity},W,H,i===2,finish);
  if(i===6)drawInspector();
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
 document.querySelectorAll('button[data-color]').forEach(button=>button.addEventListener('click',()=>{finish=button.dataset.color;document.querySelectorAll('button[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));drawInspector();document.querySelector('#color-caption').textContent=`已选择 · ${{silver:'雾银',black:'影黑',gold:'杏金'}[finish]}`;queue()}));
 const inspectCanvas=document.querySelector('#finish-ring');
 const inspectRenderer=createRingRenderer(inspectCanvas,{refined:true});
 let inspection={rx:.9,ry:-1.9,rz:.18,zoom:1};
 const pointers=new Map();let gesture=null;
 function drawInspector(){
  if(!inspectCanvas)return;
  if(mobile.matches){const copyBottom=chapters[6].querySelector('.copy').getBoundingClientRect().bottom;inspectCanvas.parentElement.style.height=`${Math.max(100,Math.min(290,H-copyBottom-66))}px`;}else inspectCanvas.parentElement.style.height='';
  const w=inspectCanvas.clientWidth,h=inspectCanvas.clientHeight,r=Math.min(devicePixelRatio||1,2);
  if(inspectCanvas.width!==Math.round(w*r)||inspectCanvas.height!==Math.round(h*r)){inspectCanvas.width=Math.round(w*r);inspectCanvas.height=Math.round(h*r);inspectRenderer.resize();}
  inspectRenderer.draw({x:.5,y:.5,size:.28*inspection.zoom,opacity:1,...inspection},w,h,false,finish);
  inspectCanvas.dataset.finish=finish;
 }
 function zoom(value){inspection.zoom=clamp(value,.75,1.3);document.querySelector('#finish-zoom').value=String(Math.round(inspection.zoom*100));drawInspector();}
 function resetInspection(){inspection={rx:.9,ry:-1.9,rz:.18,zoom:1};zoom(1);}
 inspectCanvas.addEventListener('pointerdown',e=>{inspectCanvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;});
 inspectCanvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const a=[...pointers.values()],distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(gesture)zoom(inspection.zoom*distance/gesture);gesture=distance;}
  else {inspection.ry+=(e.clientX-previous.x)*.012;inspection.rx+=(e.clientY-previous.y)*.012;drawInspector();}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])inspectCanvas.addEventListener(type,e=>{pointers.delete(e.pointerId);gesture=null;});
 inspectCanvas.addEventListener('wheel',e=>{e.preventDefault();zoom(inspection.zoom-e.deltaY*.001);},{passive:false});
 inspectCanvas.addEventListener('keydown',e=>{const directions={ArrowLeft:[0,-.15],ArrowRight:[0,.15],ArrowUp:[-.15,0],ArrowDown:[.15,0]};if(directions[e.key]){e.preventDefault();inspection.rx+=directions[e.key][0];inspection.ry+=directions[e.key][1];drawInspector();}if(e.key==='Home'){e.preventDefault();resetInspection();}});
 document.querySelector('#finish-zoom').addEventListener('input',e=>zoom(Number(e.target.value)/100));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{const presets={controls:{rx:.9,ry:-1.9,rz:.18},sensors:{rx:-.4,ry:-1,rz:1.95},side:{rx:.1,ry:-1.15,rz:-.5}};inspection={...inspection,...presets[b.dataset.view]};drawInspector();}));
 document.querySelector('#finish-reset').addEventListener('click',resetInspection);
 addEventListener('resize',()=>{if(last.scene===6)drawInspector()});
 function jumpToHash(){
  if(!location.hash)return;
  const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(!target)return;
  const y=target.getBoundingClientRect().top+scrollY;
  scrollTo({top:y,behavior:'instant'});state.scroll=scrollY;ScrollTrigger.update();queue();
 }
 const pageLoaded=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>addEventListener('load',resolve,{once:true}));
 Promise.all([document.fonts.ready,pageLoaded]).then(()=>{resize();ScrollTrigger.refresh();requestAnimationFrame(jumpToHash)});
 addEventListener('hashchange',()=>requestAnimationFrame(jumpToHash));
 // Read-only diagnostic values for repeatable browser acceptance, plus normal scroll seek.
 window.motionStudy={inspect:()=>JSON.parse(JSON.stringify({...last,inspection})),dropSample:drop,underwater,seek:(scene,p)=>{scrollTo({top:tops[scene]+clamp(p)*Math.max(1,sizes[scene]-H)*.8,behavior:'instant'});ScrollTrigger.update()}};
})();
