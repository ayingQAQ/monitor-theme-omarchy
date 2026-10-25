import {test,expect} from '@playwright/test';
test('fresh visitors start with Catppuccin and can use terminal-styled controls',async({page})=>{
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await expect(page.locator('#st-pal')).toHaveText('catppuccin');await expect(page.locator('.palette-control')).toBeVisible();await page.locator('#palette').selectOption('nord');await expect(page.locator('#st-pal')).toHaveText('nord');
});
test('faithful list, Monitor detail, routing, languages and palettes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);
 await expect(page.locator('#demo')).toBeVisible();await page.locator('.card').first().click();await expect(page).toHaveURL(/#\/node\/1/);await expect(page.locator('#detail-body')).toContainText('config');
 await page.reload();await expect(page.locator('#detail')).toBeVisible();await page.getByRole('button',{name:'ping',exact:true}).click();await expect(page.locator('.blk').first()).toContainText('Tokyo');await expect(page.locator('#detail-body')).not.toContainText('p95');
 await page.keyboard.press('Escape');await expect(page.locator('#grid')).toBeVisible();await page.locator('#palette').selectOption('gruvbox');await expect(page.locator('#st-pal')).toHaveText('gruvbox');await page.locator('#st-lang').click();await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');expect(errors).toEqual([]);
});
test('401 removes stale list and history and explains the login requirement',async({page})=>{
 await page.routeWebSocket('**/api/ws*',ws=>ws.close());
 let closed=false;await page.route('**/api/nodes',async route=>{if(closed)return route.fulfill({status:401,contentType:'text/plain',body:'需要登录后查看'});return route.continue();});
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await page.locator('.card').first().click();await expect(page.locator('#detail')).toBeVisible();closed=true;
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); // visible resume fetch
 await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('#detail')).toBeHidden();await expect(page.locator('#connection')).toContainText('需要登录');
});
test('idle saver exits when reduced motion changes and responds to user input',async({page})=>{
 await page.clock.install();await page.goto('/');await expect(page.locator('#demo')).toBeVisible();await expect(page.locator('.card')).toHaveCount(6);await page.clock.fastForward(90001);await expect(page.locator('#saver')).toBeVisible();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#saver')).toBeHidden();await page.keyboard.press('s');await expect(page.locator('#saver')).toBeHidden();await page.emulateMedia({reducedMotion:'no-preference'});await page.keyboard.press('s');await expect(page.locator('#saver')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#saver')).toBeHidden();
});
test('browser without gzip decompression uses text websocket snapshots',async({page})=>{
 await page.addInitScript(()=>{window.DecompressionStream=undefined;});await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await expect(page.locator('#connection')).toBeHidden();
});
test('empty response and invalid settings do not turn into demo fallbacks',async({page})=>{
 await page.routeWebSocket('**/api/ws*',ws=>ws.close());await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[]}}));await page.route('**/api/themes/*/config',r=>r.fulfill({json:{palette_dark:'missing',intro:'off',screensaver:'broken',language:'en'}}));await page.goto('/');await expect(page.locator('#empty')).toBeVisible();await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('#summary')).toContainText('0/0');
});
test('storage methods may throw; preference works for the current session',async({page})=>{
 await page.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('denied','SecurityError');};});await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await page.locator('#palette').selectOption('gruvbox');await expect(page.locator('#st-pal')).toHaveText('gruvbox');
});
test('loaded fonts and viewport resizing keep character geometry aligned',async({page})=>{
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await page.screenshot();await page.locator('.card').first().click();await expect(page.locator('.blk').first()).toBeVisible();await page.screenshot({fullPage:true});
 for(const width of [320,375,768]){await page.setViewportSize({width,height:850});await page.waitForTimeout(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('medium windows use two compact columns instead of a narrow centered stack',async({page})=>{
 await page.setViewportSize({width:860,height:850});await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await page.screenshot();
 const layout=await page.locator('#grid').evaluate(el=>{const a=el.children[0].getBoundingClientRect(),b=el.children[1].getBoundingClientRect();return {firstTop:a.top,secondTop:b.top,firstLeft:a.left,secondLeft:b.left,height:a.height};});
 expect(layout.firstTop).toBe(layout.secondTop);expect(layout.secondLeft).toBeGreaterThan(layout.firstLeft);expect(layout.height).toBeLessThanOrEqual(180);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('native buttons activate with Enter and retain focus across snapshots',async({page})=>{
 await page.goto('/');const group=page.getByRole('button',{name:'[prod]',exact:true});await group.focus();await page.keyboard.press('Enter');await expect(page.locator('.card')).toHaveCount(2);await expect(page).not.toHaveURL(/node/);
 await page.locator('.card').first().click();const ping=page.getByRole('button',{name:'ping',exact:true});await ping.focus();await page.keyboard.press('Enter');await expect(page.locator('#st-mode')).toHaveText('PING');await ping.focus();await page.waitForTimeout(2300);await expect(ping).toBeFocused();
});
test('restoring page cache reconnects and restores the detail route',async({page})=>{
 await page.goto('/#/node/1');await expect(page.locator('#detail')).toBeVisible();await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await expect(page.locator('#detail')).toBeVisible();
});
test('Chinese detail has aligned labels on narrow screens after histories load',async({page})=>{
 await page.setViewportSize({width:320,height:850});await page.goto('/');await page.locator('#st-lang').click();await page.locator('.card').first().click();await expect(page.locator('.blk').first()).toBeVisible();await page.screenshot();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('meter filled and empty cells share the same rectangle independent of glyph ink',async({page})=>{
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);
 const geometry=await page.locator('.card').first().evaluate(el=>{
  const fill=el.querySelector('.meter-fill .cell'),empty=el.querySelector('.meter-empty .cell');if(!fill||!empty)return null;
  const a=fill.getBoundingClientRect(),b=empty.getBoundingClientRect();return {heightA:a.height,heightB:b.height,topA:a.top,topB:b.top,widthA:a.width,widthB:b.width,fill:getComputedStyle(fill).backgroundColor,pattern:getComputedStyle(empty).backgroundImage};
 });
 expect(geometry).not.toBeNull();expect(geometry.heightA).toBe(12);expect(geometry.heightB).toBe(12);expect(geometry.topA).toBe(geometry.topB);expect(geometry.widthA).toBe(geometry.widthB);expect(geometry.fill).not.toBe('rgba(0, 0, 0, 0)');expect(geometry.pattern).toContain('radial-gradient');
});
test('groups and search affect the visible summary; offline and waiting differ',async({page})=>{
 await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await expect(page.locator('#grid')).toContainText('waiting');await expect(page.locator('#grid')).toContainText('offline');
  await page.getByRole('button',{name:'[prod]',exact:true}).click();await expect(page.locator('.card')).toHaveCount(2);await expect(page.locator('#summary')).toContainText('2/2');
 await page.keyboard.press('/');await page.locator('#cmd-in').fill('tokyo');await expect(page.locator('.card')).toHaveCount(1);await page.keyboard.press('Enter');await expect(page.locator('#summary')).toContainText('1/1');
});
for(const width of [320,375,768,1200])test(`no horizontal overflow at ${width}px including detail`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.card').first().click();await expect(page.locator('#detail')).toBeVisible();await expect(page.locator('.blk').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('storage denial, reduced motion and hostile node text remain safe',async({page})=>{
 await page.routeWebSocket('**/api/ws*',ws=>ws.close());
 await page.route('**/api/nodes',async route=>{const response=await route.fetch(),data=await response.json();data.nodes.at(-1).name='<img src=x onerror="window.pwned=true"> 中文';data.nodes.at(-1).public_remark='<svg onload="window.pwned=true">';return route.fulfill({json:data});});
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.card')).toHaveCount(6);await page.locator('#palette').selectOption('nord');await expect(page.locator('#st-pal')).toHaveText('nord');await page.keyboard.press('s');await expect(page.locator('#saver')).toBeHidden();await expect(page.locator('#grid img')).toHaveCount(0);await page.locator('.card').last().click();await expect(page.locator('#st-name')).toContainText('<img');await expect(page.locator('#detail-body img')).toHaveCount(0);expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
});
