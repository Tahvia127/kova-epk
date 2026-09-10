"""Generates the three preview clips. Python stdlib only.
   These are original synthesised pieces, so there is no licence question.
   Run: python3 tools/synth.py"""
import wave, math, array, os

SR = 22050

def env(i, n, a=0.02, r=0.25):
    """attack / release envelope, 0..1"""
    at, rt = int(n*a), int(n*r)
    if i < at:  return i/at
    if i > n-rt: return max(0.0, (n-i)/rt)
    return 1.0

def voice(freq, n, kind='saw', detune=0.0):
    out = [0.0]*n
    f = freq * (2 ** (detune/1200))
    for i in range(n):
        t = i/SR
        ph = (t*f) % 1.0
        if kind == 'saw':   s = 2*ph - 1
        elif kind == 'sq':  s = 1.0 if ph < 0.5 else -1.0
        elif kind == 'tri': s = 4*abs(ph-0.5)-1
        else:               s = math.sin(2*math.pi*ph)
        out[i] = s
    return out

def lp(sig, cutoff):
    """one-pole low pass, tames the harshness"""
    a = math.exp(-2*math.pi*cutoff/SR)
    y, prev = [0.0]*len(sig), 0.0
    for i, x in enumerate(sig):
        prev = (1-a)*x + a*prev
        y[i] = prev
    return y

def note(midi):  return 440.0 * 2 ** ((midi-69)/12)

def render(name, bars, bpm, chords, lead=None, cutoff=1800, kind='saw'):
    spb = 60.0/bpm
    total = int(SR*spb*4*bars)
    buf = [0.0]*total
    per = total//bars
    for b in range(bars):
        ch = chords[b % len(chords)]
        start = b*per
        for m in ch:
            for det in (-7, 7):
                v = voice(note(m), per, kind, det)
                v = lp(v, cutoff)
                for i in range(per):
                    buf[start+i] += v[i]*env(i, per)*0.10
    if lead:
        step = per//4
        for b in range(bars):
            for j, m in enumerate(lead[(b*4) % len(lead):(b*4) % len(lead)+4]):
                if m is None: continue
                s = b*per + j*step
                if s+step > total: break
                v = lp(voice(note(m), step, 'tri'), 2600)
                for i in range(step):
                    buf[s+i] += v[i]*env(i, step, .01, .5)*0.13
    peak = max(1e-9, max(abs(x) for x in buf))
    data = array.array('h', (int(max(-1, min(1, x/peak*0.86))*32767) for x in buf))
    path = f'assets/audio/{name}.wav'
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())
    return path, os.path.getsize(path), total/SR

if __name__ == '__main__':
    specs = [
      ('nightline', dict(bars=4, bpm=96, chords=[[45,52,60,64],[43,50,58,62],[41,48,57,60],[43,50,58,65]],
                         lead=[76,None,72,74, 71,None,69,67, 69,71,72,None, 74,72,71,69], cutoff=1500)),
      ('halfmoon',  dict(bars=4, bpm=84, chords=[[41,48,55,60],[46,53,60,64],[43,50,57,62],[38,45,53,57]],
                         lead=None, cutoff=1100, kind='tri')),
      ('cassette',  dict(bars=4, bpm=108, chords=[[48,55,63,67],[46,53,61,65],[44,51,60,63],[46,53,61,68]],
                         lead=[79,76,72,76, 77,74,70,74, 75,72,68,72, 77,74,70,79], cutoff=2200)),
    ]
    for n, kw in specs:
        p, b, d = render(n, **kw)
        print(f'  {p}  {b//1024} KB  {d:.1f}s')
