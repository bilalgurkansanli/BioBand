"""Synthesize the pads FX one-shots (mono 44.1 kHz WAVs).

Usage: python make_pads_fx_samples.py <outputDir>
Writes: synth_{808,riser,whoosh,noise,tick,sweep,subdrop,reverse,laser,
        stab,tapestop,boom}.wav

Richer replacements for the original short FX bank shots: longer tails,
resonant sweeps, and four new pad13-16 voices (laser/stab/tapestop/boom).
Pure stdlib. Deterministic.
"""
import math
import random
import sys

import struct
import wave

SR = 44100
rng = random.Random(1616)


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


def fade_edges(buf, in_s=0.003, out_s=0.03):
    n_in = max(1, int(SR * in_s))
    n_out = max(1, int(SR * out_s))
    for i in range(min(n_in, len(buf))):
        buf[i] *= i / n_in
    for i in range(min(n_out, len(buf))):
        buf[len(buf) - 1 - i] *= i / n_out
    return buf


def add_sine(buf, freq_fn, amp_fn, t0=0.0, phase=0.0, drive=0.0):
    """Sine with per-sample freq/amp control, optional tanh drive."""
    start = int(SR * t0)
    ph = phase
    for i in range(start, len(buf)):
        t = (i - start) / SR
        ph += 2.0 * math.pi * freq_fn(t) / SR
        s = math.sin(ph)
        if drive > 0.0:
            s = math.tanh((1.0 + drive) * s)
        buf[i] += amp_fn(t) * s
    return buf


def add_saw_stack(buf, freq_fn, amp_fn, harmonics=8, detune=0.0, t0=0.0):
    """Band-limited-ish saw (harmonic sum), optionally detuned copy pair."""
    start = int(SR * t0)
    for sign in ((-1.0, 1.0) if detune > 0.0 else (0.0,)):
        ph = [rng.random() * 2.0 * math.pi for _ in range(harmonics)]
        ratio = 1.0 + sign * detune
        for i in range(start, len(buf)):
            t = (i - start) / SR
            f = freq_fn(t) * ratio
            s = 0.0
            for k in range(1, harmonics + 1):
                if f * k > SR * 0.42:
                    break
                ph[k - 1] += 2.0 * math.pi * f * k / SR
                s += math.sin(ph[k - 1]) / k
            buf[i] += amp_fn(t) * s * 0.55
    return buf


class Svf:
    """Chamberlin state-variable filter (fc clamped for stability)."""

    def __init__(self, q=1.0):
        self.low = 0.0
        self.band = 0.0
        self.q = 1.0 / max(0.4, q)

    def run(self, x, fc):
        f = 2.0 * math.sin(math.pi * min(7000.0, max(20.0, fc)) / SR)
        self.low += f * self.band
        high = x - self.low - self.q * self.band
        self.band += f * high
        return self.low, self.band, high


def add_noise_svf(buf, amp_fn, fc_fn, q=1.0, mode='band', t0=0.0):
    start = int(SR * t0)
    svf = Svf(q)
    for i in range(start, len(buf)):
        t = (i - start) / SR
        low, band, high = svf.run(rng.uniform(-1.0, 1.0), fc_fn(t))
        s = band if mode == 'band' else low if mode == 'low' else high
        buf[i] += amp_fn(t) * s
    return buf


def make_808():
    dur = 1.15
    buf = silence(dur)
    add_sine(
        buf,
        lambda t: 46.0 + 116.0 * math.exp(-t / 0.014),
        lambda t: math.exp(-t / 0.32),
        drive=1.6,
    )
    add_sine(
        buf,
        lambda t: 92.0 + 180.0 * math.exp(-t / 0.012),
        lambda t: 0.22 * math.exp(-t / 0.08),
    )
    add_noise_svf(
        buf,
        lambda t: 0.5 * math.exp(-t / 0.008),
        lambda t: 3200.0,
        q=0.8,
        mode='high',
    )
    return fade_edges(buf, 0.0005, 0.05)


def make_riser():
    dur = 2.4
    buf = silence(dur)
    rise = lambda t: (t / dur) ** 2.2
    add_noise_svf(
        buf,
        lambda t: rise(t),
        lambda t: 260.0 * math.exp(3.35 * t / dur),  # 260 -> ~7000 Hz
        q=3.2,
        mode='band',
    )
    add_saw_stack(
        buf,
        lambda t: 110.0 * (2.0 ** (2.0 * t / dur)),  # 110 -> 440 Hz
        lambda t: 0.4 * rise(t),
        harmonics=7,
        detune=0.008,
    )
    return fade_edges(buf, 0.01, 0.045)


def make_whoosh():
    dur = 1.0
    buf = silence(dur)
    bell = lambda t: math.sin(math.pi * min(1.0, t / dur)) ** 1.6
    add_noise_svf(
        buf,
        bell,
        lambda t: 600.0 + 3200.0 * math.exp(-t / 0.33) + 1400.0 * (t / dur) ** 3,
        q=1.15,
        mode='band',
    )
    return fade_edges(buf, 0.008, 0.05)


