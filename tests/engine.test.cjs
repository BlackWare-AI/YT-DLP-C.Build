const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync,spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const B = require('../engine.js');
const ffmpegAvailable=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0;
const story = n => `https://www.instagram.com/stories/user.${n}/${100+n}?utm_source=abc`;
const input = (settings={},cuts=[]) => ({links:story(1),settings,cuts});
test('single Story URL is canonical',()=>assert.deepEqual(B.parseUrls(story(1)),['https://www.instagram.com/stories/user.1/101']));
test('five different Stories',()=>assert.equal(B.parseUrls([1,2,3,4,5].map(story).join('\n')).length,5));
test('glued URLs split before next scheme',()=>assert.equal(B.parseUrls(story(1)+story(2)+story(3)).length,3));
test('deduplicate canonical URLs',()=>assert.equal(B.parseUrls(story(1)+' '+story(1).replace('?utm_source=abc','/')).length,1));
test('Reels and posts',()=>assert.equal(B.parseUrls('https://instagram.com/reel/De5cfG-vaDc/?igsh=a https://www.instagram.com/p/abc/').length,2));
test('short Instagram routes become full command URLs',()=>{
 assert.deepEqual(B.parseUrls('stories/victoria.tsuranova/4017147113884118209\nreel/DfAEcuvKjin'),[
  'https://www.instagram.com/stories/victoria.tsuranova/4017147113884118209',
  'https://www.instagram.com/reel/DfAEcuvKjin'
 ]);
 assert.ok(B.build({...input(),links:'stories/victoria.tsuranova/4017147113884118209'}).command.includes('"https://www.instagram.com/stories/victoria.tsuranova/4017147113884118209"'));
});
test('non Instagram URLs rejected',()=>assert.throws(()=>B.parseUrls('https://www.youtube.com/watch?v=abc')));
test('manual normal/experimental engines',()=>{assert.match(B.build(input({engine:'normal'})).command,/\n?yt-dlp/);assert.match(B.build(input()).command,/"\$HOME\/yt-dlp-story-test/);});
test('video plus audio selects best independent streams with automatic merge container',()=>{
 const c=B.build(input({mode:'av'})).command;
 assert.match(c,/-f "bv\+ba\/b"/);assert.doesNotMatch(c,/--merge-output-format/);
});
test('silent video selects best video only',()=>assert.match(B.build(input({mode:'video'})).command,/-f "bv"/));
test('audio selects best source without forced m4a or mp3',()=>{
 for(const oldFormat of ['m4a','mp3','garbage']){
  const r=B.build(input({mode:'audio',audioFormat:oldFormat}));
  assert.match(r.command,/-f "ba\/b"/);assert.match(r.command,/--audio-format best/);
  assert.match(r.command,/--embed-thumbnail/);assert.doesNotMatch(r.command,/--audio-format (m4a|mp3)/);
  assert.equal(r.settings.audioFormat,undefined);
 }
});
test('no mode ever forces keyframe re-encoding',()=>{
 for(const mode of ['av','video','audio','still'])
  assert.doesNotMatch(B.build(input({mode},[{start:0,end:1},{start:3,end:'inf'}])).command,/force-keyframes|recode-video/);
});
test('legacy settings migrate without changing saved meaning',()=>{
 const s=B.normalizeSettings({mode:'video',audioFormat:'mp3',min:'4',folder:'/my/path'},undefined);
 assert.equal(s.mode,'av');assert.equal(s.audioFormat,undefined);assert.equal(s.min,'4');assert.equal(s.folder,'/my/path');
 assert.equal(B.normalizeSettings({mode:'video'},2).mode,'video');
});
test('StillClip is video only first second; ignores editor',()=>{
 const c=B.build(input({mode:'still'},[{start:'bad',end:'bad'}])).command;
 assert.match(c,/-f "bv"/);assert.match(c,/--download-sections "\*0-1"/);assert.doesNotMatch(c,/bad/);
});
function frameFixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'frame-112-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,"home ' $ files"),prefix=path.join(root,'private termux');fs.mkdirSync(home);fs.mkdirSync(prefix);
 const bin=path.join(home,'yt-dlp-story-test','bin');fs.mkdirSync(bin,{recursive:true});
 const tools=path.join(root,'tools');fs.mkdirSync(tools);
 const sources={};
 for(const [name,rate,duration] of [['one',1,1],['fps24',24,1],['fps30',30,1],['fps60',60,1],['short',30,.2]]) {
  const file=path.join(root,name+'.mkv');execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i',`testsrc2=size=96x64:rate=${rate}:duration=${duration}`,'-c:v','ffv1',file]);sources[name]=file;
 }
 sources.vfr=path.join(root,'vfr.mkv');execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=96x64:rate=10:duration=1','-vf',"select='eq(n,0)+eq(n,2)+eq(n,4)+eq(n,9)'",'-fps_mode','vfr','-c:v','ffv1',sources.vfr]);
 fs.writeFileSync(path.join(bin,'yt-dlp'),`#!/usr/bin/env bash\nset -u\nURL= OUT=\nwhile (($#)); do case "$1" in -P) OUT=$2; shift 2;; --download-sections) [[ "$2" == "*0-1" ]] || exit 9; shift 2;; -f) [[ "$2" == bv ]] || exit 8; shift 2;; --) shift; URL=$1; shift;; *) shift;; esac; done\nprintf '%s\\n' "$URL" >> "$FRAME_LOG"\n[[ "$URL" == *bad* ]] && exit 1\n[[ "$URL" == *empty* ]] && exit 0\nSOURCE="$FRAME_ROOT/$FRAME_KIND.mkv"\n[[ "$URL" != *short* ]] || SOURCE="$FRAME_ROOT/short.mkv"\ncp -- "$SOURCE" "$OUT/account-20261029-1530-01.mkv"\nif [[ "$URL" == *multi* ]]; then cp -- "$SOURCE" "$OUT/account-20261029-1530-02.mkv"; fi\n`,{mode:0o755});
 const real=execFileSync('which',['ffmpeg'],{encoding:'utf8'}).trim();
 fs.writeFileSync(path.join(tools,'ffmpeg'),`#!/usr/bin/env bash\nif [[ " $* " == *" -q:v 1 "* ]]; then\n if [[ "\${FRAME_BEHAVIOR:-}" == signal ]]; then kill -TERM "$PPID"; exit 1; fi\n if [[ "\${FRAME_BEHAVIOR:-}" == broken ]]; then printf broken > "\${@: -1}"; exit 0; fi\n if [[ "\${FRAME_BEHAVIOR:-}" == fallback && " $* " == *" -vf "* ]]; then exit 0; fi\n printf '%s\\n' encode >> "$FRAME_ENCODINGS"\nfi\nexec ${B.quote(real)} "$@"\n`,{mode:0o755});
 const output=path.join(home,'storage/shared/Download/Apps/YT-DLP/Frame');
 const env={...process.env,HOME:home,PREFIX:prefix,TMPDIR:path.join(root,'missing','tmp'),PATH:tools+path.delimiter+process.env.PATH,FRAME_ROOT:root,FRAME_KIND:'fps30',FRAME_LOG:path.join(root,'urls.log'),FRAME_ENCODINGS:path.join(root,'encodings.log')};
 function build(links='https://instagram.com/stories/account/123',settings={}) {return B.build({links,settings:{mode:'frame',cookies:'$HOME/cookies with $ literal.txt',requests:'0',min:'0',max:'0',...settings}}).command;}
 function run(links,settings={},extra={}) {const command=build(links,settings);execFileSync('bash',['-n'],{input:command});const result=spawnSync('bash',['-c',command],{env:{...env,...extra},encoding:'utf8',timeout:20000});assert.doesNotMatch((result.stdout||'')+(result.stderr||''),/Overwrite|Press Enter|\[y\/N\]|\[Y\/n\]/i);return result;}
 function clean() {
  assert.equal(fs.existsSync(env.TMPDIR),false);
  assert.deepEqual(fs.readdirSync(path.join(prefix,'tmp')),[],'no private video/work files');
  assert.ok(fs.readdirSync(output).every(name=>name.endsWith('.jpg')),'only final JPGs in output');
 }
 function expected(source,target,first=false) {
  const frames=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-of','json',source],{encoding:'utf8'})).frames;
  const start=Number(frames[0].best_effort_timestamp_time);let index=0;
  if(!first) for(let i=1;i<frames.length;i++) if(Math.abs(Number(frames[i].best_effort_timestamp_time)-start-target)<Math.abs(Number(frames[index].best_effort_timestamp_time)-start-target)-1e-8) index=i;
  const file=path.join(root,'expected.jpg');execFileSync(real,['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-map','0:v:0','-vf',`select=eq(n\\,${index})`,'-frames:v','1','-q:v','1','-pix_fmt','yuvj444p',file]);return fs.readFileSync(file);
 }
 return {root,home,prefix,tools,sources,output,env,build,run,clean,expected};
}
test('Frame chooses the nearest real frame at 1/24/30/60 FPS, short clips and variable FPS',{skip:!ffmpegAvailable},t=>{
 const f=frameFixture(t);const command=f.build();
 assert.match(command,/^bash -c '/);assert.match(command,/--no-overwrites -f "bv" --download-sections "\*0-1"/);
 assert.match(command,/-q:v 1 -pix_fmt yuvj444p/);assert.match(command,/trap cleanup EXIT/);
 assert.doesNotMatch(command,/FRAME_TIME|\bawk\b|show_entries frame|\bread\b|force-keyframes|compression_level|\.png/);
 assert.equal(B.defaults.frameTime,'0.5');assert.match(command,/prev_selected_t/);
 let count=0;
 for(const [kind,target] of [['one',.5],['fps24',.5],['fps30',.5],['fps60',.5],['short',.5],['vfr',.5],['fps30',.51],['fps30',.52],['short',.85]]) {
  const settings=target===.5 ? {} : {frameTime:'custom',frameCustomTime:String(target)};
  const result=f.run(undefined,settings,{FRAME_KIND:kind});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Başarılı JPG: 1 \| Başarısız JPG: 0/);
  const file=path.join(f.output,`account-20261029-1530-${String(++count).padStart(2,'0')}.jpg`);
  assert.deepEqual(fs.readFileSync(file),f.expected(f.sources[kind],target),kind+' nearest frame, source dimensions, one JPG encoding');
  const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];assert.equal(meta.pix_fmt,'yuvj444p');assert.deepEqual([meta.width,meta.height],[96,64]);f.clean();
 }
 assert.equal(fs.readFileSync(f.env.FRAME_ENCODINGS,'utf8').trim().split('\n').length,count,'one JPEG encode per successful item');
});
test('Frame accepts VP9 MP4 with ICC stream side data and validates its JPG dimensions',{skip:!ffmpegAvailable},t=>{
 const f=frameFixture(t);
 const source=path.join(f.root,'icc.mkv');
 fs.writeFileSync(source,Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/vp9-icc.mp4.base64'),'utf8'),'base64'));
 const old=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',source],{encoding:'utf8'}).trim();
 assert.notEqual(old,'96x64','fixture exercises ICC side-data CSV decoration');
 const result=f.run(undefined,{}, {FRAME_KIND:'icc'});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Başarılı JPG: 1 \| Başarısız JPG: 0/);
 const jpg=path.join(f.output,'account-20261029-1530-01.jpg');
 assert.deepEqual(fs.readFileSync(jpg),f.expected(source,.5));
 assert.equal(fs.readFileSync(f.env.FRAME_ENCODINGS,'utf8').trim().split('\n').length,1);f.clean();
});
test('Frame eight URLs produce eight JPGs, preserve prior bytes, and keep no temporary videos',{skip:!ffmpegAvailable},t=>{
 const f=frameFixture(t);fs.mkdirSync(f.output,{recursive:true});
 const prior=path.join(f.output,'account-20261029-1530-01.jpg');fs.writeFileSync(prior,'existing user JPG');
 const links=Array.from({length:8},(_,i)=>`https://instagram.com/stories/account/${100+i}`).join(' ');
 const result=f.run(links);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Başarılı JPG: 8 \| Başarısız JPG: 0/);
 assert.equal(fs.readdirSync(f.output).length,9);assert.equal(fs.readFileSync(prior,'utf8'),'existing user JPG');f.clean();
 const again=f.run(links);assert.equal(again.status,0,again.stderr);assert.equal(fs.readdirSync(f.output).length,17);assert.equal(fs.readFileSync(prior,'utf8'),'existing user JPG');f.clean();
 const multi=f.run('https://instagram.com/stories/multi/123');assert.equal(multi.status,0,multi.stderr);assert.match(multi.stdout,/Başarılı JPG: 1/);assert.equal(fs.readdirSync(f.output).length,18);f.clean();
 const blocked=path.join(f.root,'prefix-file');fs.writeFileSync(blocked,'keep');
 const fallback=f.run(undefined,{}, {PREFIX:blocked});assert.equal(fallback.status,0,fallback.stderr);assert.equal(fs.readFileSync(blocked,'utf8'),'keep');assert.deepEqual(fs.readdirSync(path.join(f.home,'.cache/yt-dlp-frame')),[]);f.clean();
});
test('Frame continues after download/empty failures and falls back to the first valid frame',{skip:!ffmpegAvailable},t=>{
 const f=frameFixture(t);
 const result=f.run('https://instagram.com/stories/bad/1 https://instagram.com/stories/empty/2 https://instagram.com/stories/account/3');
 assert.equal(result.status,1);assert.match(result.stdout,/Başarılı JPG: 1 \| Başarısız JPG: 2/);assert.match(result.stderr,/stories\/bad\/1 — indirme başarısız/);assert.match(result.stderr,/stories\/empty\/2 — video bulunamadı/);f.clean();
 const fallback=f.run(undefined,{}, {FRAME_BEHAVIOR:'fallback'});assert.equal(fallback.status,0,fallback.stderr);
 assert.deepEqual(fs.readFileSync(path.join(f.output,'account-20261029-1530-02.jpg')),f.expected(f.sources.fps30,.5,true));f.clean();
 const before=fs.readdirSync(f.output).sort();
 const broken=f.run(undefined,{}, {FRAME_BEHAVIOR:'broken'});assert.equal(broken.status,1);assert.match(broken.stdout,/Başarılı JPG: 0 \| Başarısız JPG: 1/);assert.match(broken.stderr,/JPG oluşturulamadı veya doğrulanamadı/);assert.deepEqual(fs.readdirSync(f.output).sort(),before);f.clean();
 const signal=f.run(undefined,{}, {FRAME_BEHAVIOR:'signal'});assert.notEqual(signal.status,0);assert.deepEqual(fs.readdirSync(f.output).sort(),before);f.clean();
 fs.writeFileSync(path.join(f.tools,'mv'),'#!/usr/bin/env bash\nexit 1\n',{mode:0o755});
 const publish=f.run();assert.equal(publish.status,1);assert.match(publish.stderr,/JPG hedef klasöre aktarılamadı/);assert.deepEqual(fs.readdirSync(f.output).sort(),before);f.clean();
});
test('Frame migrates removed A/B and times, preserves Story selection, and validates custom time',()=>{
 const old=B.normalizeSettings({mode:'frame',frameTime:'1',frameOutput:'A'},2);assert.equal(old.frameTime,'0.5');assert.equal(old.frameOutput,undefined);
 const build=(frameTime,frameCustomTime='')=>B.build({links:story(1),settings:{mode:'frame',engine:'normal',frameTime,frameCustomTime}}).command;
 assert.ok(build('custom','0.75').includes('abs(t-0.75)'));assert.ok(build('1').includes('abs(t-0.5)'));assert.ok(build('first').includes('abs(t-0.5)'));
 for(const invalid of ['-1','1.01','abc','Infinity','']) assert.throws(()=>build('custom',invalid));
 const collection=B.build({links:'https://instagram.com/stories/story.account',settings:{mode:'frame'},selection:{only:'2'}}).command;
 assert.ok(collection.includes('SELECT=(--playlist-items "2")'));assert.ok(collection.includes('YTDLP=("$HOME/yt-dlp-story-test/bin/yt-dlp")'));
 for (const frameCustomTime of ['0','0.035','0.5','1']) execFileSync('bash',['-n'],{input:build('custom',frameCustomTime)});
});
test('three sections are options of one process and use numbered filenames',()=>{
 const r=B.build(input({},[{start:'27',end:'45'},{start:'52',end:'Son'},{start:'75',end:'90'}]));
 assert.equal(r.commandCount,1);assert.equal((r.command.match(/--download-sections/g)||[]).length,3);assert.match(r.command,/%\(autonumber\)02d/);assert.doesNotMatch(r.command,/%\(id\)|-cut|%\(section_start\)/);
 assert.ok(r.command.indexOf('*27-45')<r.command.indexOf('*52-inf'));
});
test('negative start and inf',()=>assert.match(B.build(input({},[{start:'-3',end:'inf'}])).command,/\*-3-inf/));
for (const c of [{start:'a',end:'2'},{start:'3',end:'2'},{start:'0',end:'0'},{start:'',end:'1'},{start:'1;id',end:'4'},{start:'-3',end:'2'},{start:'0',end:'-1'}])
 test('invalid cut '+JSON.stringify(c),()=>assert.throws(()=>B.build(input({},[c]))));
