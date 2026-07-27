"""Turn raw phone screenshots into store-ready images.

Run by hand, outside the app. Reads whatever is in --input and writes three
variants of each file so a listing can be judged side by side:

  a-painted   the status bar covered with the app's own background — the app
              simply appears to run to the top edge. Nothing invented.
  b-cleanbar  a drawn status bar: 9:41, full signal, wifi, full battery. What
              Apple's own marketing material shows.
  c-framed    the screenshot inside a phone body on a coloured backdrop, with a
              headline above it, like most store listings.

Every variant is emitted at an exact store size, because App Store Connect
rejects anything that is a pixel off.

    python scripts/store_screenshots.py --input shots/ --output out/
    python scripts/store_screenshots.py --input shots/ --output out/ \
        --captions "Beş enstrüman|Nota nota öğren|Kendi miksini yap"
"""

import argparse
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

# App Store 6.5" — the only sizes Apple accepts for that slot.
PORTRAIT = (1242, 2688)
LANDSCAPE = (2688, 1242)

# The app's own background, used to cover the status bar and to letterbox.
APP_BG = (13, 13, 13)
ACCENT = (108, 92, 231)

FONT_DIR = pathlib.Path('C:/Windows/Fonts')
FONT_BOLD = 'segoeuib.ttf'
FONT_REG = 'segoeui.ttf'


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def round_rect(d, box, radius, **kw):
    """rounded_rectangle with the radius clamped to what the box can hold.

    Pillow raises on a radius wider than half the shape (it ends up drawing a
    rectangle with inverted coordinates), which is easy to hit on the thin
    signal bars where the radius is derived from the width.
    """
    x0, y0, x1, y1 = box
    limit = (min(x1 - x0, y1 - y0) - 2) / 2
    d.rounded_rectangle(box, radius=max(0, min(radius, limit)), **kw)


# ─────────────────────────────────────────────────────────────────────────────
# Finding the status bar


