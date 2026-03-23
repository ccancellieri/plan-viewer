#!/usr/bin/env python3
# Copyright 2026 Carlo Cancellieri
# All rights reserved. Proprietary license.
#
# Generates app icon and splash screen PNGs for Planner app.
# Creates small source images with pure Python, then uses sips (macOS) to resize.

import struct
import zlib
import math
import os
import subprocess
import shutil

def create_png(width, height, color_func):
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r, g, b, a = color_func(x, y, width, height)
            raw += struct.pack('BBBB', r, g, b, a)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def lerp(a, b, t):
    return int(a + (b - a) * t)


def icon_pixel(x, y, w, h):
    cx, cy = w / 2, h / 2
    margin = w * 0.02
    corner_r = w * 0.18

    def in_rounded_rect(px, py):
        if px < margin + corner_r and py < margin + corner_r:
            dx, dy = px - (margin + corner_r), py - (margin + corner_r)
            return dx * dx + dy * dy <= corner_r * corner_r
        if px > w - margin - corner_r and py < margin + corner_r:
            dx, dy = px - (w - margin - corner_r), py - (margin + corner_r)
            return dx * dx + dy * dy <= corner_r * corner_r
        if px < margin + corner_r and py > h - margin - corner_r:
            dx, dy = px - (margin + corner_r), py - (h - margin - corner_r)
            return dx * dx + dy * dy <= corner_r * corner_r
        if px > w - margin - corner_r and py > h - margin - corner_r:
            dx, dy = px - (w - margin - corner_r), py - (h - margin - corner_r)
            return dx * dx + dy * dy <= corner_r * corner_r
        return margin <= px <= w - margin and margin <= py <= h - margin

    if not in_rounded_rect(x, y):
        return (0, 0, 0, 0)

    t = ((x / w) + (y / h)) / 2
    r = lerp(0x66, 0x76, t)
    g = lerp(0x7e, 0x4b, t)
    b = lerp(0xea, 0xa2, t)

    # Map pin
    pin_cx, pin_cy = cx, cy * 0.82
    pin_r = w * 0.20
    dx = x - pin_cx
    dy = y - pin_cy
    dist = math.sqrt(dx * dx + dy * dy)

    if dist < pin_r:
        inner_r = pin_r * 0.40
        if dist >= inner_r:
            return (255, 255, 255, 240)

    tail_top = pin_cy + pin_r * 0.65
    tail_bottom = pin_cy + pin_r * 2.1
    tail_width = pin_r * 0.50
    if tail_top <= y <= tail_bottom:
        progress = (y - tail_top) / (tail_bottom - tail_top)
        half_w = tail_width * (1 - progress)
        if abs(x - pin_cx) <= half_w:
            return (255, 255, 255, 240)

    return (r, g, b, 255)


def icon_fg_pixel(x, y, w, h):
    cx, cy = w / 2, h / 2
    pin_cx, pin_cy = cx, cy * 0.85
    pin_r = w * 0.17
    dx = x - pin_cx
    dy = y - pin_cy
    dist = math.sqrt(dx * dx + dy * dy)

    if dist < pin_r:
        inner_r = pin_r * 0.40
        if dist >= inner_r:
            return (255, 255, 255, 240)

    tail_top = pin_cy + pin_r * 0.65
    tail_bottom = pin_cy + pin_r * 2.1
    tail_width = pin_r * 0.50
    if tail_top <= y <= tail_bottom:
        progress = (y - tail_top) / (tail_bottom - tail_top)
        half_w = tail_width * (1 - progress)
        if abs(x - pin_cx) <= half_w:
            return (255, 255, 255, 240)

    return (0, 0, 0, 0)


def gradient_pixel(x, y, w, h):
    t = ((x / w) + (y / h)) / 2
    r = lerp(0x66, 0x76, t)
    g = lerp(0x7e, 0x4b, t)
    b = lerp(0xea, 0xa2, t)
    return (r, g, b, 255)


def dark_gradient_pixel(x, y, w, h):
    t = ((x / w) + (y / h)) / 2
    return (lerp(0x1a, 0x2d, t), lerp(0x1a, 0x1a, t), lerp(0x1e, 0x3a, t), 255)


def write_png(path, width, height, func):
    print(f"  {os.path.basename(path)} ({width}x{height})")
    data = create_png(width, height, func)
    with open(path, 'wb') as f:
        f.write(data)


