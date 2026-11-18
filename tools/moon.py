"""Procedural detailed moon for the RISE hero.

Builds a height field (fractal noise + craters with rims and central peaks),
wraps it onto a sphere, lights it from the upper left and tints it in the
warm peach tones of the RISE moon sculpture. Writes RGBA images.
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

rng = np.random.default_rng(7)
TEX = 2048          # height-field resolution (covers the visible hemisphere)
OUT = int(sys.argv[1]) if len(sys.argv) > 1 else 1400


def fractal(size, octaves, persistence, seed):
    r = np.random.default_rng(seed)
    acc = np.zeros((size, size), np.float32)
    amp, total = 1.0, 0.0
    for o in octaves:
        g = r.random((o, o)).astype(np.float32)
        layer = np.array(Image.fromarray(g).resize((size, size), Image.BICUBIC))
        acc += layer * amp
        total += amp
        amp *= persistence
    return acc / total


# ---- Height field ----------------------------------------------------------
h = (fractal(TEX, [8, 16, 32, 64, 128, 256, 512, 1024], 0.6, 1) - 0.5) * 20.0

# Maria: large, smooth darker basins
maria = fractal(TEX, [4, 7, 13, 26, 52], 0.55, 2)
maria = gaussian_filter(maria, 6)
maria = np.clip((maria - 0.56) / 0.07, 0, 1)          # 0 = highlands, 1 = mare
h = h * (1 - 0.5 * maria) - maria * 5.0

yy, xx = np.mgrid[0:TEX, 0:TEX].astype(np.float32)
floor_dark = np.zeros((TEX, TEX), np.float32)


def add_crater(cx, cy, R, depth, rim, peak):
    if rng.random() < 0.75 * maria[int(min(cy, TEX - 1)), int(min(cx, TEX - 1))]:
        return  # maria are smoother, fewer craters
    x0, x1 = int(max(cx - 2 * R, 0)), int(min(cx + 2 * R + 1, TEX))
    y0, y1 = int(max(cy - 2 * R, 0)), int(min(cy + 2 * R + 1, TEX))
    if x1 <= x0 or y1 <= y0:
        return
    d = np.hypot(xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy) / R
    floor = 0.45 if R > 40 else 0.0          # big craters have flat floors
    dd = np.clip((d - floor) / (1 - floor), 0, 1)
    bowl = np.where(d < 1, depth * (dd ** 2 - 1), 0)
    rimz = rim * np.exp(-((d - 1) / (0.45 if R > 40 else 0.3)) ** 2)
    if R > 40:
        floor_dark[y0:y1, x0:x1] += 0.12 * np.clip(1 - d / 0.85, 0, 1) ** 0.5
    ejecta = np.where(d > 1, rim * 0.35 * np.exp(-(d - 1) * 2.2), 0)
    cp = peak * np.exp(-(d / 0.16) ** 2) if peak else 0
    h[y0:y1, x0:x1] += bowl + rimz + ejecta + cp


# Power-law crater population: many small, few large
for _ in range(6):
    R = rng.uniform(70, 140)
    add_crater(rng.uniform(0, TEX), rng.uniform(0, TEX), R, R * 0.3, R * 0.06, R * 0.07)
for _ in range(70):
    R = rng.uniform(22, 70)
    add_crater(rng.uniform(0, TEX), rng.uniform(0, TEX), R, R * 0.3, R * 0.11, R * 0.05 if R > 45 else 0)
for _ in range(900):
    R = rng.uniform(4, 22)
    add_crater(rng.uniform(0, TEX), rng.uniform(0, TEX), R, R * 0.28, R * 0.1, 0)
for _ in range(3000):
    R = rng.uniform(1.5, 4)
    add_crater(rng.uniform(0, TEX), rng.uniform(0, TEX), R, R * 0.3, R * 0.1, 0)

h = gaussian_filter(h, 0.7)

# Cavity shading: darken bowls, lift rims (reads as relief even under flat light)
hp = h - gaussian_filter(h, 7)
cavity = 1 + np.clip(hp, -10, 10) * 0.022

# Two young craters with bright ray systems
rays = np.zeros_like(h)
for (cx, cy, R) in [(1340, 1460, 34), (760, 640, 22)]:
    ang = np.arctan2(yy - cy, xx - cx)
    dist = np.hypot(xx - cx, yy - cy)
    streak = np.zeros_like(ang)
    for a in rng.uniform(-np.pi, np.pi, 30):
        streak += rng.uniform(0.3, 1) * np.exp(-((np.angle(np.exp(1j * (ang - a)))) / 0.05) ** 2)
    rays += np.clip(streak, 0, 1) * np.exp(-np.maximum(dist - R, 0) / (R * 5)) * (dist > R * 0.9)
    rays += 0.7 * np.exp(-((dist - R) / (R * 0.6)) ** 2)
rays = gaussian_filter(rays, 2.5) * (0.6 + 0.8 * fractal(TEX, [32, 128], 0.5, 9))

# Albedo: maria darker, fresh small craters slightly brighter via fine noise
albedo = (1.0 - 0.24 * maria - np.clip(gaussian_filter(floor_dark, 3), 0, 0.2) + (fractal(TEX, [64, 256, 1024], 0.55, 3) - 0.5) * 0.18) * cavity + rays * 0.09

# ---- Project onto a sphere ---------------------------------------------------
S = OUT * 2  # supersample, then downscale for clean edges
v, u = np.mgrid[0:S, 0:S].astype(np.float32)
x = (u + 0.5) / S * 2 - 1
y = (v + 0.5) / S * 2 - 1
r2 = x * x + y * y
inside = r2 <= 1.0
z = np.sqrt(np.clip(1 - r2, 0, 1))

lat = np.arcsin(np.clip(y, -1, 1))
coslat = np.cos(lat)
lon = np.arcsin(np.clip(x / np.maximum(coslat, 1e-6), -1, 1))
tu = (lon / np.pi + 0.5) * (TEX - 1)
tv = (lat / np.pi + 0.5) * (TEX - 1)

gy, gx = np.gradient(h)
coords = np.array([tv.ravel(), tu.ravel()])
hx = map_coordinates(gx, coords, order=1).reshape(S, S)
hy = map_coordinates(gy, coords, order=1).reshape(S, S)
alb = map_coordinates(albedo, coords, order=1).reshape(S, S)

# Sphere normal + bump perturbation (tangent space ~ screen x/y)
k = 0.34
nx = x - hx * k * z
ny = y - hy * k * z
nz = z
n = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
nx, ny, nz = nx / n, ny / n, nz / n

L = np.array([-0.42, -0.4, 0.81])
L = L / np.linalg.norm(L)
diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
shade = (0.34 + 0.78 * diff) * alb
shade *= 0.70 + 0.30 * z ** 0.4          # limb darkening
shade = np.clip(shade, 0, 1.25)

# Warm ramp, like the glowing RISE moon sculpture
stops = np.array([0.0, 0.35, 0.62, 0.85, 1.05, 1.25])
cols = np.array([
    [88, 38, 16],
    [168, 86, 42],
    [224, 146, 86],
    [246, 192, 130],
    [255, 226, 182],
    [255, 244, 224],
], np.float32)
rgb = np.stack([np.interp(shade, stops, cols[:, c]) for c in range(3)], -1)

alpha = np.clip((1 - np.sqrt(r2)) * S / 2.0, 0, 1)  # 1px soft edge at supersample
img = np.dstack([rgb, alpha * 255]).astype(np.uint8)
img[~inside] = 0
im = Image.fromarray(img, 'RGBA').resize((OUT, OUT), Image.LANCZOS)
im.save(sys.argv[2] if len(sys.argv) > 2 else 'moon.png')
print('saved', im.size)
