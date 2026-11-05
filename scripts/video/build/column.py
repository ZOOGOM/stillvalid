#!/usr/bin/env python3
# Cuts the recorded take into SHOT segments (500x1080, 60fps, BT.709 limited) and joins them into one app column.
import subprocess,os,json,sys
H=os.path.expanduser('~/stillvalid-video'); F=H+'/final'; TK=H+'/takes/take-1'; CAP=TK+'/capture.mp4'; ST=TK+'/stills'
SEG=F+'/segments'; os.makedirs(SEG,exist_ok=True)
D=0.25
V=lambda a,b:('v',a,b); Hd=lambda t,d:('h',t,d)
Z=lambda n,d,zmax,cy:('z',n,d,zmax,cy)
SH={
 '02':(12,[Hd(2.90,4.0),V(2.90,3.44),V(4.22,11.68)]),
 '03':(20,[V(11.96,31.96)]),
 '04':(18,[Hd(32.75,4.0),V(32.75,40.15),Z('s4_mismatch',3.67,1.12,0.5),V(40.71,43.64)]),
 '05':(10,[Hd(43.64,1.2),V(43.64,50.30),Hd(50.30,2.14)]),
 '06':(8,[V(50.30,58.30)]),
 '07':(44,[V(58.30,60.11),V(60.80,62.31),Hd(62.31,0.68),Hd(62.31,5.1),V(62.31,65.68),Hd(65.68,0.62),V(66.32,71.73),Hd(72.30,10.38),V(72.30,77.18),V(77.78,81.45),V(82.13,88.70)]),
 '08':(10,[V(113.25,120.17),Hd(120.15,3.08)]),
 '09':(8,[V(89.10,89.60),V(90.20,92.60),V(93.60,94.00),V(94.60,96.60),V(97.33,97.93),V(99.05,99.45),V(100.05,101.75)]),
 '10':(12,[V(102.52,109.87),Hd(110.70,4.65)]),
}
VF="scale=500:1080:flags=lanczos:in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv444p,setsar=1,fps=60"
def build(name,ln,pieces,tail):
    inputs=[];fg=[];labels=[];ix=0
    for p in pieces:
        if p[0]=='v':
            ss=max(0,p[1]-1)
            inputs+=['-ss',f'{ss:.3f}','-i',CAP]; a=p[1]-ss;b=p[2]-ss
            fg.append(f'[{ix}:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,{VF}[p{ix}]')
        elif p[0]=='h':
            ss=max(0,p[1]-1)
            inputs+=['-ss',f'{ss:.3f}','-i',CAP]; a=p[1]-ss
            fg.append(f'[{ix}:v]trim=start={a:.4f}:end={a+0.02:.4f},setpts=PTS-STARTPTS,{VF},trim=end_frame=1,tpad=stop_mode=clone:stop_duration={p[2]:.4f},trim=duration={p[2]:.4f},setpts=PTS-STARTPTS[p{ix}]')
        else:
            n,d,zmax,cy=p[1:]
            inputs+=['-loop','1','-framerate','60','-t',f'{d:.4f}','-i',f'{ST}/{n}.png']
            N=int(round(d*60))
            # 1.0 -> zmax in 1.1s (eased), hold, back to 1.0 in the last 0.9s
            z=f"if(lt(on,66),1+({zmax}-1)*(0.5-0.5*cos(PI*on/66)),if(gt(on,{N-54}),1+({zmax}-1)*(0.5+0.5*cos(PI*(on-{N-54})/54)),{zmax}))"
            fg.append(f"[{ix}:v]zoompan=z='{z}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*{cy}':d=1:s=1000x2160:fps=60,scale=500:1080:flags=lanczos:out_range=tv:out_color_matrix=bt709,format=yuv444p,setsar=1,trim=end_frame={N},setpts=PTS-STARTPTS[p{ix}]")
        labels.append(f'[p{ix}]');ix+=1
    fg.append(''.join(labels)+f'concat=n={len(labels)}:v=1:a=0[c]')
    tl=D if tail else 0
    fg.append(f'[c]tpad=stop_mode=clone:stop_duration=1,trim=duration={ln+tl:.4f},setpts=PTS-STARTPTS[o]')
    out=f'{SEG}/shot{name}.mp4'
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-threads','3']+inputs+['-filter_complex',';'.join(fg),'-map','[o]','-an','-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv444p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-g','30',out]
    subprocess.check_call(cmd)
    print(name,subprocess.check_output(['ffprobe','-v','error','-select_streams','v','-count_frames','-show_entries','stream=nb_read_frames,width,height','-of','csv=p=0',out]).decode().strip(),flush=True)
T2COL=len(sys.argv)>1 and sys.argv[1]=='T2'
if T2COL:
    SH['07']=(44,[V(58.30,60.11),V(60.80,62.31),Hd(62.31,40.68)])
    SEG=F+'/segments_T2'; os.makedirs(SEG,exist_ok=True)
names=list(SH)
for i,n in enumerate(names):
    build(n,SH[n][0],SH[n][1],i<len(names)-1)
# join with one transition type: 0.25s horizontal-blur dissolve; xfade starts at the boundary so the timeline stays exact
ins=[];
for n in names: ins+=['-i',f'{SEG}/shot{n}.mp4']
fg=[];cur='[0:v]';t=0
for i,n in enumerate(names[:-1]):
    t+=SH[n][0]
    out=f'[x{i}]'
    fg.append(f'{cur}[{i+1}:v]xfade=transition=hblur:duration={D}:offset={t:.3f}{out}')
    cur=out
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-threads','4']+ins+['-filter_complex',';'.join(fg),'-map',cur,'-an','-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv444p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',f'{SEG}/app_column.mp4']
subprocess.check_call(cmd)
print(subprocess.check_output(['ffprobe','-v','error','-select_streams','v','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','csv=p=0',f'{SEG}/app_column.mp4']).decode())
