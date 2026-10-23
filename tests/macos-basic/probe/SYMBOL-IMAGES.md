# AppKit symbol images

`One.macOS.Image` draws an SF Symbol using an AppKit `NSImageView`. Its required
`systemName` uses One's generated `SFSymbolName` union, as does the existing
native `Image(systemName)` API. It is available only through the Mac namespace.

```tsx
<One.macOS.Image
  systemName="folder"
  size={16}
  tintColor={PlatformColor('secondaryLabelColor')}
  accessibilityLabel="Project folder"
/>
```

`size` is a positive finite point size and supplies the default square layout,
with 16 as the default. Standard view styles can set different bounds; the
symbol fits those bounds proportionally and remains centered. `tintColor`
accepts React Native colors, including numeric processed colors and semantic
`PlatformColor` values. The default is AppKit `labelColor`. Template tinting
preserves explicit transparent colors and resolves semantic colors under the
current appearance. No rasterized tint is cached.

Standard view accessibility props apply to the image container. A label makes
it an accessible image by default; an unlabelled symbol is decorative.
`accessible` can override this. The inner AppKit image view is not a second
accessibility element. There is no action or button target. A symbol unavailable
on the running OS leaves an empty image rather than keeping the previous one.
This component has no URI, SVG, multicolor, variable-value or SwiftUI styling
surface; existing image APIs remain responsible for those use cases.

The fixture is `SymbolImages.tsx` in the main fixture and the focused
`symbol-entry.tsx`. Use the existing native debug operations and an owned
LSUIElement fixture copy to capture light/dark, resize, symbol change,
unmount/remount and host reload without activation or moving the cursor.

For the unavailable-symbol check, Change symbol cycles folder, star and an
intentionally invalid runtime name. The generated type normally rejects that
name; only the fixture casts it to represent a name supplied by runtime data.
The invalid state must be blank, and cycling back must redraw the folder.

When using `buildNativeBundle` directly for this entry, configure the existing
compiler with `configureVXRNCompilerPlugin({ enableReanimated: true })` first,
as the One import also initializes Worklets. The bare bundle helper does not
read the app's normal One compiler configuration on its own.

## Native validation

The incremental MacosBasic Debug build and the One package build passed. The
existing static view-config checks passed (9 checks), and changed TypeScript
files passed lint. The focused production bundle used the existing Worklets
compiler configuration and the built public `One.macOS.Image` entry.

Native bitmap checks found visible folder, branch, model and feed symbols at
16, 12, 14 and 16 points respectively. Light and dark appearance changes kept
the semantic symbol coverage identical while changing its luminance. Explicit
transparent tint painted zero pixels, and the solid numeric color retained
RGB (204, 51, 0) in both appearances. Resizing the default folder from 16 to 32
points changed its measured bounds. Growing an explicit 40x20 frame to 64x20
kept its symbol proportionally fitted at the same height.

Changing folder to star changed the rendered shape. An unavailable runtime
name cleared all pixels in that image. Unmount/remount and a real host reload
restored pixel-identical expected crops. Native AX actions ran with the app
inactive and its window non-key, and the hardware cursor stayed fixed. The
image rejected press and could not become first responder. The native AX tree
check also exposed inherited press and internal image-cell semantics; the
image now excludes press and hides its AppKit implementation subtree.

These are focused Mac checks. No iOS, Android or web runtime comparison was
run for this unit, and no cross-platform runtime equivalence is claimed.
