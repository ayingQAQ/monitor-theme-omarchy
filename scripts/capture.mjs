import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
await mkdir('docs/previews',{recursive:true});
const page=await browser.newPage({viewport:{width:1200,height:680},colorScheme:'dark',reducedMotion:'reduce'});
await page.goto(process.env.CAPTURE_URL||'http://127.0.0.1:5179');await page.locator('.card').first().waitFor();await page.waitForTimeout(2200);
await page.screenshot({path:'preview.png',fullPage:true});
await page.locator('.card').first().locator('.ln').nth(2).screenshot({path:'docs/previews/meter.png'});
await page.locator('.card').first().click();await page.waitForTimeout(300);await page.screenshot({path:'docs/previews/detail.png',fullPage:true});
for(const width of [320,375,768]){
 await page.setViewportSize({width,height:850});await page.waitForTimeout(250);
 console.log(JSON.stringify({width,scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth),geometry:await page.evaluate(()=>({dw:document.querySelector('#detail').style.getPropertyValue('--dw'),bodyFont:getComputedStyle(document.body).font,detailWidth:getComputedStyle(document.querySelector('#detail')).width,zoom:getComputedStyle(document.body).zoom,canvas:(()=>{let c=document.createElement('canvas').getContext('2d');c.font='15px '+getComputedStyle(document.body).fontFamily;return c.measureText('0').width;})()})),overflow:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,100),right:el.getBoundingClientRect().right})))}));
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error(`Overflow at ${width}px`);
 await page.screenshot({path:`docs/previews/detail-${width}.png`,fullPage:true});
}
await page.goto('http://127.0.0.1:5179');await page.locator('.card').first().waitFor();await page.screenshot({path:'docs/previews/mobile.png',fullPage:true});
await browser.close();
