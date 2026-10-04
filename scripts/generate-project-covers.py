"""Render the work page's cover videos from their recorded walkthroughs.

Each cover is a short, seamless loop small enough to autoplay on a card. Run
with Python 3 and FFmpeg installed. The outputs are committed assets, so
neither tool is needed by the website or its production build.
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'projects'


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


# Let Prism's own motion design lead: a glimpse of the recorded home hero.
# The crop drops the screen recorder's controls at the left edge and keeps the full wordmark.
run(['-i', str(ASSETS / 'prism-walkthrough.mp4'), '-filter_complex_threads', '1',
     '-filter_complex',
     '[0:v]fps=24,crop=1150:720:64:0,'
     'setsar=1,split[a][b];[a]trim=start=0:end=7,setpts=PTS-STARTPTS[main];'
     '[b]trim=start=0:end=1,setpts=PTS-STARTPTS[head];'
     '[main][head]xfade=transition=fade:duration=1:offset=6,'
     'trim=start=1:end=7,setpts=PTS-STARTPTS[out]',
     '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(ASSETS / 'prism-cover.mp4')])
print('Rendered prism', flush=True)

# Allot's product demo, halved in size and closed into a loop for the card.
run(['-i', str(ASSETS / 'allot-walkthrough.mp4'), '-filter_complex_threads', '1',
     '-filter_complex',
     '[0:v]fps=30,scale=1280:-2,setsar=1,split[a][b];'
     '[a]trim=start=0:end=10.2,setpts=PTS-STARTPTS[main];'
     '[b]trim=start=0:end=1,setpts=PTS-STARTPTS[head];'
     '[main][head]xfade=transition=fade:duration=1:offset=9.2,'
     'trim=start=0:end=10.2,setpts=PTS-STARTPTS[out]',
     '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(ASSETS / 'allot-cover.mp4')])
print('Rendered allot', flush=True)
