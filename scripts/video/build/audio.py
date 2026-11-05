#!/usr/bin/env python3
import json,os,subprocess
F=os.path.expanduser('~/stillvalid-video/final'); A=F+'/audio'
st=json.load(open(A+'/starts.json'))
TOTAL=172
ins=[];fg=[];labs=[]
for i,(k,t) in enumerate(st.items()):
    ins+=['-i',f'{A}/{k}.wav']; ms=int(t*1000)
    fg.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{i}]'); labs.append(f'[a{i}]')
n=len(st)
# synthetic room tone (very low) and soft progress ticks during the silent SHOT 06 (all generated, no third-party audio)
ins+=['-f','lavfi','-t',str(TOTAL),'-i','anoisesrc=r=48000:c=pink:a=0.5:seed=7']
fg.append(f'[{n}:a]lowpass=f=420,highpass=f=50,aformat=channel_layouts=stereo,volume=0.012[room]'); labs.append('[room]'); n+=1
for i,t in enumerate([72.4,73.6,75.0,79.9]):
    fr=660 if i<3 else 880
    ins+=['-f','lavfi','-t','0.25','-i',f"aevalsrc='0.5*sin(2*PI*{fr}*t)*exp(-14*t)':s=48000"]
    ms=int(t*1000); fg.append(f'[{n}:a]aformat=channel_layouts=stereo,volume=0.12,adelay={ms}|{ms}[t{i}]'); labs.append(f'[t{i}]'); n+=1
fg.append(''.join(labs)+f'amix=inputs={len(labs)}:duration=longest:normalize=0,atrim=duration={TOTAL}[mix]')
pre=A+'/mix_raw.wav'
subprocess.check_call(['ffmpeg','-hide_banner','-loglevel','error','-y']+ins+['-filter_complex',';'.join(fg),'-map','[mix]','-c:a','pcm_s24le','-ar','48000',pre])
# two-pass loudnorm to -14 LUFS, -1 dBTP
o=subprocess.run(['ffmpeg','-hide_banner','-i',pre,'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True).stderr
j=json.loads(o[o.rfind('{'):o.rfind('}')+1])
af=f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000"
subprocess.check_call(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',pre,'-af',af,'-c:a','pcm_s24le','-ar','48000',A+'/mix.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i',A+'/mix.wav','-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True).stderr
print(o[o.rfind('Summary'):])
