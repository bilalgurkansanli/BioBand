"""Synthesize a crash cymbal one-shot (mono 44.1 kHz WAV, ~3.5 s).

Layers:
  A) strike transient  - high-passed noise burst, ~25 ms decay
  B) metallic partials - ~56 inharmonic sines (stretched series, random detune),
                         per-partial exponential decay (highs die faster)
  C) noise wash        - band-passed noise, fast attack + short bloom, ~1 s tau

Pure stdlib (no numpy). Deterministic via fixed seed.
"""
import math
import random
import struct
import sys
import wave

SR = 44100
DUR = 2.4
N = int(SR * DUR)

rng = random.Random(20260718)

out = [0.0] * N

# ---------- A) strike transient ----------
# one-pole highpass on white noise, tau 25 ms
hp_prev_x = 0.0
hp_prev_y = 0.0
hp_a = math.exp(-2.0 * math.pi * 2400.0 / SR)  # ~2.4 kHz
tau_strike = 0.025
n_strike = int(SR * 0.12)
for i in range(n_strike):
    x = rng.uniform(-1.0, 1.0)
    y = hp_a * (hp_prev_y + x - hp_prev_x)
    hp_prev_x, hp_prev_y = x, y
    env = math.exp(-i / (SR * tau_strike))
    out[i] += 0.9 * y * env

# ---------- B) metallic partials ----------
def make_partial(f):
    # band emphasis: bright crash sizzle lives ~4-10.5 kHz
    band = 1.35 if 4000.0 <= f <= 10500.0 else 1.0
    amp = rng.uniform(0.4, 1.0) * band
    # highs decay faster: tau from ~1.0 s (low) down to ~0.35 s (high)
    tau = 1.0 * (1000.0 / max(f, 500.0)) ** 0.28
    tau = max(0.35, min(1.0, tau * rng.uniform(0.85, 1.15)))
    phase = rng.uniform(0.0, 2.0 * math.pi)
    return (2.0 * math.pi * f / SR, amp, 1.0 / (SR * tau), phase)

partials = []
# dense inharmonic field: log-uniform 350 Hz - 11.5 kHz ...
for _ in range(70):
    f = math.exp(rng.uniform(math.log(350.0), math.log(11500.0)))
    partials.append(make_partial(f))
# ... plus extra density in the 4-10.5 kHz sizzle band
for _ in range(40):
    f = rng.uniform(4000.0, 10500.0)
    partials.append(make_partial(f))
# detuned twins on a third of them for beating/shimmer
for w, amp, decay, _ in partials[::3]:
    f2 = (w * SR / (2.0 * math.pi)) * (1.0 + rng.uniform(0.001, 0.004))
    partials.append((2.0 * math.pi * f2 / SR, amp * 0.7,
                     decay * rng.uniform(1.0, 1.25),
                     rng.uniform(0.0, 2.0 * math.pi)))

print(f"partials: {len(partials)}", file=sys.stderr)

attack_n = int(SR * 0.004)
norm = 1.0 / math.sqrt(len(partials))
for w, amp, decay, phase in partials:
    a = amp * norm * 1.9
    for i in range(N):
        env = math.exp(-i * decay)
        if env < 1e-4:
            break
        s = a * env * math.sin(phase + w * i)
        if i < attack_n:
            s *= i / attack_n
        out[i] += s

# ---------- C) noise wash ----------
# bandpass ~4.2-11 kHz via one-pole HP + one-pole LP
lp_y = 0.0
lp_a = 1.0 - math.exp(-2.0 * math.pi * 11000.0 / SR)
hp2_prev_x = 0.0
hp2_prev_y = 0.0
hp2_a = math.exp(-2.0 * math.pi * 4200.0 / SR)
tau_wash = 0.55
bloom_peak = 0.12  # wash swells for ~120 ms then decays (crash "bloom")
for i in range(N):
    x = rng.uniform(-1.0, 1.0)
    lp_y += lp_a * (x - lp_y)
    y = hp2_a * (hp2_prev_y + lp_y - hp2_prev_x)
    hp2_prev_x, hp2_prev_y = lp_y, y
    t = i / SR
    env = math.exp(-t / tau_wash)
    bloom = min(1.0, t / bloom_peak)
    out[i] += 0.55 * y * env * (0.35 + 0.65 * bloom)

# ---------- glue: soft clip, fade tail, normalize ----------
for i in range(N):
    out[i] = math.tanh(out[i] * 0.8)

fade_n = int(SR * 0.18)
for i in range(fade_n):
    j = N - fade_n + i
    out[j] *= 1.0 - (i / fade_n)

peak = max(abs(s) for s in out)
gain = 0.89 / peak
frames = b''.join(
    struct.pack('<h', max(-32767, min(32767, int(s * gain * 32767))))
    for s in out
)

path = sys.argv[1]
with wave.open(path, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(frames)
print(f"wrote {path} peak={peak:.3f}", file=sys.stderr)
