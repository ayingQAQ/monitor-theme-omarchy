import {test,expect} from '@playwright/test';
import {nodes as demoNodes,historical} from '../../dev/hub.js';

test.use({reducedMotion:'reduce'});

test('delayed site settings preserve the node banner on a direct detail visit',async({page})=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/me',async route=>{await gate;await route.fulfill({json:{site_name:'OMARCHY DEMO',history_days:31,demo:true}});});
 await page.routeWebSocket('**/api/ws*',ws=>ws.send(JSON.stringify({nodes:demoNodes()})));
 await page.goto('/#/node/1');await expect(page.locator('.ping-chart svg').first()).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);release();await expect(page.locator('#demo')).toBeVisible();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const direct=await page.locator('#banner').evaluate(el=>el.toDataURL());
 await page.keyboard.press('Escape');await expect(page.locator('#grid')).toBeVisible();
 await page.locator('.card').first().click();await expect(page.locator('#detail')).toBeVisible();
 expect(await page.locator('#banner').evaluate((el,expected)=>el.toDataURL()===expected,direct)).toBe(true);
});

test('ping refresh failure labels retained charts and clears the warning after recovery',async({page})=>{
 let fail=false;
 await page.routeWebSocket('**/api/ws*',ws=>ws.send(JSON.stringify({nodes:demoNodes()})));
 await page.route('**/api/nodes/*/metrics?*',route=>fail
  ?route.fulfill({status:503,contentType:'text/plain',body:'PING_UNAVAILABLE '+ 'x'.repeat(300)})
  :route.fulfill({json:historical()}));
 await page.goto('/');await expect(page.locator('#demo')).toBeVisible();await page.locator('.card').first().click();
 await expect(page.locator('.ping-chart svg')).toHaveCount(2);
 await page.getByRole('button',{name:'ping',exact:true}).click();
 fail=true;await page.keyboard.press('Shift+R');
 await expect(page.getByRole('alert')).toContainText('PING_UNAVAILABLE');
 await expect(page.getByRole('alert')).toContainText('previous data');
 await expect(page.locator('.ping-chart svg')).toHaveCount(2);
 await page.setViewportSize({width:320,height:800});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 fail=false;await page.keyboard.press('Shift+R');await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'overview',exact:true}).click();fail=true;await page.keyboard.press('Shift+R');
 await expect(page.getByRole('alert')).toContainText('PING_UNAVAILABLE');
});

test('live node updates reuse unchanged ping models and charts across many tasks',async({page})=>{
 let socket;const nodes=demoNodes(),base=historical(),points=base.ping.filter(p=>p.task_id===1),count=24;
 const data={...base,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`Probe ${i+1}`])),
  ping:Array.from({length:count},(_,i)=>points.map(p=>({...p,task_id:i+1}))).flat()};
 await page.routeWebSocket('**/api/ws*',ws=>{socket=ws;ws.send(JSON.stringify({nodes}));});
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes}}));
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:data}));
 await page.goto('/');await expect(page.locator('#demo')).toBeVisible();await page.locator('.card').first().click();
 await expect(page.locator('.ping-chart svg')).toHaveCount(count);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(()=>{
  window.savedCharts=[...document.querySelectorAll('.ping-chart svg')];window.pingSorts=0;
  const sort=Array.prototype.sort;
  Array.prototype.sort=function(...args){if(this[0]&&typeof this[0]==='object'&&'task_id'in this[0]&&'latency'in this[0])window.pingSorts++;return sort.apply(this,args);};
 });
 nodes[0].metrics.cpu=73.5;socket.send(JSON.stringify({nodes}));await expect(page.locator('#detail-body')).toContainText('73.5%');
 expect(await page.evaluate(()=>window.savedCharts.every((svg,i)=>svg===document.querySelectorAll('.ping-chart svg')[i]))).toBe(true);
 expect(await page.evaluate(()=>window.pingSorts)).toBe(0);
 const oldPath=await page.locator('.ping-line').first().getAttribute('d');
 data.ping=data.ping.map(p=>({...p,latency:p.latency+25}));await page.keyboard.press('Shift+R');
 await expect(page.locator('.ping-line').first()).not.toHaveAttribute('d',oldPath);
 const oldView=await page.locator('.ping-chart svg').first().getAttribute('viewBox');
 await page.setViewportSize({width:640,height:800});await expect(page.locator('.ping-chart svg').first()).not.toHaveAttribute('viewBox',oldView);
 await page.locator('#st-lang').click();await expect(page.locator('.ping-chart svg').first()).toHaveAttribute('aria-label',/延迟折线图/);
 await page.locator('[data-tab="ping"]').click();await page.locator('[data-task="1"]').click();
 await expect(page.locator('.ping-chart svg')).toHaveCount(1);await expect(page.locator('.ping-chart svg')).toHaveAttribute('height','240');
 await page.keyboard.press('Escape');await expect(page.locator('.ping-chart svg')).toHaveCount(count);
 await page.getByRole('button',{name:'1h',exact:true}).click();await expect(page.locator('#st-pos')).toHaveText('1h');
 await expect(page.locator('.ping-chart svg')).toHaveCount(count);
});
