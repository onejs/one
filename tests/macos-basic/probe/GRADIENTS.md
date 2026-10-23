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
same native color conversion as backgrounds and text. Transparent black
inherits a neighboring hue to avoid a dark fringe during a wash fade.
The private Mac Color type distinguishes an undefined value from explicit
numeric zero and semantic clear. `gradient-colors.mm` is the focused native
runtime probe for that distinction, packed ARGB and equal-color hash behavior.

Radial gradients and transition hints (a stop with no color) are not painted.
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
