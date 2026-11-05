import { chromium } from 'playwright-core'; import fs from 'fs'; import os from 'os';
const H=os.homedir(), T=H+'/stillvalid-video/takes/take-1', OUT=H+'/stillvalid-video/final/cards';
const t=JSON.parse(fs.readFileSync(T+'/take.json'));
const st=n=>t.stills.find(s=>s.name===n);
const pick=(sn,key,i=0)=>st(sn).boxes[key][i];
console.log(JSON.stringify(st('s6_quotes').boxes,null,0).slice(0,900));
const defs=[['card1','s6_top',pick('s6_top','heading')],['card2','s6_change',pick('s6_change','article')],['card3','s6_quotes',pick('s6_quotes','q',0)],['card4','s6_quotes',pick('s6_quotes','q',1)],['card5','s6_sources',pick('s6_sources','sources')]];
const b=await chromium.launch({channel:'msedge',headless:true});
const man={};
for(const [name,still,box] of defs){
 const pad=name==='card1'?{x:0,y:-4,w:0,h:-6}:name==='card3'||name==='card4'?{x:-8,y:-6,w:16,h:12}:{x:0,y:0,w:0,h:0};
 const s=6,x=Math.round((box.x+pad.x)*s),y=Math.round((box.y+pad.y)*s),w=Math.round((box.w+pad.w)*s),h=Math.round((box.h+pad.h)*s);
 const X=Math.max(0,x),Y=Math.max(0,y),W=Math.min(w,2340-X),Hh=Math.min(h,5064-Y);
 const p=await b.newPage({viewport:{width:W,height:Hh}});
 const data=fs.readFileSync(`${T}/stills/${still}.png`).toString('base64');
 await p.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}div{width:${W}px;height:${Hh}px;border-radius:${name==='card3'||name==='card4'?96:168}px;overflow:hidden;position:relative}img{position:absolute;left:${-X}px;top:${-Y}px;width:2340px;height:5064px}</style><div><img src="data:image/png;base64,${data}"></div>`);
 await p.waitForTimeout(300);
 await p.screenshot({path:`${OUT}/${name}.png`,omitBackground:true});
 man[name]={still,box,px:[X,Y,W,Hh]};
 await p.close();
}
await b.close();
fs.writeFileSync(OUT+'/manifest.json',JSON.stringify(man,null,1));
console.log(man);
