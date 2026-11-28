"""Builds nonogram/paintings.json, the painting puzzles.

Usage (Pillow required):
    python3 nonogram/tools/build_paintings.py <textures dir> nonogram/paintings.json

<textures dir> holds the painting textures as downloaded from the Minecraft
Wiki (https://minecraft.wiki/w/Category:Painting_textures), for example
"Meditative_(texture)_JE1_BE1.png". They are mostly 10x nearest-neighbor
upscales; each is shrunk back to its native art (16 pixels per block).

Each painting in PAINTINGS is cut into sections (cols and rows are section
widths and heights, in pixels, summing to the painting's size), and each
section gives one board per RGB channel. A channel is contrast-stretched
within its section and split at Otsu's threshold (kept to cuts that fill
20-80% of the board when any do): bright squares are filled. A board that
a line-by-line solver can't finish is nudged by flipping the squares whose
values sit closest to the threshold, favoring flips that agree with their
neighbors, until it can. So every board has one solution, reachable
without guessing, and the picture changes as little as possible.
"""
import sys, os, json, base64
from PIL import Image

# Puzzle N in the game is the Nth entry. Sections run left to right, then
# top to bottom. Keep sides at 16 or less so boards fit on a phone.
PAINTINGS = [
    {'id': 'p1', 'name': 'Meditative', 'cols': [16], 'rows': [8, 8]},
    {'id': 'p2', 'name': 'Graham', 'cols': [16], 'rows': [11, 11, 10]},
    {'id': 'p3', 'name': 'Creebet', 'cols': [11, 11, 10], 'rows': [16]},
    {'id': 'p4', 'name': 'Wither', 'cols': [11, 11, 10], 'rows': [16, 16]},
    {'id': 'p5', 'name': 'Stage', 'cols': [16, 16], 'rows': [11, 11, 10]},
    {'id': 'p6', 'name': 'Dennis', 'cols': [12, 12, 12, 12], 'rows': [16, 16, 16]},
    {'id': 'p7', 'name': 'Donkey Kong', 'cols': [16, 16, 16, 16], 'rows': [12, 12, 12, 12]},
    {'id': 'p8', 'name': 'Burning Skull', 'cols': [16, 16, 16, 16], 'rows': [16, 16, 16, 16]},
]

def solve_line(clue, cells):
    n, k = len(cells), len(clue)
    zeros = [0] * (n + 1)
    for i in range(n): zeros[i + 1] = zeros[i] + (1 if cells[i] == 0 else 0)
    def can_block(i, L):
        return i + L <= n and zeros[i + L] - zeros[i] == 0 and (i + L == n or cells[i + L] != 1)
    S = [[False] * (k + 1) for _ in range(n + 2)]
    S[n][k] = S[n + 1][k] = True
    for i in range(n - 1, -1, -1):
        for j in range(k, -1, -1):
            ok = cells[i] != 1 and S[i + 1][j]
            if not ok and j < k and can_block(i, clue[j]): ok = S[i + clue[j] + 1][j + 1]
            S[i][j] = ok
    if not S[0][0]: return None
    R = [[False] * (k + 1) for _ in range(n + 2)]; R[0][0] = True
    cf = [0] * n; ce = [0] * n
    for i in range(n):
        for j in range(k + 1):
            if not R[i][j] or not S[i][j]: continue
            if cells[i] != 1 and S[i + 1][j]: ce[i] = 1; R[i + 1][j] = True
            if j < k and can_block(i, clue[j]):
                e = i + clue[j]
                if S[e + 1][j + 1]:
                    for t in range(i, e): cf[t] = 1
                    if e < n: ce[e] = 1
                    R[e + 1][j + 1] = True
    return [1 if cf[i] and not ce[i] else 0 if ce[i] and not cf[i] else -1 for i in range(n)]

def clue_of(line):
    out, run = [], 0
    for v in line:
        if v: run += 1
        elif run: out.append(run); run = 0
    if run: out.append(run)
    return out

def clues(w, h, b):
    rows = [clue_of(b[r * w:(r + 1) * w]) for r in range(h)]
    cols = [clue_of([b[r * w + c] for r in range(h)]) for c in range(w)]
    return rows, cols

def unknowns(w, h, b):
    """Cells a line-by-line solver leaves undecided (empty set = solvable)."""
    rows, cols = clues(w, h, b)
    g = [-1] * (w * h); dr = [1] * h; dc = [1] * w; prog = True
    while prog:
        prog = False
        for r in range(h):
            if not dr[r]: continue
            dr[r] = 0; line = g[r * w:(r + 1) * w]; res = solve_line(rows[r], line)
            for c in range(w):
                if line[c] == -1 and res[c] != -1: g[r * w + c] = res[c]; dc[c] = 1; prog = True
        for c in range(w):
            if not dc[c]: continue
            dc[c] = 0; line = [g[r * w + c] for r in range(h)]; res = solve_line(cols[c], line)
            for r in range(h):
                if line[r] == -1 and res[r] != -1: g[r * w + c] = res[r]; dr[r] = 1; prog = True
    return [i for i in range(w * h) if g[i] == -1]

