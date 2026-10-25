"""Builds the Pipolune brand fonts from the OFL masters in design/fonts/source/.

  Pipolune Display  <- Cormorant Garamond (headings)
  Pipolune Text     <- EB Garamond (interface and long text)

Brand changes: the four-point star from the logo as U+2726 (✦), a star-dotted "i" from the
wordmark behind the `ss08` feature, renamed families, and a character set limited to
EN/TR/RU (Latin + Turkish, Russian Cyrillic with Ёё, digits, punctuation, ₺).

Outputs
  design/fonts/dist/*.ttf           desktop fonts for design tools (full EN/TR/RU set)
  src/assets/fonts/*-{latin,cyrillic}.woff2   web subsets loaded per script via unicode-range

Run: python scripts/build-fonts.py   (needs: pip install fonttools brotli)
"""

from __future__ import annotations

from pathlib import Path

from fontTools.otlLib.builder import buildSingleSubstSubtable
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "fonts" / "source"
DESKTOP = ROOT / "design" / "fonts" / "dist"
WEB = ROOT / "src" / "assets" / "fonts"
VERSION = "1.000"

FAMILIES = [
    {
        "family": "Pipolune Display",
        "slug": "pipolune-display",
        "source": "CormorantGaramond[wght].ttf",
        "based_on": "Cormorant Garamond",
        "weights": {500: "Medium", 600: "SemiBold"},
    },
    {
        "family": "Pipolune Text",
        "slug": "pipolune-text",
        "source": "EBGaramond[wght].ttf",
        "based_on": "EB Garamond",
        "weights": {400: "Regular", 500: "Medium"},
    },
]

# Kept in sync with the unicode-range values in src/styles/fonts.css.
LATIN = [
    *range(0x20, 0x7F), *range(0xA0, 0x100), *range(0x100, 0x180),  # Basic, Latin-1, Latin Extended-A (ğ ı İ ş …)
    0x2C6, 0x2DA, 0x2DC, *range(0x2000, 0x2070), 0x20AC, 0x20BA, 0x2116, 0x2122, 0x2212, 0x2726,
]
CYRILLIC = [*range(0x400, 0x460), 0x490, 0x491, 0x2116]
SUBSETS = {"latin": LATIN, "cyrillic": CYRILLIC}
FEATURES = ["kern", "liga", "clig", "calt", "ccmp", "locl", "mark", "mkmk", "lnum", "onum", "pnum", "tnum", "case", "ss08"]

STAR = "uni2726"
STAR_I = "i.star"


def star_contour(pen, cx: float, cy: float, radius: float, waist: float) -> None:
    """Four-point star with concave sides, the shape of the dot over the wordmark's i."""
    tips = [(cx, cy + radius), (cx + radius, cy), (cx, cy - radius), (cx - radius, cy)]
    k = radius * waist
    controls = [(cx + k, cy + k), (cx + k, cy - k), (cx - k, cy - k), (cx - k, cy + k)]
    pen.moveTo(tips[0])
    for i in range(4):
        pen.qCurveTo(controls[i], tips[(i + 1) % 4])
    pen.closePath()


def glyph_bounds(font: TTFont, name: str):
    pen = BoundsPen(font.getGlyphSet())
    font.getGlyphSet()[name].draw(pen)
    return pen.bounds


def add_glyph(font: TTFont, name: str, glyph, advance: int) -> None:
    order = font.getGlyphOrder()
    if name not in order:
        font.setGlyphOrder(order + [name])
    glyph.recalcBounds(font["glyf"])
    font["glyf"].glyphs[name] = glyph
    font["hmtx"].metrics[name] = (advance, getattr(glyph, "xMin", 0))
    if "GDEF" in font and font["GDEF"].table.GlyphClassDef:
        font["GDEF"].table.GlyphClassDef.classDefs[name] = 1


def add_star(font: TTFont) -> None:
    x_height = font["OS/2"].sxHeight
    radius = x_height * 0.42
    advance = round(radius * 2 + x_height * 0.3)
    pen = TTGlyphPen(None)
    star_contour(pen, advance / 2, x_height * 0.5, radius, 0.16)
    add_glyph(font, STAR, pen.glyph(), advance)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x2726] = STAR