for (const s of [{min:'-1'},{min:''},{min:'3',max:'2'},{requests:'NaN'},{max:'Infinity'}])
 test('invalid sleep '+JSON.stringify(s),()=>assert.throws(()=>B.build(input(s))));
test('decimal sleep values preserved',()=>assert.match(B.build(input({requests:'0.5',min:'1.2',max:'3.5'})).command,/--sleep-requests 0\.5/));
test('independent folder and cookie paths',()=>{
 const c=B.build(input({folder:'/storage/emulated/0/My Files',cookies:'$HOME/My Cookies/cookies.txt'})).command;
 assert.match(c,/-P "\/storage\/emulated\/0\/My Files\/Video"/);assert.ok(c.includes('--cookies '+B.shellPath('$HOME/My Cookies/cookies.txt')));
});
test('content URIs and relative paths rejected',()=>{for(const folder of ['content://abc/file','relative','$HOMEEvil/a'])assert.throws(()=>B.build(input({folder})));});
test('Story filename uses real username, never metadata uploader id',()=>{
 const c=B.build(input()).command;assert.match(c,/--parse-metadata/);assert.ok(c.includes('(?P<channel>'));assert.match(c,/%\(channel,uploader,creator\|unknown\)s/);assert.doesNotMatch(c,/uploader_id/);
});
test('Reels fallback uses channel and stable missing date/time',()=>{
 const c=B.build({...input(),links:'https://instagram.com/reel/abc/'}).command;
 assert.match(c,/%\(channel,uploader,creator\|unknown\)s/);assert.match(c,/\|undated/);assert.match(c,/\|0000/);
});
test('no overwrites on by default; explicit force when disabled',()=>{assert.match(B.build(input()).command,/--no-overwrites/);assert.match(B.build(input({overwrite:false})).command,/--force-overwrites/);});
test('empty input, invalid enum and bad Instagram content fail closed',()=>{
 assert.throws(()=>B.build({links:'',cuts:[]}));assert.throws(()=>B.build(input({mode:'exec'})));assert.throws(()=>B.parseUrls('https://instagram.com/settings/'));
});
test('multiple links and sections apply common settings',()=>{
 const r=B.build({...input({engine:'normal'}),links:story(1)+story(2),cuts:[{start:0,end:1},{start:2,end:3}]});
 assert.equal(r.commandCount,1);assert.equal((r.command.match(/--no-playlist/g)||[]).length,1);assert.equal((r.command.match(/--download-sections/g)||[]).length,2);assert.equal((r.command.match(/--cookies/g)||[]).length,1);
 assert.ok(r.command.endsWith('"https://www.instagram.com/stories/user.2/102"'));
});
test('shell parsing and argv resist expansion/injection',()=>{
 const folder="$HOME/My 'Folder $(touch /tmp/should-not-exist) `id` $HOMEEvil";
 const r=B.build({links:story(1),settings:{...B.defaults,engine:'normal',folder,cookies:'/a/b"c'},cuts:[{start:-3,end:'inf'}]});
 execFileSync('bash',['-n'],{input:r.command});
 execFileSync('sh',['-n'],{input:r.command});
 const stub="yt-dlp() { python3 -c 'import sys,json; print(json.dumps(sys.argv[1:]))' \"$@\"; };\n";
 const args=JSON.parse(execFileSync('bash',['-c',stub+r.command],{encoding:'utf8',env:{...process.env,HOME:'/termux/home'}}));
 assert.equal(args[args.indexOf('-P')+1],folder.replace('$HOME','/termux/home')+'/Video');
 assert.equal(args[args.length-1],B.parseUrls(story(1))[0]);
 assert.equal(args[args.indexOf('--parse-metadata')+1],B.storyMetadata);
 assert.equal(args[args.indexOf('-o')+1],B.template(r.settings,true));
 assert.equal(args[args.indexOf('--download-sections')+1],'*-3-inf');
 assert.equal(args[args.indexOf('--cookies')+1],'/a/b"c');
});

