# Original BGM for the thylakoid light-reactions film (49 s), synthesized from scratch with numpy — synced to the story's beats.
# 100 BPM, D major. 0-12 pad · 6 plucks · 12 heartbeat kick · 17.3-19.6 riser · 19.6 impact (AP arrives) ·
# 20-22.4 sparkles (Ca2+) · 23.3 whoosh + groove (fusion) · 27 chord lift (receptors open) · 32-39 breakdown ·
# 39-45 light groove (recycling) · 45-50 final swell and tail.
import numpy as np, wave, sys
SR = 48000; DUR = 49.0; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
BPM = 100; BEAT = 60 / BPM
def t_(n): return np.arange(n) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
def env(n, a, d, s=1.0, r=None):
    e = np.ones(n) * s; A = int(a * SR); D = int(d * SR)
    e[:A] = np.linspace(0, 1, max(A, 1))[:A]
    if r is not None: R_ = int(r * SR); e[-R_:] *= np.linspace(1, 0, R_)
    return e
from scipy.signal import lfilter
def lp(x, fc):  # one-pole lowpass, fc may be array
    if np.isscalar(fc):
        a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
    fc = np.broadcast_to(fc, x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); z = 0.0
    for k in range(len(x)): z = (1 - a[k]) * x[k] + a[k] * z; y[k] = z
    return y
def saw(f, n, ph=0.0): return 2 * ((f * t_(n) + ph) % 1) - 1

# ---- chords (4.8 s each = 2 bars) ----
CH = [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 59], [45, 52, 57, 59, 61]]  # Dmaj9 Bm9 Gmaj7 Asus-ish
SEQ = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 0]
def pad(t0, dur, notes, bright=900, g=0.06):
    n = int(dur * SR); x = np.zeros(n)
    for m in notes:
        for det in (-0.12, 0.0, 0.11): x += saw(hz(m + det / 1.0) * (1 + det * 0.004), n, rng.random())
    x = lp(x, bright) * env(n, 1.2, 0, 1, 1.4); add(x, t0, rng.uniform(-0.3, 0.3), g)
for k, c in enumerate(SEQ):
    t0 = k * 4.8; bright = 700 + (1500 if 23 <= t0 < 44 else 0) + (900 if t0 >= 43 else 0)
    if t0 < DUR - 2.0: pad(t0, min(5.6, DUR - t0), CH[c], bright, 0.05 if t0 < 12 else 0.055)
# sub bass from 12 s
for k, c in enumerate(SEQ):
    t0 = k * 4.8
    if t0 < 12 or t0 >= DUR: continue
    n = int(min(4.8, DUR - t0) * SR); f = hz(CH[c][0] - 12); x = np.sin(2 * np.pi * f * t_(n)) * env(n, 0.05, 0, 1, 0.3)
    add(x, t0, 0, 0.16)

# ---- plucks (arpeggio, 8th notes) ----
def pluck(f, dur=0.5, g=0.12, pan=0):
    n = int(dur * SR); tt = t_(n); x = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 7)
    add(x * env(n, 0.003, 0), 0 if False else 0, 0, 0)  # placeholder (kept for clarity)
    return x * env(n, 0.003, 0)
t = 6.0
while t < 48.5:
    k = int(t // 4.8); c = CH[SEQ[min(k, len(SEQ) - 1)]]; step = int(round((t - 6.0) / (BEAT / 2)))
    m = c[[1, 2, 3, 4, 3, 2][step % 6]] + 12
    dense = 0.6 if (t >= 44.5) else 1.0
    if not (16.0 <= t < 18.6) and rng.random() < dense: add(pluck(hz(m)), t, [-0.5, 0.5][step % 2], 0.07 if t < 23.6 else 0.085)
    t += BEAT / 2

# ---- drums ----
def kick(g=0.5):
    n = int(0.4 * SR); tt = t_(n); f = 48 + 90 * np.exp(-tt * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) * g
def hat(g=0.06, d=0.06):
    n = int(d * 3 * SR); x = rng.standard_normal(n); x = x - lp(x, 6000); return x * np.exp(-t_(n) / d * 3) * g
def clap(g=0.12):
    n = int(0.25 * SR); x = rng.standard_normal(n); x = lp(x, 3500) - lp(x, 900); return x * np.exp(-t_(n) * 18) * g
b = 0; t = 12.0
while t < 47.9:
    beat = int(round((t - 12.0) / BEAT))
    groove = 23.6 <= t < 44.5
    heart = 12 <= t < 16.0
    if heart and beat % 2 == 0: add(kick(0.35), t)
    if groove:
        add(kick(0.55), t)
        if beat % 2 == 1: add(clap(0.16), t, 0.1)
        add(hat(0.05), t + BEAT / 2, 0.4); add(hat(0.03), t + BEAT / 4, -0.4)
    if 44.5 <= t < 47.5 and beat % 2 == 0: add(kick(0.4), t)
    t += BEAT

# ---- riser (AP travelling) and impact (AP arrives), sparkles (Ca2+), whoosh (fusion) ----
n = int((18.4 - 15.8) * SR); tt = t_(n); x = rng.standard_normal(n); fc = 300 + 7000 * (tt / tt[-1]) ** 2
x = (lp(x, fc) - lp(x, fc * 0.4)) * (tt / tt[-1]) ** 1.5 * 0.5
tone = np.sin(2 * np.pi * np.cumsum(hz(62) * 2 ** (2 * (tt / tt[-1]))) / SR) * (tt / tt[-1]) ** 2 * 0.06
add(x + tone, 15.8, 0, 1)
n = int(2.2 * SR); tt = t_(n); boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 8)) / SR) * np.exp(-tt * 2.2) * 0.6
nz = rng.standard_normal(n); nz = lp(nz, 2500) * np.exp(-tt * 6) * 0.25
add(boom + nz, 18.4, 0, 1)
for k in range(26):
    tk = 19.0 + rng.uniform(0, 2.4); m = [74, 78, 81, 85, 86, 90, 93][rng.integers(7)]
    nn = int(0.6 * SR); tt = t_(nn); s = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 9) * env(nn, 0.002, 0)
    add(s, tk, rng.uniform(-0.8, 0.8), 0.045)
