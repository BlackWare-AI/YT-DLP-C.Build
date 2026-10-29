const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.slice(1);
  if(!['index.html','engine.js','app.js','styles.css','notes-ui.js'].includes(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(path.join(root,['index.html','app.js'].includes(name)?'editions/en':'',name)));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.equal(await page.getAttribute('html','lang'),'en');
  assert.equal(await page.locator('#languageBtn').count(),0);
  assert.equal(await page.textContent('#checkUpdate'),'Update');
  assert.equal(await page.locator('#checkUpdate').evaluate(el=>getComputedStyle(el).fontSize),'15px');
  assert.equal(await page.locator('#copy').innerText(),'Copy command');
  assert.match(await page.textContent('#error'),/Enter at least one Instagram/);
  assert.doesNotMatch(await page.locator('body').innerText(),/[çğıöşüÇĞİÖŞÜ]/);
  assert.doesNotMatch(await page.locator('[placeholder]').evaluateAll(nodes=>nodes.map(n=>n.placeholder).join('\n')),/[çğıöşüÇĞİÖŞÜ]/);
  await page.evaluate(()=>{
   state.notes='Türkçe notum\nstories/example.user/123 V';
   state.notesDailyHistory=[{date:'2026-10-27',notes:'Değişmeyen günlük notu'}];
   save();hydrate();
  });
  await page.fill('#links','https://instagram.com/stories/example.user');
  assert.equal(await page.textContent('#count'),'1 link');
  await page.fill('#itemOnly','0');
  assert.match(await page.textContent('#error'),/integer of 1 or greater/);
  await page.fill('#itemOnly','');
  for(const mode of ['av','video','audio','still','frame']) {
   await page.click('#modes [data-value='+mode+']');
   assert.doesNotMatch(await page.textContent('#modeHint'),/[çğıöşüÇĞİÖŞÜ]/);
  }
  assert.match(await page.textContent('#output'),/Successful JPGs:/);
  assert.doesNotMatch(await page.textContent('#output'),/Başarılı|başarısız|bulunamadı|çözünürlüğü/);
  await page.click('#frameTimes [data-frame-time=custom]');await page.fill('#frameCustomTime','2');
  assert.match(await page.textContent('#error'),/between 0 and 1 second/);
  await page.click('#frameTimes [data-frame-time="0.5"]');
  await page.click('#copy');
  await page.waitForFunction(()=>state.links==='');
  assert.match(await page.textContent('#status'),/Command copied/);
  assert.equal(await page.evaluate(()=>state.notes),'Türkçe notum\nstories/example.user/123 V');
  await page.click('#historyBtn');await page.locator('.history-item summary').first().click();
  await page.waitForSelector('.history-item button');
  assert.match(await page.locator('.history-item').innerText(),/Experimental/);
  assert.match(await page.locator('.history-item').innerText(),/Edit again/);
  await page.click('#notesLogTab');await page.locator('.daily-note-item summary').filter({hasText:'October 27, 2026'}).click();
  assert.match(await page.locator('.daily-note-item summary').filter({hasText:'October 27, 2026'}).innerText(),/October/);
  assert.equal(await page.locator('.daily-note-item pre').filter({hasText:'Değişmeyen günlük notu'}).innerText(),'Değişmeyen günlük notu');
  await page.click('#close');await page.click('#notesBtn');await page.click('#notesClear');
  assert.equal(await page.textContent('#confirmTitle'),'Clear Link Notes');
  assert.match(await page.textContent('#confirmMessage'),/Notes Log and command history will be kept/);
  await page.click('#confirmCancel');await page.click('#notesClose');
  await page.evaluate(()=>{window.Android={checkUpdates(){window.setUpdateStatus('Güncelleme mevcut: 1.1.3',false,true);}};});
  await page.click('#checkUpdate');
  assert.equal(await page.textContent('#updateStatus'),'Update available: 1.1.3');
  assert.equal(await page.locator('#checkUpdate').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');
  await page.reload();assert.equal(await page.getAttribute('html','lang'),'en');
  assert.equal(await page.locator('#languageBtn').count(),0);
  assert.equal(await page.evaluate(()=>state.history.length),1);
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  for(const width of [320,390,650]) {
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const labelFits=await page.locator('#modes [data-value=av]').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.querySelector('strong'));return r.getBoundingClientRect().right<=el.querySelector('.mode-symbol').getBoundingClientRect().left;});
   assert.equal(labelFits,true,'English AV label must not overlap its icon at '+width+' px');
   await page.locator('.app-footer-header').screenshot({path:path.join(root,'test-results/fixed-en-footer-'+width+'.png')});
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'test-results/fixed-english.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: fixed English edition, no language control, localized product copy, preserved notes/history and update styling');
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