test('mode subfolders use the selected base; cookie path is independent',()=>{
 for(const [mode,dir] of [['av','Video'],['video','Video'],['audio','Audio'],['still','SClip']]){
  const c=B.build(input({mode,folder:'$HOME/My Downloads/',cookies:'$HOME/Cookies/c.txt'})).command;
  assert.ok(c.includes('-P '+B.shellPath('$HOME/My Downloads/'+dir)));
  assert.ok(c.includes('--cookies '+B.shellPath('$HOME/Cookies/c.txt')));
 }
 assert.throws(()=>B.build(input({folder:''})));
});
test('five glued Instagram links produce one executable invocation with five URL args',()=>{
 const links=[1,2,3,4,5].map(n=>'https://www.instagram.com/reel/EXAMPLE'+n);
 const r=B.build({links:links.join(''),settings:{engine:'normal',mode:'still'},cuts:[]});
 const stub="yt-dlp() { python3 -c 'import json,sys;print(json.dumps(sys.argv[1:]))' \"$@\"; };\n";
 const args=JSON.parse(execFileSync('bash',['-c',stub+r.command],{encoding:'utf8'}));
 assert.deepEqual(args.slice(args.indexOf('--')+1),links);
 assert.equal(args.filter(a=>a==='--sleep-interval').length,1);
 assert.equal(r.commandCount,1);
});

