#!/usr/bin/env python3
"""
Forenlytics Circular Neon Logo & Icon Asset Generator
=====================================================
Generates pixel-perfect circular neon logo assets:
- frontend/public/logo.svg
- frontend/public/logo.png (512x512)
- frontend/public/favicon.ico (Multi-size: 16, 32, 48, 64, 128, 256)
- desktop/icon.png (512x512)
- desktop/icon.ico (Windows Desktop Icon)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

SVG_LOGO_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <!-- Background Radial Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="65%" stop-color="#090E17"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>

    <!-- Neon Rim Gradient -->
    <linearGradient id="neonRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="35%" stop-color="#38BDF8"/>
      <stop offset="70%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#00F0FF"/>
    </linearGradient>

    <!-- Waveform Glow Gradient -->
    <linearGradient id="waveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="50%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#A5F3FC"/>
    </linearGradient>

    <!-- Core Glow Filter -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur1"/>
      <feGaussianBlur stdDeviation="20" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="rimGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Outer Neon Halo (Subtle Glow) -->
  <circle cx="256" cy="256" r="240" stroke="url(#neonRim)" stroke-width="3" opacity="0.4" filter="url(#rimGlow)"/>

  <!-- Main Dark Circular Plate -->
  <circle cx="256" cy="256" r="236" fill="url(#bgGrad)"/>

  <!-- Primary Crisp Neon Ring -->
  <circle cx="256" cy="256" r="236" stroke="url(#neonRim)" stroke-width="6"/>
  <circle cx="256" cy="256" r="226" stroke="#00F0FF" stroke-width="1" opacity="0.3"/>

  <!-- Concentric Radar / Forensic Rings -->
  <circle cx="256" cy="256" r="175" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.25"/>
  <circle cx="256" cy="256" r="115" stroke="#6366F1" stroke-width="1.5" opacity="0.3"/>

  <!-- Forensic Compass / Crosshair Ticks -->
  <line x1="256" y1="24" x2="256" y2="40" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <line x1="256" y1="472" x2="256" y2="488" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <line x1="24" y1="256" x2="40" y2="256" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <line x1="472" y1="256" x2="488" y2="256" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>

  <!-- Harmonic Voice Biometric Waveform Bars (Symmetric / Modern) -->
  <g filter="url(#neonGlow)">
    <!-- Central Peak Spectrum -->
    <line x1="256" y1="110" x2="256" y2="402" stroke="url(#waveGrad)" stroke-width="10" stroke-linecap="round"/>

    <!-- Flanking Bars (Left) -->
    <line x1="228" y1="135" x2="228" y2="377" stroke="url(#waveGrad)" stroke-width="8" stroke-linecap="round"/>
    <line x1="200" y1="165" x2="200" y2="347" stroke="url(#waveGrad)" stroke-width="8" stroke-linecap="round"/>
    <line x1="172" y1="140" x2="172" y2="372" stroke="url(#waveGrad)" stroke-width="7" stroke-linecap="round"/>
    <line x1="144" y1="195" x2="144" y2="317" stroke="url(#waveGrad)" stroke-width="7" stroke-linecap="round"/>
    <line x1="116" y1="220" x2="116" y2="292" stroke="url(#waveGrad)" stroke-width="6" stroke-linecap="round"/>
    <line x1="88"  y1="238" x2="88"  y2="274" stroke="url(#waveGrad)" stroke-width="5" stroke-linecap="round"/>

    <!-- Flanking Bars (Right) -->
    <line x1="284" y1="135" x2="284" y2="377" stroke="url(#waveGrad)" stroke-width="8" stroke-linecap="round"/>
    <line x1="312" y1="165" x2="312" y2="347" stroke="url(#waveGrad)" stroke-width="8" stroke-linecap="round"/>
    <line x1="340" y1="140" x2="340" y2="372" stroke="url(#waveGrad)" stroke-width="7" stroke-linecap="round"/>
    <line x1="368" y1="195" x2="368" y2="317" stroke="url(#waveGrad)" stroke-width="7" stroke-linecap="round"/>
    <line x1="396" y1="220" x2="396" y2="292" stroke="url(#waveGrad)" stroke-width="6" stroke-linecap="round"/>
    <line x1="424" y1="238" x2="424" y2="274" stroke="url(#waveGrad)" stroke-width="5" stroke-linecap="round"/>
  </g>

  <!-- Central Acoustic Nexus Core -->
  <circle cx="256" cy="256" r="28" fill="#030712" stroke="#00F0FF" stroke-width="4"/>
  <circle cx="256" cy="256" r="14" fill="#00F0FF" filter="url(#neonGlow)"/>
  <circle cx="256" cy="256" r="6" fill="#FFFFFF"/>
</svg>
"""


