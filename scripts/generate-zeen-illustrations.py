#!/usr/bin/env python3
"""Split the Zeen illustrations into the layers their animations move.

Usage: python3 scripts/generate-zeen-illustrations.py [folder of SVGs]

Each layer keeps only some of an SVG's elements and is rendered by headless
Chrome at twice its size, then trimmed and saved as WebP. Moving small images
is much cheaper for the browser than moving thousands of vector dots. Writes
assets/projects/zeen-anim-* and src/illustration-layers.json.
Needs Google Chrome, ImageMagick and cwebp.
"""
import base64
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from pathlib import Path
import json
import math
import re
import subprocess
import sys
import tempfile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'projects'
MANIFEST = ROOT / 'src' / 'illustration-layers.json'
SOURCE = Path.home() / 'Downloads' / 'toanimate'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def span(start, end):
    return {index: None for index in range(start, end + 1)}


def whole(*indexes):
    return {index: None for index in indexes}


BOOKLET_CLIP = [0, 1, 51]  # the booklet's elements sit three groups down

# path: how to reach the group a layer's numbers refer to, from the root.
# A layer names that group's children by position; a nested dict narrows a child further.
SCENES = {
    'digital': {
        'svg': 'whatsadigitalzine.svg', 'size': (923, 373), 'path': [0],
        'layers': {
            'bg': whole(0), 'z1': whole(1), 'z2': whole(2), 'z3': whole(3),
            'z4': whole(4), 'z5': whole(5), 'z6': whole(6), 'text': whole(7),
        },
    },
    'glorified': {
        'svg': 'glorifiedpdfs.svg', 'size': (923, 373), 'path': [0],
        'layers': {'bg': whole(0), 'corner-end': whole(1), 'corner-start': whole(2), 'text': whole(3)},
    },
    'create': {
        'svg': 'creatingforall.svg', 'size': (923, 374), 'path': [0],
        'layers': {
            'bg': whole(0), 'scissors': whole(2), 'text': whole(3, 4),
            'line1': whole(1), 'line2': whole(5), 'line3': whole(6),
            'line4': whole(7), 'line5': whole(8), 'line6': whole(9),
        },
        'lines': {'line1': 1, 'line2': 5, 'line3': 6, 'line4': 7, 'line5': 8, 'line6': 9},
        # Each half is one handle and the blade across from it, so the two can turn on the pivot and snap.
        # Numbers are pixels in the trimmed, double sized layer. They only turn towards each other, so no seam opens.
        'split': {'scissors': {
            'pivot': (370, 203),
            'parts': {
                'a': ['0,0 370,0 370,205 285,197 0,192', '370,201 720,207 720,436 370,436'],
                'b': ['0,188 285,193 370,201 370,436 0,436', '370,0 720,0 720,209 370,205'],
            },
            'hub': 44,
        }},
    },
    'flatten': {
        'svg': 'flattened.svg', 'size': (923, 374), 'path': [0],
        'layers': {'bg': whole(0, 1), 'zine': whole(4), 'page': whole(3), 'export': whole(2)},
    },
    'interactive': {
        'svg': 'interactive.svg', 'size': (435, 435), 'crop': (4, 4, 427, 427), 'path': [0, 0],
        'layers': {
            'bg': whole(0), 'shadow': whole(1), 'panel1': whole(3), 'panel2': whole(5),
            'panel3': whole(7), 'panel4': whole(9), 'panel5': whole(11),
            'line': whole(12, 13), 'start': whole(14, 15), 'end': whole(16, 17), 'cursor': whole(18, 19),
        },
    },
    'creative': {
        'svg': 'entirelycreative.svg', 'size': (435, 435), 'crop': (4, 4, 427, 427), 'path': [1, 0],
        'layers': {
            'bg': whole(0), 'paper': whole(1, 2, 3),
            'photo': {**whole(4, 5, 7), **whole(25, 26)}, 'tape1': whole(8), 'tape2': whole(9),
            'sticker': span(10, 13), 'letter-z': whole(14, 15, 27), 'letter-e': whole(16, 17, 28),
            'letter-e2': whole(18, 19, 29), 'letter-n': whole(20, 21, 30), 'squiggle': whole(22, 23, 24),
        },
    },
    'collect': {
        'svg': 'builttocollect.svg', 'size': (435, 436), 'crop': (4, 4, 427, 427), 'path': BOOKLET_CLIP,
        'layers': {
            'bg': whole(0), 'sheet': span(1, 23), 'zine': whole(24, 26), 'sleeves': span(28, 78),
            'spark1': whole(79), 'spark2': whole(80), 'spark3': whole(81), 'star': whole(82), 'dot': whole(83),
        },
    },
    'accessible': {
        'svg': 'accessible.svg', 'size': (428, 428), 'path': [1],
        'root': {'bg': [0]},  # its dotted ground sits beside the group, not in it
        'layers': {
            'bg': {}, 'inside': {1: set(range(0, 446))}, 'bubble1': {1: set(range(446, 450))},
            'bubble2': {1: set(range(450, 455))}, 'bubble3': {1: set(range(455, 459))}, 'star': {1: {459}},
            'frame': whole(2, 3), 'sill': whole(4, 5, 6), 'shutter-left': whole(7, 8, 9, 11, 12, 14),
            'shutter-right': whole(15, 16, 17, 19, 20, 22), 'bubble4': span(23, 26), 'bubble5': span(27, 30),
        },
        # This SVG draws the window a little smaller than the finished artwork, which the animation fades into.
        'fit': {
            **dict.fromkeys(('inside', 'bubble1', 'bubble2', 'bubble3', 'star', 'frame', 'shutter-left', 'shutter-right'),
                            (1.055, 1.076, -19.9, -27.1)),
            'sill': (1.055, 1, -19.9, -1), 'bubble4': (1, 1, -16, 0),
        },
    },
}


