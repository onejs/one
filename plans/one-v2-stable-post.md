# One v2 stable launch post

Owner: r54299. Review source: launch/one-v2-stable-post031be1ae5.
Final assembly: launch/one-v2-stable-assembled, preserving v2-beta5123589ac
and its newly landed native references. The post, overview, setup and native
source guide remain byte-identical to the approved review source.

The post announces the full stable release. It leads with 100% SwiftUI and
Compose access, included native UI, shared components, and the growing UIKit
collection. Source imports make the complete frameworks available; this
does not claim every SDK symbol has a predefined JSX wrapper. Device APIs
stay within that story. Setup uses npx one and Vite configuration. Package
replacement comparisons, tabs inventory and the beta announcement are gone.

## Review and approval

Assigned Claude Opus s8126 reviewed the post and CLI. Its two material
findings are corrected: unrelated legacy npm One2.x versions can win broad
ranges, and Swift view props are JSON rather than a specific generated
interface. Installation uses --save-exact; the CLI uses exact release pins.
The native source guide documents Swift packages, Compose views, methods,
declarations, JSON boundaries, platform files, rebuilds and One prebuild.
Existing API and protocol names remain unchanged.

TESTED: actual native source generators parse both Swift examples and the
Compose example; three TypeScript snippets pass. Wrong Compose prop and
Swift method argument types fail as negative controls. This is not a native
binary compilation claim. Cache: one-v2-stable-source-docs.

TESTED: the actual site MDX compiler removed the required Swift tools
directive before the explicit Package.swift fence title and preserves it
in display and clipboard data afterward. Both production guide widths
assert the exact first line // swift-tools-version: 6.2.

Nate directly approved both before/after shares in this session, saying
“I approve this shared item” and naming the stable post on mobile and desktop:
- share-file-r54299-7cce714b44841b32-1a10373d4be-d3938ad992c8c81b
- share-file-r54299-eb39135d65891695-1a10373cfa4-2adc298a798d5ad8

Copy approval is recorded. One main landing remains Nate-owned. Version
2.6.0 and stable publication need separate approval. The post stays draft
until release; its October5 date must match the actual publication date.

## Validation and delivery

TESTED relay s8128: production build171pages;18strict route observations,
eight font probes,348served links/anchors across89routes, five RSS tests,
and final guide directive display/copy probes passed. All mounted with zero
console/hydration errors and no horizontal document overflow. Evidence
branch launch/one-v2-stable-capturesa336803b0. Full desktop/mobile PNGs,
PDFs and inspected Q90 before/after comparisons are saved and shared.

TESTED relay s8122: installed default and explicit Basic npm scaffolds use
the unchanged v2-beta-starter and exact beta/stable pins; creator build,
typecheck, export targets, six-page production web build/HTTP, and parsed
iOS/Android native.app prebuild manifests pass. Beta installed bytes match
the registry tarball. Caret ranges installed legacy One2.5.2 as negatives.
An extra existing dev Content-Type assertion fails on unchanged beta, while
HTTP200 HTML passes. No native binary build or launch was claimed.
CLI branchfix/launch-cli-setup52b7c6186; source144569013.

RAN: CLI and release resolver fixes delivered tov2-beta c3c9d2252. Parent
monitors Checks37152648456 and canary Release37152648483. Final assembly
prepares2.6.0 without publishing, tagging, dispatching stable workflows,
pushing main or changing the starter branch.

RAN: final local package build14workspaces, site typecheck, production site
build,28release tests/76assertions and dry npm packs pass. All79literal One
export targets and seven creator targets exist in packs. Generated release
declarations match current source. TESTED: all28desktop/mobile observations, eight font probes,348served
links across89routes, exact Swift display/copy directives,48native docs
tests and five RSS tests pass on the final assembly. All24publication
manifests were prepared with the actual release writer; internal dependencies
are exactly2.6.0. Local One, vxrn and creator tarballs retain current built
bytes; the native host also matches the Fabric-validated b92aafe9c.
Runtime probes and prepared pack receipts
live in ~/Library/Caches/one-v2-stable-assembled/; final CI remains separate.

## Hydration release

RAN: Tamagui9acbfd7147 is in e092672461, full Checks37148867412 passed with
the unchanged size gate. Normal Beta Release37149918452 passed. Fresh npm
@tamagui/web3.0.0-beta.1571.1 hook bytes match that CI source. Archive SHA256:
3c0a01bcd7f10f196dfcc2da29a3eb25e36e1c7a1809135a8e4551174f1f0402.
The earlier canary matched source and all five JavaScript variants passed
private-ref and syntax checks. No microbenchmark speedup is claimed.

The site retains its validated durable web2.6.2 backport. Tamagui normal
auto-beta publication stays enabled. Detailed artifact receipts are under
~/.team-machine/handoffs/one-tamagui-launch-evidence/.
