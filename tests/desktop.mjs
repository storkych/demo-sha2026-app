import { _electron as electron } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=path.resolve('test-results/desktop-'+Date.now());await fs.mkdir(dir,{recursive:true});
const options={args: process.env.TEST_PACKAGED?['--smoke-test']:['.','--smoke-test'],env:{...process.env,PORTABLE_EXECUTABLE_DIR:dir},...(process.env.TEST_PACKAGED?{executablePath:path.resolve('release/win-unpacked/Flight Archive.exe')}:{})};
let app=await electron.launch(options);
try{
 let page=await app.firstWindow();await page.getByRole('heading',{name:'Доступ к системе'}).waitFor();
 await page.getByLabel('Пароль',{exact:true}).fill('1111');await page.getByRole('button',{name:'Войти в систему'}).click();await page.getByRole('button',{name:'Смотреть заставку'}).waitFor();
 await page.waitForFunction(async()=>{const state=await window.questStorage.read();return state?.phase==='video';});
 const saved=JSON.parse(await fs.readFile(path.join(dir,'quest-progress.json'),'utf8'));assert.equal(saved.phase,'video');
 await app.close();app=await electron.launch(options);page=await app.firstWindow();await page.getByRole('button',{name:'Смотреть заставку'}).waitFor();
 assert.equal(await page.locator('.backdrop').evaluate(e=>getComputedStyle(e).backgroundImage.includes('cockpit.png')),true);
 console.log('Desktop smoke passed: local assets, preload bridge, save beside executable, resume after restart.');
}finally{await app.close();}
