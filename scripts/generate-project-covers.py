"""Render lightweight, seamless project reels from the portfolio's own artwork.

Run with Python 3 and FFmpeg installed. Outputs are committed assets, so neither
tool is needed by the website or its production build.
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'projects'
REELS = {
    'bcrc': ['bcrc-0.webp', 'bcrc-1.webp', 'bcrc-2.webp'],
    'bha': ['bha-0.webp', 'bha-2.webp', 'bha-4.webp'],
    'yearbook': ['yearbook-0.webp', 'yearbook-2.webp', 'yearbook-3.webp'],
    'artsfest': ['artsfest-0.webp', 'artsfest-1.webp', 'artsfest-thumb.webp'],
}


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


for name, files in REELS.items():
    inputs, filters = [], []
    # The fourth shot repeats the first. Matching trim points close the loop.
    for i, file in enumerate([*files, files[0]]):
        inputs += ['-loop', '1', '-framerate', '24', '-i', str(ASSETS / file)]
        filters.append(
            f'[{i}:v]scale=1600:1280:force_original_aspect_ratio=decrease,'
            'pad=1600:1280:(ow-iw)/2:(oh-ih)/2:color=0xf7f7f5,'
            "zoompan=z='1.04+0.065*sin(on/57.6*PI)':"
            f"x='iw/2-iw/zoom/2+{1 if (i % 3) % 2 == 0 else -1}*14*sin(on/57.6*PI)':"
            "y='ih/2-ih/zoom/2':d=1:s=800x640:fps=24,"
            f'trim=duration=2.4,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[s{i}]'
        )
    for i in range(1, 4):
        a = 's0' if i == 1 else f'x{i-1}'
        filters.append(f'[{a}][s{i}]xfade=transition=smoothleft:duration=0.4:offset={i*2}[x{i}]')
    filters.append('[x3]trim=start=0.4:end=6.4,setpts=PTS-STARTPTS[out]')
    run([*inputs, '-filter_complex_threads', '1', '-filter_complex', ';'.join(filters),
         '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '25',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(ASSETS / f'{name}-cover.mp4')])
    print(f'Rendered {name}', flush=True)

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
