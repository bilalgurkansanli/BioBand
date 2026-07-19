"""Synthesize the Turkish percussion bank (mono 44.1 kHz WAVs).

Usage: python make_turkish_perc_samples.py <outputDir>
Writes: turk_{darbuka_dum,darbuka_tek,darbuka_ka,darbuka_slap,darbuka_flam,
        bendir_dum,bendir_tek,bendir_buzz,def_hit,def_jingle,def_slap,
        kasik,kasik_double,zilli_masa,zilli_masa_long}.wav

Membrane hits are sums of inharmonic drum modes (1, 1.59, 2.14, 2.65, 3.16x)
with per-mode decay and an initial pitch drop; jingles/cymbals are clusters
of detuned metallic partials plus filtered noise. Pure stdlib. Deterministic.
"""
import math
import random
import struct
import sys
import wave

SR = 44100
rng = random.Random(3541)

MEMBRANE_RATIOS = (1.0, 1.593, 2.135, 2.653, 3.155)


def write_wav(path, samples, peak=0.88):
    top = max(abs(s) for s in samples) or 1.0
    gain = peak / top
    frames = b''.join(
        struct.pack('<h', max(-32767, min(32767, int(s * gain * 32767))))
        for s in samples
    )
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(frames)
    print(f"wrote {path}", file=sys.stderr)


def silence(dur):
    return [0.0] * int(SR * dur)


def fade_edges(buf, in_s=0.0008, out_s=0.03):
    n_in = max(1, int(SR * in_s))
    n_out = max(1, int(SR * out_s))
    for i in range(min(n_in, len(buf))):
        buf[i] *= i / n_in
    for i in range(min(n_out, len(buf))):
        buf[len(buf) - 1 - i] *= i / n_out
    return buf


def mix(dst, src, amp=1.0, t0=0.0):
    start = int(SR * t0)
    for i, s in enumerate(src):
        j = start + i
        if j >= len(dst):
            break
        dst[j] += s * amp
    return dst


def add_mode(buf, freq, amp, tau, bend=0.0, bend_tau=0.01, t0=0.0, drive=0.0):
    """One damped drum mode; `bend` = extra initial pitch (fraction of freq)."""
    start = int(SR * t0)
    ph = rng.random() * 2.0 * math.pi
    for i in range(start, len(buf)):
        t = (i - start) / SR
        f = freq * (1.0 + bend * math.exp(-t / bend_tau))
        ph += 2.0 * math.pi * f / SR
        s = math.sin(ph)
        if drive > 0.0:
            s = math.tanh((1.0 + drive) * s)
        buf[i] += amp * s * math.exp(-t / tau)
    return buf


def add_membrane(buf, f0, amp, tau, bend=0.35, mode_damp=1.9, t0=0.0, drive=0.0):
    """Inharmonic membrane: higher modes quieter and faster-decaying."""
    for k, ratio in enumerate(MEMBRANE_RATIOS):
        add_mode(
            buf,
            f0 * ratio,
            amp / (mode_damp ** k),
            tau / (1.0 + 0.9 * k),
            bend=bend / (1.0 + k),
            bend_tau=0.012,
            t0=t0,
            drive=drive if k == 0 else 0.0,
        )
    return buf


class OnePole:
    def __init__(self):
        self.lp = 0.0
        self.hp_px = 0.0
        self.hp_py = 0.0

    def run(self, x, lp_hz=None, hp_hz=None):
        y = x
        if hp_hz:
            a = math.exp(-2.0 * math.pi * hp_hz / SR)
            self.hp_py = a * (self.hp_py + y - self.hp_px)
            self.hp_px = y
            y = self.hp_py
        if lp_hz:
            a = 1.0 - math.exp(-2.0 * math.pi * lp_hz / SR)
            self.lp += a * (y - self.lp)
            y = self.lp
        return y


def add_noise(buf, amp_fn, tau=None, t0=0.0, lp_hz=None, hp_hz=None):
    start = int(SR * t0)
    filt = OnePole()
    for i in range(start, len(buf)):
        t = (i - start) / SR
        env = amp_fn(t) if callable(amp_fn) else amp_fn * math.exp(-t / tau)
        buf[i] += env * filt.run(rng.uniform(-1.0, 1.0), lp_hz=lp_hz, hp_hz=hp_hz)
    return buf


