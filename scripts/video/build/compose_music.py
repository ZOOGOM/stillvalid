#!/usr/bin/env python3
"""StillValid T2 (172 s) background music and narration mix.

Every sound here is computed from sines and seeded noise. No samples, no
downloaded audio. The motif and chord plan are written for this film.
Key: D major / B minor, 84 BPM. Deterministic (fixed seed).

Usage: compose_music.py [compose|mix|all] [work_dir]
  work_dir holds intermediate stems for verification.
"""
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
SR = 48000
DUR = 172.0
N = int(round(SR * DUR))
PAD_SR = 16000
PN = int(round(PAD_SR * DUR))
BEAT = 60.0 / 84.0
BAR2 = 8 * BEAT
SEED = 20261105
TWO_PI = 2 * np.pi

PC = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def midi(note):
    if not isinstance(note, str):
        return int(note)
    m = re.fullmatch(r"([A-G]#?)(\d)", note)
    return PC[m[1]] + 12 * (int(m[2]) + 1)


def hz(note):
    return 440.0 * 2 ** ((midi(note) - 69) / 12)


def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


# (start, voicing, level, brightness, crossfade into this chord)
CHORDS = [
    # 0-12 descent: open Dadd9, the ending answers this voicing
    (0.00, ["D2", "A2", "D3", "A3", "E4"], 0.95, 0.70, 0.0),
    (6.00, ["G1", "G2", "D3", "B3", "E4"], 0.95, 0.72, 2.0),
    (9.00, ["A1", "A2", "E3", "D4", "E4"], 0.95, 0.78, 2.0),
    # 12-24 cafe and setup
    (12.00, ["D2", "A2", "F#3", "A3", "D4"], 0.92, 0.85, 1.4),
    (15.00, ["B1", "F#2", "A3", "D4", "F#4"], 0.90, 0.85, 1.6),
    (18.00, ["G2", "D3", "B3", "D4", "F#4"], 0.90, 0.85, 1.6),
    (21.00, ["A1", "E2", "A3", "C#4", "E4"], 0.90, 0.85, 1.6),
    # 24-44 upload and reading
    (24.00, ["D2", "A2", "F#3", "A3", "D4", "A4"], 0.90, 0.88, 1.6),
    (24.00 + BAR2, ["B1", "F#2", "A3", "D4", "F#4", "A4"], 0.90, 0.88, 1.6),
    (24.00 + 2 * BAR2, ["G1", "G2", "D3", "B3", "D4", "A4"], 0.90, 0.88, 1.6),
    (24.00 + 3 * BAR2, ["A1", "E2", "A3", "D4", "E4", "A4"], 0.90, 0.90, 1.6),
    # 44-62 review, suspended harmony
    (44.00, ["E2", "B2", "A3", "B3", "E4"], 0.92, 0.92, 1.6),
    (49.00, ["G2", "D3", "G3", "A3", "D4"], 0.92, 0.92, 1.8),
    (53.63, ["F#1", "F#2", "C#3", "B3", "C#4", "F#4"], 0.96, 0.98, 0.5),
    (58.00, ["A1", "A2", "E3", "D4", "E4", "A4"], 0.92, 0.95, 1.6),
    # 62-80 official URL and checks, quietly building
    (62.00, ["B1", "F#2", "A3", "D4", "F#4"], 0.92, 0.98, 1.6),
    (66.00, ["G1", "G2", "D3", "B3", "F#4"], 0.94, 1.00, 1.6),
    (70.00, ["E2", "B2", "G3", "D4", "E4"], 0.96, 1.02, 1.2),
    (72.00, ["G1", "D3", "B3", "D4", "A4", "B4"], 1.00, 1.08, 1.0),
    (72.00 + 4 * BEAT, ["A1", "E3", "A3", "D4", "E4", "A4"], 1.02, 1.14, 1.0),
    (72.00 + 8 * BEAT, ["A1", "E3", "A3", "C#4", "E4", "A4"], 1.04, 1.20, 1.0),
    # 80 resolution
    (80.00, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], 1.05, 1.15, 0.7),
    # 84-124 evidence cards, steady two-bar changes
    (84.00, ["D2", "A2", "F#3", "A3", "D4", "A4"], 0.92, 0.92, 1.6),
    (84.00 + BAR2, ["C#2", "A2", "E3", "A3", "C#4", "E4"], 0.92, 0.92, 1.6),
    (84.00 + 2 * BAR2, ["B1", "F#2", "D3", "A3", "D4", "F#4"], 0.92, 0.92, 1.6),
    (84.00 + 3 * BAR2, ["G1", "G2", "D3", "B3", "D4", "F#4"], 0.92, 0.92, 1.6),
    (84.00 + 4 * BAR2, ["F#2", "A2", "D3", "A3", "D4", "F#4"], 0.92, 0.92, 1.6),
    (84.00 + 5 * BAR2, ["G1", "G2", "D3", "B3", "D4", "G4"], 0.90, 0.88, 1.6),
    (84.00 + 6 * BAR2, ["A1", "E2", "A3", "D4", "E4"], 0.86, 0.82, 1.8),
    # 124-134 synthetic example, minor and restrained
    (124.00, ["B1", "F#2", "B3", "D4", "F#4"], 0.82, 0.65, 1.2),
    (127.50, ["E2", "B2", "G3", "D4"], 0.80, 0.65, 1.6),
    (131.00, ["F#2", "C#3", "A3", "C#4", "E4"], 0.80, 0.68, 1.6),
    # 134-142 language switch
    (134.30, ["G1", "G2", "D3", "B3", "F#4"], 0.86, 0.90, 0.8),
    (137.09, ["F#2", "A2", "D3", "A3", "F#4"], 0.86, 0.92, 0.8),
    (140.09, ["A1", "E2", "A3", "C#4", "E4"], 0.86, 0.95, 0.8),
    # 142-154 copy and delete, calm
    (142.00, ["D2", "A2", "F#3", "A3", "D4"], 0.78, 0.66, 1.6),
    (146.00, ["B1", "F#2", "A3", "D4", "F#4"], 0.76, 0.66, 2.0),
    (150.00, ["G1", "G2", "D3", "B3", "F#4"], 0.78, 0.68, 2.0),
    (152.40, ["A1", "E2", "A3", "D4", "E4"], 0.82, 0.74, 1.6),
    # 154-172 back to Earth: widening, then the opening voicing with its third
    (154.00, ["G1", "G2", "D3", "B3", "E4", "A4", "D5"], 0.96, 0.85, 1.6),
    (158.00, ["A1", "A2", "E3", "C#4", "A4", "E5"], 0.98, 0.92, 2.0),
    (161.00, ["D2", "A2", "D3", "A3", "E4", "F#4", "A4", "D5"], 1.08, 0.98, 1.6),
]
PAD_END = 170.0
PAD_END_FADE = 4.0

