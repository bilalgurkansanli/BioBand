"""Synthesize the side-stick sample and the full 808 kit (mono 44.1 kHz WAVs).

Usage: python make_extra_drum_samples.py <outputDir>
Writes: sidestick.wav plus 808_{kick,snare,rim,tom_hi,tom_mid,tom_low,
        hihat_closed,hihat_open,crash,ride}.wav
Encode afterwards with ffmpeg (libmp3lame -q:a 2, mono 44.1 kHz).
Pure stdlib. Deterministic.
"""
import math
import os
import random
import struct
import sys
import wave

SR = 44100
rng = random.Random(808)


def write_wav(path, samples, peak=0.89):
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


def add_sine(buf, freq_fn, amp, tau, t0=0.0, phase=0.0, drive=0.0):
    """Damped (optionally gliding, optionally tanh-driven) sine into buf."""
    start = int(SR * t0)
    ph = phase
    for i in range(start, len(buf)):
        t = (i - start) / SR
        ph += 2.0 * math.pi * freq_fn(t) / SR
        s = math.sin(ph)
        if drive > 0.0:
            s = math.tanh((1.0 + drive) * s)
        buf[i] += amp * s * math.exp(-t / tau)
    return buf


def add_noise(buf, amp, tau, t0=0.0, hp_hz=None, lp_hz=None):
    """Damped white noise, optional one-pole HP/LP, into buf."""
    start = int(SR * t0)
    lp_y = 0.0
    lp_a = 1.0 - math.exp(-2.0 * math.pi * (lp_hz or 20000.0) / SR)
    hp_px = 0.0
    hp_py = 0.0
    hp_a = math.exp(-2.0 * math.pi * (hp_hz or 10.0) / SR)
    for i in range(start, len(buf)):
        t = (i - start) / SR
        x = rng.uniform(-1.0, 1.0)
        lp_y += lp_a * (x - lp_y)
        y = hp_a * (hp_py + lp_y - hp_px)
        hp_px, hp_py = lp_y, y
        buf[i] += amp * y * math.exp(-t / tau)
    return buf


def add_metallic(buf, base_hz, ratios, amp, tau, hp_hz, lp_hz):
    """808 cymbal/hat core: stacked square waves through a band-pass feel."""
    raw = [0.0] * len(buf)
    phases = [rng.uniform(0, 2 * math.pi) for _ in ratios]
    for i in range(len(buf)):
        t = i / SR
        s = 0.0
        for j, ratio in enumerate(ratios):
            v = math.sin(phases[j] + 2.0 * math.pi * base_hz * ratio * t)
            s += 1.0 if v >= 0 else -1.0
        raw[i] = s / len(ratios)
    # band-pass: one-pole HP + LP, then damped envelope
    lp_y = 0.0
    lp_a = 1.0 - math.exp(-2.0 * math.pi * lp_hz / SR)
    hp_px = 0.0
    hp_py = 0.0
    hp_a = math.exp(-2.0 * math.pi * hp_hz / SR)
    for i in range(len(buf)):
        t = i / SR
        lp_y += lp_a * (raw[i] - lp_y)
        y = hp_a * (hp_py + lp_y - hp_px)
        hp_px, hp_py = lp_y, y
        buf[i] += amp * y * math.exp(-t / tau)
    return buf


def fade_tail(buf, dur=0.03):
    n = int(SR * dur)
    for i in range(n):
        buf[len(buf) - n + i] *= 1.0 - i / n
    return buf


OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

# ---- acoustic side-stick (rim click on the snare edge) ----
b = silence(0.18)
add_noise(b, 0.7, 0.004, hp_hz=1500.0)                      # stick click
add_sine(b, lambda t: 1700.0, 0.55, 0.010)                  # rim ping
add_sine(b, lambda t: 810.0, 0.5, 0.020)                    # shell knock
add_sine(b, lambda t: 335.0, 0.35, 0.035)                   # body
write_wav(os.path.join(OUT, 'sidestick.wav'), fade_tail(b))

# ---- 808 kick: pitched-down sine boom with click ----
b = silence(0.9)
add_sine(b, lambda t: 48.0 + 112.0 * math.exp(-t / 0.03), 1.0, 0.28, drive=0.7)
add_noise(b, 0.25, 0.004, hp_hz=1200.0)
write_wav(os.path.join(OUT, '808_kick.wav'), fade_tail(b))

# ---- 808 snare: two detuned sines + noise snap ----
b = silence(0.4)
add_sine(b, lambda t: 185.0, 0.7, 0.055)
add_sine(b, lambda t: 330.0, 0.5, 0.045)
add_noise(b, 0.8, 0.11, hp_hz=900.0)
write_wav(os.path.join(OUT, '808_snare.wav'), fade_tail(b))

# ---- 808 rimshot: short bright ping ----
b = silence(0.12)
add_sine(b, lambda t: 1750.0, 0.8, 0.006)
add_sine(b, lambda t: 445.0, 0.6, 0.018)
add_noise(b, 0.4, 0.003, hp_hz=2000.0)
write_wav(os.path.join(OUT, '808_rim.wav'), fade_tail(b, 0.01))

# ---- 808 toms: gliding sine drums ----
for name, f_hi, f_lo, tau, dur in (
    ('808_tom_hi.wav', 310.0, 175.0, 0.16, 0.5),
    ('808_tom_mid.wav', 230.0, 128.0, 0.2, 0.6),
    ('808_tom_low.wav', 165.0, 92.0, 0.24, 0.7),
):
    b = silence(dur)
    add_sine(
        b,
        lambda t, hi=f_hi, lo=f_lo: lo + (hi - lo) * math.exp(-t / 0.05),
        1.0,
        tau,
        drive=0.35,
    )
    add_noise(b, 0.12, 0.006, hp_hz=800.0)
    write_wav(os.path.join(OUT, name), fade_tail(b))

# ---- 808 hats / cymbals: metallic square stacks ----
RATIOS = (2.0, 3.0, 4.16, 5.43, 6.79, 8.21)

b = silence(0.14)
add_metallic(b, 40.0, RATIOS, 1.0, 0.035, hp_hz=7000.0, lp_hz=12000.0)
write_wav(os.path.join(OUT, '808_hihat_closed.wav'), fade_tail(b, 0.01))

b = silence(0.65)
add_metallic(b, 40.0, RATIOS, 1.0, 0.24, hp_hz=6500.0, lp_hz=12000.0)
write_wav(os.path.join(OUT, '808_hihat_open.wav'), fade_tail(b))

b = silence(1.6)
add_metallic(b, 41.0, RATIOS, 0.85, 0.5, hp_hz=4800.0, lp_hz=12500.0)
add_noise(b, 0.5, 0.45, hp_hz=5000.0, lp_hz=12000.0)
write_wav(os.path.join(OUT, '808_crash.wav'), fade_tail(b))

b = silence(1.1)
add_metallic(b, 43.0, RATIOS, 0.8, 0.32, hp_hz=5600.0, lp_hz=11000.0)
add_sine(b, lambda t: 5200.0, 0.25, 0.25)                   # ride ping
write_wav(os.path.join(OUT, '808_ride.wav'), fade_tail(b))
