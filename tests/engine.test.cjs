const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const B = require('../engine.js');
const story = n => `https://www.instagram.com/stories/user.${n}/${100+n}?utm_source=abc`;
const input = (settings={},cuts=[]) => ({links:story(1),settings,cuts});
test('single Story URL is canonical',()=>assert.deepEqual(B.parseUrls(story(1)),['https://www.instagram.com/stories/user.1/101']));
test('five different Stories',()=>assert.equal(B.parseUrls([1,2,3,4,5].map(story).join('\n')).length,5));
test('glued URLs split before next scheme',()=>assert.equal(B.parseUrls(story(1)+story(2)+story(3)).length,3));
test('deduplicate canonical URLs',()=>assert.equal(B.parseUrls(story(1)+' '+story(1).replace('?utm_source=abc','/')).length,1));
test('Reels and posts',()=>assert.equal(B.parseUrls('https://instagram.com/reel/De5cfG-vaDc/?igsh=a https://www.instagram.com/p/abc/').length,2));
test('generic query remains meaningful',()=>assert.equal(B.parseUrls('https://www.youtube.com/watch?v=abc&utm_source=share')[0],'https://www.youtube.com/watch?v=abc'));
test('manual normal/experimental engines',()=>{assert.match(B.build(input({engine:'normal'})).command,/\n?yt-dlp/);assert.match(B.build(input()).command,/"\$HOME"\/yt-dlp-story-test/);});
test('video includes audio and mp4 merger',()=>assert.match(B.build(input()).command,/-f 'bv\*\+ba\/b'[\s\S]*--merge-output-format mp4/));
for (const audioFormat of ['m4a','mp3']) test(audioFormat+' audio embeds thumbnail',()=>{
 const c=B.build(input({mode:'audio',audioFormat})).command;
 assert.match(c,new RegExp('--audio-format '+audioFormat));assert.match(c,/--embed-thumbnail/);assert.match(c,/--convert-thumbnails jpg/);
});
test('StillClip is video only first second; ignores editor',()=>{
 const c=B.build(input({mode:'still'},[{start:'bad',end:'bad'}])).command;
 assert.match(c,/-f 'bv'/);assert.match(c,/--download-sections '\*0-1'/);assert.doesNotMatch(c,/bad/);
});
test('three sections yield separate ordered commands and filenames',()=>{
 const r=B.build(input({},[{start:'27',end:'45'},{start:'52',end:'Son'},{start:'75',end:'90'}]));
 assert.equal(r.commandCount,3);assert.match(r.command, /cut1-27-45/);assert.match(r.command,/cut2-52-inf/);assert.match(r.command,/cut3-75-90/);
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
 assert.match(c,/-P '\/storage\/emulated\/0\/My Files'/);assert.ok(c.includes('--cookies "$HOME"\'/My Cookies/cookies.txt\''));
});
test('content URIs and relative paths rejected',()=>{for(const folder of ['content://abc/file','relative','$HOMEEvil/a'])assert.throws(()=>B.build(input({folder})));});
test('Story filename uses real username, never metadata uploader id',()=>{
 const c=B.build(input()).command;assert.match(c,/user\.1-%\(upload_date/);assert.doesNotMatch(c,/uploader_id/);
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
 assert.equal(r.commandCount,4);assert.equal((r.command.match(/--no-playlist/g)||[]).length,4);
});
test('shell parsing and argv resist expansion/injection',()=>{
 const folder="$HOME/My 'Folder $(touch /tmp/should-not-exist) `id` $HOMEEvil";
 const r=B.build({links:'https://example.org/v?x=$(id)&z=one',settings:{...B.defaults,engine:'normal',folder,cookies:'/a/b"c'},cuts:[{start:-3,end:'inf'}]});
 execFileSync('bash',['-n'],{input:r.command});
 execFileSync('sh',['-n'],{input:r.command});
 const stub="yt-dlp() { python3 -c 'import sys,json; print(json.dumps(sys.argv[1:]))' \"$@\"; };\n";
 const args=JSON.parse(execFileSync('bash',['-c',stub+r.command],{encoding:'utf8',env:{...process.env,HOME:'/termux/home'}}));
 assert.equal(args[args.indexOf('-P')+1],folder.replace('$HOME','/termux/home'));
 assert.equal(args[args.length-1],'https://example.org/v?x=$(id)&z=one');
 assert.equal(args[args.indexOf('--download-sections')+1],'*-3-inf');
 assert.equal(args[args.indexOf('--cookies')+1],'/a/b"c');
});
