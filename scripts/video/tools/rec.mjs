// StillValid recording tool. usage: node rec.mjs <take-N> [--dry]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const takeName = process.argv[2]; const DRY = process.argv.includes('--dry');
const ROOT = path.join(os.homedir(),'stillvalid-video','takes',takeName);
const FR = path.join(ROOT,'frames'), ST = path.join(ROOT,'stills');
fs.mkdirSync(FR,{recursive:true}); fs.mkdirSync(ST,{recursive:true});
const CARD = path.join(os.homedir(),'stillvalid-video/final/demo-card.png');
const URL_APP='https://stillvalid-beta.vercel.app/';
const NOTICE='https://www.seoul.go.kr/news/news_notice.do?nttNo=454731';
const LIM = DRY?{extract:0,checks:0}:{extract:1,checks:3};
const take = {name:takeName,dry:DRY,started:new Date().toISOString(),marks:[],stills:[],requests:[],counts:{extract:0,checks:0,aborted:0},status:null,timings:{},read:null,result:null};
const now=()=>Date.now()/1000;
const save=()=>fs.writeFileSync(path.join(ROOT,'take.json'),JSON.stringify(take,null,1));
const mark=(n,x)=>{take.marks.push({name:n,t:now(),...(x||{})});console.log('['+new Date().toISOString().slice(11,19)+']',n,x?JSON.stringify(x):'');save();};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sv-prof-'));
const ctx=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,
  args:['--force-device-scale-factor=3','--window-size=600,1000','--hide-scrollbars'],
  viewport:{width:390,height:844},locale:'en-US',timezoneId:'Asia/Seoul',permissions:['clipboard-read','clipboard-write']});
