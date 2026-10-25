"""Actual yt-dlp + ffmpeg with local HTTP media and synthetic extractor metadata.
No Instagram session or network download is involved. Generated shell argv is parsed
by yt-dlp itself, then applied to known formats to verify cuts, names and artwork.
"""
import copy
import functools
import http.server
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]

def child():
    import yt_dlp
    parsed = yt_dlp.parse_options(sys.argv[2:])
    port = os.environ['FIXTURE_PORT']
    base = f'http://127.0.0.1:{port}/'
    info = dict(id='501', title='Fixture video', duration=6, channel='fixture.user',
                uploader='Fixture Full Name', uploader_id='123456789',
                timestamp=1792924320, upload_date='20261025',
                webpage_url=parsed.urls[0], extractor='fixture', extractor_key='Fixture',
                thumbnails=[dict(url=base+'cover.jpg',id='cover')],
                formats=[dict(format_id='v',url=base+'video.mp4',ext='mp4',
                              vcodec='h264',acodec='none',width=160,height=120,fps=24),
                         dict(format_id='a',url=base+'audio.m4a',ext='m4a',
                              vcodec='none',acodec='aac',abr=96)])
    if os.environ.get('FIXTURE_OPUS') == '1':
        info['formats'].append(dict(format_id='opus-best',url=base+'audio.opus',ext='opus',vcodec='none',acodec='opus',abr=160))
    if os.environ.get('FIXTURE_LOG'):
        with open(os.environ['FIXTURE_LOG'],'a') as log: log.write(json.dumps(parsed.urls)+'\n')
    with yt_dlp.YoutubeDL(parsed.ydl_opts) as ydl:
        for url in parsed.urls:
            item=copy.deepcopy(info)
            item['id']=url.rstrip('/').split('/')[-1]
            item['webpage_url']=url
            item['channel']='wrong.extractor.account' if '/stories/' in url else 'fixture.reel'
            ydl.process_ie_result(item,download=True)

def run(args, **kw):
    return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,**kw)

def probe(path):
    return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],text=True).stdout)

