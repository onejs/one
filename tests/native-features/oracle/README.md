# SwiftUI floating tab bar geometry oracle

`tab-bar-geometry.json` is a measured table of where the iOS 26 SwiftUI floating tab bar puts
everything, across 44 cells of a matrix, on an iPhone 16 (393x852pt, 3x, iOS 26.4 simulator). It
exists so rnx's `FloatingTabBar` can be pinned against measured numbers instead of a single
three-tab reading.

Every number comes from pixels. The accessibility tree publishes one `Tab Bar` group node and no
per-tab entries, so there is nothing tree-side to read.

- table: `tab-bar-geometry.json`, one object per cell keyed by cell id
- captures: `captures/<id>.png`, the bar band of each capture (cropped at `captureOriginPt`,
  y=700pt). Every number in the table is in full-screen coordinates, not crop coordinates.
- fixture: `../fixtures/one-native-tab-oracle.tsx`
- matrix: `../fixtures/tab-bar-oracle-cells.ts`
- driver: `bun tests/native-features/scripts/tab-bar-oracle.ts --simulator-id <UUID> --bundle-id dev.one.native.tests`
- summary: `bun tests/native-features/scripts/tab-bar-oracle-report.ts`

## Cell ids

Keyed the way rnx's own fixtures key, so the two tables diff with no mapping layer:

    tabs<N>[-search][-action][-badges<T>][-icononly][-labelonly<all|mid>][-longlabels]
           [-min<behavior>][-sidebar][-scroll][-more|-morerow<i>][-sweep]-sel<i>-<light|dark>

`tabs<N>` counts page tabs in the main capsule and never counts a detached search tab.
`-more` taps the More tab and measures what it presents; `-morerow<i>` goes on to select row `i`
of that list. `-scroll` gives the page something to scroll and `-sweep` records a frame sequence
through it. `-action`, `-icononly`, `-labelonly<all|mid>`, `-min<behavior>` and `-sidebar` are segments
invented here for axes rnx's scheme does not cover; every other segment keeps rnx's meaning,
order and position. Full definitions are in the header of `../fixtures/tab-bar-oracle-cells.ts`.

## The fixture renders full screen

The `one-native` conformance fixture wraps `Swift.Tabs` in a 16pt-padded card, so SwiftUI lays
the bar out in a 361pt-wide container and every absolute x is shifted. This oracle's fixture has
no container: `Swift.Tabs` fills the window, so an x here is a real screen coordinate, directly
comparable to a full-screen model like rnx's. The earlier `/tmp/one-native-actiontab` captures
are NOT comparable to this table in absolute terms.

The fixture paints its page one flat colour, but that colour never reaches behind the bar:
SwiftUI insets tab content above the floating capsule, so the page stops at the inset and the bar
is drawn on SwiftUI's own background. That boundary is itself measured, as `pageContentBottomPt`.

## Three methods, all reported

In light mode the glass interior sits ONE level off the background behind it (253 against 254)
while the drop shadow beside it sits ten levels off, so brightness alone finds the background,
not the capsule. What separates them is that the capsule is ringed: background, darker shadow,
brighter rim, interior.

- **rim trace** owns `rect.y`. A capsule's top edge is a luminance trough immediately followed by
  a spike, and columns carrying that pair are capsule columns. Independent variable: the vertical
  luminance gradient. A null result proves there is no lit rim, which is what an unrendered or
  fully minimized bar looks like. Reported separately as `crossCheckPt.rimLeft/rimRight`, which
  under-report width because the rim fades around the rounded corners.
- **membership** owns `rect.x`, `width` and `height`. A pixel belongs to the capsule when it
  matches the interior's exact flat value or is far enough from the background to be content (an
  indicator, a glyph, a label); the shadow satisfies neither, and the page colour is excluded by
  name. No gradient anywhere. Independent variable: absolute colour membership. A null result
  proves the interior is not flat, which is what a capture taken mid-animation looks like.
  Reported separately as `crossCheckPt.membershipTop`.