const page=ctx.pages()[0]||await ctx.newPage();
await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url()),m=r.method();
  if(u.hostname.includes('stillvalid')&&u.pathname.startsWith('/api/')) take.requests.push({t:now(),m,p:u.pathname.replace(/\/api\/checks\/[^/]+/,'/api/checks/:id')});
  if(m==='DELETE'){take.counts.aborted++;mark('ABORT_DELETE');return route.abort();}
  if(m==='POST'&&u.pathname==='/api/extract'){ if(take.counts.extract>=LIM.extract){take.counts.aborted++;mark('ABORT_EXTRACT');return route.abort();} take.counts.extract++; mark('POST_EXTRACT'); }
  else if(m==='POST'&&u.pathname==='/api/checks'){ if(take.counts.checks>=LIM.checks){take.counts.aborted++;mark('ABORT_CHECKS');return route.abort();} take.counts.checks++; mark('POST_CHECKS'); }
  return route.continue();
});
const cdp=await ctx.newCDPSession(page);
const frames=[];let seq=0,pending=0,sizeLogged=false;
cdp.on('Page.screencastFrame',ev=>{
  seq++;const s=seq,ts=ev.metadata.timestamp;frames.push([s,ts]);
  cdp.send('Page.screencastFrameAck',{sessionId:ev.sessionId}).catch(()=>{});
  pending++;fs.writeFile(path.join(FR,String(s).padStart(6,'0')+'.jpg'),Buffer.from(ev.data,'base64'),()=>{pending--;});
});
const startCast=()=>cdp.send('Page.startScreencast',{format:'jpeg',quality:95,everyNthFrame:1});
const metrics=d=>cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:d,mobile:false});
async function still(name,boxes){
  const t0=now();
  let bb={};
  if(boxes) bb=await page.evaluate(sels=>{const o={};for(const [k,s] of Object.entries(sels)){const e=[...document.querySelectorAll(s)];o[k]=e.filter(x=>{const r=x.getBoundingClientRect();return r.width>0}).map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})};return o},boxes);
  await metrics(6); await sleep(120);
  const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(ST,name+'.png'),Buffer.from(data,'base64'));
  await metrics(1); await sleep(120);
  take.stills.push({name,t0,t1:now(),boxes:bb});save();console.log('  still',name,(now()-t0).toFixed(2));
}
async function glide(toY,ms=1400){ // smooth scroll to absolute Y
  await page.evaluate(([toY,ms])=>new Promise(res=>{const a=window.scrollY,b=Math.min(toY,document.documentElement.scrollHeight-innerHeight),t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;window.scrollTo(0,a+(b-a)*e);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)}),[toY,ms]);
}
async function glideTo(sel,offset=70,ms=1400){const y=await page.locator(sel).first().evaluate((e,o)=>e.getBoundingClientRect().top+scrollY-o,offset);await glide(y,ms);await sleep(250);}
const closeModal=async()=>{const c=page.locator('[aria-labelledby="modal-title"] button[aria-label]').first();await c.click();await sleep(500);};
const setLang=async(code)=>{await page.locator('button.language-button').click();await sleep(700);await page.locator('.settings-language-fields select').selectOption(code);await sleep(900);await closeModal();};
let fail=null;
try{
  await startCast();
  // R0
  mark('R0_start');
  await page.goto(URL_APP,{waitUntil:'networkidle',timeout:60000});
  take.status=await page.evaluate(()=>fetch('/api/status').then(r=>r.json()));save();
  mark('R0_status',{sha:take.status.deploymentSha,models:take.status.models});
  await sleep(1500);
  await still('s0_home');
  await sleep(1000);
  if(DRY){ mark('DRY_scroll_start'); const n0=seq; await page.evaluate(()=>new Promise(res=>{const t0=performance.now();const f=t=>{const k=(t-t0)/10000;window.scrollTo(0,(1-Math.cos(k*Math.PI*4))/2*1400);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)})); take.dryFrames10s=seq-n0; mark('DRY_scroll_end',{frames:seq-n0}); await glide(0,600); }
  // R1
  mark('S1_settings_open');
  await page.locator('button.language-button').click(); await sleep(1300);
  await page.locator('.settings-language-fields select').selectOption('en'); await sleep(1100);
  await page.locator('.country-search input').pressSequentially('United States',{delay:70}); await sleep(700);
  await page.locator('.country-list button',{hasText:'United States'}).first().click(); await sleep(1000);
  if(await page.locator('[aria-labelledby="modal-title"]').count()) await closeModal();
  mark('S1_settings_done'); await sleep(1200);
  // R2
  mark('S2_upload_start');
  await glideTo('#photo-tab',120,900);
  await page.locator('#photo-tab').click(); await sleep(800);
  await page.locator('input[type=file]:not([capture])').setInputFiles(CARD); await page.locator('.image-preview').waitFor({timeout:20000}); await sleep(1500);
  mark('S2_preview');
  if(!(await page.locator('[aria-labelledby="modal-title"]').count())){ await page.locator('button[aria-label="Crop photo"], .image-preview button:has(svg.lucide-crop)').first().click(); await sleep(1200);}
  mark('S2_crop_open'); await sleep(1400);
  await page.getByRole('button',{name:'Use this crop'}).click(); await sleep(1400);
  mark('S2_crop_done');
  await glideTo('.start-button',360,700); await sleep(600);
  if(DRY){
    mark('DRY_selector_ok_upload');
    // verify privacy link, examples, language on synthetic result
    await page.goto(URL_APP,{waitUntil:'networkidle'});await sleep(800);
    const privacy=await page.locator('footer button, footer a').allTextContents();console.log('footer',privacy.join(' | '));
    await page.locator('.example-card').nth(2).scrollIntoViewIfNeeded();await page.locator('.example-card').nth(2).click();
    await page.locator('.result-heading').waitFor({timeout:15000});await sleep(1000);
    console.log('example result:',await page.locator('.result-heading h1').textContent(),'| banner',await page.locator('.demo-banner').count());
    await setLang('ko');await sleep(800);console.log(' ko h1',await page.locator('.result-heading h1').textContent());
    await setLang('ar');await sleep(800);console.log(' ar h1',await page.locator('.result-heading h1').textContent());
    await setLang('en');await sleep(500);
    await page.locator('.next-step-card button.secondary').click();await sleep(500);
    console.log(' clip',(await page.evaluate(()=>navigator.clipboard.readText())).length);
    await page.locator('.delete-button').scrollIntoViewIfNeeded();await page.locator('.delete-button').click();await sleep(700);
    console.log(' dialog',await page.locator('.delete-dialog').count());
    await page.locator('.delete-dialog button.secondary').click();await sleep(400);
    mark('DRY_done');
  } else {
    // R3
    const r3=now(); mark('S3_read_click');
    await page.locator('.start-button').click();
    await page.getByRole('heading',{name:'Is this the right notice?'}).waitFor({timeout:120000});
    take.timings.readSeconds=+(now()-r3).toFixed(1); mark('S3_review_up',{readSeconds:take.timings.readSeconds});
    await sleep(1600);
    await still('s3_review');
    take.read=await page.evaluate(()=>{const v=[...document.querySelectorAll('.field-label')].map(l=>{const c=l.querySelector('input,textarea,select');return c?[l.childNodes[0]?.textContent,c.value]:null}).filter(Boolean);return {fields:v,early:!!document.querySelector('.early-check-note'),read:[...document.querySelectorAll('.read-fields > div')].map(d=>d.innerText)}});save();console.log('read',JSON.stringify(take.read));
    await sleep(1500);
    // R4
    mark('S4_country');
    const sel=page.locator('.field-label',{hasText:'Country read from the notice'}).locator('select');
    await sel.scrollIntoViewIfNeeded(); await glide(await sel.evaluate(e=>e.getBoundingClientRect().top+scrollY-260),900); await sleep(1000);
    const cur=await sel.inputValue(); take.read.countryBefore=cur; if(cur!=='KR'){await sel.selectOption('KR');mark('S4_selected_KR');} await sleep(1200);
    await page.locator('.mismatch-box').waitFor({timeout:8000}); await glideTo('.mismatch-box',300,700); mark('S4_mismatch'); await sleep(1800);
    await still('s4_mismatch',{mismatch:'.mismatch-box'});
    await sleep(1400);
    await page.getByRole('button',{name:'Use the notice country'}).click(); mark('S4_use_notice_country'); await sleep(1500);
    // R5
    mark('S5_url');
    await glideTo('input[type=url]',260,800); await sleep(500);
    await page.locator('input[type=url]').click(); await page.locator('input[type=url]').pressSequentially(NOTICE,{delay:38}); await sleep(1200);
    await glideTo('button.primary.full:has-text("Check official sources")',560,600); await sleep(800);
    const r5=now(); mark('S5_check_click');
    await page.getByRole('button',{name:'Check official sources'}).click();
    mark('S6_progress');
    await page.locator('.result-heading').waitFor({timeout:150000});
    take.timings.checkSeconds=+(now()-r5).toFixed(1); mark('S6_result_up',{checkSeconds:take.timings.checkSeconds});
    await sleep(1800);
    const h1=(await page.locator('.result-heading h1').textContent()).trim();
    take.result={h1,warnings:await page.locator('.result-warnings p').allTextContents(),articles:await page.locator('article').allInnerTexts()};
    const bodyTxt=await page.evaluate(()=>document.body.innerText);
    take.result.quotesConfirmed=(bodyTxt.match(/Quotes confirmed: \d+ of \d+/)||[null])[0];
    take.result.timingPanel=(bodyTxt.match(/Processing time[\s\S]{0,260}/)||[null])[0];
    take.result.resultBodyLen=bodyTxt.length; save(); console.log('RESULT',JSON.stringify(take.result));
    const boxes={heading:'.result-heading',article:'article',quotes:'.evidence-quotes',q:'.evidence-quotes > div',sources:'.sources-card',next:'.next-step-card'};
    await still('s6_top',boxes); await sleep(1500);
    const success=h1==='We found a few changes';
    const art=success?'article:has-text("Application deadline")':'article';
    if(await page.locator(art).count()){
      mark('S6_changes'); await glideTo(art,90,1600); await sleep(1500); await still('s6_change',boxes); await sleep(1200);
      mark('S6_evidence');
      await page.locator(art+' details.evidence-details summary').first().click(); await sleep(1200);
      await glideTo(art+' .evidence-quotes',110,1300); await sleep(1400); await still('s6_quotes',boxes); await sleep(1600);
    }
    mark('S6_sources');
    await glideTo('.sources-card',90,1500); await sleep(1500); await still('s6_sources',boxes); await sleep(1200);
    if(await page.getByText('Processing time').count()){ await glideTo('text=Processing time',120,1000); await sleep(1200); await still('s6_timing',boxes); await sleep(600);}    
    // R7
    mark('S7_next'); await glideTo('.next-step-card',100,1300); await sleep(1800);
    // R9
    await glideTo('.result-heading',80,1400); await sleep(900);
    mark('S9_lang_start'); const nreq=take.requests.length;
    mark('S9_ko'); await setLang('ko'); await sleep(2200);
    mark('S9_ar'); await setLang('ar'); await sleep(1400); await still('s9_ar',boxes); await sleep(1200);
    mark('S9_en'); await setLang('en'); await sleep(1800);
    const after=take.requests.slice(nreq); take.langNonGet=after.filter(r=>r.m!=='GET').length; mark('S9_done',{nonGet:take.langNonGet,reqs:after.length});
    // R10
    mark('S10_copy'); await glideTo('.next-step-card',100,1100); await sleep(500);
    await page.locator('.next-step-card button.secondary').click(); await sleep(1600);
    take.clipLen=(await page.evaluate(()=>navigator.clipboard.readText())).length; mark('S10_copied',{clip:take.clipLen});
    await glideTo('.delete-button',600,1200); await sleep(800);
    await page.locator('.delete-button').click(); await sleep(1500); mark('S10_dialog');
    await still('s10_delete'); await sleep(1500);
    await page.locator('.delete-dialog button.secondary').click(); await sleep(800); mark('S10_closed');
    // R8
    mark('S8_home'); await page.evaluate(()=>scrollTo(0,0)); await sleep(200);
    await page.locator('.back-button').click(); await page.locator('.example-card').first().waitFor({timeout:15000}); await sleep(1000);
    await glideTo('.example-card',300,1400); await sleep(1000);
    mark('S8_click'); await page.locator('.example-card').nth(2).click();
    await page.locator('.result-heading').waitFor({timeout:15000}); mark('S8_result'); await sleep(1800);
    await still('s8_example',{banner:'.demo-banner',heading:'.result-heading'});
    await sleep(1800); mark('S8_end');
    take.success=success && /Quotes confirmed: 1 of 1|Quotes confirmed/.test(bodyTxt) && !take.result.warnings.length;
  }
  mark('END');
}catch(e){fail=String(e.stack||e);console.error('FAIL',fail);take.error=fail;try{await page.screenshot({path:path.join(ROOT,'error.png')});}catch{}; }
await cdp.send('Page.stopScreencast').catch(()=>{});
for(let i=0;i<200&&pending>0;i++) await sleep(50);
take.frames={count:frames.length}; fs.writeFileSync(path.join(ROOT,'frames.json'),JSON.stringify(frames)); save();
await ctx.close();
fs.rmSync(profile,{recursive:true,force:true});
console.log('DONE',takeName,'frames',frames.length,'extract',take.counts.extract,'checks',take.counts.checks,'aborted',take.counts.aborted,'success',take.success,'t',take.timings);