def render_raster_logo(size=512):
    scale = 2
    s = size * scale
    center = s / 2
    r_outer = s * 0.465

    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for i in range(int(r_outer), 0, -1):
        ratio = i / r_outer
        r = int(15 * ratio + 3 * (1 - ratio))
        g = int(23 * ratio + 7 * (1 - ratio))
        b = int(42 * ratio + 18 * (1 - ratio))
        draw.ellipse([center - i, center - i, center + i, center + i], fill=(r, g, b, 255))

    r_radar1 = r_outer * 0.74
    draw.ellipse([center - r_radar1, center - r_radar1, center + r_radar1, center + r_radar1],
                 outline=(56, 189, 248, 60), width=int(2 * scale))

    r_radar2 = r_outer * 0.48
    draw.ellipse([center - r_radar2, center - r_radar2, center + r_radar2, center + r_radar2],
                 outline=(99, 102, 241, 75), width=int(2 * scale))

    bars = [
        (0, 0.58, 10),
        (28, 0.48, 8),
        (56, 0.36, 8),
        (84, 0.46, 7),
        (112, 0.24, 7),
        (140, 0.14, 6),
        (168, 0.07, 5),
    ]

    all_bars = []
    for dx, h_ratio, lw in bars:
        h = r_outer * h_ratio
        w = int(lw * scale)
        if dx == 0:
            all_bars.append((center, center - h, center + h, w))
        else:
            x_left = center - (dx * scale)
            x_right = center + (dx * scale)
            all_bars.append((x_left, center - h, center + h, w))
            all_bars.append((x_right, center - h, center + h, w))

    glow_img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    for x, y1, y2, w in all_bars:
        glow_draw.line([(x, y1), (x, y2)], fill=(0, 240, 255, 180), width=w + int(8 * scale))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=8 * scale))
    img.alpha_composite(glow_img)

    for x, y1, y2, w in all_bars:
        draw.line([(x, y1), (x, y2)], fill=(0, 240, 255, 255), width=w)
        draw.line([(x, y1 + 6 * scale), (x, y2 - 6 * scale)], fill=(200, 250, 255, 220), width=max(1, w // 2))

    node_r = 28 * scale
    draw.ellipse([center - node_r, center - node_r, center + node_r, center + node_r],
                 fill=(3, 7, 18, 255), outline=(0, 240, 255, 255), width=int(4 * scale))
    core_r = 14 * scale
    draw.ellipse([center - core_r, center - core_r, center + core_r, center + core_r],
                 fill=(0, 240, 255, 255))
    dot_r = 6 * scale
    draw.ellipse([center - dot_r, center - dot_r, center + dot_r, center + dot_r],
                 fill=(255, 255, 255, 255))

    rim_glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rim_draw = ImageDraw.Draw(rim_glow)
    rim_draw.ellipse([center - r_outer, center - r_outer, center + r_outer, center + r_outer],
                     outline=(0, 240, 255, 200), width=int(10 * scale))
    rim_glow = rim_glow.filter(ImageFilter.GaussianBlur(radius=6 * scale))
    img.alpha_composite(rim_glow)

    draw.ellipse([center - r_outer, center - r_outer, center + r_outer, center + r_outer],
                 outline=(0, 240, 255, 255), width=int(5 * scale))

    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img


def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    svg_paths = [
        os.path.join(root_dir, "frontend", "public", "logo.svg"),
        os.path.join(root_dir, "desktop", "logo.svg"),
    ]
    for p in svg_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(SVG_LOGO_CONTENT)
        print(f"[OK] SVG Logo saved: {p}")

    img_512 = render_raster_logo(512)

    png_paths = [
        os.path.join(root_dir, "frontend", "public", "logo.png"),
        os.path.join(root_dir, "desktop", "icon.png"),
        os.path.join(root_dir, "desktop", "logo.png"),
    ]
    for p in png_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        img_512.save(p, "PNG")
        print(f"[OK] High-Res PNG saved: {p}")

    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    ico_imgs = [render_raster_logo(sz[0]) for sz in ico_sizes]

    ico_paths = [
        os.path.join(root_dir, "frontend", "public", "favicon.ico"),
        os.path.join(root_dir, "frontend", "src", "app", "favicon.ico"),
        os.path.join(root_dir, "desktop", "icon.ico"),
    ]
    for p in ico_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        ico_imgs[0].save(p, format="ICO", sizes=ico_sizes)
        print(f"[OK] Multi-Resolution Windows ICO saved: {p}")

    print("\n[SUCCESS] ALL FORENLYTICS LOGO & ICON ASSETS GENERATED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
