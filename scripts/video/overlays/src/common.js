// Shared helpers. Every scene is a pure function of the frame number.
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3);
const ei=x=>x*x*x;
const eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const lerp=(a,b,u)=>a+(b-a)*u;
const r3=x=>Math.round(x*1000)/1000;
const TAU=Math.PI*2;
function ap(t,a,b,{inD=.3,outD=.25,dx=0,dy=22,outAt=null}={}){
  const i=eo(seg(t,a,a+inD));
  const oS=outAt===null?b-outD:outAt;
  const u=seg(t,oS,oS+outD);
  const k=1-(i*(1-u));
  return {o:r3(i*(1-u)),x:r3(dx*(1-i)+(-dx*.25)*u),y:r3(dy*(1-i)+(-dy*.3)*u),k:r3(k)};
}
function put(el,s){
  if(s.o<=0){el.style.display='none';return}
  el.style.display='';el.style.opacity=s.o;
  // 2D only unless a flip is active: a 3D transform would promote the element to its own layer.
  el.style.transform=`translate(${s.x||0}px,${s.y||0}px) scale(${s.s===undefined?1:s.s})`+(s.rx?` rotateX(${s.rx}deg)`:'');
}
function E(tag,cls,css,parent,html){
  const e=document.createElement(tag);if(cls)e.className=cls;
  for(const k in css){const v=css[k];e.style[k]=typeof v==='number'&&!/opacity|zIndex|fontWeight|lineHeight/.test(k)?v+'px':v}
  if(html!==undefined)e.innerHTML=html;
  (parent||document.body).appendChild(e);return e;
}
const SVGNS='http://www.w3.org/2000/svg';
function S(tag,attrs,parent){
  const e=document.createElementNS(SVGNS,tag);
  for(const k in attrs)e.setAttribute(k,attrs[k]);
  if(parent)parent.appendChild(e);return e;
}
const parts=[];
function part(state,apply){parts.push({state,apply})}
window.__key=t=>{const f=Math.round(t*60);return JSON.stringify(parts.map(p=>p.state(f/60,f)))};
window.__render=t=>{const f=Math.round(t*60);parts.forEach(p=>p.apply(p.state(f/60,f)))};
function waitImages(){return Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}
const LIGHT='radial-gradient(circle,#fff8ea 0,#ffd9a6 22%,rgba(255,176,96,.62) 42%,rgba(255,170,90,0) 70%)';