n = int(1.6 * SR); tt = t_(n); x = rng.standard_normal(n); fc = 5000 * np.exp(-tt * 2.5) + 200
w = (lp(x, fc) - lp(x, fc * 0.3)) * np.sin(np.pi * np.clip(tt / 1.6, 0, 1)) ** 2 * 0.35
add(w, 22.9, -0.2, 1); add(w, 22.92, 0.2, 0.6)
add(kick(0.75), 23.6)
# chord lift when receptors open (bright stab)
for m in [62, 66, 69, 73, 78]:
    nn = int(1.8 * SR); tt = t_(nn); s = (saw(hz(m), nn) * 0.5 + np.sin(2 * np.pi * hz(m) * tt)) * np.exp(-tt * 2.2)
    add(lp(s, 3000), 32.0, rng.uniform(-0.5, 0.5), 0.035)
# final swell
for m in [50, 57, 62, 66, 69, 73, 76]:
    nn = int(5.0 * SR); tt = t_(nn); s = np.sin(2 * np.pi * hz(m) * tt) * np.sin(np.pi * np.clip(tt / 5.0, 0, 1)) ** 1.5
    add(s, 44.2, rng.uniform(-0.4, 0.4), 0.05)


# ---- thylakoid extras: O2 bubble pops (25 s), NADPH chime (36.8 s), rotor arpeggio while ATP synthase turns (37-44 s) ----
for k in range(5):
    nn = int(0.25 * SR); tt = t_(nn); f = 600 + 900 * np.exp(-tt * 30)
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 22), 25.0 + k * 0.18, rng.uniform(-0.6, 0.6), 0.05)
for m in [81, 85, 88]:
    nn = int(1.4 * SR); tt = t_(nn); add(np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 3.5), 36.8, rng.uniform(-0.4, 0.4), 0.05)
t = 37.0
while t < 44.0:
    k = int((t - 37.0) / (BEAT / 4)); m = [74, 78, 81, 86][k % 4] + (12 if k % 16 >= 8 else 0)
    nn = int(0.18 * SR); tt = t_(nn); s2 = (np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(4 * np.pi * hz(m) * tt)) * np.exp(-tt * 18)
    add(s2, t, np.sin(k * 0.8) * 0.7, 0.04); t += BEAT / 4

# ---- stereo reverb (simple multi-tap feedback delays) ----
def verb(x, mix=0.25, k=1.0):
    y = np.zeros_like(x)
    for d, g in [(0.031, 0.5), (0.047, 0.45), (0.071, 0.4), (0.113, 0.35), (0.167, 0.3), (0.241, 0.25)]:
        D = int(d * k * SR); z = np.zeros_like(x); z[D:] = x[:-D] * g
        for _ in range(3): z[D:] += z[:-D] * 0.35
        y += z
    return x + mix * lp(y, 5000) / 3
L = verb(L); R = verb(R, k=1.13)
out = np.stack([L, R], 1)
F = int(1.8 * SR); out[-F:] *= np.linspace(1, 0, F)[:, None]; out[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
out /= np.abs(out).max() / 0.89
wv = wave.open(sys.argv[1] if len(sys.argv) > 1 else 'bgm_original.wav', 'wb'); wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
wv.writeframes((out * 32767).astype(np.int16).tobytes()); wv.close(); print('ok', out.shape[0] / SR)
