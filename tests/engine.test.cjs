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
test('Frame emits one PNG without saving a video and uses the required output folder',()=>{
 const c=B.build({links:story(1),settings:{...B.defaults,mode:'frame'},cuts:[{start:'invalid',end:'invalid'}]}).command;
 assert.match(c,/-f "bv" --skip-download/);assert.match(c,/-f "bv" -g --print "%\(http_headers\)j" -- "\$URL"/);
 assert.match(c,/FFMPEG_ARGS\+=\(-headers "\$HTTP_HEADERS"\)/);assert.match(c,/FFMPEG_ARGS\+=\(-cookies "\$HTTP_COOKIES"\)/);assert.match(c,/MozillaCookieJar/);
 assert.match(c,/-map 0:v:0 -frames:v 1/);assert.match(c,/vcodec png/);assert.match(c,/Download\/Apps\/YT-DLP\/Frame/);
 assert.doesNotMatch(c,/\.mp4|--download-sections|filter:v|scale=/);
 assert.match(c,/--parse-metadata/);assert.match(c,/--cookies/);assert.match(c,/--sleep-requests 2 --sleep-interval 6 --max-sleep-interval 16/);
 assert.match(c,/\$HOME\/yt-dlp-story-test\/bin\/yt-dlp/);
});
test('Frame supports first frame, preset times and validated custom seconds',()=>{
 const build=frameTime=>B.build({links:story(1),settings:{...B.defaults,mode:'frame',frameTime,frameCustomTime:'2.25'}}).command;
 assert.match(build('first'),/-frames:v 1/);assert.doesNotMatch(build('first'),/FFMPEG_ARGS\+=\(-ss/);
 for(const [choice,time] of [['0.5','0.5'],['1','1'],['custom','2.25']]) assert.match(build(choice),new RegExp('FFMPEG_ARGS\\+=\\(-ss "'+time.replace('.','\\.')+'"\\)'));
 for(const invalid of ['-1','abc','Infinity','']) assert.throws(()=>B.build({links:story(1),settings:{...B.defaults,mode:'frame',frameTime:'custom',frameCustomTime:invalid}}));
});
test('Frame keeps URL order, engine, cookies, selection and independent-link failure handling',()=>{
 const urls=['https://www.instagram.com/user.1','https://www.instagram.com/user.2'];
 const result=B.build({links:urls.join(''),settings:{...B.defaults,engine:'normal',mode:'frame',cookies:'$HOME/My Cookies/c.txt',requests:'3',min:'7',max:'12'},selection:{only:'2'}});
 execFileSync('bash',['-n'],{input:result.command});
 assert.match(result.command,/YTDLP=\(yt-dlp\)/);assert.match(result.command,/COOKIES=\(--cookies "\$HOME\/My Cookies\/c.txt"\)/);
 assert.match(result.command,/SELECT=\(--playlist-items "2"\)/);assert.match(result.command,/--sleep-requests 3 --sleep-interval 7 --max-sleep-interval 12/);
 assert.ok(result.command.indexOf(urls[0])<result.command.indexOf(urls[1]));assert.match(result.command,/continue/);
});
test('Frame command extracts a valid full-resolution PNG per link and leaves no partial output after failure',{skip:!ffmpegAvailable},t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'frame-builder-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'source.mp4');
 execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=64x48:rate=30:duration=2','-c:v','mpeg4','-q:v','2','-y',source]);
 const source1fps=path.join(root,'source-1fps.mp4');
 execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=64x48:rate=1:duration=2','-c:v','mpeg4','-q:v','2','-y',source1fps]);
 const bin=path.join(root,'yt-dlp-story-test','bin');fs.mkdirSync(bin,{recursive:true});
 fs.writeFileSync(path.join(bin,'yt-dlp'),'#!/usr/bin/env bash\nset -u\nGET=0; URL=""\nfor arg in "$@"; do [[ "$arg" == "-g" ]] && GET=1; URL="$arg"; done\nif [[ $GET -eq 1 ]]; then if [[ "$URL" == *"/bad/"* ]]; then printf "%s\\n{}\\n" "file:///missing-frame-video.mp4"; elif [[ "$URL" == *"onefps"* ]]; then printf "file://%s\\n{}\\n" "$FRAME_TEST_SOURCE_1FPS"; else printf "file://%s\\n{}\\n" "$FRAME_TEST_SOURCE"; fi; else printf "fallback|20261028|1530\\n"; fi\n',{mode:0o755});
 const links='https://instagram.com/stories/frame.user/123 https://instagram.com/stories/bad/789 https://instagram.com/stories/onefps/234';
 const command=B.build({links,settings:{...B.defaults,mode:'frame',engine:'experimental',requests:'0',min:'0',max:'0'}}).command;
 execFileSync('bash',['-n'],{input:command});
 const cookiePath=path.join(root,'storage/shared/Download/Apps/YT-DLPTemp/cookies.txt');fs.mkdirSync(path.dirname(cookiePath),{recursive:true});fs.writeFileSync(cookiePath,'# Netscape HTTP Cookie File\n');
 let status=0,firstError='';try {execFileSync('bash',['-c',command],{env:{...process.env,HOME:root,FRAME_TEST_SOURCE:source,FRAME_TEST_SOURCE_1FPS:source1fps},stdio:'pipe'});} catch(e) {status=e.status;firstError=e.stderr?.toString()||'';}
 assert.equal(status,1,firstError||'one failed source reports a partial batch failure after processing all links');
 const output=path.join(root,'storage/shared/Download/Apps/YT-DLP/Frame');
 const pngs=fs.readdirSync(output).filter(file=>file.endsWith('.png'));
 assert.equal(pngs.length,2,firstError);assert.ok(pngs.some(file=>file.startsWith('frame.user-20261028-1530-01')));assert.ok(pngs.some(file=>file.startsWith('onefps-20261028-1530-01')));
 try {execFileSync('bash',['-c',command],{env:{...process.env,HOME:root,FRAME_TEST_SOURCE:source,FRAME_TEST_SOURCE_1FPS:source1fps},stdio:'pipe'});} catch(e) {status=e.status;firstError=e.stderr?.toString()||'';}
 assert.equal(status,1,firstError);assert.equal(fs.readdirSync(output).filter(file=>file.endsWith('.png')).length,4,'existing PNGs are preserved and later names remain unique');
 for(const png of fs.readdirSync(output).filter(file=>file.endsWith('.png'))) {
  const dimensions=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',path.join(output,png)],{encoding:'utf8'}).trim();
  assert.equal(dimensions,'64x48');
 }
 assert.equal(fs.readdirSync(output).filter(file=>file.startsWith('.frame.')).length,0);
});
test('Frame forwards yt-dlp headers and matching Netscape cookies to FFmpeg',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'frame-headers-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const bin=path.join(root,'yt-dlp-story-test','bin');fs.mkdirSync(bin,{recursive:true});
 fs.writeFileSync(path.join(bin,'yt-dlp'),'#!/usr/bin/env bash\nset -u\nGET=0; URL=""\nfor arg in "$@"; do [[ "$arg" == "-g" ]] && GET=1; URL="$arg"; done\nif [[ $GET -eq 1 ]]; then printf "%s\\n%s\\n" "https://video.cdninstagram.com/seg.mp4" \'{"User-Agent":"frame-test-agent","Referer":"https://www.instagram.com/"}\'; else printf "frame.user|20261028|1432\\n"; fi\n',{mode:0o755});
 const fakeFfmpeg=path.join(root,'bin');fs.mkdirSync(fakeFfmpeg);fs.writeFileSync(path.join(fakeFfmpeg,'ffmpeg'),'#!/usr/bin/env bash\nset -u\n: > "$FFMPEG_ARGS_LOG"\nfor arg in "$@"; do printf "%s\\n" "$arg" >> "$FFMPEG_ARGS_LOG"; OUT="$arg"; done\nprintf PNG > "$OUT"\n',{mode:0o755});
 const cookieFile=path.join(root,'cookies.txt');fs.writeFileSync(cookieFile,'# Netscape HTTP Cookie File\n.cdninstagram.com\tTRUE\t/\tTRUE\t1893456000\tsessionid\tsecret-frame-cookie\n');
 const command=B.build({links:story(1),settings:{...B.defaults,mode:'frame',engine:'experimental',cookies:'$HOME/cookies.txt',requests:'0',min:'0',max:'0'}}).command;
 execFileSync('bash',['-n'],{input:command});
 execFileSync('bash',['-c',command],{env:{...process.env,HOME:root,PATH:fakeFfmpeg+path.delimiter+process.env.PATH,FFMPEG_ARGS_LOG:path.join(root,'ffmpeg-args.txt')},stdio:'pipe'});
 const args=fs.readFileSync(path.join(root,'ffmpeg-args.txt'),'utf8');
 assert.match(args,/-headers/);assert.match(args,/User-Agent: frame-test-agent/);assert.match(args,/Referer: https:\/\/www\.instagram\.com/);assert.match(args,/-cookies/);assert.match(args,/sessionid=secret-frame-cookie; path=\/; domain=\.cdninstagram\.com;/);
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
