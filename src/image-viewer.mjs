// Image transforms are local preview state; never modify image bytes or metadata.
export function fitScale(width,height,viewWidth,viewHeight){
  if(![width,height,viewWidth,viewHeight].every(n=>Number.isFinite(n)&&n>0))return 1;
  return Math.min(1,viewWidth/width,viewHeight/height);
}
export function constrainTransform({scale,x,y},width,height,viewWidth,viewHeight){
  const boundedScale=Math.max(.001,Math.min(8,Number.isFinite(scale)?scale:1));
  const maxX=Math.max(0,(width*boundedScale-viewWidth)/2);
  const maxY=Math.max(0,(height*boundedScale-viewHeight)/2);
  return {scale:boundedScale,x:Math.max(-maxX,Math.min(maxX,Number.isFinite(x)?x:0)),
    y:Math.max(-maxY,Math.min(maxY,Number.isFinite(y)?y:0))};
}
export function zoomAt(transform,scale,anchorX=0,anchorY=0){
  const nextScale=Math.max(.001,Math.min(8,Number.isFinite(scale)?scale:transform.scale));
  const ratio=nextScale/transform.scale;
  return {scale:nextScale,x:anchorX-(anchorX-transform.x)*ratio,y:anchorY-(anchorY-transform.y)*ratio};
}
export function mountImageViewer(host,{url,name}){
  const doc=host.ownerDocument;
  const wrap=doc.createElement('div');wrap.className='image-viewer';
  wrap.innerHTML='<div class="image-toolbar" role="toolbar" aria-label="Image controls"><button type="button" data-image-command="fit">Fit</button><button type="button" data-image-command="actual">100%</button><button type="button" data-image-command="out" aria-label="Zoom out">−</button><output aria-label="Image zoom"></output><button type="button" data-image-command="in" aria-label="Zoom in">+</button><button type="button" data-image-command="background" aria-pressed="false">Checkerboard</button></div><div class="image-stage" tabindex="0" aria-label="Image canvas. Plus and minus zoom, zero fits, one shows actual size. Drag to pan."></div><p class="image-dimensions" role="status">Loading image…</p>';
  host.replaceChildren(wrap);
  const stage=wrap.querySelector('.image-stage'),output=wrap.querySelector('output'),info=wrap.querySelector('.image-dimensions');
  const img=doc.createElement('img');img.className='viewer-image';img.alt=name;img.draggable=false;
  stage.append(img);
  let width=0,height=0,viewWidth=0,viewHeight=0,ready=false,disposed=false,mode='fit',drag=null,transform={scale:1,x:0,y:0};
  function draw(){
    if(disposed||!ready)return;
    transform=constrainTransform(transform,width,height,viewWidth,viewHeight);
    img.style.width=width+'px';img.style.height=height+'px';
    img.style.transform='translate(-50%,-50%) translate('+transform.x+'px,'+transform.y+'px) scale('+transform.scale+')';
    output.textContent=Math.round(transform.scale*100)+'%';
    stage.dataset.scale=String(transform.scale);stage.dataset.x=String(transform.x);stage.dataset.y=String(transform.y);
    stage.classList.toggle('can-pan',width*transform.scale>viewWidth||height*transform.scale>viewHeight);
    wrap.querySelector('[data-image-command="in"]').disabled=transform.scale>=8;
    wrap.querySelector('[data-image-command="out"]').disabled=transform.scale<=.001;
    info.textContent=width+' × '+height+' px · '+(mode==='fit'?'Fit to window':'Drag to pan');
  }
  function resize(){
    viewWidth=stage.clientWidth;viewHeight=stage.clientHeight;
    if(mode==='fit')transform={scale:fitScale(width,height,viewWidth,viewHeight),x:0,y:0};
    draw();
  }
  function zoom(scale,x=0,y=0){if(!ready||disposed)return;mode='manual';transform=zoomAt(transform,scale,x,y);draw();}
  function command(action){
    if(!ready||disposed)return;
    if(action==='fit'){mode='fit';resize();}
    if(action==='actual'){mode='manual';transform={scale:1,x:0,y:0};draw();}
    if(action==='in')zoom(transform.scale*1.25);
    if(action==='out')zoom(transform.scale/1.25);
    if(action==='background'){
      const pressed=stage.classList.toggle('checkerboard');wrap.querySelector('[data-image-command="background"]').setAttribute('aria-pressed',String(pressed));
    }
  }
  wrap.addEventListener('click',event=>{const button=event.target.closest('[data-image-command]');if(button)command(button.dataset.imageCommand);});
  stage.addEventListener('wheel',event=>{
    if(!ready)return;event.preventDefault();
    const rect=stage.getBoundingClientRect();
    zoom(transform.scale*Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.006),event.clientX-rect.left-viewWidth/2,event.clientY-rect.top-viewHeight/2);
  },{passive:false});
  stage.addEventListener('dblclick',event=>{event.preventDefault();command(mode==='fit'?'actual':'fit');});
  stage.addEventListener('pointerdown',event=>{
    if(!ready||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:transform.x,startY:transform.y};
    stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');stage.focus({preventScroll:true});
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    mode='manual';transform={...transform,x:drag.startX+event.clientX-drag.x,y:drag.startY+event.clientY-drag.y};draw();
  });
  function end(event){if(drag?.id===event.pointerId){drag=null;stage.classList.remove('dragging');}}
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
  stage.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    const action={'+':'in','=':'in','-':'out','0':'fit','1':'actual'}[event.key];
    if(action){event.preventDefault();event.stopPropagation();command(action);}
  });
  img.addEventListener('load',()=>{if(disposed)return;width=img.naturalWidth;height=img.naturalHeight;ready=width>0&&height>0;resize();});
  img.addEventListener('error',()=>{if(!disposed){info.textContent='Image could not be decoded by this browser.';}});
  const observer=new ResizeObserver(resize);observer.observe(stage);
  img.src=url;
  return ()=>{disposed=true;observer.disconnect();drag=null;};
}
