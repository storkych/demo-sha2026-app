import { chromium } from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=path.resolve('test-results/portable-'+Date.now());await fs.mkdir(dir,{recursive:true});
const version=JSON.parse((await fs.readFile('package.json','utf8')).replace(/^\uFEFF/,'')).version;
const executable=path.join(dir,'FlightArchive.exe');await fs.copyFile(`release/FlightArchive-Portable-${version}.exe`,executable);
const port=19387;
const child=spawn(executable,['--smoke-test',`--remote-debugging-port=${port}`],{windowsHide:true,stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<90;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Portable executable starts its bundled Electron runtime');
 browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
 const page=browser.contexts()[0].pages()[0];
 await page.getByRole('heading',{name:'Доступ к системе'}).waitFor();
 await page.getByLabel('Пароль',{exact:true}).fill('1111');await page.getByRole('button',{name:'Войти в систему'}).click();
 await page.locator('video, .video-placeholder').first().waitFor();
 await page.waitForFunction(async()=>{const value=await window.questStorage.read();return value?.phase==='video';});
 const saved=JSON.parse(await fs.readFile(path.join(dir,'quest-progress.json'),'utf8'));assert.equal(saved.phase,'video');
 const session=await browser.newBrowserCDPSession();
 await Promise.race([session.send('Browser.close').catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1000))]);
 console.log('Portable EXE passed: self-extraction, offline app startup, UI, save beside the copied executable.');
}finally{await browser?.close().catch(()=>{});child.kill();}