- **ink** measures each tab's centre twice, once from its glyph ink and once from its label ink.
  `tabCenterGlyphVsLabelPt` is the disagreement between those two independent inks; a tab above
  about a point there is a tab whose segmentation went wrong and should not be trusted.

`disagreementPt` per capsule is the absolute difference between the rim trace and membership on
each edge both produce. It is reported, never averaged away. The driver refuses to record a cell
whose interior is less than 3 off the background it is drawn on, because that capsule's
membership edges would mean nothing.

## What the driver guarantees about each capture

- **It is not stale.** Every cell waits for the fixture to publish `Cell: <its own id>` before
  capturing. The ids come from the same module the fixture renders, so a bundle from before a
  matrix edit publishes different ids and the cell times out instead of measuring the old
  fixture. This matters because the vxrn dev server can die with an esbuild service error while
  the app keeps serving the bundle it already had.
- **It is not mid-animation.** A capture is taken only once two screenshots 400ms apart are
  byte-identical.

## Axes varied

    page tab count             1, 2, 3, 4, 5
    detached tab               none / role="search" page tab / role="search" action tab
    badge                      absent / "5" / "NEW" / "999+"
    systemImage                present / absent on every tab / absent on the middle tab only
    title                      short / one long title beside short ones / empty (icon only)
    tabBarMinimizeBehavior     automatic, onScrollDown, onScrollUp, never
    sidebarAdaptable           false, true
    appearance                 light, dark
    selected index             first, middle, last, and the detached search tab

The `TabBarMinimizeBehavior` list is the generated enum's, read from
`packages/one-native/src/generated/swiftui.ts`, not guessed.

`tabBarMinimizeBehavior` and `sidebarAdaptable` have **no consumer in rnx**: neither prop exists
there, and both are listed as missing for react-native-bottom-tabs. Their cells are measured and
kept, because the enum's full value list was asked for and the cells cost one capture each, but
nothing downstream can use them until rnx grows the props. Their `axis` field says so.

## Crossings chosen, and skipped

The baseline is 3 page tabs, glyph plus short title, no badge, nothing detached, `never`, no
sidebar, light, first tab selected. Each axis is varied off that baseline, plus these crossings:

- **tab count x detached tab**, all five counts against both detached kinds. This is the crossing
  the table exists for: rnx drops its `tabCount` term entirely once a search tab exists, so a
  constant track width and a shrink-to-fit pill are indistinguishable at one tab count. The
  action-tab variant is crossed too because `react-native-bottom-tabs` cannot express it at all,
  so rnx has no model to fall back on.
- **badge width x tab count**, the overflow badge at every count. A badge that widened its tab
  would show up as a pitch change here and nowhere else.
- **long label x tab count** at 2, 3, 4 and 5, and **long label x detached search tab** at 2 and
  4. One long label beside short ones at a FIXED tab count is what separates an equal-width track
  (every centre keeps the same pitch, the long label truncates) from per-tab content widths
  (every centre after the long tab shifts). Varying only tab count fits both models equally well,
  which is why this cell was added.
- **selected index x detached search tab**, because the indicator travelling to a detached
  capsule is a different case from travelling inside the main pill.

Skipped, with the reason each cannot interact:

- **minimize behavior x anything.** All four values describe what the bar does while the page
  scrolls. The oracle never scrolls, so a value can only change the resting geometry or nothing.
  Four cells at the baseline settle that; crossing them with tab count could only repeat the
  same null.
- **sidebarAdaptable x anything beyond tab count.** It selects a sidebar presentation at regular
  width, and an iPhone 16 in portrait is compact. Two tab counts are enough to show no effect;
  one would not be, since a single cell cannot distinguish "no effect" from "an effect that
  happens to cancel at three tabs".
- **appearance x anything beyond the dark cells named in the matrix.** Appearance changes
  materials and tints. Whether it moves layout is now a real question again, because the app no
  longer forces `UIUserInterfaceStyle = Light`; see the retraction below for what it used to
  answer and why that answer was worthless.
