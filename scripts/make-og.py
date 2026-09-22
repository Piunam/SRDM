"""Generate placeholder Open Graph cards (1200x630) for the site's routes.

These are neutral stand-ins in the site's own palette so social embeds don't
404. Replace them with real artwork whenever you like — the routes only need
the files to exist at these paths.

Usage:  python scripts/make-og.py        (or: npm run og)
Needs:  pillow
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"

W, H = 1200, 630
ABYSS = (6, 11, 18)
WHITE = (234, 241, 246)
SILVER = (159, 176, 191)
DIM = (109, 126, 140)
CY = (45, 212, 200)

# The site name, kept in sync with src/lib/site-config.ts by hand.
PROJECT = "[PROJECT NAME]"
STATUS = "PROTOTYPE · DEMO BUILD"

CARDS = {
    "system.png": ("System", "What the system is made of, what each part does, and why."),
    "demo.png": ("Demo", "Before and after, on the same clip. Figures computed offline."),
    "live.png": ("Live session", "The prototype running on live audio over USB."),
}

WIN_FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int, fallbacks: tuple[str, ...] = ()) -> ImageFont.FreeTypeFont:
    for candidate in (name, *fallbacks):
        path = WIN_FONTS / candidate
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sans_bold = font("segoeuib.ttf", 76, ("arialbd.ttf",))
    sans = font("segoeui.ttf", 30, ("arial.ttf",))
    mono = font("consola.ttf", 22, ("cour.ttf",))

    for filename, (title, lede) in CARDS.items():
        img = Image.new("RGB", (W, H), ABYSS)
        d = ImageDraw.Draw(img)

        # Faint 64px grid, as on the site.
        for x in range(0, W, 64):
            d.line([(x, 0), (x, H)], fill=(12, 19, 28))
        for y in range(0, H, 64):
            d.line([(0, y), (W, y)], fill=(12, 19, 28))

        d.text((80, 72), PROJECT, font=mono, fill=SILVER)
        d.line([(80, 130), (160, 130)], fill=CY, width=2)
        d.text((80, 250), title, font=sans_bold, fill=WHITE)
        d.text((80, 360), lede, font=sans, fill=SILVER)
        d.ellipse([(80, 528), (90, 538)], fill=CY)
        d.text((104, 522), STATUS, font=mono, fill=DIM)

        img.save(OUT / filename)
        print(f"  wrote public/og/{filename}")


if __name__ == "__main__":
    main()