def main():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
        def do_GET(self):
            path=Path(self.translate_path(self.path))
            if not path.is_file(): return super().do_GET()
            data=path.read_bytes(); start=0; end=len(data)-1
            value=self.headers.get('Range')
            if value:
                bounds=value.removeprefix('bytes=').split('-')
                start=int(bounds[0] or 0); end=int(bounds[1]) if bounds[1] else end
                end=min(end,len(data)-1)
            self.send_response(206 if value else 200)
            self.send_header('Content-Type',self.guess_type(str(path)))
            self.send_header('Accept-Ranges','bytes')
            self.send_header('Content-Length',str(end-start+1))
            if value: self.send_header('Content-Range',f'bytes {start}-{end}/{len(data)}')
            self.end_headers()
            try: self.wfile.write(data[start:end+1])
            except (BrokenPipeError,ConnectionResetError): pass
    with tempfile.TemporaryDirectory(prefix='builder-media-') as td:
        folder=Path(td); media=folder/'media'; media.mkdir(); output=folder/'output'; output.mkdir()
        run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=160x120:rate=24','-t','6','-c:v','libx264','-pix_fmt','yuv420p','-g','24','-keyint_min','24','-sc_threshold','0','-movflags','+faststart',str(media/'video.mp4')])
        run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440','-t','6','-c:a','aac',str(media/'audio.m4a')])
        run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=128x128','-frames:v','1','-threads','1',str(media/'cover.jpg')])
        run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=880','-t','6','-c:a','libopus','-b:a','160k',str(media/'audio.opus')])
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(media)))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        bindir=folder/'bin'; bindir.mkdir()
        wrapper=bindir/'yt-dlp'
        wrapper.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(Path(__file__).resolve()))+' --child "$@"\n')
        wrapper.chmod(0o755)
        env={**os.environ,'PATH':str(bindir)+os.pathsep+os.environ['PATH'],'FIXTURE_PORT':str(server.server_port),'FIXTURE_LOG':str(folder/'invocations.jsonl')}
        def command(mode,cuts=(),thumb=True,links='https://www.instagram.com/stories/fixture.user/501',selection=None):
            data=dict(links=links,cuts=list(cuts),selection=selection or {},settings=dict(engine='normal',mode=mode,folder=str(output),cookies='',requests='0',min='0',max='0',thumb=thumb))
            script="const B=require('./engine');process.stdout.write(B.build(JSON.parse(process.argv[1])).command)"
            return run(['node','-e',script,json.dumps(data)],cwd=ROOT,text=True).stdout
        try:
            cuts=[dict(start='0',end='1'),dict(start='2',end='3'),dict(start='-1',end='inf')]
            batch='https://www.instagram.com/stories/account.one/501 https://www.instagram.com/stories/account.two/502 https://www.instagram.com/reel/reel503'
            (output/'Video').mkdir();(output/'Video'/'keep.txt').write_text('keep existing directory')
            cmd=command('av',cuts,links=batch)
            assert '--force-keyframes-at-cuts' not in cmd
            run(['bash','-n'],input=cmd,text=True)
            result=run(['bash','-c',cmd],env=env,text=True)
            videos=sorted((output/'Video').glob('*.mp4'))
            assert len(videos)==9, result.stdout
            import re
            assert all(re.fullmatch(r'(?:account\.one|account\.two|fixture\.reel)-20261025-\d{4}-\d{2}\.mp4',p.name) for p in videos),[p.name for p in videos]
            assert sorted(int(p.stem.rsplit('-',1)[1]) for p in videos)==list(range(1,10))
            assert len((folder/'invocations.jsonl').read_text().splitlines())==1
            assert len(list((output/'Video').glob('account.one-*')))==3
            assert len(list((output/'Video').glob('account.two-*')))==3
            assert len(list((output/'Video').glob('fixture.reel-*')))==3
            assert not list((output/'Video').glob('wrong.extractor.account-*'))
            assert (output/'Video'/'keep.txt').read_text()=='keep existing directory'
            for p in videos:
                meta=probe(p)
                assert abs(float(meta['format']['duration'])-1)<0.2, (p,meta['format'])
                assert {'audio','video'} <= {s['codec_type'] for s in meta['streams']}, p
            print('PASS: one process, three URLs x three sections = nine distinct files, correct per-Story usernames and Reels metadata')
            # Repeating with no-overwrites must keep existing files byte-for-byte.
            before={p.name:(p.stat().st_mtime_ns,p.read_bytes()) for p in videos}
            run(['bash','-c',cmd],env=env,text=True)
            assert before=={p.name:(p.stat().st_mtime_ns,p.read_bytes()) for p in videos}
            print('PASS: numbered multi-section files stay distinct and repeat no-overwrites preserves existing files')
            log=run(['bash','-c',command('audio')],env=env,text=True)
            files=list((output/'Audio').glob('*.m4a')); assert len(files)==1,log.stdout
            streams=probe(files[0])['streams']
            assert any(s['codec_type']=='audio' and s['codec_name']=='aac' for s in streams),streams
            assert any(s.get('disposition',{}).get('attached_pic')==1 for s in streams),streams
            assert 'fixture.user-20261025-' in files[0].name and '123456789' not in files[0].name
            print('PASS: best audio preserves AAC and embeds source cover without MP3 conversion')
            log=run(['bash','-c',command('video')],env=env,text=True)
            files=list((output/'Video').glob('fixture.user-*.mp4')); assert len(files)==1,log.stdout
            assert all(s['codec_type']!='audio' for s in probe(files[0])['streams'])
            print('PASS: explicit silent video contains no audio')
            log=run(['bash','-c',command('still')],env=env,text=True)
            files=list((output/'SClip').glob('*.mp4')); assert len(files)==1,log.stdout
            meta=probe(files[0]); assert abs(float(meta['format']['duration'])-1)<0.2
            assert all(s['codec_type']!='audio' for s in meta['streams'])
            print('PASS: StillClip actual first second without audio; Video/Audio/SClip output routing')
            # With a better Opus source, best must select/preserve it rather than force AAC/MP3.
            best_folder=output/'best-opus';best_folder.mkdir()
            log=run(['bash','-c',command('audio',thumb=False).replace(str(output),str(best_folder))],env={**env,'FIXTURE_OPUS':'1'},text=True)
            files=list((best_folder/'Audio').glob('*.opus'));assert len(files)==1,log.stdout
            assert any(s['codec_name']=='opus' for s in probe(files[0])['streams'])
            print('PASS: better Opus source selected over AAC and retained as Opus')
            from yt_dlp import YoutubeDL
            with YoutubeDL({'quiet':True}) as ydl:
                template=run(['node','-e',"process.stdout.write(require('./engine').template())"],cwd=ROOT,text=True).stdout
                ydl._num_downloads=1
                name=ydl.evaluate_outtmpl(template,{'id':'501','ext':'mp4'})
                assert name=='unknown-undated-0000-01.mp4',name
            print('PASS: yt-dlp evaluates missing metadata without NA')
            # Feed synthetic collections through yt-dlp's real playlist processor.
            # The app still never contacts Instagram; these are local metadata fixtures.
            import yt_dlp
            cases=[({},list(range(1,7))),({'only':'3'},[3]),({'after':'3'},[4,5,6]),({'before':'3'},[1,2]),({'after':'2','before':'5'},[3,4])]
            for mode in ['av','video','audio','still']:
                for selection,expected in cases:
                    cmd=command(mode,links='https://instagram.com/stories/collection.user https://instagram.com/p/CAROUSEL https://instagram.com/stories/direct.user/9',selection=selection)
                    argv=shlex.split(cmd)
                    parsed=yt_dlp.parse_options(argv[1:])
                    assert parsed.ydl_opts['noplaylist'] is True
                    with yt_dlp.YoutubeDL({**parsed.ydl_opts,'quiet':True,'simulate':True}) as ydl:
                        for kind in ['story','post','profile']:
                            items=[dict(id=str(n),title=kind+str(n),url=f'http://127.0.0.1:{server.server_port}/video.mp4',ext='mp4',vcodec='h264',acodec='none') for n in range(1,7)]
                            result=ydl.process_ie_result(dict(_type='playlist',id=kind,extractor='fixture',extractor_key='Fixture',entries=items),download=False)
                            assert [int(e['id']) for e in result['entries']]==expected,(mode,selection,kind,result)
                        # Individual videos are not playlist-index-filtered.
                        direct=ydl.process_ie_result(dict(id='9',title='direct',url=f'http://127.0.0.1:{server.server_port}/video.mp4',ext='mp4',vcodec='h264',acodec='none'),download=False)
                        assert direct['id']=='9'
            print('PASS: real yt-dlp item selection: blank/single/before/after/range, four modes, collection playlists and unaffected direct media')

        except subprocess.CalledProcessError as e:
            print(e.stdout); raise
        finally: server.shutdown()

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--child': child()
    else: main()
