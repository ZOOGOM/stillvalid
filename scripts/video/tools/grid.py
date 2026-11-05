#!/usr/bin/env python3
# rebuild constant 60fps from frames + timestamps; frames not 1170x2532 are treated as missing. usage: grid.py <take-dir>
import json,os,sys,subprocess,shutil,struct
root=sys.argv[1]; fr=json.load(open(f'{root}/frames.json'))
def size(f):
    d=open(f,'rb').read(); i=2
    while i<len(d):
        if d[i]!=0xFF: i+=1; continue
        m=d[i+1]
        if 0xC0<=m<=0xC3:
            h,w=struct.unpack('>HH',d[i+5:i+9]); return (w,h)
        i+=2+struct.unpack('>H',d[i+2:i+4])[0]
grid=f'{root}/grid'; shutil.rmtree(grid,ignore_errors=True); os.makedirs(grid)
t0=fr[0][1]; n=int(round((fr[-1][1]-t0)*60))+1
slots=[None]*n; col=0; bad=0; first=None
for s,t in fr:
    if size(f'{root}/frames/{s:06d}.jpg')!=(1170,2532): bad+=1; continue
    if first is None: first=s
    i=int(round((t-t0)*60))
    if slots[i] is not None: col+=1
    slots[i]=s
dup=0;run=0;mx=0;last=first
for i in range(n):
    if slots[i] is None:
        dup+=1;run+=1;mx=max(mx,run);slots[i]=last
    else:
        run=0;last=slots[i]
    os.symlink(f'{root}/frames/{slots[i]:06d}.jpg',f'{grid}/{i:06d}.jpg')
stats=dict(t0=t0,slots=n,sourceFrames=len(fr),sizeRejected=bad,duplicated=dup,maxRun=mx,collisions=col)
print(stats)
tk=json.load(open(f'{root}/take.json')); tk['grid']=stats; json.dump(tk,open(f'{root}/take.json','w'),indent=1)
subprocess.check_call(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','60','-start_number','0','-i',f'{grid}/%06d.jpg','-c:v','libx264','-crf','12','-preset','ultrafast','-pix_fmt','yuv444p',f'{root}/capture.mp4'])
