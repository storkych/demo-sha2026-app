import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ANSWERS } from '../src/engine.mjs';
const browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const failures=[];page.on('pageerror',error=>failures.push(error.message));
await fs.mkdir('test-results',{recursive:true});
try {
 await page.goto('http://127.0.0.1:5173');
 assert.equal(await page.locator('input').count(),0);
 await page.screenshot({path:'test-results/login.png'});
 await page.getByRole('button',{name:'Войти в систему'}).click();
 await page.locator('.cinema video').waitFor();
 assert.equal(await page.locator('video').evaluate(v=>v.controls),false);
 assert.ok(await page.locator('.cinema').evaluate(el=>{const r=el.getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&r.x===0&&r.y===0;}));
 await page.waitForFunction(()=>document.querySelector('video').currentTime>0);
 await page.screenshot({path:'test-results/intro-fullscreen.png'});
 assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),0);
 await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('ended')));
 await page.getByRole('button',{name:'Продолжить',exact:true}).waitFor();
 const originalDeadline=JSON.parse(await page.evaluate(()=>localStorage.getItem('flight-quest'))).deadline;
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:/Пересмотреть/}).click();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.cinema').count(),1);
  await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.getByText(`Осталось повторов: ${2-i}`,{exact:true}).waitFor();
 }
 assert.ok(await page.getByRole('button',{name:/Пересмотреть/}).isDisabled());
 await page.reload();
 assert.ok(await page.getByRole('button',{name:/Пересмотреть/}).isDisabled());
 assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('flight-quest'))).deadline,originalDeadline);
 const before=JSON.parse(await page.evaluate(()=>localStorage.getItem('flight-quest')));
 assert.equal(before.phase,'ready'); assert.ok(before.deadline>Date.now());
 await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'Кабина пилота',exact:true}).waitFor();
 await page.getByRole('button',{name:'Штурвал: Найди свою частоту'}).hover();
 assert.equal(await page.locator('path.highlight').count(),1);
 await page.waitForTimeout(300);
 await page.screenshot({path:'test-results/cockpit.png'});
 await page.getByRole('button',{name:/Финальный блок/}).click();
 assert.ok(await page.getByRole('button',{name:'Архив Доступ закрыт'}).isDisabled());
 const roomNames=['Кабина пилота','Пассажирский салон','Багажный отсек'];
 for(const r of [2,0,1]) {
  await page.getByRole('button',{name:new RegExp(roomNames[r]+' ')}).click();
  for(let i=0;i<3;i++){
   await page.locator('.hotspot').nth(i).click();
   if(r===2&&i===0){await page.getByLabel('Ваш ответ').fill('no');await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByText('Неверный ответ. Попробуйте ещё раз.').waitFor();await page.screenshot({path:'test-results/puzzle.png'});}
   await page.getByLabel('Ваш ответ').fill(ANSWERS[r*3+i][0]);await page.getByRole('button',{name:'Проверить',exact:true}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await page.getByRole('button',{name:/Финальный блок/}).click();
  if(r===2){await page.getByRole('button',{name:'Архив Открыть архив'}).click();assert.ok(await page.getByRole('button',{name:'поражение Доступ закрыт'}).isDisabled());assert.ok(await page.getByLabel('Пароль отмены уничтожения').isDisabled());}
  if(r===0){await page.getByRole('button',{name:'сибирские авиалинии Авиакомпания'}).click();assert.ok(await page.getByRole('button',{name:'Северное направление Доступ закрыт'}).isDisabled());assert.equal(await page.locator('.flight').count(),0);}
 }
 // Full access reveals the header control in every room, without opening the archive.
 for(const name of roomNames) {
  await page.getByRole('button',{name:new RegExp(name+' ')}).click();
  assert.equal(await page.locator('.topbar #cancel').count(),1);
 }
 await page.getByRole('button',{name:/Финальный блок/}).click();
 await page.getByRole('button',{name:'Северное направление Список рейсов'}).click();
 assert.deepEqual(await page.locator('.flight > span').allTextContents(),['MAT','VEI','KOG']);
 const archiveRows=[
  ['поражение',[['COF','YAB','ESS'],['KON','STA','NTI'],['ISA','BEL','LAA']]],
  ['сибирские авиалинии',[['VAS','ILI','YKK'],['MAT','VEI','KOG'],['TAT','IAN','ASE']]],
  ['D6 airlines',[['FED','ORB','ESS'],['VLA','DLE','NKO'],['IGN','ATI','YDA']]]
 ];
 for(const [airline,directions] of archiveRows){
  await page.locator('.breadcrumbs').getByRole('button',{name:'Архив',exact:true}).click();
  await page.getByRole('button',{name:airline+' Авиакомпания',exact:true}).click();
  for(const [i,name] of ['Западное направление','Северное направление','Южное направление'].entries()){
   await page.locator('.folder-tree').getByRole('button',{name,exact:true}).click();
   assert.deepEqual(await page.locator('.flight > span').allTextContents(),directions[i]);
  }
 }
 // The cancellation controls must be on screen without Playwright auto-scrolling.
 // Check the expanded archive tree at desktop, small laptop and mobile sizes.
 for(const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1024,height:600},{width:390,height:844},{width:390,height:600}]) {
  await page.setViewportSize(viewport);
  for(const selector of ['#cancel','.timer-cancel button']) {
   const geometry=await page.locator(selector).evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const nav=document.querySelector('.bottom-nav').getBoundingClientRect();
    const topbar=document.querySelector('.topbar').getBoundingClientRect();
    const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    return {visible:rect.top>=topbar.top&&rect.bottom<=topbar.bottom&&rect.bottom<=nav.top&&rect.left>=0&&rect.right<=innerWidth,unobstructed:element.contains(hit)};
   });
   assert.ok(geometry.visible&&geometry.unobstructed,`${selector} is clipped or covered at ${viewport.width}x${viewport.height}`);
  }
 }
 await page.setViewportSize({width:1366,height:768});
 await page.screenshot({path:'test-results/archive.png'});
 await page.getByLabel('Пароль отмены уничтожения').fill('no');await page.getByRole('button',{name:'Остановить таймер'}).click();await page.getByText('Неверный код. Отсчёт продолжается.').waitFor();
 await page.reload();
 const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('flight-quest')));assert.equal(after.deadline,before.deadline);
 // Secret keyboard sequence works even when an answer input has focus.
 await page.getByRole('button',{name:/Финальный блок/}).click();
 await page.getByLabel('Пароль отмены уничтожения').focus();
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 await page.getByRole('heading',{name:'Прогресс команды'}).waitFor();
 assert.equal(await page.getByRole('checkbox').count(),9);
 await page.getByRole('checkbox').first().uncheck();
 await page.keyboard.press('Escape');
 assert.ok(await page.getByLabel('Пароль отмены уничтожения').isDisabled());
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 await page.getByRole('checkbox').first().check();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/Кабина пилота /}).click();
 await page.getByLabel('Пароль отмены уничтожения').fill('Игнатий Даванков');await page.getByRole('button',{name:'Остановить таймер'}).click();
 await page.locator('video.end-video').waitFor();
 assert.equal(await page.locator('video.end-video').evaluate(v=>v.controls),false);
 await page.screenshot({path:'test-results/outro-fullscreen.png'});
 await page.locator('video.end-video').evaluate(v=>v.dispatchEvent(new Event('ended')));
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:/Пересмотреть/}).click();
  await page.locator('video.end-video').evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.getByText(`Осталось повторов: ${2-i}`,{exact:true}).waitFor();
 }
 assert.ok(await page.getByRole('button',{name:/Пересмотреть/}).isDisabled());
 await page.reload();
 assert.ok(await page.getByRole('button',{name:/Пересмотреть/}).isDisabled());
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('heading',{name:'Данные сохранены'}).waitFor();
 // Expired state remains locked after restart, reset requires the host panel.
 await page.evaluate(()=>localStorage.setItem('flight-quest',JSON.stringify({version:1,phase:'playing',deadline:Date.now()-1,stoppedAt:null,solved:Array(9).fill(false)})));
 await page.reload();await page.getByRole('heading',{name:'Данные уничтожены'}).waitFor();
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Сбросить всю игру'}).click();
 await page.getByRole('heading',{name:'Доступ к системе'}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(failures,[]);
 console.log('Browser flow passed: fullscreen videos, persistent replay limits, login, intro, all nine puzzles, locks, reload, admin, victory, expiry, reset, mobile.');
}finally{await browser.close();}