def name_of(element):
    return element.tag.split('}')[-1]


def narrow(group, keep):
    """Drop a group's children that the selection doesn't name. Masks and clips stay, since others refer to them."""
    for index, child in reversed(list(enumerate(group))):
        if name_of(child) in ('mask', 'clipPath', 'defs'):
            continue
        if index not in keep:
            group.remove(child)
        elif isinstance(keep, dict) and keep[index] is not None:
            narrow(child, keep[index])


def layer_svg(scene, layer):
    root = deepcopy(scene['tree'])
    root_keep = scene.get('root', {}).get(layer)
    group = root
    for depth, index in enumerate(scene['path']):
        parent = group
        children = list(parent)
        # Everything outside the path to the group goes, apart from a layer's own root elements.
        if depth == 0:
            for position, child in enumerate(children):
                if name_of(child) != 'defs' and position != index and position not in (root_keep or []):
                    parent.remove(child)
        else:
            for position, child in enumerate(children):
                if name_of(child) not in ('mask', 'clipPath') and position != index:
                    # The booklet's flat paper is the first child of each outer group, and only matters to its ground.
                    parent.remove(child)
        group = children[index]
    narrow(group, scene['layers'][layer])
    if layer in scene.get('fit', {}):
        sx, sy, tx, ty = scene['fit'][layer]
        group.set('transform', f'matrix({sx} 0 0 {sy} {tx} {ty})')
    return ET.tostring(root, encoding='unicode')


def render(markup, size, out):
    width, height = size
    page = ('<!doctype html><style>html,body{margin:0;background:transparent;overflow:hidden}'
            f'svg{{display:block}}</style>{markup}')
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'page.html'
        # Chrome can miss a large image embedded in the page, but waits for one in a file.
        def unpack(match):
            image = Path(folder) / f'image{match.start()}.png'
            image.write_bytes(base64.b64decode(match.group(1)))
            return image.name
        path.write_text(re.sub(r'data:image/png;base64,([A-Za-z0-9+/=]+)', unpack, page))
        # Headless Chrome occasionally hangs on a page, and a second try goes through.
        for attempt in range(3):
            try:
                subprocess.run([
                    CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
                    f'--user-data-dir={folder}/profile-{attempt}', '--default-background-color=00000000',
                    '--force-device-scale-factor=2', f'--window-size={width},{height}',
                    '--virtual-time-budget=12000', f'--screenshot={out}', f'file://{path}',
                ], check=True, capture_output=True, timeout=90)
                return
            except subprocess.TimeoutExpired:
                if attempt == 2:
                    raise