def otsu(vals):
    xs = sorted(set(vals))
    if len(xs) == 1: return None
    # Otsu's cut (most between-class variance), kept to cuts that fill
    # 20-80% of the board when any do, so one stray bright pixel can't
    # leave a board nearly empty.
    n = len(vals)
    cands = []
    for a, b in zip(xs, xs[1:]):
        t = (a + b) / 2
        lo = [v for v in vals if v <= t]; hi = [v for v in vals if v > t]
        m0 = sum(lo) / len(lo); m1 = sum(hi) / len(hi)
        cands.append((len(lo) * len(hi) / n / n * (m1 - m0) ** 2, t, len(hi) / n))
    ok = [c for c in cands if 0.2 <= c[2] <= 0.8] or cands
    return max(ok)[1]

def channel_board(w, h, vals):
    lo, hi = min(vals), max(vals)
    if hi == lo:  # a flat channel: one solid board
        return [1] * (w * h), 0
    s = [(v - lo) / (hi - lo) for v in vals]  # contrast stretch
    t = otsu(s)
    b = [1 if v > t else 0 for v in s]
    flips = 0
    def cost(i):
        r, c = divmod(i, w)
        nb = [b[j] for j in (i - w if r else None, i + w if r < h - 1 else None, i - 1 if c else None, i + 1 if c < w - 1 else None) if j is not None]
        agree_after = sum(1 for x in nb if x != b[i]) / len(nb)  # flipping makes these agree
        return abs(s[i] - t) + 0.12 * (1 - 2 * agree_after)
    unk = unknowns(w, h, b)
    while unk:
        U = len(unk)
        best = None
        for i in sorted(unk, key=cost)[:24]:
            b[i] ^= 1
            u2 = len(unknowns(w, h, b))
            b[i] ^= 1
            if u2 < U:
                score = (U - u2) / (max(cost(i), 0) + 0.05)
                if best is None or score > best[0]: best = (score, i)
        i = best[1] if best else min(unk, key=cost)
        b[i] ^= 1; flips += 1
        unk = unknowns(w, h, b)
        if flips > w * h // 3: raise SystemExit('could not make solvable')
    if sum(b) == 0: b = [1] * (w * h)
    return b, flips

def to_hex_bits(b):
    b = b + [0] * (-len(b) % 4)
    return ''.join('%x' % (b[i] << 3 | b[i + 1] << 2 | b[i + 2] << 1 | b[i + 3]) for i in range(0, len(b), 4))

def native(path):
    """The texture at its native size: the largest factor it is an exact
    nearest-neighbor upscale by."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    for k in (10, 5, 2):
        if w % k or h % k: continue
        if all(px[x, y] == px[x - x % k, y - y % k] for y in range(h) for x in range(w)):
            return im.resize((w // k, h // k), Image.NEAREST)
    return im


def find_texture(folder, name):
    stem = name.replace(' ', '_') + '_('
    for f in sorted(os.listdir(folder)):
        if f.startswith(stem) and f.endswith('.png') and 'back' not in f:
            return os.path.join(folder, f)
    raise SystemExit('no texture for ' + name + ' in ' + folder)


def main():
    folder, out = sys.argv[1], sys.argv[2]
    puzzles = []
    for p in PAINTINGS:
        im = native(find_texture(folder, p['name']))
        W, H = im.size
        if sum(p['cols']) != W or sum(p['rows']) != H:
            raise SystemExit('%s is %dx%d; its sections cover %dx%d' % (p['name'], W, H, sum(p['cols']), sum(p['rows'])))
        px = im.load()
        secs, total_flips = [], 0
        y0 = 0
        for sh in p['rows']:
            x0 = 0
            for sw in p['cols']:
                boards = []
                for ch in range(3):
                    vals = [px[x0 + x, y0 + y][ch] for y in range(sh) for x in range(sw)]
                    b, flips = channel_board(sw, sh, vals)
                    assert not unknowns(sw, sh, b)
                    total_flips += flips
                    boards.append(to_hex_bits(b))
                secs.append(boards)
                x0 += sw
            y0 += sh
        pixels = bytes(v for y in range(H) for x in range(W) for v in px[x, y])
        puzzles.append({'id': p['id'], 'source': p['name'], 'w': W, 'h': H,
                        'cols': p['cols'], 'rows': p['rows'],
                        'pixels': base64.b64encode(pixels).decode(), 'boards': secs})
        print('%s: %dx%d, %d sections, %d squares flipped' % (p['name'], W, H, len(secs), total_flips))
    with open(out, 'w') as f:
        json.dump({'version': 1, 'puzzles': puzzles}, f, separators=(',', ':'))


main()