def make_noise_burst():
    dur = 0.35
    buf = silence(dur)
    add_noise_svf(
        buf,
        lambda t: math.exp(-t / 0.07),
        lambda t: 1500.0 + 2500.0 * math.exp(-t / 0.05),
        q=0.9,
        mode='high',
    )
    return fade_edges(buf, 0.0008, 0.03)


def make_tick():
    dur = 0.09
    buf = silence(dur)
    add_sine(buf, lambda t: 1800.0, lambda t: math.exp(-t / 0.015))
    add_sine(buf, lambda t: 3150.0, lambda t: 0.6 * math.exp(-t / 0.008))
    add_noise_svf(
        buf,
        lambda t: 0.7 * math.exp(-t / 0.004),
        lambda t: 5200.0,
        q=1.0,
        mode='high',
    )
    return fade_edges(buf, 0.0005, 0.012)


def make_sweep():
    dur = 1.25
    buf = silence(dur)
    chord = (130.81, 196.0, 261.63)
    for f0 in chord:
        add_saw_stack(
            buf,
            lambda t, f=f0: f,
            lambda t: (1.0 / len(chord)) * (0.35 + 0.65 * math.exp(-t / 0.9)),
            harmonics=9,
            detune=0.006,
        )
    # Resonant lowpass drop over the whole chord.
    out = silence(dur)
    svf = Svf(2.6)
    for i, x in enumerate(buf):
        t = i / SR
        fc = 250.0 + 5750.0 * math.exp(-t / 0.34)
        low, _, _ = svf.run(x, fc)
        out[i] = low
    return fade_edges(out, 0.006, 0.05)


def make_subdrop():
    dur = 1.5
    buf = silence(dur)
    add_sine(
        buf,
        lambda t: 27.0 + 57.0 * math.exp(-t / 0.5),
        lambda t: min(1.0, t / 0.012) * math.exp(-t / 0.62),
        drive=1.3,
    )
    add_sine(
        buf,
        lambda t: 2.0 * (27.0 + 57.0 * math.exp(-t / 0.5)),
        lambda t: 0.22 * math.exp(-t / 0.3),
    )
    return fade_edges(buf, 0.002, 0.08)


def make_reverse():
    dur = 1.6
    buf = silence(dur)
    rise = lambda t: (t / dur) ** 3.0
    add_noise_svf(
        buf,
        rise,
        lambda t: 1500.0 + 5500.0 * (t / dur) ** 1.5,
        q=1.0,
        mode='band',
    )
    add_noise_svf(
        buf,
        lambda t: 0.5 * rise(t),
        lambda t: 5800.0,
        q=0.7,
        mode='high',
    )
    return fade_edges(buf, 0.01, 0.02)


def make_laser():
    dur = 0.55
    buf = silence(dur)
    freq = lambda t: 170.0 + 2500.0 * math.exp(-t / 0.085)
    add_sine(buf, freq, lambda t: math.exp(-t / 0.17))
    add_sine(
        buf,
        lambda t: 2.0 * freq(t),
        lambda t: 0.35 * math.exp(-t / 0.1),
    )
    add_sine(
        buf,
        lambda t: 3.0 * freq(t),
        lambda t: 0.18 * math.exp(-t / 0.07),
    )
    return fade_edges(buf, 0.0008, 0.04)


STAB_CHORD = (220.0, 261.63, 329.63, 440.0)  # A minor stab


def make_stab():
    dur = 0.85
    buf = silence(dur)
    for f0 in STAB_CHORD:
        add_saw_stack(
            buf,
            lambda t, f=f0: f,
            lambda t: (1.0 / len(STAB_CHORD)) * math.exp(-t / 0.26),
            harmonics=8,
            detune=0.007,
        )
    out = silence(dur)
    svf = Svf(1.4)
    for i, x in enumerate(buf):
        t = i / SR
        fc = 900.0 + 2900.0 * math.exp(-t / 0.16)
        low, _, _ = svf.run(x, fc)
        out[i] = low
    return fade_edges(out, 0.001, 0.05)


def make_tapestop():
    dur = 1.3
    buf = silence(dur)
    slow = lambda t: max(0.0, 1.0 - t / dur) ** 1.6
    ph = [0.0] * len(STAB_CHORD)
    for i in range(len(buf)):
        t = i / SR
        m = slow(t)
        s = 0.0
        for j, f0 in enumerate(STAB_CHORD):
            ph[j] += 2.0 * math.pi * f0 * m / SR
            s += math.sin(ph[j]) / len(STAB_CHORD)
        buf[i] += s * (0.25 + 0.75 * m)
    add_noise_svf(
        buf,
        lambda t: 0.14 * slow(t),
        lambda t: 300.0 + 2000.0 * slow(t),
        q=0.8,
        mode='low',
    )
    return fade_edges(buf, 0.004, 0.06)


