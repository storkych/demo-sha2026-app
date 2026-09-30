import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('heading',{name:'Доступ к системе'}).waitFor();
 await page.evaluate(()=>localStorage.setItem('flight-quest',JSON.stringify({version:1,phase:'playing',deadline:Date.now()+7200000,stoppedAt:null,solved:Array(9).fill(true)})));
 await page.reload();await page.getByRole('button',{name:/Финальный блок/}).click();
 await page.getByRole('button',{name:'Архив Открыть архив'}).click();
 await page.waitForTimeout(5000);await page.screenshot({path:'test-results/archive-folders.png'});
 await page.getByRole('button',{name:/Пассажирский салон/}).click();await page.getByRole('button',{name:'Кресло: Дьявол в мелочах'}).hover();await page.waitForTimeout(300);await page.screenshot({path:'test-results/seat-hover.png'});
 await page.evaluate(()=>localStorage.setItem('flight-quest',JSON.stringify({version:1,phase:'playing',deadline:Date.now()+7200000,stoppedAt:null,solved:Array(9).fill(false)})));
 await page.reload();await page.waitForTimeout(5000);await page.locator('.hotspot').first().click();await page.getByLabel('Ваш ответ').fill('356.231');await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('status').waitFor();await page.waitForTimeout(300);await page.screenshot({path:'test-results/correct-answer.png'});
 console.log('Captured folder tree, seat outline, success animation.');
}finally{await browser.close();}