test('bare Instagram domains, short Story IDs and all four routes',()=>{
 assert.equal(B.parseUrls('instagram.com/stories/a.b/1 www.instagram.com/reel/ABC instagram.com/p/XYZ instagram.com/tv/TV1').length,4);
});
test('spoofed domains, credentials, unsupported hosts and routes rejected',()=>{
 for(const url of ['https://instagram.com.evil.org/reel/abc','https://evilinstagram.com/reel/abc','https://instagram.com@evil.org/reel/abc','https://evil.org@instagram.com/reel/abc','https://m.instagram.com/reel/abc','https://instagram.com:8080/reel/abc','https://instagram.com/reels/abc','https://instagram.com/settings/']) assert.throws(()=>B.parseUrls(url),url);
 assert.throws(()=>B.build({links:story(1)+' https://evil.org/v',settings:{},cuts:[]}));
});
test('clipboard extraction skips unrelated links and deduplicates',()=>{
 assert.deepEqual(B.parseUrls('https://evil.org/x '+story(1)+story(1)+' https://instagram.com.evil.org/reel/x',true),B.parseUrls(story(1)));
});
test('double quote helper preserves all literal shell metacharacters',()=>{
 const literal='"single\' $HOME $(id) `id` \\ end';
 const script='python3 -c '+B.quote('import sys,json; print(json.dumps(sys.argv[1]))')+' '+B.quote(literal);
 assert.equal(JSON.parse(execFileSync('bash',['-c',script],{encoding:'utf8'})),literal);
});

