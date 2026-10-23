# Native Mac linear gradients

`Gradients.tsx` exercises RN 0.88's standard `View.style.backgroundImage`.
The Mac view paints linear background images above the solid background and
below the border and children. Images are clipped to the host's existing
uniform rounded outline, independently of child overflow. First image wins
in overlapping layers. Layout updates recalculate geometry; appearance changes
resolve SharedColor stops again without needing a React render.

Supported: CSS angles (clockwise from up), corner keywords, percentage and
point stops, omitted stop distribution, decreasing positions fixed to the
preceding position, coincident hard stops, out-of-range stops, transparency,
and multiple linear layers. Numeric and semantic PlatformColor stops use the
same native color conversion as backgrounds and text. Clear stops inherit
each adjacent visible hue on its respective side, including a clear stop
between two different colors. Neighbor lookup takes two linear passes.
The private Mac Color type distinguishes an undefined value from explicit
numeric zero and semantic clear. `gradient-colors.mm` is the focused native
runtime probe for that distinction, packed ARGB and equal-color hash behavior.

Radial gradients and transition hints (a stop with no color) are not painted.
An image containing an AppKit pattern color that cannot convert to sRGB is
also left unpainted, preserving the solid fill, other images and border.
Repeating gradients are not supported by RN's background-image parser or this
host. This change does not add an expo component or a separate gradient API.
Per-corner and elliptical border shapes remain outside the host's existing
uniform border implementation.

## Consumer adapter recipe

The consumer's `MachineChip` in `gui/interface/tm/primitives.tsx` uses a
horizontal expo gradient from `{x: 0, y: 0.5}` to `{x: 1, y: 0.5}`. Replace
that Mac render with an absolute-fill `View` and:

```tsx
backgroundImage: [{
  type: 'linear-gradient',
  direction: '90deg',
  colorStops: [
    { color: machineTile(seed, 0.5), positions: ['0%'] },
    { color: machineTile(seed, 0), positions: ['100%'] },
  ],
}]
```

The JS object API uses `positions` (an array); RN turns it into native
`ColorStop.position`. Preserve the containing chip's clipping and gradient's
absolute-fill style, pointer events and children.

For the horizontal separator wash in `OverviewGroupSeparator.native.tsx`,
the expo end is `{x: 0.25, y: 0.5}`: use the same `90deg` direction, with
positions `0%` and `25%`, rather than stretching the fade across the whole
separator. A narrow Mac adapter for these two call sites can map each color's
location `t` to `${100 * (start.x + (end.x - start.x) * t)}%`, where omitted
locations are evenly distributed. This recipe assumes horizontal left-to-right
endpoints. Arbitrary expo endpoint vectors require layout-dependent conversion
and should not be approximated with a CSS corner keyword.

## Native proof procedure

Build only MacosBasic with the warm derived data cache. Build the fixture's Mac
bundle, then launch an owned copy with `open -g -n`, `ONE_MACOS_BUNDLE_URL`
and `ONE_MACOS_DEBUG_DIR`. The existing debug hooks capture native bitmaps
without activating the app or moving the hardware cursor.

`gradient-entry.tsx` is a standalone `main` AppRegistry entry for isolating
this proof from other fixture features. Bundle it with the existing
`buildNativeBundle({ root: fixtureRoot, platform: 'macos',
entryFile: 'probe/gradient-entry.tsx', dev: false })` helper in
`packages/vxrn/dist/utils/createNativeDevEngine.mjs` and write its `code` to a
file. Set `ONE_MACOS_BUNDLE_URL` to that file's `file://` URL. It uses the same
RN props, Fabric host and existing debug hooks as the full fixture.

Capture light and dark appearance with `gradient-semantic` visible. Its render
count must remain one while the native colors change. Press `gradient-resize`
through the app-owned debug hook: the wash and angle swatches grow from 120
to 240 points wide. Capture after resizing and after `reload-host`; reload
must reset the width and leave the gradients intact.