def add_jingles(buf, t0=0.0, amp=1.0, pairs=5, tau=0.09, spread=0.05,
                f_lo=3800.0, f_hi=8200.0):
    """Cluster of tiny metallic partial-bursts — tef/zil jingle rattle."""
    for _ in range(pairs):
        at = t0 + rng.random() * spread
        f = rng.uniform(f_lo, f_hi)
        for ratio in (1.0, 1.34, 1.77):
            add_mode(
                buf,
                f * ratio,
                amp * rng.uniform(0.12, 0.3) / ratio,
                tau * rng.uniform(0.6, 1.2),
                t0=at,
            )
    add_noise(buf, lambda t: amp * 0.5 * math.exp(-t / (tau * 0.7)),
              t0=t0, hp_hz=4500.0)
    return buf


# --- Darbuka ---------------------------------------------------------------

def darbuka_dum(dur=0.6, f0=88.0):
    buf = silence(dur)
    add_membrane(buf, f0, 1.0, 0.16, bend=0.5, drive=0.9)
    # Fingertip contact click.
    add_noise(buf, lambda t: 0.35 * math.exp(-t / 0.004), hp_hz=1800.0)
    return fade_edges(buf)


def darbuka_tek(dur=0.32):
    buf = silence(dur)
    # Rim ring: tight high modes.
    add_mode(buf, 480.0, 0.5, 0.05, bend=0.25)
    add_mode(buf, 1140.0, 0.7, 0.045)
    add_mode(buf, 2350.0, 0.55, 0.035)
    add_mode(buf, 3900.0, 0.3, 0.028)
    add_noise(buf, lambda t: 0.65 * math.exp(-t / 0.008), hp_hz=2600.0)
    return fade_edges(buf)


def darbuka_ka(dur=0.26):
    buf = silence(dur)
    # Weaker hand, slightly darker and shorter than tek.
    add_mode(buf, 430.0, 0.45, 0.04, bend=0.2)
    add_mode(buf, 980.0, 0.6, 0.038)
    add_mode(buf, 2050.0, 0.45, 0.03)
    add_mode(buf, 3300.0, 0.2, 0.022)
    add_noise(buf, lambda t: 0.55 * math.exp(-t / 0.006), hp_hz=2200.0)
    return fade_edges(buf)


def darbuka_slap(dur=0.4):
    buf = silence(dur)
    add_noise(buf, lambda t: 0.9 * math.exp(-t / 0.012), hp_hz=900.0, lp_hz=7500.0)
    add_membrane(buf, 220.0, 0.55, 0.05, bend=0.3, mode_damp=1.6)
    add_mode(buf, 1650.0, 0.35, 0.03)
    return fade_edges(buf)


def darbuka_flam(gap=0.062):
    dum = darbuka_dum()
    tek = darbuka_tek()
    buf = silence(gap + 0.6)
    mix(buf, dum, 0.9)
    mix(buf, tek, 0.8, t0=gap)
    return fade_edges(buf)


# --- Bendir / frame drums --------------------------------------------------

def bendir_dum(dur=0.9, f0=62.0):
    buf = silence(dur)
    add_membrane(buf, f0, 1.0, 0.3, bend=0.4, mode_damp=2.2, drive=0.7)
    add_noise(buf, lambda t: 0.2 * math.exp(-t / 0.006), hp_hz=1200.0)
    # Faint snare-wire buzz (bendir tel vızıltısı).
    add_noise(buf, lambda t: 0.16 * math.exp(-t / 0.16) * (0.6 + 0.4 * math.sin(2 * math.pi * 118 * t)),
              lp_hz=2600.0, hp_hz=350.0)
    return fade_edges(buf)


def bendir_tek(dur=0.4):
    buf = silence(dur)
    add_mode(buf, 340.0, 0.55, 0.06, bend=0.25)
    add_mode(buf, 820.0, 0.6, 0.05)
    add_mode(buf, 1700.0, 0.4, 0.04)
    add_noise(buf, lambda t: 0.5 * math.exp(-t / 0.008), hp_hz=1800.0)
    add_noise(buf, lambda t: 0.12 * math.exp(-t / 0.1) * (0.6 + 0.4 * math.sin(2 * math.pi * 122 * t)),
              lp_hz=2400.0, hp_hz=380.0)
    return fade_edges(buf)


def bendir_buzz(dur=0.85, f0=64.0):
    buf = silence(dur)
    add_membrane(buf, f0, 0.7, 0.22, bend=0.3, mode_damp=2.2)
    # Prominent sustained wire buzz.
    add_noise(buf, lambda t: 0.5 * math.exp(-t / 0.3) * (0.55 + 0.45 * math.sin(2 * math.pi * 96 * t)),
              lp_hz=3200.0, hp_hz=300.0)
    return fade_edges(buf)


