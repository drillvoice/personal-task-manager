# App icons

Drop three PNGs in here before shipping to production:

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-512-maskable.png` — 512×512, safe-zone padded for Android maskable icons

Once they're in, re-add the entries to `src/app/manifest.ts` (see the commented
block there).

Recommended tool: <https://realfavicongenerator.net/> or any icon exporter you
prefer. Palette should match the paper/ink tokens (#EEEEE7 background,
#1C1E1B text).
