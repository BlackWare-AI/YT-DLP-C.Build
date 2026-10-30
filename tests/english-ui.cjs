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
  const removalContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const removal=await removalContext.newPage();
  await removal.goto('http://127.0.0.1:'+server.address().port);
  for(const width of [320,390,650]) {
    await removal.setViewportSize({width,height:844});
    const preview=await removal.locator('#links').evaluate(el=>{el.scrollTop=1000;return {top:el.scrollTop,fits:el.scrollHeight<=el.clientHeight,overflow:getComputedStyle(el).overflowY};});
    assert.deepEqual(preview,{top:0,fits:true,overflow:'hidden'});
  }
  await removal.setViewportSize({width:390,height:844});
  await removal.evaluate(()=>{state.notes='stories/saved.notes/999 V';state.notesDailyHistory=[{date:'2026-10-28',notes:'stories/archive/998 S'}];save();hydrate();});
  await removal.fill('#links','stories/example/123/\nreel/ABC/\np/POST/\nhttps://instagram.com/stories/example/123?utm_source=x');
  assert.equal(await removal.locator('#linkList .link-row').count(),3);
  await removal.locator('#linkList .link-row button').first().tap();
  assert.equal(await removal.locator('#linkList .link-row').count(),2);
  assert.doesNotMatch(await removal.inputValue('#links'),/example\/123/);
  assert.match(await removal.textContent('#output'),/reel\/ABC/);assert.doesNotMatch(await removal.textContent('#output'),/example\/123/);
  await removal.reload();
  assert.equal(await removal.locator('#linkList .link-row').count(),2);
  assert.equal(await removal.evaluate(()=>state.notes),'stories/saved.notes/999 V');
  assert.equal(await removal.evaluate(()=>state.notesDailyHistory.find(r=>r.date==='2026-10-28').notes),'stories/archive/998 S');
  await removal.locator('#linkList .link-row button').last().tap();
  assert.equal(await removal.locator('#linkList .link-row').count(),1);
  await removal.locator('#linkList .link-row button').first().tap();
  assert.equal(await removal.locator('#linkList .link-row').count(),0);
  assert.equal(await removal.locator('#copy').isDisabled(),true);
  await removal.fill('#links','@example.user\nstories/other/2');
  await removal.locator('#linkList .link-row button').first().tap();
  assert.equal(await removal.locator('#linkList .link-row').count(),1);
  await removal.fill('#links',Array.from({length:20},(_,i)=>'reel/CLIP'+i+'/').join('\n'));
  const enteredScroll=await removal.locator('#links').evaluate(el=>{el.scrollTop=el.scrollHeight;return {top:el.scrollTop,overflow:getComputedStyle(el).overflowY};});
  assert.ok(enteredScroll.top>0);assert.equal(enteredScroll.overflow,'auto');
  const scroll=await removal.locator('#linkList').evaluate(el=>{el.scrollTop=el.scrollHeight;return {top:el.scrollTop,overflow:el.scrollHeight>el.clientHeight,bar:getComputedStyle(el,'::-webkit-scrollbar').display};});
  assert.equal(scroll.overflow,true);assert.ok(scroll.top>0);assert.equal(scroll.bar,'none');
  await removal.locator('#linkList .link-row button').last().tap();
  assert.equal(await removal.locator('#linkList .link-row').count(),19);
  assert.doesNotMatch(await removal.inputValue('#links'),/CLIP19/);
  assert.ok(await removal.evaluate(()=>{window.scrollTo(0,document.body.scrollHeight);return window.scrollY;})>0);
  await removalContext.close();

  assert.equal(await page.getAttribute('html','lang'),'en');
  assert.equal(await page.locator('#languageBtn').count(),0);
  assert.equal(await page.locator('#settingsPanel').isVisible(),false);
  await page.click('#settingsBtn');
  assert.equal(await page.getAttribute('#settingsBtn','aria-expanded'),'true');
  assert.equal(await page.locator('#folder').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#settingsPanel').getBoundingClientRect().top>=document.querySelector('.app-footer-header').getBoundingClientRect().bottom),true);
  await page.click('#settingsBtn');
  assert.equal(await page.locator('#settingsPanel').isVisible(),false);
  await page.click('#settingsBtn');await page.click('#historyBtn');
  assert.equal(await page.locator('#settingsPanel').isVisible(),false);
  assert.equal(await page.getAttribute('#settingsBtn','aria-expanded'),'false');
  assert.equal(await page.locator('#historyPanel').isVisible(),true);
  await page.click('#settingsBtn');
  assert.equal(await page.locator('#historyPanel').isVisible(),false);
  assert.equal(await page.getAttribute('#historyBtn','aria-expanded'),'false');
  assert.equal(await page.locator('#settingsPanel').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.handleBack()),true);
  assert.equal(await page.locator('#settingsPanel').isVisible(),false);
  assert.equal(await page.getAttribute('#settingsBtn','aria-expanded'),'false');
  const exportedFixture=await page.evaluate(()=>{
    const oldHistory=state.history,oldDaily=state.notesDailyHistory,oldNotes=state.notes;
    try {
      state.history=[];
      state.notesDailyHistory=[{date:'2026-10-28',notes:'stories/archived.export/777 V1s'}];
      state.notes='stories/current.export/888 S';
      return allHistoryText();
    } finally {state.history=oldHistory;state.notesDailyHistory=oldDaily;state.notes=oldNotes;}
  });
  assert.match(exportedFixture,/stories\/archived.export\/777 V1s/);
  assert.match(exportedFixture,/stories\/current.export\/888 S/);
  assert.match(exportedFixture,/COMMAND HISTORY/);
  assert.equal(await page.textContent('#export'),'Export history');
  await page.evaluate(()=>{
    window.originalHistory=state.history;
    const record=date=>({date,urls:['https://instagram.com/reel/example'],mode:'video',engine:'normal',command:'example'});
    state.history=[record('2026-10-29T12:00:00'),record('2026-10-28T12:00:00'),record('2026-10-29T10:00:00')];
    showHistory();
  });
  await page.click('#historyBtn');
  assert.equal(await page.locator('.history-day').count(),2);
  assert.equal(await page.locator('#close').count(),0);
  assert.deepEqual(await page.locator('.history-actions > button').evaluateAll(nodes=>nodes.map(el=>el.id)),['exportSettings','export','clear']);
  assert.equal(await page.locator('.history-actions > button').first().evaluate(el=>getComputedStyle(el).fontSize),'11px');
  assert.equal(await page.locator('.history-day[open]').count(),0);
  assert.equal(await page.locator('.history-day').first().locator('.history-item').count(),2);
  assert.equal(await page.locator('.history-item summary').first().isVisible(),false);
  await page.locator('.history-day > summary').first().click();
  assert.equal(await page.locator('.history-item summary').first().isVisible(),true);
  assert.equal(await page.locator('.history-item pre').count(),0);
  await page.locator('.history-item summary').first().click();await page.waitForSelector('.history-item button');
  const borders=await page.locator('.history-item').first().locator('button').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).borderTopColor));
  assert.equal(borders[0],'rgb(51, 51, 51)');assert.equal(borders[3],'rgb(51, 51, 51)');
  assert.equal(await page.locator('#clear').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(51, 51, 51)');
  await page.locator('.history-item summary').first().click();
  for(const width of [320,390,650]) {
    await page.setViewportSize({width,height:844});
    const tabs=await page.locator('.history-tabs > button').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,top:r.top};}));
    assert.ok(Math.abs(tabs[0].width-tabs[1].width)<1&&Math.abs(tabs[0].top-tabs[1].top)<1);
    const controls=await page.locator('.history-actions > button').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right};}));
    assert.ok(controls.every(r=>Math.abs(r.top-controls[0].top)<1));
    assert.ok(controls[0].right<=controls[1].left&&controls[1].right<=controls[2].left);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:390,height:844});
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.locator('#historyPanel').screenshot({path:path.join(root,'test-results/history-card-116-en.png')});
  await page.click('#historyBtn');
  await page.evaluate(()=>{state.history=window.originalHistory;delete window.originalHistory;showHistory();});

  assert.equal(await page.textContent('#checkUpdate'),'Update');
  assert.equal(await page.locator('#checkUpdate').evaluate(el=>getComputedStyle(el).fontSize),'15px');
  assert.equal(await page.locator('#copy').innerText(),'Copy');
  assert.equal(await page.getAttribute('#copy','aria-pressed'),null);
  assert.equal(await page.evaluate(()=>document.querySelector('#modes [data-value=frame]').nextElementSibling.id),'copy');
  const placeholder=await page.getAttribute('#links','placeholder');assert.match(placeholder,/stories\/username\/123\//);assert.doesNotMatch(placeholder,/https?:/);
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
  await page.click('#historyBtn');await page.locator('.history-day > summary').first().click();await page.locator('.history-item summary').first().click();
  await page.waitForSelector('.history-item button');
  assert.match(await page.locator('.history-item').innerText(),/Experimental/);
  assert.match(await page.locator('.history-item').innerText(),/Edit again/);
  await page.click('#notesLogTab');await page.locator('.daily-note-item summary').filter({hasText:'October 27, 2026'}).click();
  assert.match(await page.locator('.daily-note-item summary').filter({hasText:'October 27, 2026'}).innerText(),/October/);
  assert.equal(await page.locator('.daily-note-item pre').filter({hasText:'Değişmeyen günlük notu'}).innerText(),'Değişmeyen günlük notu');
  await page.click('#historyBtn');await page.click('#notesBtn');await page.click('#notesClear');
  assert.equal(await page.textContent('#confirmTitle'),'Clear Link Notes');
  assert.equal(await page.locator('#confirmAccept').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(88, 48, 48)');
  assert.match(await page.textContent('#confirmMessage'),/Notes Log and command history will be kept/);
  await page.click('#confirmCancel');await page.click('#notesClose');
  await page.evaluate(()=>{window.Android={checkUpdates(){window.preCheckStatus=document.getElementById('updateStatus').textContent;window.setUpdateStatus('Güncelleme mevcut: 1.1.3',false,true);}};});
  await page.click('#checkUpdate');
  assert.equal(await page.textContent('#updateStatus'),'Update available: 1.1.3');
  assert.equal(await page.locator('#checkUpdate').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');
  await page.click('#checkUpdate');
  assert.equal(await page.evaluate(()=>window.preCheckStatus),'Checking for updates…');
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
