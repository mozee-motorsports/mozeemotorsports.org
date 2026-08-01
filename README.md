# mozeemotorsports.org

Public website for MOZEE Motorsports, the SAE Formula Hybrid team at the Milwaukee School of Engineering.

## Stack

Static HTML/CSS/JS with no build step. Based on the [Hyperspace](https://html5up.net/hyperspace) template by HTML5 UP (Creative Commons Attribution 3.0; see `LICENSE.txt`), rethemed to the MOZEE brand palette and restructured into a multi-page site. Icons are Font Awesome; scripts are jQuery plus the template's Scrollex/Responsive Tools helpers, all vendored in `assets/`.

Deployed to GitHub Pages by `.github/workflows/static.yml` on pushes to `master`.

## Structure

- `index.html`, plus one file per page under `pages/`
- `assets/css/main.css` is the served stylesheet. The MOZEE color system lives in its `:root` custom-property block; every value is one of the five brand colors (black `#000000`, white `#FFFFFF`, red `#C52127`, light gray `#BDBEC0`, dark gray `#58585A`) or a documented tint/shade of them. The Sass sources in `assets/sass/` are kept in sync manually since the repo has no Sass build; if the site is ever recompiled from Sass, diff the output against `main.css` first.
- `images/` holds page photos (resized for web) and `images/sponsors/` holds current-sponsor logos only.
- `documents/` holds the public PDFs linked from the Documents and Sponsors pages (constitution, program info sheet, sponsorship packet, newsletters).

## Content rules

- Contrast: red on black is reserved for large headings, accents, and UI states only; it fails WCAG AA for body text. Check any new color pairing before shipping it.
- The sponsors page lists only sponsors from the current active-sponsor list maintained by the sponsorship coordinator.
- No individual member names, photos, or personal contact info are published without consent; the team contact address is `formulahybrid@msoe.edu`.
- The Merch page links out to a hosted Printful Quick Store; this repo intentionally contains no cart, checkout, or payment code. The store link is stubbed until the store exists.
