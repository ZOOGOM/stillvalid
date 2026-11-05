// Frame-exact render of a frame range of a Promptfilm film. usage: node range_render.mjs <url> <startFrame> <endFrame> <out.mp4> <workers>
import { spawn } from 'child_process'; import { once } from 'events';
const SKILL=process.env.PF_SKILL;
const { open } = await import(SKILL+'/scripts/common.mjs');
const [url,a,b,out,kk]=process.argv.slice(2); const A=+a,B=+b,K=+kk||2,fps=60;
const P=[];
for(let k=0;k<K;k++){
  const { browser,page,err }=await open(url,{q:'?freeze&text=0'});
  if(err) throw new Error(err);
  const info=await page.evaluate(()=>({LOOP:window.__bw.LOOP,ext:typeof window.__bw.external==='function'}));
  await page.addStyleTag({content:'#frame, #frame * { will-change: auto !important; }'});
  if(info.ext) await page.evaluate(()=>window.__bw.external(true));
  await page.setViewportSize({width:1920,height:1080}); await page.waitForTimeout(300);
  const cdp=await page.context().newCDPSession(page);
  P.push({browser,page,cdp,LOOP:info.LOOP});
}
const N=Math.round(P[0].LOOP*fps),dt=P[0].LOOP/N;
const ff=spawn('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-threads','5','-f','image2pipe','-framerate','60','-c:v','png','-i','-','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709','-c:v','libx264','-preset','veryfast','-crf','12','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-movflags','+faststart','-r','60',out],{stdio:['pipe','ignore','inherit']});
const done=once(ff,'close'); const ready=new Map(); let next=A,flushing=false; const wake=[];
const flush=async()=>{ if(flushing) return; flushing=true; try{ while(ready.has(next)){ const buf=ready.get(next); ready.delete(next); if(!ff.stdin.write(buf)) await once(ff.stdin,'drain'); next++; if((next-A)%120===0) console.log('frame',next,'of',B,new Date().toISOString().slice(11,19)); wake.splice(0).forEach(r=>r()); } } finally{flushing=false;} };
await Promise.all(P.map(async(w,k)=>{ for(let i=A+k;i<B;i+=K){ while(i-next>3*K) await new Promise(r=>wake.push(r)); await w.page.evaluate(t=>window.__bw.seek(t),(i%N)*dt); const {data}=await w.cdp.send('Page.captureScreenshot',{format:'png',optimizeForSpeed:true}); ready.set(i,Buffer.from(data,'base64')); await flush(); } }));
await flush(); ff.stdin.end(); const [c]=await done; console.log('DONE',out,'code',c,'frames',next-A);
for(const w of P) await w.browser.close(); process.exit(0);
