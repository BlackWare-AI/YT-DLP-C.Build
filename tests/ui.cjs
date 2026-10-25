const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.slice(1);
  if(!['index.html','engine.js','app.js','styles.css'].includes(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(path.join(root,name)));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);assert.equal(await page.locator('#cuts .cut').count(),0);
  assert.equal(await page.getAttribute('#modes [data-value=av]','aria-pressed'),'true');
  assert.equal(await page.locator('#audioFormat').count(),0);
  assert.equal(await page.evaluate(()=>document.querySelector('main').lastElementChild.tagName),'HEADER');
  const cardSizes=await page.evaluate(()=>({engine:document.querySelector('#engines button').getBoundingClientRect().height,modes:Array.from(document.querySelectorAll('#modes button')).map(b=>b.getBoundingClientRect().height)}));
  assert.ok(cardSizes.modes.every(h=>Math.abs(h-cardSizes.engine)<1));

  await page.fill('#links','https://instagram.com/stories/user.one/123?utm_source=xhttps://instagram.com/reel/abc/ https://instagram.com/stories/user.one/123/');
  assert.equal(await page.textContent('#count'),'2 bağlantı');
  await page.fill('#newLink','https://instagram.com/stories/other.user/456');await page.click('#addLink');
  assert.equal(await page.textContent('#count'),'3 bağlantı');
  assert.equal(await page.locator('#linkList .link-row').count(),3);
  await page.fill('#newLink','https://instagram.com/stories/other.user/456?utm_source=copy');await page.click('#addLink');
  assert.equal(await page.textContent('#count'),'3 bağlantı');
  await page.getByRole('button',{name:'Bağlantı 3 sil',exact:true}).click();assert.equal(await page.textContent('#count'),'2 bağlantı');
  await page.click('#addCut');await page.click('#addCut');await page.click('#addCut');assert.equal(await page.locator('#cuts .cut').count(),3);
  await page.fill('#cuts .cut:nth-child(2) input:first-child','-3');await page.fill('#cuts .cut:nth-child(2) input:nth-child(2)','inf');
  await page.fill('#cuts .cut:nth-child(3) input:first-child','75');await page.fill('#cuts .cut:nth-child(3) input:nth-child(2)','90');
  await page.fill('#cuts .cut:first-child input:nth-child(2)','0');assert.equal(await page.locator('#copy').isDisabled(),true);
  await page.fill('#cuts .cut:first-child input:nth-child(2)','1');
  await page.click('#engines [data-value=normal]');await page.locator('#settings > summary').click();
  await page.fill('#min','3');await page.fill('#max','2');assert.equal(await page.locator('#copy').isDisabled(),true);
  await page.fill('#max','8');await page.fill('#folder','$HOME/My Downloads');await page.fill('#cookies','/storage/emulated/0/My Cookies.txt');
  await page.click('#copy');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('builder.state')).history.length===1);
  const command=await page.textContent('#output');assert.equal((command.match(/--no-playlist/g)||[]).length,1);assert.equal((command.match(/--download-sections/g)||[]).length,3);assert.equal(await page.textContent('#commandCount'),'1 komut');assert.match(command,/-f 'bv\+ba\/b'/);assert.doesNotMatch(command,/force-keyframes|--audio-format (mp3|m4a)/);assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),command);
  await page.click('#copy');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('builder.state')).history.length),1);
  await page.reload();assert.equal(await page.locator('#cuts .cut').count(),3);assert.equal(await page.inputValue('#folder'),'$HOME/My Downloads');
  assert.equal(await page.getAttribute('#engines [data-value=normal]','aria-pressed'),'true');
  await page.click('#modes [data-value=audio]');assert.equal(await page.locator('#cutSection').isVisible(),false);
  await page.locator('#settings > summary').click();
  assert.match(await page.textContent('#output'),/--audio-format best[\s\S]*--embed-thumbnail/);
  await page.click('#copy');await page.click('#modes [data-value=video]');assert.match(await page.textContent('#output'),/-f 'bv'/);
  await page.click('#modes [data-value=still]');assert.match(await page.textContent('#output'),/\*0-1/);
  await page.click('#historyBtn');assert.equal(await page.locator('.history-item').count(),2);
  const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;
  const exported=fs.readFileSync(await download.path(),'utf8');assert.ok(exported.includes(command));
  await page.locator('.history-item summary').first().click();await page.getByRole('button',{name:'Tekrar düzenle',exact:true}).first().click();
  assert.equal(await page.getAttribute('#modes [data-value=audio]','aria-pressed'),'true');
  await page.click('#historyBtn');page.once('dialog',d=>d.dismiss());await page.click('#clear');assert.equal(await page.locator('.history-item').count(),2);
  await page.locator('.history-item summary').first().click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Sil',exact:true}).first().click();assert.equal(await page.locator('.history-item').count(),1);
  await page.evaluate(()=>window.handleBack());assert.equal(await page.locator('#dialog').isVisible(),false);
  await page.click('#modes [data-value=video]');await page.locator('#cuts .cut button').last().click();assert.equal(await page.locator('#cuts .cut').count(),2);
  for(const width of [320,390,760]){await page.setViewportSize({width,height:844});const heights=await page.evaluate(()=>[document.querySelector('#engines button').getBoundingClientRect().height,...Array.from(document.querySelectorAll('#modes button')).map(b=>b.getBoundingClientRect().height)]);assert.ok(heights.every(h=>Math.abs(h-heights[0])<1));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);}
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'test-results/phone.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: UI modes, cuts, validation, persistence, clipboard, deduplication, history edit/delete/export and 320–760 px layouts');
  await page.evaluate(()=>localStorage.setItem('builder.state',JSON.stringify({settings:{mode:'video',audioFormat:'mp3'},links:'https://instagram.com/reel/abc/',cuts:[],history:[]})));
  await page.reload();assert.equal(await page.getAttribute('#modes [data-value=av]','aria-pressed'),'true');
  await page.click('#modes [data-value=audio]');assert.match(await page.textContent('#output'),/--audio-format best/);
  assert.equal(await page.locator('#audioFormat').count(),0);
  console.log('PASS: previous APK settings migrate to explicit AV and best source audio');
  await page.evaluate(()=>localStorage.setItem('builder.state','invalid-json'));await page.reload();
  assert.match(await page.textContent('#status'),/üzerine yazılmayacak/);await page.fill('#links','https://instagram.com/reel/abc/');
  assert.equal(await page.evaluate(()=>localStorage.getItem('builder.state')),'invalid-json');
  console.log('PASS: corrupt persistent data is preserved instead of overwritten');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