def add_star_i(font: TTFont) -> None:
    glyph_set = font.getGlyphSet()
    rec = DecomposingRecordingPen(glyph_set)
    glyph_set["i"].draw(rec)
    contours, current = [], []
    for op in rec.value:
        current.append(op)
        if op[0] in ("closePath", "endPath"):
            contours.append(current)
            current = []

    def bounds_of(contour):
        pts = [p for _, args in contour for p in args]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    # The tittle is the contour that starts highest; everything else is the stem.
    dot = max(contours, key=lambda c: bounds_of(c)[1])
    x0, y0, x1, y1 = bounds_of(dot)
    cx, cy, size = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0)

    pen = TTGlyphPen(None)
    for contour in contours:
        if contour is not dot:
            for op, args in contour:
                getattr(pen, op)(*args)
    star_contour(pen, cx, cy + size * 0.1, size * 0.95, 0.16)
    add_glyph(font, STAR_I, pen.glyph(), font["hmtx"].metrics["i"][0])


def add_feature(font: TTFont, tag: str, mapping: dict[str, str]) -> None:
    gsub = font["GSUB"].table
    lookup = otTables.Lookup()
    lookup.LookupType = 1
    lookup.LookupFlag = 0
    lookup.SubTable = [buildSingleSubstSubtable(mapping)]
    lookup.SubTableCount = 1
    gsub.LookupList.Lookup.append(lookup)
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

    feature = otTables.Feature()
    feature.FeatureParams = None
    feature.LookupListIndex = [len(gsub.LookupList.Lookup) - 1]
    feature.LookupCount = 1
    record = otTables.FeatureRecord()
    record.FeatureTag = tag
    record.Feature = feature
    gsub.FeatureList.FeatureRecord.append(record)
    gsub.FeatureList.FeatureCount = len(gsub.FeatureList.FeatureRecord)
    index = gsub.FeatureList.FeatureCount - 1

    for script in gsub.ScriptList.ScriptRecord:
        systems = [script.Script.DefaultLangSys] + [r.LangSys for r in script.Script.LangSysRecord]
        for lang_sys in filter(None, systems):
            lang_sys.FeatureIndex.append(index)
            lang_sys.FeatureCount = len(lang_sys.FeatureIndex)


def rename(font: TTFont, spec: dict, weight: int, style: str) -> None:
    family, based_on = spec["family"], spec["based_on"]
    ps = f"{family.replace(' ', '')}-{style}"
    table = font["name"]
    copyright_ = table.getDebugName(0) or ""
    for rec in list(table.names):
        if rec.nameID in (1, 2, 3, 4, 5, 6, 16, 17, 21, 22, 25) or rec.nameID >= 256:
            table.removeNames(nameID=rec.nameID)
    legacy_family = family if style in ("Regular", "Bold") else f"{family} {style}"
    legacy_style = "Regular" if style not in ("Regular", "Bold") else style
    names = {
        0: f"{copyright_}\nPipolune modifications copyright 2026 Pipolune.",
        1: legacy_family,
        2: legacy_style,
        3: f"{VERSION};PIPO;{ps}",
        4: f"{family} {style}",
        5: f"Version {VERSION}; based on {based_on} (SIL OFL 1.1)",
        6: ps,
        16: family,
        17: style,
    }
    for name_id, value in names.items():
        table.setName(value, name_id, 3, 1, 0x409)
        table.setName(value, name_id, 1, 0, 0)
    font["OS/2"].usWeightClass = weight
    font["OS/2"].achVendID = "PIPO"
    font["head"].fontRevision = float(VERSION)


def subset(font: TTFont, unicodes: list[int]) -> TTFont:
    options = Options()
    options.layout_features = FEATURES
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = False
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    return font


def build() -> None:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    for old in WEB.glob("*.woff2"):
        old.unlink()

    for spec in FAMILIES:
        for weight, style in spec["weights"].items():
            font = instantiateVariableFont(TTFont(SRC / spec["source"]), {"wght": weight})
            add_star(font)
            add_star_i(font)
            add_feature(font, "ss08", {"i": STAR_I})
            rename(font, spec, weight, style)

            desktop = subset(font, sorted(set(LATIN + CYRILLIC)))
            ttf_path = DESKTOP / f"{spec['family'].replace(' ', '')}-{style}.ttf"
            desktop.flavor = None
            desktop.save(ttf_path)
            print(f"{ttf_path.relative_to(ROOT)}  {ttf_path.stat().st_size // 1024} KB")

            for script, unicodes in SUBSETS.items():
                web = subset(TTFont(ttf_path), unicodes)
                web.flavor = "woff2"
                out = WEB / f"{spec['slug']}-{weight}-{script}.woff2"
                web.save(out)
                print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    build()
