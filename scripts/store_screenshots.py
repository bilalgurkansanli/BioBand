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


def system_nav_size(img, max_fraction=0.12, quiet_run=8):
    """Depth of the system navigation bar at the far edge, or 0 if there is none.

    Android puts it at the bottom in portrait and along one side in landscape,
    and it has to go: a store listing showing another platform's back and home
    buttons is both wrong and a plausible reason for a reviewer to bounce it.

    Its shape from the edge inwards is margin, glyphs, margin, then the app.
    Reading it as "everything up to where the app starts" does not survive
    contact with this app: several screens are dark right up to the bar, so the
    search runs past it and eats real content.

    What holds is that the system centres its glyphs in the bar. So the margin
    behind the glyph band equals the margin in front of it, and the bar's depth
    is simply the glyph band's far edge plus the near margin — measured, with
    nothing beyond the glyphs needing to be classified at all.
    """
    grey = img.convert('L')
    w, h = grey.size
    px = grey.load()
    landscape = w > h
    depth = int((w if landscape else h) * max_fraction)

    edge_bg = px[w - 3, h // 2] if landscape else px[w // 2, h - 3]

    def busy(i):
        if landscape:
            x = w - 1 - i
            return max(abs(px[x, y] - edge_bg) for y in range(0, h, 2)) > 45
        y = h - 1 - i
        return max(abs(px[x, y] - edge_bg) for x in range(0, w, 2)) > 45

    start = next((i for i in range(depth) if busy(i)), None)
    if start is None:
        return 0

    end = start
    quiet = 0
    for i in range(start, depth):
        if busy(i):
            end = i
            quiet = 0
        else:
            quiet += 1
            if quiet >= quiet_run:
                break

    bar = end + start + 1
    # A band that reaches the cap is app content, not a navigation bar.
    return 0 if bar >= depth else bar


def trim_system_nav(img):
    n = system_nav_size(img)
    if n == 0:
        return img
    w, h = img.size
    return img.crop((0, 0, w - n, h)) if w > h else img.crop((0, 0, w, h - n))


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


# Backdrops cycle through the set. A listing is read as a strip, and one
# gradient repeated ten times reads as a single flat wall — alternating which
# end is dark gives the strip a rhythm without leaving the app's palette.
BACKDROPS = [
    ((62, 46, 130), (16, 14, 28)),
    ((16, 14, 28), (62, 46, 130)),
    ((44, 36, 112), (20, 16, 36)),
    ((20, 16, 36), (86, 58, 140)),
]


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
    out = backdrop.copy() if backdrop else gradient(size, *BACKDROPS[0])
    d = ImageDraw.Draw(out)
    W, H = size

    # The canvas is always portrait, whichever way the screen was captured: the
    # App Store lays the set out in one strip, and a landscape frame among
    # portrait ones shrinks to a fraction of their height. A sideways phone in
    # a portrait frame keeps every image the same size in that strip.
    sideways = shot.width > shot.height

    top = int(H * 0.075)
    if caption:
        fsize = int(W * 0.062)
        f = font(FONT_BOLD, fsize)
        lines = wrap(caption, f, int(W * 0.84), d)
        line_h = fsize * 1.22
        for i, line in enumerate(lines):
            d.text((W / 2, top + i * line_h), line, font=f,
                   fill=(255, 255, 255), anchor='ma')
        top += len(lines) * line_h + int(H * 0.04)

    # Phone body, scaled to whatever room is left.
    room_h = H - top - int(H * 0.06)
    room_w = int(W * (0.96 if sideways else 0.68))
    body_r = shot.width / shot.height
    bw, bh = room_w, int(room_w / body_r)
    if bh > room_h:
        bh, bw = room_h, int(room_h * body_r)

    bezel = max(6, int(min(bw, bh) * 0.022))
    radius = int(min(bw, bh) * 0.075)
    px_ = (W - bw) // 2
    # A landscape screen is roughly 2.5:1 inside a canvas nearer 1:2.2, so it
    # can never fill the frame — width is the binding constraint and the height
    # follows. Centring it on the whole canvas rather than on the leftover strip
    # under the headline makes the space above and below symmetrical, which
    # reads as deliberate instead of as a picture that fell to the top.
    py_ = (H - bh) // 2 if sideways else int(top)

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


def panorama_pair(shot, caption, colours):
    """One landscape screen spread across two store slots.

    A landscape screen in a single portrait slot comes out about a third of the
    canvas width tall, because width is the binding constraint. Given two slots
    side by side it gets twice the width, so twice the height — the difference
    between reading the app's controls and guessing at them. The App Store
    shows the set as a strip, so the two halves sit next to each other and the
    phone appears whole.

    The cost is two of the ten slots for one screen, so this is worth spending
    only on the screens that carry the app.
    """
    W, H = PORTRAIT
    canvas = gradient((W * 2, H), *colours)
    d = ImageDraw.Draw(canvas)

    # Text is written inside one half or the other, never across the seam.
    # The store also shows these images one at a time, and a headline cut down
    # the middle leaves each slot holding half a sentence. Use `left // right`
    # to put a line on each side.
    top = int(H * 0.085)
    if caption:
        left_text, _, right_text = caption.partition('//')
        fsize = int(W * 0.062)
        f = font(FONT_BOLD, fsize)
        for centre, text in ((W * 0.5, left_text.strip()), (W * 1.5, right_text.strip())):
            if not text:
                continue
            for i, line in enumerate(wrap(text, f, int(W * 0.82), d)):
                d.text((centre, top + i * fsize * 1.2), line, font=f,
                       fill=(255, 255, 255), anchor='ma')

    bw = int(W * 2 * 0.90)
    bh = int(bw / (shot.width / shot.height))
    bezel = max(8, int(min(bw, bh) * 0.020))
    radius = int(min(bw, bh) * 0.070)
    px_, py_ = (W * 2 - bw) // 2, (H - bh) // 2 + int(H * 0.03)

    d.rounded_rectangle(
        [px_ - bezel, py_ - bezel, px_ + bw + bezel, py_ + bh + bezel],
        radius=radius + bezel, fill=(8, 8, 10),
    )
    d.rounded_rectangle(
        [px_ - bezel, py_ - bezel, px_ + bw + bezel, py_ + bh + bezel],
        radius=radius + bezel, outline=(96, 88, 130), width=max(2, bezel // 3),
    )
    inner = shot.convert('RGB').resize((bw, bh), Image.LANCZOS)
    mask = Image.new('L', (bw, bh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, bw - 1, bh - 1], radius=radius, fill=255)
    canvas.paste(inner, (px_, py_), mask)

    return canvas.crop((0, 0, W, H)), canvas.crop((W, 0, W * 2, H))


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
    ap.add_argument('--captions', default='', help='Headlines, | separated, one per input')
    ap.add_argument('--panorama', action='store_true',
                    help='Spread each landscape capture across two slots')
    args = ap.parse_args()

    src = pathlib.Path(args.input)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg'))
    if not files:
        sys.exit(f'{src} icinde gorsel yok')

    captions = [c.strip() for c in args.captions.split('|')] if args.captions else []
    out = pathlib.Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    slot = 0
    for i, path in enumerate(files):
        raw = Image.open(path)
        bar, nav = status_bar_height(raw), system_nav_size(raw)
        # The device's own furniture goes first: the status bar because it
        # carries a stranger's battery level, the navigation bar because it is
        # visibly another platform's.
        shot = trim_system_nav(paint_over_status_bar(raw))
        caption = captions[i] if i < len(captions) else ''
        colours = BACKDROPS[i % len(BACKDROPS)]

        if args.panorama and shot.width > shot.height:
            left, right = panorama_pair(shot, caption, colours)
            for half in (left, right):
                slot += 1
                half.save(out / f'{slot:02d}-{path.stem}.png', optimize=True)
            note = 'panorama, 2 slot'
        else:
            slot += 1
            # Always portrait — see frame_in_phone.
            frame_in_phone(shot, PORTRAIT, caption,
                           backdrop=gradient(PORTRAIT, *colours)).save(
                out / f'{slot:02d}-{path.stem}.png', optimize=True)
            note = 'tek slot'

        print(
            f'{path.name:<22} {raw.size} durum={bar}px gezinme={nav}px '
            f'-> {note:<16} "{caption}"'
        )

    if slot > 10:
        print(f'\nUYARI: {slot} gorsel uretildi, magazalar en fazla 10 kabul ediyor.')
    print(f'\nyazildi: {out}  ({slot} gorsel)')


if __name__ == '__main__':
    main()
