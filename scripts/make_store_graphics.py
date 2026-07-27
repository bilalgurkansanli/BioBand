"""Build the two graphics Play requires that the App Store does not.

    python scripts/make_store_graphics.py docs/screenshots/graphics

Writes, per language:
    icon-512.png       512x512, the launcher icon Play stores separately
    feature-1024.png   1024x500, the banner above the listing

The icon is the same artwork the app ships, resized — Play wants its own copy
rather than reading it out of the bundle. The feature graphic is composed here
from the transparent adaptive-icon layer over the same purple gradient the
screenshots use, so the listing reads as one piece.
"""

import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = pathlib.Path('C:/Windows/Fonts')
BOLD, REGULAR = 'segoeuib.ttf', 'segoeui.ttf'

# Same pair the first screenshot uses, so the banner and the strip below it
# look like they were made together.
GRADIENT = ((62, 46, 130), (16, 14, 28))

TAGLINES = {
    'en': ('BioBand', 'Piano · Drums · Guitar · Violin · Pads'),
    'tr': ('BioBand', 'Piyano · Davul · Gitar · Keman · Padler'),
    'de': ('BioBand', 'Klavier · Schlagzeug · Gitarre · Geige · Pads'),
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

    # A pool of light under the logo so it belongs to the gradient rather than
    # sitting on top of it.
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse(
        [ax - art_w * 0.3, ay - art_h * 0.3,
         ax + art_w * 1.3, ay + art_h * 1.3], fill=64)
    canvas.paste(Image.new('RGB', (W, H), (150, 120, 255)), (0, 0),
                 glow.filter(ImageFilter.GaussianBlur(art_w * 0.22)))
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
