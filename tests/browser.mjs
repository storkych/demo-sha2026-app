import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const failures=[];page.on('pageerror',error=>failures.push(error.message));
await fs.mkdir('test-results',{recursive:true});
try {
 await page.goto('http://127.0.0.1:5173');
 await page.getByLabel('Пароль',{exact:true}).fill('wrong');
 await page.getByRole('button',{name:'Войти в систему'}).click();
 await page.getByText('Пароль введён неверно').waitFor();
 await page.screenshot({path:'test-results/login.png'});
 await page.getByLabel('Пароль',{exact:true}).fill('1111');
 await page.getByRole('button',{name:'Войти в систему'}).click();
 await page.getByRole('button',{name:'Смотреть заставку'}).click();
 await page.getByRole('button',{name:'Enter — продолжить'}).waitFor({timeout:15000});
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
   await page.getByLabel('Ваш ответ').fill('1111');await page.getByRole('button',{name:'Проверить',exact:true}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await page.getByRole('button',{name:/Финальный блок/}).click();
  if(r===2){await page.getByRole('button',{name:'Архив Открыть архив'}).click();assert.ok(await page.getByRole('button',{name:'Север Доступ закрыт'}).isDisabled());assert.equal(await page.getByLabel('Код отмены уничтожения').count(),0);}
  if(r===0){await page.getByRole('button',{name:'Горизонт Авиакомпания'}).click();assert.ok(await page.getByRole('button',{name:'Реестр 02 Доступ закрыт'}).isDisabled());assert.equal(await page.locator('.flight').count(),0);}
 }
 await page.getByRole('button',{name:'Реестр 02 Список рейсов'}).click();
 await page.getByText('SHA-2026',{exact:true}).last().waitFor();
 await page.screenshot({path:'test-results/archive.png'});
 await page.getByLabel('Код отмены уничтожения').fill('no');await page.getByRole('button',{name:'Остановить таймер'}).click();await page.getByText('Неверный код. Отсчёт продолжается.').waitFor();
 await page.reload();
 const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('flight-quest')));assert.equal(after.deadline,before.deadline);
 // Secret keyboard sequence works even when an answer input has focus.
 await page.getByRole('button',{name:/Финальный блок/}).click();
 await page.getByLabel('Код отмены уничтожения').focus();
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 await page.getByRole('heading',{name:'Прогресс команды'}).waitFor();
 assert.equal(await page.getByRole('checkbox').count(),9);
 await page.getByRole('checkbox').first().uncheck();
 await page.keyboard.press('Escape');
 assert.equal(await page.getByLabel('Код отмены уничтожения').count(),0);
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 await page.getByRole('checkbox').first().check();await page.keyboard.press('Escape');
 await page.getByLabel('Код отмены уничтожения').fill('SHA-2026');await page.getByRole('button',{name:'Остановить таймер'}).click();
 await page.getByRole('heading',{name:'Данные сохранены'}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Данные сохранены'}).waitFor();
 // Expired state remains locked after restart, reset requires the host panel.
 await page.evaluate(()=>localStorage.setItem('flight-quest',JSON.stringify({version:1,phase:'playing',deadline:Date.now()-1,stoppedAt:null,solved:Array(9).fill(false)})));
 await page.reload();await page.getByRole('heading',{name:'Данные уничтожены'}).waitFor();
 await page.evaluate(() => { for (const key of 'ТЧша2026') window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Сбросить всю игру'}).click();
 await page.getByRole('heading',{name:'Доступ к системе'}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(failures,[]);
 console.log('Browser flow passed: login, intro, all nine puzzles, locks, reload, admin, victory, expiry, reset, mobile.');
}finally{await browser.close();}
