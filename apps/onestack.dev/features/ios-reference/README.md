# Generated iOS reference

The sidebar begins with navigation links. The page header still identifies the reference.

The reference has its own routes and sidebar at `/ios-reference`. Handwritten
guides stay in `data/docs`; `guides-ios-apis.mdx` links into the reference.

Regenerate the snapshot after generating the Swift bindings:

```sh
bun packages/one/codegen/sdk/emit-docs.ts --input <bindings-directory> --out apps/onestack.dev/data/ios-reference
```

Run this on the Mac with the matching iOS SDK and symbol graph cache. The emitter
reads the `OneSDK_<Module>.json` entries and skipped declarations, then joins
them by precise symbol identifier to `loadGraph`. It preserves declaration
comments when the SDK supplies them. Apple does not include comments for every
symbol. Framework summaries and categories live in `doc-frameworks.ts`; machine
learning frameworks are grouped together for browsing. Extra SDK modules have
their own category.

Commit the generated framework JSON, `index.json`, and the public type search
index together. No generated page needs hand edits. The site build does not
need Xcode or the SDK graph cache.

The framework index uses SSG. Framework and type pages use `+ssr`, following
`data/docs/render-modes.mdx`: two dynamic route modules render on request,
without generating HTML for every SDK type during the build. Server imports
load framework JSON lazily. A type response contains only the selected type;
a framework response contains type names, globals and skipped declarations,
without every type's members. The client shares a small framework manifest and
loads the type name search index only when search is used.

Coverage is generated call entries divided by call entries plus skipped
declarations. It is not a percentage of all Swift symbols or a guarantee that
an API is usable without platform permissions. Types with no callable members
remain searchable so readers can find their skipped declarations.

`typescriptCallShape` is the single adapter for the facade emitter's public
calling convention. When no call shape is supplied, the page shows the Swift
declaration. Output parameter names come directly from `params` with `out: true`;
their values return in `$out`, with the ordinary return value in `$ret`.
