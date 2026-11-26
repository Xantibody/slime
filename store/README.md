# Store assets

What the Chrome Web Store and AMO listings show, and how it is made.
[listing.md](listing.md) has the text to paste and which image goes where.

```
store/
  listing.md        the listing text, permission reasons, and the image map
  style.css         the look every image shares (the popup's colours)
  screenshots/      1280x800: fix, pause, emacs (.html source, .png output)
  promo/            440x280 small tile and 1400x560 marquee, no text
  render.ts         renders every .html here to the .png beside it
```

## Rendering

```bash
pnpm store:render
```

It builds the extension, then opens each page in agent-browser at the size
the stores ask for and saves a screenshot next to it. The pause screenshot
embeds the built popup, with the two extension APIs it calls answered by a
stub (`dist/store-preview/`), so it always shows the popup as it ships and
the version in `package.json`.

The images are committed, so a listing can be updated without the
toolchain. Render again whenever the popup, the icon or a page here changes,
and look at every image before committing.

## Rules the stores set

- Chrome Web Store: screenshots 1280x800, full bleed with square corners;
  promo tiles without text, with defined edges, readable at half size.
- AMO: screenshots at 1280x800 (any 1.6:1 works).
- The 128 px store icon is the package's `icons/icon-128.png`: 96 px of
  artwork inside 16 px of transparent padding.
