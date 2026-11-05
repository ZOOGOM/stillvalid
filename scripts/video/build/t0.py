#!/usr/bin/env python3
# T0 safety cut: 1920x1080 60fps. Blurred app background, app column, plain title cards, static result cards, subtitles, narration.
import subprocess,os
F=os.path.expanduser('~/stillvalid-video/final')
TOTAL=172
ins=['-i',F+'/segments/app_column.mp4','-loop','1','-framerate','60','-t',str(TOTAL),'-i',F+'/t0/intro.png','-loop','1','-framerate','60','-t',str(TOTAL),'-i',F+'/t0/outro.png']
for i in range(1,6): ins+=['-loop','1','-framerate','60','-t',str(TOTAL),'-i',f'{F}/cards/card{i}.png']
ins+=['-i',F+'/audio/mix.wav','-i',F+'/subs/subs_alpha.mkv']
fg=[
 "[0:v]format=yuv444p,tpad=start_duration=12:start_mode=clone:stop_duration=18:stop_mode=clone,trim=duration=172,setpts=PTS-STARTPTS,split[c1][c2]",
 "[c1]scale=480:-2,crop=480:270,boxblur=14:2,eq=brightness=-0.26:saturation=0.85,scale=1920:1080,format=yuv444p[bg]",
 "[bg][c2]overlay=96:0[s0]",
]
def card(idx,scale,x,y,a,b):
    return f"[{idx}:v]format=rgba,scale={scale},fade=t=in:st={a}:d=0.3:alpha=1,fade=t=out:st={b-0.3}:d=0.3:alpha=1[k{idx}]",f"overlay={x}:{y}:enable='between(t,{a},{b})'"
cur='[s0]'
for idx,scale,x,y,a,b in [(3,'-2:620',950,130,88,92.5),(4,'940:-2',790,180,92.5,98.5),(5,'960:-2',780,130,98.5,110),(6,'960:-2',780,450,98.5,110),(7,'-2:620',940,130,110,116)]:
    s,o=card(idx,scale,x,y,a,b); fg.append(s); fg.append(f'{cur}[k{idx}]{o}[o{idx}]'); cur=f'[o{idx}]'
fg.append(f"[1:v]format=rgba,fade=t=out:st=11.75:d=0.25:alpha=1[int]"); fg.append(f"{cur}[int]overlay=0:0:enable='lt(t,12)'[o1]")
fg.append("[2:v]format=rgba,fade=t=in:st=154:d=0.25:alpha=1[outr]"); fg.append("[o1][outr]overlay=0:0:enable='gte(t,154)'[o2]")
fg.append(f"[9:v]format=rgba[sb]"); fg.append(f"[o2][sb]overlay=0:0:eof_action=pass,format=yuv420p,trim=duration={TOTAL},setpts=PTS-STARTPTS,fps=60[v]")
cmd=['ffmpeg','-hide_banner','-loglevel','warning','-y','-threads','4']+ins+['-filter_complex',';'.join(fg),'-map','[v]','-map','8:a','-c:v','libx264','-preset','medium','-profile:v','high','-b:v','14M','-maxrate','18M','-bufsize','28M','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-shortest',F+'/safe_tmp.mp4']
subprocess.check_call(cmd)
