"""Render the Prism cover video from its recorded website walkthrough.

Run with Python 3 and FFmpeg installed. The output is a committed asset, so
neither tool is needed by the website or its production build.
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'projects'


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


# Let Prism's own motion design lead: a glimpse of the recorded home hero.
run(['-i', str(ASSETS / 'prism-walkthrough.mp4'), '-filter_complex_threads', '1',
     '-filter_complex',
     '[0:v]fps=24,scale=800:640:force_original_aspect_ratio=increase,crop=800:640,'
     'setsar=1,split[a][b];[a]trim=start=0:end=7,setpts=PTS-STARTPTS[main];'
     '[b]trim=start=0:end=1,setpts=PTS-STARTPTS[head];'
     '[main][head]xfade=transition=fade:duration=1:offset=6,'
     'trim=start=1:end=7,setpts=PTS-STARTPTS[out]',
     '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(ASSETS / 'prism-cover.mp4')])
print('Rendered prism', flush=True)
