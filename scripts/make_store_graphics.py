"""Build the two graphics Play requires that the App Store does not.

    python scripts/make_store_graphics.py docs/screenshots/graphics

Writes, per language:
    icon-512.png       512x512, the launcher icon Play stores separately
    feature-1024.png   1024x500, the banner above the listing

The icon is the same artwork the app ships, resized — Play wants its own copy
rather than reading it out of the bundle. The feature graphic composes the
transparent adaptive-icon layer over a near-black field, matching the app,
with the colour arriving as bloom off the logo rather than as a painted
background.
"""

import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = pathlib.Path('C:/Windows/Fonts')
BOLD, REGULAR = 'segoeuib.ttf', 'segoeui.ttf'

# Near-black, like the app itself. The artwork is a glow drawn on black, and a
# strongly coloured field behind it fights that — the colour should look like it
# is coming off the logo, not painted underneath it. So the field stays almost
# neutral and the purple arrives as bloom around the artwork.
GRADIENT = ((13, 11, 20), (7, 6, 10))

# Two blooms rather than one: purple close in, a smaller warmer one offset, which
# is what keeps the black from reading as flat.
BLOOMS = (
    {'colour': (140, 110, 255), 'strength': 26, 'scale': 1.20, 'offset': (0.0, 0.0)},
    {'colour': (236, 120, 210), 'strength': 16, 'scale': 0.62, 'offset': (0.26, -0.30)},
    # A third, far out to the right. Without it that half is an unlit void:
    # the logo sits left, so every other source falls off long before the edge.
    {'colour': (120, 96, 210), 'strength': 30, 'scale': 2.10, 'offset': (1.85, 0.10)},
)

# Three verbs rather than a list of instruments: the list would have to be
# regenerated and re-uploaded to three store listings every time an instrument
# is added, and it says less — what the app is for does not change.
TAGLINES = {
    'en': ('BioBand', 'Play · Learn · Record'),
    'tr': ('BioBand', 'Çal · Öğren · Kaydet'),
    'de': ('BioBand', 'Spielen · Lernen · Aufnehmen'),
}


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new('RGB', size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)],
               fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def artwork():
    """The logo with no background behind it.

    Uses the adaptive-icon foreground rather than logo.png: that layer is
    already keyed, where logo.png carries the black card it was drawn on and
    would sit as a hard square on the gradient.
    """
    art = Image.open('assets/android-icon-foreground.png').convert('RGBA')
    return art.crop(art.getchannel('A').getbbox())


def make_icon(out_dir):
    """Play keeps its own 512 copy. Flattened onto the artwork's own black:
    a transparent icon shows through as whatever Play puts behind it."""
    icon = Image.open('assets/icon.png').convert('RGB').resize((512, 512), Image.LANCZOS)
    icon.convert('RGBA').save(out_dir / 'icon-512.png', optimize=True)
    return icon.size


def make_feature(out_dir, lang):
    W, H = 1024, 500
    canvas = gradient((W, H), *GRADIENT)

    art = artwork()
    art_h = int(H * 0.62)
    art_w = round(art.width * art_h / art.height)
    art = art.resize((art_w, art_h), Image.LANCZOS)
    ax, ay = int(W * 0.11), (H - art_h) // 2

    # Light pooling off the artwork, so the colour in the frame reads as the
    # logo's own glow rather than as a background someone chose.
    cx, cy = ax + art_w / 2, ay + art_h / 2
    for bloom in BLOOMS:
        r = art_w * bloom['scale']
        bx = cx + art_w * bloom['offset'][0]
        by = cy + art_h * bloom['offset'][1]
        layer = Image.new('L', (W, H), 0)
        ImageDraw.Draw(layer).ellipse(
            [bx - r, by - r, bx + r, by + r], fill=bloom['strength'])
        canvas.paste(Image.new('RGB', (W, H), bloom['colour']), (0, 0),
                     layer.filter(ImageFilter.GaussianBlur(r * 0.45)))

    canvas.paste(art, (ax, ay), art)

    d = ImageDraw.Draw(canvas)
    title, subtitle = TAGLINES[lang]
    tx = ax + art_w + int(W * 0.06)

    title_font = font(BOLD, 82)
    sub_font = font(REGULAR, 30)
    # Measured rather than guessed: the two blocks are centred as one unit, so
    # a longer subtitle in another language does not shift the title off centre.
    t_h = d.textbbox((0, 0), title, font=title_font)[3]
    s_h = d.textbbox((0, 0), subtitle, font=sub_font)[3]
    gap = 18
    top = (H - (t_h + gap + s_h)) / 2

    d.text((tx, top), title, font=title_font, fill=(255, 255, 255))
    d.text((tx, top + t_h + gap), subtitle, font=sub_font, fill=(214, 206, 255))

    path = out_dir / f'feature-1024-{lang}.png'
    canvas.save(path, optimize=True)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('output')
    args = ap.parse_args()
    out = pathlib.Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    print('icon-512.png', make_icon(out))
    for lang in TAGLINES:
        print(make_feature(out, lang).name)


if __name__ == '__main__':
    main()
