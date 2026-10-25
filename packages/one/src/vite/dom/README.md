# One DOM build integration

The native plugin replaces a component with `createDOMComponent(id)` before
Rolldown resolves its browser imports. It discovers boundaries in the native
module graph, including dynamic imports, and stops at each proxy. It does not
scan source directories or rewrite finished JavaScript or Hermes output.

A descriptor ID hashes the canonical module path relative to the canonical
project root. Same basenames in different directories remain distinct, and
symlinked imports of one file share an ID. Absolute paths stay in the builder;
the native proxy receives only the stable ID.

Development uses the existing Vite client environment at `/_one/dom/<id>/`.
Only registered IDs are served. The browser entry installs the existing React
Refresh preamble before importing the original component, then calls
`mountDOMComponent(Component, id)`. HTML provides `#one-dom-root`. Ordinary web
and SSR imports retain the original component and existing render rules.
Metro is unsupported and receives a configuration diagnostic.

Native production generation awaits one Vite multi-entry ESM build before
returning to the native bundle writer. Output lives beneath
`assetsDest/one-dom`: HTML in `pages/<id>/index.html`, shared hashed chunks and
imported assets in `assets/`, and `manifest.json` containing:

```json
{
  "protocolVersion": 1,
  "buildId": "sha256 of completed output bytes and relative entry paths",
  "entries": {
    "dom-<stable identity hash>": "pages/dom-<stable identity hash>/index.html"
  }
}
```

The build ID changes with output content; descriptor IDs do not depend on
finished asset hashes. Removing the final boundary removes stale `one-dom`
output. Native resource handlers select the immutable build or update root and
resolve the manifest entry within that root. Native origins, loading, Updates
activation and rollback require separate native proof.

Browser builds use a relative base and standard Vite transforms for imported
CSS, fonts and images. They set `publicDir: false` and `copyPublicDir: false`.
Unrelated web public files are excluded. Root-relative public URLs such as
`<img src="/logo.png">` are unsupported in packaged DOM components; import
assets from the browser graph instead. There is no network or inline fallback.

`bun run test src/vite/dom/build.test.ts` in `packages/one` exercises native
isolation, discovery behind a lazy import, deferred native evaluation,
completion of browser assets, deterministic build IDs, symlink identities,
exclusion of unrelated public assets and removal of stale output. Browser and
native host interaction are validated separately.

## Browser runtime integration proof

The compiler/browser probe on 2026-10-25 used the built One and VxRN modules
at `72b352c531` and a byte-identical copy of the native-features
`fixtures/dom/ProofPage.tsx`. Browser resolution selected the public
`one/dom/client` and `one/dom` package exports, without runtime aliases.
Two native graph descriptors produced separate HTML entries sharing the
browser closure; the second descriptor was discovered behind a lazy native
import before that module executed.

Chromium exercised two isolated pages in both Vite development and emitted
production ESM: data reconciliation, value/void/error actions and refs,
retained refs after factory dependency changes, a delayed action spanning
such a change, imported image/font/CSS, and deferred lazy evaluation.
Transitive React Refresh preserved the document and input state. An invalid
lazy import displayed the error overlay and recovered after repair. Reload
reset local state and rejected the old ref without changing the other page.
Production browser resources stayed beneath an immutable build namespace.

The transport was simulated over HTTP with the built JavaScript
`DOMNativeBridge`; native graph evaluation used a descriptor-only adapter.
This establishes no Fabric, native origin, WebView, device or Updates proof.
The source fixture's CSS referenced absent `OneNativeTestFont-BlockA.ttf`;
the disposable copy used the existing `OneNativeTestFont-Regular.ttf`.
That fixture correction belongs to its owner. The component itself was
unchanged. Logs, module/fixture hashes and three 3x WebP captures are retained
under `~/.team-machine/evidence/one-dom-build/real-runtime` on pro128.