def make_boom():
    dur = 1.7
    buf = silence(dur)
    add_sine(
        buf,
        lambda t: 30.0 + 34.0 * math.exp(-t / 0.2),
        lambda t: min(1.0, t / 0.006) * math.exp(-t / 0.55),
        drive=1.5,
    )
    add_noise_svf(
        buf,
        lambda t: 0.5 * math.exp(-t / 0.45),
        lambda t: 130.0,
        q=0.7,
        mode='low',
    )
    add_noise_svf(
        buf,
        lambda t: 0.35 * math.exp(-t / 0.02),
        lambda t: 1900.0,
        q=0.8,
        mode='band',
    )
    return fade_edges(buf, 0.001, 0.1)


def make_clap():
    """Replaces the clap that arrived with no documented source.

    A clap is not one hit: it is a short scatter of hands not quite together,
    then the room. Four band-passed noise bursts a few milliseconds apart give
    the scatter, and a longer, lower-passed tail gives the room. Measured
    against the file it replaces — 0.48 s, mono, noise-dominated.
    """
    dur = 0.48
    buf = silence(dur)
    # The transients are held well below 1.0 on purpose. They set the peak, and
    # peak-normalising a sample whose peak is four 10 ms spikes leaves
    # everything else — including the tail that carries the body — far too low.
    for i, (offset, amp) in enumerate(((0.0, 0.62), (0.011, 0.52), (0.023, 0.44), (0.036, 0.34))):
        add_noise_svf(
            buf,
            lambda t, a=amp: a * math.exp(-t / 0.011),
            lambda t, k=i: 1650.0 + 190.0 * k,
            q=1.5,
            mode='band',
            t0=offset,
        )
    # The room behind them: darker, and much slower to leave. Carrying real
    # level rather than a hint of one — with only the four transients the whole
    # sample measured well under every other pad in the bank and would have
    # come out limp next to them, peak-normalising alone cannot fix that.
    add_noise_svf(
        buf,
        lambda t: 0.62 * math.exp(-t / 0.125),
        lambda t: 1250.0 - 420.0 * min(t / 0.30, 1.0),
        q=0.7,
        mode='band',
        t0=0.040,
    )
    return fade_edges(buf, 0.0004, 0.06)


def make_impact():
    """Replaces the impact that arrived with no documented source.

    Trailer-style hit: a sub that drops away under a bright noise crack, then a
    long decay. 1.0 s, matching the file it replaces.
    """
    dur = 1.0
    buf = silence(dur)
    add_sine(
        buf,
        lambda t: 38.0 + 120.0 * math.exp(-t / 0.05),
        lambda t: math.exp(-t / 0.34),
        drive=1.3,
    )
    add_sine(
        buf,
        lambda t: 74.0 + 60.0 * math.exp(-t / 0.04),
        lambda t: 0.34 * math.exp(-t / 0.16),
    )
    # The crack on top — brief, and well above the sub so the two stay legible.
    add_noise_svf(
        buf,
        lambda t: 0.62 * math.exp(-t / 0.018),
        lambda t: 2400.0,
        q=0.9,
        mode='high',
    )
    # Tail: noise sinking through the mids, which is what makes it read as a
    # room rather than a click.
    add_noise_svf(
        buf,
        lambda t: 0.20 * math.exp(-t / 0.30),
        lambda t: 900.0 - 620.0 * min(t / 0.7, 1.0),
        q=0.8,
        mode='band',
        t0=0.02,
    )
    return fade_edges(buf, 0.0004, 0.10)


def main():
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    out = sys.argv[1]
    write_wav(f"{out}/clap.wav", make_clap())
    write_wav(f"{out}/impact.wav", make_impact(), peak=0.92)
    write_wav(f"{out}/synth_808.wav", make_808())
    write_wav(f"{out}/synth_riser.wav", make_riser())
    write_wav(f"{out}/synth_whoosh.wav", make_whoosh())
    write_wav(f"{out}/synth_noise.wav", make_noise_burst())
    write_wav(f"{out}/synth_tick.wav", make_tick())
    write_wav(f"{out}/synth_sweep.wav", make_sweep())
    write_wav(f"{out}/synth_subdrop.wav", make_subdrop(), peak=0.92)
    write_wav(f"{out}/synth_reverse.wav", make_reverse())
    write_wav(f"{out}/synth_laser.wav", make_laser(), peak=0.8)
    write_wav(f"{out}/synth_stab.wav", make_stab())
    write_wav(f"{out}/synth_tapestop.wav", make_tapestop(), peak=0.82)
    write_wav(f"{out}/synth_boom.wav", make_boom(), peak=0.92)


if __name__ == '__main__':
    main()