def bounds(path):
    # The border gives a fully opaque layer an edge to find.
    box = subprocess.run(['magick', str(path), '-alpha', 'extract', '-threshold', '1%', '-bordercolor', 'black', '-border', '1',
                          '-format', '%@', 'info:'], check=True, capture_output=True, text=True).stdout.strip()
    width, height, x, y = map(int, re.match(r'(\d+)x(\d+)\+(\d+)\+(\d+)', box).groups())
    return x - 1, y - 1, width, height


def line_travel(group):
    """How far to move a cut line so its dot starts off screen: from the dot to the line's far end."""
    circle = next(e for e in group.iter() if name_of(e) == 'circle')
    cx, cy = float(circle.attrib['cx']), float(circle.attrib['cy'])
    far = (cx, cy)
    for element in group.iter():
        if name_of(element) == 'path':
            for a, b in re.findall(r'(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)', element.attrib['d']):
                if math.dist((float(a), float(b)), (cx, cy)) > math.dist(far, (cx, cy)):
                    far = (float(a), float(b))
    return round(far[0] - cx), round(far[1] - cy)


def save(image, name):
    out = OUT / f'zeen-anim-{name}.webp'
    subprocess.run(['cwebp', '-quiet', '-q', '84', '-alpha_q', '90', '-sharp_yuv', str(image), '-o', str(out)], check=True)
    print(f'{out.name}: {out.stat().st_size // 1024} KB', flush=True)
    return out.name


def make_layer(job):
    scene_name, scene, layer = job
    crop = scene.get('crop', (0, 0, *scene['size']))
    with tempfile.TemporaryDirectory() as folder:
        shot = Path(folder) / 'layer.png'
        x0, y0, w0, h0 = [value * 2 for value in crop]
        # A large embedded image can miss the screenshot, leaving it empty.
        for attempt in range(4):
            render(layer_svg(scene, layer), scene['size'], shot)
            subprocess.run(['magick', str(shot), '-crop', f'{w0}x{h0}+{x0}+{y0}', '+repage', str(shot)], check=True)
            x, y, width, height = bounds(shot)
            if width > 4 and height > 4:
                break
        else:
            raise RuntimeError(f'{scene_name} {layer} rendered empty')
        subprocess.run(['magick', str(shot), '-crop', f'{width}x{height}+{x}+{y}', '+repage', str(shot)], check=True)
        entry = {'x': x / 2, 'y': y / 2, 'w': width / 2, 'h': height / 2}
        split = scene.get('split', {}).get(layer)
        if not split:
            return [{'name': layer, 'file': save(shot, f'{scene_name}-{layer}'), **entry}]
        px, py = split['pivot']
        made = []
        for part, shapes in split['parts'].items():
            piece = Path(folder) / f'{part}.png'
            draws = [arg for shape in shapes for arg in ('-draw', f'polygon {shape}')]
            subprocess.run([
                'magick', str(shot), '-alpha', 'set', '(', '-size', f'{width}x{height}', 'xc:none', '-fill', 'black', *draws,
                '-draw', f"circle {px},{py} {px + split['hub']},{py}", ')', '-compose', 'DstIn', '-composite', str(piece),
            ], check=True)
            made.append({'name': f'{layer}-{part}', 'file': save(piece, f'{scene_name}-{layer}-{part}'), **entry,
                         'pivot': [entry['x'] + px / 2, entry['y'] + py / 2]})
        return made


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    jobs = []
    for scene_name, scene in SCENES.items():
        scene['tree'] = ET.parse(source / scene['svg']).getroot()
        jobs += [(scene_name, scene, layer) for layer in scene['layers']]
    with ThreadPoolExecutor(max_workers=3) as pool:
        made = list(pool.map(make_layer, jobs))
    manifest = {}
    for (scene_name, scene, _layer), entries in zip(jobs, made):
        crop = scene.get('crop', (0, 0, *scene['size']))
        record = manifest.setdefault(scene_name, {'w': crop[2], 'h': crop[3], 'layers': []})
        for entry in entries:
            if entry['name'] in scene.get('lines', {}):
                group = list(scene['tree'][scene['path'][0]])[scene['lines'][entry['name']]]
                entry['dx'], entry['dy'] = line_travel(group)
            record['layers'].append(entry)
    MANIFEST.write_text(json.dumps(manifest, indent=1) + '\n')


if __name__ == '__main__':
    main()
