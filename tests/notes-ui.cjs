const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),english=url.pathname.startsWith('/en/');
  const name=url.pathname.replace(/^\/(?:en\/)?/,'') || 'index.html';
  if(!['index.html','app.js','engine.js','styles.css','notes-ui.js'].includes(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(path.join(root,english && ['index.html','app.js'].includes(name)?'editions/en':'',name)));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try {
  for(const edition of ['tr','en']) {
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',timezoneId:'Europe/Istanbul',permissions:['clipboard-read','clipboard-write']});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install({time:new Date('2026-10-29T12:00:00+03:00')});
   const url='http://127.0.0.1:'+server.address().port+(edition==='en'?'/en/':'/');
   await page.goto(url);await page.click('#notesBtn');
   assert.equal(await page.locator('#notes').evaluate(el=>el===document.activeElement),false);
   const paste='https://instagram.com/stories/user.a/1?utm_source=x V\nreel/B S\nstories/user.c/3 V\nreel/D V1s';
   await page.evaluate(text=>{
    const data=new DataTransfer();data.setData('text/plain',text);
    document.getElementById('notes').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
   },paste);
   await page.clock.runFor(800);
   const shown=await page.inputValue('#notes');
   assert.equal(shown,'stories/user.a/1 V\nstories/user.c/3 V\n\nreel/B S\n\nreel/D V1s');
   assert.equal(await page.locator('.notes-group-divider').count(),2);
   await page.focus('#notes');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.press('ControlOrMeta+C');
   const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,shown);assert.doesNotMatch(copied,/- -/);
   const log=()=>page.evaluate(()=>state.notesDailyHistory.find(x=>x.date==='2026-10-29').notes);
   assert.equal((await log()).split('\n').length,4);assert.doesNotMatch(await log(),/utm_source|- -/);
   await page.fill('#notes','stories/user.a/1 V7 (özel etiket)\nreel/New S');
   await page.clock.runFor(800);await page.click('#notesClose');
   let merged=await log();assert.match(merged,/user.a\/1 V7 \(özel etiket\)/);assert.match(merged,/reel\/B S/);assert.match(merged,/reel\/New S/);
   assert.equal((merged.match(/stories\/user.a\/1/g)||[]).length,1);
   assert.equal(await page.evaluate(()=>state.notesDailyHistory.length),1);
   const failure=await page.evaluate(()=>{
    window.restoreNotesStorage=Storage.prototype.setItem;
    Storage.prototype.setItem=function(){throw Error('notes archive save failure');};
    document.getElementById('notes').value='stories/retry.user/8 V';saveNotes();
    return window.prepareExit();
   });
   assert.equal(failure,false);assert.equal(await log(),merged);
   assert.match(await page.inputValue('#notes'),/retry.user/);
   await page.evaluate(()=>{Storage.prototype.setItem=window.restoreNotesStorage;saveNotes();window.prepareExit();});
   merged=await log();assert.match(merged,/retry.user/);
   const revision=await page.evaluate(()=>state.storageRevision);
   await page.clock.runFor(600001);assert.equal(await page.evaluate(()=>state.storageRevision),revision);
   await page.fill('#links','https://instagram.com/reel/commandOnly');await page.click('#copy');
   assert.equal(await log(),merged);assert.doesNotMatch(await log(),/commandOnly/);
   await page.click('#notesBtn');await page.click('#notesClear');await page.click('#confirmAccept');
   assert.equal(await page.inputValue('#notes'),'');assert.equal(await log(),merged);
   await page.click('#notesClose');await page.reload();assert.equal(await log(),merged);
   // Simulate durable drafts left by a killed process before the debounce fired.
   await page.evaluate(()=>{
    clearTimeout(notesArchiveTimer);
    const saved={...state,notes:'stories/late.user/9 S',notesDraftDate:'2026-10-28'};
    localStorage.setItem('builder.state',JSON.stringify(saved));localStorage.setItem('builder.state.backup',JSON.stringify(saved));
   });
   // A new document reads the persisted draft; the old document cannot run a pagehide flush.
   const recovered=await context.newPage();await recovered.clock.install({time:new Date('2026-10-29T12:10:00+03:00')});
   await recovered.goto(url);
   const recoveredLogs=await recovered.evaluate(()=>state.notesDailyHistory);
   assert.match(recoveredLogs.find(r=>r.date==='2026-10-28').notes,/late.user\/9 S/);
   assert.match(recoveredLogs.find(r=>r.date==='2026-10-29').notes,/late.user\/9 S/);
   assert.equal(recoveredLogs.filter(r=>r.date==='2026-10-29').length,1);
   assert.equal(await recovered.evaluate(()=>state.history.length),1);
   await recovered.click('#notesBtn');
   const rows=Array.from({length:30},(_,i)=>'stories/long_username_'+i+'/'+(100000+i)+' '+(i<10?'V':i<20?'V1s':'S')).join('\n');
   await recovered.fill('#notes',rows);await recovered.locator('#notes').blur();
   for(const width of [320,390,650]) {
    await recovered.setViewportSize({width,height:844});await recovered.clock.runFor(50);
    assert.equal(await recovered.locator('.notes-group-divider').count(),2);
    const dimensions=await recovered.evaluate(()=>Array.from(document.querySelectorAll('.notes-group-divider'),node=>({height:node.clientHeight,line:parseFloat(getComputedStyle(node).lineHeight),overflow:getComputedStyle(node).overflow,select:getComputedStyle(node).userSelect})));
    assert.ok(dimensions.every(r=>Math.abs(r.height-r.line)<=1 && r.overflow==='hidden' && r.select==='none'),JSON.stringify({edition,width,dimensions}));
    await recovered.locator('#notes').evaluate(el=>{el.scrollTop=100;el.dispatchEvent(new Event('scroll'));});
    assert.equal(await recovered.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   await recovered.setViewportSize({width:390,height:844});
   await recovered.fill('#notes',paste);await recovered.locator('#notes').blur();await recovered.clock.runFor(800);
   fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
   await recovered.screenshot({path:path.join(root,'test-results/notes-114-'+edition+'.png')});
   assert.deepEqual(errors,[]);await context.close();
   console.log('PASS '+edition+': cumulative unique notes, latest annotations, retained deletions, independent commands, no-op saves, dated draft recovery and non-copyable one-row dividers');
  }
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
