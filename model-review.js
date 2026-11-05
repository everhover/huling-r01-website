const reviewCanvas=document.querySelector('#review-ring');
const reviewRenderer=createRingRenderer(reviewCanvas);
const reviewViews={
  silhouette:{rx:.36,ry:-.55,rz:-.5},
  controls:{rx:-.4,ry:-1.2,rz:1.95},
  sensors:{rx:-.4,ry:-1.0,rz:1.95},
  profile:{rx:.1,ry:-1.15,rz:-.5}
};
let reviewView={...reviewViews.silhouette};
let pointer=null;
let framePending=false;
function drawReview() {
  framePending=false;
  const width=reviewCanvas.clientWidth,height=reviewCanvas.clientHeight;
  const ratio=Math.min(devicePixelRatio || 1,2);
  const targetWidth=Math.round(width*ratio),targetHeight=Math.round(height*ratio);
  if(reviewCanvas.width!==targetWidth || reviewCanvas.height!==targetHeight) {
    reviewCanvas.width=targetWidth;reviewCanvas.height=targetHeight;
    reviewRenderer.resize();
  }
  reviewRenderer.draw({x:.5,y:.5,size:Number(document.querySelector('#zoom').value)/100,opacity:1,...reviewView},width,height,document.querySelector('#led').checked);
}
function queueReview() {
  if(!framePending) { framePending=true;requestAnimationFrame(drawReview); }
}
reviewCanvas.addEventListener('pointerdown',event=> {
  pointer={x:event.clientX,y:event.clientY};
  reviewCanvas.setPointerCapture(event.pointerId);
});
reviewCanvas.addEventListener('pointermove',event=> {
  if(!pointer)return;
  reviewView.ry+=(event.clientX-pointer.x)*.008;
  reviewView.rx-=(event.clientY-pointer.y)*.008;
  pointer={x:event.clientX,y:event.clientY};
  queueReview();
});
reviewCanvas.addEventListener('pointerup',()=>{pointer=null;});
reviewCanvas.addEventListener('pointercancel',()=>{pointer=null;});
reviewCanvas.addEventListener('keydown',event=> {
  const directions={ArrowLeft:[0,-.1],ArrowRight:[0,.1],ArrowUp:[-.1,0],ArrowDown:[.1,0]};
  if(!directions[event.key])return;
  event.preventDefault();
  reviewView.rx+=directions[event.key][0];
  reviewView.ry+=directions[event.key][1];
  queueReview();
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=> {
  reviewView={...reviewViews[button.dataset.view]};
  queueReview();
}));
document.querySelector('#zoom').addEventListener('input',queueReview);
document.querySelector('#led').addEventListener('change',queueReview);
addEventListener('resize',queueReview);
queueReview();
