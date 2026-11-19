"""生成 PWA 图标（深色底 + 超声扇形扫查示意）。运行: python tools/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "app" / "static" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def icon(size: int) -> Image.Image:
    S = 1024
    im = Image.new("RGB", (S, S), (11, 18, 32))
    d = ImageDraw.Draw(im)
    # 背景渐变
    for y in range(S):
        c = int(18 + 22 * y / S)
        d.line([(0, y), (S, y)], fill=(11, c, 40 + c))
    cx, top = S // 2, 170
    # 扇形声场
    fan = Image.new("L", (S, S), 0)
    fd = ImageDraw.Draw(fan)
    fd.pieslice([cx - 700, top - 700, cx + 700, top + 700], 55, 125, fill=255)
    fd.ellipse([cx - 130, top - 130, cx + 130, top + 130], fill=0)
    speckle = Image.effect_noise((S, S), 70).filter(ImageFilter.GaussianBlur(2))
    tissue = Image.merge("RGB", [speckle.point(lambda v: int(v * .55)),
                                 speckle.point(lambda v: int(v * .8)),
                                 speckle.point(lambda v: min(255, int(v * 1.0)))])
    im.paste(tissue, (0, 0), fan)
    # 结节（低回声椭圆）
    d.ellipse([cx - 120, 560, cx + 110, 720], fill=(8, 14, 26), outline=(56, 189, 248), width=10)
    # 探头
    d.rounded_rectangle([cx - 170, top - 120, cx + 170, top + 20], radius=40, fill=(56, 189, 248))
    return im.resize((size, size), Image.LANCZOS)


icon(512).save(OUT / "icon-512.png")
icon(192).save(OUT / "icon-192.png")
icon(180).save(OUT / "apple-touch-icon.png")
print("icons ->", OUT)