- **icon-only and label-only x tab count.** These change what ink exists inside a tab, which the
  tab count axis already measures. If glyph presence changed the track, the count cells would
  show it as a pitch change.

## Caveats

- iPhone 16, 393x852pt, 3x, portrait, iOS 26.4 simulator. Nothing here transfers to another
  screen size without re-running the matrix.
- Ink boxes are ink, not frames. A glyph's ink box is the painted pixels of the SF Symbol, which
  is smaller than the frame SwiftUI lays out for it, and a label's ink box is the painted text,
  which depends on the string. Compare ink to ink, never ink to a layout constant.
- `title: ''` is how an icon-only tab is expressed, because `TabProps.title` is required. That is
  not the same thing as a SwiftUI `Tab` built without a label, and the cell is labelled as what
  it is.

## What the table says, against rnx's current constants

Every number below is from `tab-bar-geometry.json`, measured, this fixture, this device.

**Agrees with rnx.** The pill is 62pt tall with its top rim at y=769 and its bottom at y=831, in
every one of the 44 cells. `pageContentBottomPt` is 769 in every cell too, so SwiftUI's content
inset ends exactly at the pill's top rim and the bar's total footprint is 852-769 = 83pt, which
is what `getFloatingTabBarHeight()` returns (62 + 21). The detached search capsule is 62x62. The
gap between the pill and the detached capsule is 8pt, matching `SEARCH_TAB_GAP`, but only once
the pill is wide enough to reach it (see below). Badge height is 21.3pt against `BADGE_HEIGHT`
21.

**The pill shrinks to fit its tabs, at every tab count.** Width with no detached tab, N=1..5:

    102, 188, 274, 351, 351

That is 86pt per tab plus 16pt, clamping at 351 = 393 - 21*2. rnx computes 120, 204, 288, 372,
390 from an 84pt increment (`TAB_MIN_WIDTH` 68 + `TAB_PADDING_H` 16) and a `SCREEN_WIDTH - 32`
clamp, so it is 18 to 39pt too wide at every count, and its clamp is 39pt too wide.

**With a detached search tab the pill still grows**, which is the falsifier. Width, N=1..5:

    102, 188, 281, 281, (no detached capsule, see More below)

rnx pins the pill to a constant 281pt track whenever a search tab exists, and divides it among
however many tabs there are. On the device the pill is 102 at one main tab and 188 at two, so its
right edge and every tab centre move. The detached capsule does not move: it sits at x=309.8,
62pt wide, 21.2pt from the screen's right edge, identical in all five counts, so the 8pt gap is a
consequence of the pill reaching it at N>=3, not a layout constant that holds at N=1 (gap 187) or
N=2 (gap 101).

The one number that does not fit a single curve: at N=3 the pill is 274 with no search tab and
281 with one. The oracle records both; no closed-form model is offered here for the extra 7pt.

**Label text DOES change the geometry.** This is the cell that separates the two models, and the
null did not hold. One long title beside short ones, at a fixed tab count:

    tabs2          short centres [153.7, 239.7] pitch 86      width 188
    tabs2-longlabels     centres [121.7, 271.7] pitch 150     width 316
    tabs4          short centres [72.7, 155, 237.6, 319.9]  pitch [82.3, 82.6, 82.3]
    tabs4-longlabels     centres [99.7, 202, 266.3, 330.7]  pitch [102.3, 64.3, 64.4]

The long tab takes a wider slot and the short tabs share what is left; at tabs4 and tabs5 the
pill is already clamped, so the short tabs shrink to 64.3 and 49.3 instead. rnx's
`tabWidth = tabTrackWidth / mainTabCount` with a clipped fixed-width label box cannot produce any
of these. Per-tab width is a function of content, not of count alone.

**An icon-only tab centres its glyph.** `glyphOffsetFromCapsuleCenterPt` is -0.1 for every tab in
`tabs3-icononly-sel0-light` and -7.1 for every labelled tab in every other cell. So the label row
is not reserved when there is no label, and rnx holding an icon-only glyph 8pt above the capsule
centre is a real defect.