For a geometry disproof, compare `gradient-angle` (45 degrees) and
`gradient-corner` (`to top right`) on their 120 by 32 bounds. At the upper-left
and lower-right corners the keyword gradient must have equal midpoint color;
the 45-degree gradient must not. A naive corner-to-corner or normalized-square
gradient fails this check. Check the 25% hard boundary and rounded corner
pixels, and inspect the semantic stops and layer overlap in the same bitmap.
Retain bitmap dimensions, sampled pixels, loaded bundle/native hashes and
inspection results outside the source tree.

## Recorded native proof

On 2026-10-23, source `5ebe5b10ea` passed the incremental MacosBasic build,
the eight native color-probe checks, and app-owned bitmap checks at 840 by 800
native pixels. The color probe checked default absence, parsed numeric zero,
unchanged packed ARGB, semantic clear, missing semantic name, explicit clear
equality, and equal numeric/semantic hashes.

The wash changed from white before the color repair to RGB (137, 183, 248)
near its blue end and (243, 248, 254) near its clear end. Rounded exterior
pixels remained the parent fill (245, 245, 245), and the border remained
(255, 136, 0). The foreground translucent red layer blended over blue in the
expected order. Decreasing and coincident stops formed the 25% hard boundary;
point stops and omitted middle stops painted the expected fixed positions.

The non-square angle disproof measured opposing near-corner red values of
200 and 55 for `45deg`, versus 133 and 122 for `to top right`. Semantic
endpoint values changed from 39 to 252 and 253 to 33 across light/dark
appearance, with the visible React render count still one. The wash resized
from 120 to 240 points with matching normalized colors, then a real host
reload reset it to 120 points and repainted it. A background accessibility
press was accepted while appActive and windowKey stayed false; the hardware
cursor remained at (900, 373).

The loaded fixture bundle SHA-256 was
`6135129771dcf7b331c47d9d7d14df254a590c4f6be8dc724104f9ed7b6ad258`;
native debug dylib
`471a57268ecaf6c96ad635d1e3450ae87634f64809479e0d74ddceb22280a372`;
core archive
`de5cd5ae5dd7689e54bfef1a42dc92bf09e2e1e268d14787bec58b4ed7de5af1`.
Detailed captures, pixel samples and build logs are retained outside the tree
in the task's evidence directory. Review crops are native-density WebP,
512 by 174 pixels, without resizing. These results cover the gradient unit
before the subsequent approved native-command integration.

Independent review then found an unsupported pattern color could throw
while converting gradient components, and a clear middle stop could tint
the following blue fade purple. The fixture's fourth row isolates those
cases: red-clear-blue over white, followed by three green controls whose
gradient uses linenColor, scrubberTexturedBackgroundColor, or
transparencyCheckboardPatternColor. Check that the blue side has equal red
and green channels, the red side has equal green and blue channels, and all
three unsupported pattern images leave the green fill visible in both
appearances. This exercises the actual host drawing path rather than only
repeating the component preparation math in a separate probe.

The corrected combined SDK was rebuilt incrementally after approved controls
merge `123557977e`. The actual host passed all preceding bitmap checks again,
including resize, appearance and real reload. Red-clear-blue quarter samples
were (255, 130, 130) and (124, 124, 255), without purple contamination.
All three pattern controls remained (34, 204, 102) in light and dark
appearance without a crash. The unchanged eight color checks above are reused.
The final review crops are 512 by 206 native pixels. App activation stayed
false and the cursor stayed fixed. Final loaded artifact SHA-256 values:

- bundle: 75ee828e43f6626acf3e4439588972859bf2fe75dfa12a522a66e31d3b23caca
- native debug dylib: 9fc6aaa280b484d3fbf5eb0ea6547b6a3631ef96d8ae15a64833fe112af15f0c
- core archive: d8291ab261f5b646be38f01cbacccba265784345718bb390fd3435183b2068cb
