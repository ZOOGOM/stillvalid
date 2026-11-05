#!/usr/bin/env python3
# usage: compose.py T1|T2 [--seconds S]  Layers: env → app column → 2D intro/outro or 3D acts → panels → M6/M7/cards → end card → subtitles; audio = mix.wav
import subprocess,os,sys,json
F=os.path.expanduser('~/stillvalid-video/final')
tier=sys.argv[1]; LIM=None
if '--seconds' in sys.argv: LIM=float(sys.argv[sys.argv.index('--seconds')+1])
TOTAL=172
edl=json.load(open(F+'/edl.json'))
ins=[];fg=[];n=0
def add(*a):
    global n
    ins.extend(a); n+=1; return n-1
env=add('-stream_loop','-1','-i',F+'/env/bokeh_loop.mp4')
col=add('-i',F+'/segments/app_column.mp4')
fg.append(f"[{env}:v]trim=duration={TOTAL},setpts=PTS-STARTPTS,fps=60,format=yuv444p[base]")
fg.append(f"[{col}:v]tpad=stop_mode=clone:stop_duration=0.3,setpts=PTS-STARTPTS+12/TB[app]")
fg.append("[base][app]overlay=96:0:eof_action=pass:format=yuv444[s]")
cur='[s]'; k=0
def over(path,start,fadein=0,fadeout=0,alpha=True,dur=None):
    """overlay path at absolute time start. all sources are BT.709 limited."""
    global cur,k
    i=add('-i',path)
    conv="format=yuva444p"  # G's overlays are already BT.709 limited
    fs=''
    if fadein: fs+=f",fade=t=in:st=0:d={fadein}:alpha=1"
    if fadeout: fs+=f",fade=t=out:st={dur-fadeout}:d={fadeout}:alpha=1"
    fg.append(f"[{i}:v]{conv}{fs},setpts=PTS-STARTPTS+{start}/TB[l{k}]")
    fg.append(f"{cur}[l{k}]overlay=0:0:eof_action=pass:format=yuv444[o{k}]")
    cur=f'[o{k}]'; k+=1
if tier=='T1':
    over(F+'/intro/intro_2d.mp4',0,fadeout=0.1,alpha=False,dur=12)
    over(F+'/outro/outro_2d.mp4',154,fadein=0.1,alpha=False,dur=18)
else:
    over(F+'/world3d/act1.mp4',0,fadeout=0.1,alpha=False,dur=16)
    over(F+'/world3d/act2.mp4',84,fadein=0.1,fadeout=0.1,alpha=False,dur=40)
    over(F+'/world3d/act3.mp4',154,fadein=0.1,alpha=False,dur=18)
for s,v in edl['shots'].items():
    over(f'{F}/overlays/panel_shot{s}.mov',v['panelStart'])
if tier=='T1': over(F+'/overlays/cards_2d.mov',84)
over(F+'/overlays/M6.mov',edl['M6']['absStart'])
over(F+'/overlays/M7.mov',edl['M7']['absStart'])
if tier!='T1': over(F+'/outro/outro_card_alpha.mov',161)
sub=F+('/subs/subs_alpha_T2.mkv' if tier=='T2' else '/subs/subs_alpha.mkv')
i=add('-i',sub)
fg.append(f"[{i}:v]scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuva444p[sb]")
fg.append(f"{cur}[sb]overlay=0:0:eof_action=pass:format=yuv444,format=yuv420p,trim=duration={LIM or TOTAL},setpts=PTS-STARTPTS,fps=60[v]")
a=add('-i',F+'/audio/mix.wav')
name={'T1':'stillvalid_demo_T1.mp4','T2':'stillvalid_demo_final.mp4'}[tier]
out=F+('/qa/test_'+tier+'.mp4' if LIM else '/'+name)
tmp=out+'.tmp.mp4'
cmd=['ffmpeg','-hide_banner','-loglevel','warning','-y','-threads','6']+ins+['-filter_complex',';'.join(fg),'-map','[v]','-map',f'{a}:a','-c:v','libx264','-preset','fast','-profile:v','high','-b:v','14M','-maxrate','18M','-bufsize','28M','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-shortest',tmp]
subprocess.check_call(cmd); os.replace(tmp,out); print('OK',out)