test('collection links accept Story accounts, profile accounts and posts only',()=>{
 for(const [url,kind] of [['https://instagram.com/stories/a.b','stories'],['https://instagram.com/a.b','profile'],['https://instagram.com/p/abc','post']]) {
  const normalized=B.parseUrls(url)[0];assert.equal(B.collectionKind(normalized),kind);
 }
 for(const url of [story(1),'https://instagram.com/reel/abc','https://instagram.com/tv/abc']) assert.equal(B.collectionKind(B.parseUrls(url)[0]),null);
 for(const name of ['settings','accounts','explore','direct','reels']) assert.throws(()=>B.parseUrls('https://instagram.com/'+name));
});
test('blank item selection never adds a playlist flag',()=>{
 for(const links of ['https://instagram.com/stories/user','https://instagram.com/user','https://instagram.com/p/abc']) assert.doesNotMatch(B.build({links,selection:{only:'',after:'',before:''}}).command,/--playlist-items/);
});
test('item positions and exclusive before/after ranges',()=>{
 for(const [selection,spec] of [[{only:'3'},'3'],[{after:'3'},'4:'],[{before:'3'},'1:2'],[{after:'3',before:'7'},'4:6'],[{after:'3',before:'5'},'4:4']]) assert.equal(B.selectionSpec(selection),spec);
});
test('item selection applies to all four modes and both engines',()=>{
 for(const mode of ['av','video','audio','still']) for(const engine of ['normal','experimental']) {
  const command=B.build({links:'https://instagram.com/stories/user https://instagram.com/p/abc '+story(1),settings:{mode,engine},selection:{only:'3'}}).command;
  assert.match(command,/--playlist-items "3"/);assert.match(command,/--no-playlist/);assert.doesNotMatch(command,/--yes-playlist/);
  assert.equal((command.match(/--playlist-items/g)||[]).length,1);
 }
});
test('item selection stays inactive on direct Story/Reels/TV URLs',()=>{
 for(const links of [story(1),'https://instagram.com/reel/abc','https://instagram.com/tv/abc']) assert.doesNotMatch(B.build({links,selection:{only:'3'}}).command,/--playlist-items/);
});
test('invalid or contradictory item positions fail closed',()=>{
 for(const selection of [{only:'0'},{only:'-1'},{only:'1.5'},{only:'1;id'},{only:'9007199254740991'},{only:'2',after:'3'},{before:'1'},{after:'3',before:'4'},{after:'6',before:'2'}]) assert.throws(()=>B.build({links:'https://instagram.com/p/abc',selection}));
});

