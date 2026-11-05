#!/usr/bin/env node
// Deterministic frame renderer for the StillValid 2D motion graphics.
//   node render.mjs all                      render everything in order
//   node render.mjs env panels M6 M7 cards intro outro      any subset
//   node render.mjs panel:03                 a single panel
//   node render.mjs --still <job> <t,t,...> <dir>   preview stills on a dark backdrop
// Re-running `node render.mjs outro` picks up outro/credit.txt.
import {createRequire} from 'module';
import fs from 'fs';import path from 'path';import {spawnSync} from 'child_process';
import {fileURLToPath} from 'url';
const require=createRequire('/Users/zoogom/stillvalid-video/tools/package.json');
const {chromium}=require('playwright-core');
const SRC=path.dirname(fileURLToPath(import.meta.url));
const FINAL=path.resolve(SRC,'../..');
const FFMPEG='/opt/homebrew/bin/ffmpeg';
const CACHE=process.env.HOME+'/Library/Caches/ms-playwright/';
const shellDir=CACHE+'chromium_headless_shell-1243/';
// Headless shell is the same engine as Chrome for Testing 1243, with much less overhead per frame.
const CHROME=process.env.SV_CHROME||(fs.existsSync(shellDir)?shellDir+fs.readdirSync(shellDir).find(d=>d.startsWith('chrome-'))+'/chrome-headless-shell':CACHE+'chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const WORKERS=3;
const EDL=JSON.parse(fs.readFileSync(FINAL+'/edl.json','utf8'));
const VALUES=JSON.parse(fs.readFileSync(FINAL+'/values.json','utf8'));
const credit=()=>{try{return fs.readFileSync(FINAL+'/outro/credit.txt','utf8').trim()}catch{return ''}};
const SHOTS=Object.keys(EDL.shots);
const JOBS={
  env:{html:'env.html',len:10,out:'env/bokeh_loop.mp4',opaque:true,grain:'c0s=5:c0f=t+u'},
  M6:{html:'panel.html?job=M6',len:EDL.M6.len,out:'overlays/M6.mov'},
  M7:{html:'panel.html?job=M7',len:EDL.M7.len,out:'overlays/M7.mov'},
  cards:{html:'cards.html',len:40,out:'overlays/cards_2d.mov'},
  intro:{html:'intro.html',len:12,out:'intro/intro_2d.mp4',opaque:true,grain:'c0s=3:c0f=t+u'},
  outro_alpha:{html:'outro.html?mode=alpha',len:11,out:'outro/outro_card_alpha.mov'},
  outro_2d:{html:'outro.html?mode=opaque',len:18,out:'outro/outro_2d.mp4',opaque:true,grain:'c0s=3:c0f=u'}, // static pattern: the last 3 s hold still
};
for(const s of SHOTS)JOBS['panel:'+s]={html:`panel.html?job=${s}`,len:EDL.shots[s].len,out:`overlays/panel_shot${s}.mov`};
const GROUPS={panels:SHOTS.map(s=>'panel:'+s),outro:['outro_alpha','outro_2d'],
  all:['env',...SHOTS.map(s=>'panel:'+s),'M6','M7','cards','intro','outro_alpha','outro_2d']};
async function open(browser,job,opaque){
  const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  await ctx.addInitScript(`window.EDL=${JSON.stringify(EDL)};window.VALUES=${JSON.stringify(VALUES)};window.CREDIT=${JSON.stringify(credit())};`);
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.error('PAGE ERROR',job.html,e.message);process.exitCode=1});
  await page.goto('file://'+SRC+'/'+job.html);
  await page.evaluate(()=>window.__ready);
  return page;
}
function encode(dir,job,frames){
  const out=path.join(FINAL,job.out);fs.mkdirSync(path.dirname(out),{recursive:true});
  const tags=['-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709'];
  const base=['-y','-loglevel','error','-framerate','60','-i',path.join(dir,'%06d.png'),'-frames:v',String(frames),'-threads','6'];
  // Grain is added at encode time on opaque jobs; job.grain is the ffmpeg noise spec.
  const grain=job.grain?`,noise=${job.grain}`:'';
  const args=job.opaque
    ?[...base,'-vf',`scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p${grain}`,
       '-c:v','libx264','-crf','14','-preset','medium',...tags,'-movflags','+faststart',out]
    :[...base,'-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuva444p10le',
       '-c:v','prores_ks','-profile:v','4444','-pix_fmt','yuva444p10le','-alpha_bits','8','-vendor','apl0',...tags,out];
  const r=spawnSync(FFMPEG,args,{stdio:'inherit'});
  if(r.status!==0)throw new Error('ffmpeg failed '+job.out);
}
async function run(browser,name){
  const job=JOBS[name];if(!job)throw new Error('unknown job '+name);
  const t0=Date.now();const frames=Math.round(job.len*60);
  const pages=await Promise.all(Array.from({length:WORKERS},()=>open(browser,job)));
  const keys=await pages[0].evaluate(n=>Array.from({length:n},(_,f)=>window.__key(f/60)),frames);
  const uniq=new Map();keys.forEach((k,f)=>{if(!uniq.has(k))uniq.set(k,f)});
  const firsts=[...uniq.values()];
  const dir=path.join(SRC,'tmp',name.replace(':','_'));
  fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
  let next=0,done=0;
  await Promise.all(pages.map(async page=>{
    const cdp=await page.context().newCDPSession(page);
    if(!job.opaque)await cdp.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
    while(next<firsts.length){
      const f=firsts[next++];
      await page.evaluate(t=>window.__render(t),f/60);
      const {data}=await cdp.send('Page.captureScreenshot',{format:'png',optimizeForSpeed:true,fromSurface:true});
      fs.writeFileSync(path.join(dir,`u${String(f).padStart(6,'0')}.png`),Buffer.from(data,'base64'));
      if(++done%300===0)console.log(`  ${name} ${done}/${firsts.length} ${((Date.now()-t0)/1000).toFixed(0)} s`);
    }
  }));
  keys.forEach((k,f)=>fs.linkSync(path.join(dir,`u${String(uniq.get(k)).padStart(6,'0')}.png`),path.join(dir,String(f).padStart(6,'0')+'.png')));
  await Promise.all(pages.map(p=>p.context().close()));
  const t1=Date.now();
  encode(dir,job,frames);
  fs.rmSync(dir,{recursive:true,force:true});
  console.log(`${name}: ${frames} frames, ${firsts.length} unique, render ${((t1-t0)/1000).toFixed(0)} s, encode ${((Date.now()-t1)/1000).toFixed(0)} s -> ${job.out}`);
}
const args=process.argv.slice(2);
const browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--hide-scrollbars','--force-color-profile=srgb','--disable-lcd-text','--font-render-hinting=none','--allow-file-access-from-files']});
try{
  if(args[0]==='--still'){
    const [,name,ts,dir]=args;const job=JOBS[name];fs.mkdirSync(dir,{recursive:true});
    const page=await open(browser,job);
    if(!job.opaque)await page.addStyleTag({content:'html{background:#2a2019!important}'});
    for(const t of ts.split(',').map(Number)){
      await page.evaluate(t=>window.__render(t),t);
      await page.screenshot({path:path.join(dir,`${name.replace(':','_')}_${String(t).replace('.','p')}.png`)});
    }
  }else{
    const list=args.flatMap(a=>GROUPS[a]||[a]);
    for(const n of list)await run(browser,n);
  }
}finally{await browser.close()}