def sips_resize(src, dst, w, h):
    if os.path.abspath(src) != os.path.abspath(dst):
        shutil.copy2(src, dst)
    subprocess.run(['sips', '-z', str(h), str(w), dst],
                   capture_output=True)


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets = os.path.join(base, 'assets')
    os.makedirs(assets, exist_ok=True)

    SRC = 256  # Generate at 256x256, resize with sips
    SPLASH_SRC = 256

    # --- Generate source images at 256x256 ---
    print("Generating source images (256x256)...")
    icon_src = os.path.join(assets, 'icon-only.png')
    fg_src = os.path.join(assets, 'icon-foreground.png')
    bg_src = os.path.join(assets, 'icon-background.png')
    splash_src = os.path.join(assets, 'splash.png')
    splash_dark_src = os.path.join(assets, 'splash-dark.png')

    write_png(icon_src, SRC, SRC, icon_pixel)
    write_png(fg_src, SRC, SRC, icon_fg_pixel)
    write_png(bg_src, SRC, SRC, gradient_pixel)
    write_png(splash_src, SPLASH_SRC, SPLASH_SRC, gradient_pixel)
    write_png(splash_dark_src, SPLASH_SRC, SPLASH_SRC, dark_gradient_pixel)

    # --- Resize source to 1024x1024 for stores ---
    print("\nResizing source assets to 1024x1024...")
    for name in ['icon-only.png', 'icon-foreground.png', 'icon-background.png']:
        src = os.path.join(assets, name)
        sips_resize(src, src, 1024, 1024)
        print(f"  {name} -> 1024x1024")

    # --- iOS icon ---
    ios_icon_dir = os.path.join(base, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')
    if os.path.isdir(ios_icon_dir):
        print("\niOS icon...")
        dst = os.path.join(ios_icon_dir, 'AppIcon-512@2x.png')
        sips_resize(icon_src, dst, 1024, 1024)
        print(f"  AppIcon-512@2x.png (1024x1024)")

    # --- iOS splash ---
    ios_splash_dir = os.path.join(base, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset')
    if os.path.isdir(ios_splash_dir):
        print("\niOS splash...")
        for name in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
            dst = os.path.join(ios_splash_dir, name)
            sips_resize(splash_src, dst, 2732, 2732)
            print(f"  {name} (2732x2732)")

    # --- Android icons ---
    android_res = os.path.join(base, 'android', 'app', 'src', 'main', 'res')
    if os.path.isdir(android_res):
        print("\nAndroid icons...")
        densities = {
            'mipmap-mdpi': 48,
            'mipmap-hdpi': 72,
            'mipmap-xhdpi': 96,
            'mipmap-xxhdpi': 144,
            'mipmap-xxxhdpi': 192,
        }
        for folder, size in densities.items():
            d = os.path.join(android_res, folder)
            os.makedirs(d, exist_ok=True)
            sips_resize(icon_src, os.path.join(d, 'ic_launcher.png'), size, size)
            sips_resize(icon_src, os.path.join(d, 'ic_launcher_round.png'), size, size)
            sips_resize(fg_src, os.path.join(d, 'ic_launcher_foreground.png'), size, size)
            print(f"  {folder} ({size}x{size})")

        # Android splash
        print("\nAndroid splash...")
        splash_configs = {
            'drawable': (480, 800),
            'drawable-port-mdpi': (320, 480),
            'drawable-port-hdpi': (480, 800),
            'drawable-port-xhdpi': (720, 1280),
            'drawable-port-xxhdpi': (960, 1600),
            'drawable-port-xxxhdpi': (1280, 1920),
            'drawable-land-mdpi': (480, 320),
            'drawable-land-hdpi': (800, 480),
            'drawable-land-xhdpi': (1280, 720),
            'drawable-land-xxhdpi': (1600, 960),
            'drawable-land-xxxhdpi': (1920, 1280),
        }
        for folder, (sw, sh) in splash_configs.items():
            d = os.path.join(android_res, folder)
            os.makedirs(d, exist_ok=True)
            sips_resize(splash_src, os.path.join(d, 'splash.png'), sw, sh)
            print(f"  {folder} ({sw}x{sh})")

    # --- PWA icons ---
    pwa_dir = os.path.join(base, 'public', 'icons')
    os.makedirs(pwa_dir, exist_ok=True)
    print("\nPWA icons...")
    for size in [72, 96, 128, 144, 152, 192, 384, 512]:
        sips_resize(icon_src, os.path.join(pwa_dir, f'icon-{size}x{size}.png'), size, size)
        print(f"  icon-{size}x{size}.png")

    # Favicon
    print("\nFavicon...")
    sips_resize(icon_src, os.path.join(base, 'public', 'favicon.png'), 32, 32)
    print("  favicon.png (32x32)")

    print("\nDone!")


if __name__ == '__main__':
    main()
