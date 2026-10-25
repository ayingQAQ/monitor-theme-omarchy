import {preview} from 'vite';
import {chromium,expect} from '@playwright/test';
import {nodes,historical} from '../dev/hub.js';
const server=await preview({preview:{host:'127.0.0.1',port:0,strictPort:true}});
const port=server.httpServer.address().port,browser=await chromium.launch();
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{const url=new URL(route.request().url());const value=url.pathname==='/api/me'?{site_name:'PRODUCTION SMOKE',history_days:7}:url.pathname==='/api/nodes'?{nodes:nodes()}:url.pathname.endsWith('/config')?{intro:'off',language:'en'}:historical();return route.fulfill({json:value});});
 await page.routeWebSocket('**/api/ws*',ws=>ws.send(JSON.stringify({nodes:nodes()})));
 await page.goto(`http://127.0.0.1:${port}`);await expect(page.locator('.card')).toHaveCount(6);await expect(page.locator('#demo')).toBeHidden();await expect(page.locator('#banner')).toBeVisible();
 await page.locator('.card').first().click();await page.reload();await expect(page.locator('#detail')).toBeVisible();await expect(page.locator('.blk').first()).toBeVisible();
 for(const icon of ['/favicon.svg','/apple-touch-icon.png']){const response=await page.request.get(`http://127.0.0.1:${port}${icon}`);if(!response.ok())throw new Error(`icon unavailable: ${icon}`);}
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Production smoke passed: compiled list, detail reload, API mapping and fixed icons. API supplied by test harness, not a real Hub.');
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
