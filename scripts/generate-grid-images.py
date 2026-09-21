"""Render grid-sized WebP renditions and cover posters for the work tab.

Full playground images reach 2200px and a megabyte; grid cells need a fraction
of that. Each project cover video also gets a poster from its first frame, so a
card looks the same before and after its video starts. Run with Python 3,
FFmpeg, and cwebp (libwebp) installed. Outputs are committed assets, so none of
these tools are needed by the website or its production build.
"""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PLAYGROUND = ROOT / 'assets' / 'playground'
PROJECTS = ROOT / 'assets' / 'projects'
# Posters shown on a mat inside a card never render wider than a grid column.
PROJECT_STILLS = ['artsfest-1.webp', 'bcrc-1.webp', 'bcrc-2.webp']


def encode(source, target, width=None):
    resize = ['-resize', str(width), '0'] if width else []
    subprocess.run(['cwebp', '-quiet', '-q', '80', '-m', '6', *resize, str(source), '-o', str(target)], check=True)


for source in sorted(PLAYGROUND.glob('*-full.webp')):
    encode(source, source.with_name(source.name.replace('-full', '-grid')), 800)
    print(f'Rendered {source.stem}', flush=True)

for name in PROJECT_STILLS:
    source = PROJECTS / name
    encode(source, source.with_name(f'{source.stem}-grid.webp'), 700)
    print(f'Rendered {source.stem}', flush=True)

with tempfile.TemporaryDirectory() as scratch:
    for reel in sorted(PROJECTS.glob('*-cover.mp4')):
        frame = Path(scratch) / f'{reel.stem}.png'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(reel),
                        '-frames:v', '1', str(frame)], check=True)
        encode(frame, reel.with_suffix('.webp'))
        print(f'Rendered {reel.stem} poster', flush=True)
