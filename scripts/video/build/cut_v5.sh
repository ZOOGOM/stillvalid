#!/bin/bash
cd ~/stillvalid-video/final; R=world3d/film/render
ENC="-c:v libx264 -preset veryfast -crf 12 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart"
ffmpeg -v error -y -threads 8 -i $R/world3d.v5_unchecked.mp4 -filter_complex "[0:v]split=3[a][b][c];[a]trim=start_frame=0:end_frame=960,setpts=PTS-STARTPTS[a1];[b]trim=start_frame=960:end_frame=3360,setpts=PTS-STARTPTS[a2];[c]trim=start_frame=3360:end_frame=4440,setpts=PTS-STARTPTS[a3]" -map "[a1]" $ENC world3d/act1.mp4 -map "[a2]" $ENC world3d/act2.mp4 -map "[a3]" $ENC world3d/act3.mp4
for f in act1 act2 act3; do ffprobe -v error -select_streams v -show_entries stream=nb_frames,r_frame_rate -of csv=p=0 world3d/$f.mp4; done
psnr(){ ffmpeg -hide_banner -nostats -threads 2 -ss $2 -i $1 -ss $4 -i $3 -filter_complex "[0:v]trim=end_frame=1,crop=500:1080:96:0,format=yuv420p[a];[1:v]trim=end_frame=1,format=yuv420p[b];[a][b]psnr" -f null - 2>&1 | grep -oE "average:[0-9.a-z]+" | head -1; }
echo "A1end $(psnr world3d/act1.mp4 15.983 segments/shot02.mp4 4.0)"; echo "A2start $(psnr world3d/act2.mp4 0 segments/shot07.mp4 3.9)"; echo "A2end $(psnr world3d/act2.mp4 39.983 segments/shot07.mp4 3.9)"; echo "A3start $(psnr world3d/act3.mp4 0 segments/shot10.mp4 11.98)"
cd build && python3 compose.py T2 2>&1 | tail -1 | cut -c1-200
cd .. && ffmpeg -hide_banner -loglevel error -y -i stillvalid_demo_final.mp4 -i audio/mix_T2.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart stillvalid_demo_final_v2.tmp.mp4 && mv stillvalid_demo_final_v2.tmp.mp4 stillvalid_demo_final_v2.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate -of csv=p=0 stillvalid_demo_final_v2.mp4
ffmpeg -hide_banner -loglevel error -y -threads 3 -i stillvalid_demo_final_v2.mp4 -vf "select='not(mod(n\,430))',scale=480:-1,tile=4x6" -fps_mode passthrough -frames:v 1 qa/t2v2_sheet.png
TZ=Asia/Seoul date +%H:%M:%S