test('all modes use the requested username-date-time-counter filename',()=>{
 const expected='%(channel,uploader,creator|unknown)s-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(autonumber)02d.%(ext)s';
 for(const mode of ['av','video','audio','still']) {
  const result=B.build(input({mode},[{start:'0',end:'1'},{start:'2',end:'3'}]));
  assert.ok(result.command.includes('-o '+B.quote(expected)));
  assert.doesNotMatch(expected,/%\(id\)|-video|-av|-audio|-still|-cut/);
 }
});
test('deleting a link preserves unrelated unfinished text and other links',()=>{
 const raw='yarım not https://instagram.com/reel/abc?igsh=x https://instagram.com/stories/a/1 https://instag';
 const removed=B.removeUrl(raw,'https://www.instagram.com/reel/abc');
 assert.match(removed,/yarım not/);assert.match(removed,/stories\/a\/1/);assert.match(removed,/https:\/\/instag$/);assert.doesNotMatch(removed,/reel\/abc/);
});
test('note cleaning removes only Instagram sharing suffixes and preserves format annotations',()=>{
  const raw='https://www.instagram.com/hilaalats?psln=MWFjOWFsejNnZjFqcw== V4S(bak bu dördüncü sıradaki hikayenin linki indirilecek demek) \n\nhttps://www.instagram.com/stories/didemsoydan/4015809594487502072?utm_source=ig_story_item_share&dlrf=ZHhoMWZ0OG9iMzgz V\nhttps://www.instagram.com/stories/mashadiduk/4015971660985413663?utm_source=ig_story_item_share&rpxt=dXNzdDMybHdhcnBr V1sec';
  assert.equal(B.cleanNotes(raw),'stories/hilaalats V4S(bak bu dördüncü sıradaki hikayenin linki indirilecek demek) \n\nstories/didemsoydan/4015809594487502072 V\nstories/mashadiduk/4015971660985413663 V1sec');
  assert.equal(B.cleanNotes('Not ?aynı #kalsın https://example.com/a?q=1 V https://instagram.com.evil/a?q=2\nhttps://instagram.com/reel/ABC/#shared S'), 'Not ?aynı #kalsın https://example.com/a?q=1 V https://instagram.com.evil/a?q=2\nreel/ABC S');
  assert.equal(B.cleanNotes('  https://instagram.com/p/ABC?igsh=x\tV+S\n'), '  p/ABC\tV+S\n');
  assert.equal(B.cleanNotes('stories/a/1 V1s reel/Bc_2 V'), 'stories/a/1 V1s\nreel/Bc_2 V');
  assert.equal(B.cleanNotes('https://instagram.com/reel/ABC/https://instagram.com/stories/a/1 V'), 'reel/ABC\nstories/a/1 V');
});
test('standalone Instagram usernames become Story account URLs in main links and notes',()=>{
 assert.deepEqual(B.parseUrls('hilaalats\n@elisha__h'),[
  'https://www.instagram.com/stories/hilaalats','https://www.instagram.com/stories/elisha__h'
 ]);
 assert.equal(B.cleanNotes('hilaalats V4S\nV1s\n@elisha__h S'),
  'stories/hilaalats V4S\nV1s\nstories/elisha__h S');
 assert.deepEqual(B.parseUrls('V1s'),[]);
});