def status_bar_height(img, max_fraction=0.12, quiet_run=6):
    """Height of the status bar, found as the first band of content at the top.

    Taking the *last* bright row near the top does not work: the app's own
    screen title sits within the same few percent of the image and gets swept
    up with the bar, which then paints over it. What actually separates the two
    is the gap between them — so this walks down from the top edge, and stops at
    the first uninterrupted run of background rows after the bar's own content.
    """
    grey = img.convert('L')
    w, h = grey.size
    limit = int(h * max_fraction)
    px = grey.load()

    # Background level, from the darker end of the top region so a bright card
    # or a light theme does not drag the reference up.
    sample = sorted(px[x, y] for y in range(0, limit, 2) for x in range(0, w, 8))
    base = sample[len(sample) // 10] if sample else 0

    def busy(y):
        return max(px[x, y] for x in range(0, w, 4)) > base + 40

    seen_content = False
    quiet = 0
    for y in range(limit):
        if busy(y):
            seen_content = True
            quiet = 0
        else:
            quiet += 1
            if seen_content and quiet >= quiet_run:
                # Back off to the last busy row, plus slack for glyph edges.
                return (y - quiet + 1) + max(2, h // 400)
    return 0


def background_below(img, y):
    """The app's background colour just under the status bar, sampled from the
    edges where content is least likely to reach."""
    w = img.width
    band = img.convert('RGB').crop((0, y, w, min(y + 6, img.height)))
    px = band.load()
    samples = []
    for x in list(range(0, int(w * 0.12), 2)) + list(range(int(w * 0.88), w, 2)):
        for yy in range(band.height):
            samples.append(px[x, yy])
    if not samples:
        return APP_BG
    n = len(samples)
    return tuple(sum(s[i] for s in samples) // n for i in range(3))


# ─────────────────────────────────────────────────────────────────────────────
# Variant A — paint it out


def paint_over_status_bar(img):
    img = img.convert('RGB').copy()
    bar = status_bar_height(img)
    if bar == 0:
        return img
    fill = background_below(img, bar)
    ImageDraw.Draw(img).rectangle([0, 0, img.width, bar], fill=fill)
    return img


# ─────────────────────────────────────────────────────────────────────────────
# Variant B — draw a clean one


def draw_clean_status_bar(img):
    # Measured before painting, so the drawn bar occupies exactly the space the
    # real one did — no guessed height, and the layout below never shifts.
    bar = status_bar_height(img)
    if bar == 0:
        return img.convert('RGB').copy()

    img = paint_over_status_bar(img)
    w = img.width
    d = ImageDraw.Draw(img)

    pad = int(w * 0.055)
    mid = bar * 0.55
    fg = (255, 255, 255)

    f = font(FONT_BOLD, int(bar * 0.42))
    d.text((pad, mid), '9:41', font=f, fill=fg, anchor='lm')

    x = w - pad

    # Battery: an outlined body, a nub, and a full fill.
    bw, bh = int(w * 0.052), int(bar * 0.30)
    bx, by = x - bw, mid - bh / 2
    r = bh * 0.32
    round_rect(d, [bx, by, bx + bw, by + bh], r, outline=fg, width=max(2, bh // 12))
    round_rect(d, [bx + bw + 1, by + bh * 0.32, bx + bw + max(3, bh // 6), by + bh * 0.68],
               1, fill=fg)
    inset = max(2, bh // 8)
    round_rect(d, [bx + inset, by + inset, bx + bw - inset, by + bh - inset],
               r * 0.6, fill=fg)
    x = bx - int(w * 0.022)

    # Wi-Fi: three arcs and a dot, drawn from the outside in.
    ww = int(w * 0.042)
    cx, cy = x - ww / 2, mid + ww * 0.30
    for i, scale in enumerate((1.0, 0.66, 0.33)):
        rr = ww * 0.5 * scale
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 210, 330,
              fill=fg, width=max(2, int(ww * 0.11)))
    dot = max(2, int(ww * 0.07))
    d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=fg)
    x = cx - ww / 2 - int(w * 0.022)

    # Signal: four bars, ascending.
    bar_w = max(3, int(w * 0.008))
    gap = max(2, int(w * 0.005))
    tall = bh * 1.15
    for i in range(4):
        hgt = tall * (0.34 + 0.22 * i)
        bx2 = x - (3 - i) * (bar_w + gap) - bar_w
        round_rect(d, [bx2, mid + tall / 2 - hgt, bx2 + bar_w, mid + tall / 2],
                   bar_w * 0.4, fill=fg)
    return img


# ─────────────────────────────────────────────────────────────────────────────
# Variant C — inside a phone, with a headline


def gradient(size, top, bottom):
    """Vertical gradient. Drawn a row at a time — the images are small enough
    that the loop costs nothing, and it avoids pulling in numpy."""
    w, h = size
    img = Image.new('RGB', size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def frame_in_phone(shot, size, caption, backdrop=None):
    """The screenshot in a phone body, headline above, on a coloured backdrop."""
    # The app's own accent, darkened — the listing should read as the same
    # product as the icon sitting next to it in search results.
    out = backdrop.copy() if backdrop else gradient(size, (58, 44, 122), (18, 16, 32))
    d = ImageDraw.Draw(out)
    W, H = size
    landscape = W > H

    # Headline first: whatever it needs, the phone gets the rest.
    top = int(H * (0.09 if not landscape else 0.11))
    if caption:
        fsize = int(W * (0.062 if not landscape else 0.036))
        f = font(FONT_BOLD, fsize)
        lines = wrap(caption, f, int(W * 0.84), d)
        line_h = fsize * 1.22
        for i, line in enumerate(lines):
            d.text((W / 2, top + i * line_h), line, font=f,
                   fill=(255, 255, 255), anchor='ma')
        top += len(lines) * line_h + int(H * 0.035)

    # Phone body, scaled to whatever room is left.
    room_h = H - top - int(H * 0.05)
    room_w = int(W * (0.66 if not landscape else 0.80))
    body_r = shot.width / shot.height
    bw, bh = room_w, int(room_w / body_r)
    if bh > room_h:
        bh, bw = room_h, int(room_h * body_r)

    bezel = max(6, int(min(bw, bh) * 0.022))
    radius = int(min(bw, bh) * 0.075)
    px_, py_ = (W - bw) // 2, int(top)

    # A soft outer edge so the body reads as an object, not a pasted rectangle.
    d.rounded_rectangle(
        [px_ - bezel, py_ - bezel, px_ + bw + bezel, py_ + bh + bezel],
        radius=radius + bezel, fill=(8, 8, 10),
    )
    d.rounded_rectangle(
        [px_ - bezel, py_ - bezel, px_ + bw + bezel, py_ + bh + bezel],
        radius=radius + bezel, outline=(70, 66, 92), width=max(2, bezel // 3),
    )

    inner = shot.convert('RGB').resize((bw, bh), Image.LANCZOS)
    mask = Image.new('L', (bw, bh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, bw - 1, bh - 1], radius=radius, fill=255)
    out.paste(inner, (px_, py_), mask)
    return out


def wrap(text, f, max_w, d):
    words, lines, cur = text.split(), [], ''
    for word in words:
        trial = f'{cur} {word}'.strip()
        if d.textlength(trial, font=f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


# ─────────────────────────────────────────────────────────────────────────────
# Sizing


def fit_exact(img, size):
    """Scale to the target box and letterbox with the app's own background.

    Never stretches: a distorted screenshot is obvious and looks careless. The
    bars are the app's background colour, so on this app they are invisible.
    """
    target_w, target_h = size
    scale = min(target_w / img.width, target_h / img.height)
    resized = img.convert('RGB').resize(
        (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
        Image.LANCZOS,
    )
    edge = background_below(resized, min(resized.height - 8, int(resized.height * 0.5)))
    canvas = Image.new('RGB', size, edge)
    canvas.paste(resized, ((target_w - resized.width) // 2, (target_h - resized.height) // 2))
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--output', required=True)
    ap.add_argument('--captions', default='', help='Headlines for variant C, | separated')
    args = ap.parse_args()

    src = pathlib.Path(args.input)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg'))
    if not files:
        sys.exit(f'{src} icinde gorsel yok')

    captions = [c.strip() for c in args.captions.split('|')] if args.captions else []
    out = pathlib.Path(args.output)
    for name in ('a-painted', 'b-cleanbar', 'c-framed'):
        (out / name).mkdir(parents=True, exist_ok=True)

    for i, path in enumerate(files):
        img = Image.open(path)
        size = LANDSCAPE if img.width > img.height else PORTRAIT
        caption = captions[i] if i < len(captions) else ''

        variants = {
            'a-painted': fit_exact(paint_over_status_bar(img), size),
            'b-cleanbar': fit_exact(draw_clean_status_bar(img), size),
            'c-framed': frame_in_phone(paint_over_status_bar(img), size, caption),
        }
        for folder, result in variants.items():
            dest = out / folder / f'{i + 1:02d}-{path.stem}.png'
            result.save(dest, optimize=True)
        print(f'{path.name}  {img.size} -> {size}  bar={status_bar_height(img)}px  "{caption}"')

    print(f'\nyazildi: {out}')


if __name__ == '__main__':
    main()
