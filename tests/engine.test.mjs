import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validState,finishVideo,accessLevel,reconcile,remaining,cancelDestruction,DURATION,SECRET,replayVideo,checkAnswer,ANSWERS} from '../src/engine.mjs';
test('timer begins only after video ends and cannot be restarted by another end event',()=>{const s=initialState();assert.equal(s.deadline,null);const ready=finishVideo({...s,phase:'video'},100);assert.equal(ready.deadline,100+DURATION);assert.deepEqual(finishVideo(ready,200),ready);});
test('rooms unlock levels in any completion order, partial rooms do not',()=>{const solved=Array(9).fill(false);solved[6]=solved[7]=true;assert.equal(accessLevel(solved),0);solved[8]=true;assert.equal(accessLevel(solved),1);solved[0]=solved[1]=solved[2]=true;assert.equal(accessLevel(solved),2);solved[3]=solved[4]=solved[5]=true;assert.equal(accessLevel(solved),3);solved[4]=false;assert.equal(accessLevel(solved),2);});
test('reload uses saved deadline and expiration is permanent',()=>{const s={...initialState(),phase:'playing',deadline:1000};assert.equal(remaining(s,700),300);const expired=reconcile(s,1000);assert.equal(expired.phase,'lost');assert.equal(reconcile(expired,500).phase,'lost');});
test('code needs full access, correct value, and positive remaining time',()=>{const s={...initialState(),phase:'playing',deadline:1000};assert.equal(cancelDestruction(s,SECRET,500).phase,'playing');const full={...s,solved:Array(9).fill(true)};assert.equal(cancelDestruction(full,'wrong',500).phase,'playing');const won=cancelDestruction(full,SECRET,600);assert.equal(won.phase,'won');assert.equal(remaining(won,2000),400);assert.equal(cancelDestruction(full,SECRET,1000).phase,'lost');});
test('saved progress rejects invalid and incomplete data',()=>{assert.ok(validState(initialState()));assert.equal(validState({...initialState(),phase:'playing'}),false);assert.equal(validState({...initialState(),solved:[true]}),false);assert.equal(validState(null),false);});
test('each puzzle accepts only its own answer, tolerant of case, spacing, ё and lookalike letters',()=>{assert.equal(ANSWERS.length,9);assert.ok(checkAnswer(0,'356.231'));assert.ok(checkAnswer(0,' 356,231 '));assert.ok(checkAnswer(1,'4957'));assert.ok(checkAnswer(2,'Запонки'));assert.ok(checkAnswer(3,'3А67d25b'));assert.ok(checkAnswer(3,'3A67D25B'));assert.ok(checkAnswer(4,'Бразилия'));assert.ok(checkAnswer(5,'Сан-Паулу'));assert.ok(checkAnswer(5,'сан паул'));assert.ok(checkAnswer(6,'240710'));assert.ok(checkAnswer(7,'546079289349'));assert.ok(checkAnswer(8,'Артем'));assert.ok(checkAnswer(8,'Артём'));assert.equal(checkAnswer(0,'1111'),false);assert.equal(checkAnswer(0,''),false);assert.equal(checkAnswer(1,'356.231'),false);});

test('video replays are limited to three per video and never reset the deadline',()=>{
 let state=finishVideo({...initialState(),phase:'video'},100);
 for(let i=1;i<=3;i++){state=replayVideo(state,'intro');assert.equal(state.introReplays,i);assert.equal(state.deadline,100+DURATION);}
 assert.deepEqual(replayVideo(state,'intro'),state);
 state={...state,phase:'won',outroSeen:true};
 for(let i=1;i<=3;i++){state=replayVideo(state,'outro');assert.equal(state.outroReplays,i);}
 assert.deepEqual(replayVideo(state,'outro'),state);
 assert.equal(validState({...state,introReplays:4}),false);
 assert.equal(replayVideo(initialState(),'intro').introReplays,0);
});
test('cancellation password accepts case and extra spaces, rejects old code',()=>{
 const state={...initialState(),phase:'playing',solved:Array(9).fill(true),deadline:1000};
 assert.equal(cancelDestruction(state,'  игнатий   ДАВАНКОВ  ',500).phase,'won');
 assert.equal(cancelDestruction(state,'SHA-2026',500).phase,'playing');
});
