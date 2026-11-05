#!/bin/bash
cd ~/stillvalid-video/final/build
ILLUS_END=15.6 SUF=_T2 python3 subs.py | head -1; SUF=_T2 node subs_render.mjs | tail -1
python3 column.py T2 2>&1 | tail -2
python3 compose.py T2 2>&1 | tail -1 | cut -c1-200
cd .. && ffmpeg -hide_banner -loglevel error -y -i stillvalid_demo_final.mp4 -i audio/mix_T2.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart stillvalid_demo_final_v5.tmp.mp4 && mv stillvalid_demo_final_v5.tmp.mp4 stillvalid_demo_final_v5.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate -of csv=p=0 stillvalid_demo_final_v5.mp4
TZ=Asia/Seoul date +%H:%M:%S
