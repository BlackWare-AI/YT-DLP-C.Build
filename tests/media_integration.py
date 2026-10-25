"""Actual yt-dlp + ffmpeg with local HTTP media and synthetic extractor metadata.
No Instagram session or network download is involved. Generated shell argv is parsed
by yt-dlp itself, then applied to known formats to verify cuts, names and artwork.
"""
import contextlib
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
    with yt_dlp.YoutubeDL(parsed.ydl_opts) as ydl:
        ydl.process_ie_result(info,download=True)

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
        run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=160x120:rate=24','-t','6','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(media/'video.mp4')])
        run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440','-t','6','-c:a','aac',str(media/'audio.m4a')])
        run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=128x128','-frames:v','1','-threads','1',str(media/'cover.jpg')])
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(media)))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        bindir=folder/'bin'; bindir.mkdir()
        wrapper=bindir/'yt-dlp'
        wrapper.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(Path(__file__).resolve()))+' --child "$@"\n')
        wrapper.chmod(0o755)
        env={**os.environ,'PATH':str(bindir)+os.pathsep+os.environ['PATH'],'FIXTURE_PORT':str(server.server_port)}
        def command(mode,cuts=(),audio='m4a',links='https://www.instagram.com/stories/fixture.user/501'):
            data=dict(links=links,cuts=list(cuts),settings=dict(engine='normal',mode=mode,folder=str(output),cookies='',requests='0',min='0',max='0',audioFormat=audio))
            script="const B=require('./engine');process.stdout.write(B.build(JSON.parse(process.argv[1])).command)"
            return run(['node','-e',script,json.dumps(data)],cwd=ROOT,text=True).stdout
        try:
            cuts=[dict(start='0',end='1'),dict(start='2',end='3'),dict(start='-1',end='inf')]
            cmd=command('video',cuts)
            run(['bash','-n'],input=cmd,text=True)
            result=run(['bash','-c',cmd],env=env,text=True)
            videos=sorted(output.glob('*-video-cut*.mp4'))
            assert len(videos)==3, result.stdout
            for p in videos:
                meta=probe(p)
                assert abs(float(meta['format']['duration'])-1)<0.2, (p,meta['format'])
                assert {'audio','video'} <= {s['codec_type'] for s in meta['streams']}, p
            print('PASS: three separate ordered cuts, including negative start/inf; ~1 s and video+audio')
            # Repeating with no-overwrites must keep existing files byte-for-byte.
            before={p.name:(p.stat().st_mtime_ns,p.read_bytes()) for p in videos}
            run(['bash','-c',cmd],env=env,text=True)
            assert before=={p.name:(p.stat().st_mtime_ns,p.read_bytes()) for p in videos}
            print('PASS: repeated command preserves existing files')
            for fmt in ['m4a','mp3']:
                log=run(['bash','-c',command('audio',audio=fmt)],env=env,text=True)
                files=list(output.glob('*-'+fmt+'.'+fmt)); assert len(files)==1,log.stdout
                streams=probe(files[0])['streams']
                assert any(s['codec_type']=='audio' for s in streams), streams
                assert any(s.get('disposition',{}).get('attached_pic')==1 for s in streams), streams
                assert 'fixture.user-20261025-' in files[0].name and '123456789' not in files[0].name
                print('PASS: '+fmt+' actual audio conversion, embedded cover and username filename')
            log=run(['bash','-c',command('still')],env=env,text=True)
            files=list(output.glob('*-still-cut1-0-1.mp4')); assert len(files)==1,log.stdout
            meta=probe(files[0]); assert abs(float(meta['format']['duration'])-1)<0.2
            assert all(s['codec_type']!='audio' for s in meta['streams'])
            print('PASS: StillClip actual first second without audio')
            from yt_dlp import YoutubeDL
            with YoutubeDL({'quiet':True}) as ydl:
                template='%(channel,uploader,creator|unknown)s-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s.%(ext)s'
                name=ydl.evaluate_outtmpl(template,{'id':'501','ext':'mp4'})
                assert name=='unknown-undated-0000-501.mp4',name
            print('PASS: yt-dlp evaluates missing metadata without NA')
        except subprocess.CalledProcessError as e:
            print(e.stdout); raise
        finally: server.shutdown()

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--child': child()
    else: main()
