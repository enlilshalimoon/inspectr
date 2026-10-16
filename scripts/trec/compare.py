# Checks a rendered REI 7-6 against TREC's official PDF.
#
#   python3 -I scripts/trec/compare.py official.pdf ours.pdf OUT_DIR [pages=1,2]
#
# For each page: matches words in reading order and reports how far each one
# moved (baseline origin, in points), lists words that are missing or extra,
# and writes OUT_DIR/pN-side.png (official | ours) and OUT_DIR/pN-overlay.png
# (official in red, ours in blue; purple = identical).
import sys
from difflib import SequenceMatcher

import fitz

official, ours, out = sys.argv[1], sys.argv[2], sys.argv[3]
pages = [int(p) for p in (sys.argv[4] if len(sys.argv) > 4 else "1,2").split(",")]
A, B = fitz.open(official), fitz.open(ours)


def words(page):
    res = []
    for b in page.get_text("rawdict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                w, x = "", None
                for ch in s["chars"] + [None]:
                    if ch is None or ch["c"].isspace():
                        if w:
                            if w in ("", ""):
                                w = "•"
                            res.append((w, x, s["origin"][1]))
                        w, x = "", None
                    else:
                        x = ch["origin"][0] if x is None else x
                        w += ch["c"]
    return sorted(res, key=lambda t: (round(t[2]), t[1]))


for pn in pages:
    pa, pb = A[pn - 1], B[pn - 1]
    wa, wb = words(pa), words(pb)
    sm = SequenceMatcher(a=[w[0] for w in wa], b=[w[0] for w in wb], autojunk=False)
    dxs, dys, worst = [], [], []
    missing, extra = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for a, b in zip(wa[i1:i2], wb[j1:j2]):
                dx, dy = b[1] - a[1], b[2] - a[2]
                dxs.append(dx)
                dys.append(dy)
                worst.append((max(abs(dx), abs(dy)), a[0], round(dx, 2), round(dy, 2)))
        else:
            missing += [w[0] for w in wa[i1:i2]]
            extra += [w[0] for w in wb[j1:j2]]
    worst.sort(reverse=True)
    n = len(dxs)
    print(f"== page {pn}: {len(wa)} official words, {len(wb)} ours, {n} matched")
    if n:
        print(f"   max |dx| {max(map(abs, dxs)):.2f}pt  max |dy| {max(map(abs, dys)):.2f}pt  "
              f"mean dx {sum(dxs)/n:+.2f} dy {sum(dys)/n:+.2f}")
        print("   largest moves:", worst[:6])
    print("   missing from ours:", missing[:40])
    print("   extra in ours:", extra[:40])

    ia = pa.get_pixmap(dpi=100, colorspace=fitz.csGRAY)
    ib = pb.get_pixmap(dpi=100, colorspace=fitz.csGRAY)
    side = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, ia.width * 2 + 20, ia.height), False)
    side.clear_with(255)
    for k, src in enumerate((ia, ib)):
        rgb = fitz.Pixmap(fitz.csRGB, src)
        rgb.set_origin(k * (ia.width + 20), 0)
        side.copy(rgb, rgb.irect)
    side.save(f"{out}/p{pn}-side.png")
    # Overlay: official → red channel dark, ours → blue channel dark.
    w, h = ia.width, ia.height
    sa, sb = ia.samples, ib.samples
    buf = bytearray(w * h * 3)
    for i in range(w * h):
        a, b = sa[i], sb[i]
        buf[3 * i] = b          # R stays bright unless ours is ink
        buf[3 * i + 1] = min(a, b)
        buf[3 * i + 2] = a      # B stays bright unless official is ink
    fitz.Pixmap(fitz.csRGB, w, h, bytes(buf), False).save(f"{out}/p{pn}-overlay.png")