MOTIF_SHORT = [(0, "D5"), (1, "A4"), (1.5, "E5"), (2, "F#5")]
MOTIF_FULL = MOTIF_SHORT + [(3.5, "E5"), (4, "D5")]
MOTIF_MINOR = [(0, "B4"), (1, "F#4"), (1.5, "C#5"), (2, "D5")]
ACCENTS = [1.0, 0.82, 0.82, 1.0, 0.8, 0.92]


def chord_at(t):
    cur = CHORDS[0]
    for c in CHORDS:
        if c[0] <= t + 1e-6:
            cur = c
    return cur


def bass_in_range(t, lo_hz, hi_hz):
    m = midi(chord_at(t)[1][0])
    while 440.0 * 2 ** ((m - 69) / 12) < lo_hz:
        m += 12
    while 440.0 * 2 ** ((m - 69) / 12) >= hi_hz:
        m -= 12
    return m


class Renderer:
    def __init__(self):
        self.rng = np.random.default_rng(SEED)
        self.phase = self.rng.uniform(0, TWO_PI, (128, 3, 8))
        self.lfo_phase = self.rng.uniform(0, TWO_PI, (128, 3))
        self.dry = np.zeros((2, N), dtype=np.float32)
        self.send = np.zeros((2, N), dtype=np.float32)
        self.pad = np.zeros((2, PN), dtype=np.float32)
        self.sub = np.zeros(PN, dtype=np.float32)

    # ---- sustained layers, rendered at 16 kHz with absolute-time phase so a
    # note shared by neighbouring chords crossfades without any level dip ----
    def pad_chord(self, t0, t1, notes, level, bright, fin, fout):
        s = int(max(0.0, t0 - fin / 2) * PAD_SR)
        e = int(min(DUR, t1 + fout / 2) * PAD_SR)
        t = np.arange(s, e) / PAD_SR
        env = np.ones(len(t))
        if fin > 0:
            env *= np.sin(np.clip((t - (t0 - fin / 2)) / fin, 0, 1) * np.pi / 2) ** 2
        env *= np.cos(np.clip((t - (t1 - fout / 2)) / fout, 0, 1) * np.pi / 2) ** 2
        base = np.array([1.0, 0.42, 0.22, 0.12, 0.07, 0.04])
        amps = base ** (1.0 / bright)
        scale = 0.22 * level / np.sqrt(len(notes))
        for name in notes:
            m = midi(name)
            f = hz(name)
            w = (f / 110.0) ** -0.30
            for v, (cents, vp, rate) in enumerate(((-6.0, -0.6, 0.07), (0.0, 0.0, 0.11), (6.0, 0.6, 0.17))):
                fv = f * 2 ** (cents / 1200)
                y = np.zeros(len(t))
                for k, a in enumerate(amps):
                    fk = fv * (k + 1)
                    if fk > 7200:
                        break
                    y += a * np.sin(TWO_PI * fk * t + self.phase[m, v, k])
                y *= 1 + 0.15 * np.sin(TWO_PI * rate * t + self.lfo_phase[m, v])
                gl, gr = pan_gains(vp)
                y = y * env * w * scale
                self.pad[0, s:e] += (gl * y).astype(np.float32)
                self.pad[1, s:e] += (gr * y).astype(np.float32)

    def sub_chord(self, t0, t1, level, fin, fout):
        s = int(max(0.0, t0 - fin / 2) * PAD_SR)
        e = int(min(DUR, t1 + fout / 2) * PAD_SR)
        t = np.arange(s, e) / PAD_SR
        env = np.ones(len(t))
        if fin > 0:
            env *= np.sin(np.clip((t - (t0 - fin / 2)) / fin, 0, 1) * np.pi / 2) ** 2
        env *= np.cos(np.clip((t - (t1 - fout / 2)) / fout, 0, 1) * np.pi / 2) ** 2
        m = bass_in_range(t0 + 0.01, 41.0, 82.0)
        f = 440.0 * 2 ** ((m - 69) / 12)
        self.sub[s:e] += (level * env * np.sin(TWO_PI * f * t + self.phase[m, 0, 0])).astype(np.float32)

    # ---- notes ----
    def place(self, y, t0, pan, send):
        s = int(round(t0 * SR))
        e = min(N, s + len(y))
        y = y[: e - s]
        gl, gr = pan_gains(pan)
        self.dry[0, s:e] += (gl * y).astype(np.float32)
        self.dry[1, s:e] += (gr * y).astype(np.float32)
        if send > 0:
            self.send[0, s:e] += (send * gl * y).astype(np.float32)
            self.send[1, s:e] += (send * gr * y).astype(np.float32)

    @staticmethod
    def tail_fade(y, seconds=0.05):
        n = min(int(seconds * SR), len(y))
        y[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2
        return y

    def pluck(self, t0, note, vel, pan=0.0, tau=1.5, bright=1.0, send=0.38, atk=0.005):
        f = hz(note)
        n = int(min(tau * 4.5, DUR - t0) * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        m = midi(note)
        for k in range(1, 9):
            fk = f * k * np.sqrt(1 + 0.00035 * k * k)
            if fk > 15000:
                break
            amp = 1.0 / k ** (2.0 / bright)
            tk = tau / (1 + 0.45 * (k - 1))
            d = np.exp(-t / tk)
            y += amp * d * (np.sin(TWO_PI * fk * t + self.phase[m, 0, k - 1])
                            + 0.6 * np.sin(TWO_PI * fk * 1.0009 * t + self.phase[m, 1, k - 1]))
        y *= (1 - np.exp(-t / atk)) * vel * 0.62
        self.place(self.tail_fade(y), t0, pan, send)

    def bell(self, t0, note, vel, pan=0.0, send=0.55):
        f = hz(note)
        ratios = (1.0, 2.0, 3.01, 4.16, 5.43)
        amps = (1.0, 0.45, 0.22, 0.10, 0.05)
        taus = (1.9, 1.2, 0.8, 0.5, 0.35)
        n = int(min(7.0, DUR - t0) * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        m = midi(note)
        for i, (r, a, tk) in enumerate(zip(ratios, amps, taus)):
            if f * r > 15000:
                break
            y += a * np.exp(-t / tk) * np.sin(TWO_PI * f * r * t + self.phase[m, 2, i])
        y *= (1 - np.exp(-t / 0.003)) * vel
        self.place(self.tail_fade(y), t0, pan, send)

    def pulse(self, t0, m, vel, pan=0.0, tau=0.30):
        f = 440.0 * 2 ** ((m - 69) / 12)
        n = int(min(tau * 5, DUR - t0) * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for k, a in enumerate((1.0, 0.32, 0.12, 0.05)):
            y += a * np.exp(-t / (tau / (1 + 0.5 * k))) * np.sin(TWO_PI * f * (k + 1) * t + self.phase[m, 1, k])
        y *= (1 - np.exp(-t / 0.012)) * vel
        self.place(self.tail_fade(y), t0, pan, 0.14)

    def swell(self, t0, note, vel, pan=0.0, atk=1.4, rel=3.2, send=0.6):
        f = hz(note)
        n = int(min(atk + rel * 3.5, DUR - t0) * SR)
        t = np.arange(n) / SR
        env = np.where(t < atk, np.sin(np.pi / 2 * np.clip(t / atk, 0, 1)) ** 2, np.exp(-(t - atk) / rel))
        y = np.sin(TWO_PI * f * t) + 0.25 * np.sin(TWO_PI * 2 * f * t) + 0.08 * np.sin(TWO_PI * 3 * f * t)
        self.place(self.tail_fade(y * env * vel), t0, pan, send)

    def motif(self, t0, notes, vel, step=BEAT, octave_down=0.0, **kw):
        for i, (b, name) in enumerate(notes):
            when = t0 + b * step
            a = ACCENTS[i % len(ACCENTS)]
            self.pluck(when, name, vel * a, pan=0.12 if i % 2 else -0.08, **kw)
            if octave_down > 0:
                self.pluck(when, midi(name) - 12, octave_down * a, pan=-0.05, send=0.3, tau=1.9)


def smooth_band(freqs, lo, hi, skirt=1.5):
    """Smooth-edged log-frequency band mask (zero phase)."""
    f = np.maximum(freqs, 1.0)
    rise = np.clip(np.log(f / (lo / skirt)) / np.log(skirt), 0, 1)
    fall = np.clip(np.log((hi * skirt) / f) / np.log(skirt), 0, 1)
    return np.sin(rise * np.pi / 2) ** 2 * np.sin(fall * np.pi / 2) ** 2


def band_noise(rng, lo, hi):
    x = rng.standard_normal(N)
    X = np.fft.rfft(x)
    X *= smooth_band(np.fft.rfftfreq(N, 1 / SR), lo, hi)
    return np.fft.irfft(X, N)


def upsample3(x):
    X = np.fft.rfft(x)
    Y = np.zeros(N // 2 + 1, dtype=complex)
    Y[: len(X)] = X
    return np.fft.irfft(Y, N) * 3.0


def make_reverb(send, rng):
    """Stereo convolution with seeded decaying noise (RT60 about 3.5 s)."""
    length = int(3.5 * SR)
    t = np.arange(length) / SR
    M = 8640000  # smooth composite, longer than N + IR
    freqs = np.fft.rfftfreq(M, 1 / SR)
    shape = smooth_band(freqs, 180.0, 6500.0, skirt=1.8)
    out = []
    for ch in range(2):
        h = rng.standard_normal(length) * np.exp(-t / 0.5)
        h *= 1 - np.exp(-t / 0.015)
        h = np.r_[np.zeros(int(0.03 * SR)), h]
        H = np.fft.rfft(h, M) * shape
        h_time = np.fft.irfft(H, M)
        H /= np.sqrt(np.sum(h_time ** 2))
        out.append(np.fft.irfft(np.fft.rfft(send[ch].astype(np.float64), M) * H, M)[:N])
    return np.stack(out)


def write_wav24(path, x):
    s = np.round(np.clip(x, -1.0, 1.0) * 8388607.0).astype("<i4")
    raw = np.frombuffer(s.T.ravel().tobytes(), dtype=np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw)


def read_audio(path):
    out = subprocess.run(
        [FFMPEG, "-v", "error", "-threads", "2", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def compose():
    r = Renderer()

    # sustained harmony
    for i, (t0, notes, level, bright, fin) in enumerate(CHORDS):
        if i + 1 < len(CHORDS):
            t1, fout = CHORDS[i + 1][0], CHORDS[i + 1][4]
        else:
            t1, fout = PAD_END, PAD_END_FADE
        r.pad_chord(t0, t1, notes, level, bright, fin, fout)
        sub = 0.13 * level
        if t0 < 12 or t0 >= 154:
            sub *= 1.35
        elif 124 <= t0 < 134:
            sub *= 0.6
        r.sub_chord(t0, t1, sub, fin, fout)

    # 0-12 slow rising figure, answered at 154-161
    for t0, note, vel, pan in ((1.0, "D3", 0.14, -0.2), (3.0, "A3", 0.12, 0.2), (5.0, "D4", 0.11, -0.3),
                               (7.0, "E4", 0.10, 0.3), (9.0, "F#4", 0.09, -0.2), (10.5, "A4", 0.09, 0.2),
                               (155.0, "D4", 0.10, -0.3), (157.0, "A4", 0.09, 0.3), (159.0, "E5", 0.08, -0.2)):
        r.swell(t0, note, vel, pan)

    # motif entries: (start, form, velocity, keyword overrides)
    r.motif(13.20, MOTIF_SHORT, 0.20)
    r.motif(18.60, MOTIF_SHORT, 0.18)
    r.motif(24.00 + 2 * BAR2, MOTIF_SHORT, 0.14)
    r.motif(49.00, MOTIF_SHORT[:3], 0.12)
    r.motif(58.00, MOTIF_SHORT[:3], 0.13)
    r.motif(72.00, MOTIF_SHORT, 0.24)
    r.motif(72.00 + 4 * BEAT, MOTIF_SHORT[:3] + [(2, "A5")], 0.26)
    r.motif(72.00 + 8 * BEAT, [(0, "E5"), (1, "C#5"), (1.5, "E5"), (2, "A5")], 0.28)
    r.motif(80.00, MOTIF_FULL, 0.36, octave_down=0.17, tau=2.0)
    r.motif(96.00, MOTIF_SHORT, 0.13)
    r.motif(118.30, MOTIF_SHORT[:3] + [(2, "E5")], 0.12)
    r.motif(124.80, MOTIF_MINOR, 0.15, bright=0.8)
    r.motif(129.00, [(0, "B4"), (1, "G4"), (1.5, "D5"), (2, "E5")], 0.11, bright=0.8)
    r.motif(144.00, MOTIF_SHORT, 0.10, step=2 * BEAT, tau=2.0)
    r.motif(161.00, MOTIF_FULL, 0.32, octave_down=0.16, tau=2.4)

    # accents placed on the cuts
    for t0, note, vel, pan in ((16.00, "A5", 0.075, 0.2),
                               (53.63, "B5", 0.11, -0.15), (53.63, "F#5", 0.08, 0.15),
                               (80.00, "D6", 0.11, 0.0), (80.00, "A5", 0.08, 0.2),
                               (88.00, "D6", 0.085, -0.25), (92.50, "A5", 0.085, 0.25),
                               (98.50, "F#6", 0.07, -0.2), (104.00, "B5", 0.085, 0.2),
                               (110.00, "A5", 0.085, -0.2),
                               (134.30, "D6", 0.12, -0.2), (134.30, "A5", 0.07, 0.2),
                               (137.09, "F#6", 0.10, 0.25), (137.09, "A5", 0.07, -0.2),
                               (140.09, "E6", 0.11, -0.2), (140.09, "C#6", 0.08, 0.2),
                               (161.00, "D6", 0.12, 0.0), (161.00, "A5", 0.09, -0.2),
                               (166.00, "A5", 0.055, 0.25), (168.00, "D6", 0.035, -0.25)):
        r.bell(t0, note, vel, pan)
    r.pluck(53.63, "F#4", 0.20, pan=0.0, tau=1.8)

    # 134-142 arpeggio, re-locked to each language change
    arp = {134.30: ["G3", "B3", "D4", "F#4", "A4", "D5"],
           137.09: ["F#3", "A3", "D4", "F#4", "A4", "D5"],
           140.09: ["A3", "C#4", "E4", "A4", "C#5", "E5"]}
    pattern = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]
    ends = {134.30: 137.09, 137.09: 140.09, 140.09: 142.10}
    for start, notes in arp.items():
        k = 0
        t = start
        while t < ends[start] - 0.05:
            i = pattern[k % len(pattern)]
            r.pluck(t, notes[i], 0.10 + 0.012 * i, pan=-0.35 if k % 2 else 0.35, tau=0.8, send=0.42)
            k += 1
            t += BEAT / 2

    # pulse layer
    def pulses(t0, t1, step, v0, v1, fifths=False, downbeat_every=2):
        k = 0
        t = t0
        while t < t1 - 1e-6:
            frac = (t - t0) / max(t1 - t0, 1e-6)
            v = (v0 + (v1 - v0) * frac) * (1.0 if k % downbeat_every == 0 else 0.68)
            m = bass_in_range(t + 0.01, 110.0, 220.0)
            if fifths and k % 4 == 2:
                m += 7
            r.pulse(t, m, v, pan=0.12 if k % 2 else -0.12)
            k += 1
            t += step

    pulses(24.0, 44.0, BEAT, 0.075, 0.095)
    pulses(44.0, 62.0, BEAT, 0.095, 0.10, fifths=True)
    pulses(62.0, 72.0, BEAT / 2, 0.10, 0.125, fifths=True, downbeat_every=4)
    pulses(72.0, 80.0, BEAT / 2, 0.13, 0.175, fifths=True, downbeat_every=4)
    pulses(84.0, 116.0, BEAT, 0.09, 0.09, downbeat_every=2)
    pulses(116.0, 124.0, 2 * BEAT, 0.075, 0.045)
    pulses(124.0 + 2 * BEAT, 134.0, 4 * BEAT, 0.05, 0.045)
    pulses(142.0, 154.0, 2 * BEAT, 0.05, 0.04)

    # air, plus a soft pass-through-the-window swell near 12 s
    noise_rng = np.random.default_rng(SEED + 1)
    tt = np.arange(N) / SR
    air_env = np.interp(tt, [0, 2, 10, 12, 13, 24, 80, 154, 165, 172],
                        [0, 0.5, 1.0, 1.4, 0.35, 0.20, 0.25, 0.25, 0.55, 0]) * 0.012
    whoosh_lo = np.exp(-(((tt - 11.3) / 0.9) ** 2)) * 0.016
    whoosh_hi = np.exp(-(((tt - 12.1) / 0.7) ** 2)) * 0.012
    for ch in range(2):
        y = air_env * band_noise(noise_rng, 5000.0, 13000.0)
        y += whoosh_lo * band_noise(noise_rng, 250.0, 1400.0)
        y += whoosh_hi * band_noise(noise_rng, 1500.0, 7000.0)
        r.dry[ch] += y.astype(np.float32)
        r.send[ch] += (0.5 * y).astype(np.float32)
    del tt, air_env, whoosh_lo, whoosh_hi

    # bring the 16 kHz layers up to 48 kHz
    pad = np.stack([upsample3(r.pad[0].astype(np.float64)), upsample3(r.pad[1].astype(np.float64))])
    sub = upsample3(r.sub.astype(np.float64))
    wet = make_reverb(r.send.astype(np.float64) + 0.32 * pad.astype(np.float32),
                      np.random.default_rng(SEED + 2))
    mix = r.dry.astype(np.float64) + pad + wet + sub

    # section dynamics
    tt = np.arange(N) / SR
    env_db = np.interp(tt, [0, 12, 24, 44, 53.63, 62, 72, 80, 84, 116, 124, 134, 142, 154, 161, 169, 172],
                       [-4, -2, -3, -2.5, -1.5, -1.5, 0, 1, -1, -1, -6, -3, -5, -2, 0, -3, -6])
    env = 10 ** (env_db / 20)
    env *= np.sin(np.clip(tt / 3.0, 0, 1) * np.pi / 2) ** 2
    env *= np.cos(np.clip((tt - 169.0) / 3.0, 0, 1) * np.pi / 2) ** 2
    mix *= env

    # remove DC and rumble below 30 Hz, zero-phase
    freqs = np.fft.rfftfreq(N, 1 / SR)
    hp = np.clip((freqs - 20.0) / 10.0, 0, 1)
    for ch in range(2):
        mix[ch] = np.fft.irfft(np.fft.rfft(mix[ch]) * hp, N)
    mix[:, :48] *= np.linspace(0, 1, 48)
    mix[:, -48:] *= np.linspace(1, 0, 48)
    peak = np.max(np.abs(mix))
    mix *= 10 ** (-3 / 20) / peak
    write_wav24(os.path.join(HERE, "music.wav"), mix)
    print(f"music.wav written, pre-normalise peak {peak:.3f}")


# ---------------------------------------------------------------- mixing ----
def kweight(x):
    """ITU-R BS.1770 K-weighting at 48 kHz, applied in the frequency domain."""
    b1 = (1.53512485958697, -2.69169618940638, 1.19839281085285)
    a1 = (1.0, -1.69065929318241, 0.73248077421585)
    b2 = (1.0, -2.0, 1.0)
    a2 = (1.0, -1.99004745483398, 0.99007225036621)
    n = x.shape[-1]
    z = np.exp(-2j * np.pi * np.arange(n // 2 + 1) / n)
    h = ((b1[0] + b1[1] * z + b1[2] * z * z) / (a1[0] + a1[1] * z + a1[2] * z * z)
         * (b2[0] + b2[1] * z + b2[2] * z * z) / (a2[0] + a2[1] * z + a2[2] * z * z))
    return np.stack([np.fft.irfft(np.fft.rfft(c) * h, n) for c in x])


def integrated_lufs(k):
    p = (k ** 2).sum(0)
    c = np.r_[0.0, np.cumsum(p)]
    win, hop = 19200, 4800
    idx = np.arange(0, len(p) - win, hop)
    blocks = (c[idx + win] - c[idx]) / win
    lk = -0.691 + 10 * np.log10(blocks + 1e-15)
    blocks = blocks[lk > -70]
    rel = -0.691 + 10 * np.log10(blocks.mean()) - 10
    lk = -0.691 + 10 * np.log10(blocks + 1e-15)
    return -0.691 + 10 * np.log10(blocks[lk > rel].mean())


def seg_lufs(k, mask):
    return -0.691 + 10 * np.log10((k[:, mask] ** 2).sum(0).mean() + 1e-15)


def runs_of(g):
    d = np.diff(np.r_[0, g.astype(np.int8), 0])
    return np.where(d == 1)[0], np.where(d == -1)[0]


def speech_gate(raw):
    """Speech detection from mix_raw itself: 10 ms frames, 150 Hz-4 kHz band."""
    mono = raw.mean(0)
    X = np.fft.rfft(mono) * smooth_band(np.fft.rfftfreq(N, 1 / SR), 150.0, 4000.0)
    band = np.fft.irfft(X, N)
    hop = 480
    frames = N // hop
    e = (band[: frames * hop].reshape(-1, hop) ** 2).mean(1)
    e = np.convolve(e, np.ones(3) / 3, "same")
    db = 10 * np.log10(e + 1e-12)
    floor = np.percentile(db, 10)
    top = np.percentile(db, 97)
    thr = max(floor + 14.0, top - 28.0)
    g = db > thr
    on, off = runs_of(g)
    for a, b in zip(on, off):
        if b - a < 18:  # under 180 ms: ticks, not words
            g[a:b] = False
    on, off = runs_of(g)
    for a, b in zip(off[:-1], on[1:]):
        if b - a <= 30:  # bridge gaps up to 300 ms between words
            g[a:b] = True
    return g, floor, top, thr


def duck_db(gate, depth=-12.0, att=0.08, rel=0.60, lead=0.04):
    dt = 0.01
    shift = int(round(lead / dt))
    g = np.r_[gate[shift:], np.zeros(shift, dtype=bool)]
    a_att, a_rel = np.exp(-dt / att), np.exp(-dt / rel)
    y = 0.0
    out = np.zeros(len(g))
    for i, on in enumerate(g):
        target = depth if on else 0.0
        a = a_att if target < y else a_rel
        y = a * y + (1 - a) * target
        out[i] = y
    return np.interp(np.arange(N), (np.arange(len(out)) + 0.5) * 480, out)


def limit_to(x, ceiling):
    """Look-ahead peak limiter: only touches frames above the ceiling."""
    frame = 48
    frames = N // frame
    peak = np.abs(x[:, : frames * frame]).max(0).reshape(-1, frame).max(1)
    req = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    if req.min() >= 1.0:
        return x, 0
    w = np.lib.stride_tricks.sliding_window_view(np.r_[np.ones(6), req, np.ones(6)], 13).min(1)
    hann = np.hanning(13)
    hann /= hann.sum()
    smooth = np.convolve(w, hann, "same")
    g = np.interp(np.arange(N), (np.arange(frames) + 0.5) * frame, smooth)
    return x * g, int((req < 1.0).sum())


def loudnorm_json(text):
    return json.loads(text[text.rindex("{"): text.rindex("}") + 1])


def mix(work_dir):
    os.makedirs(work_dir, exist_ok=True)
    raw = read_audio(os.path.join(HERE, "mix_raw.wav"))[:, :N]
    music = read_audio(os.path.join(HERE, "music.wav"))[:, :N]
    assert raw.shape[1] == N and music.shape[1] == N

    gate, floor, top, thr = speech_gate(raw)
    on, off = runs_of(gate)
    print(f"key: floor {floor:.1f} dB, top {top:.1f} dB, threshold {thr:.1f} dB, active {gate.mean() * 100:.1f}%")
    print("speech:", " ".join(f"{a / 100:.2f}-{b / 100:.2f}" for a, b in zip(on, off)))

    duck = duck_db(gate)
    mid_extra = duck / 12.0 * 4.0  # another -4 dB at full duck, 200 Hz-3 kHz
    freqs = np.fft.rfftfreq(N, 1 / SR)
    mask = smooth_band(freqs, 200.0, 3000.0, skirt=1.4)
    ducked = np.zeros_like(music)
    g_all = 10 ** (duck / 20)
    g_mid = 10 ** (mid_extra / 20)
    for ch in range(2):
        band = np.fft.irfft(np.fft.rfft(music[ch]) * mask, N)
        ducked[ch] = (music[ch] - band + band * g_mid) * g_all

    k_raw = kweight(raw)
    k_music = kweight(ducked)
    t = np.arange(N) / SR
    speech_mask = np.interp(np.arange(N), (np.arange(len(gate)) + 0.5) * 480, gate.astype(float)) > 0.5
    window = (t >= 73.0) & (t < 79.0)

    # solve the music gain: final level of the music at 73-79 s = -22 LUFS
    g_db = -8.0
    for _ in range(6):
        g = 10 ** (g_db / 20)
        i_pre = integrated_lufs(k_raw + g * k_music)
        d = -14.0 - i_pre
        g_db += -22.0 - (seg_lufs(g * k_music, window) + d)
    g = 10 ** (g_db / 20)
    i_pre = integrated_lufs(k_raw + g * k_music)
    d = -14.0 - i_pre
    print(f"music gain {g_db:.2f} dB, premix {i_pre:.2f} LUFS, offset to target {d:.2f} dB")

    # two-pass loudnorm; limit to the offset ffmpeg itself measures so pass 2 stays linear
    base = "loudnorm=I=-14:TP=-1.5:LRA=20"
    premix_path = os.path.join(work_dir, "premix.wav")

    def measure(path):
        p = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-threads", "2", "-i", path,
                            "-af", base + ":print_format=json", "-f", "null", "-"],
                           check=True, capture_output=True, text=True)
        return loudnorm_json(p.stderr)

    unlimited = raw + g * ducked
    write_wav24(premix_path, unlimited)
    m = measure(premix_path)
    d = -14.0 - float(m["input_i"])
    ceil_db = -1.9 - d
    for _ in range(3):
        premix, limited = limit_to(unlimited, 10 ** (ceil_db / 20))
        write_wav24(premix_path, premix)
        m = measure(premix_path)
        d = -14.0 - float(m["input_i"])
        over = float(m["input_tp"]) + d
        print(f"limiter ceiling {ceil_db:.2f} dBFS, frames touched {limited}, predicted output TP {over:.2f}")
        if over <= -1.6:
            break
        ceil_db -= over + 1.6 + 0.1
    print("pass 1:", m)
    write_wav24(os.path.join(work_dir, "stem_voice.wav"), raw * 10 ** (d / 20))
    write_wav24(os.path.join(work_dir, "stem_music_ducked.wav"), g * ducked * 10 ** (d / 20))
    print("speech-mask stems (LUFS, ungated):",
          f"voice {seg_lufs(k_raw, speech_mask) + d:.1f},",
          f"music {seg_lufs(g * k_music, speech_mask) + d:.1f}")
    tail = f"aresample={SR},atrim=end_sample={N},apad=whole_len={N}"
    af = (f"{base}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json,{tail}")
    p2 = subprocess.run([FFMPEG, "-y", "-hide_banner", "-nostats", "-threads", "2", "-i", premix_path, "-af", af,
                         "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", os.path.join(HERE, "mix_T2.wav")],
                        check=True, capture_output=True, text=True)
    print("pass 2:", loudnorm_json(p2.stderr))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    work = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("TMPDIR", "/tmp")
    if mode in ("compose", "all"):
        compose()
    if mode in ("mix", "all"):
        mix(work)
