#!/usr/bin/env python3
"""Crop the recorded Zeen demos to the frames the case study shows them in.

Usage: python3 scripts/generate-zeen-clips.py [folder of recordings]

Every recording is 3024x1602 with the phone dead centre, so a crop is just a
centred window. Each clip gets a first-frame poster. The cover animation is
scaled down whole, for the case study hero and the work card. Needs FFmpeg and cwebp.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'projects'
SOURCE = Path.home() / 'Documents' / 'Zeen Case Study Assets' / 'Zeen Demos Real'
COVER = Path.home() / 'Documents' / 'zeen demos' / 'Master Zeen ANim.mov'

# shape: (crop width, crop height, output width, output height)
SHAPES = {
    'square': (1654, 1602, 1320, 1278),  # 929 x 900
    'narrow': (1254, 1602, 828, 1058),   # 559 x 714
    'wide': (2498, 1602, 1498, 960),     # 945.02 x 606.14
    'tall': (992, 1452, 660, 966),       # 284 x 416, tighter so the phone reads at that size
}

CLIPS = {
    'square': ['read-flip', 'drag-cut', 'dial'],
    'narrow': ['home', 'read-lights', 'draw', 'communities', 'explore-slideshow', 'explore-story', 'preview'],
    'wide': ['explore-precise', 'explore-dots', 'look', 'sticker', 'spread', 'communities', 'home'],
    'tall': ['template', 'fold', 'image', 'effects', 'publish', 'communities-only-in-create', 'music', 'background'],
}


def poster_from(video, poster):
    with tempfile.TemporaryDirectory() as folder:
        still = Path(folder) / 'first.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-frames:v', '1', str(still)], check=True)
        subprocess.run(['cwebp', '-quiet', '-q', '86', str(still), '-o', str(poster)], check=True)


def render_cover():
    video = OUT / 'zeen-cover.mp4'
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', str(COVER),
        '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
        '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
        '-movflags', '+faststart', str(video),
    ], check=True)
    poster_from(video, OUT / 'zeen-cover.webp')
    print(f'{video.name}: {video.stat().st_size / 1e6:.1f} MB')


def render(job):
    name, shape, source = job
    crop_w, crop_h, out_w, out_h = SHAPES[shape]
    video = OUT / f'zeen-{name}-{shape}.mp4'
    poster = OUT / f'zeen-{name}-{shape}-poster.webp'
    frame = f'crop={crop_w}:{crop_h},scale={out_w}:{out_h}:flags=lanczos'
    # A one-off cut supplied by hand sits beside the folder of recordings.
    recording = source / f'zeen-{name}.mp4'
    if not recording.exists():
        recording = source.parent / recording.name
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', str(recording),
        '-vf', f'{frame},fps=30,format=yuv420p',
        '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
        '-movflags', '+faststart', str(video),
    ], check=True)
    poster_from(video, poster)
    print(f'{video.name}: {video.stat().st_size / 1e6:.1f} MB')


def main():
    render_cover()
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    jobs = [(name, shape, source) for shape, names in CLIPS.items() for name in names]
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(render, jobs))


if __name__ == '__main__':
    main()
