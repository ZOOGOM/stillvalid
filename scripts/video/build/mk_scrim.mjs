import { chromium } from '/Users/zoogom/stillvalid-video/tools/node_modules/playwright-core/index.mjs';
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.setContent('<!doctype html><style>html,body{margin:0;background:transparent}div{width:1920px;height:1080px;background:linear-gradient(90deg,rgba(4,6,8,.86) 0,rgba(4,6,8,.8) 58%,rgba(4,6,8,0) 76%)}</style><div></div>');
await p.screenshot({path:process.env.HOME+'/stillvalid-video/final/outro/scrim.png',omitBackground:true});await b.close();