# --- Def / tef -------------------------------------------------------------

def def_hit(dur=0.5, f0=132.0):
    buf = silence(dur)
    add_membrane(buf, f0, 0.85, 0.09, bend=0.4, mode_damp=1.8)
    add_noise(buf, lambda t: 0.3 * math.exp(-t / 0.005), hp_hz=1500.0)
    add_jingles(buf, t0=0.004, amp=0.5, pairs=4, tau=0.07, spread=0.03)
    return fade_edges(buf)


def def_jingle(dur=0.55):
    buf = silence(dur)
    add_jingles(buf, amp=0.9, pairs=7, tau=0.12, spread=0.08)
    return fade_edges(buf)


def def_slap(dur=0.5):
    buf = silence(dur)
    add_noise(buf, lambda t: 0.8 * math.exp(-t / 0.01), hp_hz=1000.0, lp_hz=8000.0)
    add_membrane(buf, 240.0, 0.5, 0.05, bend=0.3, mode_damp=1.6)
    add_jingles(buf, t0=0.002, amp=0.75, pairs=6, tau=0.1, spread=0.05)
    return fade_edges(buf)


# --- Kaşık / spoons --------------------------------------------------------

def kasik_click(dur=0.14):
    buf = silence(dur)
    add_mode(buf, 1250.0, 0.8, 0.014)
    add_mode(buf, 2600.0, 0.65, 0.01)
    add_mode(buf, 4700.0, 0.35, 0.007)
    add_noise(buf, lambda t: 0.5 * math.exp(-t / 0.003), hp_hz=2000.0)
    return fade_edges(buf, out_s=0.015)


def kasik_double(gap=0.085):
    one = kasik_click()
    two = kasik_click()
    buf = silence(gap + 0.16)
    mix(buf, one, 1.0)
    mix(buf, two, 0.85, t0=gap)
    return fade_edges(buf, out_s=0.015)


# --- Zilli maşa ------------------------------------------------------------

def zilli_masa(dur=0.5):
    buf = silence(dur)
    add_jingles(buf, amp=1.0, pairs=8, tau=0.14, spread=0.04,
                f_lo=4500.0, f_hi=9500.0)
    add_mode(buf, 3050.0, 0.3, 0.1)
    return fade_edges(buf)


def zilli_masa_long(dur=1.1, shakes=3, gap=0.16):
    buf = silence(dur)
    for i in range(shakes):
        add_jingles(buf, t0=i * gap, amp=1.0 - 0.18 * i, pairs=7,
                    tau=0.13, spread=0.05, f_lo=4500.0, f_hi=9500.0)
    add_mode(buf, 3050.0, 0.25, 0.16)
    return fade_edges(buf)


def main():
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    out = sys.argv[1]
    write_wav(f"{out}/turk_darbuka_dum.wav", darbuka_dum(), peak=0.9)
    write_wav(f"{out}/turk_darbuka_tek.wav", darbuka_tek())
    write_wav(f"{out}/turk_darbuka_ka.wav", darbuka_ka())
    write_wav(f"{out}/turk_darbuka_slap.wav", darbuka_slap())
    write_wav(f"{out}/turk_darbuka_flam.wav", darbuka_flam(), peak=0.9)
    write_wav(f"{out}/turk_bendir_dum.wav", bendir_dum(), peak=0.92)
    write_wav(f"{out}/turk_bendir_tek.wav", bendir_tek())
    write_wav(f"{out}/turk_bendir_buzz.wav", bendir_buzz(), peak=0.9)
    write_wav(f"{out}/turk_def_hit.wav", def_hit())
    write_wav(f"{out}/turk_def_jingle.wav", def_jingle(), peak=0.8)
    write_wav(f"{out}/turk_def_slap.wav", def_slap())
    write_wav(f"{out}/turk_kasik.wav", kasik_click(), peak=0.82)
    write_wav(f"{out}/turk_kasik_double.wav", kasik_double(), peak=0.82)
    write_wav(f"{out}/turk_zilli_masa.wav", zilli_masa(), peak=0.78)
    write_wav(f"{out}/turk_zilli_masa_long.wav", zilli_masa_long(), peak=0.78)


if __name__ == '__main__':
    main()
