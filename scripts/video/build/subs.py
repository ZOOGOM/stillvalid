#!/usr/bin/env python3
import json,os,re
F=os.path.expanduser('~/stillvalid-video/final')
d=json.load(open(F+'/audio/durations.json'))
import subprocess,glob
for f in glob.glob(F+'/audio/N07?.wav'):
    d[os.path.basename(f)[:4]]=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).strip())
txt={l.split('|',1)[0]:l.split('|',1)[1].strip() for l in open(F+'/audio/narration.txt') if '|' in l}
s7=re.split(r'(?<=[.])\s+',txt['N07'])
for k,v in zip('abcde',s7): txt['N07'+k]=v
START={'N01':0.2,'N02':12.05,'N03':24.3,'N04':44.3,'N05':62.3,'N07a':82.0,'N07b':88.6,'N07c':99.4,'N07d':105.0,'N07e':112.2,'N08':124.4,'N09':134.6,'N10':142.4,'N11':156.5}
json.dump(START,open(F+'/audio/starts.json','w'),indent=1)
FULL={'N01','N11'}
def ts(t):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f'{h}:{m:02d}:{s:05.2f}'
def chunk(t,n=88):
    # split at punctuation into pieces of at most n characters (at most 2 lines each at 48px)
    parts=re.split(r'(?<=[.,:;?])\s+',t); out=[];cur=''
    for p in parts:
        if cur and len(cur)+1+len(p)>n: out.append(cur);cur=p
        else: cur=(cur+' '+p).strip()
    if cur: out.append(cur)
    return out
ev=[]
for k,st in START.items():
    dur=d[k]-0.4; c=chunk(txt[k]); tot=sum(len(x) for x in c); t=st+0.2
    for x in c:
        e=t+dur*len(x)/tot
        ev.append((t,e,'NarrFull' if k in FULL else 'Narr',x)); t=e
    assert ' '.join(c)==txt[k],k
NOTE=[
 (0.5,float(os.environ.get('ILLUS_END','11.8')),'NoteFull','Illustrative animation'),
 (16.2,21.2,'Note','Live app, recorded in a mobile browser · build fbbb841'),
 (33.52,42.9,'Note','Reading: 8.9 s (not sped up) · Measured in this single run, not a guarantee'),
 (51.4,55.0,'Note','Country selected by the user'),
 (63.0,71.0,'Note','Official page: seoul.go.kr'),
 (72.0,79.9,'Note','Check: 7.9 s (not sped up) · Measured in this single run, not a guarantee'),
 (84.2,116.0,'NoteTop','Cards lifted from the live result screen'),
 (93.0,97.4,'Note','Demo card: date altered for this demo. The official page says 3 April.'),
 (97.6,101.0,'Note','Public notice from March 2026, used as an example'),
 (116.4,123.6,'Note','The same input can end in "needs another look". Accuracy has not been measured on a human-labelled real-notice set.'),
 (124.1,133.9,'Note','Synthetic example · No live lookup'),
 (134.4,138.6,'Note','Same verdict · no new model call'),
 (147.2,153.8,'Note',"The current deployment uses Meta's contributor model: what you submit may be used to improve Meta's models. Don't submit anything you wouldn't want shared."),
 (154.4,160.8,'NoteFull','Illustrative animation · Narration and motion graphics generated with AI tools · App recorded on build fbbb841. The live app has since been updated.'),
]
if os.environ.get('SUF')=='_T2':
    NOTE=[(max(a,88.0),b,'NoteSide',t) if st=='NoteTop' else (a,b,st,t) for a,b,st,t in NOTE]
    NOTE=[((110.5,116.0,'NoteSide',t) if t.startswith('The same input') else (a,b,st,t)) for a,b,st,t in NOTE]
ev+=NOTE
hdr='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narr,Helvetica Neue,48,&H00F5F9FA,&H00F5F9FA,&H64000000,&H96000000,0,0,0,0,100,100,0,0,1,2.2,2,2,660,60,28,1
Style: NarrFull,Helvetica Neue,48,&H00F5F9FA,&H00F5F9FA,&H64000000,&H96000000,0,0,0,0,100,100,0,0,1,2.2,2,2,200,200,28,1
Style: Note,Helvetica Neue,32,&H00D8E6EC,&H00D8E6EC,&H78000000,&H96000000,0,0,0,0,100,100,0,0,1,1.6,1.5,2,660,60,216,1
Style: NoteFull,Helvetica Neue,32,&H00D8E6EC,&H00D8E6EC,&H78000000,&H96000000,0,0,0,0,100,100,0,0,1,1.6,1.5,2,200,200,216,1
Style: NoteSide,Helvetica Neue,26,&H00D8E6EC,&H00D8E6EC,&H78000000,&H96000000,0,0,0,0,100,100,0,0,1,1.4,1.2,3,0,40,264,1
Style: NoteTop,Helvetica Neue,28,&H00D8E6EC,&H00D8E6EC,&H78000000,&H96000000,0,0,0,0,100,100,0,0,1,1.4,1.2,8,660,60,186,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
with open(F+'/subs/captions'+os.environ.get('SUF','')+'.ass','w') as f:
    f.write(hdr)
    for a,b,s,t in sorted(ev):
        f.write(f'Dialogue: 0,{ts(a)},{ts(b)},{s},,0,0,0,,{t}\n')
json.dump([{'a':round(a,3),'b':round(b,3),'s':st,'t':t} for a,b,st,t in sorted(ev)],open(F+'/subs/events'+os.environ.get('SUF','')+'.json','w'),ensure_ascii=False,indent=0)
print(len(ev),'events'); 
for k,st in START.items(): print(k,round(st,2),'→',round(st+d[k],2))