**Six tabs become five plus More.** `tabs5-search-sel0-light` has no detached capsule at all: the
bar shows First, Second, Third, Fourth and a `More` tab with an ellipsis glyph, and both the
fifth page tab and the search tab go inside it. rnx has no overflow model.

**A selected detached search tab gets no indicator.** In `tabs3-search-sel3-light` the search
glyph is tinted blue and neither capsule contains an indicator surface
(`detachedSelectionIndicator` is null). rnx travels its indicator into the search capsule.

**The selection indicator** is inset 5.2pt from the pill's left edge and 5pt from its top, and is
49.7 to 52pt tall depending on the cell. rnx derives 54 from `INDICATOR_PADDING` 4.

**Badges do not resize anything.** "5", "NEW" and "999+" give badge widths 21.3, 36.3 and 39.3
with the pill, the tab pitch and the glyph boxes byte-identical to the unbadged cell, at every
tab count. The badge's left edge sits 8.6pt right of its glyph's ink centre;
`BADGE_LEFT_FROM_ICON_CENTER` is 13.5.

**RETRACTED: "appearance does not move anything".** That claim came from five dark cells that
were never dark. Expo writes `UIUserInterfaceStyle = Light` into `Info.plist` unless `app.json`
sets `ios.userInterfaceStyle: "automatic"`, and it does not, so the app rendered light under a
device set to dark and each "dark twin" was its own light cell wearing a dark id. The five rows
and their captures have been dropped rather than left in place with a caveat. The driver now
refuses to record an appearance switch it cannot see: `setAppearance` reads the device's current
mode, skips a no-op, and then requires more than 20% of the screen to repaint, which the app in
its shipped configuration cannot do. Nothing in this table currently measures appearance.

`app.json` now sets `ios.userInterfaceStyle: "automatic"` and the app has been rebuilt, so dark is
real: the bar renders a dark capsule with white glyphs and a blue selected label. `automatic` only
changes behaviour when something switches the device, so a suite that never touches appearance
sees the app it always saw.

A trap for whoever regenerates the native project: `ios/` is not tracked, and the checked-out
Xcode project builds `dev.one.native.tests` while `app.json` says `dev.vxrn.native.tests`. A
prebuild would therefore change the bundle id that this README, `scripts/README.md` and every
documented command use. The appearance key was set in both places by hand for that reason.

### Measuring a bar that is darker than its background

The capsule has two ways to be found and neither works on both bars, so the method is chosen by
measured contrast rather than by an appearance flag. `bandSurfaces` returns the distance between
the capsule interior and the background it is drawn on: about 3 where the bar is light glass on a
light background, about 54 where it is dark on black. Below 20 the rim trace seeds, above it
colour membership seeds. Contrast is the thing that decides whether a method works, and a capture
can be dark with light chrome, so the flag would have been the wrong control surface.

Three assumptions in the original method were light-only, and each one mismeasured dark on its
own:

- the rim trace looks for a luminance trough followed by a spike, which exists only where the
  capsule is brighter than what it sits on. On a dark bar the only match in a column is the
  interior followed by the selected tab's indicator, so it returned a 64pt extent as the bar.
- the cutoff separating a second flat surface from ink was a fixed number of levels tuned on the
  light bar. The dark indicator sits further from its interior than that, so it was rejected as
  ink; with no indicator colour to exclude, every tab's pill counted as ink and segmentation
  collapsed to one slot. It is now scaled to each capture's own ink range.
- the interior was read 2.5pt inside the capsule's left end, on the reasoning that the indicator
  is inset further. The margin is about 3pt in light and the dark indicator is inset less, so the
  probe landed inside the pill and interior and indicator came out swapped.

Dark measures the same capsule as light, `{20.8, 769, 351, 62}`, and the same five slots, matching
to 0.1pt. What it costs is corroboration, recorded per row rather than hidden: where membership
seeds, **no** edge has two pixel methods, because the seed's top and the plateau walk's top are
both colour membership and agreeing with each other only proves the same test ran twice.
`crossCheckedEdges` is `[]` on those rows and `["left","right","top"]` on light ones. The
independent check on a dark top edge is the accessibility tree's `Tab Bar` frame, which is not a
pixel.

