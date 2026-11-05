// Renders subs/events.json (same text and timing as captions.ass) to one alpha video; this ffmpeg has no libass.
import { chromium } from '/Users/zoogom/stillvalid-video/tools/node_modules/playwright-core/index.mjs'; import fs from 'fs'; import {execFileSync} from 'child_process';
const F='/Users/zoogom/stillvalid-video/final', S=F+'/subs', TOTAL=172;
const SUF=process.env.SUF||'';const ev=JSON.parse(fs.readFileSync(S+'/events'+SUF+'.json'));
const cuts=[...new Set([0,TOTAL,...ev.flatMap(e=>[e.a,e.b])])].filter(t=>t<=TOTAL).sort((x,y)=>x-y);
const dir=S+'/png'+SUF; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir);
const b=await chromium.launch({channel:'msedge',headless:true});
const p=await b.newPage({viewport:{width:1920,height:1080}});
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const css=`html,body{margin:0;background:transparent;width:1920px;height:1080px;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
.z{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center}
.right{left:660px;width:1200px}.full{left:200px;width:1520px}
.n{bottom:24px;height:190px}.o{bottom:216px;height:110px}
.Narr,.NarrFull{font-size:48px;line-height:1.2;font-weight:500;color:#faf9f5;text-shadow:0 0 3px #000,0 2px 6px #000c,0 0 18px #0009}
.Note,.NoteFull{font-size:32px;line-height:1.25;color:#ecE6d8;text-shadow:0 0 3px #000,0 1px 5px #000c,0 0 14px #0009}
.side{position:absolute;right:40px;bottom:264px;width:480px;text-align:right}.NoteSide{font-size:26px;line-height:1.25;color:#ece6d8;text-shadow:0 0 3px #000,0 1px 5px #000c}
.NoteTop{font-size:26px;line-height:1.25;color:#ece6d8;opacity:.92;margin-bottom:6px;text-shadow:0 0 3px #000,0 1px 5px #000c}`;
let list='';let n=0;
const seen=new Map();
for(let i=0;i<cuts.length-1;i++){
  const a=cuts[i],c=cuts[i+1],mid=(a+c)/2; const act=ev.filter(e=>e.a<=mid&&mid<e.b);
  const key=JSON.stringify(act.map(e=>[e.s,e.t]));
  let f=seen.get(key);
  if(!f){ f=`${dir}/${String(n++).padStart(4,'0')}.png`; seen.set(key,f);
    const zone=(cls,arr,order)=>arr.length?`<div class="z ${cls}">${arr.sort(order||(()=>0)).map(e=>`<div class="${e.s}">${esc(e.t)}</div>`).join('')}</div>`:'';
    const narr=act.filter(e=>e.s.startsWith('Narr')), note=act.filter(e=>e.s.startsWith('Note')&&e.s!=='NoteSide'), side=act.filter(e=>e.s==='NoteSide');
    const nc=narr.some(e=>e.s==='NarrFull')?'full':'right', oc=note.some(e=>e.s==='NoteFull')?'full':'right';
    await p.setContent(`<!doctype html><style>${css}</style>${zone('n '+nc,narr)}${zone('o '+oc,note,(x,y)=>(y.s==='NoteTop')-(x.s==='NoteTop'))}${side.length?`<div class="side">${side.sort((x,y)=>x.a-y.a).map(e=>`<div class="NoteSide" style="margin-top:10px">${esc(e.t)}</div>`).join('')}</div>`:''}`);
    await p.screenshot({path:f,omitBackground:true});
  }
  list+=`file '${f}'\nduration ${(c-a).toFixed(4)}\n`;
}
const last=[...seen.values()].pop();
fs.writeFileSync(S+'/list'+SUF+'.txt',list);
await b.close();
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',S+'/list'+SUF+'.txt','-vf','fps=60,trim=duration='+TOTAL,'-c:v','ffv1','-pix_fmt','bgra',S+'/subs_alpha'+SUF+'.mkv'],{stdio:'inherit'});
console.log('unique',n,'segments',cuts.length-1);