test('tagged note links regroup by first-seen format while preserving order within groups',()=>{
 const input=[
  'stories/a/1 V1s','stories/b/2 V','stories/c/3 V1s','stories/d/4 V','stories/e/5 V4','Format bilgisi sonda'
 ].join('\n');
 assert.equal(B.cleanNotes(input),[
  'stories/a/1 V1s','stories/c/3 V1s','stories/b/2 V','stories/d/4 V','stories/e/5 V4','Format bilgisi sonda'
 ].join('\n'));
});
test('note link counter counts note entries and ignores non-Instagram text',()=>{
 assert.equal(B.countNoteLinks('hilaalats V4S\nhttps://instagram.com/reel/abc?utm_source=x V\nhttps://instagram.com/reel/abc V'),3);
 assert.equal(B.cleanNoteUrls('Yeni'),'Yeni');
 assert.equal(B.countNoteLinks('V1s\nözel not'),0);
});

test('English changes only Frame messages and leaves download options and paths untouched',()=>{
 const original=input({mode:'frame',cookies:'$HOME/Türkçe/cookies.txt'});
 const tr=B.build(original).command,en=B.build({...original,language:'en'}).command;
 assert.match(en,/Successful JPGs: %d/);assert.doesNotMatch(en,/Başarılı JPG:/);
 assert.match(en,/Türkçe/);assert.match(en,/-q:v 1 -pix_fmt yuvj444p/);
 assert.equal(spawnSync('bash',['-n','-c',en]).status,0);
 const messages=[['FFmpeg bulunamadı. Termux: pkg install ffmpeg','FFmpeg not found. Termux: pkg install ffmpeg'],['geçici klasör oluşturulamadı','could not create temporary directory'],['indirme başarısız','download failed'],['video bulunamadı','video not found'],['kaynak çözünürlüğü okunamadı','could not read source dimensions'],['JPG oluşturulamadı veya doğrulanamadı','could not create or verify JPG'],['JPG hedef klasöre aktarılamadı','could not publish JPG to output folder'],['Başarılı JPG: %d | Başarısız JPG: %d','Successful JPGs: %d | Failed JPGs: %d']];
 let expected=tr;for(const [a,b] of messages)expected=expected.replace(a,b);
 assert.equal(en,expected);
 for(const mode of ['av','video','audio','still']) {
  const value=input({mode});assert.equal(B.build({...value,language:'en'}).command,B.build(value).command);
 }
});
