import { chromium } from 'playwright-core';
const b = await chromium.launch({channel:'msedge',headless:true});
const p = await b.newPage({viewport:{width:1080,height:1350}});
await p.goto('file:///Users/zoogom/stillvalid-video/final/card/card.html');
await p.waitForTimeout(300);
await p.screenshot({path:'/Users/zoogom/stillvalid-video/final/demo-card.png'});
await b.close();