Both methods are pinned by controls in `../scripts/tab-bar-oracle-measure.test.ts`, which run
against two committed captures in `controls/` and need no simulator. Each names the case its
method must fail on: the rim trace must return less than half the capsule's width on the dark
fixture, and membership must fail to find the capsule on the light one.

**Minimize behavior and sidebarAdaptable do not move anything either**, at rest: all four
minimize values and both sidebar cells match the baseline exactly. These have no rnx consumer.

### Inside `More`

Measured at six cells: `tabs6-more`, `tabs7-more`, `tabs5-search-more` and
`tabs5-search-morerow0` in light, and the last two in dark as well. iOS draws the first four page tabs plus a More tab once a `Tabs` holds
more than five; everything from the fifth onward goes inside.

`More` is a pushed navigation destination, not a sheet. It is a full-screen list with its own
inline "More" title and a per-row disclosure chevron, and selecting a row pushes a second level
whose back button is titled "More". The bar stays visible underneath it the whole time.

Row geometry, from the hairlines, cross-checked against the accessibility tree (the list
publishes one node per row, so unlike the bar it has a genuine independent second method):

| number | pixels | accessibility |
| --- | --- | --- |
| first row top | 177pt | 177pt |
| row pitch | 55 / 56pt | 56pt |
| separator inset, left | 49.7pt | - |
| separator inset, right | 20pt | - |
| glyph ink | 17x17pt, centre x 24.8pt | - |
| label left | 51pt | - |
| chevron | 7x12pt at x 365.3pt | - |

The 1pt spread in the pixel pitch is the hairline sitting on the row's bottom edge, so a row
measured hairline-to-hairline is one pixel short of the row the accessibility frame reports.

A `role="search"` tab inside `More` appears as an ordinary row, labelled "Search", at the same
pitch as every other row, with no search field, no magnifier affordance and no special position.

**The overflow model is display-only. r27161 does not need a promotion rule.** Opening `More` and
then selecting a row both leave the bar's five slots byte-identical: tab centres
`[61.7, 128.9, 196.2, 263.3, 331.5]` and capsule `{x: 20.8, y: 769, width: 351, height: 62}` are
the same at rest, with `More` open, and after a row is chosen. The selected tab is not promoted
into a visible slot; the selection is shown inside `More`. This holds in dark too, where the
centres read `[61.7, 129, 196.2, 263.3, 331.5]`, within 0.1pt of light.

The comparison reports `null` rather than a verdict unless both sides found all five slots. Two
failed segmentations agree with each other, and an earlier run did exactly that: it reported
"unchanged" from a capture where `More` had never opened.

Appearance does not move the list either. Row pitch, separator insets, glyph centre, label left
and chevron box are identical in dark to the numbers in the table above. What changes is material
and tint: a dark capsule with white glyphs and a blue selected label.

One number in the table is deliberately untrusted: the capsule recorded while `More` is open reads
35.7pt tall against 62pt at rest, and that is a measurement artifact, not a collapsing bar. The
interior-plateau method needs the capsule to differ from what is behind it, and over the white
list it does not. The rim trace still finds the same left and right edges as at rest (20.7 /
372.3), and the accessibility tree reports the `Tab Bar` frame as `0, 769, 393, 83` with `More`
open, identical to rest. Those rows carry `barMeasurementTrusted: false`.

### Numbers this table does not contain

- Anything off the resting state. The oracle never scrolls, so it says nothing about what
  `onScrollDown` or `onScrollUp` do while scrolling, or about the minimized bar.
- A frame for any glyph or label. Ink boxes only.
- The overflow destination in dark. The measurement that blocked it is fixed and controlled, but
  the cells have not been captured against the simulator yet, so the `Inside More` numbers below
  are light only.
