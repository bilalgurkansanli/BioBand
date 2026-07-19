"""Synthesize a sub-thump layer for the kick (mono 44.1 kHz WAV, ~1.1 s).

Decaying sine that glides 88 -> 42 Hz with soft tanh drive for warmth.
Mixed under assets/samples/drums/kick.mp3 (see assets/samples/drums/README.md).
Pure stdlib. Deterministic.
"""
import math
import struct
import sys
import wave

SR = 44100
DUR = 1.1
N = int(SR * DUR)

F_START = 88.0
F_END = 42.0
GLIDE = 0.25       # seconds of exponential pitch glide
TAU = 0.28         # amplitude decay
ATTACK = 0.003

out = []
phase = 0.0
for i in range(N):
    t = i / SR
    if t < GLIDE:
        f = F_START * (F_END / F_START) ** (t / GLIDE)
    else:
        f = F_END
    phase += 2.0 * math.pi * f / SR
    env = math.exp(-t / TAU)
    if t < ATTACK:
        env *= t / ATTACK
    s = math.tanh(1.6 * math.sin(phase)) * env
    out.append(s)

# gentle fade at the very end
fade_n = int(SR * 0.08)
for i in range(fade_n):
    out[N - fade_n + i] *= 1.0 - i / fade_n

peak = max(abs(s) for s in out)
gain = 0.9 / peak
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
print(f"wrote {path}", file=sys.stderr)
